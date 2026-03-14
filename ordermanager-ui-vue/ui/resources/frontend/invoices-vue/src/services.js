import axios from 'axios'

const api = axios.create({ timeout: 10000 })

export async function resolveBackendUrl() {
  const response = await api.get('/frontend-vue/backendUrl')
  return response.data.url
}

export async function loadPersons(baseUrl) {
  const response = await api.get(`${baseUrl}person/list`)
  return response.data
}

export async function loadInvoices(baseUrl) {
  const response = await api.get(`${baseUrl}invoice/list`)
  return response.data
}
