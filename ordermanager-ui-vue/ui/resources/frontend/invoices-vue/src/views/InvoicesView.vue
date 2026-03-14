<template>
  <section>
    <h2>Invoice management</h2>
    <button @click="fetchInvoices">Load invoices</button>
    <p v-if="error" class="error">{{ error }}</p>
    <table v-if="invoices.length">
      <thead>
        <tr>
          <th>Number</th>
          <th>Date</th>
          <th>Customer</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in invoices" :key="invoice.id">
          <td>{{ invoice.number }}</td>
          <td>{{ invoice.invoiceDate }}</td>
          <td>{{ invoice.person?.name }} {{ invoice.person?.secondName }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { loadInvoices, resolveBackendUrl } from '../services'

const invoices = ref([])
const error = ref('')

async function fetchInvoices() {
  error.value = ''
  try {
    const baseUrl = await resolveBackendUrl()
    invoices.value = await loadInvoices(baseUrl)
  } catch {
    error.value = 'Unable to load invoices from backend service.'
  }
}
</script>
