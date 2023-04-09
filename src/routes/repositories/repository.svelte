<script lang="ts">
  import prettyBytes from "pretty-bytes";
  import Link from "$lib/link.svelte";
  import type { Repository } from "./list-repositories-api.server";

  export let repository: Repository;

  $: ({
    name,
    url,
    lastIndexed,
    lastCommit,
    branches,
    stats: { fileCount, indexBytes, contentBytes },
  } = repository);
</script>

<tr class="border">
  <td class="p-1">
    {#if url.length > 0}<Link to={url}>{name}</Link>{:else}{name}{/if}
  </td>
  <td class="p-1">{fileCount}</td>
  <td class="p-1">
    {branches
      .map(({ name: branchName, version }) => `${branchName}@${version}`)
      .join(" ")}
  </td>
  <td class="p-1">{prettyBytes(contentBytes, { space: false })}</td>
  <td class="p-1">{prettyBytes(indexBytes, { space: false })}</td>
  <td class="p-1">{lastIndexed}</td>
  <td class="p-1">{lastCommit}</td>
</tr>
