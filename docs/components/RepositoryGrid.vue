<script setup>
import { computed, onMounted, ref } from 'vue'
import { data as attributes } from '../user-attributes.data.js'
import { fetchGithubRepositories, sortGithubRepositories } from '../api/github.js'
import { repositoryPreviewPath } from '../api/repository-previews.js'
import CardImg from './CardImg.vue'

const messages = attributes.site?.messages || {}
const username = attributes.github?.username
const pinnedRepositories = attributes.github?.pinnedRepositories || []
const repositories = ref([])
const status = ref('loading')
const error = ref(null)

const publicRepositories = computed(() => sortGithubRepositories(
  repositories.value.filter((repository) => repository?.private !== true),
  pinnedRepositories
))

function isPinned(repository) {
  const candidates = [repository?.full_name, repository?.name]
    .filter((value) => typeof value === 'string')
    .map((value) => value.toLowerCase())

  return candidates.some((candidate) => pinnedRepositories.some((pinned) => (
    typeof pinned === 'string' && pinned.toLowerCase() === candidate
  )))
}

function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function errorMessage(value) {
  if (value?.code === 'RATE_LIMIT') return messages.rateLimit
  if (value?.code === 'NOT_FOUND') return messages.notFound
  if (value?.code === 'TIMEOUT') return messages.timeout
  if (value?.code === 'NETWORK_ERROR') return messages.network
  return messages.error
}

async function loadRepositories() {
  if (!username) {
    error.value = { code: 'INVALID_USERNAME' }
    status.value = 'error'
    return
  }

  status.value = 'loading'
  error.value = null

  try {
    repositories.value = await fetchGithubRepositories(username)
    status.value = publicRepositories.value.length ? 'success' : 'empty'
  } catch (value) {
    error.value = value
    status.value = 'error'
  }
}

onMounted(loadRepositories)
</script>

<template>
  <div class="not-prose" aria-live="polite" :aria-busy="status === 'loading'">
    <div v-if="status === 'loading'" class="grid gap-5 md:grid-cols-2" role="status">
      <div v-for="index in 6" :key="index" class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body gap-4">
          <div class="skeleton h-6 w-3/5"></div>
          <div class="skeleton h-4 w-full"></div>
          <div class="skeleton h-4 w-4/5"></div>
          <div class="mt-2 flex gap-2">
            <div class="skeleton h-7 w-24"></div>
            <div class="skeleton h-7 w-20"></div>
          </div>
        </div>
      </div>
      <span class="sr-only">{{ messages.loading }}</span>
    </div>

    <div v-else-if="status === 'empty'" class="alert flex-col items-start gap-3 border border-base-300 bg-base-200/60 text-base-content sm:flex-row sm:items-center sm:justify-between" role="status">
      <span>{{ messages.empty }}</span>
      <button class="btn btn-sm" type="button" @click="loadRepositories">{{ messages.retry }}</button>
    </div>

    <div v-else-if="status === 'error'" class="alert alert-error flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <span>{{ errorMessage(error) }}</span>
      <button class="btn btn-sm" type="button" @click="loadRepositories">{{ messages.retry }}</button>
    </div>

    <div v-else class="grid gap-5 md:grid-cols-2">
      <article v-for="repository in publicRepositories" :key="repository.id || repository.full_name" class="group card border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <CardImg :repository="repository" :src="repositoryPreviewPath(repository)" />
        <div class="card-body">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <h2 class="card-title min-w-0 break-words text-xl">
              <a
                v-if="safeExternalUrl(repository.html_url)"
                class="link link-primary"
                :href="safeExternalUrl(repository.html_url)"
                target="_blank"
                rel="noopener noreferrer"
              >{{ repository.name || repository.full_name || 'Untitled repository' }}</a>
              <span v-else>{{ repository.name || repository.full_name || 'Untitled repository' }}</span>
            </h2>
            <div class="flex flex-wrap justify-end gap-2">
              <span v-if="isPinned(repository)" class="badge badge-primary">{{ messages.pinned || 'Pinned' }}</span>
              <span class="badge badge-outline">{{ repository.language || messages.noLanguage }}</span>
            </div>
          </div>
          <p class="min-h-12 text-base-content/70">{{ repository.description || messages.noDescription }}</p>
          <div class="mt-auto flex flex-wrap items-center gap-3 pt-4 text-sm">
            <a
              v-if="safeExternalUrl(repository.html_url)"
              class="link link-primary"
              :href="safeExternalUrl(repository.html_url)"
              target="_blank"
              rel="noopener noreferrer"
            >{{ messages.source }}</a>
            <a
              v-if="safeExternalUrl(repository.homepage)"
              class="link link-secondary"
              :href="safeExternalUrl(repository.homepage)"
              target="_blank"
              rel="noopener noreferrer"
            >{{ messages.demo }}</a>
            <span v-if="typeof repository.stargazers_count === 'number'">★ {{ repository.stargazers_count }}</span>
            <span v-if="typeof repository.forks_count === 'number'">⑂ {{ repository.forks_count }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
