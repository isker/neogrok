import { json, LoaderFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import { Link } from "./link";
import {
  BrowserPreferencesProvider,
  parseServerPreferences,
  PreferencesData,
  ServerPreferencesProvider,
} from "./preferences";
import styles from "./root.css";

type LoaderData = { serverPreferences: PreferencesData };
export const loader: LoaderFunction = ({ request }) => {
  const serverPreferences = parseServerPreferences(
    request.headers.get("cookie")
  );
  return json<LoaderData>({ serverPreferences });
};

export default function Root() {
  const { serverPreferences } = useLoaderData<typeof loader>();
  const children =
    typeof document !== "undefined" ? (
      <BrowserPreferencesProvider>
        <Outlet />
      </BrowserPreferencesProvider>
    ) : (
      <ServerPreferencesProvider serverPreferences={serverPreferences}>
        <Outlet />
      </ServerPreferencesProvider>
    );

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href={styles} />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="container mx-auto px-2">
          <Nav />
          <main>{children}</main>
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

const navLinks = [
  ["/", "Search"],
  ["/repositories", "Repositories"],
  ["/syntax", "Query Syntax"],
  ["/about", "About"],
] as const;
const Nav = () => {
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
