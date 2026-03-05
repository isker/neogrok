<script lang="ts">
  import { page } from "$app/state";
  import type { SearchResults } from "$lib/server/search-api";
  import { parseSearchParams } from "./route-search-query";
  import SearchResultsFile from "./search-results-file.svelte";

  let routeSearchQuery = $derived(parseSearchParams(page.url.searchParams));

  type Props = {
    results: SearchResults;
  };

  let { results }: Props = $props();
  let {
    zoektStats: { fileCount, matchCount, filesSkipped, duration },
    files,
  } = $derived(results);
  let neogrokMatchCount = $derived(
    files.reduce((n, { matchCount: m }) => n + m, 0),
  );

  let filesLimited = $derived(
    fileCount > files.length && files.length === routeSearchQuery.files,
  );
  let matchesLimited = $derived(
    matchCount > neogrokMatchCount &&
      neogrokMatchCount === routeSearchQuery.matches,
  );
</script>

<h1 class="text-xs flex flex-wrap py-1">
  <span>
    zoekt: {fileCount}
    {fileCount === 1 ? "file" : "files"} / {matchCount}
    {matchCount === 1 ? "match" : "matches"}
    {#if filesSkipped > 0}
      <span
        title="The number of matches found in zoekt reached the maximum limits, so the search was aborted and these counts are incomplete"
        class="text-yellow-700 dark:text-yellow-600 cursor-help underline decoration-dashed"
      >
        (truncated)
      </span>
    {/if} / {Math.floor(duration / 1e4) / 1e2}ms
  </span>
  <span class="ml-auto">
    neogrok: <span
      class={filesLimited ? "text-yellow-700 dark:text-yellow-600" : ""}
      >{files.length} {files.length === 1 ? "file" : "files"}</span
    >
    /
    <span class={matchesLimited ? "text-yellow-700 dark:text-yellow-600" : ""}
      >{neogrokMatchCount}
      {neogrokMatchCount === 1 ? "match" : "matches"}</span
    >
  </span>
</h1>
<div class="space-y-2">
  {#each files as file, i (`${file.repository}/${file.fileName.text}@${file.branches.join(";")}`)}
    <SearchResultsFile {file} rank={i + 1} />
  {/each}
</div>
