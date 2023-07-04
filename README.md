# neogrok

Neogrok is a frontend for [zoekt](https://github.com/sourcegraph/zoekt), a fast
and scalable code search engine. Neogrok exposes zoekt's search APIs in the form
of a modern, snappy UI.

There is a [demo deployment](./demo) at https://neogrok-demo-web.fly.dev/. This
deployment's configuration can serve as a guide for your own deployments of
neogrok; currently there are no packaged distributions.

## OpenGrok compatibility

As an added bonus, neogrok can serve as a replacement for existing deployments
of [OpenGrok](https://oracle.github.io/opengrok/), a much older, more intricate,
slower, and generally jankier code search engine than zoekt. Neogrok strives to
provide URL compatibility with OpenGrok by redirecting OpenGrok URLs to their
neogrok equivalents: simply deploy neogrok at the same origin previously hosting
your OpenGrok instance, and everything will Just Work™. (Perfect compatibility
is not possible as the feature sets of each search engine do not map
one-to-one.)

### Renaming OpenGrok projects to zoekt repository

If your OpenGrok project names are not identical to their equivalent zoekt
repository names, you can run `neogrok` with an environment variable
`OPENGROK_PROJECT_MAPPINGS_FILE` that points at a JSON file whose contents are
an object mapping OpenGrok project names to zoekt repository names. With this
data provided, neogrok can rewrite OpenGrok queries that include project names
appropriately.
