const PREVIEW_ROOT = '/repository-previews'

export function repositoryPreviewSlug(repository) {
  const fullName = typeof repository?.full_name === 'string' && repository.full_name.trim()
    ? repository.full_name.trim()
    : null

  if (!fullName) return null

  return fullName.toLowerCase().replace(/[^a-z0-9._-]+/g, '--')
}

export function repositoryPreviewPath(repository) {
  const slug = repositoryPreviewSlug(repository)
  return slug ? `${PREVIEW_ROOT}/${slug}.png` : null
}
