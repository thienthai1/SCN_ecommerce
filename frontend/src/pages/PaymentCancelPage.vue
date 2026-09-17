<template>
  <div class="min-h-screen bg-stone-50 flex items-center justify-center px-4">
    <div class="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm text-center">
      <div class="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <q-icon name="payments" size="34px" class="text-amber-600" />
      </div>
      <h1 class="text-xl font-bold text-gray-800">Payment not completed</h1>
      <p class="text-sm text-gray-500 mt-2">Your order is still saved. You can try PromptPay again or use manual bank transfer from Orders.</p>
      <p v-if="errorMessage" class="text-sm text-red-600 mt-3">{{ errorMessage }}</p>
      <button @click="retryPayment" :disabled="isLoading" class="w-full h-11 mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl disabled:opacity-50">
        {{ isLoading ? 'Opening Stripe...' : 'Try PromptPay again' }}
      </button>
      <button @click="$router.push('/orders')" class="w-full h-11 mt-2 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50">
        Go to Orders
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from 'src/boot/axios'

const route = useRoute()
const isLoading = ref(false)
const errorMessage = ref('')

async function retryPayment() {
  if (!route.query.orderId) {
    errorMessage.value = 'Order ID is missing.'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.post('/payments/stripe/checkout-session', { orderId: route.query.orderId })
    window.location.assign(data.checkoutUrl)
  } catch (error) {
    errorMessage.value = error.response?.data?.error || 'Unable to open Stripe Checkout.'
    isLoading.value = false
  }
}
</script>
