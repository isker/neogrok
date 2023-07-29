import * as v from "@badrap/valita";
import type { ReadonlyDeep } from "type-fest";
import { ZOEKT_URL } from "$env/static/private";
import { type ContentToken, parseIntoLines } from "./content-parser";

export const searchQuerySchema = v.object({
  query: v.string(),
  contextLines: v.number(),
  files: v.number(),
  matches: v.number(),
});
export type SearchQuery = ReadonlyDeep<v.Infer<typeof searchQuerySchema>>;

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
  { query, contextLines, files, matches }: SearchQuery,
  f: typeof fetch
): Promise<SearchResponse> => {
  const body = JSON.stringify({
    q: query,
    opts: {
      ChunkMatches: true,
      NumContextLines: contextLines,
      MaxDocDisplayCount: files,
      MaxMatchDisplayCount: matches,

      // These are hardcoded because they're really about bounding the amount
      // of work the zoekt server does, they shouldn't be user configurable.
      // TODO environment vars.
      ShardMaxMatchCount: 10_000,
      TotalMaxMatchCount: 100_000,
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
    results: searchResultSchema.parse(await response.json(), { mode: "strip" })
      .Result,
  };
};

// All of the properties of the returned JSON are uppercased. Hail Golang. We
// laboriously instruct valita to transform them all to lowercase, picking better
// names for some of them along the way.
const locationSchema = v
  .object({
    ByteOffset: v.number(),
    LineNumber: v.number(),
    Column: v.number(),
  })
  .map(({ ByteOffset, LineNumber, Column }) => ({
    byteOffset: ByteOffset,
    lineNumber: LineNumber,
    column: Column,
  }));
export type ContentLocation = ReadonlyDeep<v.Infer<typeof locationSchema>>;

const matchRangeSchema = v
  .object({ Start: locationSchema, End: locationSchema })
  .map(({ Start: start, End: end }) => ({
    start,
    end,
  }));
export type MatchRange = ReadonlyDeep<v.Infer<typeof matchRangeSchema>>;

const searchResultSchema = v.object({
  Result: v
    .object({
      Duration: v.number(),
      FileCount: v.number(),
      MatchCount: v.number(),
      FilesSkipped: v.number(),
      Files: v
        .union(
          v.null(),
          v.array(
            v
              .object({
                Repository: v.string(),
                FileName: v.string(),
                Branches: v.array(v.string()),
                Language: v.string(),
                Version: v.string(),
                ChunkMatches: v.array(
                  v
                    .object({
                      Content: v.string(),
                      ContentStart: locationSchema,
                      FileName: v.boolean(),
                      Ranges: v.array(matchRangeSchema),
                    })
                    .map(
                      ({
                        Content: contentBase64,
                        ContentStart: contentStart,
                        FileName: isFileNameChunk,
                        Ranges: matchRanges,
                      }) => ({
                        contentBase64,
                        contentStart,
                        isFileNameChunk,
                        matchRanges: matchRanges.filter(
                          ({ start, end }) =>
                            // zoekt can return empty matches for queries that
                            // can match zero characters, e.g. ".*". This is
                            // surprising behavior, but similar to that of grep
                            // et al, so not necessarily a bug. We can't render
                            // empty matches, and certain things downstream of
                            // us (like svelte keyed `each`es) are assuming
                            // non-empty matches, so we filter them here.
                            //
                            // FIXME this obscures what's happened from the
                            // user's perspective, as removed matches are not
                            // present in the "frontend matches" count in the
                            // UI. Perhaps we can count these separately and
                            // communicate the count to the user.
                            start.byteOffset !== end.byteOffset
                        ),
                      })
                    )
                ),
              })
              .map(
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
                            // While the frontend could derive this from
                            // lineTokens, counts of matches in a chunk are needed
                            // so frequently that it's substantially less tedious
                            // to precompute it.
                            matchCount: numMatches(lineTokens),
                          }));

                          const matchCount = lines.reduce(
                            (n, { matchCount }) => n + matchCount,
                            0
                          );

                          return { matchCount, lines };
                        }
                      ),
                  };
                }
              )
          )
        )
        .map((val) => val ?? []),
      RepoURLs: v.record(v.union(v.string(), v.undefined())),
      LineFragments: v.record(v.union(v.string(), v.undefined())),
    })
    .map(
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
  v.Infer<typeof searchResultSchema>["Result"]
>;
export type ResultFile = SearchResults["files"][number];
export type Chunk = ResultFile["chunks"][number];
export type ChunkLine = Chunk["lines"][number];
