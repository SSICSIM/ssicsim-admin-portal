import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const eslintConfig = [
  { ignores: [".next/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // A leading underscore is the standard way to mark a required-but-unused
    // parameter (e.g. a callback signature you don't fully use) as intentional.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  },
  {
    // next.config.js is a Node/CommonJS entry point (uses __dirname, module.exports),
    // not application source — require() is the correct, standard form here.
    files: ["next.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];

export default eslintConfig;
