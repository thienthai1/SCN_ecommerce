<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div class="flex items-center px-4 h-14 gap-3">
        <button @click="$router.push('/')" class="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <q-icon name="arrow_back" size="20px" class="text-gray-700" />
        </button>
        <div>
          <span class="text-lg font-semibold text-gray-800">คำสั่งซื้อของฉัน</span>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-16">
      <q-spinner-dots color="green" size="50px" />
    </div>

    <!-- Main Content -->
    <main v-else class="px-4 py-4">
      <!-- Header Description -->
      <p class="text-sm text-gray-500 mb-4">Track and manage your orders</p>

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="(tab, index) in filterTabs"
          :key="tab"
          @click="activeFilter = tab"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            activeFilter === tab
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-200 text-gray-600 hover:bg-stone-300'
          ]"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="filteredOrders.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center mb-4">
          <q-icon name="inventory_2" size="32px" class="text-gray-400" />
        </div>
        <h3 class="text-base font-medium text-gray-700">No orders yet</h3>
        <p class="text-sm text-gray-500 mt-1 max-w-[240px]">
          When you place an order, it will appear here
        </p>
        <button
          @click="$router.push('/')"
          class="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
        >
          Start Shopping
        </button>
      </div>

      <!-- Orders List -->
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <!-- Order Header -->
          <div class="flex items-start justify-between gap-2 mb-3">
            <div>
              <p class="text-sm font-medium text-gray-800">
                {{ order.order_token }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ formatDate(order.created_at) }} • {{ order.order_items?.length || 0 }} {{ (order.order_items?.length || 0) === 1 ? 'item' : 'items' }}
              </p>
            </div>
            <span
              :class="[
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                getStatusStyle(order.status)
              ]"
            >
              <q-icon :name="getStatusIcon(order.status)" size="12px" />
              {{ getStatusText(order.status) }}
            </span>
          </div>

          <!-- Order Items List -->
          <div class="space-y-2 mb-3">
            <div
              v-for="item in order.order_items"
              :key="item.id"
              class="flex gap-3 p-2 bg-stone-50 rounded-lg"
            >
              <!-- Item Image -->
              <div class="w-14 h-14 rounded-lg overflow-hidden bg-stone-200 flex-shrink-0">
                <img
                  v-if="getItemImage(item)"
                  :src="getItemImage(item)"
                  :alt="getItemName(item)"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <q-icon name="image" size="20px" class="text-gray-300" />
                </div>
              </div>

              <!-- Item Details -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 line-clamp-1">
                  {{ getItemName(item) }}
                </p>
                <!-- Variant Badge -->
                <p v-if="item.options" class="text-xs text-gray-500 mt-0.5">
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                    {{ item.options.variant }}: {{ item.options.name }}
                  </span>
                </p>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-xs text-gray-500">x{{ item.quantity }}</span>
                  <span class="text-sm font-medium text-emerald-600">{{ formatPrice(item.price * item.quantity) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Footer -->
          <div class="pt-3 border-t border-gray-100 space-y-1.5">
            <!-- Shipping Address -->
            <div v-if="order.shipped_address" class="flex items-start gap-2 text-xs pb-2 mb-2 border-b border-gray-100">
              <q-icon name="location_on" size="14px" class="text-gray-400 mt-0.5 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-gray-500 font-medium">ที่อยู่จัดส่ง:</p>
                <p class="text-gray-600 mt-0.5">{{ order.customer_name }} • {{ order.customer_phone }}</p>
                <p class="text-gray-500 mt-0.5 line-clamp-2">{{ order.shipped_address }}</p>
              </div>
            </div>
            <!-- Subtotal Info -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500 flex items-center gap-1">
                <q-icon name="receipt_long" size="14px" />
                ยอดรวม
              </span>
              <span class="text-gray-600">{{ formatPrice(order.total_price - (order.shipping_price || 0) || 0) }}</span>
            </div>
            <!-- Shipping Info -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500 flex items-center gap-1">
                <q-icon name="local_shipping" size="14px" />
                ค่าจัดส่ง ({{ order.shipping_type || 'standard' }})
              </span>
              <span class="text-gray-600">{{ formatPrice(order.shipping_price || 0) }}</span>
            </div>
            <!-- Total -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">รวมทั้งหมด</span>
              <span class="text-base font-semibold text-gray-800">
                {{ formatPrice(order.total_price) }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              v-if="order.status === 'pending' && (!order.slipped_images || order.slipped_images.length === 0)"
              @click.stop="openPaymentDialog(order)"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ชำระเงิน
            </button>
            <span
              v-if="order.status === 'pending' && order.slipped_images && order.slipped_images.length > 0"
              class="px-4 py-2 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg"
            >
              รอการตรวจสอบการชำระเงิน
            </span>
            <span
              v-if="order.status === 'paid'"
              class="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg"
            >
              กำลังดำเนินการจัดส่ง
            </span>
            <span
              v-if="order.status === 'shipped'"
              class="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg"
            >
              จัดส่งแล้ว
            </span>
          </div>
        </div>
      </div>
      </div>
    </main>

    <!-- Bottom Navigation -->
    <BottomNavigation />

    <!-- Payment Dialog -->
    <q-dialog v-model="paymentDialogOpen" persistent>
      <q-card class="w-full max-w-md rounded-2xl pb-[50px]">
        <q-card-section class="text-center">
          <span class="text-lg font-bold text-gray-800">การชำระเงิน</span>
          <p class="text-sm text-gray-500 mt-1">สแกน QR code หรือโอนเงินเพื่อชำระเงิน</p>
        </q-card-section>

        <q-card-section class="pt-0">
          <!-- Order Info -->
          <div v-if="selectedOrder" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
            <div class="flex justify-between items-center">
              <span class="text-sm font-bold text-gray-600">ยอดรวม</span>
              <span class="text-lg font-bold text-emerald-600">{{ formatPrice(selectedOrder.total_price) }}</span>
            </div>
          </div>

          <!-- Payment Gateway Info -->
          <div class="bg-white border-2 border-dashed border-gray-200 rounded-xl p-4 mb-4">
            <div class="aspect-square max-w-xs mx-auto bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              <img v-if="paymentGateway?.imageUrl" :src="paymentGateway.imageUrl" alt="Payment QR" class="w-full h-full object-contain" />
              <div v-else class="text-center">
                <q-icon name="qr_code_2" size="120px" class="text-gray-800" />
                <p class="text-sm text-gray-600 mt-2">Scan to Pay</p>
              </div>
            </div>
            <div class="text-center mt-4">
              <p v-if="paymentGateway?.bankName" class="text-sm font-medium text-gray-700">ธนาคาร: {{ paymentGateway.bankName }}</p>
              <p v-if="paymentGateway?.accountNumber" class="text-sm text-gray-600">เลขที่บัญชี: {{ paymentGateway.accountNumber }}</p>
              <p v-if="paymentGateway?.accountName" class="text-sm text-gray-600">ชื่อบัญชี: {{ paymentGateway.accountName }}</p>
            </div>
          </div>

          <!-- Upload Payment Proof -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">อัปโหลดหลักฐานการชำระเงิน</label>
            <div 
              class="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 transition-colors"
              @click="triggerFileUpload"
            >
              <input 
                ref="fileInput"
                type="file" 
                accept="image/*" 
                class="hidden"
                @change="handleFileUpload"
              />
              <div v-if="!uploadedProof">
                <q-icon name="cloud_upload" size="40px" class="text-gray-400" />
                <p class="text-sm text-gray-500 mt-2">คลิกเพื่ออัปโหลดรูปภาพ</p>
                <p class="text-xs text-gray-400 mt-1">PNG, JPG ขนาดไม่เกิน 5MB</p>
              </div>
              <div v-else class="relative">
                <img :src="uploadedProof" alt="Payment Proof" class="max-h-32 mx-auto rounded-lg" />
                <button 
                  type="button"
                  class="absolute top-0 right-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center"
                  @click.stop="removeUploadedProof"
                >
                  <q-icon name="close" size="14px" class="text-red-500" />
                </button>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="px-4 pb-4 gap-2">
          <button 
            @click="closePaymentDialog"
            class="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button 
            @click="confirmPayment"
            :disabled="!uploadedProof || isUploading"
            class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <q-spinner v-if="isUploading" color="white" size="20px" />
            <span>{{ isUploading ? 'กำลังอัปโหลด...' : 'ยืนยันการชำระเงิน' }}</span>
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import BottomNavigation from '../components/BottomNavigation.vue'

const router = useRouter()
const $q = useQuasar()

const orders = ref([])
const isLoading = ref(true)
const activeFilter = ref('All')
const filterTabs = ['All', 'Processing', 'Shipped', 'Delivered']

const paymentGateway = ref(null)
const paymentDialogOpen = ref(false)
const selectedOrder = ref(null)
const uploadedProof = ref(null)
const uploadedProofBase64 = ref(null)
const fileInput = ref(null)
const isUploading = ref(false)

// Filtered orders based on active filter
const filteredOrders = computed(() => {
  if (activeFilter.value === 'All') return orders.value
  const statusMap = {
    'Processing': ['pending', 'paid'],
    'Shipped': ['shipped'],
    'Delivered': ['completed', 'delivered']
  }
  const statuses = statusMap[activeFilter.value] || []
  return orders.value.filter(order => statuses.includes(order.status))
})

// Format price helper
const formatPrice = (price) => {
  if (price === undefined || price === null) return '฿0'
  return '฿' + Number(price).toLocaleString()
}

// Get item image - prefer attached product doc image, then variant image, then product_imageUrl
const getItemImage = (item) => {
  if (item.product?.imageUrl) {
    return item.product.imageUrl
  }
  if (item.options?.imageUrl) {
    return item.options.imageUrl
  }
  return item.product_imageUrl || ''
}

// Get item name - prefer attached product doc name, then product_name
const getItemName = (item) => {
  return item.product?.name || item.product_name || 'Unknown Product'
}

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  })
}

// Get status style classes
function getStatusStyle(status) {
  const styles = {
    pending: 'text-amber-700 bg-amber-100',
    paid: 'text-blue-700 bg-blue-100',
    shipped: 'text-cyan-700 bg-cyan-100',
    completed: 'text-emerald-700 bg-emerald-100',
    delivered: 'text-emerald-700 bg-emerald-100',
    cancelled: 'text-red-700 bg-red-100'
  }
  return styles[status] || 'text-gray-700 bg-gray-100'
}

// Get status icon
function getStatusIcon(status) {
  const icons = {
    pending: 'schedule',
    paid: 'inventory_2',
    shipped: 'local_shipping',
    completed: 'check_circle',
    delivered: 'check_circle',
    cancelled: 'cancel'
  }
  return icons[status] || 'help'
}

// Get status text
function getStatusText(status) {
  const texts = {
    pending: 'Pending',
    paid: 'Processing',
    shipped: 'Shipped',
    completed: 'Delivered',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  }
  return texts[status] || status
}

// Fetch orders by user_id
async function fetchOrders() {
  isLoading.value = true
  
  try {
    // Get user profile from localStorage
    const userProfileStr = localStorage.getItem('user_profile')
    if (!userProfileStr) {
      orders.value = []
      return
    }

    const userProfile = JSON.parse(userProfileStr)
    const userId = userProfile.id || userProfile.uid
    
    if (!userId) {
      orders.value = []
      return
    }

    // Fetch orders by user_id
    const response = await api.get(`/getordersbyuser/${userId}`)
    orders.value = response.data.orders || []

  } catch (error) {
    console.error('Error fetching orders:', error)
    orders.value = []
  } finally {
    isLoading.value = false
  }
}

// Fetch payment gateway info
async function fetchPaymentGateway() {
  try {
    const response = await api.get('/getPaymentGateway')
    paymentGateway.value = response.data.payment_gateway
  } catch (error) {
    console.error('Error fetching payment gateway:', error)
  }
}

// Payment dialog functions
function openPaymentDialog(order) {
  selectedOrder.value = order
  uploadedProof.value = null
  uploadedProofBase64.value = null
  paymentDialogOpen.value = true
}

function closePaymentDialog() {
  paymentDialogOpen.value = false
  selectedOrder.value = null
  uploadedProof.value = null
  uploadedProofBase64.value = null
}

function triggerFileUpload() {
  fileInput.value?.click()
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      $q.notify({
        type: 'negative',
        message: 'File size must be less than 5MB'
      })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedProof.value = e.target.result
      uploadedProofBase64.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

function removeUploadedProof() {
  uploadedProof.value = null
  uploadedProofBase64.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function confirmPayment() {
  if (!selectedOrder.value || !uploadedProofBase64.value) return

  isUploading.value = true

  try {
    await api.post('/uploadPaymentImage', {
      order_id: selectedOrder.value.id,
      imageBase64: uploadedProofBase64.value
    })

    $q.notify({
      type: 'positive',
      message: 'Payment proof submitted successfully!',
      caption: 'We will verify your payment shortly.'
    })

    closePaymentDialog()
    await fetchOrders()

  } catch (error) {
    console.error('Error uploading payment proof:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to upload payment proof'
    })
  } finally {
    isUploading.value = false
  }
}

// Load orders on mount
onMounted(() => {
  fetchOrders()
  fetchPaymentGateway()
})
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
