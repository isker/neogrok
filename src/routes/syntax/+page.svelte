<script lang="ts">
  import Link from "$lib/link.svelte";
  import ExampleQuery from "$lib/example-query.svelte";
  import Heading from "./heading.svelte";
  import Expression from "./expression.svelte";
</script>

<svelte:head>
  <title>Query syntax - neogrok</title>
</svelte:head>

<div class="space-y-2">
  <h1 class="text-2xl text-center">Query syntax</h1>
  <p>
    The query syntax of neogrok is controlled by
    <Link to="https://github.com/sourcegraph/zoekt">zoekt</Link>, the code
    search engine for which neogrok is a frontend. Because zoekt does not have
    good documentation covering this syntax, we describe it here.
  </p>
  <section class="space-y-2">
    <Heading id="regex">Everything is regex</Heading>
    <p>
      In zoekt, all queries are parsed by Go&apos;s regexp package, the syntax
      of which is documented
      <Link to="https://pkg.go.dev/regexp/syntax#hdr-Syntax">here</Link>. There
      is no way to disable this functionality; queries that want to use regex
      control characters literally must escape them.
    </p>
    <p>
      Queries cannot control the
      <Link to="https://pkg.go.dev/regexp/syntax#Flags">regex flags</Link>
      that zoekt uses; they are hardcoded. As can be seen
      <Link
        to="https://github.com/sourcegraph/zoekt/blob/58cf4748830ac0eded1517cc8c2454694c531fbd/query/parse.go#L231"
      >
        here,
      </Link> the flags are <code>ClassNL</code>, <code>PerlX</code>, and
      <code>UnicodeGroups</code>. Together, these flags notably allow multiline
      regex matches using character classes like
      <code>[[:space:]]</code>, but <em>not</em> using the dot.
    </p>
  </section>
  <section class="space-y-2">
    <Heading id="expressions">
      Queries are composed of one or more space-separated expressions
    </Heading>
    <p>
      If your query contains no spaces, its behavior is pretty intuitive.
      <ExampleQuery query="foo" /> displays all matches for the regex
      <Expression>/foo/</Expression>. That query contains a single
      <em>expression</em>, namely a <em>regex</em> expression. (We&apos;ll introduce
      more kinds of expressions below.)
    </p>
    <p>
      But what about <ExampleQuery query="foo bar" />? This query has two
      expressions, which makes its behavior more complicated: it returns all
      matches for the regex <Expression>/foo/</Expression> <em>or</em> the regex <Expression
        >/bar/</Expression
      >, but only in files that have matches for both <Expression
        >/foo/</Expression
      > <em>and</em>
      <Expression>/bar/</Expression>.
    </p>
    <p>
      First of all, if you wanted this query to behave as if it had only one
      expression, literally matching <Expression>/foo bar/</Expression>, you can
      either wrap it in double quotes, like
      <ExampleQuery query={'"foo bar"'} />, or by escaping the space, like
      <ExampleQuery query="foo\ bar" />; both of those queries are equivalent.
      (Single quotes have no special meaning in this regard.
      <ExampleQuery query="'foo bar'" /> contains two expressions, the first being
      <Expression>/&apos;foo/</Expression> and the second being
      <Expression>/bar&apos;/</Expression>.)
    </p>
    <p>
      As described above, expressions are <em>conjunctive</em> by default. A
      file must have at least one match for each expression to be included in
      the query results. Expressions may be made <em>disjunctive</em> by joining
      them with the special expression infix operator
      <code>or</code>. <ExampleQuery query="foo or bar" /> returns all matches for
      <Expression>/foo/</Expression> or
      <Expression>/bar/</Expression> in all files that have matches for least one
      of <Expression>/foo/</Expression> <em>or</em>
      <Expression>/bar/</Expression>. (To use <code>or</code> as a literal
      expression and not as an operator, double quote it:
      <ExampleQuery query={'foo "or" bar'} /> has three conjunctive expressions.)
    </p>
    <p>
      Expressions can be logically grouped with parentheses:
      <ExampleQuery query="foo (bar or baz)" /> produces results from files with
      matches for both <Expression>/foo/</Expression> and at least one of <Expression
        >/bar/</Expression
      > or
      <Expression>/baz/</Expression>. These groupings can be nested arbitrarily.
    </p>
    <p>
      To complete the boolean logic, expressions can be negated with a leading
      dash. <ExampleQuery query="foo -bar" /> returns all matches for <Expression
        >/foo/</Expression
      > in files that do not have matches for <Expression>/bar/</Expression>.
      <ExampleQuery query="foo -(bar or baz)" /> returns all matches for
      <Expression>/foo/</Expression> in files that do not have matches for either
      <Expression>/bar/</Expression> or
      <Expression>/baz/</Expression>.
      <ExampleQuery query="foo -(bar baz)" /> returns all matches for
      <Expression>/foo/</Expression> in files that do not have matches for
      <em>both</em>
      <Expression>/bar/</Expression> and
      <Expression>/baz/</Expression>.
    </p>
  </section>
  <section class="space-y-2">
    <Heading id="prefix-expressions">
      Certain prefixes have special effects on expressions
    </Heading>
    <p>
      In addition to the default regex expressions you&apos;ve already seen,
      special kinds of expressions can be created by prefixing them with certain
      flags, which are themselves composed of a few characters ending with a
      colon.
    </p>
    <p>
      Consider that regex expressions can produce matches both in the content of
      a file and in the <em>name</em> of the file:
      <ExampleQuery query="README" /> matches both file names and file contents (though
      the search engine tends to rank files containing file name matches higher than
      those containing only content matches, so you may have to scroll down or increase
      the number of files displayed to see the content matches for this query). If
      you only want the expression to match file names, use an expression prefixed
      with
      <code>file:</code>, like <ExampleQuery query="file:README" />. (
      <code>f:</code> is an equivalent abbreviation for <code>file:</code>).
    </p>
    <p>
      The inverse of <code>file:</code>&apos;s specialization of regex
      expressions is <code>content:</code> or <code>c:</code>.
      <ExampleQuery query="content:README" /> produces only matches that occur in
      the content of files.
    </p>
    <p>
      There are a few more kinds of prefix expressions than those two.
      They&apos;re all tabulated here:
    </p>
    <table class="border border-collapse text-sm w-full text-center">
      <thead>
        <tr class="border bg-slate-100">
          <th class="p-1">Prefix(es)</th>
          <th class="p-1">Description</th>
          <th class="p-1">Examples</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border">
          <td class="p-1">
            <code>file:</code>, <code>f:</code>
          </td>
          <td class="p-1">
            Regex match file names only, instead of the default file names and
            file contents
          </td>
          <td class="p-1">
            <ExampleQuery query="f:README" />
            <br />
            <ExampleQuery query="f:README neogrok" />
            <br />
            <ExampleQuery query={'f:"evil file with spaces"'} />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>content:</code>, <code>c:</code>
          </td>
          <td class="p-1">
            Regex match file contents only, instead of the default file names
            and file contents
          </td>
          <td class="p-1">
            <ExampleQuery query="c:README" />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>repo:</code>, <code>r:</code>
          </td>
          <td class="p-1">
            Regex match repository names; by default all repositories are
            searched
          </td>
          <td class="p-1">
            <ExampleQuery query="r:linux driver" />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>branch:</code>, <code>b:</code>
          </td>
          <td class="p-1">
            Regex match branch names; by default all branches are searched
          </td>
          <td class="p-1">
            <ExampleQuery query="b:prerelease foo" />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>lang:</code>
          </td>
          <td class="p-1">
            Constrain files to those in the given language (or language alias)
            as defined by
            <Link
              to="https://github.com/github/linguist/blob/master/lib/linguist/languages.yml"
            >
              linguist
            </Link>
            and computed probabilistically from file name and contents at index time
            by
            <Link to="https://github.com/go-enry/go-enry/">go-enry</Link>. This
            is <em>not</em> a regex or a substring, though it is case-insensitive;
            each expression can only contain one language.
          </td>
          <td class="p-1">
            <ExampleQuery query="lang:typescript type" />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>sym:</code>
          </td>
          <td class="p-1">
            Regex match symbol definitions, as determined by
            <Link to="https://ctags.io/">universal ctags</Link> at index time, if
            it was present during indexing
          </td>
          <td class="p-1">
            <ExampleQuery query="sym:\bmain\b" />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>case:</code>
          </td>
          <td class="p-1">
            Unlike most other expressions, does not do anything on its own, but
            rather modifies other expressions in the query.
            <code>case:yes</code> makes other expressions case-sensitive;
            <code>case:no</code> makes them case-insensitive, and
            <code>case:auto</code> (the default behavior) makes them case-sensitive
            if they have any uppercase characters and case-insensitive otherwise
          </td>
          <td class="p-1">
            <ExampleQuery query="case:no TEST" />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>archived:</code>
          </td>
          <td class="p-1">
            <code>archived:no</code> excludes archived repositories while
            <code>archived:yes</code> excludes non-archived repositories. The default
            is to exclude neither.
          </td>
          <td class="p-1">
            <ExampleQuery query="archived:no readme" />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>fork:</code>
          </td>
          <td class="p-1">
            <code>fork:no</code> excludes repositories that are forks of another
            while <code>fork:yes</code> excludes repositories that are not forks
            of another. The default is to exclude neither.
          </td>
          <td class="p-1">
            <ExampleQuery query="fork:no readme" />
          </td>
        </tr>
        <tr class="border">
          <td class="p-1">
            <code>public:</code>
          </td>
          <td class="p-1">
            <code>public:no</code> excludes public repositories while
            <code>public:yes</code> excludes private repositories. The default is
            to exclude neither.
          </td>
          <td class="p-1">
            <ExampleQuery query="public:no readme" />
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</div>
