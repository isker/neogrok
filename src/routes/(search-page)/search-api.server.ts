import { z } from "zod";
import { ZOEKT_URL } from "$env/static/private";
import type { ReadonlyDeep } from "type-fest";
import { type ContentToken, parseIntoLines } from "./content-parser.server";

export type SearchQuery = Readonly<{
  query: string;
  contextLines: number;
  files: number;
  matchesPerShard: number;
  totalMatches: number;
}>;

export type SearchResponse =
  | {
      kind: "success";
      results: SearchResults;
    }
  | {
      kind: "error";
      error: string;
    };

export const search = async (
  { query, contextLines, files, matchesPerShard, totalMatches }: SearchQuery,
  f: typeof fetch
): Promise<SearchResponse> => {
  const body = JSON.stringify({
    q: query,
    opts: {
      ChunkMatches: true,
      NumContextLines: contextLines,
      MaxDocDisplayCount: files,
      ShardMaxMatchCount: matchesPerShard,
      TotalMaxMatchCount: totalMatches,
    },
  });

  const response = await f(new URL("/api/search", ZOEKT_URL), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    if (response.status === 400) {
      const { Error: error } = await response.json();
      return { kind: "error", error };
    } else {
      const responseBody = await response.text();
      return {
        kind: "error",
        error: `Search failed, HTTP ${response.status}: ${
          response.statusText
        } ${responseBody ? ` - ${responseBody}` : ""}
        `,
      };
    }
  }

  return {
    kind: "success",
    results: searchResultSchema.parse(await response.json()).Result,
  };
};

// All of the properties of the returned JSON are uppercased. Hail Golang. We
// laboriously instruct zod to transform them all to lowercase, picking better
// names for some of them along the way.
const locationSchema = z
  .object({
    ByteOffset: z.number(),
    LineNumber: z.number(),
    Column: z.number(),
  })
  .transform(({ ByteOffset, LineNumber, Column }) => ({
    byteOffset: ByteOffset,
    lineNumber: LineNumber,
    column: Column,
  }));
export type ContentLocation = ReadonlyDeep<z.infer<typeof locationSchema>>;

const matchRangeSchema = z
  .object({ Start: locationSchema, End: locationSchema })
  .transform(({ Start: start, End: end }) => ({
    start,
    end,
  }));
export type MatchRange = ReadonlyDeep<z.infer<typeof matchRangeSchema>>;

const searchResultSchema = z.object({
  Result: z
    .object({
      Duration: z.number(),
      FileCount: z.number(),
      MatchCount: z.number(),
      FilesSkipped: z.number(),
      Files: z
        .array(
          z
            .object({
              Repository: z.string(),
              FileName: z.string(),
              Branches: z.array(z.string()),
              Language: z.string(),
              Version: z.string(),
              ChunkMatches: z.array(
                z
                  .object({
                    Content: z.string(),
                    ContentStart: locationSchema,
                    FileName: z.boolean(),
                    Ranges: z.array(matchRangeSchema),
                  })
                  .transform(
                    ({
                      Content: contentBase64,
                      ContentStart: contentStart,
                      FileName: isFileNameChunk,
                      Ranges: matchRanges,
                    }) => ({
                      contentBase64,
                      contentStart,
                      isFileNameChunk,
                      matchRanges,
                    })
                  )
              ),
            })
            .transform(
              ({
                Repository: repository,
                FileName: fileName,
                Branches: branches,
                Language: language,
                Version: version,
                ChunkMatches: chunkMatches,
              }) => {
                // Search results may match not only on file contents but also
                // the filename itself. We have to especially handle such
                // matches to render them properly.
                const fileNameChunks = chunkMatches.filter(
                  (m) => m.isFileNameChunk
                );
                if (fileNameChunks.length > 1) {
                  // Should only ever be one match, with one or more ranges.
                  // Check just to be sure.
                  throw new Error(
                    `Unreachable: received ${fileNameChunks.length} file name matches`
                  );
                }
                let fileNameTokens: Array<ContentToken>;
                if (fileNameChunks.length === 1) {
                  const {
                    contentBase64,
                    contentStart: { byteOffset: baseByteOffset },
                    matchRanges,
                  } = fileNameChunks[0];
                  // We only take the first line. If your filename has more
                  // than one line, you deserve this.
                  const [firstLine] = parseIntoLines(
                    contentBase64,
                    baseByteOffset,
                    matchRanges
                  );
                  fileNameTokens = firstLine;
                } else {
                  fileNameTokens = [
                    { kind: "context", text: fileName, startByteOffset: 0 },
                  ];
                }

                return {
                  repository,
                  fileName,
                  fileNameTokens,
                  branches,
                  language,
                  version,
                  chunks: chunkMatches
                    .filter(({ isFileNameChunk }) => !isFileNameChunk)
                    .map(
                      ({
                        contentBase64,
                        contentStart: {
                          byteOffset: baseByteOffset,
                          lineNumber: startLineNumber,
                        },
                        matchRanges,
                      }) => {
                        const lines = parseIntoLines(
                          contentBase64,
                          baseByteOffset,
                          matchRanges
                        ).map((lineTokens, lineOffset) => ({
                          lineNumber: startLineNumber + lineOffset,
                          lineTokens,
                        }));

                        // While the frontend could derive this from lines,
                        // counts of matches in a chunk are needed so frequently
                        // that it's substantially less tedious to precompute
                        // it.
                        const matchCount = lines.reduce(
                          (n, { lineTokens }) => n + numMatches(lineTokens),
                          0
                        );

                        return { matchCount, lines };
                      }
                    ),
                };
              }
            )
        )
        .nullable()
        .transform((val) => val ?? []),
      RepoURLs: z.record(z.union([z.string(), z.undefined()])),
      LineFragments: z.record(z.union([z.string(), z.undefined()])),
    })
    .transform(
      ({
        Duration: duration,
        FileCount: fileCount,
        MatchCount: matchCount,
        FilesSkipped: filesSkipped,
        Files: files,
        RepoURLs: repoUrls,
        LineFragments: repoLineNumberFragments,
      }) => ({
        backendStats: {
          duration,
          fileCount,
          matchCount,
          filesSkipped,
        },
        files: files.map(
          ({
            repository,
            version,
            fileName,
            fileNameTokens,
            chunks,
            ...rest
          }) => {
            const fileNameMatchCount = numMatches(fileNameTokens);
            return {
              ...rest,
              repository,
              matchCount: chunks.reduce(
                (n, { matchCount: m }) => n + m,
                fileNameMatchCount
              ),
              fileName: {
                matchCount: fileNameMatchCount,
                tokens: fileNameTokens,
              },
              chunks,
              fileUrl: repoUrls[repository]
                ?.replaceAll("{{.Version}}", version)
                .replaceAll("{{.Path}}", fileName),
              // The 'template' is such that the line number can be `join`ed
              // into it. JSON serializable!
              lineNumberTemplate:
                repoLineNumberFragments[repository]?.split("{{.LineNumber}}"),
            };
          }
        ),
      })
    ),
});

const numMatches = (tokens: Array<ContentToken>) =>
  tokens.filter((t) => t.kind === "match").length;

export type SearchResults = ReadonlyDeep<
  z.infer<typeof searchResultSchema>["Result"]
>;
export type ResultFile = SearchResults["files"][number];
export type Chunks = ResultFile["chunks"][number];
