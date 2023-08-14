<script lang="ts">
  import prettyBytes from "pretty-bytes";
  import type { ListResults } from "$lib/server/zoekt-list-repositories";
  import Repository from "./repository.svelte";

  export let results: ListResults;

  $: ({
    stats: { fileCount, indexBytes, contentBytes },
    repositories,
  } = results);
</script>

<!-- FIXME the file count/ram size data is for repo shards matching the query,
but that's not understandable from the UI -->
<h1 class="text-xs py-1">
  {repositories.length}
  {repositories.length === 1 ? "repository" : "repositories"} containing
  {fileCount} files consuming
  {prettyBytes(indexBytes + contentBytes, { space: false })} of RAM
</h1>
<div class="overflow-x-auto">
  <table class="border-collapse text-sm w-full text-center">
    <thead>
      <tr class="border bg-slate-100">
        <th class="p-1">Repository</th>
        <th class="p-1">File count</th>
        <th class="p-1">Branches</th>
        <th class="p-1">Content size in RAM</th>
        <th class="p-1">Index size in RAM</th>
        <th class="p-1">Last indexed</th>
        <th class="p-1">Last commit</th>
      </tr>
    </thead>
    <tbody>
      {#each repositories as repository}
        <Repository {repository} />
      {/each}
    </tbody>
  </table>
</div>
