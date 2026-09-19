const GITHUB_FIELD_MAP = Object.freeze({
  name: 'name',
  avatar: 'avatar_url',
  bio: 'bio',
  blog: 'blog',
  company: 'company',
  location: 'location',
  publicRepositories: 'public_repos',
  followers: 'followers',
  following: 'following',
  profileUrl: 'html_url'
})

const NUMERIC_FIELDS = new Set(['publicRepositories', 'followers', 'following'])
const URL_FIELDS = new Set(['avatar', 'profileUrl'])

export const SUPPORTED_GITHUB_FIELDS = Object.freeze(Object.keys(GITHUB_FIELD_MAP))

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeString(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return value.trim()
}

function normalizeUrl(value) {
  const normalized = normalizeString(value)
  return normalized && /^https?:\/\//i.test(normalized) ? normalized : undefined
}

function normalizeBlog(value) {
  const normalized = normalizeString(value)
  if (!normalized) return undefined
  return /^https?:\/\//i.test(normalized) ? normalized : 'https://' + normalized
}

function normalizeField(field, value) {
  if (NUMERIC_FIELDS.has(field)) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }

  if (field === 'blog') return normalizeBlog(value)
  if (URL_FIELDS.has(field)) return normalizeUrl(value)
  return normalizeString(value)
}

export function projectGithubProfile(profile) {
  if (!isRecord(profile) || !normalizeString(profile.login)) {
    throw new TypeError('GitHub profile projection requires a profile with a login.')
  }

  const username = normalizeString(profile.login)
  const github = { username }

  for (const [localField, githubField] of Object.entries(GITHUB_FIELD_MAP)) {
    const value = normalizeField(localField, profile[githubField])
    if (value !== undefined) github[localField] = value
  }

  github.profileUrl ||= 'https://github.com/' + encodeURIComponent(username)

  return {
    github,
    profile: {
      name: github.name || username,
      avatar: github.avatar,
      bio: github.bio
    }
  }
}

export function mergeMissingGithubFields(existingGithub, projectedGithub) {
  const current = isRecord(existingGithub) ? { ...existingGithub } : {}
  const additions = {}

  for (const field of SUPPORTED_GITHUB_FIELDS) {
    if (Object.hasOwn(current, field)) continue

    const value = projectedGithub?.[field]
    if (value === undefined || value === null || value === '') continue
    additions[field] = value
  }

  return {
    github: { ...current, ...additions },
    addedFields: Object.keys(additions),
    changed: Object.keys(additions).length > 0
  }
}
