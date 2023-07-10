import * as v from "@badrap/valita";
import fs from "node:fs";

/**
 * Users may provide a simple JSON file that maps from OpenGrok project names to
 * Zoekt repo names, in case project names changed.
 */
export const projectToRepo = await (async function () {
  if (process.env.OPENGROK_PROJECT_MAPPINGS_FILE) {
    const projectMappingSchema = v.record(v.string());
    const raw = JSON.parse(
      await fs.promises.readFile(
        process.env.OPENGROK_PROJECT_MAPPINGS_FILE,
        "utf8"
      )
    );
    return new Map(Object.entries(projectMappingSchema.parse(raw)));
  } else {
    return new Map();
  }
})();
