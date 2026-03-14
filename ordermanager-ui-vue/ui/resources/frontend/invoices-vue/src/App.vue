<template>
  <div class="container">
    <header>
      <h1>Order Manager (Vue)</h1>
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/create-person_page">Persons</RouterLink>
        <RouterLink to="/create-invoice-page">Invoices</RouterLink>
        <RouterLink to="/user-login-page">Login</RouterLink>
        <RouterLink to="/user-registration-page">Register</RouterLink>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>
