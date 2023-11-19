<script lang="ts">
  import Link from "$lib/link.svelte";
  import Heading from "$lib/doc-section-heading.svelte";
  import ExampleQuery from "$lib/example-query.svelte";
</script>

<svelte:head>
  <title>About - neogrok</title>
</svelte:head>

<div class="space-y-2 max-w-prose mx-auto">
  <h1 class="text-2xl tracking-wide text-center">ɴᴇᴏɢʀᴏᴋ</h1>
  <p>
    Neogrok is a frontend for
    <Link to="https://github.com/sourcegraph/zoekt">zoekt</Link>, a fast and
    scalable code search engine. Neogrok exposes zoekt's search APIs in the form
    of a modern, snappy UI.
  </p>
  <p>
    This page describes the functionality of this neogrok site. To see the
    source code and more detailed documentation on configuring and deploying
    neogrok, check out the project on <Link
      to="https://github.com/isker/neogrok">GitHub</Link
    >.
  </p>

  <section class="space-y-2">
    <Heading id="search-page">Code search</Heading>
    <p>
      The <Link to="/">main/home page</Link> of the site is the code search page.
      Here you can enter a search query in the zoekt syntax, which is a complicated
      enough topic that <Link to="/syntax">it gets its own page</Link>.
    </p>
    <section class="space-y-2">
      <Heading element="h3" id="live-search">Live search</Heading>
      <p>
        One of the selling points of neogrok and zoekt is speed. So, by default,
        search is <i>live</i>: every character you type into the search inputs
        will execute a new query. If you prefer to not have live search, there
        is a button in the search form that toggles between live and
        <i>manual</i>
        search. When manual search is enabled, the search query can instead be executed
        by pressing the enter/return key, and any search inputs that have pending
        changes are highlighted in yellow.
      </p>
    </section>
    <section class="space-y-2">
      <Heading element="h3" id="search-results">Search results</Heading>
      <p>
        Search results consist of <i>N</i> matches for the query across <i>M</i>
        files, where <i>N ≥ M</i>. Matches can occur not only in file contents,
        but in file paths as well. As a search engine, zoekt attempts to rank
        results by a relevancy score: it will return the highest scoring file
        first. The scoring mechanisms of zoekt are opaque and unspecified.
      </p>
      <p>
        Unlike some other search engines, zoekt does not paginate search
        results. To prevent both neogrok and your browser from being
        overwhelmed, the number of results returned from zoekt to neogrok are
        limited by the <i>files</i> and <i>matches</i> inputs. Zoekt collects
        the top <i>N</i> matches across the top <i>M</i> files, stopping whenever
        it meets either of these two limits, and sends the truncated results to neogrok.
      </p>
      <p>
        The search results header thus describes how many files and matches for
        the query zoekt found, and how many it sent to neogrok. It will show
        which of the <i>files</i> and <i>matches</i> inputs are the current limiting
        factor on the truncated results by highlighting the relevant count in the
        header. You can get more results by increasing the relevant limit in its
        input.
      </p>
    </section>
    <section class="space-y-2">
      <Heading element="h3" id="other-search-inputs"
        >Other search inputs</Heading
      >
      <div>
        <p>
          Finally, there are a few more inputs in the search form that control
          how search results are displayed:
        </p>
        <ul class="list-disc list-inside">
          <li>
            In addition to the live/manual toggle button, there is another
            toggle button that affects the ordering of matches within a file.
            Zoekt not only ranks files in search results, but also ranks matches
            within each file. By default, neogrok ignores this ranking and
            displays matches ordered by line number, but you may use this button
            to switch to ordering matches by score.
          </li>
          <li>
            You can set the number of lines of <i>context</i> around matches in
            file contents; this has the same semantics as
            <span class="font-mono">grep</span>'s
            <span class="font-mono">-C</span>
            flag.
          </li>
        </ul>
      </div>
    </section>
  </section>

  <section class="space-y-2">
    <Heading id="repositories-page">Repositories list</Heading>
    <p>
      The <Link to="/repositories">repositories list page</Link> tabulates all of
      the repositories indexed in the backing zoekt instance, including a variety
      of data about them.
    </p>
    <p>
      Note that the search input on this page has the same semantics as the
      search input on the main search page: you are writing a full <Link
        to="/syntax">zoekt query</Link
      >, but instead of getting normal search results, you get repositories that
      contain any results matching the query. So, <ExampleQuery
        query="r:linux"
        page="repositories"
      /> filters the table to repositories with "linux" in their name, while <ExampleQuery
        query="linux"
        page="repositories"
      /> filters the table to repositories with linux in their
      <em>contents</em>.
    </p>
  </section>

  <section class="space-y-2">
    <Heading id="preferences-page">Preferences</Heading>
    <p>
      The <Link to="/preferences">preferences page</Link> allows you to persistently
      configure some aspects of the neogrok UI. Preferences configured here are stored
      in browser cookies and are updated instantly upon interacting with any of the
      inputs.
    </p>
  </section>
</div>
