import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    // 1テストごとに、spyOn などの差し替えを元に戻す
    restoreMocks: true,
  },
})
