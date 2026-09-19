import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  mergeMissingGithubFields,
  projectGithubProfile
} from '../docs/api/profile-projection.js'
import { loadUserAttributes } from '../docs/user-attributes.data.js'
import { syncGithubProfileAttributes } from '../scripts/sync-profile.mjs'

const githubProfile = {
  login: 'test-user',
  name: 'Avery Freeman',
  avatar_url: 'https://avatars.example.test/avery.png',
  bio: 'Builds useful systems.',
  blog: 'example.test',
  company: 'Independent',
  location: 'Pacific Northwest',
  public_repos: 53,
  followers: 8,
  following: 12,
  html_url: 'https://github.com/test-user'
}

test('projects supported GitHub fields into canonical portfolio values', () => {
  const projection = projectGithubProfile(githubProfile)

  assert.deepEqual(projection.github, {
    username: 'test-user',
    name: 'Avery Freeman',
    avatar: 'https://avatars.example.test/avery.png',
    bio: 'Builds useful systems.',
    blog: 'https://example.test',
    company: 'Independent',
    location: 'Pacific Northwest',
    publicRepositories: 53,
    followers: 8,
    following: 12,
    profileUrl: 'https://github.com/test-user'
  })
  assert.deepEqual(projection.profile, {
    name: 'Avery Freeman',
    avatar: 'https://avatars.example.test/avery.png',
    bio: 'Builds useful systems.'
  })
})

test('missing-field materialization preserves every existing local value', () => {
  const result = mergeMissingGithubFields(
    {
      username: 'test-user',
      name: 'Local name',
      bio: '',
      company: null,
      customLink: 'https://local.example'
    },
    projectGithubProfile(githubProfile).github
  )

  assert.deepEqual(result.addedFields, [
    'avatar',
    'blog',
    'location',
    'publicRepositories',
    'followers',
    'following',
    'profileUrl'
  ])
  assert.equal(result.github.name, 'Local name')
  assert.equal(result.github.bio, '')
  assert.equal(result.github.company, null)
  assert.equal(result.github.customLink, 'https://local.example')
  assert.equal(result.github.blog, 'https://example.test')
})

test('username-only attributes resolve generated fields without writing YAML', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-profile-'))
  const filePath = join(directory, 'user-attributes.yaml')

  try {
    await writeFile(filePath, 'github:\n  username: test-user\n', 'utf8')
    const attributes = await loadUserAttributes([filePath], {
      fetchProfile: async () => githubProfile,
      fetchPinned: async () => []
    })

    assert.equal(attributes.github.name, 'Avery Freeman')
    assert.equal(attributes.github.blog, 'https://example.test')
    assert.equal(attributes.profile.name, 'Avery Freeman')
    assert.equal(attributes.site.title, 'Avery Freeman — Portfolio')
    assert.equal(await readFile(filePath, 'utf8'), 'github:\n  username: test-user\n')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('username-only attributes fall back to static defaults when GitHub fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-profile-offline-'))
  const filePath = join(directory, 'user-attributes.yaml')

  try {
    await writeFile(filePath, 'github:\n  username: offline-user\n', 'utf8')
    const attributes = await loadUserAttributes([filePath], {
      fetchProfile: async () => {
        throw new Error('offline')
      },
      fetchPinned: async () => []
    })

    assert.equal(attributes.github.username, 'offline-user')
    assert.equal(attributes.profile.name, 'offline-user')
    assert.equal(attributes.profile.role, 'AI Solutions Architect')
    assert.equal(attributes.site.title, 'offline-user — Portfolio')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('an empty local profile URL remains authoritative', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-profile-override-'))
  const filePath = join(directory, 'user-attributes.yaml')

  try {
    await writeFile(filePath, 'github:\n  username: test-user\n  profileUrl: \"\"\n', 'utf8')
    const attributes = await loadUserAttributes([filePath], {
      fetchProfile: async () => githubProfile,
      fetchPinned: async () => []
    })

    assert.equal(attributes.github.profileUrl, '')
    assert.deepEqual(attributes.site.socialLinks, [])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('sync projection writes only missing supported GitHub fields', () => {
  const result = syncGithubProfileAttributes(
    {
      github: {
        username: 'test-user',
        name: 'Authored name',
        bio: ''
      },
      profile: {
        role: 'Solutions Architect'
      }
    },
    githubProfile
  )

  assert.equal(result.changed, true)
  assert.equal(result.document.github.name, 'Authored name')
  assert.equal(result.document.github.bio, '')
  assert.equal(result.document.github.blog, 'https://example.test')
  assert.equal(result.document.github.profileUrl, 'https://github.com/test-user')
  assert.deepEqual(result.document.profile, { role: 'Solutions Architect' })
})

test('invalid GitHub profiles fail at the projection seam', () => {
  assert.throws(() => projectGithubProfile({}), /profile with a login/)
})
