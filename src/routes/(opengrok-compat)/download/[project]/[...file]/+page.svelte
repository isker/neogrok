<script lang="ts">
  import ExampleQuery from "$lib/example-query.svelte";
  import Link from "$lib/link.svelte";
  import { escapeRegExp } from "$lib/regexp";

  export let data: import("./$types").PageData;
</script>

<section class="space-y-2 pt-2">
  <h2 class="text-2xl text-center">File download</h2>
  <p>
    OpenGrok's file download endpoint view that was previously available at this
    URL is unfortunately not supported in neogrok.
  </p>
  {#if data.fileUrl}
    <p>
      That being said, we've been able to produce a URL to view the file on its
      home site. Head on over: <Link to={data.fileUrl}>{data.fileUrl}</Link>.
    </p>
  {:else}
    <p>
      Even more unfortunately, we've not been able to produce a URL to view the
      file somewhere else. You can try searching for it and going from there:
      <ExampleQuery query={`file:^${escapeRegExp(data.file)}$`} />.
    </p>
  {/if}
</section>
