<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="px-4 py-4">
      <!-- Header -->
      <div class="mb-4">
        <h1 class="text-xl font-bold text-gray-800">My Wishlist</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ wishlistItems.length }} items saved
        </p>
      </div>

      <!-- Empty State -->
      <div v-if="wishlistItems.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center mb-4">
          <q-icon name="favorite_border" size="32px" class="text-gray-400" />
        </div>
        <h3 class="text-base font-medium text-gray-700">No saved items</h3>
        <p class="text-sm text-gray-500 mt-1 max-w-[240px]">
          Tap the heart icon on products to save them here
        </p>
        <button
          @click="$router.push('/')"
          class="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
        >
          Browse Products
        </button>
      </div>

      <!-- Wishlist Grid -->
      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="product in wishlistItems"
          :key="product.id"
          class="group flex flex-col rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
          @click="goToProduct(product.id)"
        >
          <!-- Image Container -->
          <div class="relative aspect-square overflow-hidden bg-stone-100">
            <img
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <q-icon name="image" size="48px" class="text-gray-300" />
            </div>
            
            <!-- Badges -->
            <div class="absolute top-2 left-2 flex flex-col gap-1">
              <span v-if="product.isNew" class="px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 text-white rounded-md">
                NEW
              </span>
              <span v-if="product.originalPrice && product.originalPrice > product.price" class="px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-md">
                -{{ Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) }}%
              </span>
            </div>

            <!-- Remove from Wishlist Button -->
            <button
              @click.stop="removeFromWishlist(product)"
              class="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
            >
              <q-icon name="favorite" size="16px" class="text-red-500" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex flex-col gap-1 p-3">
            <span v-if="product.category_name" class="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              {{ product.category_name }}
            </span>
            <h3 class="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">
              {{ product.name }}
            </h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-sm font-semibold text-emerald-600">
                {{ formatPrice(product.price) }}
              </span>
              <span v-if="product.originalPrice && product.originalPrice > product.price" class="text-xs text-gray-400 line-through">
                {{ formatPrice(product.originalPrice) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <BottomNavigation />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from '../components/Header.vue'
import BottomNavigation from '../components/BottomNavigation.vue'

const router = useRouter()
const wishlistItems = ref([])

// Get wishlist from local storage
const getWishlist = () => {
  const wishlist = localStorage.getItem('wishlist')
  return wishlist ? JSON.parse(wishlist) : []
}

// Save wishlist to local storage
const saveWishlist = () => {
  localStorage.setItem('wishlist', JSON.stringify(wishlistItems.value))
}

// Remove from wishlist
const removeFromWishlist = (product) => {
  wishlistItems.value = wishlistItems.value.filter(item => item.id !== product.id)
  saveWishlist()
}

// Format price helper
const formatPrice = (price) => {
  if (price === undefined || price === null) return '฿0'
  return '฿' + Number(price).toLocaleString()
}

// Navigate to product detail page
const goToProduct = (productId) => {
  router.push(`/product/${productId}`)
}

onMounted(() => {
  wishlistItems.value = getWishlist()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
