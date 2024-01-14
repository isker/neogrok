<script lang="ts">
  import { ChevronRight } from "lucide-svelte";
  import Link from "$lib/link.svelte";
  import type { ResultFile } from "$lib/server/search-api";
  import RenderedContent from "./rendered-content.svelte";

  export let file: ResultFile;
  export let rank: number;

  $: metadata = [
    `${file.matchCount} ${file.matchCount === 1 ? "match" : "matches"}`,
    // I don't like every result just yelling HEAD, it's not particularly useful
    // information.
    ...(file.branches.length > 1 || file.branches[0] !== "HEAD"
      ? [file.branches.join(", ")]
      : []),
    file.language || "Text",
    `№${rank}`,
  ];
</script>

<h2
  class="px-2 py-1 text-sm sticky top-0 flex flex-wrap bg-slate-100 whitespace-pre-wrap [overflow-wrap:anywhere]"
>
  <!-- ideally we could hyperlink the repository but there is no such
       URL in search results - either we do dumb stuff to the file template URL
       or we make a separate /list API request for each repo -->
  <span>
    {file.repository}<ChevronRight
      class="inline"
      size={16}
    />{#if file.fileUrl}<Link to={file.fileUrl}>
        <RenderedContent content={file.fileName} /></Link
      >{:else}<RenderedContent content={file.fileName} />{/if}</span
  >
  <span class="ml-auto">{metadata.join(" | ")}</span>
</h2>
