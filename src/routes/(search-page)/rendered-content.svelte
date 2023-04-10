<script lang="ts">
  import type { ContentToken } from "./content-parser";

  export let tokens: ReadonlyArray<ContentToken>;
</script>

{#each tokens as { kind, text, startByteOffset } (startByteOffset)}
  {#if kind === "context"}{text}{:else}<span class="bg-yellow-200">{text}</span
    >{/if}
{/each}
