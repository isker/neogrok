import { goto } from "$app/navigation";
import { navigating, page } from "$app/state";
import type { SearchType } from "$lib/preferences.svelte";
import type { ListQuery } from "$lib/server/zoekt-list-repositories";

const defaultQueryOptions: RouteListQuery = Object.freeze({ repos: 100 });

export type RouteListQuery = ListQuery & {
  // This is only used in the frontend, there is no support for truncation in
  // the zoekt repositories list API, because there is no sorting.
  readonly repos: number;
};

export const parseSearchParams = (
  searchParams: URLSearchParams,
): RouteListQuery => {
  const parsedRepos = Number.parseInt(searchParams.get("repos") ?? "", 10);

  // coerce the empty string to undefined
  const query = searchParams.get("q") || undefined;
  const repos = parsedRepos >= 0 ? parsedRepos : defaultQueryOptions.repos;

  return {
    query,
    repos,
  };
};

// This function is only called in the browser, so it's fine to have this be in
// module state.
let lastNavigateTime = 0;
export const updateRouteListQuery = ({
  query,
  repos,
  searchType,
}: {
  query?: string;
  repos?: number;
  searchType: SearchType;
}) => {
  // SvelteKit "buffers" ongoing navigations - navigations complete, _then_ the
  // URL is updated. This is in contrast to other things like react-router that
  // update the URL ASAP and concurrently effect the navigation. The upshot is
  // that we need to use the URL of where we're _going_ to be, not where we are,
  // as a baseline for comparison to decide if additional navigations are
  // needed.
  const baselineUrl = navigating.to?.url ?? page.url;
  const listQuery = parseSearchParams(baselineUrl.searchParams);

  const queryChanged =
    query !== undefined && (query || undefined) !== listQuery.query;
  const reposChanged =
    repos !== undefined && repos >= 0 && repos !== listQuery.repos;

  if (queryChanged || reposChanged) {
    const now = Date.now();
    const next = new URL(baselineUrl);

    if (queryChanged && query) {
      next.searchParams.set("q", query);
    } else if (queryChanged) {
      next.searchParams.delete("q");
    }

    if (reposChanged && repos === defaultQueryOptions.repos) {
      next.searchParams.delete("repos");
    } else if (reposChanged) {
      next.searchParams.set("repos", repos.toString());
    }

    goto(next, {
      replaceState: searchType === "live" && now - lastNavigateTime < 2000,
      keepFocus: true,
      noScroll: true,
    });
    lastNavigateTime = now;
  }
};
