import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { fetchGithubPinnedRepositoryNames, fetchGithubProfile } from './api/github.js'
import { projectGithubProfile } from './api/profile-projection.js'

export const USER_ATTRIBUTES_FILE = fileURLToPath(new URL('./user-attributes.yaml', import.meta.url))

export const DEFAULT_ATTRIBUTES = {
  github: {},
  profile: {
    role: 'AI Solutions Architect',
    tagline: 'Creating decidedly user-centric development and infrastructure management problem-solving solutions.'
  },
  site: {
    nav: [
      { text: 'Portfolio', link: '/portfolio' },
      { text: 'About', link: '/about' },
      { text: 'Skills', link: '/skills' }
    ],
    hero: {
      eyebrow: 'Can\'t stop, won\'t stop',
      greeting: 'Hi, I\'m',
      role: 'I\'m a Solutions Architect',
      tagline: 'I build everything from focused tools to complex, automated pipelines for solving real-world problems.'
    },
    features: [
      {
        icon: '⚡',
        title: 'Unix Philosophy',
        details: 'Focused tools with emphasis on performance, immutability, reproducibility, and modularity.'
      },
      {
        icon: '🧩',
        title: 'Process Aware',
        details: 'High-level user-centric understanding of specifications required for end-to-end solutions.'
      },
      {
        icon: '🌱',
        title: 'Driven but Pragmatic',
        details: 'Beyond attentive to new technologies and adopting new practices when applicable, with the depth to apply skepticism, remain grounded in basic computing theory and systems design principles, and always adhere to a north star of the organizational mission statement.'
      }
    ],
    portfolio: {
      title: 'Examples of my work',
      intro: 'These are public GitHub repositories, fetched directly from my profile.'
    },
    messages: {
      loading: 'Loading public repositories…',
      empty: 'No public repositories found yet.',
      error: 'Repositories could not be loaded right now.',
      rateLimit: 'GitHub is rate limiting requests. Please try again shortly.',
      notFound: 'That GitHub profile could not be found.',
      timeout: 'GitHub took too long to respond.',
      network: 'GitHub could not be reached. Check your connection and try again.',
      retry: 'Try again',
      source: 'Source code',
      demo: 'Live site',
      pinned: 'Pinned',
      readmePreviewUnavailable: 'README preview unavailable.',
      noDescription: 'No description provided.',
      noLanguage: 'Other'
    },
    footer: 'Built with VitePress, Vue, Tailwind CSS, and daisyUI.'
  },
  theme: {
    default: 'mocha'
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function deepMerge(base, override) {
  if (Array.isArray(override)) return override.map((value) => deepMerge(undefined, value))
  if (!isRecord(override)) return override === undefined ? base : override

  const result = isRecord(base) ? { ...base } : {}
  for (const [key, value] of Object.entries(override)) {
    result[key] = isRecord(value) ? deepMerge(result[key], value) : deepMerge(undefined, value)
  }
  return result
}

function getSourcePath(watchedFiles) {
  if (Array.isArray(watchedFiles)) {
    const watchedYaml = watchedFiles.find((file) => file.endsWith('user-attributes.yaml'))
    if (watchedYaml) return watchedYaml
  }
  return USER_ATTRIBUTES_FILE
}

function finalizeAttributes(merged, local) {
  const github = merged.github || {}
  const localGithub = local.github || {}
  const localProfile = local.profile || {}
  const localSite = local.site || {}
  const username = github.username
  const displayName = localProfile.name ?? localGithub.name ?? merged.profile?.name ?? github.name ?? username
  const profileUrl = Object.hasOwn(localGithub, 'profileUrl')
    ? localGithub.profileUrl
    : github.profileUrl || 'https://github.com/' + username
  const defaultSocialLinks = typeof profileUrl === 'string' && profileUrl
    ? [{ icon: 'github', link: profileUrl }]
    : []
  const profile = {
    ...merged.profile,
    name: displayName,
    avatar: localProfile.avatar ?? localGithub.avatar ?? github.avatar ?? merged.profile?.avatar,
    bio: localProfile.bio ?? localGithub.bio ?? github.bio ?? merged.profile?.bio
  }

  const site = {
    ...merged.site,
    title: localSite.title ?? displayName + ' — Portfolio',
    description: localSite.description ?? profile.bio ?? displayName + "'s developer portfolio.",
    navbarTitle: localSite.navbarTitle ?? displayName,
    socialLinks: localSite.socialLinks ?? defaultSocialLinks
  }

  return { ...merged, github, profile, site }
}

export async function readLocalAttributes(filePath = USER_ATTRIBUTES_FILE) {
  const contents = await readFile(filePath, 'utf8')
  const attributes = parse(contents)
  if (!isRecord(attributes)) {
    throw new Error('docs/user-attributes.yaml must contain a YAML object.')
  }
  return attributes
}

export async function loadUserAttributes(watchedFiles, options = {}) {
  const local = await readLocalAttributes(getSourcePath(watchedFiles))
  const username = local.github?.username
  if (typeof username !== 'string' || !username.trim()) {
    throw new Error('docs/user-attributes.yaml must define github.username.')
  }

  let generated = { github: { username: username.trim() } }
  const fetchProfile = options.fetchProfile ?? fetchGithubProfile
  try {
    generated = projectGithubProfile(await fetchProfile(username.trim(), options))
  } catch {
    // The site remains usable offline or when GitHub rate-limits the build.
  }

  const fetchPinned = options.fetchPinned ?? (options.fetchProfile ? null : fetchGithubPinnedRepositoryNames)
  if (fetchPinned) {
    try {
      generated = deepMerge(generated, {
        github: { pinnedRepositories: await fetchPinned(username.trim(), options) }
      })
    } catch {
      // Pinned ordering is an enhancement; repository loading still works without it.
    }
  }

  const merged = deepMerge(deepMerge(DEFAULT_ATTRIBUTES, generated), local)
  return finalizeAttributes(merged, local)
}

export default {
  watch: ['./user-attributes.yaml'],
  async load(watchedFiles) {
    return loadUserAttributes(watchedFiles)
  }
}
