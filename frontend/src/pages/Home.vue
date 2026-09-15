<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <!-- Header -->
    <Header />

    <!-- Main Content -->
    <main>
      <!-- Search Bar -->
      <div class="px-4 pt-4 pb-2">
        <router-link 
          to="/browse" 
          class="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[var(--theme-search-bg)] text-gray-500 transition-colors hover:bg-stone-200"
        >
          <q-icon name="eva-search-outline
" size="19px" class="relative bottom-[1px]" />
          <span class="text-sm">Search products...</span>
        </router-link>
      </div>

      <section class=" p-4">
        <q-carousel
          v-model="currentSlide"
          animated
          navigation
          infinite
          autoplay
          class="rounded-2xl overflow-hidden shadow-lg"
          height="170px"
        >
          <q-carousel-slide
            v-for="(banner, index) in banners"
            :key="index"
            :name="index"
            :class="banner.bgClass"
            :style="banner.image_url ? { backgroundImage: `url(${banner.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
            class="h-full relative"
          >
            <!-- Dark overlay -->
            <div class="absolute inset-0 bg-black/40"></div>
            <!-- Content -->
            <div class="absolute inset-0 flex flex-col justify-center px-5">
              <span class="text-xl font-bold text-white">
                {{ banner.title }}
              </span>
              <p v-if="banner.description" class="text-xs text-white/80 mt-1 max-w-[180px]">
                {{ banner.description }}
              </p>
              <router-link 
                v-if="banner.button_url"
                :to="banner.button_url" 
                class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit hover:bg-white/30 transition-colors"
              >
                {{ banner.button_name || 'Shop Now' }}
                <q-icon name="chevron_right" size="12px" />
              </router-link>
            </div>
          </q-carousel-slide>
        </q-carousel>
      </section>

      <!-- Categories -->
      <section class="py-4 pb-3">
        <div class="flex items-center justify-between px-4 mb-3">
          <span class="text-base font-normal text-gray-800">Categories</span>
          <!-- <router-link 
            to="/categories" 
            class="text-xs text-emerald-600 font-medium flex items-center gap-0.5"
          >
            View All
            <q-icon name="chevron_right" size="12px" />
          </router-link> -->
        </div>
        <div class="flex gap-4 px-4 overflow-x-auto scrollbar-hide pb-2 pt-[5px] pl-8">
          <!-- All Categories -->
          <div
            class="flex flex-col items-center cursor-pointer"
            @click="selectCategory(null)"
          >
            <div
              :class="selectedCategory === null 
                ? 'ring-2 ring-emerald-600' 
                : ''"
              class="w-10 h-10 rounded-full overflow-hidden bg-stone-200 shadow-sm flex items-center justify-center transition-all duration-300 hover:shadow-md"
            >
              <q-icon name="apps" size="20px" class="text-gray-600" />
            </div>
            <span class="text-xs font-medium text-gray-700 mt-2">All</span>
          </div>
          <!-- Category Items -->
          <div
            v-for="category in categories"
            :key="category.id"
            class="flex flex-col items-center cursor-pointer"
            @click="selectCategory(category.name)"
          >
            <div
              :class="selectedCategory === category.name 
                ? 'ring-2 ring-emerald-600' 
                : ''"
              class="w-10 h-10 rounded-full overflow-hidden bg-stone-200 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <img 
                v-if="category.imageUrl" 
                :src="category.imageUrl" 
                :alt="category.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <q-icon :name="category.icon || 'category'" size="28px" class="text-gray-500" />
              </div>
            </div>
            <span class="text-xs font-medium text-gray-700 mt-2">{{ category.name }}</span>
            <span v-if="category.count" class="text-[10px] text-gray-400">{{ category.count }} items</span>
          </div>
        </div>
      </section>

      <!-- Featured Products -->
      <section class="py-4 pt-0">
        <div class="flex items-center justify-between px-4 mb-3">
          <span class="text-base font-normal text-gray-800">
            {{ selectedCategory ? selectedCategory : 'Products' }}
          </span>
          <div class="flex items-center gap-2">
            <span v-if="selectedCategory" class="text-xs text-gray-500">
              {{ filteredProducts.length }} items
            </span>
            <button 
              v-if="selectedCategory"
              @click="selectCategory(null)"
              class="text-xs text-emerald-600 font-medium flex items-center gap-0.5"
            >
              Clear
              <q-icon name="close" size="12px" />
            </button>
            <!-- <router-link 
              v-else
              to="/browse" 
              class="text-xs text-emerald-600 font-medium flex items-center gap-0.5"
            >
              See All
              <q-icon name="chevron_right" size="12px" />
            </router-link> -->
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-8">
          <q-spinner color="green" size="40px" />
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredProducts.length === 0" class="text-center py-12 pt-3 px-4">
          <div class="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center mx-auto mb-4">
            <q-icon name="inventory_2" size="32px" class="text-gray-400" />
          </div>
          <h3 class="text-base font-medium text-gray-700">No products found</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ selectedCategory ? `No products in "${selectedCategory}"` : 'No products available' }}
          </p>
          <button 
            v-if="selectedCategory"
            @click="selectCategory(null)"
            class="mt-4 text-sm text-emerald-600 font-medium"
          >
            Browse all products
          </button>
        </div>

        <!-- Products Grid -->
        <div v-else class="grid grid-cols-2 gap-3 px-4">
          <div
            v-for="product in filteredProducts"
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
                <span v-if="!hasProductVariants(product) && product.originalPrice && product.originalPrice > product.price" class="px-2 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-md">
                  -{{ Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) }}%
                </span>
              </div>

              <!-- Wishlist Button -->
              <!-- <button
                @click.stop="toggleWishlist(product)"
                class="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
              >
                <q-icon 
                  :name="product.isWishlisted ? 'favorite' : 'favorite_border'" 
                  size="16px"
                  :class="product.isWishlisted ? 'text-red-500' : 'text-gray-400'"
                />
              </button> -->
            </div>

            <!-- Content -->
            <div class="flex flex-col gap-1 p-3">
              <!-- <span v-if="product.category_name" class="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                {{ product.category_name }}
              </span> -->
              <span class="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">
                {{ product.name }}
              </span>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-sm font-semibold text-emerald-600">
                  {{ getProductDisplayPrice(product) }}
                </span>
                <span v-if="!hasProductVariants(product) && product.originalPrice && product.originalPrice > product.price" class="text-xs text-gray-400 line-through">
                  {{ formatPrice(product.originalPrice) }}
                </span>
              </div>
              <!-- Shipping Info -->
              <div v-if="shippingConfig" class="flex items-center gap-1 mt-1">
                <q-icon name="local_shipping" size="12px" class="text-gray-400" />
                <span class="text-[10px] text-gray-400">
                  {{ shippingConfig.standard?.minDays }}-{{ shippingConfig.standard?.maxDays }} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
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

// Loading state
const loading = ref(false)

// Selected category filter
const selectedCategory = ref(null)

// Categories data
const categories = ref([])

const currentSlide = ref(0)

// Banners data
const banners = ref([])
const currentBannerIndex = ref(0)

// Products data
const products = ref([])

// Shipping config
const shippingConfig = ref(null)

// Check if product has variants with options
const hasProductVariants = (product) => {
  return product?.variants && 
    product.variants.length > 0 && 
    product.variants.some(v => v.options && v.options.length > 0)
}

// Get all variant options for a product
const getVariantOptions = (product) => {
  if (!product?.variants) return []
  const options = []
  for (const variant of product.variants) {
    if (variant.options && variant.options.length > 0) {
      for (const opt of variant.options) {
        options.push(opt)
      }
    }
  }
  return options
}

// Get display price for product (with range for variants)
const getProductDisplayPrice = (product) => {
  if (!product) return formatPrice(0)
  if (hasProductVariants(product)) {
    const options = getVariantOptions(product)
    // Only include active options with stock
    const activeOptions = options.filter(opt => opt.isActive !== false && opt.stock > 0)
    const prices = activeOptions.map(opt => Number(opt.price) || 0).filter(p => p > 0)
    
    if (prices.length === 0) {
      // Fallback to all variant prices
      const allPrices = options.map(opt => Number(opt.price) || 0).filter(p => p > 0)
      if (allPrices.length === 0) return formatPrice(product.price)
      const min = Math.min(...allPrices)
      const max = Math.max(...allPrices)
      return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`
    }
    
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    return minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
  }
  return formatPrice(product.price)
}

// Filtered products based on selected category
const filteredProducts = computed(() => {
  if (!selectedCategory.value) {
    return products.value
  }
  return products.value.filter(product => 
    product.category_name && product.category_name.toLowerCase() === selectedCategory.value.toLowerCase()
  )
})

// Select category for filtering
const selectCategory = (categoryName) => {
  selectedCategory.value = categoryName
}

// Toggle wishlist
const toggleWishlist = (product) => {
  product.isWishlisted = !product.isWishlisted
}

// Format price helper
const formatPrice = (price) => {
  if (price === undefined || price === null) return '฿0'
  return '฿' + Number(price).toLocaleString()
}

// Icon mapping for categories
const getCategoryIcon = (name) => {
  const lowerName = (name || '').toLowerCase()
  const iconMap = {
    'towel': 'dry_cleaning',
    'bedding': 'bed',
    'bed': 'bed',
    'robe': 'checkroom',
    'linen': 'layers',
    'pillow': 'airline_seat_flat',
    'blanket': 'layers',
    'curtain': 'curtains',
    'fashion': 'checkroom',
    'shirt': 'checkroom',
  }
  
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (lowerName.includes(keyword)) {
      return icon
    }
  }
  return 'category'
}

// Fetch banners from API
const fetchBanners = async () => {
  try {
    const response = await api.get('/banners')
    const allBanners = response.data.banners || []
    // Filter only active banners and sort by slideOrder
    banners.value = allBanners
      .filter(b => b.isActive !== false)
      .sort((a, b) => (a.slideOrder || 0) - (b.slideOrder || 0))
  } catch (error) {
    console.error('Error fetching banners:', error)
  }
}

// Fetch categories from API
const fetchCategories = async () => {
  try {
    const response = await api.get('/viewcategories')
    const rawCategories = response.data.categories || []
    categories.value = rawCategories
      .filter(cat => cat.is_active !== false)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: getCategoryIcon(cat.name),
        imageUrl: cat.imageUrl || null,
        count: cat.productCount || null
      }))
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
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

// Fetch shipping config
const fetchShippingConfig = async () => {
  try {
    const response = await api.get('/shippingConfig')
    shippingConfig.value = response.data.config || null
  } catch (error) {
    console.error('Error fetching shipping config:', error)
  }
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
  fetchShippingConfig()
  fetchUserProfile()
  fetchBanners()
})

// Fetch and update user profile in localStorage
async function fetchUserProfile() {
  const token = localStorage.getItem('user_token')
  if (!token) return
  
  try {
    const response = await api.get('/profile')
    if (response.data) {
      localStorage.setItem('user_profile', JSON.stringify(response.data))
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    // If token is invalid, clear auth data
    if (error.response?.status === 401) {
      localStorage.removeItem('user_token')
      localStorage.removeItem('user_profile')
    }
  }
}

// Navigate to product detail page
const goToProduct = (productId) => {
  router.push(`/product/${productId}`)
}
</script>

<style scoped>
/* Hide scrollbar for horizontal scroll */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Line clamp for text truncation */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Smaller carousel navigation dots */
:deep(.q-carousel__navigation .q-btn) {
  width: 8px !important;
  height: 8px !important;
  min-width: 8px !important;
  min-height: 8px !important;
  padding: 0 !important;
  margin: 0 3px !important;
}

:deep(.q-carousel__navigation .q-btn .q-icon) {
  font-size: 8px !important;
}
</style>
