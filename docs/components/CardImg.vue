<script setup>
import { computed, ref } from 'vue'
import { data as attributes } from '../user-attributes.data.js'

const props = defineProps({
  repository: {
    type: Object,
    required: true
  },
  src: {
    type: String,
    default: null
  }
})

const failed = ref(false)
const messages = attributes.site?.messages || {}
const repositoryName = computed(() => props.repository.name || props.repository.full_name || 'Repository')
const altText = computed(() => `${repositoryName.value} README preview`)

function handleError() {
  failed.value = true
}
</script>

<template>
  <figure class="repository-card-image h-48 overflow-hidden bg-base-200">
    <img
      v-if="src && !failed"
      class="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
      :src="src"
      :alt="altText"
      loading="lazy"
      @error="handleError"
    />
    <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-base-200 via-base-300 to-base-200 px-6 text-center text-sm font-medium text-base-content/60">
      {{ messages.readmePreviewUnavailable || 'README preview unavailable.' }}
    </div>
  </figure>
</template>
