import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import PersonsView from './views/PersonsView.vue'
import InvoicesView from './views/InvoicesView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/create-person_page', component: PersonsView },
  { path: '/person-management-page', component: PersonsView },
  { path: '/create-invoice-page', component: InvoicesView },
  { path: '/invoice-management_page', component: InvoicesView },
  { path: '/invoice-list_page', component: InvoicesView },
  { path: '/user-login-page', component: LoginView },
  { path: '/user-registration-page', component: RegisterView }
]

export default createRouter({
  history: createWebHistory('/frontend-vue/'),
  routes
})
