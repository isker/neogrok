<script lang="ts">
  import type { ResultFile } from "$lib/server/search-api";
  import { onMount } from "svelte";
  import type { ThemedToken, BundledLanguage } from "shiki";
  import { prefersDark } from "$lib/theme";
  import type { LineGroup } from "./chunk-renderer";
  import RenderedContent from "./rendered-content.svelte";

  type Props = {
    lines: LineGroup;
    file: ResultFile;
  };

  let { lines, file }: Props = $props();

  type BrowserTheme = "light" | "dark";
  const browserTheme: BrowserTheme = $derived(
    prefersDark.current ? "dark" : "light",
  );

  // Syntax highlighting can be pretty CPU intensive and so is done just in
  // time, and only on the client.
  // - "Just in time" because most code returned by search is not actually really
  //   being read by a human, due to the page being too tall. We use a
  //   VisibilityObserver to highlight only code that's on the screen.
  // - "Only on the client" because CPU intensive tasks can smoke the server's
  //   performance. Node is great at lots of concurrent I/O, but anything CPU
  //   intensive that blocks its event loop from progressing quickly grinds
  //   things to a halt.
  //
  // The price to pay over doing highlighting on the server is that the client
  // has to download and execute some assets that are pretty enormous, compared
  // to everything else in the app. The baseline shiki bundle (their JS, the
  // oniguruma wasm blob, plus the theme we use) is something like 300kb
  // _gzipped_, and each language is 3-50 more.
  let visible = $state(false);
  let highlights = $state.raw<
    ReadonlyArray<ReadonlyArray<ThemedToken>> | undefined
  >();

  const toTextmateLanguage = (linguistLanguage: string): string => {
    // This is the same normalization that zoekt applies when querying
    // go-enry, and it seems to be good enough for us querying shiki as well.
    const language = linguistLanguage.toLowerCase();
    // ... except when it isn't. go-enry (backed by linguist) and shiki
    // (backed by vscode's textmate grammars) just seem to have fundamentally
    // different lineages, we have no hope but to do some remappings. TODO
    // perhaps these should be upstreamed as aliases in shikiji.
    switch (language) {
      case "restructuredtext":
        return "rst";
      case "protocol buffer":
        return "protobuf";
      default:
        return language;
    }
  };

  const computeHighlights = async (
    lines: ReadonlyArray<string>,
    language: string,
    theme: BrowserTheme,
    signal: AbortSignal,
  ): Promise<typeof highlights> => {
    // We dynamically import shiki itself because it's huge and won't be
    // needed by those landing on the home page with no search query, or
    // on the server at all.
    const { codeToTokens, bundledLanguages } = await import("shiki");
    if (signal.aborted) {
      return;
    }

    if (language in bundledLanguages) {
      // I guess TS isn't interested in doing this refinement based on the
      // check above.
      const lang = language as BundledLanguage;
      // Shiki only accepts a single string even though it goes right ahead and
      // splits it :(.
      const code = lines.join("\n");
      return (
        await codeToTokens(code, {
          theme: `github-${theme}`,
          lang,
        })
      ).tokens;
    } else if (language !== "text") {
      console.warn(
        "Could not find shiki language for '%s', skipping highlighting",
        language,
        bundledLanguages,
      );
    }
  };

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
    const language = toTextmateLanguage(file.language);
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
