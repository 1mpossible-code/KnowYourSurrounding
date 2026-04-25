import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Amparo',
    short_name: 'Amparo',
    description: 'Cultural orientation guidance tailored to your route, language comfort, and priorities.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fffaf2',
    theme_color: '#f4c95d',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
