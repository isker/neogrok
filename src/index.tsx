import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const app = document.getElementById("app")!;
const root = createRoot(app);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
