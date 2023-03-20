import { ReactNode, useContext, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "react-feather";
import { Preferences } from "app/preferences";
import { useRouteSearchQuery } from "./use-route-search-query";

export const SearchForm = ({ queryError }: { queryError?: string }) => {
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
            // TODO
            // autoCapitalize="off"
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
