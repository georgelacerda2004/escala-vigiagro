import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [path.join(dir, 'index.html'), path.join(dir, 'src/**/*.{js,jsx}')],
  theme: {
    extend: {
      colors: {
        // Verde institucional (Ministerio da Agricultura e Pecuaria / Vigiagro)
        brand: {
          50: '#e9f7ee',
          100: '#cdEBD8',
          500: '#2e9e4f',
          600: '#1f7a3d',
          700: '#155f2e',
          800: '#0f4622',
        },
        gov: {
          yellow: '#f2c200',
        },
      },
    },
  },
  plugins: [],
};
