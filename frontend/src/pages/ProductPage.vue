<template>
  <div class="min-h-screen bg-stone-50 pb-24">
    <!-- Header with Back Button -->
    <header class="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div class="flex items-center px-4 h-14 gap-3">
        <button @click="goBack" class="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <q-icon name="arrow_back" size="20px" class="text-gray-700" />
        </button>
        <span class="text-lg font-semibold text-gray-800">Product Details</span>
        <div class="flex-1"></div>
        <button 
          @click="toggleWishlist"
          class="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <q-icon 
            :name="isWishlisted ? 'favorite' : 'favorite_border'" 
            size="20px" 
            :class="isWishlisted ? 'text-red-500' : 'text-gray-700'"
          />
        </button>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <q-spinner color="green" size="50px" />
    </div>

    <!-- Product Not Found -->
    <div v-else-if="!product" class="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div class="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center mb-4">
        <q-icon name="error_outline" size="32px" class="text-gray-400" />
      </div>
      <h3 class="text-base font-medium text-gray-700">Product not found</h3>
      <p class="text-sm text-gray-500 mt-1">This product may have been removed</p>
      <button 
        @click="goBack"
        class="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
      >
        Go Back
      </button>
    </div>

    <!-- Product Content -->
    <main v-else>
      <!-- Product Image -->
      <div class="bg-white">
        <div class="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
          <img 
            v-if="product.imageUrl" 
            :src="product.imageUrl" 
            :alt="product.name"
            class="w-full h-full object-cover"
          />
          <q-icon v-else name="image" size="80px" class="text-gray-300" />
        </div>
      </div>

      <!-- Product Info -->
      <div class="px-4 py-4 bg-white mt-2">
        <div class="flex justify-between w-full">
            <!-- Product Name -->
            <span class="text-xl font-bold mt-1">{{ product.name }}</span>
            
            <!-- Category Badge -->
            <span v-if="product.category_name" class="text-[13px] uppercase tracking-wider text-white  font-medium bg-green-600 px-2 rounded-lg pt-[5px]">
              {{ product.category_name }}
            </span>
        </div>
        <!-- Price -->
        <div class="flex items-center gap-3 mt-2">
          <span class="text-2xl font-bold text-emerald-600">{{ displayPrice }}</span>
          <span v-if="product.originalPrice && product.originalPrice > product.price && !hasVariants" class="text-base text-gray-400 line-through">
            {{ formatPrice(product.originalPrice) }}
          </span>
          <span v-if="product.originalPrice && product.originalPrice > product.price && !hasVariants" class="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-md">
            -{{ Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) }}%
          </span>
        </div>
        
        <!-- Stock Info -->
        <div class="flex items-center gap-2 mt-3">
          <q-icon name="inventory_2" size="16px" class="text-gray-400" />
          <span :class="displayStock > 0 ? 'text-emerald-600' : 'text-red-500'" class="text-sm font-medium">
            {{ displayStock > 0 ? `${displayStock} in stock` : 'Out of stock' }}
          </span>
        </div>

        <!-- Description -->
        <div v-if="product.description" class="mt-4 pt-4 border-t border-gray-100">
          <span class="text-lg font-semibold text-gray-700 mb-2">Product details</span>
          <p class="text-gray-600 text-sm leading-relaxed">{{ product.description }}</p>
        </div>
      </div>

      <!-- Variant Selector -->
      <div v-if="hasVariants" class="px-4 py-4 bg-white mt-2">
        <div class="text-sm font-semibold text-gray-700 mb-3">{{ variantTypeName || 'Select Option' }}</div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(option, index) in variantOptions"
            :key="option.sku || index"
            @click="selectVariant(option)"
            :disabled="option.stock <= 0 || !option.isActive"
            :class="[
              'relative px-4 py-3 rounded-xl border-2 transition-all min-w-[80px]',
              selectedVariant?.name === option.name
                ? 'border-emerald-500 bg-emerald-50'
                : option.stock <= 0 || !option.isActive
                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-emerald-300'
            ]"
          >
            <!-- Variant Image (if available) -->
            <div v-if="option.imageUrl" class="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-stone-100">
              <img :src="option.imageUrl" :alt="option.name" class="w-full h-full object-cover" />
            </div>
            <!-- Variant Name -->
            <span class="block text-sm font-medium text-gray-800">{{ option.name }}</span>
            <!-- Variant Price -->
            <span class="block text-xs text-emerald-600 mt-0.5">{{ formatPrice(option.price) }}</span>
            <!-- Stock indicator -->
            <span v-if="option.stock <= 0" class="block text-xs text-red-500 mt-0.5">Out of stock</span>
            <span v-else class="block text-xs text-gray-400 mt-0.5">{{ option.stock }} left</span>
            <!-- Selected checkmark -->
            <div v-if="selectedVariant?.name === option.name" class="absolute top-1 right-1">
              <q-icon name="check_circle" size="16px" class="text-emerald-500" />
            </div>
          </button>
        </div>
        <!-- Variant selection hint -->
        <p v-if="!selectedVariant" class="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <q-icon name="info" size="14px" />
          Please select an option to continue
        </p>
      </div>

      <!-- Quantity Selector -->
      <div class="px-4 py-4 bg-white mt-2">
        <div class="text-sm font-semibold text-gray-700 mb-3">Quantity</div>
        <div class="flex items-center gap-3">
          <button 
            @click="decreaseQuantity"
            :disabled="quantity <= 1"
            class="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <q-icon name="remove" size="18px" class="text-gray-600" />
          </button>
          <span class="text-lg font-semibold w-10 text-center">{{ quantity }}</span>
          <button 
            @click="increaseQuantity"
            :disabled="quantity >= currentMaxStock"
            class="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <q-icon name="add" size="18px" class="text-gray-600" />
          </button>
          <span class="text-xs text-gray-400 ml-2">Max: {{ currentMaxStock }}</span>
        </div>
      </div>

      <!-- Shipping Info -->
      <div v-if="shippingConfig && shippingConfig.config" class="px-4 py-4 bg-white mt-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <q-icon name="local_shipping" size="20px" class="text-emerald-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-800">Free Shipping Available</p>
            <p class="text-xs text-gray-500">
              Standard: {{ shippingConfig.config.standard.minDays }}-{{ shippingConfig.config.standard.maxDays }} days
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Action Bar -->
    <div v-if="product" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
      <div class="flex items-center gap-3">
        <div class="flex-1">
          <p class="text-xs text-gray-500">Total</p>
          <p class="text-lg font-bold text-emerald-600">{{ formatPrice(currentPrice * quantity) }}</p>
        </div>
        <button 
          @click="addToCart"
          :disabled="currentMaxStock <= 0 || (hasVariants && !selectedVariant)"
          :class="[
            'flex-1 h-12 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
            addedToCart 
              ? 'bg-emerald-600 text-white' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
          ]"
        >
          <q-icon :name="addedToCart ? 'check' : 'shopping_bag'" size="20px" />
          {{ addedToCart ? 'Added!' : 'Add to Cart' }}
        </button>
        <!-- Cart Icon with Item Count -->
        <button 
          @click="goToCart"
          class="h-12 w-12 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center relative"
        >
          <q-icon name="shopping_cart" size="24px" class="text-gray-700" />
          <span 
            v-if="cartItemCount > 0"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1"
          >
            {{ cartItemCount > 99 ? '99+' : cartItemCount }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../boot/axios'

const router = useRouter()
const route = useRoute()

const product = ref(null)
const loading = ref(true)
const quantity = ref(1)
const cartCount = ref(0)
const addedToCart = ref(false)
const isWishlisted = ref(false)
const shippingConfig = ref(null)
const selectedVariant = ref(null)

// Check if product has variants with options
const hasVariants = computed(() => {
  return product.value?.variants && 
    product.value.variants.length > 0 && 
    product.value.variants.some(v => v.options && v.options.length > 0)
})

// Get all variant options flattened
const variantOptions = computed(() => {
  if (!product.value?.variants) return []
  const options = []
  for (const variant of product.value.variants) {
    if (variant.options && variant.options.length > 0) {
      for (const opt of variant.options) {
        options.push({
          ...opt,
          variantType: variant.variant // e.g., "Color" (color)
        })
      }
    }
  }
  return options
})

// Get variant group name (e.g., "Color" for color)
const variantTypeName = computed(() => {
  if (!product.value?.variants || product.value.variants.length === 0) return ''
  return product.value.variants[0]?.variant || 'Option'
})

// Get total stock (sum of variant option stocks or product stock)
const displayStock = computed(() => {
  if (!product.value) return 0
  if (hasVariants.value) {
    return variantOptions.value.reduce((sum, opt) => sum + (Number(opt.stock) || 0), 0)
  }
  return product.value.stock || 0
})

// Get current max stock for quantity selector
const currentMaxStock = computed(() => {
  if (hasVariants.value && selectedVariant.value) {
    return selectedVariant.value.stock || 0
  }
  if (hasVariants.value) {
    // No variant selected, show total
    return displayStock.value
  }
  return product.value?.stock || 0
})

// Get current price for calculations
const currentPrice = computed(() => {
  if (hasVariants.value && selectedVariant.value) {
    return selectedVariant.value.price || 0
  }
  return product.value?.price || 0
})

// Get display price (min-max range for variants)
const displayPrice = computed(() => {
  if (!product.value) return formatPrice(0)
  if (hasVariants.value) {
    if (selectedVariant.value) {
      return formatPrice(selectedVariant.value.price)
    }
    // Only include active options with stock in price range
    const activeOptions = variantOptions.value.filter(opt => opt.isActive !== false && opt.stock > 0)
    const prices = activeOptions.map(opt => Number(opt.price) || 0).filter(p => p > 0)
    if (prices.length === 0) {
      // Fallback: use all variant prices if no active options
      const allPrices = variantOptions.value.map(opt => Number(opt.price) || 0).filter(p => p > 0)
      if (allPrices.length === 0) return formatPrice(product.value.price)
      const min = Math.min(...allPrices)
      const max = Math.max(...allPrices)
      return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`
    }
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    if (minPrice === maxPrice) {
      return formatPrice(minPrice)
    }
    return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
  }
  return formatPrice(product.value.price)
})

// Select variant option
const selectVariant = (option) => {
  if (option.stock <= 0 || option.isActive === false) return
  selectedVariant.value = option
  // Reset quantity if it exceeds new option's stock
  if (quantity.value > option.stock) {
    quantity.value = option.stock > 0 ? option.stock : 1
  }
}

// Get cart from session storage
const getCart = () => {
  const cart = sessionStorage.getItem('cart')
  return cart ? JSON.parse(cart) : []
}

// Save cart to session storage
const saveCart = (cart) => {
  sessionStorage.setItem('cart', JSON.stringify(cart))
  window.dispatchEvent(new Event('cart-updated'))
  updateCartCount()
}

// Get total cart item count
const cartItemCount = computed(() => cartCount.value)

const updateCartCount = () => {
  const cart = getCart()
  cartCount.value = cart.reduce((sum, item) => sum + item.quantity, 0)
}

// Navigate to cart page
const goToCart = () => {
  router.push('/cart')
}

// Get wishlist from local storage
const getWishlist = () => {
  const wishlist = localStorage.getItem('wishlist')
  return wishlist ? JSON.parse(wishlist) : []
}

// Save wishlist to local storage
const saveWishlist = (wishlist) => {
  localStorage.setItem('wishlist', JSON.stringify(wishlist))
}

// Format price helper
const formatPrice = (price) => {
  if (price === undefined || price === null) return '฿0'
  return '฿' + Number(price).toLocaleString('en-US')
}

// Navigation
const goBack = () => {
  router.back()
}

// Toggle wishlist
const toggleWishlist = () => {
  const wishlist = getWishlist()
  const index = wishlist.findIndex(item => item.id === product.value.id)
  
  if (index >= 0) {
    wishlist.splice(index, 1)
    isWishlisted.value = false
  } else {
    wishlist.push({
      id: product.value.id,
      name: product.value.name,
      price: product.value.price,
      originalPrice: product.value.originalPrice,
      imageUrl: product.value.imageUrl,
      category_name: product.value.category_name,
      isNew: product.value.isNew
    })
    isWishlisted.value = true
  }
  
  saveWishlist(wishlist)
}

// Check if product is in wishlist
const checkWishlist = () => {
  const wishlist = getWishlist()
  isWishlisted.value = wishlist.some(item => item.id === product.value?.id)
}

const fetchShippingConfig = async () => {
  try {
    const res = await api.get('/shippingConfig')
    shippingConfig.value = res.data
  } catch (err) {
    console.error('Error fetching shipping config:', err)
  } 
}

// Quantity controls
const increaseQuantity = () => {
  if (quantity.value < currentMaxStock.value) {
    quantity.value++
  }
}

const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--
  }
}

// Add to cart
const addToCart = () => {
  // If product has variants, require selection
  if (hasVariants.value && !selectedVariant.value) {
    return
  }

  const cart = getCart()
  
  // Create unique cart item ID (include variant SKU if selected)
  const cartItemId = selectedVariant.value 
    ? `${product.value.id}-${selectedVariant.value.sku || selectedVariant.value.name}`
    : product.value.id
  
  const existingIndex = cart.findIndex(item => item.id === cartItemId)
  
  const itemStock = selectedVariant.value ? selectedVariant.value.stock : product.value.stock
  const itemPrice = selectedVariant.value ? selectedVariant.value.price : product.value.price
  const itemWeight = selectedVariant.value?.weight || product.value.weight || 0
  const variantLabel = selectedVariant.value ? selectedVariant.value.name : ''
  
  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity.value
    if (cart[existingIndex].quantity > itemStock) {
      cart[existingIndex].quantity = itemStock
    }
  } else {
    // Build options object if variant is selected
    const optionsData = selectedVariant.value ? {
      variant: selectedVariant.value.variantType || '',
      name: selectedVariant.value.name || '',
      description: selectedVariant.value.description || '',
      sku: selectedVariant.value.sku || '',
      stock: selectedVariant.value.stock || 0,
      price: selectedVariant.value.price || 0,
      weight: selectedVariant.value.weight || 0,
      imageUrl: selectedVariant.value.imageUrl || '',
      isActive: selectedVariant.value.isActive !== false,
      created_time: selectedVariant.value.created_time || ''
    } : null

    cart.push({
      id: cartItemId,
      productId: product.value.id,
      name: product.value.name,
      price: itemPrice,
      imageUrl: selectedVariant.value?.imageUrl || product.value.imageUrl || '',
      quantity: quantity.value,
      stock: itemStock,
      weight: itemWeight,
      variant: variantLabel,
      sku: selectedVariant.value?.sku || '',
      options: optionsData
    })
  }
  
  saveCart(cart)
  
  addedToCart.value = true
  setTimeout(() => {
    addedToCart.value = false
  }, 2000)
  
  quantity.value = 1
}

// Fetch product details
const fetchProduct = async () => {
  loading.value = true
  try {
    const productId = route.params.id
    const response = await api.get('/getproducts')
    const products = response.data.products || []
    product.value = products.find(p => p.id === productId) || null
    if (product.value) {
      checkWishlist()
    }
  } catch (error) {
    console.error('Error fetching product:', error)
    product.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProduct()
  fetchShippingConfig()
  updateCartCount()
  window.addEventListener('cart-updated', updateCartCount)
})

onUnmounted(() => {
  window.removeEventListener('cart-updated', updateCartCount)
})
</script>
