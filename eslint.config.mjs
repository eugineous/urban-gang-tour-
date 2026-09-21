import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Pre-existing: the whole codebase uses `any` extensively across hundreds
      // of files. Demote to warn so new code gets flagged but CI doesn't fail
      // on issues that pre-date this linting setup.
      "@typescript-eslint/no-explicit-any": "warn",
      // Pre-existing: several files use `require()` for conditional imports
      "@typescript-eslint/no-require-imports": "warn",
      // Pre-existing: many components use <a> for external/dynamic links
      "@next/next/no-html-link-for-pages": "warn",
      // Pre-existing: <img> is intentional (CDN resizer uses data-ugt-src fallback)
      "@next/next/no-img-element": "warn",
      // Pre-existing: several react-hooks/exhaustive-deps warnings in existing code
      "react-hooks/exhaustive-deps": "warn",
      // Pre-existing: custom font in layout.tsx is deliberate (App Router pattern)
      "@next/next/no-page-custom-font": "off",
      // Pre-existing: unescaped entities in JSX across the codebase
      "react/no-unescaped-entities": "warn",
      // Pre-existing: let → const in a few large files
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
