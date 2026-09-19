import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitepress'
import { loadUserAttributes } from '../user-attributes.data.js'

const attributes = await loadUserAttributes()
const { site } = attributes

export default defineConfig({
  lang: 'en-US',
  title: site.title,
  description: site.description,
  appearance: false,
  vite: {
    plugins: [tailwindcss()]
  },
  themeConfig: {
    siteTitle: site.navbarTitle,
    nav: site.nav,
    socialLinks: site.socialLinks,
    sidebar: [
      {
        text: 'Explore',
        collapsible: true,
        items: [
          { text: 'Portfolio', link: '/portfolio' },
          { text: 'Skills', link: '/skills' }
        ]
      },
      {
        text: 'About',
        collapsible: true,
        items: [{ text: 'About me', link: '/about' }]
      }
    ],
    footer: {
      message: site.footer
    }
  }
})
