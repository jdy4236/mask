// tailwind.config.mjs

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media', // 또는 'class' 사용 가능
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7aa2f7', // 차가운 파란색
        secondary: '#9ece6a', // 민트색
        accent: '#bb9af7', // 부드러운 보라색
        'input-background': '#313244', // 입력 필드 배경
        'button-background': '#7aa2f7', // 버튼 배경
        'button-hover': '#6c8bd5', // 버튼 호버
        'error-color': '#f7768e', // 에러 메시지 색상
        'background-gradient': 'linear-gradient(135deg, #1e1e2e, #25254e)', // 그라데이션 배경
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(135deg, #1e1e2e, #25254e)',
      },
      textColor: {
        primary: '#c0caf5',
      },
      boxShadow: {
        neon: '0 4px 20px rgba(122, 162, 247, 0.5)', // 네온 효과
      },
    },
  },
  plugins: [],
}
