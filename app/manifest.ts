import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dokan Dashboard',
    short_name: 'Dokan',
    description: 'Manage your Dokan store from anywhere.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f766e',
    icons: [
      { src: '/icons/dokan-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/dokan-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
