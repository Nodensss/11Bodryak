import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#16324f",
        sky: "#d7ecff",
        paper: "#f7fbff",
        chalk: "#ffffff",
        accent: "#1f6feb",
        success: "#c5f5cc",
        successInk: "#115d26",
      },
      boxShadow: {
        card: "0 24px 60px -32px rgba(22, 50, 79, 0.35)",
      },
      backgroundImage: {
        notebook:
          "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(240,248,255,0.85)), linear-gradient(90deg, rgba(31,111,235,0.08) 0, rgba(31,111,235,0.08) 1px, transparent 1px, transparent 100%)",
      },
      backgroundSize: {
        notebook: "100% 100%, 26px 26px",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
        serif: ["var(--font-prata)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
