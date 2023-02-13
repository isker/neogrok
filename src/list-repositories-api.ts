import { z } from "zod";

export type ListRepositoriesResponse =
  | {
      kind: "success";
      results: ListResults;
    }
  | {
      kind: "error";
      error: string;
    };

export const listRepositories = async (
  { query }: { query?: string },
  abortSignal: AbortSignal
): Promise<ListRepositoriesResponse> => {
  const body = JSON.stringify({ q: query });

  const response = await fetch("/api/list", {
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
        } ${responseBody ? ` - ${responseBody}` : ""}`,
      };
    }
  }

  return {
    kind: "success",
    results: listResultSchema.parse(await response.json()).List,
  };
};

const statsSchema = z
  .object({
    // Not the number of total repositories, perhaps the number of git repositories?
    Repos: z.number(),
    Shards: z.number(),
    Documents: z.number(),
    IndexBytes: z.number(),
    ContentBytes: z.number(),
    NewLinesCount: z.number(),
  })
  .transform(
    ({
      Repos,
      Shards,
      Documents,
      IndexBytes,
      ContentBytes,
      NewLinesCount,
    }) => ({
      repoCount: Repos,
      shardCount: Shards,
      fileCount: Documents,
      indexBytes: IndexBytes,
      contentBytes: ContentBytes,
      lines: NewLinesCount,
    })
  );

const listResultSchema = z.object({
  List: z
    .object({
      Stats: statsSchema,
      Repos: z
        .array(
          z
            .object({
              Repository: z
                .object({
                  Name: z.string(),
                  ID: z.number(),
                  Rank: z.number(),
                  URL: z.string(),
                  LatestCommitDate: z.coerce.date(),
                })
                .transform(({ Name, ID, Rank, URL, LatestCommitDate }) => ({
                  name: Name,
                  id: ID,
                  rank: Rank,
                  url: URL,
                  lastCommit: LatestCommitDate,
                })),
              IndexMetadata: z
                .object({
                  IndexTime: z.coerce.date(),
                })
                .transform(({ IndexTime }) => ({
                  lastIndexed: IndexTime,
                })),
              Stats: statsSchema,
            })
            .transform(
              ({ Repository, IndexMetadata: { lastIndexed }, Stats }) => ({
                ...Repository,
                lastIndexed,
                stats: Stats,
              })
            )
        )
        .nullable()
        .transform((val) => val ?? []),
    })
    .transform(({ Stats, Repos }) => ({
      stats: Stats,
      repositories: Repos,
    })),
});

export type ListResults = z.infer<typeof listResultSchema>["List"];
export type Repository = ListResults["repositories"][number];
