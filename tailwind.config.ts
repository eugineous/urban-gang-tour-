import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "ppp-purple": "#6C3BFF",
        "ppp-teal": "#16d9e3",
        "ppp-blue": "#0ea5e9",
        ink: "#0C0710",
        surface: "#160D16",
        "surface-raised": "#1F1320",
        paper: "#FFF7FC",
        magenta: {
          DEFAULT: "#C7238E",
          bright: "#E12FA3",
          deep: "#8C1568",
        },
        gold: {
          DEFAULT: "#F5A623",
          bright: "#FFC24D",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        marker: ["var(--font-marker)"],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      boxShadow: {
        glow: "0 10px 60px -15px rgba(45,212,191,0.45)",
        magenta: "0 20px 60px -20px rgba(199,35,142,0.55)",
      },
    },
  },
  plugins: [],
} satisfies Config;
