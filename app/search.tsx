"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export const Search = () => {
  const searchParams = useSearchParams();
  const routeQuery = searchParams.get("q") ?? "";

  const router = useRouter();
  const [formQuery, setFormQuery] = useState(routeQuery);

  const [desiredRouteQuery, setDesiredRouteQuery] = useState<string>();

  if (desiredRouteQuery !== undefined && desiredRouteQuery === routeQuery) {
    setDesiredRouteQuery(undefined);
    return null;
  }

  // When all of these differ, it indicates that the URL changed due to
  // navigation or popstate and the form state should be reinitialized from the
  // route.
  if (
    routeQuery !== desiredRouteQuery &&
    routeQuery !== formQuery &&
    formQuery !== desiredRouteQuery
  ) {
    setFormQuery(routeQuery);
    setDesiredRouteQuery(undefined);
    return null;
  }

  const onChange = (q: string) => {
    setFormQuery(q);
    if (routeQuery !== q) {
      setDesiredRouteQuery(q);
      if (q === "") {
        router.push("/");
      } else {
        router.push(`/?${new URLSearchParams({ q }).toString()}`);
      }
    }
  };

  return <SearchForm formQuery={formQuery} onChange={onChange} />;
};

const SearchForm = ({
  formQuery,
  onChange,
}: {
  formQuery: string;
  onChange: (s: string) => void;
}) => {
  return (
    <input
      type="search"
      value={formQuery}
      onChange={(e) => {
        onChange(e.target.value);
      }}
    ></input>
  );
};
