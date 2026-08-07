import type { Config } from "tailwindcss";

/**
 * 업무 콘솔 팔레트 — 보건기관 담당자가 매일 들여다보는 화면 기준으로 잡았다.
 *
 * 마케팅 대시보드가 아니라 행정 업무 시스템에 가깝게 간다.
 *  - 패널을 그림자로 띄우지 않고 선으로 나눈다(shadow 제거, line 대비 상향)
 *  - 액센트는 티일 대신 문서 괘선에 쓰는 짙은 남색. 링크·선택 상태에만 쓴다
 *  - 상태색은 파스텔 배경 대신 글자색으로 쓴다(soft 는 표 행 강조용으로만 남김)
 *  - 모서리는 거의 각지게(3px). 둥근 카드가 업무 화면을 장식처럼 보이게 만든다
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F1F2EF",        // 종이서류 느낌의 따뜻한 회색
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#1B1F23",
          muted: "#4E565D",
          faint: "#868E96",
        },
        line: "#CDD1CC",         // 그림자를 대체하므로 기존(#DEE5E3)보다 진하게
        "line-soft": "#E3E6E2",  // 표 행 구분선
        accent: {
          DEFAULT: "#2C4A7C",
          dark: "#1E3557",
          soft: "#E7EBF2",
        },
        ok: { DEFAULT: "#2A6B45", soft: "#EAF1EC" },
        caution: { DEFAULT: "#7A6A18", soft: "#F4F1E3" },
        warn: { DEFAULT: "#9A6410", soft: "#F5EDE1" },
        crit: { DEFAULT: "#A03328", soft: "#F5E7E5" },
      },
      fontFamily: {
        // 한 벌로 통일한다. 제목과 본문에 서로 다른 서체를 쓰면 화면이 '디자인된' 인상을 준다.
        // 위계는 크기와 굵기로만 만든다.
        sans: ["var(--font-sans)", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
        // 수치 전용. 표에서 자릿수가 맞아야 읽힌다.
        mono: ["var(--font-mono)", "SFMono-Regular", "Menlo", "monospace"],
        // 구 `font-serif` 사용처가 남아 있어도 본문 서체로 떨어지게 둔다(별도 서체 로드 없음).
        serif: ["var(--font-sans)", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "3px",
        lg: "4px",
        xl: "4px",
      },
      fontSize: {
        // 표 헤더·보조 설명용. 밀도를 올리려면 12px 아래 단계가 필요하다.
        "2xs": ["11px", "1.4"],
      },
      boxShadow: {
        // 그림자를 없애는 대신 이름은 남긴다(기존 `shadow-card` 사용처가 그대로 동작).
        card: "none",
      },
    },
  },
  plugins: [],
};

export default config;
