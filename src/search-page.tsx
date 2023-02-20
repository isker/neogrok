import {
  Fragment,
  memo,
  ReactNode,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronDown, ChevronUp, ChevronRight } from "react-feather";
import { LineToken, parseIntoLines } from "./content-parser";
import { Link, Nav, usePopStateReactKey } from "./nav";
import { Preferences } from "./preferences";
import {
  ResultFile,
  search as executeSearch,
  SearchResults as ApiSearchResults,
} from "./search-api";
import { useRouteSearchQuery } from "./use-route-search-query";

const SearchPage = () => {
  const { key: searchFormKey, keyChanged } = usePopStateReactKey();
  const searchOutcome = useSearchOutcome();
  if (keyChanged) {
    return null;
  }

  let mainContent;
  if (searchOutcome.kind === "none" && searchOutcome.query) {
    // Don't flash the lander on initial render if we are just waiting for a
    // service response.
    mainContent = <SearchForm key={searchFormKey} />;
  } else if (searchOutcome.kind === "none") {
    mainContent = (
      <>
        <SearchForm key={searchFormKey} />
        <Lander />
      </>
    );
  } else if (searchOutcome.kind === "error") {
    mainContent = (
      <>
        <SearchForm key={searchFormKey} queryError={searchOutcome.error} />
        {searchOutcome.previousResults ? (
          <SearchResults results={searchOutcome.previousResults} />
        ) : null}
      </>
    );
  } else {
    mainContent = (
      <>
        <SearchForm key={searchFormKey} />
        <SearchResults results={searchOutcome.results} />
      </>
    );
  }

  return (
    <div className="container mx-auto">
      <Nav />
      <main>{mainContent}</main>
    </div>
  );
};

type TimedSearchResults = ApiSearchResults & { requestDuration: number };
type SearchOutcome =
  // There is no search outcome; on page load there may be no outcome when there
  // is a query in the URL parameters, in which case `q` will be set.
  | { kind: "none"; query?: string }
  | {
      kind: "success";
      results: TimedSearchResults;
    }
  | {
      kind: "error";
      error: string;
      // Results from the previously successful query, so that we can display them
      // in addition to the error.
      previousResults: TimedSearchResults | undefined;
    };

const useSearchOutcome = () => {
  const [searchQuery] = useRouteSearchQuery();
  const [searchOutcome, setSearchOutome] = useState<SearchOutcome>({
    kind: "none",
    query: searchQuery.query,
  });

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    const { query, ...rest } = searchQuery;
    if (query === undefined) {
      document.title = "neogrok";
      setSearchOutome({ kind: "none" });
    } else {
      document.title = `${query} - neogrok`;
      const abortController = new AbortController();
      const start = Date.now();
      debouncedSearch({ query, ...rest }, abortController.signal)
        .then((outcome) => {
          startTransition(() => {
            if (outcome.kind === "error") {
              setSearchOutome((previous) => ({
                ...outcome,
                previousResults: computePreviousResults(previous),
              }));
            } else {
              setSearchOutome({
                kind: "success",
                results: {
                  ...outcome.results,
                  requestDuration: Date.now() - start,
                },
              });
            }
          });
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            // eslint-disable-next-line no-console
            console.error("Search failed", error);
            startTransition(() =>
              setSearchOutome((previous) => ({
                kind: "error",
                error: error.toString(),
                previousResults: computePreviousResults(previous),
              }))
            );
          }
        });
      return () => abortController.abort();
    }
  }, [searchQuery]);

  return searchOutcome;
};

const computePreviousResults = (previousOutcome: SearchOutcome) => {
  if (previousOutcome.kind === "none") {
    return undefined;
  } else if (previousOutcome.kind === "error") {
    return previousOutcome.previousResults;
  } else {
    return previousOutcome.results;
  }
};

// TODO a more intelligent debounce strategy might be possible. Consider:
// - due to trigram indexing, queries with less than 3 characters are expensive;
//   debounce longer on short queries and little or not at all on longer ones?
// - identifying when a search query has fewer than 3 characters is not actually
//   trivial, due to "meta" expressions like repo/filename filtering
// - the current 100ms is long enough to feel a bit laggy but short enough that
//   even during "quick" typing we are still firing queries in the middle; 60wpm
//   is 1 char every 200ms on average.  so what's the point?
//
// All of this applies the same to the repo list debounce.
const debounceSearch = (rate: number): typeof executeSearch => {
  let timeoutId: number | undefined;
  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      const ourTimeoutId = setTimeout(() => {
        executeSearch(...args).then(resolve, reject);
      }, rate);
      const [, signal] = args;
      signal.addEventListener("abort", () => clearTimeout(ourTimeoutId), {
        once: true,
      });
      timeoutId = ourTimeoutId;
    });
  };
};
const debouncedSearch = debounceSearch(100);

const SearchForm = ({ queryError }: { queryError?: string }) => {
  const [
    { query, contextLines, files, matchesPerShard, totalMatches },
    updateRouteSearchQuery,
  ] = useRouteSearchQuery();
  const {
    searchType,
    setSearchType,
    matchSortOrder,
    setMatchSortOrder,
    fileMatchesCutoff,
    setFileMatchesCutoff,
  } = useContext(Preferences);

  const [formQuery, setFormQuery] = useState(query ?? "");
  useEffect(() => {
    if (searchType === "live") {
      updateRouteSearchQuery({ query: formQuery, searchType });
    }
  }, [formQuery, updateRouteSearchQuery, searchType]);

  const [advancedOptionsExpanded, setAdvancedOptionsExpanded] = useState(false);

  const formContextLines = useRef(contextLines);
  const formFiles = useRef(files);
  const formMatchesPerShard = useRef(matchesPerShard);
  const formTotalMatches = useRef(totalMatches);

  // TODO consider more clearly indicating in the UI:
  // - when a search query API request is in progress
  // - in manual search, when there are pending unsubmitted changes to the form
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (searchType === "manual") {
          updateRouteSearchQuery({
            query: formQuery,
            contextLines: formContextLines.current,
            files: formFiles.current,
            matchesPerShard: formMatchesPerShard.current,
            totalMatches: formTotalMatches.current,
            searchType,
          });
        }
      }}
    >
      {/* Make enter key submission work: https://stackoverflow.com/a/35235768 */}
      <input type="submit" className="hidden" />

      <div className="flex flex-wrap gap-y-2 justify-center font-mono whitespace-nowrap">
        <label htmlFor="query" title="Search query" className="flex-auto flex">
          <span className="inline-block p-1 pr-2 bg-gray-300 border border-gray-400 cursor-help">
            $ grok
          </span>
          <input
            id="query"
            type="search"
            // I think autofocusing an element like this, at the top of the page,
            // is okay for a11y.  Not that half the other things here are.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            className={`p-1 border shadow-sm focus:outline-none flex-auto appearance-none ${
              queryError === undefined
                ? "border-slate-300 focus:border-sky-500"
                : "border-red-500"
            }`}
            value={formQuery}
            onChange={(e) => {
              setFormQuery(e.target.value);
            }}
          />
        </label>

        <div>
          <NonNegativeIntegerInput
            id="context"
            label={
              <span
                title="Number of lines of context around matches (like grep!)"
                className="inline-block py-1 px-2 bg-gray-300 border border-gray-400 cursor-help"
              >
                -C
              </span>
            }
            value={contextLines}
            onValueChange={(newContextLines) => {
              formContextLines.current = newContextLines;
              if (searchType === "live") {
                updateRouteSearchQuery({
                  contextLines: newContextLines,
                  searchType,
                });
              }
            }}
          />
          <NonNegativeIntegerInput
            id="files"
            label={
              <span
                title="Maximum number of files to display"
                className="inline-block py-1 px-2 bg-gray-300 border border-gray-400 cursor-help"
              >
                | head -n
              </span>
            }
            value={files}
            onValueChange={(newFiles) => {
              formFiles.current = newFiles;
              if (searchType === "live") {
                updateRouteSearchQuery({ files: newFiles, searchType });
              }
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap">
        {queryError !== undefined ? (
          <span className="text-sm text-red-500">{queryError} </span>
        ) : null}
        <button
          type="button"
          className="ml-auto text-xs bg-slate-100 px-2 py-1 rounded-md"
          onClick={() => setAdvancedOptionsExpanded((current) => !current)}
        >
          Advanced options
          {advancedOptionsExpanded ? (
            <ChevronUp className="inline" size={16} />
          ) : (
            <ChevronDown className="inline" size={16} />
          )}
        </button>
      </div>
      {/* TODO the advanced options UI is essentially unstyled */}
      {advancedOptionsExpanded ? (
        <div className="border flex flex-wrap">
          <fieldset className="border">
            <legend>Sort order</legend>
            <label htmlFor="line-number">
              Line number
              <input
                id="line-number"
                type="radio"
                name="sort"
                checked={matchSortOrder === "line-number"}
                onChange={(e) => {
                  if (e.target.checked) {
                    setMatchSortOrder("line-number");
                  }
                }}
              />
            </label>
            <label htmlFor="score">
              Score
              <input
                id="score"
                type="radio"
                name="sort"
                checked={matchSortOrder === "score"}
                onChange={(e) => {
                  if (e.target.checked) {
                    setMatchSortOrder("score");
                  }
                }}
              />
            </label>
          </fieldset>
          <fieldset className="border">
            <legend>Search type</legend>
            <label htmlFor="live">
              Live
              <input
                id="live"
                type="radio"
                name="search-type"
                checked={searchType === "live"}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSearchType("live");
                  }
                }}
              />
            </label>
            <label htmlFor="manual">
              Manual
              <input
                id="manual"
                type="radio"
                name="search-type"
                checked={searchType === "manual"}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSearchType("manual");
                  }
                }}
              />
            </label>
          </fieldset>
          <NonNegativeIntegerInput
            id="file-matches-cutoff"
            label="Initially shown matches per file"
            value={fileMatchesCutoff}
            onValueChange={setFileMatchesCutoff}
          />
          <NonNegativeIntegerInput
            id="matches-per-shard"
            label="Maximum matches per shard"
            size={4}
            value={matchesPerShard}
            onValueChange={(newMatchesPerShard) => {
              formMatchesPerShard.current = newMatchesPerShard;
              if (searchType === "live") {
                updateRouteSearchQuery({
                  matchesPerShard: newMatchesPerShard,
                  searchType,
                });
              }
            }}
          />
          <NonNegativeIntegerInput
            id="total-matches"
            label="Total maximum matches"
            size={5}
            value={totalMatches}
            onValueChange={(newTotalMatches) => {
              formTotalMatches.current = newTotalMatches;
              if (searchType === "live") {
                updateRouteSearchQuery({
                  totalMatches: newTotalMatches,
                  searchType,
                });
              }
            }}
          />
        </div>
      ) : null}
    </form>
  );
};

const NonNegativeIntegerInput = ({
  id,
  label,
  size = 3,
  value,
  onValueChange,
}: {
  id: string;
  label: ReactNode;
  size?: number;
  value: number;
  onValueChange: (v: number) => void;
}) => {
  const [stringValue, setStringValue] = useState(value.toString());
  const [valid, setValid] = useState(true);
  useEffect(() => {
    const isNonNegativeInteger = /^\d+$/.test(stringValue);
    setValid(isNonNegativeInteger);
    if (isNonNegativeInteger) {
      const parsed = Number.parseInt(stringValue, 10);
      if (parsed !== value) {
        onValueChange(parsed);
      }
    }
  }, [stringValue, setValid, value, onValueChange]);
  return (
    <label htmlFor={id}>
      {label}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        size={size}
        className={`p-1 border shadow-sm focus:outline-none ${
          valid ? "border-slate-300 focus:border-sky-500" : "border-red-500"
        }`}
        value={stringValue}
        onChange={(e) => {
          setStringValue(e.target.value);
        }}
      />
    </label>
  );
};

// TODO give some TL;DR examples linking to ./query-syntax
const Lander = () => (
  <div className="text-center pt-10">
    <h1 className="text-4xl tracking-wide">ɴᴇᴏɢʀᴏᴋ</h1>
  </div>
);

// We need to memo over `searchState` so that we don't rerender every time a
// character is typed into the search form; we need our rendering to happen
// post-debouncing not pre-debouncing.
// eslint-disable-next-line prefer-arrow-callback
const SearchResults = memo(function SearchResults({
  results: {
    fileCount,
    matchCount,
    filesSkipped,
    duration,
    files,
    repoUrls,
    repoLineNumberFragments,
    requestDuration,
  },
}: {
  results: TimedSearchResults;
}) {
  const frontendMatchCount = files
    .flatMap(({ chunks }) => chunks)
    .reduce((a, { matchRanges }) => a + matchRanges.length, 0);
  return (
    <>
      <h1 className="text-xs flex flex-wrap pt-2">
        <span>
          Backend: {fileCount} {fileCount === 1 ? "file" : "files"} /{" "}
          {matchCount} {matchCount === 1 ? "match" : "matches"}
          {filesSkipped > 0 ? (
            <>
              {" "}
              (
              <span
                title="The number of matches found on the backend exceeded the maximums, which are set to optimize performance in situations with large numbers of matches; they can be increased in the advanced options"
                className="text-yellow-700 cursor-help"
              >
                truncated
              </span>
              )
            </>
          ) : null}{" "}
          /{" "}
          {
            // ns -> ms with 2 decimal places
            Math.floor(duration / 1e4) / 1e2
          }
          ms
        </span>
        <span className="ml-auto">
          Frontend: {files.length} {files.length === 1 ? "file" : "files"} /{" "}
          {frontendMatchCount} {matchCount === 1 ? "match" : "matches"} /{" "}
          {requestDuration}ms
        </span>
      </h1>
      {files.map((file, i) => {
        const { repository, fileName } = file;
        return (
          <SearchResultsFile
            key={`${repository}/${fileName}`}
            file={file}
            fileUrlTemplate={repoUrls[repository]}
            lineNumberTemplate={repoLineNumberFragments[repository]}
            rank={i + 1}
          />
        );
      })}
    </>
  );
});

const SearchResultsFile = ({
  file: { repository, fileName, language, chunks, version },
  fileUrlTemplate,
  lineNumberTemplate,
  rank,
}: {
  file: ResultFile;
  fileUrlTemplate: string | undefined;
  lineNumberTemplate: string | undefined;
  rank: number;
}) => {
  // Search results may match not only on file contents but also the filename itself.
  // We have to especially handle such matches to render them properly.
  const fileNameChunks = chunks.filter(
    ({ isFileNameChunk }) => isFileNameChunk
  );
  if (fileNameChunks.length > 1) {
    // Should only ever be one match, with one or more ranges.  Check just to be sure.
    throw new Error(
      `Unreachable: received ${fileNameChunks.length} file name matches`
    );
  }

  const fileUrl = fileUrlTemplate
    ?.replaceAll("{{.Version}}", version)
    .replaceAll("{{.Path}}", fileName);

  let renderedFileName;
  if (fileNameChunks.length === 1) {
    const [
      {
        contentBase64,
        contentStart: { byteOffset },
        matchRanges,
      },
    ] = fileNameChunks;
    // If you put newlines in your filenames, you deserve this to be broken.
    const [lineTokens] = parseIntoLines(contentBase64, byteOffset, matchRanges);
    renderedFileName = (
      <SearchResultLine key={fileName} lineTokens={lineTokens} />
    );
  } else {
    renderedFileName = fileName;
  }

  const linkedFilename = fileUrl ? (
    <Link to={fileUrl}>{renderedFileName}</Link>
  ) : (
    renderedFileName
  );

  const { matchSortOrder, fileMatchesCutoff } = useContext(Preferences);
  const nonFileNameMatches = chunks.filter(
    ({ isFileNameChunk }) => !isFileNameChunk
  );
  if (matchSortOrder === "line-number") {
    // It's safe to mutate with `sort` as we just made a copy with `filter` above.
    nonFileNameMatches.sort(
      (
        { contentStart: { byteOffset: a } },
        { contentStart: { byteOffset: b } }
      ) => a - b
    );
  } // Nothing to do otherwise; matches are already sorted by score.

  // Groups of contiguous lines in the file; contiguous matches are merged into
  // a single group.
  const lineGroups: Array<
    Array<{ lineNumber: number; lineTokens: LineToken[] }>
  > = [];
  let numMatchesInFileSections = 0;
  // The goal is to produce the minimal number of lineGroups that exceed the
  // cutoff. We don't want to cut a file section in half to make the exact
  // cutoff (nor can we, if the cutoff is exceeded in the middle of a single
  // line).
  // This state var is only used if we have actually exceeded the cutoff.
  const [expandedBy, setExpandedBy] = useState<number>();
  // That being said, we do special case a 0-cutoff by simply rendering no
  // lineGroups.
  if (fileMatchesCutoff !== 0 || expandedBy) {
    for (const {
      contentBase64,
      contentStart: { byteOffset: baseByteOffset, lineNumber: startLineNumber },
      matchRanges,
    } of nonFileNameMatches) {
      const contiguous =
        lineGroups.at(-1)?.at(-1)?.lineNumber === startLineNumber - 1;

      if (
        !contiguous &&
        numMatchesInFileSections >= fileMatchesCutoff &&
        !expandedBy
      ) {
        break;
      }

      const chunkLines = parseIntoLines(
        contentBase64,
        baseByteOffset,
        matchRanges
      ).map((lineTokens, lineOffset) => ({
        lineNumber: startLineNumber + lineOffset,
        lineTokens,
      }));
      numMatchesInFileSections += matchRanges.length;

      if (contiguous) {
        // By the definition of `contiguous` we know this exists.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        lineGroups.at(-1)!.push(...chunkLines);
      } else {
        lineGroups.push(chunkLines);
      }
    }
  }

  const numTotalMatches = chunks.reduce(
    (count, { matchRanges }) => count + matchRanges.length,
    0
  );
  const numHiddenMatches =
    numTotalMatches -
    numMatchesInFileSections -
    fileNameChunks.reduce((a, { matchRanges }) => a + matchRanges.length, 0);

  // TODO could put branch here if we care
  const metadata = [
    `${numTotalMatches} ${numTotalMatches === 1 ? "match" : "matches"}`,
    language,
    `№${rank}`,
  ];

  const topOfList = useRef<HTMLDivElement>(null);
  return (
    <>
      <span ref={topOfList} />
      <section className="my-2 p-1 border-2 flex flex-col gap-1">
        <h2 className="px-2 py-1 text-sm sticky top-0 flex flex-wrap bg-slate-100 whitespace-pre-wrap [overflow-wrap:anywhere]">
          {/* ideally we could hyperlink the repository but there is no such
          URL in search results - either we do dumb stuff to the file template URL
          or we make a separate /list API request for each repo */}
          <span>
            {repository}
            <ChevronRight className="inline" size={16} />
            {linkedFilename}
          </span>
          <span className="ml-auto">{metadata.join(" | ")}</span>
        </h2>
        {lineGroups.length > 0 ? (
          <div className="font-mono text-sm divide-y">
            {lineGroups.map((lines) => (
              // minmax because we don't want the line number column to slide left and
              // right as you scroll down through sections with different `min-content`s'
              // worth of line numbers. 2rem is enough for 4 digits.
              <div
                key={lines[0].lineNumber}
                className="py-1 grid grid-cols-[minmax(2rem,_min-content)_1fr] gap-x-2 whitespace-pre overflow-x-auto"
              >
                {lines.map(({ lineNumber, lineTokens }) => {
                  const linkedLineNumber =
                    fileUrl && lineNumberTemplate ? (
                      <a
                        className="hover:underline decoration-1"
                        href={`${fileUrl}${lineNumberTemplate.replaceAll(
                          "{{.LineNumber}}",
                          lineNumber.toString()
                        )}`}
                      >
                        {lineNumber}
                      </a>
                    ) : (
                      lineNumber
                    );
                  return (
                    <Fragment key={lineNumber}>
                      <span className="select-none text-gray-600 text-right pr-1">
                        {linkedLineNumber}
                      </span>
                      <code>
                        <SearchResultLine lineTokens={lineTokens} />
                      </code>
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
        {numHiddenMatches > 0 && !expandedBy ? (
          <button
            type="button"
            onClick={() => setExpandedBy(numHiddenMatches)}
            className="bg-slate-100 text-sm py-1"
          >
            Show {numHiddenMatches} more{" "}
            {numHiddenMatches === 1 ? "match" : "matches"}
          </button>
        ) : null}
        {expandedBy ? (
          <button
            type="button"
            onClick={async () => {
              // If we've scrolled down so that the top of the list is not
              // visible, scroll it back into view. Only after scrolling is
              // complete do we close the list, to minimize confusion caused by
              // the motion.
              if (topOfList.current) {
                const top = topOfList.current;
                await new Promise<void>((resolve) => {
                  const observer = new IntersectionObserver((entries) => {
                    if (entries.some(({ isIntersecting }) => isIntersecting)) {
                      observer.disconnect();
                      resolve();
                    }
                  });
                  observer.observe(top);
                  top.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                  });
                });
              }
              setExpandedBy(undefined);
            }}
            className="bg-slate-100 text-sm py-1 sticky bottom-0"
          >
            Hide {expandedBy} {expandedBy === 1 ? "match" : "matches"}
          </button>
        ) : null}
      </section>
    </>
  );
};

const SearchResultLine = ({
  lineTokens,
}: {
  lineTokens: ReadonlyArray<LineToken>;
}) => (
  <>
    {lineTokens.map(({ kind, text, startByteOffset }) =>
      kind === "context" ? (
        text
      ) : (
        <span className="bg-yellow-200" key={startByteOffset}>
          {text}
        </span>
      )
    )}
  </>
);

export default SearchPage;
