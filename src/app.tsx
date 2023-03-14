import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { NotFoundPage } from "./404-page";
import { Nav } from "./nav";
import { NotYetImplementedPage } from "./not-yet-implemented-page";
import { PreferencesProvider } from "./preferences";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <div className="container mx-auto px-2">
          <Nav />
          <main>
            <Outlet />
          </main>
        </div>
      }
    >
      <Route path="/" lazy={() => import("./search-page")} />
      <Route path="/about" lazy={() => import("./about-page")} />
      <Route path="/syntax" lazy={() => import("./query-syntax-page")} />
      <Route path="/repositories" lazy={() => import("./repositories-page")} />

      {/* OpenGrok backward compatibility redirectors. TODO implement!
       *
       * Search:
       * https://opengrok.libreoffice.org/search?full=test&defs=&refs=&path=&hist=&type=&xrd=&nn=19&si=full&searchall=true&si=full
       * https://opengrok.libreoffice.org/search?full=a&defs=b&refs=c&path=d&hist=e&type=ada&xrd=&nn=19&searchall=true
       * https://opengrok.libreoffice.org/search?&full=a&defs=b&refs=c&path=d&hist=e&type=ada&project=core%2Ccppunit%2Cdev-tools%2Cdictionaries%2Chelp%2Cimpress_remote%2Clibabw%2Clibcdr%2Clibetonyek%2Clibfreehand%2Clibmspub%2Clibpagemaker%2Clibvisio%2Clibzmf%2Codfundiff%2Cofficeotron%2Conline%2Csdk-examples%2Ctranslations&sort=lastmodtime
       * https://opengrok.libreoffice.org/search?full=test&defs=&refs=&path=&hist=&type=&xrd=&nn=19&searchall=true&n=25&start=25
       *
       * - Can't support `history` search at all as it needs SCM
       *   integration that zoekt does not have.
       * - Can't support pagination.
       * - Can parse lucene queries with https://github.com/bripkens/lucene.
       * - TBD exactly how well defs & refs map to zoekt sym (and others?).
       *   If the semantics are similar, we can rewrite; otherwise,
       *   unsupported.
       *
       * Rewriting opengrok projects to zoekt repos of course requires that
       * they have the same name. We could perhaps support some kind of way
       * to configure a static mapping in addition to this.
       */}
      <Route path="/search" element={<NotYetImplementedPage />} />
      {/* help.jsp. Lol. Redirect to /syntax. */}
      <Route path="/help.jsp" element={<NotYetImplementedPage />} />
      {/*
       * Browse: we can at least support viewing files at the latest
       * revision. Directories would be an enormous hack; you could
       * probably simulate the basics with an r: and f: query.
       *
       * https://opengrok.libreoffice.org/xref/core/
       * https://opengrok.libreoffice.org/xref/core/xmlsecurity/CppunitTest_qa_certext.mk?r=de030cd7#3
       *
       * Annotate: probably will never support. Needs SCM integration that
       * zoekt does not have.
       * https://opengrok.libreoffice.org/xref/cppunit/AUTHORS?a=true&r=faa78dac
       */}
      <Route path="/xref/*" element={<NotYetImplementedPage />} />
      {/*
       * History: probably will never support. Needs SCM integration that
       * zoekt does not have.
       * https://opengrok.libreoffice.org/history/core/xmlsecurity/CppunitTest_qa_certext.mk
       */}
      <Route path="/history/*" element={<NotYetImplementedPage />} />
      {/*
       * Diff: probably will never support. Needs SCM integration that
       * zoekt does not have.
       * https://opengrok.libreoffice.org/diff/core/xmlsecurity/CppunitTest_qa_certext.mk?r1=%2Fcore%2Fxmlsecurity%2FCppunitTest_qa_certext.mk%402b383d19&r2=%2Fcore%2Fxmlsecurity%2FCppunitTest_qa_certext.mk%40de030cd7
       */}
      <Route path="/diff/*" element={<NotYetImplementedPage />} />
      {/*
       * Raw: can support, for viewing the latest revision of a file. But
       * why?
       * https://opengrok.libreoffice.org/raw/cppunit/AUTHORS?r=faa78dac
       */}
      <Route path="/raw/*" element={<NotYetImplementedPage />} />
      {/*
       * Download: I mean, if we must.
       * https://opengrok.libreoffice.org/download/cppunit/AUTHORS?r=faa78dac
       */}
      <Route path="/download/*" element={<NotYetImplementedPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
);

export const App = () => (
  <PreferencesProvider>
    <RouterProvider router={router} />
  </PreferencesProvider>
);
