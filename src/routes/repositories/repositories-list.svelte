<script lang="ts">
  import prettyBytes from "pretty-bytes";
  import type {
    ListResults,
    RepoStats,
  } from "$lib/server/zoekt-list-repositories";
  import RepositoryName from "./repository-name.svelte";
  import Branches from "./branches.svelte";
  import Sortable from "./sortable-column-header.svelte";
  import { createComparator, type SortBy } from "./table-sorting";
  import { routeListQuery } from "./route-list-query";
  import Link from "$lib/link.svelte";

  export let results: ListResults;

  let sortBy: SortBy | null = null;
  $: sorted =
    sortBy === null
      ? results.repositories
      : Array.from(results.repositories).sort(createComparator(sortBy));

  $: truncated = sorted.slice(0, $routeListQuery.repos);
  $: limited = results.repositories.length > $routeListQuery.repos;
  $: truncatedStats = limited
    ? truncated.reduce<RepoStats>(
        (acc, val) => {
          acc.shardCount += val.shardCount;
          acc.fileCount += val.fileCount;
          acc.indexBytes += val.indexBytes;
          acc.contentBytes += val.contentBytes;
          return acc;
        },
        {
          shardCount: 0,
          fileCount: 0,
          indexBytes: 0,
          contentBytes: 0,
        },
      )
    : results.stats;
</script>

<h1 class="text-xs flex flex-wrap py-1">
  <span>
    zoekt: {results.repositories.length}
    {results.repositories.length === 1 ? "repository" : "repositories"} /
    {results.stats.shardCount}
    {results.stats.shardCount === 1 ? "shard" : "shards"} /
    {results.stats.fileCount}
    {results.stats.fileCount === 1 ? "file" : "files"} /
    {prettyBytes(results.stats.indexBytes + results.stats.contentBytes, {
      space: false,
      binary: true,
    })} RAM
  </span>
  <span class="ml-auto"
    >neogrok: <span class:text-yellow-700={limited}
      >{truncated.length}
      {truncated.length === 1 ? "repository" : "repositories"}</span
    >
    /
    {truncatedStats.shardCount}
    {truncatedStats.shardCount === 1 ? "shard" : "shards"} /
    {truncatedStats.fileCount}
    {truncatedStats.fileCount === 1 ? "file" : "files"} /
    {prettyBytes(truncatedStats.indexBytes + truncatedStats.contentBytes, {
      space: false,
      binary: true,
    })} RAM
  </span>
</h1>

<div class="overflow-x-auto">
  <table class="border-collapse text-sm w-full text-center h-fit">
    <thead class="border bg-slate-100">
      <tr>
        <th></th>
        <th></th>
        <th class="p-1 border-x" colspan="4"
          >Index <Link to="/about#repository-stats">shard files</Link></th
        >
        <th></th>
        <th></th>
      </tr>
      <tr class="h-full">
        <th class="p-1"
          ><Sortable bind:sortBy sortColumn={{ prop: "name", kind: "string" }}
            ><div>Repository</div></Sortable
          ></th
        >
        <th class="p-1">Branches</th>
        <th class="p-1 border-l"
          ><Sortable
            bind:sortBy
            sortColumn={{ prop: "shardCount", kind: "number" }}
            >Shard count</Sortable
          ></th
        >
        <th class="p-1"
          ><Sortable
            bind:sortBy
            sortColumn={{ prop: "fileCount", kind: "number" }}
            >Contained files</Sortable
          ></th
        >
        <th class="p-1"
          ><Sortable
            bind:sortBy
            sortColumn={{ prop: "indexBytes", kind: "number" }}
            >Index size in RAM</Sortable
          ></th
        >
        <th class="p-1 border-r"
          ><Sortable
            bind:sortBy
            sortColumn={{ prop: "contentBytes", kind: "number" }}
            >Content size in RAM</Sortable
          ></th
        >
        <th class="p-1"
          ><Sortable
            bind:sortBy
            sortColumn={{ prop: "lastIndexed", kind: "string" }}
            >Last indexed</Sortable
          ></th
        >
        <th class="p-1"
          ><Sortable
            bind:sortBy
            sortColumn={{ prop: "lastCommit", kind: "string" }}
            >Last commit</Sortable
          ></th
        >
      </tr>
    </thead>
    <tbody>
      {#each truncated as { name, url, branches, commitUrlTemplate, shardCount, fileCount, indexBytes, contentBytes, lastIndexed, lastCommit }}
        <tr class="border">
          <td class="p-1 border-x"><RepositoryName {name} {url} /></td>
          <td class="p-1 border-x"
            ><Branches {branches} {commitUrlTemplate} /></td
          >
          <td class="p-1 border-x text-right">{shardCount}</td>
          <td class="p-1 border-x text-right">{fileCount}</td>
          <td class="p-1 border-x text-right"
            >{prettyBytes(indexBytes, { space: false, binary: true })}</td
          >
          <td class="p-1 border-x text-right"
            >{prettyBytes(contentBytes, { space: false, binary: true })}</td
          >
          <td class="p-1 border-x">{lastIndexed}</td>
          <td class="p-1 border-x">{lastCommit ?? "n/a"}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
