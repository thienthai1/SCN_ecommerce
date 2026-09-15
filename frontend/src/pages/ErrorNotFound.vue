<template>
  <div class="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-12 text-center">
    <div class="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center mb-6">
      <q-icon name="search_off" size="40px" class="text-gray-400" />
    </div>
    <h1 class="text-6xl font-bold text-gray-300 mb-4">404</h1>
    <h2 class="text-xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
    <p class="text-gray-500 mb-8 max-w-sm">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <router-link to="/">
      <button class="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors">
        Go Back Home
      </button>
    </router-link>
  </div>
</template>

<script setup>
//
</script>
