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
        // next/font/google 가 layout.tsx 에서 <html> 에 심어주는 CSS 변수를 참조한다.
        // 제목: Gowun Batang(고운바탕, 한국어 전용 세리프) · 본문/UI: IBM Plex Sans KR
        serif: ["var(--font-serif)", "Apple SD Gothic Neo", "Malgun Gothic", "serif"],
        sans: ["var(--font-sans)", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,37,48,0.04), 0 1px 1px rgba(28,37,48,0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
