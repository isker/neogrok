<script lang="ts">
  import type { ResultFile } from "$lib/server/search-api";
  import { onMount } from "svelte";
  import type { LineGroup } from "./chunk-renderer";
  import RenderedContent from "./rendered-content.svelte";
  import type { ThemedToken, BundledLanguage } from "shikiji";

  export let lines: LineGroup;
  export let file: ResultFile;

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
  // to everything else in the app. The baseline shikiji bundle (their JS, the
  // oniguruma wasm blob, plus the theme we use) is something like 300kb
  // _gzipped_, and each language is 3-50 more.
  let visible = false;
  let highlights: undefined | ReadonlyArray<ReadonlyArray<ThemedToken>>;

  const highlight = async (code: string) => {
    // We dynamically import shiki itself because it's huge and won't be
    // needed by those landing on the home page with no search query, or
    // on the server at all.
    const { codeToThemedTokens, bundledLanguages } = await import("shikiji");

    // This is the same normalization that zoekt applies when querying
    // go-enry, and it seems to be good enough for us querying shikiji as well.
    let language = file.language.toLowerCase();
    // ... except when it isn't. go-enry (backed by linguist) and shikiji
    // (backed by vscode's textmate grammars) just seem to have fundamentally
    // different lineages, we have no hope but to do some remappings. TODO
    // perhaps these should be upstreamed as aliases in shikiji.
    if (language === "restructuredtext") {
      language = "rst";
    }

    if (language in bundledLanguages) {
      // I guess TS isn't interested in doing this refinement based on the
      // check above.
      const lang = language as BundledLanguage;
      // It's worth checking again, as downloading that chunk can take a
      // while, and highlighting can occupy meaningful CPU time.
      highlights = await codeToThemedTokens(code, {
        theme: "github-light",
        lang,
      });
    } else if (language !== "text") {
      // TODO this will be a lot of console spam... could use a store, as
      // absurd as that is.
      console.warn(
        "Could not find shikiji language for '%s', skipping highlighting",
        language,
        bundledLanguages,
      );
    }
  };

  $: {
    if (visible) {
      // Skip highlighting anything with long lines, as it's an excellent way to
      // freeze the browser. Such files are probably minified web assets, or
      // otherwise low-signal.
      if (!lines.some(({ line }) => line.text.length >= 1000)) {
        // Shikiji only accepts a single string even though it goes
        // right ahead and splits it :(.
        highlight(lines.map(({ line: { text } }) => text).join("\n"));
      } else {
        // We can have defined `highlights` here if our LineGroup was cut in two
        // by a now-removed "hidden" threshold. Having highlights for part of
        // the group but not the rest is strange in the UI, so remove it all.
        highlights = undefined;
      }
    }
  }

  let visibilityCanary: Element;
  onMount(() => {
    const observer = new IntersectionObserver(async (entries) => {
      if (entries.some(({ isIntersecting }) => isIntersecting)) {
        observer.disconnect();
        visible = true;
      }
    });
    observer.observe(visibilityCanary);
    return () => {
      observer.disconnect();
    };
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
  class="py-1 grid grid-cols-[minmax(2rem,_min-content)_1fr] gap-x-2 whitespace-pre overflow-x-auto"
>
  {#each lines as { lineNumber, line }, i}
    <span class="select-none text-gray-600 text-right pr-1">
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
