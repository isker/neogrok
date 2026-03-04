import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import { includeIgnoreFile } from "@eslint/compat";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import { fileURLToPath } from "node:url";
import ts from "typescript-eslint";
const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["recommended"],
  {
    rules: {
      // Seems to find a bunch of false positives in the syntax page.
      "svelte/no-useless-mustaches": ["off"],
      // This is dumb, you cannot partition things by path like this
      // successfully in the web. "Origin" means something.
      "svelte/no-navigation-without-resolve": ["off"],
      // Can't model svelte reactive variables well. Maybe would be better with
      // runes.
      "no-useless-assignment": ["off"],
    },
  },
  prettier,
  ...svelte.configs["prettier"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["**/*.svelte"],

    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
);
