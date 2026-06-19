import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        jade: "#0f766e",
        mint: "#d7f6ee",
        clay: "#b85c38",
        cloud: "#f6f8f7",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 32, 27, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
