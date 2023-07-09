<script lang="typescript">
  import Link from "$lib/link.svelte";
</script>

<svelte:head>
  <title>OpenGrok -> ɴᴇᴏɢʀᴏᴋ!</title>
</svelte:head>

<div class="space-y-2">
  <section class="space-y-2">
    <h1 class="text-center text-2xl"><s>OpenGrok</s> ɴᴇᴏɢʀᴏᴋ!</h1>
    <p>
      The OpenGrok instance that previously existed at this domain has been
      replaced with <Link to="/about">neogrok</Link>, which is a frontend for <Link
        to="https://github.com/sourcegraph/zoekt">zoekt</Link
      >, a fast code search engine with a sane query syntax. Together, neogrok
      and zoekt ought to be much faster and easier to use.
    </p>
  </section>
  <slot />
</div>
