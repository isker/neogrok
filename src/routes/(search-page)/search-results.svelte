<script lang="ts">
  import type { TimedSearchResults } from "./+page";
  import SearchResultsFile from "./search-results-file.svelte";

  export let results: TimedSearchResults;
  $: ({
    backendStats: { fileCount, matchCount, filesSkipped, duration },
    files,
    requestDuration,
  } = results);
  $: frontendMatchCount = files.reduce((n, { matchCount: m }) => n + m, 0);
</script>

<h1 class="text-xs flex flex-wrap pt-2">
  <span>
    Backend: {fileCount}
    {fileCount === 1 ? "file" : "files"} / {matchCount}
    {matchCount === 1 ? "match" : "matches"}
    {#if filesSkipped > 0}
      <span
        title="The number of matches found on the backend reached the maximum limits, so the search was aborted and these counts are incomplete"
        class="text-yellow-700 cursor-help underline decoration-dashed"
      >
        (truncated)
      </span>
    {/if}
    /
    {Math.floor(duration / 1e4) / 1e2}
    ms
  </span>
  <!-- TODO indicate when frontend files/matches are limited by the parameters in the search form -->
  <span class="ml-auto">
    Frontend: {files.length}
    {files.length === 1 ? "file" : "files"} / {frontendMatchCount}
    {frontendMatchCount === 1 ? "match" : "matches"} / {requestDuration}ms
  </span>
</h1>
<!-- TODO enable removing this key by making SearchResultsFile reset its internal state when props change. -->
{#each files as file, i (`${file.repository}/${file.fileName.tokens
  .map(({ text }) => text)
  .join()}@${file.branches.join(";")}`)}
  <SearchResultsFile {file} rank={i + 1} />
{/each}
