import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'
import { fetchGithubProfile } from '../docs/api/github.js'
import {
  mergeMissingGithubFields,
  projectGithubProfile
} from '../docs/api/profile-projection.js'

const attributesPath = fileURLToPath(new URL('../docs/user-attributes.yaml', import.meta.url))

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function syncGithubProfileAttributes(document, profile) {
  if (!isRecord(document) || !isRecord(document.github)) {
    throw new Error('docs/user-attributes.yaml must define a github object before syncing.')
  }

  const projection = projectGithubProfile(profile)
  const merged = mergeMissingGithubFields(document.github, projection.github)

  return {
    document: { ...document, github: merged.github },
    addedFields: merged.addedFields,
    changed: merged.changed
  }
}

export async function syncProfile({
  filePath = attributesPath,
  fetchProfile = fetchGithubProfile
} = {}) {
  const document = parse(await readFile(filePath, 'utf8'))
  if (!isRecord(document?.github) || typeof document.github.username !== 'string' || !document.github.username.trim()) {
    throw new Error('docs/user-attributes.yaml must define github.username before syncing.')
  }

  const profile = await fetchProfile(document.github.username.trim())
  const result = syncGithubProfileAttributes(document, profile)

  if (result.changed) {
    await writeFile(filePath, stringify(result.document), 'utf8')
    console.log('Added missing GitHub profile fields to docs/user-attributes.yaml.')
  } else {
    console.log('No missing GitHub profile fields to add.')
  }

  return result
}

async function main() {
  try {
    await syncProfile()
  } catch (error) {
    const code = error?.code ? ' [' + error.code + ']' : ''
    console.error('Profile sync failed' + code + ': ' + error.message)
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
