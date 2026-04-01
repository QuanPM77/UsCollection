import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          blush: "#FFD1DC",
          light: "#FFE4EC",
          mid: "#FFB6C8",
          deep: "#E8829A",
          text: "#7D2E46",
        },
        cream: "#FFF8F9",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-playfair)", "serif"],
      },
      boxShadow: {
        pink: "0 4px 24px rgba(255, 182, 200, 0.4)",
        "pink-lg": "0 8px 40px rgba(255, 182, 200, 0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
