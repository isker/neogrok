import * as v from "@badrap/valita";
import fs from "node:fs";

const zoektUrlSchema = v.string().map((u) => new URL(u));
const fileConfigurationSchema = v.object({
  zoektUrl: zoektUrlSchema.optional(),
  openGrokProjectMappings: v
    .record(v.string())
    .map((o) => new Map(Object.entries(o)))
    .optional(),
});
type FileConfiguration = v.Infer<typeof fileConfigurationSchema>;
const defaultConfigFilePath = "/etc/neogrok/config.json";

const environmentConfigurationSchema = v.object({
  ZOEKT_URL: zoektUrlSchema.optional(),
});

type Configuration = {
  readonly zoektUrl: URL;
  readonly openGrokProjectMappings: ReadonlyMap<string, string>;
};

// We have to export a not-yet-bound `configuration` at module eval time because
// either SvelteKit or Vite is _executing_ this module during the build, for
// reasons that I do not understand. We do not want to enforce required
// configuration options being defined at build time; neogrok does not prerender
// anything.
//
// So, we do not want to resolve the configuration at module eval time.
//
// So, we rely on live export bindings plus a call to `resolveConfiguration`
// from something else at server startup. Anything consuming the actual
// configuration will have to avoid dereferencing it in the module scope.
export let configuration: Configuration;
export const resolveConfiguration: () => Promise<void> = async () => {
  const configFilePath =
    process.env.NEOGROK_CONFIG_FILE ?? defaultConfigFilePath;
  let fileConfig: FileConfiguration | undefined;
  try {
    fileConfig = fileConfigurationSchema.parse(
      JSON.parse(await fs.promises.readFile(configFilePath, "utf8")),
      { mode: "strict" },
    );
  } catch (e) {
    // Swallow errors related to the default config file being missing.
    if (
      !(
        e &&
        typeof e === "object" &&
        "code" in e &&
        e.code === "ENOENT" &&
        configFilePath === defaultConfigFilePath
      )
    ) {
      throw new Error(`Configuration file at ${configFilePath} is invalid`, {
        cause: e,
      });
    }
  }

  const environmentConfig = environmentConfigurationSchema.parse(process.env, {
    mode: "strip",
  });

  const zoektUrl = environmentConfig.ZOEKT_URL ?? fileConfig?.zoektUrl;
  if (zoektUrl === undefined) {
    throw new Error(
      `"ZOEKT_URL" must be defined in the environment, or "zoektUrl" must be defined in the configuration file at ${configFilePath}`,
    );
  }

  configuration = {
    zoektUrl,
    openGrokProjectMappings:
      fileConfig?.openGrokProjectMappings ?? new Map<string, string>(),
  };
};
