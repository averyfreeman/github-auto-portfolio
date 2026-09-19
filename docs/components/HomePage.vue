<script setup>
import { data as attributes } from '../user-attributes.data.js'

const github = attributes.github || {}
const profile = attributes.profile || {}
const site = attributes.site || {}
const hero = site.hero || {}
const displayName = profile.name || github.name || github.username
const githubUrl = github.profileUrl || `https://github.com/${github.username}`
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
    <section class="hero-card grid gap-10 overflow-hidden rounded-3xl bg-base-200/70 p-6 shadow-xl sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
      <div class="max-w-3xl">
        <p class="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">{{ hero.eyebrow }}</p>
        <h1 class="text-4xl font-black tracking-tight text-base-content sm:text-6xl">
          {{ hero.greeting }} <span class="text-primary">{{ displayName }}</span>
        </h1>
        <p class="mt-5 text-xl font-semibold text-base-content/85 sm:text-2xl">{{ hero.role || profile.role }}</p>
        <p class="mt-4 max-w-2xl text-lg leading-8 text-base-content/70">{{ hero.tagline || profile.tagline }}</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a class="btn hero-cta" href="/portfolio">Explore the portfolio</a>
          <a class="btn btn-outline hero-cta-secondary" :href="githubUrl" target="_blank" rel="noopener noreferrer">View GitHub</a>
        </div>
        <p v-if="github.bio" class="mt-6 max-w-2xl text-sm leading-6 text-base-content/60">{{ github.bio }}</p>
      </div>

      <div class="flex justify-start lg:justify-end">
        <img
          v-if="profile.avatar || github.avatar"
          class="h-36 w-36 rounded-3xl object-cover shadow-2xl ring-4 ring-primary/20 sm:h-48 sm:w-48"
          :src="profile.avatar || github.avatar"
          :alt="`${displayName} profile portrait`"
        />
        <div v-else class="flex h-36 w-36 items-center justify-center rounded-3xl bg-primary text-6xl text-primary-content shadow-2xl sm:h-48 sm:w-48" aria-hidden="true">
          ✦
        </div>
      </div>
    </section>

    <section class="mt-12" aria-labelledby="feature-heading">
      <div class="mb-6 flex items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-primary">A little about the work</p>
          <h2 id="feature-heading" class="mt-2 text-2xl font-bold tracking-tight text-base-content sm:text-3xl">Built with intention</h2>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <article v-for="feature in site.features" :key="feature.title" class="card border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <div class="card-body">
            <div class="text-3xl" aria-hidden="true">{{ feature.icon }}</div>
            <h3 class="card-title mt-2 text-lg">{{ feature.title }}</h3>
            <p class="text-base-content/70">{{ feature.details }}</p>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
