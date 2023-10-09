import { derived, get } from "svelte/store";
import type { SearchType } from "$lib/preferences";
import type { SearchQuery } from "$lib/server/search-api";
import { page, navigating } from "$app/stores";
import { goto } from "$app/navigation";

const defaultQueryOptions: Omit<SearchQuery, "query"> = Object.freeze({
  contextLines: 1,
  files: 20,
  matches: 500,
});

type RouteSearchQuery = Omit<SearchQuery, "query"> & {
  readonly query: string | undefined;
};

export const parseSearchParams = (
  searchParams: URLSearchParams,
): RouteSearchQuery => {
  const parsedContextLines = Number.parseInt(
    searchParams.get("contextLines") ?? "",
    10,
  );
  const parsedFiles = Number.parseInt(searchParams.get("files") ?? "", 10);
  const parsedMatches = Number.parseInt(searchParams.get("matches") ?? "", 10);

  // coerce empty string to undefined
  const query = searchParams.get("q") || undefined;
  const contextLines =
    parsedContextLines >= 0
      ? parsedContextLines
      : defaultQueryOptions.contextLines;
  const files = parsedFiles > 0 ? parsedFiles : defaultQueryOptions.files;
  const matches =
    parsedMatches >= 0 ? parsedMatches : defaultQueryOptions.matches;
  return {
    query,
    contextLines,
    files,
    matches,
  };
};

export const routeSearchQuery = derived(page, (p) =>
  parseSearchParams(p.url.searchParams),
);

// This function is only called in the browser, so it's fine to have this be in
// module state.
let lastNavigateTime = 0;
export const updateRouteSearchQuery = ({
  query,
  contextLines,
  files,
  matches,
  searchType,
}: {
  query?: string;
  contextLines?: number;
  files?: number;
  matches?: number;
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
  const matchesChanged =
    matches !== undefined && matches >= 0 && matches !== searchQuery.matches;

  if (queryChanged || contextLinesChanged || filesChanged || matchesChanged) {
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

    if (matchesChanged && matches === defaultQueryOptions.matches) {
      next.searchParams.delete("matches");
    } else if (matchesChanged) {
      next.searchParams.set("matches", matches.toString());
    }

    goto(next, {
      replaceState: searchType === "live" && now - lastNavigateTime < 2000,
      keepFocus: true,
      noScroll: true,
    });
    lastNavigateTime = now;
  }
};
