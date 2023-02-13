import { useEffect, useState } from "react";
import { Link, useLocation, useNavigationType } from "react-router-dom";

const navLinks = [
  ["/", "Search"],
  ["/repositories", "Repositories"],
  ["/syntax", "Query Syntax"],
  ["/about", "About"],
] as const;
export const Nav = () => {
  const { pathname, search } = useLocation();
  return (
    <nav className="pt-2 pb-12">
      <ul className="flex justify-center text-xs">
        {navLinks.map(([url, text]) => (
          <li
            key={url}
            className="after:content-['•'] after:px-2 last:after:content-none"
          >
            {url === pathname ? (
              text
            ) : (
              <Link
                className="text-cyan-700"
                to={
                  // Preserve query string so that search queries are preserved
                  // across navigations. This is useful when moving back and
                  // forth between the main search and the repo search, or the
                  // main search and the query syntax page.
                  `${url}${search}`
                }
              >
                {text}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export const usePopStateReactKey = () => {
  // We have some pretty gnarly requirements around the search form. The search
  // form projects the route into the form UI once upon mount, and then
  // continuously projects the form UI into the route from there on.
  //
  // This works fine, except on `popstate` (i.e. user hitting forward or back
  // button): suddenly, we need to once again project the route into the UI. To
  // make this happen, we force an unmount/remount by way of changing the `key`
  // on the SearchForm.
  const navigationType = useNavigationType();
  const { search } = useLocation();
  const [previousSearch, setPreviousSearch] = useState<string>(search);
  useEffect(() => setPreviousSearch(search), [search]);
  const [key, setKey] = useState<string>();
  if (navigationType === "POP" && previousSearch !== search) {
    // This pattern (set state during render, then bail out of render) is in
    // fact a valid one.
    //
    // https://beta.reactjs.org/reference/react/useState#setstate-caveats
    // "Calling the set function during rendering is only allowed from within
    // the currently rendering component. React will discard its output and
    // immediately attempt to render it again with the new state."

    // The actual key we set doesn't much matter; Math.random() would not be
    // appreciably different.
    setKey(`${previousSearch}->${search}`);
    // Prevent loops by repeating this state's initializer.
    setPreviousSearch(search);
    return { key, keyChanged: true };
  }
  return { key, keyChanged: false };
};
