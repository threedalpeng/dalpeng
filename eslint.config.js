import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "**/*.vert",
      "**/*.frag",
      "**/*.glsl",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Backend hygiene — @dalpeng/ui/core must stay backend-agnostic.
    // core/* may NOT import from dom/* (scene/* also forbidden in the future).
    files: ["packages/ui/src/core/**/*.ts", "packages/ui/src/core/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/dom/**", "../dom/*", "../dom"],
              message:
                "core/ must stay backend-agnostic — don't import from dom/. If a type is needed on both sides, lift it into core or @dalpeng/core.",
            },
          ],
        },
      ],
    },
  },
  prettier,
];
