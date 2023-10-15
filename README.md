# neogrok

Neogrok is a frontend for [zoekt](https://github.com/sourcegraph/zoekt), a fast
and scalable code search engine. Neogrok exposes zoekt's search APIs in the form
of a modern, snappy UI. Neogrok is a SvelteKit application running on Node.js
and in the browser.

There is a demo deployment of neogrok and zoekt running together at
https://neogrok-demo-web.fly.dev/.

## Installing

Neogrok is packaged for installation on
[NPM](https://www.npmjs.com/package/neogrok). Simply `npm install -g neogrok` to
install an executable.

Alternatively, building from source is easy. Clone the repository,
`npm install && npm run build && npm run start`. You can of course run the server
without intermediation by `npm`, by doing whatever `npm run start` does directly;
but the relevant commands may change in the future, whereas `npm run start` will
not.

## Deploying

The demo deployment is configured [in this repository](./demo). This configuration
can serve as a guide for your own deployments of neogrok together with zoekt.

## Configuration

Neogrok may be [configured](./src/lib/server/configuration.ts) using a JSON
configuration file, or, where possible, environment variables. Configuration
options defined in the environment take precedence over those defined in the
configuration file.

The configuration file is read from `/etc/neogrok/configuration.json` by
default, but the location may be customized using the environment variable
`NEOGROK_CONFIG_FILE`. The file is entirely optional, as all of the required
configuration may be defined in the environment. If it is present, the file's
contents must be a JSON object with zero or more entires, whose keys correspond
to the option names tabulated below.

### Configuration options

| Option name               | Environment variable name | Required Y/N | Description                                                                                                                        |
| :------------------------ | :------------------------ | :----------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| `zoektUrl`                | `ZOEKT_URL`               | Y            | The base zoekt URL at which neogrok will make API requests, at e.g. `/api/search` and `/api/list`                                  |
| `openGrokProjectMappings` | N/A                       | N            | An object mapping OpenGrok project names to zoekt repository names; see [below](#renaming-opengrok-projects-to-zoekt-repositories) |

### SvelteKit environment variables

Note that you can also configure, among other things, which ports/addresses will
be bound, using SvelteKit's Node environment variables. See the list
[here](https://kit.svelte.dev/docs/adapter-node#environment-variables).

### Prometheus metrics

Neogrok exports some basic [Prometheus](https://prometheus.io/)
[metrics](./src/lib/server/metrics.ts) on an opt-in basis, by setting a
`PROMETHEUS_PORT` or `PROMETHEUS_SOCKET_PATH`, plus an optional
`PROMETHEUS_HOST`. These variables have the exact same semantics as the
above-described SvelteKit environment variables, but the port/socket must be
different than those of the main application. When opting in with these
variables, `/metrics` will be served at the location they describe.

`/metrics` is required to be served with a different port/socket so as to not
expose it on the main site; serving one port to end users and another to the
prometheus scraper is the easiest way to ensure proper segmentation of the
neogrok site from internal infrastructure concerns, without having to run a
particularly configured HTTP reverse proxy in front of neogrok.

## OpenGrok compatibility

As an added bonus, neogrok can serve as a replacement for existing deployments
of [OpenGrok](https://oracle.github.io/opengrok/), a much older, more intricate,
slower, and generally jankier code search engine than zoekt. Neogrok strives to
provide URL compatibility with OpenGrok by redirecting OpenGrok URLs to their
neogrok equivalents: simply deploy neogrok at the same origin previously hosting
your OpenGrok instance, and everything will Just Work™. To the best of our
ability, OpenGrok Lucene queries will be rewritten to the most possibly
equivalent zoekt queries. (Perfect compatibility is not possible as the feature
sets of each search engine do not map one-to-one.)

### Renaming OpenGrok projects to zoekt repositories

If your OpenGrok project names are not identical to their equivalent zoekt
repository names, you can run `neogrok` with the appropriate
[`openGrokProjectMappings` configuration](#configuration), which maps OpenGrok
project names to zoekt repository names. With this data provided, neogrok can
rewrite OpenGrok queries that include project names appropriately.
