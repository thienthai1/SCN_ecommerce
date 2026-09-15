<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main class="px-4 py-4">
      <!-- Search Header -->
      <div class="flex flex-nowrap gap-3 mb-4">
        <div class="flex-1 min-w-0 flex flex-nowrap items-center gap-3 px-4 py-2.5 rounded-xl bg-stone-100 text-gray-500">
          <q-icon name="eva-search-outline" size="19px" class="relative bottom-[1px]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search products..."
            aria-label="Search products"
            class="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder-gray-500 outline-none"
            @keydown.enter="onSearch"
          />
        </div>
        <button class="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors">
          <q-icon name="tune" size="20px" class="text-gray-700" />
        </button>
      </div>

      <!-- Results Count -->
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500">
          <span class="font-medium text-gray-800">{{ filteredProducts.length }}</span> {{ filteredProducts.length === 1 ? 'product' : 'products' }} found
        </p>
        <button 
          v-if="searchQuery"
          @click="clearSearch"
          class="text-xs text-emerald-600 font-medium"
        >
          Clear search
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <q-spinner color="green" size="40px" />
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProducts.length === 0" class="text-center py-12">
        <div class="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center mx-auto mb-4">
          <q-icon name="search_off" size="32px" class="text-gray-400" />
        </div>
        <h3 class="search-empty-title text-gray-700">No products found</h3>
        <p class="text-sm text-gray-500 mt-1">
          Try adjusting your search
        </p>
      </div>

      <!-- Products Grid -->
      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="product-card group min-w-0 flex flex-col rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
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

            <!-- Wishlist Button -->
            <button
              @click.stop="toggleWishlist(product)"
              class="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
            >
              <q-icon 
                :name="product.isWishlisted ? 'favorite' : 'favorite_border'" 
                size="16px"
                :class="product.isWishlisted ? 'text-red-500' : 'text-gray-400'"
              />
            </button>
          </div>

          <!-- Content -->
          <div class="flex min-w-0 flex-col gap-1 p-3">
            <span v-if="product.category_name" class="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              {{ product.category_name }}
            </span>
            <h3 class="product-card-title text-gray-800" :title="product.name">
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import Header from '../components/Header.vue'
import BottomNavigation from '../components/BottomNavigation.vue'

const router = useRouter()
const loading = ref(false)
const searchQuery = ref('')
const products = ref([])

// Filtered products based on search query
const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return products.value
  
  return products.value.filter(product => 
    product.name?.toLowerCase().includes(query) ||
    product.description?.toLowerCase().includes(query) ||
    product.category_name?.toLowerCase().includes(query)
  )
})

// Search handler
const onSearch = () => {
  // Search is handled reactively via filteredProducts
}

// Clear search
const clearSearch = () => {
  searchQuery.value = ''
}

// Toggle wishlist
const toggleWishlist = (product) => {
  product.isWishlisted = !product.isWishlisted
}

// Format price helper
const formatPrice = (price) => {
  if (price === undefined || price === null) return '฿0'
  return '฿' + Number(price).toLocaleString('en-US')
}

// Fetch products from API
const fetchProducts = async () => {
  loading.value = true
  try {
    const response = await api.get('/getproducts')
    products.value = (response.data.products || []).map(p => ({
      ...p,
      isWishlisted: false
    }))
  } catch (error) {
    console.error('Error fetching products:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProducts()
})

// Navigate to product detail page
const goToProduct = (productId) => {
  router.push(`/product/${productId}`)
}
</script>

<style scoped>
/* Unlayered scoped rules override Quasar's heading defaults. */
.product-card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: normal;
  min-height: 42px;
  overflow: hidden;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.search-empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
