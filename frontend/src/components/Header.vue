<template>
  <!-- Header - Mockup Style -->
  <header class="sticky top-0 z-50 w-full bg-[var(--theme-white-color)] backdrop-blur-md border-b border-gray-200">
    <div class="flex items-center justify-between px-4 h-14">
      <!-- Logo and Business Name -->
      <router-link to="/" class="flex items-center gap-2">
        <img 
          src="../assets/logo.jpg" 
          alt="Sachanon Textile" 
          class="w-9 h-9 rounded-lg object-contain bg-white shadow-sm"
        />
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-gray-800 leading-tight">
            Sachanon
          </span>
          <span class="text-[10px] text-gray-500 leading-tight">
            TEXTILE
          </span>
        </div>
      </router-link>

      <!-- Action Icons -->
      <div class="flex items-center gap-1">
        <!-- Notification Bell -->
        <button 
          @click="handleNotificationClick"
          class="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors"
          :disabled="subscribing"
        >
          <q-icon 
            :name="isSubscribed ? 'notifications' : 'notifications_none'" 
            size="20px" 
            class="text-gray-700" 
          />
          <span v-if="notificationCount > 0" class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1 rounded-full bg-red-500 text-white">
            {{ notificationCount > 9 ? '9+' : notificationCount }}
          </span>
        </button>

        <!-- Cart -->
        <router-link 
          to="/cart" 
          class="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <q-icon name="eva-shopping-cart-outline" size="20px" class="text-gray-700" />
          <span v-if="cartItemCount > 0" class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1 rounded-full bg-emerald-600 text-white">
            {{ cartItemCount > 9 ? '9+' : cartItemCount }}
          </span>
        </router-link>

        <!-- Profile -->
        <div>
          <button
            v-if="userProfile"
            @click="handleAccountClick"
            class="p-2.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <q-icon name="eva-person-outline" size="20px" class="text-gray-700" />
          </button>

          <router-link
            v-else
            to="/signin"
            class="p-2.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <span class="px-2 py-1 rounded-[3px] bg-[#47c72a] text-white flex items-center justify-center font-semibold text-xs ml-3">
              ล็อคอิน
            </span>
          </router-link>
        </div>
      </div>
    </div>
  </header>

  <!-- Success Modal -->
  <q-dialog v-model="showSuccessModal">
    <q-card style="min-width: 300px; border-radius: 13px;">
      <q-card-section class="text-center py-6">
        <q-icon name="check_circle" size="64px" class="text-green-500 mb-4" />
        <h3 class="text-lg font-bold text-gray-800 mb-2">Success!</h3>
        <p class="text-gray-600">You successfully subscribed to our application</p>
      </q-card-section>
      <q-card-actions align="center" class="pb-4">
        <q-btn 
          label="OK" 
          color="primary" 
          rounded 
          unelevated 
          class="px-8"
          @click="showSuccessModal = false" 
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Profile Dialog -->
  <q-dialog v-model="showProfileDialog">
    <q-card class="rounded-2xl" style="min-width: 300px; max-width: 360px;">
      <q-card-section class="py-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[#FF1925] text-white flex items-center justify-center font-semibold text-lg">
            {{ userProfile && (userProfile.name || userProfile.username) ? (userProfile.name ? userProfile.name.charAt(0) : userProfile.username.charAt(0)) : '?' }}
          </div>
          <div>
            <div class="text-gray-800 font-semibold">{{ userProfile?.name || userProfile?.username || 'Guest' }}</div>
            <div class="text-sm text-gray-500">{{ userProfile?.email || '' }}</div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="py-2">
        <div class="text-sm text-gray-600">Mobile</div>
        <div class="font-medium text-gray-800">{{ userProfile?.phone || '-' }}</div>
      </q-card-section>

      <q-card-actions align="right" class="pb-4 pr-4">
        <q-btn flat label="Close" color="primary" @click="showProfileDialog = false" />
        <q-btn unelevated color="negative" label="Logout" @click="handleLogout" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import liff from '@line/liff'

const VAPID_PUBLIC_KEY = 'BLnzozSiqMOtMmrHeV5MTrdCAAIgiaf2mB7_PoRkynwmsCfal-3hLQ4wo2_kguGhR3jDSAnPDFiB8Uhu1qZxyU4'

const cartItemCount = ref(0)
const notificationCount = ref(0)
const router = useRouter()
const isSubscribed = ref(false)
const subscribing = ref(false)
const showSuccessModal = ref(false)

// User profile state
const userProfile = ref(null)
const showProfileDialog = ref(false)

const fetchProfile = async () => {
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('token')
    if (token == null){
      console.log('No token found, skipping profile fetch')
      userProfile.value = null
    }else{
      console.log*('Fetching profile with token:')
      const res = await api.get('/profile', { headers: { Authorization: `Bearer ${token}` } })
      userProfile.value = res.data
    }
  } catch (err) {
    console.error('Could not fetch profile:', err)
    userProfile.value = null
  }
}

const handleAccountClick = () => {
  const token = localStorage.getItem('user_token') || localStorage.getItem('token')
  if (!token) {
    router.push('/signin')
    return
  }
  router.push('/profile')
}

const checkLineLougout = () => {
liff.init({ liffId: '2008961587-8IiiFID9' })
    .then(() => {
      if (liff.isLoggedIn()) {
        console.log('User is logged in with LIFF, logging out...')
        liff.logout()
      }
    })
    .catch(err => {
      console.error('LIFF Initialization failed', err)
    })
}

const handleLogout = () => {
  localStorage.removeItem('user_token')
  localStorage.removeItem('token')
  localStorage.removeItem('user_profile')
  userProfile.value = null
  showProfileDialog.value = false
  console.log('check line logout')
  checkLineLougout()
  router.push('/')
}

const updateCartCount = () => {
  const cartData = sessionStorage.getItem('cart')
  if (cartData) {
    const cart = JSON.parse(cartData)
    cartItemCount.value = Array.isArray(cart) ? cart.length : 0
  } else {
    cartItemCount.value = 0
  }
}

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Check if already subscribed
async function checkSubscriptionStatus() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }
    
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      // Check with backend if this subscription exists
      const response = await api.post('/checkSubscription', {
        endpoint: subscription.endpoint
      })
      isSubscribed.value = response.data.isSubscribed
    }
  } catch (error) {
    console.error('Error checking subscription status:', error)
  }
}

// Handle notification bell click
async function handleNotificationClick() {
  // If user is not logged in, redirect to sign-in
  const token = localStorage.getItem('user_token') || localStorage.getItem('token')
  if (!token) {
    router.push('/signin')
    return
  }

  if (isSubscribed.value) {
    // Already subscribed, maybe show notifications page or do nothing
    return
  }

  // Check browser support
  if (!('serviceWorker' in navigator)) {
    alert('Service workers are not supported in this browser')
    return
  }

  if (!('PushManager' in window)) {
    alert('Push notifications are not supported in this browser')
    return
  }

  subscribing.value = true

  try {
    // Request notification permission
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      alert('Notification permission denied')
      subscribing.value = false
      return
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    // Extract subscription data and send JSON payload to backend
    const subscriptionData = subscription.toJSON()
    await api.post('/createSubscription', {
      endpoint: subscriptionData.endpoint,
      keys: subscriptionData.keys
    })

    // Update state and show success modal
    isSubscribed.value = true
    showSuccessModal.value = true

  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    alert('Failed to subscribe to notifications. Please try again.')
  } finally {
    subscribing.value = false
  }
}

// Listen for storage changes and custom cart update events
const handleStorageChange = () => updateCartCount()

onMounted(() => {
  updateCartCount()
  fetchProfile()
  checkSubscriptionStatus()
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('cart-updated', handleStorageChange)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('cart-updated', handleStorageChange)
})
</script>

<style scoped>
</style>