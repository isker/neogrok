import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  useSearchParams,
  LoaderFunction,
  json,
  useLoaderData,
} from "react-router-dom";
import prettyBytes from "pretty-bytes";
import {
  listRepositories,
  ListResults,
  Repository as ApiRepository,
} from "./list-repositories-api";
import { Link } from "./nav";
import { useSearchFormReactKey } from "./use-search-form-react-key";

const Repositories = () => {
  const { key: searchFormKey, keyChanged } = useSearchFormReactKey();
  // @ts-expect-error remix has a better typing system for loaders so that we
  // won't need to cast.
  const listOutcome: ListOutcome = useLoaderData();
  const [previousResults, setPreviousResults] = useState<ListResults>();

  if (keyChanged) {
    return null;
  }

  if (
    listOutcome.kind === "success" &&
    listOutcome.results !== previousResults
  ) {
    setPreviousResults(listOutcome.results);
    return null;
  }

  if (listOutcome.kind === "error") {
    return (
      <>
        <SearchForm key={searchFormKey} error={listOutcome.error} />
        {previousResults ? (
          <RepositoriesList results={previousResults} />
        ) : null}
      </>
    );
  } else {
    return (
      <>
        <SearchForm key={searchFormKey} />
        <RepositoriesList results={listOutcome.results} />
      </>
    );
  }
};

export { Repositories as Component };

type ListOutcome =
  | { kind: "success"; results: ListResults }
  | { kind: "error"; error: string };
export const loader: LoaderFunction = async ({ request }) => {
  const { query } = parseSearchParams(new URL(request.url).searchParams);
  try {
    return json<ListOutcome>(await listRepositories({ query }, request.signal));
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
      console.error("List repositories failed", error);
    }
    return json<ListOutcome>({ kind: "error", error: String(error) });
  }
};

const parseSearchParams = (searchParams: URLSearchParams) => ({
  // coerce the empty string to undefined
  query: searchParams.get("q") || undefined,
});

const useRouteListQuery = (): [string | undefined, (query: string) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { query: parsedQuery } = parseSearchParams(searchParams);

  const lastNavigateTime = useRef(0);
  const setRouteQuery = useCallback(
    (newQuery: string) => {
      const queryChanged = (newQuery || undefined) !== parsedQuery;
      if (queryChanged) {
        const now = Date.now();
        setSearchParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (newQuery) {
              next.set("q", newQuery);
            } else {
              next.delete("q");
            }
            return next;
          },
          {
            replace: now - lastNavigateTime.current < 2000,
          }
        );
        lastNavigateTime.current = now;
      }
    },
    [parsedQuery, setSearchParams]
  );

  return [parsedQuery, setRouteQuery];
};

const SearchForm = ({ error }: { error?: string }) => {
  const [listQuery, setListQuery] = useRouteListQuery();

  useEffect(() => {
    document.title = `${
      listQuery ? `${listQuery} - ` : ""
    }neogrok/repositories`;
  }, [listQuery]);

  return (
    <>
      <label
        htmlFor="query"
        title="Same query syntax as the main search - use `r:name` to filter repositories by name, otherwise you are filtering them by their content!"
        className="flex"
      >
        <span className="inline-block p-1 pr-2 bg-gray-300 border border-gray-400 cursor-help">
          Search repositories
        </span>
        <input
          id="query"
          type="search"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          className={`p-1 border shadow-sm focus:outline-none flex-auto appearance-none ${
            error === undefined
              ? "border-slate-300 focus:border-sky-500"
              : "border-red-500"
          }`}
          value={listQuery ?? ""}
          onChange={(e) => {
            setListQuery(e.target.value);
          }}
        />
      </label>
      {error !== undefined ? (
        <span className="text-sm text-red-500">{error} </span>
      ) : null}
    </>
  );
};

// eslint-disable-next-line prefer-arrow-callback
const RepositoriesList = memo(function RepositoriesList({
  results,
}: {
  results: ListResults;
}) {
  const {
    stats: { fileCount, indexBytes, contentBytes },
    repositories,
  } = results;
  return (
    <>
      <h1 className="text-xs py-1">
        {repositories.length}{" "}
        {repositories.length === 1 ? "repository" : "repositories"} containing{" "}
        {fileCount} files consuming{" "}
        {prettyBytes(indexBytes + contentBytes, { space: false })} of RAM
      </h1>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm w-full text-center">
          <thead>
            <tr className="border bg-slate-100">
              <th className="p-1">Repository</th>
              <th className="p-1">File count</th>
              <th className="p-1">Branches</th>
              <th className="p-1">Content size in RAM</th>
              <th className="p-1">Index size in RAM</th>
              <th className="p-1">Last indexed</th>
              <th className="p-1">Last commit</th>
            </tr>
          </thead>
          <tbody>
            {repositories.map((repo) => (
              <Repository key={repo.name} repository={repo} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
});

const Repository = ({
  repository: {
    name,
    url,
    lastIndexed,
    lastCommit,
    branches,
    stats: { fileCount, indexBytes, contentBytes },
  },
}: {
  repository: ApiRepository;
}) => (
  <tr className="border">
    <td className="p-1">
      {url.length > 0 ? <Link to={url}>{name}</Link> : name}
    </td>
    <td className="p-1">{fileCount}</td>
    <td className="p-1">
      {branches
        .map(({ name: branchName, version }) => `${branchName}@${version}`)
        .join(" ")}
    </td>
    <td className="p-1">{prettyBytes(contentBytes, { space: false })}</td>
    <td className="p-1">{prettyBytes(indexBytes, { space: false })}</td>
    <td className="p-1">{lastIndexed}</td>
    <td className="p-1">{lastCommit}</td>
  </tr>
);
