import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadUserAttributes } from '../docs/user-attributes.data.js'
import {
  fetchGithubRepositories,
  sortGithubRepositories
} from '../docs/api/github.js'
import { repositoryPreviewSlug } from '../docs/api/repository-previews.js'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const previewDirectory = fileURLToPath(new URL('../docs/public/repository-previews/', import.meta.url))
const force = process.argv.includes('--force')
const limitArgument = process.argv.find((argument) => argument.startsWith('--limit='))
const limit = limitArgument ? Number.parseInt(limitArgument.slice('--limit='.length), 10) : null

function getRepositoryUrl(repository) {
  const [owner, name] = String(repository.full_name || '').split('/')
  if (!owner || !name) return null
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}#readme-ov-file`
}

function runPlaywrightScreenshot(url, outputPath, waitForReadme = true) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const argumentsList = [
    '--yes',
    'playwright',
    'screenshot',
    '--browser',
    'chromium',
    '--viewport-size',
    '1440,900',
    '--wait-for-timeout',
    '1200',
    '--timeout',
    '30000',
    url,
    outputPath
  ]

  if (waitForReadme) {
    argumentsList.splice(7, 0, '--wait-for-selector', 'article.markdown-body')
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      cwd: projectRoot,
      stdio: ['ignore', 'ignore', 'pipe']
    })
    let errorOutput = ''

    child.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(errorOutput.trim() || `Playwright exited with code ${code}.`))
    })
  })
}

async function captureRepositoryPreview(url, outputPath) {
  try {
    await runPlaywrightScreenshot(url, outputPath)
    return 'readme'
  } catch (error) {
    if (!error.message.includes('waiting for locator')) throw error
    await runPlaywrightScreenshot(url, outputPath, false)
    return 'page'
  }
}

const attributes = await loadUserAttributes()
const username = attributes.github?.username
const pinnedRepositories = attributes.github?.pinnedRepositories || []

if (!username) {
  throw new Error('A GitHub username is required before capturing repository previews.')
}

const repositories = sortGithubRepositories(
  (await fetchGithubRepositories(username)).filter((repository) => repository?.private !== true),
  pinnedRepositories
)
const selectedRepositories = Number.isInteger(limit) && limit >= 0 ? repositories.slice(0, limit) : repositories

await mkdir(previewDirectory, { recursive: true })

let skipped = 0
let captured = 0
let failed = 0

for (const repository of selectedRepositories) {
  const slug = repositoryPreviewSlug(repository)
  const outputPath = slug ? join(previewDirectory, `${slug}.png`) : null
  const url = getRepositoryUrl(repository)

  if (!outputPath || !url) {
    failed += 1
    console.error(`Skipping ${repository.name || 'unnamed repository'}: missing repository identity.`)
    continue
  }

  if (!force && existsSync(outputPath)) {
    skipped += 1
    continue
  }

  try {
    const captureType = await captureRepositoryPreview(url, outputPath)
    captured += 1
    console.log(`Captured ${repository.full_name} (${captureType})`)
  } catch (error) {
    failed += 1
    console.error(`Failed ${repository.full_name}: ${error.message}`)
  }
}

console.log(`Repository previews: ${captured} captured, ${skipped} reused, ${failed} failed.`)

if (failed > 0) process.exitCode = 1
