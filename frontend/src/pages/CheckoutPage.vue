<template>
  <div class="min-h-screen bg-stone-50 pb-24">
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div class="flex items-center px-4 h-14 gap-3">
        <button @click="$router.push('/cart')" class="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <q-icon name="arrow_back" size="20px" class="text-gray-700" />
        </button>
        <span class="text-lg font-semibold text-gray-800">Checkout</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 py-4 space-y-4">

      <!-- Order Items Summary -->
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <span class="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <q-icon name="shopping_bag" size="18px" class="text-emerald-600" />
          Order Items ({{ checkoutItems.length }})
        </span>
        
        <div class="space-y-3">
          <div
            v-for="item in checkoutItems"
            :key="item.id"
            class="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0"
          >
            <!-- Product Image -->
            <div class="w-16 h-16 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="w-full h-full object-cover" />
              <q-icon v-else name="image" size="24px" class="text-gray-300" />
            </div>

            <!-- Product Details -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 line-clamp-2">{{ item.name }}</p>
              <div class="flex items-center justify-between mt-1">
                <span class="text-xs text-gray-500">Qty: {{ item.quantity }}</span>
                <span class="text-emerald-600 font-semibold text-sm">{{ formatPrice(item.price * item.quantity) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Shipping Address -->
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <span class="text-base font-semibold text-gray-800 flex items-center gap-2">
            <q-icon name="location_on" size="18px" class="text-emerald-600" />
            Shipping Address
          </span>
          <button 
            v-if="addresses.length > 0"
            @click="showAddressDialog = true"
            class="text-sm text-emerald-600 font-medium hover:text-emerald-700"
          >
            Change
          </button>
        </div>
        
        <!-- Loading State -->
        <div v-if="loadingAddresses" class="flex items-center justify-center py-8">
          <q-spinner color="primary" size="24px" />
          <span class="ml-2 text-gray-500">Loading addresses...</span>
        </div>

        <!-- Selected Address Display -->
        <div v-else-if="selectedAddress" class="p-3 bg-stone-50 rounded-xl border border-gray-200">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <q-icon name="home" size="16px" class="text-emerald-600" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-medium text-gray-800 !mb-0">{{ selectedAddress.name }}</p>
                <span v-if="selectedAddress.is_default" class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Default</span>
              </div>
              <p class="text-sm text-gray-600 mt-1">{{ selectedAddress.phone }}</p>
              <p class="text-sm text-gray-500 mt-1">{{ selectedAddress.address }}</p>
            </div>
          </div>
        </div>

        <!-- No Address State -->
        <div v-else class="text-center py-6">
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <q-icon name="add_location" size="28px" class="text-gray-400" />
          </div>
          <p class="text-gray-500 mb-3">No shipping address found</p>
          <button 
            @click="openAddAddressDialog"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Add Address
          </button>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <span class="text-base font-semibold text-gray-800 mb-4">Order Summary</span>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Subtotal ({{ totalItems }} items)</span>
            <span class="text-gray-800">{{ formatPrice(subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Shipping ({{ shippingType }})</span>
            <span class="text-gray-800">{{ formatPrice(shippingPrice) }}</span>
          </div>
          <div class="border-t border-gray-100 pt-2 mt-2 flex justify-between font-semibold">
            <span class="text-gray-800">Total</span>
            <span class="text-emerald-600 text-lg">{{ formatPrice(subtotal + shippingPrice) }}</span>
          </div>
        </div>
      </div>

      <!-- Place Order Button -->
      <button
        @click="placeOrder"
        :disabled="!isFormValid || checkoutItems.length === 0 || isLoading"
        class="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <q-spinner v-if="isLoading" color="white" size="20px" />
        <span>{{ isLoading ? "Processing..." : "Place Order & Pay with PromptPay" }}</span>
      </button>
    </main>

    <!-- Success Dialog -->
    <q-dialog v-model="showSuccessDialog" persistent>
      <q-card class="w-full max-w-sm rounded-2xl">
        <q-card-section class="text-center py-8">
          <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <q-icon name="check" size="32px" class="text-emerald-600" />
          </div>
          <h3 class="text-xl font-bold text-gray-800">Order Placed!</h3>
          <p class="text-gray-500 mt-2">Your order has been placed successfully.</p>
          <p class="text-xs text-gray-400 mt-1">Order ID: {{ orderToken }}</p>
        </q-card-section>
        <q-card-actions class="px-6 pb-6">
          <button
            @click="goToOrders"
            class="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
          >
            View Orders
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Address Selection Dialog -->
    <q-dialog v-model="showAddressDialog">
      <q-card class="w-full max-w-md rounded-2xl">
        <q-card-section class="pb-2">
          <div class="flex items-center justify-between">
            <span class="text-lg font-semibold text-gray-800">Select Address</span>
            <button @click="showAddressDialog = false" class="p-1 hover:bg-gray-100 rounded-full">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </q-card-section>
        
        <q-card-section class="pt-0 max-h-80 overflow-y-auto">
          <div class="space-y-3">
            <div
              v-for="addr in addresses"
              :key="addr.id"
              @click="selectAddress(addr)"
              :class="[
                'p-3 rounded-xl border-2 cursor-pointer transition-all',
                selectedAddress?.id === addr.id 
                  ? 'border-emerald-500 bg-emerald-50' 
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <div class="flex items-start gap-3">
                <div :class="[
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  selectedAddress?.id === addr.id ? 'border-emerald-500' : 'border-gray-300'
                ]">
                  <div v-if="selectedAddress?.id === addr.id" class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-gray-800">{{ addr.name }}</p>
                    <span v-if="addr.is_default" class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Default</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{{ addr.phone }}</p>
                  <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ addr.address }}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button 
                    v-if="!addr.is_default"
                    @click.stop="setAsDefault(addr.id)"
                    class="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Set as default"
                  >
                    <q-icon name="star_outline" size="18px" />
                  </button>
                  <button 
                    @click.stop="deleteAddress(addr.id)"
                    class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete address"
                  >
                    <q-icon name="delete_outline" size="18px" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        
        <q-card-actions class="px-4 pb-4">
          <button 
            @click="openAddAddressDialog"
            class="w-full h-11 border-2 border-dashed border-gray-300 hover:border-emerald-500 text-gray-600 hover:text-emerald-600 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <q-icon name="add" size="20px" />
            Add New Address
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add/Edit Address Dialog -->
    <q-dialog v-model="showAddAddressDialog" persistent>
      <q-card class="w-full max-w-md rounded-2xl">
        <q-card-section class="pb-2">
          <div class="flex items-center justify-between">
            <span class="text-lg font-semibold text-gray-800">Add New Address</span>
            <button @click="showAddAddressDialog = false" class="p-1 hover:bg-gray-100 rounded-full">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </q-card-section>
        
        <q-card-section class="pt-2 space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Full Name *</label>
            <input
              v-model="newAddress.name"
              type="text"
              placeholder="Enter recipient name"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Phone Number *</label>
            <input
              v-model="newAddress.phone"
              type="tel"
              placeholder="Enter phone number"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Full Address *</label>
            <textarea
              v-model="newAddress.address"
              rows="3"
              placeholder="Enter full delivery address"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
            ></textarea>
          </div>
          
          <label class="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="newAddress.is_default"
              class="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span class="text-sm text-gray-700">Set as default address</span>
          </label>
        </q-card-section>
        
        <q-card-actions class="px-4 pb-4 gap-2">
          <button 
            @click="showAddAddressDialog = false"
            class="flex-1 h-11 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="saveNewAddress"
            :disabled="!isNewAddressValid || savingAddress"
            class="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <q-spinner v-if="savingAddress" color="white" size="18px" />
            {{ savingAddress ? 'Saving...' : 'Save Address' }}
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const checkoutItems = ref([])
const isLoading = ref(false)
const showSuccessDialog = ref(false)
const orderToken = ref('')
const shippingType = ref('standard')
const shippingPrice = ref(0)

// User info from localStorage
const currentUser = ref(null)

// Address management
const addresses = ref([])
const selectedAddress = ref(null)
const loadingAddresses = ref(false)
const showAddressDialog = ref(false)
const showAddAddressDialog = ref(false)
const savingAddress = ref(false)
const newAddress = ref({
  name: '',
  phone: '',
  address: '',
  is_default: false
})

const shippingInfo = ref({
  customerName: '',
  customerPhone: '',
  address: ''
})

// Computed: Check if new address form is valid
const isNewAddressValid = computed(() => {
  return newAddress.value.name.trim() !== '' &&
         newAddress.value.phone.trim() !== '' &&
         newAddress.value.address.trim() !== ''
})

// Fetch user addresses from backend
async function fetchAddresses() {
  loadingAddresses.value = true
  try {
    const response = await api.get('/user/addresses')
    addresses.value = response.data.addresses || []
    
    // Auto-select default address or first address
    const defaultAddr = addresses.value.find(a => a.is_default)
    if (defaultAddr) {
      selectAddress(defaultAddr)
    } else if (addresses.value.length > 0) {
      selectAddress(addresses.value[0])
    }
  } catch (error) {
    console.error('Error fetching addresses:', error)
    // If 401, user will be redirected to login
    if (error.response?.status !== 401) {
      console.log("no address found")
    }
  } finally {
    loadingAddresses.value = false
  }
}

// Select an address
function selectAddress(addr) {
  selectedAddress.value = addr
  shippingInfo.value.customerName = addr.name
  shippingInfo.value.customerPhone = addr.phone
  shippingInfo.value.address = addr.address
  showAddressDialog.value = false
}

// Open add address dialog
function openAddAddressDialog() {
  // Pre-fill with user profile data if available
  newAddress.value = {
    name: currentUser.value?.name || '',
    phone: currentUser.value?.phone || '',
    address: '',
    is_default: addresses.value.length === 0
  }
  showAddressDialog.value = false
  showAddAddressDialog.value = true
}

// Save new address
async function saveNewAddress() {
  if (!isNewAddressValid.value) return
  
  savingAddress.value = true
  try {
    const response = await api.post('/user/addresses', {
      name: newAddress.value.name,
      phone: newAddress.value.phone,
      address: newAddress.value.address,
      is_default: newAddress.value.is_default
    })
    
    // Add to list and select it
    const savedAddress = response.data
    addresses.value.unshift(savedAddress)
    
    // If set as default, update others
    if (savedAddress.is_default) {
      addresses.value.forEach(a => {
        if (a.id !== savedAddress.id) a.is_default = false
      })
    }
    
    selectAddress(savedAddress)
    showAddAddressDialog.value = false
    
    $q.notify({
      type: 'positive',
      message: 'Address saved successfully'
    })
  } catch (error) {
    console.error('Error saving address:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to save address'
    })
  } finally {
    savingAddress.value = false
  }
}

// Set address as default
async function setAsDefault(addressId) {
  try {
    await api.put(`/user/addresses/${addressId}/default`)
    
    // Update local state
    addresses.value.forEach(a => {
      a.is_default = a.id === addressId
    })
    
    $q.notify({
      type: 'positive',
      message: 'Default address updated'
    })
  } catch (error) {
    console.error('Error setting default address:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to update default address'
    })
  }
}

// Delete an address
async function deleteAddress(addressId) {
  $q.dialog({
    title: 'Delete Address',
    message: 'Are you sure you want to delete this address?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/user/addresses/${addressId}`)
      
      // Remove from local list
      addresses.value = addresses.value.filter(a => a.id !== addressId)
      
      // If deleted address was selected, select another one
      if (selectedAddress.value?.id === addressId) {
        const defaultAddr = addresses.value.find(a => a.is_default)
        if (defaultAddr) {
          selectAddress(defaultAddr)
        } else if (addresses.value.length > 0) {
          selectAddress(addresses.value[0])
        } else {
          selectedAddress.value = null
          shippingInfo.value = { customerName: '', customerPhone: '', address: '' }
        }
      }
      
      $q.notify({
        type: 'positive',
        message: 'Address deleted'
      })
    } catch (error) {
      console.error('Error deleting address:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to delete address'
      })
    }
  })
}

// Load checkout items from session storage and user info
onMounted(async () => {
  // Load user profile
  const userProfile = localStorage.getItem('user_profile')
  if (userProfile) {
    try {
      currentUser.value = JSON.parse(userProfile)
    } catch (e) {
      console.error('Failed to parse user profile:', e)
    }
  }

  // Check if user is logged in
  const token = localStorage.getItem('user_token')
  if (!token) {
    $q.notify({
      type: 'warning',
      message: 'Please sign in to continue checkout'
    })
    sessionStorage.setItem('redirectAfterLogin', '/checkout')
    router.push('/signin')
    return
  }

  const items = sessionStorage.getItem('checkoutItems')
  if (items) {
    const data = JSON.parse(items)
    checkoutItems.value = data.items || []
    shippingType.value = data.shippingType || 'standard'
    shippingPrice.value = data.shippingPrice || 0
  } else {
    router.push('/cart')
    return
  }

  // Fetch user addresses
  await fetchAddresses()
})

// Format price helper
const formatPrice = (price) => {
  if (price === undefined || price === null) return '฿0'
  return '฿' + Number(price).toLocaleString('en-US')
}

// Computed values
const totalItems = computed(() => {
  return checkoutItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

const subtotal = computed(() => {
  return checkoutItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const isFormValid = computed(() => {
  return selectedAddress.value !== null
})

// Generate order token
const generateOrderToken = () => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

// Place order
async function placeOrder() {
  if (!isFormValid.value) {
    $q.notify({
      type: 'warning',
      message: 'Please select a shipping address'
    })
    return
  }

  isLoading.value = true
  orderToken.value = generateOrderToken()

  try {
    // Step 1: Create the order
    const orderData = {
      order_token: orderToken.value,
      customer_name: shippingInfo.value.customerName,
      customer_phone: shippingInfo.value.customerPhone,
      status: 'pending',
      total_price: subtotal.value + shippingPrice.value,
      shipped_address: shippingInfo.value.address,
      shipping_type: shippingType.value,
      shipping_price: shippingPrice.value,
      user_id: currentUser.value?.id || currentUser.value?.uid || '',
      user_email: currentUser.value?.email || ''
    }

    const orderResponse = await api.post('/addorders', orderData)
    const orderId = orderResponse.data.order?.id || orderResponse.data.id || orderResponse.data.order_id

    if (!orderId) {
      throw new Error('Failed to get order ID from response')
    }

    // Step 2: Create order items for each product
    const orderItemPromises = checkoutItems.value.map(item => {
      const orderItemData = {
        order_id: orderId,
        product_id: item.id,
        price: Number(item.price),
        quantity: Number(item.quantity),
        options: item.options || null
      }
      return api.post('/addorderitems', orderItemData)
    })
    
    await Promise.all(orderItemPromises)

    // Step 3: Save order_token to localStorage
    const savedOrderTokens = localStorage.getItem('orderTokens')
    const orderTokensArray = savedOrderTokens ? JSON.parse(savedOrderTokens) : []
    
    const finalOrderToken = orderResponse.data.order?.order_token || orderToken.value
    orderToken.value = finalOrderToken
    
    orderTokensArray.unshift({
      order_token: finalOrderToken,
      created_at: new Date().toISOString()
    })
    localStorage.setItem('orderTokens', JSON.stringify(orderTokensArray))

    // Step 4: Clear cart items that were checked out
    const cart = sessionStorage.getItem('cart')
    if (cart) {
      const cartItems = JSON.parse(cart)
      const checkoutItemIds = checkoutItems.value.map(item => item.id)
      const remainingItems = cartItems.filter(item => !checkoutItemIds.includes(item.id))
      sessionStorage.setItem('cart', JSON.stringify(remainingItems))
      window.dispatchEvent(new Event('cart-updated'))
    }

    sessionStorage.removeItem("checkoutItems")

    // Stripe Checkout owns the QR/payment UI. Only the signed webhook can mark
    // this order as paid; a redirect back to the app is not trusted.
    try {
      const { data } = await api.post("/payments/stripe/checkout-session", { orderId })
      window.location.assign(data.checkoutUrl)
      return
    } catch (stripeError) {
      console.error("Unable to open Stripe Checkout:", stripeError)
      $q.notify({
        type: "warning",
        message: "Order saved, but Stripe Checkout could not be opened.",
        caption: "You can retry or use bank transfer from Orders."
      })
      showSuccessDialog.value = true
    }

  } catch (error) {
    console.error('Error placing order:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to place order. Please try again.'
    })
  } finally {
    isLoading.value = false
  }
}

// Navigation
function goToOrders() {
  showSuccessDialog.value = false
  router.push('/orders')
}
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
