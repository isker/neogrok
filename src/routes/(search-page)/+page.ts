import { parseSearchParams } from "./route-search-query";
import { search, type SearchResults as ApiSearchResults } from "./search-api";

export type SearchOutcome =
  | { kind: "none" }
  // TODO for long searches, we should consider making `results` a Promise.
  // Needs benchmarking to determine just how slow a zoekt backend can get with
  // large repositories.
  | { kind: "success"; results: TimedSearchResults }
  | { kind: "error"; error: string };
export type TimedSearchResults = ApiSearchResults & { requestDuration: number };

export const load: import("./$types").PageLoad = async ({
  url,
  fetch,
  data: { preferences },
}) => ({
  searchOutcome: await executeSearch(url, fetch),
  preferences,
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
    const response = await search({ query, ...rest }, f);
    if (response.kind === "success") {
      return {
        kind: "success",
        results: { ...response.results, requestDuration: Date.now() - start },
      };
    } else {
      return response;
    }
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      )
    ) {
      console.error("Search failed", error);
    }
    return { kind: "error", error: String(error) };
  }
};
