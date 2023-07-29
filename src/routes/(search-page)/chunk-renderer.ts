import type { ContentToken } from "$lib/server/content-parser";
import type { Chunk, ResultFile } from "$lib/server/search-api";

export const renderChunksToLineGroups = (
  chunks: ResultFile["chunks"],
  // The number of matches that, when exceeded, we stop incorporating chunks
  // into the line groups.
  softCutoff: number,
  expanded: boolean
) => {
  // Groups of contiguous lines in the file; contiguous matches are merged into
  // a single group.
  //
  // The goal is to produce the minimal number of lineGroups that exceed the
  // softCutoff. If we can help it, we don't want to cut a chunk in half to make
  // the exact cutoff (nor can we, if the cutoff is exceeded in the middle of a
  // single line).
  //
  // That being said, we will bail in the middle of a chunk if the greater
  // hardCutoff is exceeded.
  const lineGroups: Array<
    Array<{ lineNumber: number; lineTokens: ReadonlyArray<ContentToken> }>
  > = [];

  // The number of matches beyond which we will actually cut off a chunk early.
  // The problem is that the cost (and UI absurdity) of rendering a chunk scales
  // with the number of matches in it, and there is no upper bound on the size
  // of a chunk. We have to impose such an upper bound ourselves, with this.
  const hardCutoff = Math.min(softCutoff * 2, softCutoff + 10);

  // The number of matches integrated into line groups before the cutoff is
  // exceeded. When `!expanded`, this function continues beyond this matchCount,
  // collecting all of the lines in the file. We still maintain this count so
  // the UI can know how many matches will be displayed when returning to a
  // `!expanded` state.
  let preCutoffMatchCount = 0;

  const subChunkUnderCutoff = (chunk: Chunk): Chunk => {
    if (preCutoffMatchCount >= softCutoff) {
      // We are already beyond the limit.
      return { lines: [], matchCount: 0 };
    } else if (preCutoffMatchCount + chunk.matchCount >= hardCutoff) {
      // If adding all of these matches would take us past the hard cutoff,
      // iterate line by line until we are just beyond it.
      let matchCount = 0;
      const lines = [];
      for (const line of chunk.lines) {
        lines.push(line);
        matchCount += line.matchCount;
        if (preCutoffMatchCount + matchCount >= hardCutoff) {
          break;
        }
      }
      return { lines, matchCount };
    } else {
      // Otherwise, take all of this chunk's lines.
      return chunk;
    }
  };

  if (softCutoff > 0) {
    for (const chunk of chunks) {
      const subChunk = subChunkUnderCutoff(chunk);
      if (!expanded && subChunk.lines.length === 0) {
        // hard cutoff exceeded
        break;
      }
      preCutoffMatchCount += subChunk.matchCount;

      const lines = expanded ? chunk.lines : subChunk.lines;
      const [{ lineNumber: startLineNumber }] = lines;
      const contiguous =
        lineGroups.at(-1)?.at(-1)?.lineNumber === startLineNumber - 1;
      if (contiguous) {
        // Collapse adjacent chunks into a single line group.

        // By the definition of `contiguous` we know this exists.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        lineGroups.at(-1)!.push(...lines);
      } else {
        // Make a copy. We will be mutating it.
        lineGroups.push([...lines]);
      }

      if (!expanded && preCutoffMatchCount >= softCutoff) {
        // soft cutoff exceeded
        break;
      }
    }
  }

  return { lineGroups, preCutoffMatchCount };
};
