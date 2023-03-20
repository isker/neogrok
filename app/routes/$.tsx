import type { MetaFunction } from "@remix-run/node";
import type { LoaderFunction } from "react-router";

export const meta: MetaFunction = () => ({ title: "404 - neogrok" });

export const loader: LoaderFunction = () => new Response(null, { status: 404 });
const NotFoundPage = () => (
  <div className="text-center text-xl">404 - Not Found</div>
);

export default NotFoundPage;
