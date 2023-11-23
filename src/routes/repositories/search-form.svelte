<script lang="ts">
  import { onDestroy } from "svelte";
  import { navigating } from "$app/stores";
  import { acquireSearchTypeStore, type SearchType } from "$lib/preferences";
  import { computeInputColor } from "$lib/input-colors";
  import { routeListQuery, updateRouteListQuery } from "./route-list-query";
  import ToggleSearchType from "$lib/toggle-search-type.svelte";
  import LoadingEllipsis from "$lib/loading-ellipsis.svelte";
  import IntegerInput from "$lib/integer-input.svelte";

  export let queryError: string | null;

  const searchType = acquireSearchTypeStore();

  let query: string | undefined;
  let repos: number;
  const unsubscribe = routeListQuery.subscribe((rq) => {
    // Sync form values with route state whenever a navigation _not_ related to
    // direct user interactions with the form.  Those are inherently already
    // covered by the relevant input bindings, and the resulting navigations
    // can conflict with those bindings.
    if ($navigating?.type !== "goto") {
      ({ query, repos } = rq);
    }
  });
  onDestroy(unsubscribe);

  const shouldLiveSearch = () =>
    $searchType === "live" &&
    // Same trigram efficiency rules as on the main search page.
    (!query || query.length >= 3);

  const manualSubmit = () => {
    updateRouteListQuery({
      query,
      repos,
      searchType: $searchType,
    });
  };

  // When switching from manual to live search, submit any pending changes.
  let previousSearchType: SearchType | undefined;
  $: {
    if ($searchType === "live" && previousSearchType === "manual") {
      manualSubmit();
    }
    previousSearchType = $searchType;
  }

  // These all indicate when form changes with manual search are not yet submitted.
  $: queryPending =
    $navigating === null && ($routeListQuery.query ?? "") !== (query ?? "");
  $: reposPending = $navigating === null && $routeListQuery.repos !== repos;
</script>

<form
  on:submit|preventDefault={() => {
    manualSubmit();
  }}
>
  <!-- Make enter key submission work: https://stackoverflow.com/a/35235768 -->
  <input type="submit" class="hidden" />

  <div class="flex flex-wrap gap-y-2 justify-center whitespace-nowrap">
    <label for="query" class="flex-auto flex flex-col space-y-0.5">
      <span
        title="Same query syntax as the main search - use `r:name` to filter repositories by name, otherwise you are filtering them by their content!"
        class="text-xs px-1 text-gray-500">query<LoadingEllipsis /></span
      >
      <span
        class={`flex flex-auto p-1 border shadow-sm space-x-1 ${computeInputColor(
          {
            error: queryError !== null,
            pending: queryPending,
          },
        )}`}
      >
        <!-- It's a search page, a11y be damned. cf. google.com, bing.com, etc. -->
        <!-- svelte-ignore a11y-autofocus -->
        <input
          bind:value={query}
          on:input={() => {
            if (shouldLiveSearch()) {
              updateRouteListQuery({ query, searchType: $searchType });
            }
          }}
          id="query"
          type="search"
          autofocus
          spellcheck={false}
          autocorrect="off"
          autocapitalize="off"
          autocomplete="off"
          class="font-mono focus:outline-none flex-auto appearance-none"
        />
        <ToggleSearchType />
      </span>
    </label>
    <label for="repos" class="flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500">repos</span>
      <IntegerInput
        id="context"
        pending={reposPending}
        bind:value={repos}
        on:change={(e) => {
          if (shouldLiveSearch()) {
            updateRouteListQuery({
              repos: e.detail,
              searchType: $searchType,
            });
          }
        }}
      />
    </label>
  </div>
  <div class="text-xs text-red-500">{queryError ?? "\u200b"}</div>
</form>
