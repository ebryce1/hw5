import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The dashboard calls the FastAPI backend directly at http://localhost:8000 (see src/api.ts).
// The backend allows this page's origin (http://localhost:5173) with CORS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
})
