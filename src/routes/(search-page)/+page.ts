import type { SearchResponse, SearchResults } from "$lib/server/search-api";
import { parseSearchParams } from "./route-search-query";

export type SearchOutcome =
  | { kind: "none" }
  | { kind: "success"; results: SearchResults }
  | { kind: "error"; error: string };

export const load: import("./$types").PageLoad = async ({ url, fetch }) => ({
  searchOutcome: await executeSearch(url, fetch),
});

const executeSearch = async (
  url: URL,
  f: typeof fetch,
): Promise<SearchOutcome> => {
  const { query, ...rest } = parseSearchParams(new URL(url).searchParams);
  if (query === undefined) {
    return { kind: "none" };
  }

  try {
    const response = await f("/api/search", {
      method: "POST",
      body: JSON.stringify({ query, ...rest }),
      headers: { "content-type": "application/json" },
    });
    const searchResponse: SearchResponse = await response.json();
    if (searchResponse.kind === "success") {
      return {
        kind: "success",
        results: searchResponse.results,
      };
    } else {
      return searchResponse;
    }
  } catch (error) {
    console.error("Search failed", error);
    return { kind: "error", error: String(error) };
  }
};
