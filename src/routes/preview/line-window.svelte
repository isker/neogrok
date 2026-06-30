<script lang="ts">
  import { onMount } from "svelte";
  import type { ThemedToken } from "shiki";
  import type { ContentLine } from "$lib/server/content-parser";
  import { computeHighlights, type BrowserTheme } from "$lib/highlight";
  import { prefersDark } from "$lib/theme";
  import RenderedContent from "$lib/rendered-content.svelte";

  type NumberedLine = {
    readonly lineNumber: number;
    readonly line: ContentLine;
  };

  type Props = {
    lines: ReadonlyArray<NumberedLine>;
    language: string;
    // Width of the line-number column, in `ch`. Passed in (rather than using
    // `min-content`) so every window aligns to the same gutter regardless of
    // how many digits its own line numbers have.
    gutterCh: number;
  };

  let { lines, language, gutterCh }: Props = $props();

  const browserTheme: BrowserTheme = $derived(
    prefersDark.current ? "dark" : "light",
  );

  // Mirrors line-group.svelte: shiki is expensive, so a window highlights its
  // own lines only once it scrolls into view, and only on the client. This
  // keeps a multi-thousand-line file from tokenizing (and re-tokenizing on
  // every theme toggle) all at once on the main thread.
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
    const textLines = lines.map(({ line }) => line.text);
    const lang = language;
    const theme = browserTheme;

    const abortController = new AbortController();
    computeHighlights(textLines, lang, theme, abortController.signal).then(
      (tokens) => {
        if (!abortController.signal.aborted) {
          highlights = tokens;
        }
      },
    );
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

<div
  bind:this={visibilityCanary}
  class="grid gap-x-2 whitespace-pre"
  style={`grid-template-columns: ${gutterCh}ch 1fr`}
>
  {#each lines as { lineNumber, line }, i (lineNumber)}
    <span
      id={`l${lineNumber}`}
      class="select-none text-gray-600 dark:text-gray-500 text-right pr-1 target:font-bold target:text-cyan-700 dark:target:text-cyan-400"
    >
      <a class="hover:underline decoration-1" href={`#l${lineNumber}`}
        >{lineNumber}</a
      >
    </span>
    <code><RenderedContent content={line} highlights={highlights?.[i]} /></code>
  {/each}
</div>
