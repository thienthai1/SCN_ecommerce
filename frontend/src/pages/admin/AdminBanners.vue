<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Banner Management</h1>
        <p class="text-gray-500 text-sm mt-1">Manage homepage slide banners</p>
      </div>
      <button 
        @click="openAddDialog"
        class="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium rounded-xl hover:from-red-700 hover:to-pink-700 transition-all flex items-center gap-2"
      >
        <q-icon name="add" size="20px" />
        Add Banner
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-16">
      <q-spinner-dots color="primary" size="50px" />
    </div>

    <!-- Banners List -->
    <div v-else-if="banners.length > 0" class="space-y-4">
      <div
        v-for="banner in banners"
        :key="banner.id"
        class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div class="flex flex-col md:flex-row">
          <!-- Banner Image -->
          <div class="w-full md:w-64 h-40 bg-gray-100 flex-shrink-0">
            <img 
              v-if="banner.image_url" 
              :src="banner.image_url" 
              :alt="banner.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <q-icon name="image" size="48px" class="text-gray-300" />
            </div>
          </div>
          
          <!-- Banner Details -->
          <div class="flex-1 p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold text-gray-800">{{ banner.title }}</h3>
                  <span 
                    :class="[
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    ]"
                  >
                    {{ banner.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <p class="text-gray-600 text-sm mt-1 line-clamp-2">{{ banner.description || 'No description' }}</p>
                
                <div class="flex flex-wrap gap-4 mt-3 text-sm">
                  <div class="flex items-center gap-1 text-gray-500">
                    <q-icon name="sort" size="16px" />
                    <span>Order: {{ banner.slide_order }}</span>
                  </div>
                  <div v-if="banner.button_name" class="flex items-center gap-1 text-gray-500">
                    <q-icon name="smart_button" size="16px" />
                    <span>{{ banner.button_name }}</span>
                  </div>
                  <div v-if="banner.button_url" class="flex items-center gap-1 text-gray-500">
                    <q-icon name="link" size="16px" />
                    <span class="truncate max-w-[200px]">{{ banner.button_url }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Actions -->
              <div class="flex items-center gap-2">
                <button 
                  @click="editBanner(banner)"
                  class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <q-icon name="edit" size="20px" />
                </button>
                <button 
                  @click="deleteBanner(banner)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <q-icon name="delete" size="20px" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <q-icon name="photo_library" size="32px" class="text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-800">No banners yet</h3>
      <p class="text-gray-500 mt-1">Create your first homepage banner</p>
      <button 
        @click="openAddDialog"
        class="mt-4 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium rounded-xl hover:from-red-700 hover:to-pink-700 transition-all"
      >
        Add Banner
      </button>
    </div>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card class="w-full max-w-lg rounded-2xl">
        <q-card-section class="pb-2">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-800">
              {{ editingBanner ? 'Edit Banner' : 'Add New Banner' }}
            </h3>
            <button @click="closeDialog" class="p-1 hover:bg-gray-100 rounded-full">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </q-card-section>
        
        <q-card-section class="pt-2 space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- Image Upload -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Banner Image</label>
            <div 
              class="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-red-400 transition-colors"
              @click="triggerImageUpload"
            >
              <input 
                ref="imageInput"
                type="file" 
                accept="image/*" 
                class="hidden"
                @change="handleImageUpload"
              />
              <div v-if="!form.image_url && !uploadingImage">
                <q-icon name="cloud_upload" size="40px" class="text-gray-400" />
                <p class="text-sm text-gray-500 mt-2">Click to upload image</p>
                <p class="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              </div>
              <div v-else-if="uploadingImage" class="py-4">
                <q-spinner color="primary" size="32px" />
                <p class="text-sm text-gray-500 mt-2">Uploading...</p>
              </div>
              <div v-else class="relative">
                <img :src="form.image_url" alt="Banner Preview" class="max-h-32 mx-auto rounded-lg" />
                <button 
                  type="button"
                  class="absolute top-0 right-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center"
                  @click.stop="removeImage"
                >
                  <q-icon name="close" size="14px" class="text-red-500" />
                </button>
              </div>
            </div>
          </div>

          <!-- Title -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Title *</label>
            <input
              v-model="form.title"
              type="text"
              placeholder="Enter banner title"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="Enter banner description"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
            ></textarea>
          </div>

          <!-- Slide Order -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Slide Order</label>
            <input
              v-model.number="form.slide_order"
              type="number"
              min="0"
              placeholder="0"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Button Name -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Button Text</label>
            <input
              v-model="form.button_name"
              type="text"
              placeholder="e.g., Shop Now"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Button URL -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Button URL</label>
            <input
              v-model="form.button_url"
              type="text"
              placeholder="e.g., /browse"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Active Toggle -->
          <label class="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="form.is_active"
              class="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span class="text-sm text-gray-700">Active (visible on homepage)</span>
          </label>
        </q-card-section>
        
        <q-card-actions class="px-4 pb-4 gap-2">
          <button 
            @click="closeDialog"
            class="flex-1 h-11 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="saveBanner"
            :disabled="!isFormValid || saving"
            class="flex-1 h-11 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <q-spinner v-if="saving" color="white" size="18px" />
            {{ saving ? 'Saving...' : (editingBanner ? 'Update' : 'Create') }}
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineExpose } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

const $q = useQuasar()

const banners = ref([])
const loading = ref(true)
const showDialog = ref(false)
const editingBanner = ref(null)
const saving = ref(false)
const uploadingImage = ref(false)
const imageInput = ref(null)

const form = ref({
  title: '',
  description: '',
  slide_order: 0,
  image_url: '',
  button_name: '',
  button_url: '',
  is_active: true
})

const isFormValid = computed(() => {
  return form.value.title.trim() !== ''
})

// Fetch banners
async function fetchBanners() {
  loading.value = true
  try {
    const response = await api.get('/banners')
    banners.value = response.data.banners || []
  } catch (error) {
    console.error('Error fetching banners:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load banners'
    })
  } finally {
    loading.value = false
  }
}

// Open add dialog
function openAddDialog() {
  editingBanner.value = null
  form.value = {
    title: '',
    description: '',
    slide_order: banners.value.length,
    image_url: '',
    button_name: 'Shop Now',
    button_url: '/browse',
    is_active: true
  }
  showDialog.value = true
}

// Edit banner
function editBanner(banner) {
  editingBanner.value = banner
  form.value = {
    title: banner.title || '',
    description: banner.description || '',
    slide_order: banner.slide_order || 0,
    image_url: banner.image_url || '',
    button_name: banner.button_name || '',
    button_url: banner.button_url || '',
    is_active: banner.is_active !== false
  }
  showDialog.value = true
}

// Close dialog
function closeDialog() {
  showDialog.value = false
  editingBanner.value = null
}

// Image upload
function triggerImageUpload() {
  if (!uploadingImage.value) {
    imageInput.value?.click()
  }
}

async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > 5 * 1024 * 1024) {
    $q.notify({
      type: 'negative',
      message: 'File size must be less than 5MB'
    })
    return
  }
  
  uploadingImage.value = true
  
  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const response = await api.post('/banners/upload-image', {
          imageBase64: e.target.result
        })
        form.value.image_url = response.data.image_url
      } catch (error) {
        console.error('Error uploading image:', error)
        $q.notify({
          type: 'negative',
          message: 'Failed to upload image'
        })
      } finally {
        uploadingImage.value = false
      }
    }
    reader.readAsDataURL(file)
  } catch (error) {
    uploadingImage.value = false
  }
}

function removeImage() {
  form.value.image_url = ''
  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

// Save banner
async function saveBanner() {
  if (!isFormValid.value) return
  
  saving.value = true
  
  try {
    if (editingBanner.value) {
      await api.put(`/banners/${editingBanner.value.id}`, form.value)
      $q.notify({
        type: 'positive',
        message: 'Banner updated successfully'
      })
    } else {
      await api.post('/banners', form.value)
      $q.notify({
        type: 'positive',
        message: 'Banner created successfully'
      })
    }
    
    closeDialog()
    await fetchBanners()
  } catch (error) {
    console.error('Error saving banner:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to save banner'
    })
  } finally {
    saving.value = false
  }
}

// Delete banner
function deleteBanner(banner) {
  $q.dialog({
    title: 'Delete Banner',
    message: `Are you sure you want to delete "${banner.title}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete(`/banners/${banner.id}`)
      banners.value = banners.value.filter(b => b.id !== banner.id)
      $q.notify({
        type: 'positive',
        message: 'Banner deleted'
      })
    } catch (error) {
      console.error('Error deleting banner:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to delete banner'
      })
    }
  })
}

// Refresh function for parent
function refresh() {
  fetchBanners()
}

defineExpose({ refresh })

onMounted(() => {
  fetchBanners()
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
