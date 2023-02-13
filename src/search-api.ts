import { z } from "zod";

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
  abortSignal: AbortSignal
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

  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    signal: abortSignal,
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

const searchResultSchema = z.object({
  Result: z
    .object({
      Duration: z.number(),
      FileCount: z.number(),
      MatchCount: z.number(),
      Files: z
        .array(
          z
            .object({
              Repository: z.string(),
              FileName: z.string(),
              Language: z.string(),
              Version: z.string(),
              ChunkMatches: z.array(
                z
                  .object({
                    Content: z.string(),
                    ContentStart: locationSchema,
                    FileName: z.boolean(),
                    Ranges: z.array(
                      z
                        .object({ Start: locationSchema, End: locationSchema })
                        .transform(({ Start, End }) => ({
                          start: Start,
                          end: End,
                        }))
                    ),
                  })
                  .transform(({ Content, ContentStart, FileName, Ranges }) => ({
                    contentBase64: Content,
                    contentStart: ContentStart,
                    isFileNameChunk: FileName,
                    matchRanges: Ranges,
                  }))
              ),
            })
            .transform(
              ({ Repository, FileName, Language, Version, ChunkMatches }) => ({
                repository: Repository,
                fileName: FileName,
                language: Language,
                version: Version,
                chunks: ChunkMatches,
              })
            )
        )
        .nullable()
        .transform((val) => val ?? []),
      RepoURLs: z.record(z.string()),
      LineFragments: z.record(z.string()),
    })
    .transform(
      ({
        Duration,
        FileCount,
        MatchCount,
        Files,
        RepoURLs,
        LineFragments,
      }) => ({
        duration: Duration,
        fileCount: FileCount,
        matchCount: MatchCount,
        files: Files,
        repoUrls: RepoURLs,
        repoLineNumberFragments: LineFragments,
      })
    ),
});

export type SearchResults = z.infer<typeof searchResultSchema>["Result"];
export type ResultFile = SearchResults["files"][number];
export type Chunks = ResultFile["chunks"][number];
export type MatchRange = Chunks["matchRanges"][number];
export type ContentLocation = z.infer<typeof locationSchema>;
