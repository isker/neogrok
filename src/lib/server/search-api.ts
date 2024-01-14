import * as v from "@badrap/valita";
import type { ReadonlyDeep } from "type-fest";
import {
  type ContentLine,
  parseChunkMatch,
  parseFileNameMatch,
} from "./content-parser";
import { makeZoektRequest } from "./zoekt-client";

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
  f: typeof fetch,
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

  const response = await makeZoektRequest(f, "/api/search", body);

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
  })
  .map(({ ByteOffset: byteOffset, LineNumber: lineNumber }) => ({
    byteOffset,
    lineNumber,
  }));
export type ContentLocation = ReadonlyDeep<v.Infer<typeof locationSchema>>;

const matchRangeSchema = v
  .object({ Start: locationSchema, End: locationSchema })
  .map(({ Start: { byteOffset: start }, End: { byteOffset: end } }) => ({
    // inclusive
    start,
    // exclusive
    end,
  }));

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
                // Will be the empty string if zoekt couldn't figure it out, we
                // call it Text for both display purposes and for parameterizing
                // syntax highlighting; Text is the name zoekt will pick for
                // plain text files it can identify.
                Language: v.string().map((lang) => lang || "Text"),
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
                        ContentStart: {
                          lineNumber: startLineNumber,
                          byteOffset: baseByteOffset,
                        },
                        FileName: isFileNameChunk,
                        Ranges: matchRanges,
                      }) => ({
                        content: Buffer.from(contentBase64, "base64"),
                        isFileNameChunk,
                        startLineNumber,
                        matchRanges: matchRanges
                          // zoekt can return empty matches for queries that can
                          // match zero characters, e.g. ".*". This is
                          // surprising behavior, but similar to that of grep et
                          // al, so not necessarily a bug. We can't render empty
                          // matches, and certain things downstream of us (like
                          // svelte keyed `each`es) are assuming non-empty
                          // matches, so we filter them here.
                          //
                          // FIXME this obscures what's happened from the user's
                          // perspective, as removed matches are not present in
                          // the "frontend matches" count in the UI. Perhaps we
                          // can count these separately and communicate the
                          // count to the user.
                          .filter(({ start, end }) => start !== end)
                          // The byte offsets given for the match ranges are
                          // into the entire file's contents, not the match's
                          // Content. Adjust them.
                          .map(({ start, end }) => ({
                            start: start - baseByteOffset,
                            end: end - baseByteOffset,
                          })),
                      }),
                    ),
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
                    (m) => m.isFileNameChunk,
                  );
                  if (fileNameChunks.length > 1) {
                    // Should only ever be one match, with one or more ranges.
                    // Check just to be sure.
                    throw new Error(
                      `Unreachable: received ${fileNameChunks.length} file name matches`,
                    );
                  }
                  let fileNameParsed: ContentLine;
                  if (fileNameChunks.length === 1) {
                    const { content, matchRanges } = fileNameChunks[0];
                    fileNameParsed = parseFileNameMatch(content, matchRanges);
                  } else {
                    fileNameParsed = { text: fileName, matchRanges: [] };
                  }

                  return {
                    repository,
                    fileName: fileNameParsed,
                    branches,
                    language,
                    version,
                    chunks: chunkMatches
                      .filter(({ isFileNameChunk }) => !isFileNameChunk)
                      .map(({ content, startLineNumber, matchRanges }) => ({
                        lines: parseChunkMatch(content, matchRanges),
                        startLineNumber,
                        matchCount: matchRanges.length,
                      })),
                  };
                },
              ),
          ),
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
        zoektStats: {
          duration,
          fileCount,
          matchCount,
          filesSkipped,
        },
        files: files.map(
          ({ repository, version, fileName, chunks, ...rest }) => {
            return {
              ...rest,
              repository,
              matchCount: chunks.reduce(
                (n, { matchCount: m }) => n + m,
                fileName.matchRanges.length,
              ),
              fileName,
              chunks,
              fileUrl: repoUrls[repository]
                ?.replaceAll("{{.Version}}", version)
                .replaceAll("{{.Path}}", fileName.text),
              // The 'template' is such that the line number can be `join`ed
              // into it. JSON serializable!
              lineNumberTemplate:
                repoLineNumberFragments[repository]?.split("{{.LineNumber}}"),
            };
          },
        ),
      }),
    ),
});

export type SearchResults = ReadonlyDeep<
  v.Infer<typeof searchResultSchema>["Result"]
>;
export type ResultFile = SearchResults["files"][number];
export type Chunk = ResultFile["chunks"][number];
export type ChunkLine = Chunk["lines"][number];
