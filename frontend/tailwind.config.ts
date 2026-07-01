import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#06090F",
        panel: {
          DEFAULT: "#0C1220",
          2: "#121A2B",
          3: "#1A2436",
        },
        line: {
          DEFAULT: "#1E2A3E",
          2: "#2A3A54",
        },
        txt: {
          DEFAULT: "#DCE6F2",
          dim: "#6B819C",
          faint: "#3A4C66",
        },
        odd: {
          DEFAULT: "#FF3D71",
          soft: "#FF3D7122",
        },
        even: {
          DEFAULT: "#00E6A8",
          soft: "#00E6A822",
        },
        gold: "#FFC24B",
        danger: "#FF4D4D",
        info: "#3DA5FF",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,230,168,0.4), 0 0 24px -4px rgba(0,230,168,0.45)",
        "glow-odd": "0 0 0 1px rgba(255,61,113,0.4), 0 0 24px -4px rgba(255,61,113,0.45)",
        "glow-gold": "0 0 30px -6px rgba(255,194,75,0.55)",
        panel: "0 8px 40px -12px rgba(0,0,0,0.7)",
      },
      keyframes: {
        "pulse-dot": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(0.82)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "ticker": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "grid-drift": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "44px 44px" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 2s infinite",
        ticker: "ticker 40s linear infinite",
        "grid-drift": "grid-drift 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
