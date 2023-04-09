import { z } from "zod";
import type { ReadonlyDeep } from "type-fest";
import { ZOEKT_URL } from "$env/static/private";

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

  const response = await fetch(new URL("/api/list", ZOEKT_URL), {
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
    Documents: z.number(),
    IndexBytes: z.number(),
    ContentBytes: z.number(),
  })
  .transform(({ Documents, IndexBytes, ContentBytes }) => ({
    fileCount: Documents,
    indexBytes: IndexBytes,
    contentBytes: ContentBytes,
  }));

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
                  Branches: z.array(
                    z
                      .object({ Name: z.string(), Version: z.string() })
                      .transform(({ Name, Version }) => ({
                        name: Name,
                        version: Version,
                      }))
                  ),
                })
                .transform(
                  ({ Name, ID, Rank, URL, LatestCommitDate, Branches }) => ({
                    name: Name,
                    id: ID,
                    rank: Rank,
                    url: URL,
                    lastCommit: toISOStringWithoutMs(LatestCommitDate),
                    branches: Branches,
                  })
                ),
              IndexMetadata: z
                .object({
                  IndexTime: z.coerce.date(),
                })
                .transform(({ IndexTime }) => ({
                  lastIndexed: toISOStringWithoutMs(IndexTime),
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
      repositories: Repos.sort(({ name: a }, { name: b }) => a.localeCompare(b))
        .sort(({ id: a }, { id: b }) => a - b)
        .sort(({ rank: a }, { rank: b }) => a - b)
        .map(({ id, rank, ...rest }) => rest),
    })),
});

// Trying to make these strings less obnoxiously long.
const toISOStringWithoutMs = (d: Date) =>
  d.toISOString().replace(/\.\d{3}Z$/, "Z");

export type ListResults = ReadonlyDeep<
  z.infer<typeof listResultSchema>["List"]
>;
export type Repository = ListResults["repositories"][number];
