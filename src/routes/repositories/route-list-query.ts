import { goto } from "$app/navigation";
import { navigating, page } from "$app/stores";
import type { SearchType } from "$lib/preferences";
import { derived, get } from "svelte/store";

type RouteListQuery = {
  readonly query: string | undefined;
};

export const parseSearchParams = (
  searchParams: URLSearchParams
): RouteListQuery => ({
  // coerce the empty string to undefined
  query: searchParams.get("q") || undefined,
});

export const routeListQuery = derived(page, (p) =>
  parseSearchParams(p.url.searchParams)
);

// This function is only called in the browser, so it's fine to have this be in
// module state.
let lastNavigateTime = 0;
export const updateRouteListQuery = ({
  query,
  searchType,
}: {
  query?: string;
  searchType: SearchType;
}) => {
  // SvelteKit "buffers" ongoing navigations - navigations complete, _then_ the
  // URL is updated. This is in contrast to other things like react-router that
  // update the URL ASAP and concurrently effect the navigation. The upshot is
  // that we need to use the URL of where we're _going_ to be, not where we are,
  // as a baseline for comparison to decide if additional navigations are
  // needed.
  const baselineUrl = get(navigating)?.to?.url ?? get(page).url;
  const listQuery = parseSearchParams(baselineUrl.searchParams);

  const queryChanged = (query || undefined) !== listQuery.query;

  if (queryChanged) {
    const now = Date.now();
    const next = new URL(baselineUrl);

    if (query) {
      next.searchParams.set("q", query);
    } else {
      next.searchParams.delete("q");
    }

    goto(next, {
      replaceState: searchType === "live" && now - lastNavigateTime < 2000,
      keepFocus: true,
      noScroll: true,
    });
    lastNavigateTime = now;
  }
};
