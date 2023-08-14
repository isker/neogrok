<script lang="ts">
  import type { ContentToken } from "$lib/server/content-parser";
  import { toTailwindClasses } from "./highlighting";

  export let tokens: ReadonlyArray<ContentToken>;
</script>

{#each tokens as { text, match, highlightClass }}
  <span class={toTailwindClasses(highlightClass)} class:bg-yellow-200={match}
    >{text}</span
  >
{/each}
