<template>
  <div class="admin-payment">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Payment Gateway</h1>
        <p class="text-gray-500 text-sm mt-1">Manage payment methods for customers</p>
      </div>
      <button 
        @click="openCreateModal"
        class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all"
      >
        <q-icon name="add" size="20px" />
        Add Payment Gateway
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <q-spinner color="red" size="40px" class="mb-4" />
      <p class="text-gray-500">Loading payment gateways...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="gateways.length === 0" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <q-icon name="credit_card" size="40px" class="text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No payment gateways found</h3>
      <p class="text-gray-500 mb-4">Add a payment gateway so customers can see how to pay</p>
      <button 
        @click="openCreateModal"
        class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
      >
        Add Payment Gateway
      </button>
    </div>

    <!-- Gateways Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="gateway in gateways" 
        :key="gateway.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
      >
        <!-- QR Image -->
        <div class="aspect-square bg-gray-100 relative overflow-hidden">
          <img 
            v-if="gateway.imageUrl" 
            :src="gateway.imageUrl" 
            :alt="gateway.name"
            class="w-full h-full object-contain p-4"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <q-icon name="qr_code_2" size="80px" class="text-gray-300" />
          </div>
          <!-- Status Badge -->
          <div 
            :class="[
              'absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold',
              gateway.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            ]"
          >
            {{ gateway.isActive ? 'Active' : 'Inactive' }}
          </div>
        </div>

        <!-- Gateway Info -->
        <div class="p-4">
          <h3 class="font-bold text-gray-800 mb-3">{{ gateway.name }}</h3>
          
          <div class="space-y-2 text-sm mb-4">
            <div v-if="gateway.bankName" class="flex items-center gap-2">
              <q-icon name="account_balance" size="16px" class="text-gray-400" />
              <span class="text-gray-600">{{ gateway.bankName }}</span>
            </div>
            <div v-if="gateway.accountNumber" class="flex items-center gap-2">
              <q-icon name="numbers" size="16px" class="text-gray-400" />
              <span class="text-gray-600 font-mono">{{ gateway.accountNumber }}</span>
            </div>
            <div v-if="gateway.accountName" class="flex items-center gap-2">
              <q-icon name="person" size="16px" class="text-gray-400" />
              <span class="text-gray-600">{{ gateway.accountName }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button 
              @click="openEditModal(gateway)"
              class="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              <q-icon name="edit" size="16px" />
              Edit
            </button>
            <button 
              @click="toggleActive(gateway)"
              :class="[
                'flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                gateway.isActive 
                  ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700' 
                  : 'bg-green-100 hover:bg-green-200 text-green-700'
              ]"
            >
              <q-icon :name="gateway.isActive ? 'visibility_off' : 'visibility'" size="16px" />
              {{ gateway.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showModal = false">
      <div class="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-800">{{ editingGateway ? 'Edit Payment Gateway' : 'Add Payment Gateway' }}</h2>
            <button @click="showModal = false" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </div>

        <form @submit.prevent="saveGateway" class="p-6 space-y-5">
          <!-- Gateway Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Gateway Name *</label>
            <input 
              v-model="form.name"
              type="text" 
              required
              placeholder="e.g. Bank Transfer QR"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <!-- Bank Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input 
              v-model="form.bankName"
              type="text" 
              placeholder="e.g. Example Bank"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <!-- Account Number -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input 
              v-model="form.accountNumber"
              type="text" 
              placeholder="e.g. 123-456-7890"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <!-- Account Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
            <input 
              v-model="form.accountName"
              type="text" 
              placeholder="e.g. ShopMart Store"
              class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <!-- Image Upload (only for new gateways) -->
          <div v-if="!editingGateway">
            <label class="block text-sm font-medium text-gray-700 mb-2">QR Code / Payment Image *</label>
            <div 
              @click="triggerFileInput"
              :class="[
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                imagePreview ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
              ]"
            >
              <input 
                type="file" 
                ref="fileInput" 
                @change="handleFileSelect" 
                accept="image/*" 
                class="hidden"
              />
              <div v-if="!imagePreview">
                <q-icon name="cloud_upload" size="48px" class="text-gray-400 mb-2" />
                <p class="text-gray-600 font-medium">Click to upload image</p>
                <p class="text-gray-400 text-sm">PNG, JPG up to 5MB</p>
              </div>
              <div v-else class="relative inline-block">
                <img :src="imagePreview" class="max-w-48 max-h-48 rounded-lg mx-auto" />
                <button 
                  type="button"
                  @click.stop="removeImage"
                  class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                >
                  <q-icon name="close" size="14px" />
                </button>
              </div>
            </div>
          </div>

          <!-- Current Image (edit mode) -->
          <div v-if="editingGateway && editingGateway.imageUrl">
            <label class="block text-sm font-medium text-gray-700 mb-2">Current Image</label>
            <div class="bg-gray-100 rounded-xl p-4 text-center">
              <img :src="editingGateway.imageUrl" class="max-w-48 max-h-48 rounded-lg mx-auto" />
            </div>
          </div>

          <!-- Active Status -->
          <div class="flex items-center gap-3">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="form.isActive" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
            <span class="text-sm font-medium text-gray-700">Active (visible to customers)</span>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4">
            <button 
              type="button"
              @click="showModal = false"
              class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              :disabled="saving || (!editingGateway && !imageBase64)"
              class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <q-spinner v-if="saving" color="white" size="18px" />
              {{ saving ? 'Saving...' : (editingGateway ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../boot/axios';

// State
const gateways = ref([]);
const loading = ref(false);
const showModal = ref(false);
const editingGateway = ref(null);
const saving = ref(false);
const imagePreview = ref(null);
const imageBase64 = ref(null);
const fileInput = ref(null);

const form = ref({
  name: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
  isActive: true
});

// Methods
const loadGateways = async () => {
  loading.value = true;
  try {
    const res = await api.get('/getAllPaymentGateways');
    gateways.value = res.data.payment_gateways || [];
  } catch (err) {
    console.error('Error loading payment gateways:', err);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingGateway.value = null;
  form.value = {
    name: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    isActive: true
  };
  imagePreview.value = null;
  imageBase64.value = null;
  showModal.value = true;
};

const openEditModal = (gateway) => {
  editingGateway.value = gateway;
  form.value = {
    name: gateway.name || '',
    bankName: gateway.bankName || '',
    accountNumber: gateway.accountNumber || '',
    accountName: gateway.accountName || '',
    isActive: gateway.isActive !== false
  };
  imagePreview.value = null;
  imageBase64.value = null;
  showModal.value = true;
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target.result;
    imageBase64.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

const removeImage = () => {
  imagePreview.value = null;
  imageBase64.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const saveGateway = async () => {
  saving.value = true;
  try {
    if (editingGateway.value) {
      await api.put('/updatePaymentGateway', {
        id: editingGateway.value.id,
        name: form.value.name,
        bankName: form.value.bankName,
        accountNumber: form.value.accountNumber,
        accountName: form.value.accountName,
        isActive: form.value.isActive
      });
    } else {
      await api.post('/uploadPaymentGateway', {
        name: form.value.name,
        imageBase64: imageBase64.value,
        bankName: form.value.bankName,
        accountNumber: form.value.accountNumber,
        accountName: form.value.accountName,
        isActive: form.value.isActive
      });
    }
    showModal.value = false;
    loadGateways();
  } catch (err) {
    console.error('Error saving payment gateway:', err);
    alert('Error: ' + (err.response?.data?.error || err.message));
  } finally {
    saving.value = false;
  }
};

const toggleActive = async (gateway) => {
  try {
    await api.put('/updatePaymentGateway', {
      id: gateway.id,
      isActive: !gateway.isActive
    });
    loadGateways();
  } catch (err) {
    console.error('Error toggling gateway status:', err);
    alert('Error: ' + (err.response?.data?.error || err.message));
  }
};

// Lifecycle
onMounted(() => {
  loadGateways();
});

// Expose refresh method
defineExpose({ refresh: loadGateways });
</script>
