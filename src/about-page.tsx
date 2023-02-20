import { Nav } from "./nav";

const AboutPage = () => (
  <div className="container mx-auto">
    <Nav />
    <main className="space-y-2">
      <h1 className="text-2xl tracking-wide text-center">ɴᴇᴏɢʀᴏᴋ</h1>
      <p>
        Neogrok is a frontend for{" "}
        <a
          href="https://github.com/sourcegraph/zoekt"
          className="text-cyan-700"
        >
          zoekt
        </a>
        , a fast and scalable code search engine. Neogrok exposes zoekt&quot;s
        search APIs in the form of a modern, snappy UI.
      </p>
      <p>
        As an added bonus, neogrok can serve as a replacement for existing
        deployments of{" "}
        <a href="https://oracle.github.io/opengrok/" className="text-cyan-700">
          OpenGrok
        </a>
        , a much older, more intricate, slower, and generally jankier code
        search engine than zoekt. Neogrok strives to provide URL compatibility
        with OpenGrok by redirecting OpenGrok URLs to their neogrok equivalents:
        simply deploy neogrok at the same origin previously hosting your
        OpenGrok instance, and everything will Just Work™. (Perfect
        compatibility is not possible as the feature sets of each search engine
        do not map one-to-one.)
      </p>
      <p>
        To see the source code and more detailed documentation, check out the
        project on{" "}
        <a href="https://github.com/isker/neogrok" className="text-cyan-700">
          GitHub
        </a>
        .
      </p>
    </main>
  </div>
);

export default AboutPage;
