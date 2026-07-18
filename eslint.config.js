// https://github.com/logeast/magic-lottery/blob/101/.eslintrc.cjs
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "always"],
    },
  },
  {
    ignores: ["dist/", "docs/.vitepress/dist/", "docs/.vitepress/cache/"],
  },
);
