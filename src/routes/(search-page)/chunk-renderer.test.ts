import { describe, it, expect } from "vitest";
import { renderChunksToLineGroups } from "./chunk-renderer";
import type { Chunk } from "$lib/server/search-api";

// This is real data from a search result against the zoekt repo.
const chunks: ReadonlyArray<Chunk> = [
  {
    matchCount: 1,
    startLineNumber: 20,
    lines: [
      {
        lineTokens: [{ text: '\t"strings"\n' }],
        matchCount: 0,
      },
      {
        lineTokens: [
          { text: '\t"' },
          { match: true, text: "test" },
          { text: 'ing"\n' },
        ],
        matchCount: 1,
      },
      {
        lineTokens: [{ text: ")" }],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 1,
    startLineNumber: 27,
    lines: [
      {
        lineTokens: [{ text: "*/\n" }],
        matchCount: 0,
      },
      {
        lineTokens: [
          {
            text: "func BenchmarkMinimalRepoListEncodings(b *",
          },
          { match: true, text: "test" },
          { text: "ing.B) {\n" },
        ],
        matchCount: 1,
      },
      {
        lineTokens: [
          {
            text: "\tsize := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
          },
        ],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 2,
    startLineNumber: 57,
    lines: [
      {
        lineTokens: [{ text: "\n" }],
        matchCount: 0,
      },
      {
        lineTokens: [
          {
            text: "func benchmarkEncoding(data interface{}) func(*",
          },
          { match: true, text: "test" },
          { text: "ing.B) {\n" },
        ],
        matchCount: 1,
      },
      {
        lineTokens: [
          { text: "\treturn func(b *" },
          { match: true, text: "test" },
          { text: "ing.B) {\n" },
        ],
        matchCount: 1,
      },
      {
        lineTokens: [{ text: "\t\tb.Helper()" }],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 2,
    startLineNumber: 78,
    lines: [
      {
        lineTokens: [{ text: "\n" }],
        matchCount: 0,
      },
      {
        lineTokens: [
          { text: "func " },
          { match: true, text: "Test" },
          {
            text: "SizeBytesSearchResult(t *",
          },
          { match: true, text: "test" },
          { text: "ing.T) {\n" },
        ],
        matchCount: 2,
      },
      {
        lineTokens: [
          {
            text: "\tvar sr = SearchResult{",
          },
        ],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 1,
    startLineNumber: 89,
    lines: [
      {
        lineTokens: [
          {
            text: "\t\t\tLineMatches: nil, // 24 bytes\n",
          },
        ],
        matchCount: 0,
      },
      {
        lineTokens: [
          {
            text: "\t\t\tChunkMatches: []ChunkMatch{{ // 24 bytes + 208 bytes (see ",
          },
          { match: true, text: "Test" },
          {
            text: "SizeByteChunkMatches)\n",
          },
        ],
        matchCount: 1,
      },
      {
        lineTokens: [
          {
            text: '\t\t\t\tContent:      []byte("foo"),',
          },
        ],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 2,
    startLineNumber: 117,
    lines: [
      {
        lineTokens: [{ text: "\n" }],
        matchCount: 0,
      },
      {
        lineTokens: [
          { text: "func " },
          { match: true, text: "Test" },
          {
            text: "SizeBytesChunkMatches(t *",
          },
          { match: true, text: "test" },
          { text: "ing.T) {\n" },
        ],
        matchCount: 2,
      },
      {
        lineTokens: [{ text: "\tcm := ChunkMatch{" }],
        matchCount: 0,
      },
    ],
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
                  "lineNumber": 20,
                  "lineTokens": [
                    {
                      "text": "	"strings"
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 21,
                  "lineTokens": [
                    {
                      "text": "	"",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing"
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 22,
                  "lineTokens": [
                    {
                      "text": ")",
                    },
                  ],
                },
              ],
              [
                {
                  "lineNumber": 27,
                  "lineTokens": [
                    {
                      "text": "*/
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 28,
                  "lineTokens": [
                    {
                      "text": "func BenchmarkMinimalRepoListEncodings(b *",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.B) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 29,
                  "lineTokens": [
                    {
                      "text": "	size := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
                    },
                  ],
                },
              ],
              [
                {
                  "lineNumber": 57,
                  "lineTokens": [
                    {
                      "text": "
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 58,
                  "lineTokens": [
                    {
                      "text": "func benchmarkEncoding(data interface{}) func(*",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.B) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 59,
                  "lineTokens": [
                    {
                      "text": "	return func(b *",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.B) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 60,
                  "lineTokens": [
                    {
                      "text": "		b.Helper()",
                    },
                  ],
                },
              ],
              [
                {
                  "lineNumber": 78,
                  "lineTokens": [
                    {
                      "text": "
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 79,
                  "lineTokens": [
                    {
                      "text": "func ",
                    },
                    {
                      "match": true,
                      "text": "Test",
                    },
                    {
                      "text": "SizeBytesSearchResult(t *",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.T) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 80,
                  "lineTokens": [
                    {
                      "text": "	var sr = SearchResult{",
                    },
                  ],
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
                  "lineNumber": 20,
                  "lineTokens": [
                    {
                      "text": "	"strings"
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 21,
                  "lineTokens": [
                    {
                      "text": "	"",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing"
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 22,
                  "lineTokens": [
                    {
                      "text": ")",
                    },
                  ],
                },
              ],
              [
                {
                  "lineNumber": 27,
                  "lineTokens": [
                    {
                      "text": "*/
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 28,
                  "lineTokens": [
                    {
                      "text": "func BenchmarkMinimalRepoListEncodings(b *",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.B) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 29,
                  "lineTokens": [
                    {
                      "text": "	size := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
                    },
                  ],
                },
              ],
              [
                {
                  "lineNumber": 57,
                  "lineTokens": [
                    {
                      "text": "
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 58,
                  "lineTokens": [
                    {
                      "text": "func benchmarkEncoding(data interface{}) func(*",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.B) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 59,
                  "lineTokens": [
                    {
                      "text": "	return func(b *",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.B) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 60,
                  "lineTokens": [
                    {
                      "text": "		b.Helper()",
                    },
                  ],
                },
              ],
              [
                {
                  "lineNumber": 78,
                  "lineTokens": [
                    {
                      "text": "
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 79,
                  "lineTokens": [
                    {
                      "text": "func ",
                    },
                    {
                      "match": true,
                      "text": "Test",
                    },
                    {
                      "text": "SizeBytesSearchResult(t *",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.T) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 80,
                  "lineTokens": [
                    {
                      "text": "	var sr = SearchResult{",
                    },
                  ],
                },
              ],
              [
                {
                  "lineNumber": 89,
                  "lineTokens": [
                    {
                      "text": "			LineMatches: nil, // 24 bytes
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 90,
                  "lineTokens": [
                    {
                      "text": "			ChunkMatches: []ChunkMatch{{ // 24 bytes + 208 bytes (see ",
                    },
                    {
                      "match": true,
                      "text": "Test",
                    },
                    {
                      "text": "SizeByteChunkMatches)
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 91,
                  "lineTokens": [
                    {
                      "text": "				Content:      []byte("foo"),",
                    },
                  ],
                },
              ],
              [
                {
                  "lineNumber": 117,
                  "lineTokens": [
                    {
                      "text": "
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 118,
                  "lineTokens": [
                    {
                      "text": "func ",
                    },
                    {
                      "match": true,
                      "text": "Test",
                    },
                    {
                      "text": "SizeBytesChunkMatches(t *",
                    },
                    {
                      "match": true,
                      "text": "test",
                    },
                    {
                      "text": "ing.T) {
          ",
                    },
                  ],
                },
                {
                  "lineNumber": 119,
                  "lineTokens": [
                    {
                      "text": "	cm := ChunkMatch{",
                    },
                  ],
                },
              ],
            ],
            "preCutoffMatchCount": 6,
          }
        `);
    });
  });
});
