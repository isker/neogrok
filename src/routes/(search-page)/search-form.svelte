<script lang="ts">
  import { ChevronUp, ChevronDown } from "lucide-svelte";
  import { onDestroy } from "svelte";
  import { navigating } from "$app/stores";
  import {
    acquireFileMatchesCutoffStore,
    acquireMatchSortOrderStore,
    acquireSearchTypeStore,
  } from "$lib/preferences";
  import {
    routeSearchQuery,
    updateRouteSearchQuery,
  } from "./route-search-query";
  import IntegerInput from "./integer-input.svelte";

  export let queryError: string | null = null;

  const searchType = acquireSearchTypeStore();
  const matchSortOrder = acquireMatchSortOrderStore();
  const fileMatchesCutoff = acquireFileMatchesCutoffStore();

  let query: string | undefined;
  let contextLines: number;
  let files: number;
  let matchesPerShard: number;
  let totalMatches: number;
  const unsubscribe = routeSearchQuery.subscribe((rq) => {
    // Sync form values with route state whenever a navigation _not_ related to
    // direct user interactions with the form.  Those are inherently already
    // covered by the relevant input bindings, and the resulting navigations
    // can conflict with those bindings.
    if ($navigating?.type !== "goto") {
      ({ query, contextLines, files, matchesPerShard, totalMatches } = rq);
    }
  });
  onDestroy(unsubscribe);

  let advancedOptionsExpanded = false;
</script>

<!--
  TODO consider more clearly indicating in the UI:
  - when a search query API request is in progress
  - in manual search, when there are pending unsubmitted changes to the form
-->
<form
  on:submit|preventDefault={() => {
    if ($searchType === "manual") {
      updateRouteSearchQuery({
        query,
        contextLines,
        files,
        matchesPerShard,
        totalMatches,
        searchType: $searchType,
      });
    }
  }}
>
  <!-- Make enter key submission work: https://stackoverflow.com/a/35235768 -->
  <input type="submit" class="hidden" />

  <div
    class="flex flex-wrap gap-y-2 justify-center font-mono whitespace-nowrap"
  >
    <label for="query" title="Search query" class="flex-auto flex">
      <span
        class="inline-block p-1 pr-2 bg-gray-300 border border-gray-400 cursor-help"
        >$ grok</span
      >
      <!-- svelte-ignore a11y-autofocus
           It's a search page, we're autofocusing. cf. google.com, bing.com, ... -->
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
        class={`p-1 border shadow-sm focus:outline-none flex-auto appearance-none ${
          queryError === null
            ? "border-slate-300 focus:border-sky-500"
            : "border-red-500"
        }`}
      />
    </label>
    <div>
      <IntegerInput
        id="context"
        bind:value={contextLines}
        on:change={(e) => {
          if ($searchType === "live") {
            updateRouteSearchQuery({
              contextLines: e.detail,
              searchType: $searchType,
            });
          }
        }}
      >
        <span
          title="Number of lines of context around matches (like grep!)"
          class="inline-block py-1 px-2 bg-gray-300 border border-gray-400 cursor-help"
        >
          -C
        </span></IntegerInput
      ><IntegerInput
        id="files"
        kind="positive"
        bind:value={files}
        on:change={(e) => {
          if ($searchType === "live") {
            updateRouteSearchQuery({
              files: e.detail,
              searchType: $searchType,
            });
          }
        }}
        ><span
          title="Maximum number of files to display"
          class="inline-block py-1 px-2 bg-gray-300 border border-gray-400 cursor-help"
        >
          | head -n
        </span>
      </IntegerInput>
    </div>
  </div>

  <div class="flex flex-wrap">
    {#if queryError !== null}
      <span class="text-sm text-red-500">{queryError} </span>
    {/if}
    <button
      type="button"
      class="ml-auto text-xs bg-slate-100 px-2 py-1 rounded-md"
      on:click={() => {
        advancedOptionsExpanded = !advancedOptionsExpanded;
      }}
    >
      Advanced options
      {#if advancedOptionsExpanded}
        <ChevronUp class="inline" size={16} />
      {:else}
        <ChevronDown class="inline" size={16} />
      {/if}
    </button>
  </div>

  <!-- TODO the advanced options UI is essentially unstyled -->
  {#if advancedOptionsExpanded}
    <div class="border flex flex-wrap">
      <fieldset class="border">
        <legend>Sort order</legend>
        <label for="line-number">
          Line number
          <input
            id="line-number"
            type="radio"
            name="sort"
            bind:group={$matchSortOrder}
            value="line-number"
          />
        </label>
        <label for="score">
          Score
          <input
            id="score"
            type="radio"
            name="sort"
            bind:group={$matchSortOrder}
            value="score"
          />
        </label>
      </fieldset>
      <fieldset class="border">
        <legend>Search type</legend>
        <label for="live">
          Live
          <input
            id="live"
            type="radio"
            name="search-type"
            bind:group={$searchType}
            value="live"
          />
        </label>
        <label for="manual">
          Manual
          <input
            id="manual"
            type="radio"
            name="search-type"
            bind:group={$searchType}
            value="manual"
          />
        </label>
      </fieldset>
      <IntegerInput id="file-matches-cutoff" bind:value={$fileMatchesCutoff}>
        Initially shown matches per file
      </IntegerInput>
      <IntegerInput
        id="matches-per-shard"
        size={4}
        bind:value={matchesPerShard}
        on:change={() => {
          if ($searchType === "live") {
            updateRouteSearchQuery({
              matchesPerShard,
              searchType: $searchType,
            });
          }
        }}
      >
        Maximum matches per shard
      </IntegerInput>
      <IntegerInput
        id="total-matches"
        size={5}
        bind:value={totalMatches}
        on:change={() => {
          if ($searchType === "live") {
            updateRouteSearchQuery({ totalMatches, searchType: $searchType });
          }
        }}
      >
        Total maximum matches
      </IntegerInput>
    </div>
  {/if}
</form>
