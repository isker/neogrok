import { derived, get } from "svelte/store";
import type { SearchType } from "$lib/preferences";
import type { SearchQuery } from "./search-api";
import { page, navigating } from "$app/stores";
import { goto } from "$app/navigation";

const defaultQueryOptions: Omit<SearchQuery, "query"> = Object.freeze({
  contextLines: 1,
  files: 50,
  matchesPerShard: 1e4,
  totalMatches: 1e5,
});

type RouteSearchQuery = Omit<SearchQuery, "query"> & {
  readonly query: string | undefined;
};

export const parseSearchParams = (
  searchParams: URLSearchParams
): RouteSearchQuery => {
  const parsedContextLines = Number.parseInt(
    searchParams.get("contextLines") ?? "",
    10
  );
  const parsedFiles = Number.parseInt(searchParams.get("files") ?? "", 10);
  const parsedMatchesPerShard = Number.parseInt(
    searchParams.get("matchesPerShard") ?? "",
    10
  );
  const parsedTotalMatches = Number.parseInt(
    searchParams.get("totalMatches") ?? "",
    10
  );

  // coerce empty string to undefined
  const query = searchParams.get("q") || undefined;
  const contextLines =
    parsedContextLines >= 0
      ? parsedContextLines
      : defaultQueryOptions.contextLines;
  const files = parsedFiles > 0 ? parsedFiles : defaultQueryOptions.files;
  const matchesPerShard =
    parsedMatchesPerShard >= 0
      ? parsedMatchesPerShard
      : defaultQueryOptions.matchesPerShard;
  const totalMatches =
    parsedTotalMatches >= 0
      ? parsedTotalMatches
      : defaultQueryOptions.totalMatches;
  return {
    query,
    contextLines,
    files,
    matchesPerShard,
    totalMatches,
  };
};

export const routeSearchQuery = derived(page, (p) =>
  parseSearchParams(p.url.searchParams)
);

// This function is only called in the browser, so it's fine to have this be in
// module state.
let lastNavigateTime = 0;
export const updateRouteSearchQuery = ({
  query,
  contextLines,
  files,
  matchesPerShard,
  totalMatches,
  searchType,
}: {
  query?: string;
  contextLines?: number;
  files?: number;
  matchesPerShard?: number;
  totalMatches?: number;
  searchType: SearchType;
}) => {
  // SvelteKit "buffers" ongoing navigations - navigations complete, _then_ the
  // URL is updated. This is in contrast to other things like react-router that
  // update the URL ASAP and concurrently effect the navigation. The upshot is
  // that we need to use the URL of where we're _going_ to be, not where we are,
  // as a baseline for comparison to decide if additional navigations are
  // needed.
  const baselineUrl = get(navigating)?.to?.url ?? get(page).url;
  const searchQuery = parseSearchParams(baselineUrl.searchParams);

  const queryChanged =
    query !== undefined && (query || undefined) !== searchQuery.query;
  const contextLinesChanged =
    contextLines !== undefined &&
    contextLines >= 0 &&
    contextLines !== searchQuery.contextLines;
  const filesChanged =
    files !== undefined && files >= 0 && files !== searchQuery.files;
  const matchesPerShardChanged =
    matchesPerShard !== undefined &&
    matchesPerShard >= 0 &&
    matchesPerShard !== searchQuery.matchesPerShard;
  const totalMatchesChanged =
    totalMatches !== undefined &&
    totalMatches >= 0 &&
    totalMatches !== searchQuery.totalMatches;

  if (
    queryChanged ||
    contextLinesChanged ||
    filesChanged ||
    matchesPerShardChanged ||
    totalMatchesChanged
  ) {
    const now = Date.now();
    const next = new URL(baselineUrl);

    if (queryChanged && query) {
      next.searchParams.set("q", query);
    } else if (queryChanged) {
      next.searchParams.delete("q");
    }

    if (
      contextLinesChanged &&
      contextLines === defaultQueryOptions.contextLines
    ) {
      next.searchParams.delete("contextLines");
    } else if (contextLinesChanged) {
      next.searchParams.set("contextLines", contextLines.toString());
    }

    if (filesChanged && files === defaultQueryOptions.files) {
      next.searchParams.delete("files");
    } else if (filesChanged) {
      next.searchParams.set("files", files.toString());
    }

    if (
      matchesPerShardChanged &&
      matchesPerShard === defaultQueryOptions.matchesPerShard
    ) {
      next.searchParams.delete("matchesPerShard");
    } else if (matchesPerShardChanged) {
      next.searchParams.set("matchesPerShard", matchesPerShard.toString());
    }

    if (
      totalMatchesChanged &&
      totalMatches === defaultQueryOptions.totalMatches
    ) {
      next.searchParams.delete("totalMatches");
    } else if (totalMatchesChanged) {
      next.searchParams.set("totalMatches", totalMatches.toString());
    }

    goto(next, {
      replaceState: searchType === "live" && now - lastNavigateTime < 2000,
      keepFocus: true,
      noScroll: true,
    });
    lastNavigateTime = now;
  }
};
