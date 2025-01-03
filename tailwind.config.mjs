// tailwind.config.mjs

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    // 필요한 다른 경로가 있다면 추가
  ],
  theme: {
    extend: {
      colors: {
        'custom-bg': '#010409',
        'custom-text': '#ffffff',
        'button-bg': '#212830',
        'button-border': '#3d444d',
        'input-bg': '#3d444d',
        'input-border': '#3d444d',
        'error-color': '#f7768e',
      },
    },
  },
  plugins: [],
}
