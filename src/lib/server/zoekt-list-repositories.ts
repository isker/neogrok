import * as v from "@badrap/valita";
import type { ReadonlyDeep } from "type-fest";
import { makeZoektRequest } from "./zoekt-client";

export const listQuerySchema = v.object({ query: v.string().optional() });
export type ListQuery = ReadonlyDeep<v.Infer<typeof listQuerySchema>>;

export type ListRepositoriesResponse =
  | {
      kind: "success";
      results: ListResults;
    }
  | {
      kind: "error";
      error: string;
    };

export async function listRepositories(
  { query }: ListQuery,
  f: typeof fetch,
): Promise<ListRepositoriesResponse> {
  const body = JSON.stringify({ q: query });

  const response = await makeZoektRequest(f, "/api/list", body);

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
    results: listResultSchema.parse(await response.json(), { mode: "strip" })
      .List,
  };
}

const statsSchema = v
  .object({
    Shards: v.number(),
    Documents: v.number(),
    IndexBytes: v.number(),
    ContentBytes: v.number(),
  })
  .map(({ Shards, Documents, IndexBytes, ContentBytes }) => ({
    shardCount: Shards,
    fileCount: Documents,
    indexBytes: IndexBytes,
    contentBytes: ContentBytes,
  }));
export type RepoStats = v.Infer<typeof statsSchema>;

const dateSchema = v.string().chain((str) => {
  const date = new Date(str);

  if (isNaN(date.getTime())) {
    return v.err(`Invalid date "${str}"`);
  }

  return v.ok(date);
});

const listResultSchema = v.object({
  List: v
    .object({
      Stats: statsSchema,
      Repos: v
        .union(
          v.null(),
          v.array(
            v
              .object({
                Repository: v
                  .object({
                    Name: v.string(),
                    ID: v.number(),
                    Rank: v.number(),
                    URL: v.string(),
                    LatestCommitDate: dateSchema,
                    FileURLTemplate: v.string(),
                    CommitURLTemplate: v.string(),
                    Branches: v
                      .array(
                        v
                          .object({ Name: v.string(), Version: v.string() })
                          .map(({ Name, Version }) => ({
                            name: Name,
                            version: Version,
                          })),
                      )
                      // Zoekt returns `null` when there are no branches (e.g.
                      // the repo is just a directory, no VCS info). To me that
                      // seems wrong and I think it should be `omitempty`, so
                      // tolerate both options in case that ever gets fixed.
                      .nullable()
                      .optional(),
                  })
                  .map(
                    ({
                      Name,
                      ID,
                      Rank,
                      URL,
                      LatestCommitDate,
                      FileURLTemplate,
                      CommitURLTemplate,
                      Branches,
                    }) => ({
                      name: Name,
                      id: ID,
                      rank: Rank,
                      url: URL,
                      lastCommit: toISOStringWithoutMs(LatestCommitDate),
                      fileUrlTemplate: FileURLTemplate,
                      commitUrlTemplate: CommitURLTemplate,
                      branches: Branches ?? [],
                    }),
                  ),
                IndexMetadata: v
                  .object({
                    IndexTime: dateSchema,
                  })
                  .map(({ IndexTime }) => ({
                    lastIndexed: toISOStringWithoutMs(IndexTime),
                  })),
                Stats: statsSchema,
              })
              .map(({ Repository, IndexMetadata, Stats }) => ({
                ...Repository,
                ...IndexMetadata,
                ...Stats,
              })),
          ),
        )
        .map((val) => val ?? []),
    })
    .map(({ Stats, Repos }) => ({
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

export type ListResults = v.Infer<typeof listResultSchema>["List"];
export type Repository = ListResults["repositories"][number];
