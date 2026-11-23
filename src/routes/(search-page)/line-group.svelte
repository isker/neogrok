<script lang="ts">
  import type { ResultFile } from "#lib/server/search-api.js";
  import type { LineGroup } from "./chunk-renderer";
  import RenderedContent from "./rendered-content.svelte";

  type Props = {
    lines: LineGroup;
    file: ResultFile;
  };

  let { lines, file }: Props = $props();
</script>

<!--
    minmax because we don't want the line number column to slide left and
    right as you scroll down through sections with different `min-content`s'
    worth of line numbers. 2rem is enough for 3 digits, which should cover
    the overwhelming majority of cases.
-->
<div
  class="py-1 grid grid-cols-[minmax(2rem,min-content)_1fr] gap-x-2 whitespace-pre overflow-x-auto"
>
  {#each lines as { lineNumber, line }}
    <span class="select-none text-gray-600 dark:text-gray-500 text-right pr-1">
      {#if file.fileUrl && file.lineNumberTemplate}
        <a
          class="hover:underline decoration-1"
          href={`${file.fileUrl}${file.lineNumberTemplate.join(
            lineNumber.toString(),
          )}`}>{lineNumber}</a
        >
      {:else}{lineNumber}{/if}
    </span>
    <code><RenderedContent content={line} highlights={line.highlights} /></code>
  {/each}
</div>
