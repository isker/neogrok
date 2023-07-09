<script lang="ts">
  import type { ListResults } from "$lib/server/zoekt-list-repositories";
  import SearchForm from "./search-form.svelte";
  import RepositoriesList from "./repositories-list.svelte";
  import { routeListQuery } from "./route-list-query";

  export let data: import("./$types").PageData;

  // Represents the last non-erroneous results, so that when we get an error,
  // we can display them instead of taking away all the results.
  let previousListResults: ListResults | null = null;
  $: {
    if (data.listOutcome.kind === "success") {
      previousListResults = data.listOutcome.results;
    }
  }
</script>

<svelte:head>
  <title
    >{$routeListQuery.query
      ? `${$routeListQuery.query} - `
      : ""}neogrok/repositories</title
  >
</svelte:head>

<!--
  We hoist this above the conditions so that it never gets destroyed/remounted
  as we transition among the states they represent.  This is important for
  proper maintenance of the intricate synchronization between the route state
  and the form state.
-->
<SearchForm
  queryError={data.listOutcome.kind === "error" ? data.listOutcome.error : null}
/>
{#if data.listOutcome.kind === "error" && previousListResults}
  <RepositoriesList results={previousListResults} />
{:else if data.listOutcome.kind === "success"}
  <RepositoriesList results={data.listOutcome.results} />
{/if}
