// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// ADMIN_PANEL_FIX: Activamos output: 'server' para habilitar endpoints dinámicos (POST)
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://www.alejandro-m-p.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !/\/cv\/?$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
