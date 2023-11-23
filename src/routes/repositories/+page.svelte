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

<SearchForm
  queryError={data.listOutcome.kind === "error" ? data.listOutcome.error : null}
/>
<RepositoriesList
  results={data.listOutcome.kind === "success"
    ? data.listOutcome.results
    : previousListResults ?? {
        repositories: [],
        stats: { shardCount: 0, fileCount: 0, contentBytes: 0, indexBytes: 0 },
      }}
/>
