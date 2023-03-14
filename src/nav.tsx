import {
  Link as ReactRouterLink,
  LinkProps,
  useLocation,
} from "react-router-dom";

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

export const Link = ({ children, ...props }: LinkProps) => (
  <ReactRouterLink
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...props}
    className="text-cyan-700 hover:underline decoration-1"
  >
    {children}
  </ReactRouterLink>
);
