import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F6F8F7",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#1C2530",
          muted: "#5C6B72",
          faint: "#96A3A8",
        },
        line: "#DEE5E3",
        accent: {
          DEFAULT: "#0E7C86",
          dark: "#0A5F67",
          soft: "#E4F1F1",
        },
        ok: { DEFAULT: "#2F9E58", soft: "#E7F5EC" },
        caution: { DEFAULT: "#AD8412", soft: "#FBF1DA" },
        warn: { DEFAULT: "#C06A1E", soft: "#FBEEDF" },
        crit: { DEFAULT: "#BC4A3C", soft: "#FBEAE7" },
      },
      fontFamily: {
        serif: [
          "Georgia",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "Noto Serif KR",
          "serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "Noto Sans KR",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,37,48,0.04), 0 1px 1px rgba(28,37,48,0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
