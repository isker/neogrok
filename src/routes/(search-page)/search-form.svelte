<script lang="ts">
  import { navigating, page } from "$app/state";
  import { usePreferences, type SearchType } from "$lib/preferences.svelte";
  import IntegerInput from "$lib/integer-input.svelte";
  import { computeInputColor } from "$lib/input-colors";
  import ToggleSearchType from "$lib/toggle-search-type.svelte";
  import ToggleMatchSortOrder from "$lib/toggle-match-sort-order.svelte";
  import LoadingEllipsis from "$lib/loading-ellipsis.svelte";
  import {
    parseSearchParams,
    updateRouteSearchQuery,
  } from "./route-search-query";

  let routeSearchQuery = $derived(parseSearchParams(page.url.searchParams));

  type Props = {
    queryError?: string | null;
  };

  let { queryError = null }: Props = $props();

  const prefs = usePreferences();

  // We need to do a complicated bidirectional mapping between the URL and the
  // form state. So, yes, this is intentional.
  // svelte-ignore state_referenced_locally
  let query: string | undefined = $state(routeSearchQuery.query);
  // svelte-ignore state_referenced_locally
  let contextLines: number = $state(routeSearchQuery.contextLines);
  // svelte-ignore state_referenced_locally
  let files: number = $state(routeSearchQuery.files);
  // svelte-ignore state_referenced_locally
  let matches: number = $state(routeSearchQuery.matches);
  $effect(() => {
    // Sync route state into form values upon a navigation _not_ related to
    // direct user interactions with the form. Those are inherently already
    // covered by the relevant input bindings, and the resulting navigations
    // can conflict with those bindings.
    if (navigating.type !== "goto") {
      ({ query, contextLines, files, matches } = routeSearchQuery);
    }
  });

  let shouldLiveSearch = $derived(
    prefs.searchType === "live" &&
      // Zoekt search is based on trigrams. Queries for 1 or 2 characters are
      // thus _really_ expensive on large instances, as they essentially can't
      // use the index fully. It's also almost always the case that users do not
      // want to make such short queries, and that such queries are being
      // executed only because live search is creating them as users type in
      // their desired longer query.
      //
      // So, force such queries into a "surprise manual" mode: they will not be
      // automatically executed, but can still be submitted with the enter key,
      // just like manual searches.
      //
      // Of course, without actually parsing the query (which we will never do,
      // in neogrok; the zoekt parser is so janky that there's no way it could
      // be maintainably reimplemented), we can't determine when a user is
      // clearing the "trigram threshold". This is just a dumb heuristic.
      (!query || query.length >= 3),
  );

  const manualSubmit = () => {
    updateRouteSearchQuery({
      query,
      contextLines,
      files,
      matches,
      searchType: prefs.searchType,
    });
  };

  // When switching from manual to live search, submit any pending changes.
  let previousSearchType: SearchType | undefined = $state();
  $effect(() => {
    if (prefs.searchType === "live" && previousSearchType === "manual") {
      manualSubmit();
    }
    previousSearchType = prefs.searchType;
  });

  // These all indicate when form changes with manual search are not yet submitted.
  let queryPending = $derived(
    navigating.type === null &&
      (routeSearchQuery.query ?? "") !== (query ?? ""),
  );
  let contextLinesPending = $derived(
    navigating.type === null && routeSearchQuery.contextLines !== contextLines,
  );
  let filesPending = $derived(
    navigating.type === null && routeSearchQuery.files !== files,
  );
  let matchesPending = $derived(
    navigating.type === null && routeSearchQuery.matches !== matches,
  );
</script>

<!-- TODO explore JS-disabled compat.  Should actually be pretty doable with `action="/"`? -->
<form
  onsubmit={(e) => {
    e.preventDefault();
    manualSubmit();
  }}
>
  <!-- Make enter key submission work: https://stackoverflow.com/a/35235768 -->
  <input type="submit" class="hidden" />

  <div class="flex flex-wrap gap-y-2 justify-center whitespace-nowrap">
    <label for="query" class="flex-auto flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500 dark:text-gray-400"
        >query<LoadingEllipsis /></span
      >
      <span
        class={`flex flex-auto p-1 border shadow-xs space-x-1 ${computeInputColor(
          {
            error: queryError !== null,
            pending: queryPending,
          },
        )}`}
      >
        <!-- It's a search page, a11y be damned. cf. google.com, bing.com, etc. -->
        <!-- svelte-ignore a11y_autofocus -->
        <input
          bind:value={query}
          oninput={() => {
            if (shouldLiveSearch) {
              updateRouteSearchQuery({ query, searchType: prefs.searchType });
            }
          }}
          id="query"
          type="search"
          autofocus
          spellcheck={false}
          autocorrect="off"
          autocapitalize="off"
          autocomplete="off"
          class="font-mono dark:bg-black focus:outline-hidden flex-auto appearance-none"
        />
        <ToggleSearchType />
        <ToggleMatchSortOrder />
      </span>
    </label>
    <label for="context" class="flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500 dark:text-gray-400">context</span>
      <IntegerInput
        id="context"
        pending={contextLinesPending}
        bind:value={contextLines}
        onChange={(value) => {
          if (shouldLiveSearch) {
            updateRouteSearchQuery({
              contextLines: value,
              searchType: prefs.searchType,
            });
          }
        }}
      />
    </label>
    <label for="files" class="flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500 dark:text-gray-400">files</span>
      <IntegerInput
        id="files"
        kind="positive"
        pending={filesPending}
        bind:value={files}
        onChange={(value) => {
          if (shouldLiveSearch) {
            updateRouteSearchQuery({
              files: value,
              searchType: prefs.searchType,
            });
          }
        }}
      />
    </label>
    <label for="matches" class="flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500 dark:text-gray-400">matches</span>
      <IntegerInput
        id="matches"
        kind="positive"
        pending={matchesPending}
        bind:value={matches}
        onChange={(value) => {
          if (shouldLiveSearch) {
            updateRouteSearchQuery({
              matches: value,
              searchType: prefs.searchType,
            });
          }
        }}
      />
    </label>
  </div>
  <div class="text-xs text-red-500">{queryError ?? "\u200b"}</div>
</form>
