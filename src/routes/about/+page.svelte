<script lang="ts">
  import Link from "$lib/link.svelte";
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
    As an added bonus, neogrok can serve as a replacement for existing
    deployments of
    <Link to="https://oracle.github.io/opengrok/">OpenGrok</Link>, a much older,
    more intricate, slower, and generally jankier code search engine than zoekt.
    Neogrok strives to provide URL compatibility with OpenGrok by redirecting
    OpenGrok URLs to their neogrok equivalents: simply deploy neogrok at the
    same origin previously hosting your OpenGrok instance, and everything will
    Just Work™. (Perfect compatibility is not possible as the feature sets of
    each search engine do not map one-to-one.)
  </p>
  <p>
    To see the source code and more detailed documentation, check out the
    project on <Link to="https://github.com/isker/neogrok">GitHub</Link>.
  </p>
</div>
