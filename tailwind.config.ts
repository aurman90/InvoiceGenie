import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ["'Noto Naskh Arabic'", "'Amiri'", "serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#0b6e4f",
          dark: "#08593f",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
