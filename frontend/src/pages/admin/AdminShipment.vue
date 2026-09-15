<template>
  <div class="admin-shipment">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Shipment Settings</h1>
        <p class="text-gray-500 text-sm mt-1">Configure shipping rates and delivery times</p>
      </div>
      <button 
        @click="loadConfig"
        :disabled="loading"
        class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
      >
        <q-icon name="refresh" size="20px" :class="{ 'animate-spin': loading }" />
        Refresh
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <q-spinner color="red" size="40px" class="mb-4" />
      <p class="text-gray-500">Loading shipping configuration...</p>
    </div>

    <!-- Tabs -->
    <div v-else class="space-y-6">
      <!-- Tab Buttons -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        <div class="flex gap-2">
          <button 
            @click="activeTab = 'standard'"
            :class="[
              'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
              activeTab === 'standard' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            <q-icon name="local_shipping" size="22px" />
            Standard Shipping
          </button>
          <button 
            @click="activeTab = 'premium'"
            :class="[
              'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
              activeTab === 'premium' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' 
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            <q-icon name="bolt" size="22px" />
            Premium Shipping
          </button>
        </div>
      </div>

      <!-- Standard Shipping Form -->
      <div v-show="activeTab === 'standard'" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-500 to-blue-600">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <q-icon name="local_shipping" size="28px" class="text-white" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Standard Shipping</h2>
              <p class="text-blue-100 text-sm">Affordable shipping with standard delivery times</p>
            </div>
          </div>
        </div>

        <form @submit.prevent="saveConfig" class="p-6 space-y-6">
          <!-- Price per Kg -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Price per Kilogram (฿)</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">฿</span>
              <input 
                v-model.number="form.standard.pricePerKg"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="30"
                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg"
              />
            </div>
            <p class="text-sm text-gray-500 mt-1">The shipping cost per kilogram of product weight</p>
          </div>

          <!-- Delivery Days -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Minimum Days</label>
              <input 
                v-model.number="form.standard.minDays"
                type="number"
                min="1"
                required
                placeholder="3"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg"
              />
              <p class="text-sm text-gray-500 mt-1">Shortest delivery time</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Maximum Days</label>
              <input 
                v-model.number="form.standard.maxDays"
                type="number"
                min="1"
                required
                placeholder="5"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg"
              />
              <p class="text-sm text-gray-500 mt-1">Longest delivery time</p>
            </div>
          </div>

          <!-- Preview -->
          <div class="bg-blue-50 rounded-xl p-4">
            <div class="flex items-center gap-3">
              <q-icon name="info" size="24px" class="text-blue-600" />
              <div>
                <p class="font-medium text-blue-800">Delivery Estimate Preview</p>
                <p class="text-blue-600">{{ form.standard.minDays }}-{{ form.standard.maxDays }} business days at ฿{{ form.standard.pricePerKg }}/kg</p>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <button 
            type="submit"
            :disabled="saving"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <q-spinner v-if="saving" color="white" size="20px" />
            <q-icon v-else name="save" size="20px" />
            {{ saving ? 'Saving...' : 'Save Standard Settings' }}
          </button>
        </form>
      </div>

      <!-- Premium Shipping Form -->
      <div v-show="activeTab === 'premium'" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-500 to-orange-600">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <q-icon name="bolt" size="28px" class="text-white" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Premium Shipping</h2>
              <p class="text-amber-100 text-sm">Express delivery for faster shipping</p>
            </div>
          </div>
        </div>

        <form @submit.prevent="saveConfig" class="p-6 space-y-6">
          <!-- Price per Kg -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Price per Kilogram (฿)</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">฿</span>
              <input 
                v-model.number="form.premium.pricePerKg"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="50"
                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-lg"
              />
            </div>
            <p class="text-sm text-gray-500 mt-1">The shipping cost per kilogram of product weight</p>
          </div>

          <!-- Delivery Days -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Minimum Days</label>
              <input 
                v-model.number="form.premium.minDays"
                type="number"
                min="1"
                required
                placeholder="1"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-lg"
              />
              <p class="text-sm text-gray-500 mt-1">Shortest delivery time</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Maximum Days</label>
              <input 
                v-model.number="form.premium.maxDays"
                type="number"
                min="1"
                required
                placeholder="2"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-lg"
              />
              <p class="text-sm text-gray-500 mt-1">Longest delivery time</p>
            </div>
          </div>

          <!-- Preview -->
          <div class="bg-amber-50 rounded-xl p-4">
            <div class="flex items-center gap-3">
              <q-icon name="info" size="24px" class="text-amber-600" />
              <div>
                <p class="font-medium text-amber-800">Delivery Estimate Preview</p>
                <p class="text-amber-600">{{ form.premium.minDays }}-{{ form.premium.maxDays }} business days at ฿{{ form.premium.pricePerKg }}/kg</p>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <button 
            type="submit"
            :disabled="saving"
            class="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <q-spinner v-if="saving" color="white" size="20px" />
            <q-icon v-else name="save" size="20px" />
            {{ saving ? 'Saving...' : 'Save Premium Settings' }}
          </button>
        </form>
      </div>

      <!-- Shipping Calculator Preview -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-6 border-b border-gray-100">
          <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <q-icon name="calculate" size="24px" class="text-gray-400" />
            Shipping Calculator Preview
          </h3>
          <p class="text-gray-500 text-sm mt-1">See how shipping costs are calculated for customers</p>
        </div>

        <div class="p-6">
          <div class="flex items-center gap-4 mb-6">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-2">Sample Weight (kg)</label>
              <input 
                v-model.number="sampleWeight"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="1"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Standard Preview -->
            <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div class="flex items-center gap-2 mb-3">
                <q-icon name="local_shipping" size="20px" class="text-blue-600" />
                <span class="font-semibold text-blue-800">Standard</span>
              </div>
              <div class="text-2xl font-bold text-blue-800 mb-1">
                ฿{{ calculateShipping('standard') }}
              </div>
              <div class="text-sm text-blue-600">
                {{ form.standard.minDays }}-{{ form.standard.maxDays }} business days
              </div>
            </div>

            <!-- Premium Preview -->
            <div class="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div class="flex items-center gap-2 mb-3">
                <q-icon name="bolt" size="20px" class="text-amber-600" />
                <span class="font-semibold text-amber-800">Premium</span>
              </div>
              <div class="text-2xl font-bold text-amber-800 mb-1">
                ฿{{ calculateShipping('premium') }}
              </div>
              <div class="text-sm text-amber-600">
                {{ form.premium.minDays }}-{{ form.premium.maxDays }} business days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../boot/axios';

// State
const activeTab = ref('standard');
const loading = ref(false);
const saving = ref(false);
const sampleWeight = ref(1);

const form = ref({
  standard: {
    pricePerKg: 30,
    minDays: 3,
    maxDays: 5
  },
  premium: {
    pricePerKg: 50,
    minDays: 1,
    maxDays: 2
  }
});

// Methods
const loadConfig = async () => {
  loading.value = true;
  try {
    const res = await api.get('/shippingConfig');
    if (res.data && res.data.config) {
      if (res.data.config.standard) {
        form.value.standard = res.data.config.standard;
      }
      if (res.data.config.premium) {
        form.value.premium = res.data.config.premium;
      }
    }
  } catch (err) {
    console.error('Error loading shipping config:', err);
    // Use defaults if config doesn't exist
  } finally {
    loading.value = false;
  }
};

const saveConfig = async () => {
  // Validation
  if (form.value.standard.minDays > form.value.standard.maxDays) {
    alert('Standard shipping: Minimum days cannot be greater than maximum days');
    return;
  }
  if (form.value.premium.minDays > form.value.premium.maxDays) {
    alert('Premium shipping: Minimum days cannot be greater than maximum days');
    return;
  }

  saving.value = true;
  try {
    await api.put('/shippingConfig', {
      standard: form.value.standard,
      premium: form.value.premium
    });
    alert('Shipping configuration saved successfully!');
  } catch (err) {
    console.error('Error saving shipping config:', err);
    alert('Failed to save shipping configuration: ' + (err.response?.data?.error || err.message));
  } finally {
    saving.value = false;
  }
};

const calculateShipping = (type) => {
  const config = form.value[type];
  const cost = (sampleWeight.value || 0) * (config.pricePerKg || 0);
  return cost.toFixed(2);
};

// Lifecycle
onMounted(() => {
  loadConfig();
});

// Expose refresh method for parent
defineExpose({ refresh: loadConfig });
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
