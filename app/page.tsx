import Link from "next/link";
import { Search } from "./search";

// Does nothing: https://github.com/vercel/next.js/issues/42991
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const resp = await fetch("http://example.com");

  return (
    <main>
      <div>
        page! {searchParams?.q} {resp.status} {Date.now()}
      </div>
      <Search />
      <Link href="/?q=foobar">internal page navigation</Link>
    </main>
  );
}
