<script lang="ts">
  import { page } from "$app/state";
  import type { SearchResults as ApiSearchResults } from "$lib/server/search-api";
  import SearchForm from "./search-form.svelte";
  import Lander from "./lander.svelte";
  import SearchResults from "./search-results.svelte";
  import { parseSearchParams } from "./route-search-query";

  let routeSearchQuery = $derived(parseSearchParams(page.url.searchParams));

  type Props = {
    data: import("./$types").PageData;
  };

  let { data }: Props = $props();

  // Represents the last non-erroneous results, so that when we get an error,
  // we can display them instead of taking away all the results.
  // svelte-ignore state_referenced_locally
  let previousSearchResults = $state.raw<ApiSearchResults | null>(
    data.searchOutcome.kind === "success" ? data.searchOutcome.results : null,
  );
  $effect.pre(() => {
    if (data.searchOutcome.kind === "success") {
      previousSearchResults = data.searchOutcome.results;
    } else if (data.searchOutcome.kind === "none") {
      previousSearchResults = null;
    }
  });
</script>

<svelte:head>
  <title
    >{routeSearchQuery.query
      ? `${routeSearchQuery.query} - `
      : ""}neogrok</title
  >
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
