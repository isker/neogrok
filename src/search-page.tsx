import {
  Fragment,
  memo,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { json, LoaderFunction, useLoaderData } from "react-router-dom";
import { ChevronDown, ChevronUp, ChevronRight } from "react-feather";
import type { LineToken } from "./content-parser";
import { ExampleQuery } from "./example-query";
import { Link } from "./nav";
import { useSearchFormReactKey } from "./use-search-form-react-key";
import { Preferences } from "./preferences";
import {
  ResultFile,
  search as executeSearch,
  SearchResults as ApiSearchResults,
} from "./search-api";
import {
  parseSearchParams,
  useRouteSearchQuery,
} from "./use-route-search-query";

const SearchPage = () => {
  const { key: searchFormKey, keyChanged } = useSearchFormReactKey();
  // @ts-expect-error remix has a better typing system for loaders so that we
  // won't need to cast.
  const searchOutcome: SearchOutcome = useLoaderData();
  const [previousResults, setPreviousResults] = useState<TimedSearchResults>();

  if (keyChanged) {
    return null;
  }

  if (
    searchOutcome.kind === "success" &&
    searchOutcome.results !== previousResults
  ) {
    setPreviousResults(searchOutcome.results);
    return null;
  }

  if (searchOutcome.kind === "none") {
    return (
      <>
        <SearchForm key={searchFormKey} />
        <Lander />
      </>
    );
  } else if (searchOutcome.kind === "error") {
    return (
      <>
        <SearchForm key={searchFormKey} queryError={searchOutcome.error} />
        {previousResults ? (
          <SearchResults results={previousResults} />
        ) : (
          <Lander />
        )}
      </>
    );
  } else {
    return (
      <>
        <SearchForm key={searchFormKey} />
        <SearchResults results={searchOutcome.results} />
      </>
    );
  }
};

export { SearchPage as Component };

type SearchOutcome =
  | { kind: "none" }
  // TODO for long searches, we should consider a `pending` outcome with
  // `defer`/`Suspense`/`Await`.  Needs benchmarking to determine just how
  // slow a zoekt backend can get with large repositories.
  | { kind: "success"; results: TimedSearchResults }
  | { kind: "error"; error: string };
type TimedSearchResults = ApiSearchResults & { requestDuration: number };
export const loader: LoaderFunction = async ({ request }) => {
  const start = Date.now();
  const { query, ...rest } = parseSearchParams(
    new URL(request.url).searchParams
  );
  if (query === undefined) {
    return json<SearchOutcome>({ kind: "none" });
  }

  try {
    const response = await executeSearch({ query, ...rest }, request.signal);
    if (response.kind === "success") {
      return json<SearchOutcome>({
        kind: "success",
        results: { ...response.results, requestDuration: Date.now() - start },
      });
    } else {
      return json<SearchOutcome>(response);
    }
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      )
    ) {
      // eslint-disable-next-line no-console
      console.error("Search failed", error);
    }
    return json<SearchOutcome>({ kind: "error", error: String(error) });
  }
};

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

  useEffect(() => {
    if (query) {
      document.title = `${query} - neogrok`;
    } else {
      document.title = "neogrok";
    }
  }, [query]);

  const [formQuery, setFormQuery] = useState(query ?? "");

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
              if (searchType === "live") {
                updateRouteSearchQuery({ query: e.target.value, searchType });
              }
            }}
          />
        </label>

        <div>
          <IntegerInput
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
          <IntegerInput
            id="files"
            kind="positive"
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
          <IntegerInput
            id="file-matches-cutoff"
            label="Initially shown matches per file"
            value={fileMatchesCutoff}
            onValueChange={setFileMatchesCutoff}
          />
          <IntegerInput
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
          <IntegerInput
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

const IntegerInput = ({
  id,
  label,
  kind = "nonnegative",
  size = 3,
  value,
  onValueChange,
}: {
  id: string;
  label: ReactNode;
  kind?: "nonnegative" | "positive";
  size?: number;
  value: number;
  onValueChange: (v: number) => void;
}) => {
  const [stringValue, setStringValue] = useState(value.toString());
  const [valid, setValid] = useState(true);
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
          const isValid =
            /^\d+$/.test(e.target.value) &&
            (kind === "nonnegative" || e.target.value !== "0");
          setValid(isValid);
          if (isValid) {
            const parsed = Number.parseInt(e.target.value, 10);
            if (parsed !== value) {
              onValueChange(parsed);
            }
          }
        }}
      />
    </label>
  );
};

const Lander = () => (
  <>
    <h1 className="text-4xl text-center pt-2 tracking-wide">ɴᴇᴏɢʀᴏᴋ</h1>
    <div className="flex flex-col items-center pt-6 gap-4">
      <span className="text-center">
        <h2 className="text-2xl font-semibold">TL;DR </h2>
        <Link to="/syntax">
          <span className="text-xs">
            or, learn the query syntax from the ground up
          </span>
        </Link>
      </span>

      <ul className="flex flex-wrap gap-4 justify-evenly">
        <li className="flex-initial basis-64">
          <h3 className="text-lg">Every query is regex</h3>
          <ul className="space-y-1">
            <li>
              <ExampleQuery query=".printf" />
            </li>
            <li>
              <ExampleQuery query="\.printf" />
            </li>
            <li>
              <ExampleQuery query="whom?" />
            </li>
          </ul>
        </li>
        <li className="flex-initial basis-64">
          <h3 className="text-lg">Filter results by...</h3>
          <ul className="space-y-1">
            <li>
              <ExampleQuery query="file:README test" />{" "}
              <span className="text-xs">
                (or <code>f:</code>)
              </span>
            </li>
            <li>
              <ExampleQuery query="repo:linux test" />{" "}
              <span className="text-xs">
                (or <code>r:</code>)
              </span>
            </li>
            <li>
              <ExampleQuery query="branch:pages test" />{" "}
              <span className="text-xs">
                (or <code>b:</code>)
              </span>
            </li>
            <li>
              <ExampleQuery query="lang:java test" />
            </li>
          </ul>
        </li>
        <li className="flex-initial basis-64">
          <h3 className="text-lg">Search for symbol definitions</h3>
          <p className="text-xs">
            As identified by <Link to="https://ctags.io">universal-ctags</Link>.
          </p>
          <ul className="space-y-1">
            <li>
              <ExampleQuery query="sym:main" />
            </li>
            <li>
              <ExampleQuery query="sym:Test[A-Z]" />
            </li>
          </ul>
        </li>
        <li className="flex-initial basis-64">
          <h3 className="text-lg">Automatic case sensitivity</h3>
          <p className="text-xs">
            If a query is all-lowercase, it is case insensitive by default;
            otherwise it&apos;s case-sensitive by default. Change that with{" "}
            <code>case:</code>.
          </p>
          <ul className="space-y-1">
            <li>
              <ExampleQuery query="readme" />
            </li>
            <li>
              <ExampleQuery query="readme case:yes" />
            </li>
            <li>
              <ExampleQuery query="README" />
            </li>
            <li>
              <ExampleQuery query="README case:no" />
            </li>
          </ul>
        </li>
        <li className="flex-initial basis-64">
          <h3 className="text-lg">Use double quotes for queries with spaces</h3>
          <p className="text-xs">
            Otherwise each word is parsed as a separate{" "}
            <Link to="/syntax#expressions">expression</Link>.
          </p>
          <ul className="space-y-1">
            <li>
              <ExampleQuery query='"run the test"' />
            </li>
            <li>
              <ExampleQuery query='"goto considered harmful"' />
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </>
);

// We need to memo over `searchState` so that we don't rerender every time a
// character is typed into the search form; we need our rendering to happen
// post-debouncing not pre-debouncing.
// eslint-disable-next-line prefer-arrow-callback
const SearchResults = memo(function SearchResults({
  results: {
    backendStats: { fileCount, matchCount, filesSkipped, duration },
    files,
    requestDuration,
  },
}: {
  results: TimedSearchResults;
}) {
  const frontendMatchCount = files.reduce((n, { matchCount: m }) => n + m, 0);
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
            key={`${repository}/${fileName.tokens
              .map(({ text }) => text)
              .join()}`}
            file={file}
            rank={i + 1}
          />
        );
      })}
    </>
  );
});

const SearchResultsFile = ({
  file: {
    repository,
    fileName,
    matchCount: fileMatchCount,
    branches,
    language,
    chunks,
    fileUrl,
    lineNumberTemplate,
  },
  rank,
}: {
  file: ResultFile;
  rank: number;
}) => {
  const renderedFileName = <SearchResultLine lineTokens={fileName.tokens} />;
  const linkedFilename = fileUrl ? (
    <Link to={fileUrl}>{renderedFileName}</Link>
  ) : (
    renderedFileName
  );

  const { matchSortOrder, fileMatchesCutoff } = useContext(Preferences);
  const sortedChunks =
    matchSortOrder === "line-number"
      ? [...chunks].sort(
          ({ lines: [{ lineNumber: a }] }, { lines: [{ lineNumber: b }] }) =>
            a - b
        )
      : // Nothing to do otherwise; matches are already sorted by score.
        chunks;

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
  //
  // FIXME the value of `expandedBy` is wrong if the sort order changes while
  // it's non-undefined. That will not be a trivial fix.
  const [expandedBy, setExpandedBy] = useState<number>();
  // That being said, we do special case a 0-cutoff by simply rendering no
  // lineGroups.
  if (fileMatchesCutoff !== 0 || expandedBy) {
    for (const { matchCount, lines } of sortedChunks) {
      const [{ lineNumber: startLineNumber }] = lines;
      const contiguous =
        lineGroups.at(-1)?.at(-1)?.lineNumber === startLineNumber - 1;

      if (
        !contiguous &&
        numMatchesInFileSections >= fileMatchesCutoff &&
        !expandedBy
      ) {
        break;
      }

      numMatchesInFileSections += matchCount;

      if (contiguous) {
        // By the definition of `contiguous` we know this exists.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        lineGroups.at(-1)!.push(...lines);
      } else {
        // Make a copy. We will be mutating it.
        lineGroups.push([...lines]);
      }
    }
  }

  const numHiddenMatches =
    fileMatchCount - numMatchesInFileSections - fileName.matchCount;

  const metadata = [
    `${fileMatchCount} ${fileMatchCount === 1 ? "match" : "matches"}`,
    // I don't like every result just yelling HEAD, it's not particularly useful
    // information.
    ...(branches.length > 1 || branches[0] !== "HEAD"
      ? [branches.join(", ")]
      : []),
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
                        href={`${fileUrl}${lineNumberTemplate.join(
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
