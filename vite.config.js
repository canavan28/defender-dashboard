import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Two pages are built:
      //  - index.html    → the dashboard itself
      //  - redirect.html → MSAL v5 redirect bridge page. Background token
      //    renewal lands here, and src/redirect.js passes Microsoft's answer
      //    back to the dashboard. Without this, renewal fails with "timed_out".
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        redirect: fileURLToPath(new URL('./redirect.html', import.meta.url))
      }
    }
  }
})