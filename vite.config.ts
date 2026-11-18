import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages alt dizinde yayınlandığı için görselleri göreli yollarla üret.
  base: './',
  build: {
    // Alt klasör açmadan tüm dosyaları dist köküne koy; GitHub'a dosya yüklemek kolaylaşır.
    assetsDir: '',
  },
})
