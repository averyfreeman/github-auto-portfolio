const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_WEB_URL = 'https://github.com'
const DEFAULT_TIMEOUT_MS = 10_000

export class GithubApiError extends Error {
  constructor(code, message, options = {}) {
    super(message, { cause: options.cause })
    this.name = 'GithubApiError'
    this.code = code
    this.status = options.status
    this.details = options.details
  }
}

function getUsername(username) {
  if (typeof username !== 'string' || !username.trim() || /[\s/]/.test(username)) {
    throw new GithubApiError('INVALID_USERNAME', 'A valid GitHub username is required.')
  }

  return username.trim()
}

function getErrorMessage(payload, fallback) {
  return payload && typeof payload.message === 'string' ? payload.message : fallback
}

function getNextLink(response) {
  const linkHeader = response?.headers?.get?.('link')
  if (!linkHeader) return false

  return linkHeader.split(',').some((part) => /rel="next"/.test(part))
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeHtmlEntity(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function requestGithub(path, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new GithubApiError('API_UNAVAILABLE', 'The Fetch API is not available in this environment.')
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  let timeoutId
  let removeAbortListener

  if (options.signal) {
    if (options.signal.aborted) controller.abort()
    else {
      const abort = () => controller.abort()
      options.signal.addEventListener('abort', abort, { once: true })
      removeAbortListener = () => options.signal.removeEventListener('abort', abort)
    }
  }

  let response
  try {
    const fetchPromise = fetchImpl(`${GITHUB_API_URL}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers
      },
      signal: controller.signal
    })

    if (timeoutMs > 0) {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort()
          reject(new GithubApiError('TIMEOUT', 'GitHub did not respond before the request timed out.'))
        }, timeoutMs)
      })
      response = await Promise.race([fetchPromise, timeoutPromise])
    } else {
      response = await fetchPromise
    }
  } catch (error) {
    if (error instanceof GithubApiError) throw error

    if (controller.signal.aborted) {
      if (options.signal?.aborted) {
        throw new GithubApiError('ABORTED', 'The GitHub request was cancelled.', { cause: error })
      }

      throw new GithubApiError('TIMEOUT', 'GitHub did not respond before the request timed out.', {
        cause: error
      })
    }

    throw new GithubApiError('NETWORK_ERROR', 'GitHub could not be reached.', { cause: error })
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    removeAbortListener?.()
  }

  const ok = response?.ok ?? (response?.status >= 200 && response?.status < 300)
  let payload = null
  try {
    payload = await response.json()
  } catch (error) {
    if (ok) {
      throw new GithubApiError('MALFORMED_RESPONSE', 'GitHub returned invalid JSON.', { cause: error })
    }
  }

  if (!ok) {
    const status = response?.status
    const rateLimited = status === 403 || status === 429
    const code = status === 404 ? 'NOT_FOUND' : rateLimited ? 'RATE_LIMIT' : 'HTTP_ERROR'
    const message = rateLimited
      ? 'GitHub is rate limiting public API requests.'
      : getErrorMessage(payload, `GitHub returned HTTP ${status ?? 'an unknown error'}.`)

    throw new GithubApiError(code, message, { status, details: payload })
  }

  return { data: payload, response }
}

async function requestGithubPage(path, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new GithubApiError('API_UNAVAILABLE', 'The Fetch API is not available in this environment.')
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  let timeoutId
  let removeAbortListener

  if (options.signal) {
    if (options.signal.aborted) controller.abort()
    else {
      const abort = () => controller.abort()
      options.signal.addEventListener('abort', abort, { once: true })
      removeAbortListener = () => options.signal.removeEventListener('abort', abort)
    }
  }

  let response
  try {
    const fetchPromise = fetchImpl(`${GITHUB_WEB_URL}${path}`, {
      headers: {
        Accept: 'text/html',
        ...options.headers
      },
      signal: controller.signal
    })

    if (timeoutMs > 0) {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort()
          reject(new GithubApiError('TIMEOUT', 'GitHub did not respond before the request timed out.'))
        }, timeoutMs)
      })
      response = await Promise.race([fetchPromise, timeoutPromise])
    } else {
      response = await fetchPromise
    }
  } catch (error) {
    if (error instanceof GithubApiError) throw error

    if (controller.signal.aborted) {
      if (options.signal?.aborted) {
        throw new GithubApiError('ABORTED', 'The GitHub request was cancelled.', { cause: error })
      }

      throw new GithubApiError('TIMEOUT', 'GitHub did not respond before the request timed out.', {
        cause: error
      })
    }

    throw new GithubApiError('NETWORK_ERROR', 'GitHub could not be reached.', { cause: error })
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    removeAbortListener?.()
  }

  const ok = response?.ok ?? (response?.status >= 200 && response?.status < 300)
  if (!ok) {
    throw new GithubApiError('PINNED_UNAVAILABLE', 'GitHub pinned repositories could not be read.', {
      status: response?.status
    })
  }

  try {
    return await response.text()
  } catch (error) {
    throw new GithubApiError('MALFORMED_RESPONSE', 'GitHub returned invalid profile HTML.', { cause: error })
  }
}

export async function fetchGithubProfile(username, options = {}) {
  const login = getUsername(username)
  const { data } = await requestGithub(`/users/${encodeURIComponent(login)}`, options)

  if (!data || Array.isArray(data) || typeof data !== 'object' || typeof data.login !== 'string') {
    throw new GithubApiError('MALFORMED_RESPONSE', 'GitHub returned an invalid profile response.')
  }

  return data
}

export async function fetchGithubRepositories(username, options = {}) {
  const login = getUsername(username)
  const perPage = 100
  const repositories = []
  let page = 1

  while (page <= 100) {
    const { data, response } = await requestGithub(
      `/users/${encodeURIComponent(login)}/repos?type=owner&sort=updated&per_page=${perPage}&page=${page}`,
      options
    )

    if (!Array.isArray(data) || data.some((repository) => !repository || typeof repository !== 'object')) {
      throw new GithubApiError('MALFORMED_RESPONSE', 'GitHub returned an invalid repository response.')
    }

    repositories.push(...data)
    if (data.length < perPage && !getNextLink(response)) break
    page += 1
  }

  return repositories
}

export async function fetchGithubPinnedRepositoryNames(username, options = {}) {
  const login = getUsername(username)
  const html = await requestGithubPage(`/${encodeURIComponent(login)}`, options)
  const pinnedSection = html.match(/js-pinned-items-reorder-list[\s\S]*?<\/ol>/i)?.[0] ?? html
  const pattern = new RegExp(
    `href=["']/` +
      escapeRegExp(login) +
      `/([^"'/?]+)["'][\\s\\S]*?<span[^>]+class=["'][^"']*\\brepo\\b[^"']*["'][^>]*>([^<]+)<\\/span>`,
    'gi'
  )
  const names = []
  const seen = new Set()
  let match

  while ((match = pattern.exec(pinnedSection))) {
    const name = decodeHtmlEntity(match[1])
    const key = name.toLowerCase()
    if (!seen.has(key)) {
      names.push(name)
      seen.add(key)
    }
  }

  return names
}

export function sortGithubRepositories(repositories, pinnedRepositories = []) {
  const pinnedRanks = new Map(
    pinnedRepositories
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value, index) => [value.trim().toLowerCase(), index])
  )

  const rank = (repository) => {
    const fullName = typeof repository?.full_name === 'string' ? repository.full_name.toLowerCase() : ''
    const name = typeof repository?.name === 'string' ? repository.name.toLowerCase() : ''
    return pinnedRanks.get(fullName) ?? pinnedRanks.get(name) ?? Number.POSITIVE_INFINITY
  }

  return [...repositories].sort((left, right) => rank(left) - rank(right))
}

export { GITHUB_API_URL, GITHUB_WEB_URL }
