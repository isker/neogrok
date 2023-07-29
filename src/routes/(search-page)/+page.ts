import type {
  SearchResponse,
  SearchResults as ApiSearchResults,
} from "$lib/server/search-api";
import { parseSearchParams } from "./route-search-query";

export type SearchOutcome =
  | { kind: "none" }
  // TODO for long searches, we should consider making `results` a Promise.
  // Needs benchmarking to determine just how slow a zoekt backend can get with
  // large repositories.
  | { kind: "success"; results: TimedSearchResults }
  | { kind: "error"; error: string };
export type TimedSearchResults = ApiSearchResults & { requestDuration: number };

export const load: import("./$types").PageLoad = async ({ url, fetch }) => ({
  searchOutcome: await executeSearch(url, fetch),
});

const executeSearch = async (
  url: URL,
  f: typeof fetch
): Promise<SearchOutcome> => {
  const start = Date.now();
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
        results: {
          ...searchResponse.results,
          requestDuration: Date.now() - start,
        },
      };
    } else {
      return searchResponse;
    }
  } catch (error) {
    console.error("Search failed", error);
    return { kind: "error", error: String(error) };
  }
};
