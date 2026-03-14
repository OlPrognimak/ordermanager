<template>
  <section>
    <h2>Person management</h2>
    <button @click="fetchPersons">Load persons</button>
    <p v-if="error" class="error">{{ error }}</p>
    <ul>
      <li v-for="person in persons" :key="person.id">
        {{ person.name }} {{ person.secondName }} ({{ person.email }})
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { loadPersons, resolveBackendUrl } from '../services'

const persons = ref([])
const error = ref('')

async function fetchPersons() {
  error.value = ''
  try {
    const baseUrl = await resolveBackendUrl()
    persons.value = await loadPersons(baseUrl)
  } catch {
    error.value = 'Unable to load persons from backend service.'
  }
}
</script>
