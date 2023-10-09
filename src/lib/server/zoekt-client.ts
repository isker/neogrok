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
