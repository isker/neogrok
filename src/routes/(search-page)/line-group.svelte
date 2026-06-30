<script lang="ts">
  import type { ResultFile } from "$lib/server/search-api";
  import { onMount } from "svelte";
  import type { ThemedToken } from "shiki";
  import { prefersDark } from "$lib/theme";
  import { computeHighlights, type BrowserTheme } from "$lib/highlight";
  import type { LineGroup } from "./chunk-renderer";
  import RenderedContent from "$lib/rendered-content.svelte";

  type Props = {
    lines: LineGroup;
    file: ResultFile;
  };

  let { lines, file }: Props = $props();

  const browserTheme: BrowserTheme = $derived(
    prefersDark.current ? "dark" : "light",
  );

  // Highlighting is done just in time: most code returned by search is not
  // actually really being read by a human, due to the page being too tall. We
  // use an IntersectionObserver to highlight only code that's on the screen.
  let visible = $state(false);
  let highlights = $state.raw<
    ReadonlyArray<ReadonlyArray<ThemedToken>> | undefined
  >();

  $effect(() => {
    if (!visible) {
      return;
    }

    // Skip highlighting anything with long lines, as it's an excellent way to
    // freeze the browser. Such files are probably minified web assets, or
    // otherwise low-signal.
    if (lines.some(({ line }) => line.text.length >= 1000)) {
      highlights = undefined;
      return;
    }

    // Capture current reactive values for this run.
    const language = file.language;
    const theme = browserTheme;

    const abortController = new AbortController();
    computeHighlights(
      lines.map(({ line: { text } }) => text),
      language,
      theme,
      abortController.signal,
    ).then((tokens) => {
      if (!abortController.signal.aborted) {
        highlights = tokens;
      }
    });
    return () => abortController.abort();
  });

  let visibilityCanary: Element;
  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(({ isIntersecting }) => isIntersecting)) {
        observer.disconnect();
        visible = true;
      }
    });
    observer.observe(visibilityCanary);
    return () => observer.disconnect();
  });
</script>

<!--
    minmax because we don't want the line number column to slide left and
    right as you scroll down through sections with different `min-content`s'
    worth of line numbers. 2rem is enough for 3 digits, which should cover
    the overwhelming majority of cases.
-->
<div
  bind:this={visibilityCanary}
  class="py-1 grid grid-cols-[minmax(2rem,min-content)_1fr] gap-x-2 whitespace-pre overflow-x-auto"
>
  {#each lines as { lineNumber, line }, i}
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
    <code><RenderedContent content={line} highlights={highlights?.[i]} /></code>
  {/each}
</div>
