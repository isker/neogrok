<script lang="ts">
  import Link from "$lib/link.svelte";
  import type { Repository } from "$lib/server/zoekt-list-repositories";

  export let branches: Repository["branches"];
  export let commitUrlTemplate: string | undefined;

  // Abbreviate git hashes. Helps make the very wide table a bit narrower.
  const abbreviateVersion = (v: string) =>
    /^[a-z0-9]{40}$/.test(v) ? v.slice(0, 8) : v;
</script>

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
{:else}
  n/a
{/each}
