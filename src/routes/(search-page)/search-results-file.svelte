<script lang="ts">
  import {
    acquireFileMatchesCutoffStore,
    acquireMatchSortOrderStore,
  } from "$lib/preferences";
  import type { ResultFile } from "./search-api";
  import type { ContentToken } from "./content-parser";
  import SearchResultsFileHeader from "./search-results-file-header.svelte";
  import RenderedContent from "./rendered-content.svelte";

  const renderChunksToLineGroups = (
    chunks: ResultFile["chunks"],
    cutoff: number,
    expanded: boolean
  ) => {
    // Groups of contiguous lines in the file; contiguous matches are merged into
    // a single group.
    const lineGroups: Array<
      Array<{ lineNumber: number; lineTokens: ReadonlyArray<ContentToken> }>
    > = [];
    let preCutoffMatchCount = 0;

    // The goal is to produce the minimal number of lineGroups that exceed the
    // cutoff. We don't want to cut a file section in half to make the exact
    // cutoff (nor can we, if the cutoff is exceeded in the middle of a single
    // line).
    if (cutoff > 0) {
      for (const { matchCount, lines } of chunks) {
        const [{ lineNumber: startLineNumber }] = lines;
        const contiguous =
          lineGroups.at(-1)?.at(-1)?.lineNumber === startLineNumber - 1;

        const beyondCutoff = !contiguous && preCutoffMatchCount >= cutoff;
        if (beyondCutoff && !expanded) {
          break;
        } else if (!beyondCutoff) {
          preCutoffMatchCount += matchCount;
        }

        if (contiguous) {
          // By the definition of `contiguous` we know this exists.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          lineGroups.at(-1)!.push(...lines);
        } else {
          // Make a copy. We will be mutating it.
          lineGroups.push([...lines]);
        }
      }
    }

    return { lineGroups, preCutoffMatchCount };
  };

  export let file: ResultFile;
  export let rank: number;

  const matchSortOrder = acquireMatchSortOrderStore();
  const fileMatchesCutoff = acquireFileMatchesCutoffStore();

  $: sortedChunks =
    $matchSortOrder === "line-number"
      ? [...file.chunks].sort(
          ({ lines: [{ lineNumber: a }] }, { lines: [{ lineNumber: b }] }) =>
            a - b
        )
      : // Nothing to do otherwise; matches are already sorted by score.
        file.chunks;

  let expanded = false;
  $: ({ lineGroups, preCutoffMatchCount } = renderChunksToLineGroups(
    sortedChunks,
    $fileMatchesCutoff,
    expanded
  ));

  $: postCutoffMatchCount =
    file.matchCount - preCutoffMatchCount - file.fileName.matchCount;

  const expand = () => {
    expanded = true;
  };

  let topOfList: Element;
  const collapse = async () => {
    // If we've scrolled down so that the top of the list is not visible, scroll
    // it back into view. Only after scrolling is complete do we close the list,
    // to minimize confusion caused by the motion.
    await new Promise<void>((resolve) => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some(({ isIntersecting }) => isIntersecting)) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(topOfList);
      topOfList.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
    expanded = false;
  };
</script>

<span bind:this={topOfList} />
<section class="my-2 p-1 border-2 flex flex-col gap-1">
  <SearchResultsFileHeader {file} {rank} />
  {#if lineGroups.length > 0}
    <div class="font-mono text-sm divide-y">
      {#each lineGroups as lines (lines[0].lineNumber)}
        <!--
          minmax because we don't want the line number column to slide left and
          right as you scroll down through sections with different `min-content`s'
          worth of line numbers. 2rem is enough for 4 digits.
        -->
        <div
          class="py-1 grid grid-cols-[minmax(2rem,_min-content)_1fr] gap-x-2 whitespace-pre overflow-x-auto"
        >
          {#each lines as { lineNumber, lineTokens } (lineNumber)}
            <span class="select-none text-gray-600 text-right pr-1">
              {#if file.fileUrl && file.lineNumberTemplate}
                <a
                  class="hover:underline decoration-1"
                  href={`${file.fileUrl}${file.lineNumberTemplate.join(
                    lineNumber.toString()
                  )}`}>{lineNumber}</a
                >
              {:else}{lineNumber}{/if}
            </span>
            <code><RenderedContent tokens={lineTokens} /></code>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
  {#if postCutoffMatchCount > 0 && !expanded}
    <button type="button" on:click={expand} class="bg-slate-100 text-sm py-1">
      Show {postCutoffMatchCount} more {postCutoffMatchCount === 1
        ? "match"
        : "matches"}
    </button>
  {:else if postCutoffMatchCount > 0 && expanded}
    <button
      type="button"
      on:click={collapse}
      class="bg-slate-100 text-sm py-1 sticky bottom-0"
    >
      Hide {postCutoffMatchCount}
      {postCutoffMatchCount === 1 ? "match" : "matches"}
    </button>
  {/if}
</section>
