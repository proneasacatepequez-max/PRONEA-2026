import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        pronea: { DEFAULT:'#0B4F8A', secondary:'#0E6FBF', light:'#E9F1F9', hover:'#1A6DB3', dark:'#083A6A' },
        estado: { activo:'#2EAD65', alerta:'#F4C430', inactivo:'#D64545' },
      },
      fontFamily: { sans: ['Nunito','ui-sans-serif','system-ui','sans-serif'] },
    },
  },
  plugins: [],
}
export default config
