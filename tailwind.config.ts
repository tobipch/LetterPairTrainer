import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        difficulty: {
          0: "#22c55e",
          25: "#84cc16",
          50: "#eab308",
          75: "#f97316",
          100: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};

export default config;
