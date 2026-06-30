<script lang="ts">
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  import type { ContentLine } from "$lib/server/content-parser";
  import LineWindow from "./line-window.svelte";

  type Props = {
    data: import("./$types").PageData;
  };

  let { data }: Props = $props();
  const file = $derived(data.file);

  const metadata = $derived([
    `${file.lines.length} ${file.lines.length === 1 ? "line" : "lines"}`,
    // As in search results, only show branches when they're interesting: local
    // repos have none, and a lone HEAD isn't worth yelling about.
    ...(file.branches.length > 1 ||
    (file.branches.length === 1 && file.branches[0] !== "HEAD")
      ? [file.branches.join(", ")]
      : []),
    file.language,
  ]);

  // Chunk the file into fixed-size windows. Each window highlights itself only
  // when scrolled into view (see line-window.svelte), so opening a huge file
  // doesn't tokenize the whole thing on the main thread at once. The window is
  // large enough that syntax that spans lines (block comments, etc.) is rarely
  // cut at a boundary, where independent per-window tokenization would mishighlight
  // it - the same tradeoff search results already make per chunk.
  const WINDOW_SIZE = 500;
  const windows = $derived.by(() => {
    const result: Array<Array<{ lineNumber: number; line: ContentLine }>> = [];
    for (let start = 0; start < file.lines.length; start += WINDOW_SIZE) {
      result.push(
        file.lines.slice(start, start + WINDOW_SIZE).map((text, i) => ({
          lineNumber: start + i + 1,
          line: { text, matchRanges: [] },
        })),
      );
    }
    return result;
  });

  // Fixed gutter width (in `ch`) so the line-number column doesn't slide as you
  // scroll between windows whose line numbers have different digit counts.
  const gutterCh = $derived(Math.max(2, String(file.lines.length).length) + 1);
</script>

<svelte:head>
  <title>{file.fileName} - {file.repository} - neogrok</title>
</svelte:head>

<section class="flex flex-col gap-1">
  <h1
    class="px-2 py-1 text-sm flex flex-wrap bg-slate-100 dark:bg-slate-800 whitespace-pre-wrap [overflow-wrap:anywhere]"
  >
    <span
      ><span>{file.repository}</span><span
        ><ChevronRight class="inline" size={16} /></span
      >{file.fileName}</span
    >
    <span class="ml-auto">{metadata.join(" | ")}</span>
  </h1>

  <div class="font-mono text-sm py-1 overflow-x-auto">
    {#each windows as lines (lines[0].lineNumber)}
      <LineWindow {lines} language={file.language} {gutterCh} />
    {/each}
  </div>
</section>
