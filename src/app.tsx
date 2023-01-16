import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const SearchPage = lazy(() => import("./search-page"));
const NotYetImplementedPage = lazy(() => import("./not-yet-implemented-page"));
const NotFoundPage = lazy(() => import("./404-page"));

export const App = () => (
  <Router>
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/about" element={<NotYetImplementedPage />} />
        <Route path="/syntax" element={<NotYetImplementedPage />} />
        <Route path="/repositories" element={<NotYetImplementedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </Router>
);
