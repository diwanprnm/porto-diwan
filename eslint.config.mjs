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
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Perkakas editor (graft hooks/statusline) yang di-generate dan
      // di-gitignore, bukan kode proyek. Berkasnya .cjs (CommonJS) sehingga
      // `require()` di dalamnya benar secara aturan Node, tapi aturan
      // next/typescript melarangnya — melint ini akan selalu gagal.
      ".claude/**",
    ],
  },
];

export default eslintConfig;
