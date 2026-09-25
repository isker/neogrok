<script lang="ts">
  import { page } from "$app/state";
  import type { ListResults } from "$lib/server/zoekt-list-repositories";
  import SearchForm from "./search-form.svelte";
  import RepositoriesList from "./repositories-list.svelte";
  import { parseSearchParams } from "./route-list-query";

  let routeListQuery = $derived(parseSearchParams(page.url.searchParams));

  type Props = {
    data: import("./$types").PageData;
  };

  let { data }: Props = $props();

  // Represents the last non-erroneous results, so that when we get an error,
  // we can display them instead of taking away all the results.
  // svelte-ignore state_referenced_locally
  let previousListResults = $state.raw<ListResults | null>(
    data.listOutcome.kind === "success" ? data.listOutcome.results : null,
  );
  $effect.pre(() => {
    if (data.listOutcome.kind === "success") {
      previousListResults = data.listOutcome.results;
    }
  });
</script>

<svelte:head>
  <title
    >{routeListQuery.query
      ? `${routeListQuery.query} - `
      : ""}neogrok/repositories</title
  >
</svelte:head>

<SearchForm
  queryError={data.listOutcome.kind === "error" ? data.listOutcome.error : null}
/>
<RepositoriesList
  results={data.listOutcome.kind === "success"
    ? data.listOutcome.results
    : (previousListResults ?? {
        repositories: [],
        stats: { shardCount: 0, fileCount: 0, contentBytes: 0, indexBytes: 0 },
      })}
/>
