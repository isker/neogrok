<script lang="ts">
  import prettyBytes from "pretty-bytes";
  import Link from "$lib/link.svelte";
  import type { Repository } from "$lib/server/zoekt-list-repositories";

  export let repository: Repository;

  $: ({
    name,
    url,
    lastIndexed,
    lastCommit,
    branches,
    stats: { fileCount, indexBytes, contentBytes },
    commitUrlTemplate,
  } = repository);

  // Abbreviate git hashes. Helps make the very wide table a bit narrower.
  const abbreviateVersion = (v: string) =>
    /^[a-z0-9]{40}$/.test(v) ? v.slice(0, 8) : v;
</script>

<tr class="border">
  <td class="p-1">
    {#if url.length > 0}<Link to={url}>{name}</Link>{:else}{name}{/if}
  </td>
  <td class="p-1">{fileCount}</td>
  <td class="p-1">
    {#each branches as { name: branchName, version }}
      {branchName}@<span class="font-mono">
        {#if commitUrlTemplate}
          <Link to={commitUrlTemplate.replaceAll("{{.Version}}", version)}
            >{abbreviateVersion(version)}</Link
          >
        {:else}
          {abbreviateVersion(version)}
        {/if}
      </span>
    {/each}
  </td>
  <td class="p-1">{prettyBytes(contentBytes, { space: false })}</td>
  <td class="p-1">{prettyBytes(indexBytes, { space: false })}</td>
  <td class="p-1">{lastIndexed}</td>
  <td class="p-1">{lastCommit}</td>
</tr>
