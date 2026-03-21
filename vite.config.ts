import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/EasyStudio/',
  plugins: [react()],
  build: { outDir: 'dist' },
})
