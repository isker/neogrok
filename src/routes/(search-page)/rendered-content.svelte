<script lang="ts">
  import type { ContentToken } from "$lib/server/content-parser";

  export let tokens: ReadonlyArray<ContentToken>;
</script>

{#each tokens as { text, match }}
  {#if match}
    <mark class="bg-yellow-200">{text}</mark>
  {:else}
    {text}
  {/if}
{/each}
