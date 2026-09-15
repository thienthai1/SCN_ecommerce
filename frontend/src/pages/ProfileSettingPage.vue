<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div class="flex items-center px-4 h-14 gap-3">
        <button @click="$router.back()" class="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <q-icon name="arrow_back" size="20px" class="text-gray-700" />
        </button>
        <span class="text-lg font-semibold text-gray-800">ตั้งค่าผู้ใช้งาน</span>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <q-spinner-dots color="green" size="50px" />
    </div>

    <!-- Main Content -->
    <main v-else class="px-4 py-4 space-y-4">

      <!-- Account Information -->
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <span class="text-base font-semibold text-gray-800 flex items-center gap-2">
            <q-icon name="person" size="18px" class="text-emerald-600" />
            Account Information
          </span>
          <button 
            v-if="!editingProfile"
            @click="startEditProfile"
            class="text-sm text-emerald-600 font-medium hover:text-emerald-700"
          >
            Edit
          </button>
        </div>

        <!-- View Mode -->
        <div v-if="!editingProfile" class="space-y-3">
          <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <span class="text-sm text-gray-500">ชื่อเต็ม</span>
            <span class="text-sm font-medium text-gray-800">{{ userProfile?.name || '-' }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-gray-100">
            <span class="text-sm text-gray-500">อีเมล</span>
            <span class="text-sm font-medium text-gray-800">{{ userProfile?.email || '-' }}</span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-gray-500">หมายเลขโทรศัพท์</span>
            <span class="text-sm font-medium text-gray-800">{{ userProfile?.phone || '-' }}</span>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">ชื่อเต็ม</label>
            <input
              v-model="editForm.name"
              type="text"
              placeholder="Enter your full name"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">อีเมล</label>
            <input
              v-model="editForm.email"
              type="email"
              placeholder="Enter your email"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">หมายเลขโทรศัพท์</label>
            <input
              v-model="editForm.phone"
              type="tel"
              placeholder="Enter your mobile number"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div class="flex gap-2 pt-2">
            <button 
              @click="cancelEditProfile"
              class="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              @click="saveProfile"
              :disabled="savingProfile"
              class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <q-spinner v-if="savingProfile" color="white" size="18px" />
              {{ savingProfile ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Shipping Addresses -->
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <span class="text-base font-semibold text-gray-800 flex items-center gap-2">
            <q-icon name="location_on" size="18px" class="text-emerald-600" />
            Shipping Addresses
          </span>
          <button 
            @click="openAddAddressDialog"
            class="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1"
          >
            <q-icon name="add" size="16px" />
            Add
          </button>
        </div>

        <!-- Loading Addresses -->
        <div v-if="loadingAddresses" class="flex items-center justify-center py-8">
          <q-spinner color="primary" size="24px" />
          <span class="ml-2 text-gray-500">Loading addresses...</span>
        </div>

        <!-- No Addresses -->
        <div v-else-if="addresses.length === 0" class="text-center py-8">
          <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <q-icon name="add_location" size="24px" class="text-gray-400" />
          </div>
          <p class="text-gray-500 text-sm">No shipping addresses yet</p>
          <button 
            @click="openAddAddressDialog"
            class="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Add Your First Address
          </button>
        </div>

        <!-- Address List -->
        <div v-else class="space-y-3">
          <div
            v-for="addr in addresses"
            :key="addr.id"
            class="p-3 bg-stone-50 rounded-xl border border-gray-200"
          >
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <q-icon name="home" size="16px" class="text-emerald-600" />
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
                  @click="setAsDefault(addr.id)"
                  class="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Set as default"
                >
                  <q-icon name="star_outline" size="18px" />
                </button>
                <button 
                  @click="editAddress(addr)"
                  class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit address"
                >
                  <q-icon name="edit" size="18px" />
                </button>
                <button 
                  @click="deleteAddress(addr.id)"
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete address"
                >
                  <q-icon name="delete_outline" size="18px" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logout Button -->
      <button 
        @click="handleLogout"
        class="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <q-icon name="logout" size="20px" />
        Logout
      </button>
    </main>

    <!-- Add/Edit Address Dialog -->
    <q-dialog v-model="showAddressDialog" persistent>
      <q-card class="w-full max-w-md rounded-2xl">
        <q-card-section class="pb-2">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-800">{{ editingAddress ? 'Edit Address' : 'Add New Address' }}</h3>
            <button @click="closeAddressDialog" class="p-1 hover:bg-gray-100 rounded-full">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </q-card-section>
        
        <q-card-section class="pt-2 space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Full Name *</label>
            <input
              v-model="addressForm.name"
              type="text"
              placeholder="Enter recipient name"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Phone Number *</label>
            <input
              v-model="addressForm.phone"
              type="tel"
              placeholder="Enter phone number"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Full Address *</label>
            <textarea
              v-model="addressForm.address"
              rows="3"
              placeholder="Enter full delivery address"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
            ></textarea>
          </div>
          
          <label class="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="addressForm.is_default"
              class="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span class="text-sm text-gray-700">Set as default address</span>
          </label>
        </q-card-section>
        
        <q-card-actions class="px-4 pb-4 gap-2">
          <button 
            @click="closeAddressDialog"
            class="flex-1 h-11 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="saveAddress"
            :disabled="!isAddressFormValid || savingAddress"
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
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import liff from '@line/liff'

const router = useRouter()
const $q = useQuasar()

// User profile
const userProfile = ref(null)
const loading = ref(true)
const editingProfile = ref(false)
const savingProfile = ref(false)
const editForm = ref({
  name: '',
  email: '',
  phone: ''
})

// Addresses
const addresses = ref([])
const loadingAddresses = ref(false)
const showAddressDialog = ref(false)
const editingAddress = ref(null)
const savingAddress = ref(false)
const addressForm = ref({
  name: '',
  phone: '',
  address: '',
  is_default: false
})

// Computed
const isAddressFormValid = computed(() => {
  return addressForm.value.name.trim() !== '' &&
         addressForm.value.phone.trim() !== '' &&
         addressForm.value.address.trim() !== ''
})

// Fetch user profile
async function fetchProfile() {
  loading.value = true
  try {
    const response = await api.get('/profile')
    userProfile.value = response.data
    localStorage.setItem('user_profile', JSON.stringify(response.data))
  } catch (error) {
    console.error('Error fetching profile:', error)
    if (error.response?.status === 401) {
      router.push('/signin')
    }
  } finally {
    loading.value = false
  }
}

// Fetch addresses
async function fetchAddresses() {
  loadingAddresses.value = true
  try {
    const response = await api.get('/user/addresses')
    addresses.value = response.data.addresses || []
  } catch (error) {
    console.error('Error fetching addresses:', error)
  } finally {
    loadingAddresses.value = false
  }
}

// Profile editing
function startEditProfile() {
  editForm.value = {
    name: userProfile.value?.name || '',
    email: userProfile.value?.email || '',
    phone: userProfile.value?.phone || ''
  }
  editingProfile.value = true
}

function cancelEditProfile() {
  editingProfile.value = false
}

async function saveProfile() {
  savingProfile.value = true
  try {
    await api.put('/profile', {
      name: editForm.value.name,
      email: editForm.value.email,
      phone: editForm.value.phone
    })
    
    // Update local state
    userProfile.value = {
      ...userProfile.value,
      name: editForm.value.name,
      email: editForm.value.email,
      phone: editForm.value.phone
    }
    localStorage.setItem('user_profile', JSON.stringify(userProfile.value))
    
    editingProfile.value = false
    $q.notify({
      type: 'positive',
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error saving profile:', error)
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Failed to update profile'
    })
  } finally {
    savingProfile.value = false
  }
}

// Address management
function openAddAddressDialog() {
  editingAddress.value = null
  addressForm.value = {
    name: userProfile.value?.name || '',
    phone: userProfile.value?.phone || '',
    address: '',
    is_default: addresses.value.length === 0
  }
  showAddressDialog.value = true
}

function editAddress(addr) {
  editingAddress.value = addr
  addressForm.value = {
    name: addr.name,
    phone: addr.phone,
    address: addr.address,
    is_default: addr.is_default
  }
  showAddressDialog.value = true
}

function closeAddressDialog() {
  showAddressDialog.value = false
  editingAddress.value = null
}

async function saveAddress() {
  if (!isAddressFormValid.value) return
  
  savingAddress.value = true
  try {
    if (editingAddress.value) {
      // Update existing address
      await api.put(`/user/addresses/${editingAddress.value.id}`, {
        name: addressForm.value.name,
        phone: addressForm.value.phone,
        address: addressForm.value.address,
        is_default: addressForm.value.is_default
      })
      
      // Update local state
      const index = addresses.value.findIndex(a => a.id === editingAddress.value.id)
      if (index >= 0) {
        addresses.value[index] = {
          ...addresses.value[index],
          ...addressForm.value
        }
        
        // If set as default, update others
        if (addressForm.value.is_default) {
          addresses.value.forEach((a, i) => {
            if (i !== index) a.is_default = false
          })
        }
      }
      
      $q.notify({
        type: 'positive',
        message: 'Address updated successfully'
      })
    } else {
      // Add new address
      const response = await api.post('/user/addresses', {
        name: addressForm.value.name,
        phone: addressForm.value.phone,
        address: addressForm.value.address,
        is_default: addressForm.value.is_default
      })
      
      addresses.value.unshift(response.data)
      
      // If set as default, update others
      if (response.data.is_default) {
        addresses.value.forEach(a => {
          if (a.id !== response.data.id) a.is_default = false
        })
      }
      
      $q.notify({
        type: 'positive',
        message: 'Address added successfully'
      })
    }
    
    closeAddressDialog()
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

async function deleteAddress(addressId) {
  $q.dialog({
    title: 'Delete Address',
    message: 'Are you sure you want to delete this address?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/user/addresses/${addressId}`)
      addresses.value = addresses.value.filter(a => a.id !== addressId)
      
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

const checkLineLougout = () => {
    if (liff.isLoggedIn()) {
        console.log('User is logged in with LIFF, logging out...')
    liff.logout()
    }
}

// Logout
function handleLogout() {
  $q.dialog({
    title: 'Logout',
    message: 'Are you sure you want to logout?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    localStorage.removeItem('user_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user_profile')
    checkLineLougout()
    router.push('/')
  })
}

// Initialize
onMounted(() => {
  const token = localStorage.getItem('user_token')
  if (!token) {
    router.push('/signin')
    return
  }
  
  fetchProfile()
  fetchAddresses()
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
