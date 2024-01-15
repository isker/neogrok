<script lang="ts">
  import type { ContentLine, Range } from "$lib/server/content-parser";
  import type { FontStyle, ThemedToken } from "shikiji";

  export let content: ContentLine;
  export let highlights: ReadonlyArray<ThemedToken> | undefined = undefined;

  const toFontClass = (
    fontStyle: FontStyle | undefined,
  ): string | undefined => {
    if (fontStyle === undefined) {
      return undefined;
    }
    switch (fontStyle) {
      // These magic numbers come from an enum in shikiji that I refuse to link
      // this component to. Written on the wall that contains the thousands of
      // terrible design decisions in typescript, you will find enums.
      case 0:
        return undefined;
      case 1:
        return "italic";
      case 2:
        return "font-bold";
      case 4:
        return "underline";
      default:
        throw new Error(`unreachable ${fontStyle}`);
    }
  };

  let tokens: Array<{
    text: string;
    match: boolean;
    color?: string;
    fontClass?: string;
  }>;

  $: {
    const t: typeof tokens = [];
    if (highlights) {
      // If highlights are present, its spans have full coverage, so we can just
      // do a simple iteration of the highlights to get the full content, instead
      // of a sparse approach like we use in content-parser.
      const matchRangeIterator = content.matchRanges[Symbol.iterator]();
      let currentMatchRange: Range | undefined =
        matchRangeIterator.next().value;

      let start = 0;
      for (const { content: highlightText, fontStyle, color } of highlights) {
        const end = start + highlightText.length;
        const fontClass = toFontClass(fontStyle);
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
              fontClass,
              color,
            });
            base = currentMatchRange.start;
          }
          if (currentMatchRange.end > base && currentMatchRange.end <= end) {
            // Match range ends within this highlight range. Cut a match
            // token.
            t.push({
              text: content.text.slice(base, currentMatchRange.end),
              match: true,
              fontClass,
              color,
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
            fontClass,
            color,
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
    tokens = t;
  }
</script>

{#each tokens as { text, match, color, fontClass }}
  {#if match && color}
    <!--
      We have no choice but to go for direct styles here, as tailwind will not
      be able to precompile arbitrary colors. The only alternative would be to
      enumerate all possible colors emitted by the highlight theme (thus
      coupling us to it) in code, so that tailwind could pick them up.
    -->
    <mark class="bg-yellow-200"
      ><span style={`color: ${color}`} class={fontClass}>{text}</span></mark
    >
  {:else if match}
    <mark class="bg-yellow-200">{text}</mark>
  {:else if color}
    <span style={`color: ${color}`} class={fontClass}>{text}</span>
  {:else}
    {text}
  {/if}
{/each}
