import { Link } from "./link";

export const ExampleQuery = ({ query }: { query: string }) => (
  <Link
    state={{ searchForm: "reset" }}
    to={`/?${new URLSearchParams({ q: query }).toString()}`}
  >
    <code className="bg-gray-200 p-1 whitespace-nowrap text-sm">{query}</code>
  </Link>
);
