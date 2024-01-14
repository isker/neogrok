import { describe, it, expect } from "vitest";
import { parseChunkMatch, parseFileNameMatch } from "./content-parser";

describe("parseFileNameMatch", () => {
  it("parses file name matches", () => {
    expect(parseFileNameMatch(Buffer.from("foo"), [])).toEqual({
      text: "foo",
      matchRanges: [],
    });
    expect(
      parseFileNameMatch(Buffer.from("foo"), [{ start: 0, end: 3 }]),
    ).toEqual({ text: "foo", matchRanges: [{ start: 0, end: 3 }] });
    expect(
      parseFileNameMatch(Buffer.from("foo"), [{ start: 0, end: 2 }]),
    ).toEqual({ text: "foo", matchRanges: [{ start: 0, end: 2 }] });
    expect(
      parseFileNameMatch(Buffer.from("foo"), [{ start: 1, end: 3 }]),
    ).toEqual({ text: "foo", matchRanges: [{ start: 1, end: 3 }] });
    expect(
      parseFileNameMatch(Buffer.from("foo"), [{ start: 1, end: 2 }]),
    ).toEqual({ text: "foo", matchRanges: [{ start: 1, end: 2 }] });
    expect(
      parseFileNameMatch(Buffer.from("foo"), [
        { start: 1, end: 2 },
        { start: 2, end: 3 },
      ]),
    ).toEqual({
      text: "foo",
      matchRanges: [
        { start: 1, end: 2 },
        { start: 2, end: 3 },
      ],
    });
  });
});

describe("parseChunkMatch", () => {
  it("parses chunk matches", () => {
    // Single line.
    expect(parseChunkMatch(Buffer.from("foo"), [])).toEqual([
      { text: "foo", matchRanges: [] },
    ]);
    expect(parseChunkMatch(Buffer.from("foo"), [{ start: 0, end: 3 }])).toEqual(
      [{ text: "foo", matchRanges: [{ start: 0, end: 3 }] }],
    );
    expect(parseChunkMatch(Buffer.from("foo"), [{ start: 0, end: 2 }])).toEqual(
      [{ text: "foo", matchRanges: [{ start: 0, end: 2 }] }],
    );
    expect(parseChunkMatch(Buffer.from("foo"), [{ start: 1, end: 3 }])).toEqual(
      [{ text: "foo", matchRanges: [{ start: 1, end: 3 }] }],
    );
    expect(parseChunkMatch(Buffer.from("foo"), [{ start: 1, end: 2 }])).toEqual(
      [{ text: "foo", matchRanges: [{ start: 1, end: 2 }] }],
    );
    expect(
      parseChunkMatch(Buffer.from("foo"), [
        { start: 1, end: 2 },
        { start: 2, end: 3 },
      ]),
    ).toEqual([
      {
        text: "foo",
        matchRanges: [
          { start: 1, end: 2 },
          { start: 2, end: 3 },
        ],
      },
    ]);

    // Multi-line.
    expect(parseChunkMatch(Buffer.from("foo\n"), [])).toEqual([
      { text: "foo", matchRanges: [] },
      { text: "", matchRanges: [] },
    ]);
    expect(
      parseChunkMatch(Buffer.from("foo\n"), [{ start: 0, end: 3 }]),
    ).toEqual([
      { text: "foo", matchRanges: [{ start: 0, end: 3 }] },
      { text: "", matchRanges: [] },
    ]);
    expect(
      parseChunkMatch(Buffer.from("foo\n"), [{ start: 0, end: 4 }]),
    ).toEqual([
      { text: "foo", matchRanges: [{ start: 0, end: 3 }] },
      { text: "", matchRanges: [] },
    ]);

    expect(parseChunkMatch(Buffer.from("foo\nbar"), [])).toEqual([
      { text: "foo", matchRanges: [] },
      { text: "bar", matchRanges: [] },
    ]);
    expect(
      parseChunkMatch(Buffer.from("foo\nbar"), [{ start: 0, end: 3 }]),
    ).toEqual([
      { text: "foo", matchRanges: [{ start: 0, end: 3 }] },
      { text: "bar", matchRanges: [] },
    ]);
    expect(
      parseChunkMatch(Buffer.from("foo\nbar"), [{ start: 0, end: 4 }]),
    ).toEqual([
      { text: "foo", matchRanges: [{ start: 0, end: 3 }] },
      { text: "bar", matchRanges: [] },
    ]);

    expect(
      parseChunkMatch(Buffer.from("foo\nbar"), [
        { start: 0, end: 1 },
        { start: 2, end: 5 },
      ]),
    ).toEqual([
      {
        text: "foo",
        matchRanges: [
          { start: 0, end: 1 },
          { start: 2, end: 3 },
        ],
      },
      { text: "bar", matchRanges: [{ start: 0, end: 1 }] },
    ]);
  });
});
