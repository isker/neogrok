<script lang="ts">
  import type { ContentToken } from "$lib/server/content-parser";

  export let tokens: ReadonlyArray<ContentToken>;
</script>

{#each tokens as { text, match }}
  <span class:bg-yellow-200={match}>{text}</span>
{/each}
