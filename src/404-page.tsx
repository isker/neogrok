import { Nav } from "./nav";

const NotFoundPage = () => (
  <div className="container mx-auto px-2">
    <Nav />
    {/* "404" is of course aspirational - no SSR, no status codes. */}
    <main className="text-center text-xl">404 - Not Found</main>
  </div>
);

export default NotFoundPage;
