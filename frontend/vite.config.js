import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // The production site is hosted at https://necalumni.nec.edu.in/alumnimain/
  base: '/alumnimain/',
  plugins: [react()],
})
