<template>
  <!-- Header - Mockup Style -->
  <header class="storefront-header sticky top-0 z-50 w-full bg-[var(--theme-white-color)] backdrop-blur-md border-b border-gray-200">
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
          aria-label="Notifications"
          :aria-expanded="showNotificationPanel"
          aria-controls="notification-panel"
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
          aria-label="Shopping cart"
          class="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <q-icon name="eva-shopping-cart-outline" size="20px" class="text-gray-700" />
          <span v-if="cartItemCount > 0" class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] px-1 rounded-full bg-emerald-600 text-white">
            {{ cartItemCount > 9 ? '9+' : cartItemCount }}
          </span>
        </router-link>


      </div>
    </div>
  </header>

  <q-dialog v-model="showNotificationPanel" class="notification-dialog" position="right" maximized transition-show="slide-left" transition-hide="slide-right">
    <q-card id="notification-panel" class="notification-panel" aria-labelledby="notification-panel-title">
      <q-card-section class="notification-header">
        <h2 id="notification-panel-title" class="notification-heading">Notifications</h2>
        <q-btn flat round dense icon="close" class="notification-close" aria-label="Close notifications" v-close-popup />
      </q-card-section>

      <div class="notification-body" aria-live="polite" :aria-busy="loadingNotifications">
        <div v-if="loadingNotifications" class="notification-state" role="status">
          <q-spinner size="28px" color="primary" />
          <p class="notification-description">Loading notifications...</p>
        </div>
        <div v-else-if="notificationError" class="notification-state">
          <p class="notification-description">Unable to load notifications. Please try again.</p>
          <q-btn flat color="primary" label="Try again" class="mt-3" @click="loadNotifications" />
        </div>
        <div v-else-if="notifications.length === 0" class="notification-state">
          <q-icon name="notifications_none" size="48px" class="text-gray-300 mb-3" />
          <p class="notification-state-title">No notifications yet</p>
          <p class="notification-description">Announcements and updates will appear here.</p>
        </div>
        <q-list v-else separator>
          <q-item v-for="notification in notifications" :key="notification.id" class="notification-item">
            <q-item-section avatar top>
              <q-avatar color="grey-2" text-color="primary" icon="notifications_none" />
            </q-item-section>
            <q-item-section class="notification-content">
              <q-item-label class="notification-item-title">{{ notification.title }}</q-item-label>
              <p class="notification-description notification-message">{{ notification.description }}</p>
              <q-item-label v-if="typeof notification.date === 'string'" caption class="notification-date">{{ notification.date }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card>
  </q-dialog>

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


</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'src/boot/axios'

const VAPID_PUBLIC_KEY = 'BLnzozSiqMOtMmrHeV5MTrdCAAIgiaf2mB7_PoRkynwmsCfal-3hLQ4wo2_kguGhR3jDSAnPDFiB8Uhu1qZxyU4'

const cartItemCount = ref(0)
const notificationCount = ref(0)
const router = useRouter()
const isSubscribed = ref(false)
const subscribing = ref(false)
const showSuccessModal = ref(false)
const showNotificationPanel = ref(false)
const notifications = ref([])
const loadingNotifications = ref(false)
const notificationError = ref(false)

async function loadNotifications() {
  loadingNotifications.value = true
  notificationError.value = false
  try {
    const { data } = await api.get('/notifications')
    // This endpoint also includes targeted sends; the shop panel shows public announcements.
    notifications.value = (Array.isArray(data.notifications) ? data.notifications : [])
      .filter(notification => !notification.user_id)
  } catch (error) {
    notificationError.value = true
    console.error('Error loading notifications:', error)
  } finally {
    loadingNotifications.value = false
  }
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
    showNotificationPanel.value = true
    await loadNotifications()
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
.storefront-header {
  padding-top: env(safe-area-inset-top);
}

.notification-panel {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  height: 100dvh;
  border-radius: 0;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  gap: 16px;
  padding: calc(16px + env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 16px max(20px, env(safe-area-inset-left));
  border-bottom: 1px solid var(--border-light);
}

.notification-heading {
  min-width: 0;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: normal;
  overflow-wrap: anywhere;
}

.notification-close {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

.notification-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}

.notification-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted);
}

.notification-state-title {
  margin: 0;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
}

.notification-description {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.notification-state .notification-description {
  max-width: 280px;
}

.notification-item {
  padding: 16px 20px;
}

.notification-content {
  min-width: 0;
  overflow-wrap: anywhere;
}

.notification-item-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5 !important;
}

.notification-message {
  margin-top: 4px;
  white-space: pre-wrap;
}

.notification-date {
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-light);
}

</style>

<style>
/* QDialog is teleported to body; override Quasar's iOS dialog safe-area padding.
   The panel header/body handle safe areas while the surface fills the viewport. */
.q-dialog.notification-dialog .q-dialog__inner {
  inset: 0;
  padding: 0 !important;
}

.q-dialog.notification-dialog .q-dialog__inner > .notification-panel {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
  border-radius: 0 !important;
}
</style>
