import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // localhost на этой машине резолвится в IPv4, а Vite по умолчанию
  // слушает IPv6 — привязываемся явно, иначе браузер получает ECONNREFUSED.
  server: {
    host: '127.0.0.1',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
