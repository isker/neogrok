<script lang="ts">
  import { onDestroy } from "svelte";
  import { navigating } from "$app/stores";
  import { acquireSearchTypeStore, type SearchType } from "$lib/preferences";
  import IntegerInput from "$lib/integer-input.svelte";
  import { computeInputColor } from "$lib/input-colors";
  import ToggleSearchType from "$lib/toggle-search-type.svelte";
  import ToggleMatchSortOrder from "$lib/toggle-match-sort-order.svelte";
  import LoadingEllipsis from "$lib/loading-ellipsis.svelte";
  import {
    routeSearchQuery,
    updateRouteSearchQuery,
  } from "./route-search-query";

  export let queryError: string | null = null;

  const searchType = acquireSearchTypeStore();

  let query: string | undefined;
  let contextLines: number;
  let files: number;
  let matches: number;
  const unsubscribe = routeSearchQuery.subscribe((rq) => {
    // Sync route state into form values upon a navigation _not_ related to
    // direct user interactions with the form. Those are inherently already
    // covered by the relevant input bindings, and the resulting navigations
    // can conflict with those bindings.
    if ($navigating?.type !== "goto") {
      ({ query, contextLines, files, matches } = rq);
    }
  });
  onDestroy(unsubscribe);

  const manualSubmit = () => {
    updateRouteSearchQuery({
      query,
      contextLines,
      files,
      matches,
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
    $navigating === null && ($routeSearchQuery.query ?? "") !== (query ?? "");
  $: contextLinesPending =
    $navigating === null && $routeSearchQuery.contextLines !== contextLines;
  $: filesPending = $navigating === null && $routeSearchQuery.files !== files;
  $: matchesPending =
    $navigating === null && $routeSearchQuery.matches !== matches;
</script>

<!-- TODO explore JS-disabled compat.  Should actually be pretty doable with `action="/"`? -->
<form
  on:submit|preventDefault={() => {
    if ($searchType === "manual") {
      manualSubmit();
    }
  }}
>
  <!-- Make enter key submission work: https://stackoverflow.com/a/35235768 -->
  <input type="submit" class="hidden" />

  <div class="flex flex-wrap gap-y-2 justify-center whitespace-nowrap">
    <label for="query" class="flex-auto flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500">query<LoadingEllipsis /></span>
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
            if ($searchType === "live") {
              updateRouteSearchQuery({ query, searchType: $searchType });
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
        <ToggleMatchSortOrder />
      </span>
    </label>
    <label for="context" class="flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500">context</span>
      <IntegerInput
        id="context"
        pending={contextLinesPending}
        bind:value={contextLines}
        on:change={(e) => {
          if ($searchType === "live") {
            updateRouteSearchQuery({
              contextLines: e.detail,
              searchType: $searchType,
            });
          }
        }}
      />
    </label>
    <label for="files" class="flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500">files</span>
      <IntegerInput
        id="files"
        kind="positive"
        pending={filesPending}
        bind:value={files}
        on:change={(e) => {
          if ($searchType === "live") {
            updateRouteSearchQuery({
              files: e.detail,
              searchType: $searchType,
            });
          }
        }}
      />
    </label>
    <label for="matches" class="flex flex-col space-y-0.5">
      <span class="text-xs px-1 text-gray-500">matches</span>
      <IntegerInput
        id="matches"
        kind="positive"
        pending={matchesPending}
        bind:value={matches}
        on:change={(e) => {
          if ($searchType === "live") {
            updateRouteSearchQuery({
              matches: e.detail,
              searchType: $searchType,
            });
          }
        }}
      />
    </label>
  </div>
  <div class="text-xs text-red-500">{queryError ?? "\u200b"}</div>
</form>
