<template>
  <div class="min-h-screen bg-stone-50 flex items-center justify-center px-4">
    <div class="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm text-center">
      <div
        :class="[
          'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
          isPaid ? 'bg-emerald-100' : 'bg-amber-100',
        ]"
      >
        <q-icon
          :name="isPaid ? 'check_circle' : 'hourglass_top'"
          size="34px"
          :class="isPaid ? 'text-emerald-600' : 'text-amber-600'"
        />
      </div>
      <h1 class="text-xl font-bold text-gray-800">
        {{ isPaid ? "Payment successful" : "Checking your payment" }}
      </h1>
      <p class="text-sm text-gray-500 mt-2">
        {{
          isPaid
            ? "Your PromptPay payment has been confirmed."
            : "Stripe is confirming the payment. This page updates automatically."
        }}
      </p>
      <p v-if="errorMessage" class="text-sm text-red-600 mt-3">
        {{ errorMessage }}
      </p>
      <q-spinner-dots
        v-if="!isPaid && !errorMessage"
        color="green"
        size="36px"
        class="mt-5"
      />
      <button
        @click="returnToPreviousPage"
        class="w-full h-11 mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl"
      >
        {{ isPaid ? "Continue" : "Back to Orders" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "src/boot/axios";

const route = useRoute();
const router = useRouter();
const paymentStatus = ref("processing");
const errorMessage = ref("");
let timer;
let attempts = 0;
const isPaid = computed(() => paymentStatus.value === "paid");

function safeReturnPath() {
  const value = route.query.returnTo;
  return typeof value === "string" &&
    value.charCodeAt(0) === 47 &&
    value.charCodeAt(1) !== 47 &&
    !value.includes(String.fromCharCode(92))
    ? value
    : "/orders";
}

function returnToPreviousPage() {
  const destination = new URL(safeReturnPath(), window.location.origin);
  destination.searchParams.set(
    "paymentUpdated",
    String(route.query.orderId || ""),
  );
  destination.searchParams.set("fresh", String(Date.now()));
  router.replace(destination.pathname + destination.search + destination.hash);
}

async function checkStatus() {
  const orderId = route.query.orderId;
  if (!orderId) {
    errorMessage.value = "Order ID is missing.";
    return;
  }
  try {
    const { data } = await api.get(
      `/payments/stripe/status/${encodeURIComponent(orderId)}`,
    );
    paymentStatus.value = data.paymentStatus;
    if (paymentStatus.value === "paid") {
      timer = window.setTimeout(returnToPreviousPage, 1200);
      return;
    }
    if (["failed", "expired"].includes(paymentStatus.value)) {
      errorMessage.value = `Payment status: ${paymentStatus.value}`;
      return;
    }
    attempts += 1;
    if (attempts < 30) timer = window.setTimeout(checkStatus, 2000);
    else
      errorMessage.value =
        "Confirmation is taking longer than expected. You can check again from Orders.";
  } catch (error) {
    attempts += 1;
    if (attempts < 5) timer = window.setTimeout(checkStatus, 2000);
    else
      errorMessage.value =
        error.response?.data?.error || "Unable to check payment status.";
  }
}

onMounted(checkStatus);
onBeforeUnmount(() => window.clearTimeout(timer));
</script>
