<script lang="ts">
  import Link from "$lib/link.svelte";
  import { acquireOpenGrokInstantRedirectStore } from "$lib/preferences";

  const openGrokInstantRedirect = acquireOpenGrokInstantRedirectStore();
</script>

<svelte:head>
  <title>OpenGrok -> ɴᴇᴏɢʀᴏᴋ!</title>
</svelte:head>

<div class="space-y-2">
  <section class="space-y-2 max-w-prose mx-auto">
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
  <section class="space-y-2 max-w-prose mx-auto">
    <h2 class="text-lg">Want to get instantly redirected next time?</h2>
    <label class="text-sm">
      <input type="checkbox" bind:checked={$openGrokInstantRedirect} /> Redirect
      me from old OpenGrok URLs automatically when possible. (You can undo this
      on the <Link to="/preferences">preferences page</Link>.)</label
    >
  </section>
</div>
