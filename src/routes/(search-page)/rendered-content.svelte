<script lang="ts">
  import type { ContentLine, Range } from "#lib/server/content-parser.js";

  import type { HighlightToken } from "#lib/server/syntax-highlighting.js";

  type Props = {
    content: ContentLine;
    highlights?: ReadonlyArray<HighlightToken> | undefined;
  };

  let { content, highlights = undefined }: Props = $props();

  let tokens: Array<{
    text: string;
    match: boolean;
    highlightClass?: string;
  }> = $derived.by(() => {
    const t: typeof tokens = [];
    if (highlights) {
      // If highlights are present, its spans have full coverage, so we can just
      // do a simple iteration of the highlights to get the full content, instead
      // of a sparse approach like we use in content-parser.
      const matchRangeIterator = content.matchRanges[Symbol.iterator]();
      let currentMatchRange: Range | undefined =
        matchRangeIterator.next().value;

      let start = 0;
      for (const [length, type] of highlights) {
        const end = start + length;
        const highlightClass = `hl-${type}`;
        let base = start;

        while (
          // There is a match range ...
          currentMatchRange &&
          // ... that interacts with this highlight range.
          ((currentMatchRange.start > base && currentMatchRange.start < end) ||
            (currentMatchRange.end > base && currentMatchRange.end <= end))
        ) {
          if (currentMatchRange.start > base && currentMatchRange.start < end) {
            // Match range starts within this highlight range. Cut a non-match
            // token.
            t.push({
              text: content.text.slice(base, currentMatchRange.start),
              match: false,
              highlightClass,
            });
            base = currentMatchRange.start;
          }
          if (currentMatchRange.end > base && currentMatchRange.end <= end) {
            // Match range ends within this highlight range. Cut a match
            // token.
            t.push({
              text: content.text.slice(base, currentMatchRange.end),
              match: true,
              highlightClass,
            });
            base = currentMatchRange.end;
            currentMatchRange = matchRangeIterator.next().value;
          }
        }

        if (base < end) {
          // If there's anything left over from the above shenanigans, push it.
          t.push({
            text: content.text.slice(base, end),
            // `match` can still be true if this highlight range is entirely
            // within the match range.
            match:
              !!currentMatchRange &&
              base >= currentMatchRange.start &&
              base < currentMatchRange.end,
            highlightClass,
          });
        }

        start = end;
      }
    } else {
      let base = 0;
      for (const { start, end } of content.matchRanges) {
        if (base < start) {
          t.push({ text: content.text.slice(base, start), match: false });
        }
        t.push({ text: content.text.slice(start, end), match: true });
        base = end;
      }

      if (base < content.text.length) {
        t.push({ text: content.text.slice(base), match: false });
      }
    }
    return t;
  });
</script>

<!-- eslint-disable-next-line svelte/require-each-key -->
{#each tokens as { text, match, highlightClass }}
  {#if match && highlightClass}
    <mark class="bg-yellow-200 dark:bg-yellow-900 text-inherit"
      ><span class={highlightClass}>{text}</span></mark
    >
  {:else if match}
    <mark class="bg-yellow-200 dark:bg-yellow-900 text-inherit">{text}</mark>
  {:else if highlightClass}
    <span class={highlightClass}>{text}</span>
  {:else}
    {text}
  {/if}
{/each}
