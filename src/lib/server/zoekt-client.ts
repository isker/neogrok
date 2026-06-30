import {
  zoektRequestCount,
  zoektRequestDuration,
  zoektRequestConcurrency,
} from "./metrics";
import { configuration } from "./configuration";

// This is a small wrapper primarily to handle metrics uniformly.
export const makeZoektRequest = async (
  f: typeof fetch,
  path: string,
  body: string,
): Promise<Response> => {
  try {
    zoektRequestConcurrency.labels(path).inc();

    const start = Date.now();
    const response = await f(new URL(path, configuration.zoektUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
    });
    const durationSeconds = (Date.now() - start) / 1000;

    const labels = [path, response.status.toString()];
    zoektRequestCount.labels(...labels).inc();
    zoektRequestDuration.labels(...labels).inc(durationSeconds);

    return response;
  } finally {
    zoektRequestConcurrency.labels(path).dec();
  }
};

// zoekt reports failures in two shapes: a 400 carrying a JSON `{ Error }` body
// (typically a malformed query), or some other non-OK status with a plain-text
// body. Every neogrok API backed by zoekt surfaces these identically, so this
// builds the shared `{ kind: "error" }` result - the `prefix` distinguishes the
// non-400 case per call site.
export const zoektErrorResponse = async (
  response: Response,
  prefix: string,
): Promise<{ kind: "error"; error: string }> => {
  if (response.status === 400) {
    const { Error: error } = await response.json();
    return { kind: "error", error };
  }
  const responseBody = await response.text();
  return {
    kind: "error",
    error: `${prefix}, HTTP ${response.status}: ${response.statusText}${
      responseBody ? ` - ${responseBody}` : ""
    }`,
  };
};
