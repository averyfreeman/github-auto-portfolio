<script setup>
import RepositoryGrid from './components/RepositoryGrid.vue'
import { data as attributes } from './user-attributes.data.js'
</script>

<h1>{{ attributes.site.portfolio.title }}</h1>

<p>{{ attributes.site.portfolio.intro }}</p>

<RepositoryGrid />
