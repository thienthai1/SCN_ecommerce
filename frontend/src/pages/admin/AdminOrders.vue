<template>
  <div class="admin-orders">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <span class="text-2xl font-bold text-gray-800">Orders</span>
        <p class="text-gray-500 text-sm mt-1">Manage customer orders</p>
      </div>
      <button 
        @click="loadOrders"
        :disabled="loading"
        class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
      >
        <q-icon name="refresh" size="20px" :class="{ 'animate-spin': loading }" />
        Refresh
      </button>
    </div>

    <!-- Stats Bar -->
    <div v-if="!loading && orders.length" class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-gray-800">{{ orders.length }}</div>
        <div class="text-sm text-gray-500">Total Orders</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-yellow-600">{{ pendingCount }}</div>
        <div class="text-sm text-gray-500">Pending</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-green-600">{{ paidCount }}</div>
        <div class="text-sm text-gray-500">Paid</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-gray-800">{{ formatCurrency(totalRevenue) }}</div>
        <div class="text-sm text-gray-500">Total Revenue</div>
      </div>
    </div>

    <!-- Status Tabs -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
      <!-- Mobile: Grid layout -->
      <div class="grid grid-cols-3 sm:hidden gap-1 p-2">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          :class="[
            'flex flex-col items-center gap-1 p-3 rounded-xl font-medium text-xs transition-all',
            activeTab === tab.value 
              ? getTabActiveClass(tab.value)
              : 'text-gray-500 hover:bg-gray-50'
          ]"
        >
          <q-icon :name="tab.icon" size="22px" />
          <span>{{ tab.label.replace(' Orders', '') }}</span>
          <span :class="[
            'px-2 py-0.5 rounded-full text-xs font-semibold min-w-[24px]',
            activeTab === tab.value 
              ? getTabBadgeActiveClass(tab.value)
              : 'bg-gray-200 text-gray-600'
          ]">
            {{ getTabCount(tab.value) }}
          </span>
        </button>
      </div>
      
      <!-- Desktop: Horizontal tabs -->
      <div class="hidden sm:flex overflow-x-auto">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          :class="[
            'flex items-center gap-2 px-5 py-4 font-medium text-sm whitespace-nowrap transition-all border-b-2 flex-1 justify-center',
            activeTab === tab.value 
              ? getTabActiveClass(tab.value)
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          ]"
        >
          <q-icon :name="tab.icon" size="20px" />
          <span>{{ tab.label }}</span>
          <span :class="[
            'px-2 py-0.5 rounded-full text-xs font-semibold',
            activeTab === tab.value 
              ? getTabBadgeActiveClass(tab.value)
              : 'bg-gray-200 text-gray-600'
          ]">
            {{ getTabCount(tab.value) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
      <div class="relative">
        <q-icon name="search" size="20px" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by customer name or order ID..."
          class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <q-spinner color="red" size="40px" class="mb-4" />
      <p class="text-gray-500">Loading orders...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredOrders.length === 0" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <q-icon name="shopping_cart" size="40px" class="text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No orders found</h3>
      <p class="text-gray-500">Orders will appear here when customers place them</p>
    </div>

    <!-- Orders List -->
    <div v-else class="space-y-4">
      <div 
        v-for="order in filteredOrders" 
        :key="order.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <!-- Order Header -->
        <div class="p-4 sm:p-6 border-b border-gray-100">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <!-- <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <q-icon name="receipt_long" size="24px" class="text-white" />
              </div> -->
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="font-bold text-gray-800">Order #{{ order.id }}</div>
                </div>
                <div v-if="order.order_token" class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">{{ order.order_token }}</div>
                <p class="text-sm text-gray-500 mt-0.5">{{ formatDate(order.created_at) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span :class="['px-3 py-1 rounded-full text-sm font-medium', getStatusClass(order.status)]">
                {{ capitalizeFirst(order.status) }}
              </span>
              <span class="text-lg font-bold text-gray-800">{{ formatCurrency(order.total_price) }}</span>
            </div>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="p-4 sm:px-6 bg-gray-50/50 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-500 block mb-1">Customer</span>
            <span class="font-medium text-gray-800">{{ order.customer_name || 'Unknown' }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-1">Phone</span>
            <span class="font-medium text-gray-800">{{ order.customer_phone || '—' }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-1">Shipping</span>
            <span class="font-medium text-gray-800">{{ order.shipping_type ? capitalizeFirst(order.shipping_type) : '—' }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-1">Address</span>
            <span class="font-medium text-gray-800 line-clamp-1">{{ order.shipped_address || '—' }}</span>
          </div>
        </div>

        <!-- Order Actions -->
        <div class="p-4 sm:px-6 flex flex-wrap items-center gap-3">
          <button 
            @click="toggleExpand(order.id)"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
          >
            <q-icon :name="expanded[order.id] ? 'expand_less' : 'expand_more'" size="20px" />
            {{ expanded[order.id] ? 'Hide Details' : 'View Details' }}
          </button>
          <button 
            @click="openStatusModal(order)"
            class="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium"
          >
            <q-icon name="sync" size="18px" />
            Update Status
          </button>
        </div>

        <!-- Expanded Details -->
        <transition name="slide">
          <div v-if="expanded[order.id]" class="border-t border-gray-100">
            <!-- Order Items -->
            <div class="p-4 sm:p-6">
              <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <q-icon name="shopping_bag" size="20px" class="text-gray-400" />
                Order Items ({{ order.order_items?.length || 0 }})
              </h4>
              <div v-if="order.order_items && order.order_items.length" class="grid gap-3">
                <div
                  v-for="item in order.order_items"
                  :key="item.id"
                  class="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
                >
                  <div class="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <img v-if="item.product?.imageUrl" :src="item.product.imageUrl" class="w-full h-full object-cover" />
                    <img v-else-if="item.options?.imageUrl" :src="item.options.imageUrl" class="w-full h-full object-cover" />
                    <img v-else-if="item.product_imageUrl" :src="item.product_imageUrl" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center">
                      <q-icon name="image" size="24px" class="text-gray-400" />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h5 class="font-medium text-gray-800 truncate">{{ item.product?.name || item.product_name || item.product_id }}</h5>
                    <p v-if="item.product?.category_name || item.product_category" class="text-xs text-gray-500">{{ item.product?.category_name || item.product_category }}</p>
                    <p v-if="item.options" class="text-xs text-gray-500 mt-1">
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                        {{ item.options.variant }}: {{ item.options.name }}
                      </span>
                    </p>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold text-gray-800">{{ formatCurrency(item.price) }}</div>
                    <div class="text-sm text-gray-500">Qty: {{ item.quantity }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-gray-500 py-6">No items in this order</div>
            </div>

            <!-- Payment Slips -->
            <div class="p-4 sm:p-6 border-t border-gray-100">
              <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <q-icon name="receipt" size="20px" class="text-gray-400" />
                Payment Slips ({{ order.slipped_images?.length || 0 }})
              </h4>
              <div v-if="order.slipped_images && order.slipped_images.length" class="flex flex-wrap gap-3">
                <div 
                  v-for="img in order.slipped_images" 
                  :key="img.id"
                  @click="openImage(img.imageUrl)"
                  class="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-gray-200 hover:border-red-300"
                >
                  <img :src="img.imageUrl" class="w-full h-full object-cover" />
                </div>
              </div>
              <div v-else class="text-center text-gray-500 py-6">No payment slips uploaded</div>
              
              <button 
                v-if="order.slipped_images && order.slipped_images.length && order.status === 'pending'"
                @click="rejectPayment(order)"
                :disabled="rejectingPayment === order.id"
                class="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                <q-spinner v-if="rejectingPayment === order.id" color="white" size="16px" />
                <q-icon v-else name="cancel" size="18px" />
                Reject Payment
              </button>
            </div>

            <!-- Order Summary -->
            <div class="p-4 sm:p-6 border-t border-gray-100 bg-gray-50">
              <div class="max-w-xs ml-auto space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Subtotal</span>
                  <span class="text-gray-800">{{ formatCurrency(calculateSubtotal(order)) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Shipping</span>
                  <span class="text-gray-800">{{ formatCurrency(order.shipping_price || 0) }}</span>
                </div>
                <div class="flex justify-between font-semibold pt-2 border-t border-gray-200">
                  <span class="text-gray-800">Total</span>
                  <span class="text-gray-800">{{ formatCurrency(order.total_price) }}</span>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Image Modal -->
    <div v-if="imageModal" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" @click="imageModal = null">
      <img :src="imageModal" class="max-w-full max-h-full rounded-lg" />
    </div>

    <!-- Status Update Modal -->
    <div v-if="statusModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="closeStatusModal">
      <div class="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <span class="text-xl font-bold text-gray-800">Update Order Status</span>
            <button @click="closeStatusModal" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <q-icon name="close" size="20px" class="text-gray-500" />
            </button>
          </div>
        </div>

        <div class="p-6">
          <p class="text-gray-600 mb-4">Order #{{ truncateId(selectedOrder?.id) }}</p>
          <p class="text-sm text-gray-500 mb-6">
            Current status: 
            <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', getStatusClass(selectedOrder?.status)]">
              {{ capitalizeFirst(selectedOrder?.status) }}
            </span>
          </p>

          <div class="space-y-3">
            <label 
              v-for="status in statusOptions" 
              :key="status.value"
              :class="[
                'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                selectedStatus === status.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <input type="radio" v-model="selectedStatus" :value="status.value" class="sr-only" />
              <div :class="['w-10 h-10 rounded-lg flex items-center justify-center text-lg', status.bgColor]">
                {{ status.icon }}
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-800">{{ status.label }}</div>
                <div class="text-sm text-gray-500">{{ status.description }}</div>
              </div>
              <div v-if="selectedStatus === status.value" class="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <q-icon name="check" size="14px" class="text-white" />
              </div>
            </label>
          </div>
        </div>

        <div class="p-6 border-t border-gray-100 flex gap-3">
          <button 
            @click="closeStatusModal"
            class="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="updateOrderStatus"
            :disabled="updatingStatus || selectedStatus === selectedOrder?.status"
            class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <q-spinner v-if="updatingStatus" color="white" size="18px" />
            {{ updatingStatus ? 'Updating...' : 'Update Status' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../../boot/axios';

// State
const orders = ref([]);
const loading = ref(false);
const expanded = ref({});
const imageModal = ref(null);
const statusModal = ref(false);
const selectedOrder = ref(null);
const selectedStatus = ref('');
const updatingStatus = ref(false);
const rejectingPayment = ref(null);
const searchQuery = ref('');
const filterStatus = ref('');
const activeTab = ref('all');

const statusTabs = [
  { value: 'all', label: 'All Orders', icon: 'list_alt', color: 'gray' },
  { value: 'pending', label: 'Pending', icon: 'hourglass_empty', color: 'yellow' },
  { value: 'paid', label: 'Paid', icon: 'payments', color: 'green' },
  { value: 'shipped', label: 'Shipped', icon: 'local_shipping', color: 'blue' },
  { value: 'cancel', label: 'Rejected', icon: 'cancel', color: 'red' }
];

const statusOptions = [
  { value: 'pending', label: 'Pending', description: 'Order is awaiting payment', icon: '⏳', bgColor: 'bg-yellow-100' },
  { value: 'paid', label: 'Paid', description: 'Payment has been confirmed', icon: '✅', bgColor: 'bg-green-100' },
  { value: 'shipped', label: 'Shipped', description: 'Order has been shipped', icon: '🚚', bgColor: 'bg-blue-100' },
  { value: 'cancel', label: 'Cancelled', description: 'Order has been cancelled', icon: '❌', bgColor: 'bg-red-100' }
];

// Computed
const filteredOrders = computed(() => {
  let result = orders.value;
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(o => 
      o.customer_name?.toLowerCase().includes(query) || 
      o.id?.toLowerCase().includes(query) ||
      o.order_token?.toLowerCase().includes(query)
    );
  }
  
  // Filter by active tab
  if (activeTab.value && activeTab.value !== 'all') {
    result = result.filter(o => o.status === activeTab.value);
  }
  
  return result;
});

const getTabCount = (status) => {
  if (status === 'all') return orders.value.length;
  return orders.value.filter(o => o.status === status).length;
};

const getTabActiveClass = (status) => {
  const classes = {
    'all': 'border-gray-500 text-gray-700 bg-gray-50',
    'pending': 'border-yellow-500 text-yellow-600 bg-yellow-50',
    'paid': 'border-green-500 text-green-600 bg-green-50',
    'shipped': 'border-blue-500 text-blue-600 bg-blue-50',
    'cancel': 'border-red-500 text-red-600 bg-red-50'
  };
  return classes[status] || classes['all'];
};

const getTabBadgeActiveClass = (status) => {
  const classes = {
    'all': 'bg-gray-500 text-white',
    'pending': 'bg-yellow-500 text-white',
    'paid': 'bg-green-500 text-white',
    'shipped': 'bg-blue-500 text-white',
    'cancel': 'bg-red-500 text-white'
  };
  return classes[status] || classes['all'];
};

const pendingCount = computed(() => orders.value.filter(o => o.status === 'pending').length);
const paidCount = computed(() => orders.value.filter(o => o.status === 'paid').length);
const totalRevenue = computed(() => orders.value.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0));

// Methods
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '฿0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB' }).format(Number(value));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const truncateId = (id) => {
  if (!id) return '';
  return id.length > 8 ? id.substring(0, 8) + '...' : id;
};

const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const calculateSubtotal = (order) => {
  const total = Number(order.total_price) || 0;
  const shipping = Number(order.shipping_price) || 0;
  return total - shipping;
};

const getStatusClass = (status) => {
  const classes = {
    'pending': 'bg-yellow-100 text-yellow-700',
    'paid': 'bg-green-100 text-green-700',
    'shipped': 'bg-blue-100 text-blue-700',
    'cancel': 'bg-red-100 text-red-700'
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};

const loadOrders = async () => {
  loading.value = true;
  try {
    const res = await api.get('/getorders');
    orders.value = res.data.orders || [];
    expanded.value = {};
  } catch (err) {
    console.error('Error loading orders:', err);
    alert('Failed to load orders: ' + (err.response?.data?.error || err.message));
  } finally {
    loading.value = false;
  }
};

const toggleExpand = (id) => {
  expanded.value[id] = !expanded.value[id];
};

const openImage = (url) => {
  imageModal.value = url;
};

const openStatusModal = (order) => {
  selectedOrder.value = order;
  selectedStatus.value = order.status || 'pending';
  statusModal.value = true;
};

const closeStatusModal = () => {
  statusModal.value = false;
  selectedOrder.value = null;
  selectedStatus.value = '';
};

const updateOrderStatus = async () => {
  if (!selectedOrder.value || !selectedStatus.value) return;
  if (selectedStatus.value === selectedOrder.value.status) return;

  updatingStatus.value = true;
  try {
    await api.put('/updateorderstatus', {
      id: selectedOrder.value.id,
      status: selectedStatus.value
    });
    
    // Update local state
    const orderIndex = orders.value.findIndex(o => o.id === selectedOrder.value.id);
    if (orderIndex !== -1) {
      orders.value[orderIndex].status = selectedStatus.value;
    }
    
    closeStatusModal();
  } catch (err) {
    console.error('Error updating order status:', err);
    alert('Failed to update order status: ' + (err.response?.data?.error || err.message));
  } finally {
    updatingStatus.value = false;
  }
};

const rejectPayment = async (order) => {
  if (!order || !order.id) return;
  
  const confirmed = confirm(`Are you sure you want to reject the payment for Order #${truncateId(order.id)}?\n\nThis will delete all payment slips and reset the order to pending status.`);
  if (!confirmed) return;

  rejectingPayment.value = order.id;
  try {
    await api.delete(`/rejectPayment/${order.id}`);
    
    // Update local state
    const orderIndex = orders.value.findIndex(o => o.id === order.id);
    if (orderIndex !== -1) {
      orders.value[orderIndex].slipped_images = [];
      orders.value[orderIndex].status = 'pending';
    }
  } catch (err) {
    console.error('Error rejecting payment:', err);
    alert('Failed to reject payment: ' + (err.response?.data?.error || err.message));
  } finally {
    rejectingPayment.value = null;
  }
};

// Lifecycle
onMounted(() => {
  loadOrders();
});

// Expose refresh method for parent
defineExpose({ refresh: loadOrders });
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 1000px;
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
