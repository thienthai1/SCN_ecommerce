<template>
  <div class="admin-users">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Users</h1>
        <p class="text-gray-500 text-sm mt-1">Manage registered users and view their orders</p>
      </div>
      <button 
        @click="loadUsers"
        :disabled="loading"
        class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
      >
        <q-icon name="refresh" size="20px" :class="{ 'animate-spin': loading }" />
        Refresh
      </button>
    </div>

    <!-- Stats Bar -->
    <div v-if="!loading && users.length" class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-gray-800">{{ users.length }}</div>
        <div class="text-sm text-gray-500">Total Users</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-green-600">{{ activeUsersCount }}</div>
        <div class="text-sm text-gray-500">Active Users</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-blue-600">{{ usersWithOrdersCount }}</div>
        <div class="text-sm text-gray-500">Users with Orders</div>
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
      <div class="relative">
        <q-icon name="search" size="20px" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by name, username, email or phone..."
          class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <q-spinner color="red" size="40px" class="mb-4" />
      <p class="text-gray-500">Loading users...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredUsers.length === 0" class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <q-icon name="people" size="40px" class="text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 mb-2">No users found</h3>
      <p class="text-gray-500">Users will appear here when they register</p>
    </div>

    <!-- Users List -->
    <div v-else class="space-y-4">
      <div 
        v-for="user in filteredUsers" 
        :key="user.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <!-- User Header -->
        <div class="p-4 sm:p-6 border-b border-gray-100">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <span class="text-white font-bold text-lg">{{ getInitials(user.name) }}</span>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="font-bold text-gray-800">{{ user.name }}</div>
                  <span v-if="user.is_active !== false" class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Active
                  </span>
                  <span v-else class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Inactive
                  </span>
                </div>
                <p class="text-sm text-gray-500 mt-0.5">@{{ user.username }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-500">
              <span class="flex items-center gap-1">
                <q-icon name="calendar_today" size="16px" />
                {{ formatDate(user.created_at) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="p-4 sm:px-6 bg-gray-50/50 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-gray-500 block mb-1">Email</span>
            <span class="font-medium text-gray-800">{{ user.email || '—' }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-1">Phone</span>
            <span class="font-medium text-gray-800">{{ user.phone || '—' }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-1">Orders</span>
            <span class="font-medium text-gray-800">{{ userOrderCounts[user.id] || 0 }} orders</span>
          </div>
        </div>

        <!-- User Actions -->
        <div class="p-4 sm:px-6 flex flex-wrap items-center gap-3">
          <button 
            @click="toggleExpand(user.id)"
            :disabled="loadingOrders[user.id]"
            class="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            <q-spinner v-if="loadingOrders[user.id]" size="18px" color="gray" />
            <q-icon v-else :name="expanded[user.id] ? 'expand_less' : 'expand_more'" size="20px" />
            {{ expanded[user.id] ? 'Hide Orders' : 'View Orders' }}
          </button>
        </div>

        <!-- Expanded Order Details -->
        <transition name="slide">
          <div v-if="expanded[user.id]" class="border-t border-gray-100">
            <div class="p-4 sm:p-6">
              <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <q-icon name="shopping_bag" size="20px" class="text-gray-400" />
                Order History ({{ userOrders[user.id]?.length || 0 }})
              </h4>
              
              <!-- No Orders -->
              <div v-if="!userOrders[user.id] || userOrders[user.id].length === 0" class="text-center text-gray-500 py-6">
                No orders from this user
              </div>
              
              <!-- Orders List -->
              <div v-else class="space-y-4">
                <div 
                  v-for="order in userOrders[user.id]" 
                  :key="order.id"
                  class="bg-gray-50 rounded-xl p-4"
                >
                  <!-- Order Header -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div class="font-medium text-gray-800">{{ order.order_token }}</div>
                      <div class="text-xs text-gray-500">{{ formatDate(order.created_at) }}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span :class="['px-2 py-1 rounded-full text-xs font-medium', getStatusClass(order.status)]">
                        {{ capitalizeFirst(order.status) }}
                      </span>
                      <span class="font-bold text-gray-800">{{ formatCurrency(order.total_price) }}</span>
                    </div>
                  </div>
                  
                  <!-- Order Items -->
                  <div class="space-y-2">
                    <div 
                      v-for="item in order.order_items" 
                      :key="item.id"
                      class="flex items-center gap-3 p-2 bg-white rounded-lg"
                    >
                      <div class="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <img v-if="item.product?.imageUrl" :src="item.product.imageUrl" class="w-full h-full object-cover" />
                        <img v-else-if="item.options?.imageUrl" :src="item.options.imageUrl" class="w-full h-full object-cover" />
                        <img v-else-if="item.product_imageUrl" :src="item.product_imageUrl" class="w-full h-full object-cover" />
                        <div v-else class="w-full h-full flex items-center justify-center">
                          <q-icon name="image" size="18px" class="text-gray-400" />
                        </div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-800 truncate">{{ item.product?.name || item.product_name || 'Unknown Product' }}</p>
                        <p v-if="item.options" class="text-xs text-gray-500">
                          {{ item.options.variant }}: {{ item.options.name }}
                        </p>
                      </div>
                      <div class="text-right text-sm">
                        <div class="font-medium text-gray-800">{{ formatCurrency(item.price) }}</div>
                        <div class="text-xs text-gray-500">x{{ item.quantity }}</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Order Footer -->
                  <div class="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span class="flex items-center gap-1">
                      <q-icon name="local_shipping" size="14px" />
                      {{ order.shipping_type ? capitalizeFirst(order.shipping_type) : 'Standard' }} ({{ formatCurrency(order.shipping_price || 0) }})
                    </span>
                    <span v-if="order.shipped_address" class="flex items-center gap-1">
                      <q-icon name="location_on" size="14px" />
                      {{ truncateText(order.shipped_address, 30) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../../boot/axios';

// State
const users = ref([]);
const loading = ref(false);
const expanded = ref({});
const userOrders = ref({});
const userOrderCounts = ref({});
const loadingOrders = ref({});
const searchQuery = ref('');

// Computed
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  
  const query = searchQuery.value.toLowerCase();
  return users.value.filter(u => 
    u.name?.toLowerCase().includes(query) || 
    u.username?.toLowerCase().includes(query) ||
    u.email?.toLowerCase().includes(query) ||
    u.phone?.toLowerCase().includes(query)
  );
});

const activeUsersCount = computed(() => 
  users.value.filter(u => u.is_active !== false).length
);

const usersWithOrdersCount = computed(() => 
  Object.values(userOrderCounts.value).filter(count => count > 0).length
);

// Methods
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '฿0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB' }).format(Number(value));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const getStatusClass = (status) => {
  const classes = {
    'pending': 'bg-yellow-100 text-yellow-700',
    'paid': 'bg-green-100 text-green-700',
    'shipped': 'bg-blue-100 text-blue-700',
    'completed': 'bg-emerald-100 text-emerald-700',
    'delivered': 'bg-emerald-100 text-emerald-700',
    'cancel': 'bg-red-100 text-red-700',
    'cancelled': 'bg-red-100 text-red-700'
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const res = await api.get('/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    users.value = res.data.users || [];
    expanded.value = {};
    userOrders.value = {};
    
    // Fetch order counts for all users
    await loadOrderCounts();
  } catch (err) {
    console.error('Error loading users:', err);
    alert('Failed to load users: ' + (err.response?.data?.error || err.message));
  } finally {
    loading.value = false;
  }
};

const loadOrderCounts = async () => {
  // For each user, we'll fetch their orders to get the count
  // This is done in parallel for efficiency
  const promises = users.value.map(async (user) => {
    try {
      const res = await api.get(`/getordersbyuser/${user.id}`);
      const orders = res.data.orders || [];
      userOrderCounts.value[user.id] = orders.length;
    } catch (err) {
      userOrderCounts.value[user.id] = 0;
    }
  });
  
  await Promise.all(promises);
};

const toggleExpand = async (userId) => {
  if (expanded.value[userId]) {
    expanded.value[userId] = false;
    return;
  }
  
  // Load orders if not already loaded
  if (!userOrders.value[userId]) {
    loadingOrders.value[userId] = true;
    try {
      const res = await api.get(`/getordersbyuser/${userId}`);
      userOrders.value[userId] = res.data.orders || [];
    } catch (err) {
      console.error('Error loading orders for user:', err);
      userOrders.value[userId] = [];
    } finally {
      loadingOrders.value[userId] = false;
    }
  }
  
  expanded.value[userId] = true;
};

// Lifecycle
onMounted(() => {
  loadUsers();
});

// Expose refresh method for parent
defineExpose({ refresh: loadUsers });
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
  max-height: 2000px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
