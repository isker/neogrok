<script lang="ts">
  import type { ResultFile } from "$lib/server/search-api";
  import { onMount } from "svelte";
  import type { LineGroup } from "./chunk-renderer";
  import RenderedContent from "./rendered-content.svelte";
  import { writable } from "svelte/store";
  import type { ThemedToken, BundledLanguage } from "shikiji";

  export let lines: LineGroup;
  export let file: ResultFile;

  const highlights = writable<
    undefined | ReadonlyArray<ReadonlyArray<ThemedToken>>
  >();

  // Syntax highlighting can be pretty CPU intensive and so is done
  // deferred, during render instead of in the API, and only on the client.
  // - "Deferred" because most code returned by search is not actually really
  //   being read by a human, due to live search constantly shuffing results
  //   out of the UI.
  // - "During render" because we have computed the much smaller set of lines
  //   visible by default only at that point, thereby substantially reducing
  //   the amount of highlighting work to be done. If we did that in the API,
  //   expanding any collapsed section would require an API request.
  // - "Only on the client" because CPU intensive tasks can smoke the server's
  //   performance. Node is great at lots of concurrent I/O, but anything CPU
  //   intensive that blocks its event loop from progressing quickly grinds
  //   things to a halt.
  //
  // The price to pay is that the client has to download and execute some assets
  // that are pretty enormous, compared to everything else in the app. The
  // baseline shikiji bundle (their JS, the oniguruma wasm blob, plus the theme
  // we use) is something like 300kb _gzipped_, and each language is 5-100 more.
  onMount(() => {
    let canceled = false;

    const timer = setTimeout(async () => {
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
        // I guess TS isn't interested in doing this refinement // based on the
        // check above.
        const lang = language as BundledLanguage;
        // It's worth checking again, as downloading that chunk can take a
        // while, and highlighting can occupy meaningful CPU time.
        if (!canceled) {
          highlights.set(
            await codeToThemedTokens(
              lines.map(({ line: { text } }) => text),
              {
                theme: "github-light",
                lang,
              },
            ),
          );
        }
      } else if (language !== "text") {
        // TODO this will be a lot of console spam... could use a store, as absurd as that is.
        console.warn(
          "Could not find shikiji language for '%s', skipping highlighting",
          language,
          bundledLanguages,
        );
      }
    }, 500);

    return () => {
      canceled = true;
      clearTimeout(timer);
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
    <code><RenderedContent content={line} highlights={$highlights?.[i]} /></code
    >
  {/each}
</div>
