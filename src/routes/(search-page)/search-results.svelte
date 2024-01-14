<script lang="ts">
  import type { SearchResults } from "$lib/server/search-api";
  import { routeSearchQuery } from "./route-search-query";
  import SearchResultsFile from "./search-results-file.svelte";

  export let results: SearchResults;
  $: ({
    zoektStats: { fileCount, matchCount, filesSkipped, duration },
    files,
  } = results);
  $: neogrokMatchCount = files.reduce((n, { matchCount: m }) => n + m, 0);

  $: filesLimited =
    fileCount > files.length && files.length === $routeSearchQuery.files;
  $: matchesLimited =
    matchCount > neogrokMatchCount &&
    neogrokMatchCount === $routeSearchQuery.matches;
</script>

<h1 class="text-xs flex flex-wrap py-1">
  <span>
    zoekt: {fileCount}
    {fileCount === 1 ? "file" : "files"} / {matchCount}
    {matchCount === 1 ? "match" : "matches"}
    {#if filesSkipped > 0}
      <span
        title="The number of matches found in zoekt reached the maximum limits, so the search was aborted and these counts are incomplete"
        class="text-yellow-700 cursor-help underline decoration-dashed"
      >
        (truncated)
      </span>
    {/if} / {Math.floor(duration / 1e4) / 1e2}ms
  </span>
  <span class="ml-auto">
    neogrok: <span class:text-yellow-700={filesLimited}
      >{files.length} {files.length === 1 ? "file" : "files"}</span
    >
    /
    <span class:text-yellow-700={matchesLimited}
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
