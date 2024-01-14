import { describe, it, expect } from "vitest";
import { renderChunksToLineGroups } from "./chunk-renderer";
import type { Chunk } from "$lib/server/search-api";

// This is real data from a search result against the zoekt repo:
// r:zoekt f:api test
const chunks: ReadonlyArray<Chunk> = [
  {
    lines: [
      {
        text: '\t"strings"',
        matchRanges: [],
      },
      {
        text: '\t"testing"',
        matchRanges: [
          {
            start: 2,
            end: 6,
          },
        ],
      },
      {
        text: '\t"time"',
        matchRanges: [],
      },
    ],
    startLineNumber: 20,
    matchCount: 1,
  },
  {
    lines: [
      {
        text: "*/",
        matchRanges: [],
      },
      {
        text: "func BenchmarkMinimalRepoListEncodings(b *testing.B) {",
        matchRanges: [
          {
            start: 42,
            end: 46,
          },
        ],
      },
      {
        text: "\tsize := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
        matchRanges: [],
      },
    ],
    startLineNumber: 28,
    matchCount: 1,
  },
  {
    lines: [
      {
        text: "",
        matchRanges: [],
      },
      {
        text: "func benchmarkEncoding(data interface{}) func(*testing.B) {",
        matchRanges: [
          {
            start: 47,
            end: 51,
          },
        ],
      },
      {
        text: "\treturn func(b *testing.B) {",
        matchRanges: [
          {
            start: 16,
            end: 20,
          },
        ],
      },
      {
        text: "\t\tb.Helper()",
        matchRanges: [],
      },
    ],
    startLineNumber: 62,
    matchCount: 2,
  },
  {
    lines: [
      {
        text: "",
        matchRanges: [],
      },
      {
        text: "func TestSizeBytesSearchResult(t *testing.T) {",
        matchRanges: [
          {
            start: 5,
            end: 9,
          },
          {
            start: 34,
            end: 38,
          },
        ],
      },
      {
        text: "\tvar sr = SearchResult{",
        matchRanges: [],
      },
    ],
    startLineNumber: 83,
    matchCount: 2,
  },
  {
    lines: [
      {
        text: "\t\t\tLineMatches: nil, // 24 bytes",
        matchRanges: [],
      },
      {
        text: "\t\t\tChunkMatches: []ChunkMatch{{ // 24 bytes + 208 bytes (see TestSizeByteChunkMatches)",
        matchRanges: [
          {
            start: 61,
            end: 65,
          },
        ],
      },
      {
        text: '\t\t\t\tContent:      []byte("foo"),',
        matchRanges: [],
      },
    ],
    startLineNumber: 94,
    matchCount: 1,
  },
  {
    lines: [
      {
        text: "",
        matchRanges: [],
      },
      {
        text: "func TestSizeBytesChunkMatches(t *testing.T) {",
        matchRanges: [
          {
            start: 5,
            end: 9,
          },
          {
            start: 34,
            end: 38,
          },
        ],
      },
      {
        text: "\tcm := ChunkMatch{",
        matchRanges: [],
      },
    ],
    startLineNumber: 122,
    matchCount: 2,
  },
];

const softCutoff = 5;

describe("renderChunksToLineGroups", () => {
  describe("collapsed", () => {
    it("matches the snapshot", () => {
      expect(renderChunksToLineGroups(chunks, softCutoff, false))
        .toMatchInlineSnapshot(`
          {
            "lineGroups": [
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	"strings"",
                  },
                  "lineNumber": 20,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 6,
                        "start": 2,
                      },
                    ],
                    "text": "	"testing"",
                  },
                  "lineNumber": 21,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	"time"",
                  },
                  "lineNumber": 22,
                },
              ],
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "*/",
                  },
                  "lineNumber": 28,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 46,
                        "start": 42,
                      },
                    ],
                    "text": "func BenchmarkMinimalRepoListEncodings(b *testing.B) {",
                  },
                  "lineNumber": 29,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	size := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
                  },
                  "lineNumber": 30,
                },
              ],
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "",
                  },
                  "lineNumber": 62,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 51,
                        "start": 47,
                      },
                    ],
                    "text": "func benchmarkEncoding(data interface{}) func(*testing.B) {",
                  },
                  "lineNumber": 63,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 20,
                        "start": 16,
                      },
                    ],
                    "text": "	return func(b *testing.B) {",
                  },
                  "lineNumber": 64,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "		b.Helper()",
                  },
                  "lineNumber": 65,
                },
              ],
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "",
                  },
                  "lineNumber": 83,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 9,
                        "start": 5,
                      },
                      {
                        "end": 38,
                        "start": 34,
                      },
                    ],
                    "text": "func TestSizeBytesSearchResult(t *testing.T) {",
                  },
                  "lineNumber": 84,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	var sr = SearchResult{",
                  },
                  "lineNumber": 85,
                },
              ],
            ],
            "preCutoffMatchCount": 6,
          }
        `);
    });
  });

  describe("expanded", () => {
    it("matches the snapshot", () => {
      expect(renderChunksToLineGroups(chunks, softCutoff, true))
        .toMatchInlineSnapshot(`
          {
            "lineGroups": [
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	"strings"",
                  },
                  "lineNumber": 20,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 6,
                        "start": 2,
                      },
                    ],
                    "text": "	"testing"",
                  },
                  "lineNumber": 21,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	"time"",
                  },
                  "lineNumber": 22,
                },
              ],
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "*/",
                  },
                  "lineNumber": 28,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 46,
                        "start": 42,
                      },
                    ],
                    "text": "func BenchmarkMinimalRepoListEncodings(b *testing.B) {",
                  },
                  "lineNumber": 29,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	size := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
                  },
                  "lineNumber": 30,
                },
              ],
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "",
                  },
                  "lineNumber": 62,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 51,
                        "start": 47,
                      },
                    ],
                    "text": "func benchmarkEncoding(data interface{}) func(*testing.B) {",
                  },
                  "lineNumber": 63,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 20,
                        "start": 16,
                      },
                    ],
                    "text": "	return func(b *testing.B) {",
                  },
                  "lineNumber": 64,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "		b.Helper()",
                  },
                  "lineNumber": 65,
                },
              ],
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "",
                  },
                  "lineNumber": 83,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 9,
                        "start": 5,
                      },
                      {
                        "end": 38,
                        "start": 34,
                      },
                    ],
                    "text": "func TestSizeBytesSearchResult(t *testing.T) {",
                  },
                  "lineNumber": 84,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	var sr = SearchResult{",
                  },
                  "lineNumber": 85,
                },
              ],
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "			LineMatches: nil, // 24 bytes",
                  },
                  "lineNumber": 94,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 65,
                        "start": 61,
                      },
                    ],
                    "text": "			ChunkMatches: []ChunkMatch{{ // 24 bytes + 208 bytes (see TestSizeByteChunkMatches)",
                  },
                  "lineNumber": 95,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "				Content:      []byte("foo"),",
                  },
                  "lineNumber": 96,
                },
              ],
              [
                {
                  "line": {
                    "matchRanges": [],
                    "text": "",
                  },
                  "lineNumber": 122,
                },
                {
                  "line": {
                    "matchRanges": [
                      {
                        "end": 9,
                        "start": 5,
                      },
                      {
                        "end": 38,
                        "start": 34,
                      },
                    ],
                    "text": "func TestSizeBytesChunkMatches(t *testing.T) {",
                  },
                  "lineNumber": 123,
                },
                {
                  "line": {
                    "matchRanges": [],
                    "text": "	cm := ChunkMatch{",
                  },
                  "lineNumber": 124,
                },
              ],
            ],
            "preCutoffMatchCount": 6,
          }
        `);
    });
  });
});
