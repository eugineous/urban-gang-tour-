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
        magenta: {
          DEFAULT: "#E6218C",
          deep: "#C11778",
          bright: "#FF3FA8",
        },
        gold: {
          DEFAULT: "#FFD400",
          bright: "#FFE066",
        },
        yellow: {
          DEFAULT: "#FFD400",
        },
        cyan: {
          DEFAULT: "#21C7E6",
        },
        ink: "#111111",
        paper: "#F7F1E4",
        concrete: "#f3efe6",
        surface: "#1B0F18",
        "surface-raised": "#241621",
        success: "#1F8A5B",
        live: "#FF3B30",
      },
      fontFamily: {
        display: ["var(--font-display)"], // Anton
        badge: ["var(--font-badge)"], // Bungee
        sans: ["var(--font-sans)"], // Space Grotesk
        marker: ["var(--font-marker)"], // Permanent Marker
      },
      borderRadius: {
        arch: "150px 150px 18px 18px",
      },
      boxShadow: {
        sm3: "3px 3px 0 #111",
        card5: "5px 5px 0 #111",
        hero8: "8px 8px 0 #111",
        hero10: "10px 10px 0 #111",
        "sm3-yellow": "3px 3px 0 #FFD400",
        "card5-yellow": "5px 5px 0 #FFD400",
        "card5-magenta": "5px 5px 0 #E6218C",
        "card5-cyan": "5px 5px 0 #21C7E6",
        magenta: "5px 5px 0 #E6218C",
        gold: "5px 5px 0 #FFD400",
      },
      rotate: {
        "2": "2deg",
        "-2": "-2deg",
      },
      keyframes: {
        floatY: {
          "0%,100%": { transform: "translateY(0) rotate(var(--r,0deg))" },
          "50%": { transform: "translateY(-16px) rotate(var(--r,0deg))" },
        },
        spinSlow: { to: { transform: "rotate(360deg)" } },
        ugtMarquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        wob: {
          "0%,100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        pop: {
          from: { opacity: "0", transform: "scale(.9) translateY(20px)" },
          to: { opacity: "1", transform: "none" },
        },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
        dashmove: { to: { backgroundPosition: "40px 0" } },
      },
      animation: {
        floatY: "floatY 5s ease-in-out infinite",
        spinSlow: "spinSlow 18s linear infinite",
        marquee: "ugtMarquee 26s linear infinite",
        "marquee-fast": "ugtMarquee 20s linear infinite",
        "marquee-slow": "ugtMarquee 40s linear infinite",
        wob: "wob 3.2s ease-in-out infinite",
        pop: "pop .5s cubic-bezier(.2,.7,.2,1) both",
        blink: "blink 1.4s step-start infinite",
        dashmove: "dashmove 1s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
