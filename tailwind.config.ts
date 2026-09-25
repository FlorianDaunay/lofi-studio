import { tailwindThemeExtension } from "./src/themes/tailwind";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: tailwindThemeExtension() },
};
