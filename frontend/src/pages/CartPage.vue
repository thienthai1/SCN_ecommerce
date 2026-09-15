<template>
  <div class="min-h-screen bg-stone-50 pb-24">
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div class="flex items-center px-4 h-14 gap-3">
        <button @click="$router.push('/')" class="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <q-icon name="arrow_back" size="20px" class="text-gray-700" />
        </button>
        <span class="text-lg font-semibold text-gray-800">Shopping Cart</span>
        <span class="ml-auto text-sm text-gray-500">{{ cartItems.length }} items</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 py-4 space-y-4">
      <!-- Empty Cart State -->
      <div v-if="cartItems.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center mb-4">
          <q-icon name="shopping_bag" size="32px" class="text-gray-400" />
        </div>
        <h3 class="text-base font-medium text-gray-700">Your cart is empty</h3>
        <p class="text-sm text-gray-500 mt-1 max-w-[240px]">
          Start adding items to your cart
        </p>
        <button
          @click="$router.push('/')"
          class="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
        >
          Browse Products
        </button>
      </div>

      <!-- Cart Items -->
      <div v-else class="space-y-3">
        <div
          v-for="item in cartItems"
          :key="item.id"
          class="bg-white rounded-xl p-3 shadow-sm"
        >
          <div class="flex gap-3">
            <!-- Product Image -->
            <div class="w-20 h-20 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <q-icon name="image" size="32px" class="text-gray-300" />
              </div>
            </div>

            <!-- Product Details -->
            <div class="flex-1 min-w-0">
              <span class="font-medium text-gray-800 text-sm line-clamp-1">
                {{ item.name }}
              </span>
              <p v-if="item.variant" class="text-xs text-gray-500 mt-0.5">{{ item.variant }}</p>
              <p class="text-sm font-semibold text-emerald-600 mt-1">
                {{ formatPrice(item.price) }}
              </p>

              <!-- Quantity Controls -->
              <div class="flex items-center justify-between mt-2">
                <div class="flex items-center gap-2">
                  <button
                    @click="decreaseQty(item)"
                    class="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <q-icon name="remove" size="14px" class="text-gray-600" />
                  </button>
                  <span class="text-sm font-medium w-6 text-center">{{ item.quantity }}</span>
                  <button
                    @click="increaseQty(item)"
                    :disabled="item.quantity >= item.stock"
                    class="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <q-icon name="add" size="14px" class="text-gray-600" />
                  </button>
                </div>
                <button
                  @click="removeItem(item)"
                  class="w-7 h-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                >
                  <q-icon name="delete" size="16px" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500 font-bold">Subtotal</span>
              <span class="text-gray-800">{{ formatPrice(subtotal) }}</span>
            </div>
            
            <!-- Shipping Option Dropdown -->
            <div class="space-y-2">
              <label class="text-gray-500">Shipping method</label>
              <select
                v-model="selectedShippingType"
                @change="onShippingTypeChange"
                class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                :disabled="isCalculatingShipping"
              >
                <option
                  v-for="(config, type) in shippingOptions"
                  :key="type"
                  :value="type"
                >
                  {{ formatShippingLabel(type, config) }}
                </option>
              </select>
              <p v-if="shippingDetails" class="text-xs text-gray-400">
                Estimated delivery: {{ shippingDetails.minDays }}-{{ shippingDetails.maxDays }} days
              </p>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-gray-500">Shipping</span>
              <div class="flex items-center gap-2">
                <q-spinner-dots v-if="isCalculatingShipping" color="green" size="16px" />
                <span class="text-gray-800">{{ formatPrice(shippingPrice) }}</span>
              </div>
            </div>
            <div class="border-t border-gray-100 pt-2 flex justify-between font-semibold">
              <span class="text-gray-800">Total</span>
              <span class="text-emerald-600 text-lg">{{ formatPrice(total) }}</span>
            </div>
          </div>
        </div>

        <!-- Checkout Buttons -->
        <div class="space-y-2 pt-2">
          <button
            @click="proceedToCheckout"
            class="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <q-icon name="shopping_bag" size="20px" />
            Proceed to Checkout
          </button>
          <router-link to="/">
            <button class="w-full h-11 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Continue Shopping
            </button>
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'

const router = useRouter()
const cartItems = ref([])
const shippingPrice = ref(0)
const shippingOptions = ref({})
const selectedShippingType = ref('standard')
const shippingDetails = ref(null)
const isCalculatingShipping = ref(false)

// Calculate totals
const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
})

const total = computed(() => subtotal.value + shippingPrice.value)

// Format shipping label for dropdown
const formatShippingLabel = (type, config) => {
  const label = type.charAt(0).toUpperCase() + type.slice(1)
  return `${label} (${config.minDays}-${config.maxDays} days) - ฿${config.pricePerKg}/kg`
}

// Get cart from session storage
const getCart = () => {
  const cart = sessionStorage.getItem('cart')
  return cart ? JSON.parse(cart) : []
}

// Save cart to session storage
const saveCart = () => {
  const cartData = cartItems.value.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    imageUrl: item.imageUrl || '',
    quantity: item.quantity,
    stock: item.stock,
    weight: item.weight || 0,
    variant: item.variant || ''
  }))
  sessionStorage.setItem('cart', JSON.stringify(cartData))
  
  // Dispatch event for header cart count update
  window.dispatchEvent(new Event('cart-updated'))
}

// Load cart on mount
onMounted(async () => {
  cartItems.value = getCart()
  await fetchShippingConfig()
  await calculateShipping()
})

// Fetch shipping config options
const fetchShippingConfig = async () => {
  try {
    const res = await api.get('/shippingConfig')
    shippingOptions.value = res.data.config || {}
    // Default to standard if available
    if (shippingOptions.value.standard) {
      selectedShippingType.value = 'standard'
    } else {
      // Use first available option
      const types = Object.keys(shippingOptions.value)
      if (types.length > 0) {
        selectedShippingType.value = types[0]
      }
    }
  } catch (err) {
    console.error('Failed to fetch shipping config:', err)
    // Fallback config
    shippingOptions.value = {
      standard: { pricePerKg: 1, minDays: 3, maxDays: 4 },
      premium: { pricePerKg: 2, minDays: 1, maxDays: 2 }
    }
  }
}

// Handle shipping type change
const onShippingTypeChange = async () => {
  await calculateShipping()
}

// Calculate shipping
const calculateShipping = async () => {
  if (cartItems.value.length === 0) {
    shippingPrice.value = 0
    shippingDetails.value = null
    return
  }
  
  isCalculatingShipping.value = true
  const totalWeight = cartItems.value.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0)
  
  try {
    const res = await api.post('/calculateShipping', {
      weight: totalWeight || 1, // Minimum 1kg
      type: selectedShippingType.value
    })
    shippingPrice.value = res.data.price || 0
    shippingDetails.value = {
      minDays: res.data.minDays,
      maxDays: res.data.maxDays,
      chargeableWeight: res.data.chargeableWeight
    }
  } catch (err) {
    console.error('Failed to calculate shipping:', err)
    // Fallback calculation
    const config = shippingOptions.value[selectedShippingType.value]
    if (config) {
      const chargeableWeight = Math.max(1, Math.ceil(totalWeight))
      shippingPrice.value = config.pricePerKg * chargeableWeight
      shippingDetails.value = {
        minDays: config.minDays,
        maxDays: config.maxDays,
        chargeableWeight
      }
    } else {
      shippingPrice.value = 50
      shippingDetails.value = null
    }
  } finally {
    isCalculatingShipping.value = false
  }
}

// Format price helper
const formatPrice = (price) => {
  if (price === undefined || price === null) return '฿0'
  return '฿' + Number(price).toLocaleString('en-US')
}

// Quantity controls
function increaseQty(item) {
  if (item.quantity < item.stock) {
    item.quantity++
    saveCart()
    calculateShipping()
  }
}

function decreaseQty(item) {
  if (item.quantity > 1) {
    item.quantity--
    saveCart()
    calculateShipping()
  }
}

// Remove item
function removeItem(item) {
  cartItems.value = cartItems.value.filter(i => i.id !== item.id)
  saveCart()
  calculateShipping()
}

// Proceed to checkout
function proceedToCheckout() {
  const checkoutData = {
    items: cartItems.value,
    shippingType: selectedShippingType.value,
    shippingPrice: shippingPrice.value
  }
  sessionStorage.setItem('checkoutItems', JSON.stringify(checkoutData))
  router.push('/checkout')
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
