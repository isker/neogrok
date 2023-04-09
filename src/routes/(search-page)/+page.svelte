<script lang="ts">
  import { persistInitialPreferences } from "$lib/preferences";
  import SearchForm from "./search-form.svelte";
  import Lander from "./lander.svelte";
  import SearchResults from "./search-results.svelte";
  import type { TimedSearchResults } from "./+page.server";
  import { routeSearchQuery } from "./route-search-query";

  export let data: import("./$types").PageData;

  persistInitialPreferences(data.preferences);

  // Represents the last non-erroneous results, so that when we get an error,
  // we can display them instead of taking away all the results.
  let previousSearchResults: TimedSearchResults | null = null;
  $: {
    if (data.searchOutcome.kind === "success") {
      previousSearchResults = data.searchOutcome.results;
    } else if (data.searchOutcome.kind === "none") {
      previousSearchResults = null;
    }
  }
</script>

<svelte:head>
  {#if $routeSearchQuery.query}
    <title>{$routeSearchQuery.query} - neogrok</title>
  {:else}
    <title>neogrok</title>
  {/if}
</svelte:head>

<!--
  We hoist this above the conditions so that it never gets destroyed/remounted
  as we transition among the states they represent.  This is important for
  proper maintenance of the intricate synchronization between the route state
  and the form state.
-->
<SearchForm
  queryError={data.searchOutcome.kind === "error"
    ? data.searchOutcome.error
    : null}
/>
{#if data.searchOutcome.kind === "none"}
  <Lander />
{:else if data.searchOutcome.kind === "error"}
  {#if previousSearchResults}
    <SearchResults results={previousSearchResults} />
  {:else}
    <Lander />
  {/if}
{:else}
  <SearchResults results={data.searchOutcome.results} />
{/if}
