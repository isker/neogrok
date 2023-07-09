import { describe, it, assert } from "vitest";
import {
  toZoekt as toZoektWithDependencies,
  type OpenGrokSearchParams,
  type ConversionDependencies,
} from "./opengrok-lucene.server";

const toZoekt = (
  params: OpenGrokSearchParams,
  dependencies: ConversionDependencies = {
    projectToRepo: new Map(),
    queryUnknownRepos: (candidates) => Promise.resolve(candidates),
  }
) => toZoektWithDependencies(params, dependencies);

describe("toZoekt", () => {
  it("handles no data", async () => {
    assert.deepEqual(await toZoekt({}), {
      luceneQuery: null,
      zoektQuery: null,
      warnings: [],
    });
  });

  it("converts simple `full` query", async () => {
    assert.deepEqual(await toZoekt({ full: "foobar" }), {
      luceneQuery: "foobar",
      zoektQuery: "foobar",
      warnings: [],
    });
  });

  it("converts refs to `full` and warns", async () => {
    assert.deepEqual(await toZoekt({ full: "full", refs: "refs" }), {
      luceneQuery: "full refs:refs",
      zoektQuery: "full refs",
      warnings: [
        { code: "ReferencesNotSupported", location: { start: 5, end: 9 } },
      ],
    });
  });

  it("warns on hist and discards", async () => {
    assert.deepEqual(await toZoekt({ full: "full", hist: "hist" }), {
      luceneQuery: "full hist:hist",
      zoektQuery: "full",
      warnings: [
        { code: "HistoryNotSupported", location: { start: 5, end: 9 } },
      ],
    });
  });

  it("converts defs to sym:", async () => {
    assert.deepEqual(await toZoekt({ full: "full", defs: "defs" }), {
      luceneQuery: "full defs:defs",
      zoektQuery: "full sym:defs",
      warnings: [],
    });
  });

  it("converts path to file:", async () => {
    assert.deepEqual(await toZoekt({ full: "full", path: "passwd" }), {
      luceneQuery: "full path:passwd",
      zoektQuery: "full file:passwd",
      warnings: [],
    });
  });

  // OpenGrok does magic stuff to make its lucene leave slashes untouched, and
  // we can't cusomize our parser to the same extent. Converting paths with
  // slashes can't be implemented.
  //
  // This warning only works when the slashes are in `path` and not in `full`,
  // as we'd need to warn on `full` after parsing, and parsing destroys the
  // information necessary to identify the situation.
  it("warns when path contains slashes", async () => {
    assert.deepEqual(await toZoekt({ full: "full", path: "/etc/passwd" }), {
      luceneQuery: "full",
      zoektQuery: "full",
      warnings: [{ code: "PathCannotContainSlashes" }],
    });
  });

  it("accepts relevancy sort", async () => {
    assert.deepEqual(await toZoekt({ full: "foobar", sort: "relevancy" }), {
      luceneQuery: "foobar",
      zoektQuery: "foobar",
      warnings: [],
    });
  });

  it("warns on non-relevancy sort and discards", async () => {
    assert.deepEqual(await toZoekt({ full: "foobar", sort: "lastmodtime" }), {
      luceneQuery: "foobar",
      zoektQuery: "foobar",
      warnings: [{ code: "SortOrderNotSupported", sortOrder: "lastmodtime" }],
    });
  });

  it("warns on pagination and discards", async () => {
    assert.deepEqual(await toZoekt({ full: "foobar", start: 25 }), {
      luceneQuery: "foobar",
      zoektQuery: "foobar",
      warnings: [{ code: "PaginationNotSupported" }],
    });
  });

  it("converts known type to lang:", async () => {
    assert.deepEqual(await toZoekt({ full: "foobar", type: "java" }), {
      luceneQuery: "foobar",
      zoektQuery: "lang:java foobar",
      warnings: [],
    });
  });

  it("warns on unknown type and discards", async () => {
    assert.deepEqual(
      await toZoekt({ full: "foobar", type: "BORLAND TURBO PASCAL" }),
      {
        luceneQuery: "foobar",
        zoektQuery: "foobar",
        warnings: [
          { code: "UnsupportedLanguage", language: "BORLAND TURBO PASCAL" },
        ],
      }
    );
  });

  it("converts projects, warning on unknown ones", async () => {
    assert.deepEqual(
      await toZoekt(
        { full: "foobar", project: "project1,project2,project3,project4" },
        {
          projectToRepo: new Map([
            ["project1", "github.com/user/repo1"],
            ["project2", "github.com/user/repo2"],
            ["project3", "github.com/user/repo3"],
          ]),
          queryUnknownRepos: async (candidates) => {
            assert.deepEqual(
              candidates,
              new Set([
                "github.com/user/repo1",
                "github.com/user/repo2",
                "github.com/user/repo3",
                "project4",
              ])
            );

            return new Set(["github.com/user/repo2", "github.com/user/repo3"]);
          },
        }
      ),
      {
        luceneQuery: "foobar",
        zoektQuery: "repo:^github\\.com/user/repo1$|^project4$ foobar",
        warnings: [
          {
            code: "ConvertedProjects",
            conversions: {
              project1: "github.com/user/repo1",
              project2: "github.com/user/repo2",
              project3: "github.com/user/repo3",
            },
          },
          {
            code: "UnknownRepos",
            repos: ["github.com/user/repo2", "github.com/user/repo3"],
          },
        ],
      }
    );
  });

  it("warns on unknown fields and discards", async () => {
    assert.deepEqual(await toZoekt({ full: "foobar foobar:foobar" }), {
      luceneQuery: "foobar foobar:foobar",
      zoektQuery: "foobar",
      warnings: [
        {
          code: "UnsupportedField",
          field: "foobar",
          location: { start: 7, end: 13 },
        },
      ],
    });
  });

  it("handles unsupported lucene term features", async () => {
    assert.deepEqual(
      await toZoekt({
        full: 'foo boost^4 "proxi mity"~10 similarity~ path:{abc TO def]',
      }),
      {
        luceneQuery:
          'foo boost^4 "proxi mity"~10 similarity~ path:{abc TO def]',
        zoektQuery: "foo boost",
        warnings: [
          { code: "BoostNotSupported", location: { start: 4, end: 12 } },
          { code: "ProximityNotSupported", location: { start: 12, end: 28 } },
          { code: "SimilarityNotSupported", location: { start: 28, end: 40 } },
          { code: "RangeTermNotSupported", location: { start: 40, end: 44 } },
        ],
      }
    );
  });

  it("regex escapes lucene values", async () => {
    assert.deepEqual(await toZoekt({ full: "w*ldc?rd esca.pe" }), {
      luceneQuery: "w*ldc?rd esca.pe",
      zoektQuery: "w.*ldc.?rd esca\\.pe",
      warnings: [],
    });
  });

  it("translates boolean logic", async () => {
    assert.deepEqual(
      await toZoekt({
        full: "a && (defs:b || +c) OR NOT (d OR (path:-e AND (!f NOT g) h))",
        path: "-i && +j",
      }),
      {
        luceneQuery:
          "a && (defs:b || +c) OR NOT (d OR (path:-e AND (!f NOT g) h)) path:(-i && +j)",
        zoektQuery:
          "a (sym:b or c) or -(d or (-file:e (-f -g) h)) (-file:i file:j)",
        warnings: [],
      }
    );
  });

  it("pushes down parenthesized fields", async () => {
    assert.deepEqual(
      await toZoekt({
        full: "foobar defs:(a (b OR !c))",
        refs: "-d && +e",
      }),
      {
        luceneQuery: "foobar defs:(a (b OR !c)) refs:(-d && +e)",
        zoektQuery: "foobar (sym:a (sym:b or -sym:c)) (-d e)",
        warnings: [
          { code: "ReferencesNotSupported", location: { start: 26, end: 30 } },
          // FIXME warnings from pushdown are duplicated, not a huge deal but
          { code: "ReferencesNotSupported", location: { start: 26, end: 30 } },
        ],
      }
    );
  });
});
