<script lang="ts">
  import {
    acquireFileMatchesCutoffStore,
    acquireMatchSortOrderStore,
  } from "$lib/preferences";
  import type { ResultFile } from "$lib/server/search-api";
  import SearchResultsFileHeader from "./search-results-file-header.svelte";
  import LineGroup from "./line-group.svelte";
  import { renderChunksToLineGroups } from "./chunk-renderer";

  type Props = {
    file: ResultFile;
    rank: number;
  };

  let { file, rank }: Props = $props();

  const matchSortOrder = acquireMatchSortOrderStore();
  const fileMatchesCutoff = acquireFileMatchesCutoffStore();

  let sortedChunks = $derived(
    $matchSortOrder === "line-number"
      ? [...file.chunks].sort(
          ({ startLineNumber: a }, { startLineNumber: b }) => a - b,
        )
      : // Nothing to do otherwise; matches are already sorted by score.
        file.chunks,
  );

  let expanded = $state(false);
  let { lineGroups, preCutoffMatchCount } = $derived(
    renderChunksToLineGroups(sortedChunks, $fileMatchesCutoff, expanded),
  );

  let postCutoffMatchCount = $derived(
    file.matchCount - preCutoffMatchCount - file.fileName.matchRanges.length,
  );

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

<div>
  <span bind:this={topOfList}></span>
  <section class="p-1 border-2 flex flex-col gap-1">
    <SearchResultsFileHeader {file} {rank} />
    {#if lineGroups.length > 0}
      <div class="font-mono text-sm divide-y">
        {#each lineGroups as lines}
          <LineGroup {lines} {file} />
        {/each}
      </div>
    {/if}
    {#if postCutoffMatchCount > 0 && !expanded}
      <button
        type="button"
        onclick={expand}
        class="bg-slate-100 dark:bg-slate-800 text-sm py-1"
      >
        Show {postCutoffMatchCount} more {postCutoffMatchCount === 1
          ? "match"
          : "matches"}
      </button>
    {:else if postCutoffMatchCount > 0 && expanded}
      <button
        type="button"
        onclick={collapse}
        class="bg-slate-100 dark:bg-slate-800 text-sm py-1 sticky bottom-0"
      >
        Hide {postCutoffMatchCount}
        {postCutoffMatchCount === 1 ? "match" : "matches"}
      </button>
    {/if}
  </section>
</div>
