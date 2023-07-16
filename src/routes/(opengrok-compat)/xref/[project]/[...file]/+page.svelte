<script lang="ts">
  import ExampleQuery from "$lib/example-query.svelte";
  import Link from "$lib/link.svelte";
  import { escapeRegExp } from "$lib/regexp";

  export let data: import("./$types").PageData;
</script>

<section class="space-y-2 pt-2 max-w-prose mx-auto">
  <h2 class="text-2xl text-center">File/directory browser</h2>
  <p>
    OpenGrok's file/directory browser that was previously available at this URL
    is unfortunately not supported in neogrok.
  </p>
  {#if data.destinationUrl}
    <p>
      That being said, we've been able to produce a URL to view the
      file/directory on its home site. Head on over: <Link
        to={data.destinationUrl}>{data.destinationUrl}</Link
      >.
    </p>
  {:else if data.file}
    <p>
      Even more unfortunately, we've not been able to produce a URL to view the
      file/directory somewhere else. You can try searching for it and going from
      there:
      <ExampleQuery query={`file:^${escapeRegExp(data.file)}$`} />.
    </p>
  {:else}
    <p>
      Even more unfortunately, we've not been able to produce a URL to view the
      file/directory somewhere else. Sorry! Head on over to <Link to="/"
        >the neogrok search page</Link
      > to get started with neogrok.
    </p>
  {/if}
</section>
