<template>
  <div class="admin-dashboard min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 transform transition-transform duration-300 lg:translate-x-0 flex flex-col',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-6 py-6 border-b border-white/10 flex-shrink-0">
        <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
          <q-icon name="dashboard" size="24px" class="text-white" />
        </div>
        <div>
          <span class="text-white font-bold text-lg">Admin Panel</span>
          <p class="text-gray-400 text-xs">Marketplace Manager</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="px-4 py-6 space-y-2 flex-1 overflow-y-auto">
        <a
          v-for="item in navItems"
          :key="item.name"
          @click="navigateTo(item.name)"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200',
            currentPage === item.name 
              ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-600/30' 
              : 'text-gray-300 hover:bg-white/5 hover:text-white'
          ]"
        >
          <q-icon :name="item.icon" size="22px" />
          <span class="font-medium">{{ item.label }}</span>
          <span v-if="item.badge" class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {{ item.badge }}
          </span>
        </a>
      </nav>

      <!-- User Info (Bottom) -->
      <div class="p-4 border-t border-white/10 flex-shrink-0">
        <div class="flex items-center gap-3 px-2">
          <div class="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
            <q-icon name="person" size="22px" class="text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-white font-medium text-sm truncate">{{ adminUser?.username || 'Admin' }}</p>
            <p class="text-gray-400 text-xs">Administrator</p>
          </div>
          <button 
            @click="handleLogout"
            class="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
            title="Logout"
          >
            <q-icon name="logout" size="20px" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Overlay -->
    <div 
      v-if="sidebarOpen" 
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
    ></div>

    <!-- Main Content -->
    <div class="lg:ml-64">
      <!-- Top Header -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div class="flex items-center justify-between px-4 lg:px-8 py-4">
          <!-- Mobile Menu Button -->
          <button 
            @click="sidebarOpen = true"
            class="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <q-icon name="menu" size="24px" />
          </button>

          <!-- Page Title -->
          <div class="hidden lg:block">
            <h2 class="text-xl font-bold text-gray-800">{{ currentNavItem?.label || 'Dashboard' }}</h2>
            <p class="text-sm text-gray-500">Welcome back, {{ adminUser?.username || 'Admin' }}!</p>
          </div>

          <!-- Header Actions -->
          <div class="flex justify-end gap-3">

            <!-- Refresh -->
            <button 
              @click="refreshData"
              class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg bg-red-500"
              :class="{ 'animate-spin': refreshing }"
            >
              <q-icon name="refresh" size="22px" color="white" />
            </button>
          </div>
        </div>
      </header>

      <!-- Dashboard Content -->
      <main class="p-4 lg:p-8">
        <!-- Dashboard View -->
        <template v-if="currentPage === 'dashboard'">
          <!-- Stats Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div 
              v-for="stat in stats" 
              :key="stat.label"
              class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div class="flex items-center justify-between mb-4">
                <div :class="['w-12 h-12 rounded-xl flex items-center justify-center', stat.bgColor]">
                  <q-icon :name="stat.icon" size="24px" :class="stat.iconColor" />
                </div>
                <span :class="['text-sm font-medium flex items-center gap-1', stat.trend > 0 ? 'text-green-600' : 'text-red-600']">
                  <q-icon :name="stat.trend > 0 ? 'trending_up' : 'trending_down'" size="16px" />
                  {{ Math.abs(stat.trend) }}%
                </span>
              </div>
              <h3 class="text-2xl font-bold text-gray-800">{{ stat.value }}</h3>
              <p class="text-sm text-gray-500 mt-1">{{ stat.label }}</p>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
            <span class="text-lg font-bold text-gray-800 mb-4">Quick Actions</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <button 
                v-for="action in quickActions" 
                :key="action.label"
                @click="handleQuickAction(action)"
                class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all group"
              >
                <div :class="['w-12 h-12 rounded-xl flex items-center justify-center transition-colors', action.bgColor, 'group-hover:scale-110 transform transition-transform']">
                  <q-icon :name="action.icon" size="24px" class="text-white" />
                </div>
                <span class="text-sm font-medium text-gray-700 group-hover:text-red-600">{{ action.label }}</span>
              </button>
            </div>
          </div>

          <!-- Recent Orders & Activity -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Recent Orders -->
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div class="flex items-center justify-between mb-6">
                <span class="text-lg font-bold text-gray-800">Recent Orders</span>
                <button @click="currentPage = 'orders'" class="text-red-600 hover:text-red-700 text-sm font-medium">View All</button>
              </div>
              
              <!-- Loading State -->
              <div v-if="loadingOrders" class="flex items-center justify-center py-8">
                <q-spinner color="red" size="32px" />
              </div>
              
              <!-- Empty State -->
              <div v-else-if="recentOrders.length === 0" class="text-center py-8">
                <q-icon name="shopping_cart" size="48px" class="text-gray-300 mb-2" />
                <p class="text-gray-500">No orders yet</p>
              </div>
              
              <!-- Orders List -->
              <div v-else class="space-y-4">
                <div 
                  v-for="order in recentOrders" 
                  :key="order.id"
                  class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  @click="currentPage = 'orders'"
                >
                  <div class="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <q-icon name="shopping_bag" size="20px" class="text-gray-600" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-800 truncate">{{ order.customer }}</p>
                    <p class="text-sm text-gray-500">{{ order.items }} item{{ order.items !== 1 ? 's' : '' }} • {{ order.date }}</p>
                  </div>
                  <div class="text-right">
                    <p class="font-bold text-gray-800">{{ order.total }}</p>
                    <span :class="['text-xs px-2 py-1 rounded-full', getStatusClass(order.status)]">
                      {{ order.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </template>

        <!-- Orders View -->
        <AdminOrders v-else-if="currentPage === 'orders'" ref="ordersRef" />

        <!-- Products View -->
        <AdminProducts v-else-if="currentPage === 'products'" ref="productsRef" />

        <!-- Categories View -->
        <AdminCategories v-else-if="currentPage === 'categories'" ref="categoriesRef" />

        <!-- Shipment View -->
        <AdminShipment v-else-if="currentPage === 'shipment'" ref="shipmentRef" />

        <!-- Payment Gateway View -->
        <AdminPayment v-else-if="currentPage === 'payment'" ref="paymentRef" />

        <!-- Notifications View -->
        <AdminNotifications v-else-if="currentPage === 'notifications'" ref="notificationsRef" />

        <!-- Scheduled Notifications View -->
        <AdminSchedule v-else-if="currentPage === 'schedule'" ref="scheduleRef" />

        <!-- Users View -->
        <AdminUsers v-else-if="currentPage === 'users'" ref="usersRef" />

        <!-- Banners View -->
        <AdminBanners v-else-if="currentPage === 'banners'" ref="bannersRef" />

        <!-- Placeholder for other pages -->
        <div v-else class="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <q-icon name="construction" size="40px" class="text-gray-400" />
          </div>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">{{ currentNavItem?.label }}</h3>
          <p class="text-gray-500">This section is coming soon</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../boot/axios';
import AdminOrders from './AdminOrders.vue';
import AdminProducts from './AdminProducts.vue';
import AdminCategories from './AdminCategories.vue';
import AdminShipment from './AdminShipment.vue';
import AdminPayment from './AdminPayment.vue';
import AdminNotifications from './AdminNotifications.vue';
import AdminSchedule from './AdminSchedule.vue';
import AdminUsers from './AdminUsers.vue';
import AdminBanners from './AdminBanners.vue';

const router = useRouter();
const sidebarOpen = ref(false);
const currentPage = ref(localStorage.getItem('admin_current_page') || 'dashboard');

// Save current page to localStorage when it changes
watch(currentPage, (newPage) => {
  localStorage.setItem('admin_current_page', newPage);
});
const refreshing = ref(false);
const adminUser = ref(null);
const ordersRef = ref(null);
const productsRef = ref(null);
const categoriesRef = ref(null);
const shipmentRef = ref(null);
const paymentRef = ref(null);
const notificationsRef = ref(null);
const scheduleRef = ref(null);
const usersRef = ref(null);
const bannersRef = ref(null);

// Navigation items
const navItems = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { name: 'orders', label: 'Orders', icon: 'shopping_cart' },
  { name: 'products', label: 'Products', icon: 'inventory_2' },
  { name: 'categories', label: 'Categories', icon: 'category' },
  { name: 'banners', label: 'Banners', icon: 'photo_library' },
  { name: 'users', label: 'Users', icon: 'people' },
  { name: 'shipment', label: 'Shipment', icon: 'local_shipping' },
  { name: 'payment', label: 'Payment Gateway', icon: 'credit_card' },
  { name: 'notifications', label: 'Notifications', icon: 'notifications' },
  { name: 'schedule', label: 'Schedule', icon: 'access_time' }
];

const currentNavItem = computed(() => navItems.find(item => item.name === currentPage.value));

// Stats data
const stats = ref([
  { label: 'Total Revenue', value: '฿124,500', icon: 'payments', bgColor: 'bg-green-100', iconColor: 'text-green-600', trend: 12.5 },
  { label: 'Total Orders', value: '1,234', icon: 'shopping_cart', bgColor: 'bg-blue-100', iconColor: 'text-blue-600', trend: 8.2 },
  { label: 'Products', value: '256', icon: 'inventory_2', bgColor: 'bg-purple-100', iconColor: 'text-purple-600', trend: 3.1 },
  { label: 'Customers', value: '892', icon: 'people', bgColor: 'bg-orange-100', iconColor: 'text-orange-600', trend: -2.4 },
]);

// Quick actions
const quickActions = [
  { label: 'Add Product', icon: 'add_box', bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600', action: 'products' },
  { label: 'View Orders', icon: 'shopping_cart', bgColor: 'bg-gradient-to-br from-green-500 to-green-600', action: 'orders' },
  { label: 'Add Category', icon: 'create_new_folder', bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600', action: 'categories' },
  { label: 'Send Notice', icon: 'campaign', bgColor: 'bg-gradient-to-br from-orange-500 to-orange-600', action: 'notifications' },
];

// Recent orders (fetched from API)
const recentOrders = ref([]);
const loadingOrders = ref(false);

// Load recent orders from API
const loadRecentOrders = async () => {
  loadingOrders.value = true;
  try {
    const res = await api.get('/getorders');
    const orders = res.data.orders || [];
    
    // Sort by created_at (latest first) and take first 5
    const sortedOrders = orders
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(order => ({
        id: order.id,
        customer: order.customer_name || 'Guest',
        items: order.order_items?.length || 0,
        date: formatOrderDate(order.created_at),
        total: `฿${(order.total_price || 0).toLocaleString('en-US')}`,
        status: order.status || 'pending'
      }));
    
    recentOrders.value = sortedOrders;
  } catch (err) {
    console.error('Error loading recent orders:', err);
  } finally {
    loadingOrders.value = false;
  }
};

// Format order date
const formatOrderDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return diffDays + ' days ago';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

// Activity log (sample data)
const activityLog = ref([
  { id: 1, message: 'New order #1234 received', time: '5 minutes ago', icon: 'shopping_cart', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  { id: 2, message: 'Product "iPhone Case" stock updated', time: '15 minutes ago', icon: 'inventory_2', bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  { id: 3, message: 'New customer registration', time: '1 hour ago', icon: 'person_add', bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  { id: 4, message: 'Order #1230 marked as delivered', time: '2 hours ago', icon: 'local_shipping', bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
]);

// Get status class for order badges
const getStatusClass = (status) => {
  const classes = {
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Processing': 'bg-blue-100 text-blue-700',
    'Shipped': 'bg-purple-100 text-purple-700',
    'Delivered': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};

// Handle quick action clicks
const handleQuickAction = (action) => {
  if (action.action) {
    currentPage.value = action.action;
  }
};

// Check authentication on mount
onMounted(async () => {
  // Fetch profile and verify admin access
  try {
    const response = await api.get('/profile')
    const profile = response.data
    adminUser.value = profile
    
    // Check if user is admin
    if (profile.username !== 'admin') {
      router.push('/')
      return
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    router.push('/')
    return
  }
  
  // Load recent orders for dashboard
  loadRecentOrders();
});

// Logout handler
const handleLogout = async () => {
  try {
    await api.post('/user/logout');
  } catch (error) {
    console.warn('Server logout failed; clearing the local session.', error);
  } finally {
    localStorage.removeItem('user_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('admin_current_page');
    sessionStorage.removeItem('redirectAfterLogin');
    await router.replace('/admin/login');
  }
};

// Navigate to page and close sidebar on mobile
const navigateTo = (pageName) => {
  currentPage.value = pageName;
  sidebarOpen.value = false;
};

// Refresh data
const refreshData = () => {
  refreshing.value = true;
  
  // Refresh dashboard data
  if (currentPage.value === 'dashboard') {
    loadRecentOrders();
  }
  
  // Refresh current page data
  if (currentPage.value === 'orders' && ordersRef.value) {
    ordersRef.value.refresh();
  } else if (currentPage.value === 'products' && productsRef.value) {
    productsRef.value.refresh();
  } else if (currentPage.value === 'categories' && categoriesRef.value) {
    categoriesRef.value.refresh();
  } else if (currentPage.value === 'shipment' && shipmentRef.value) {
    shipmentRef.value.refresh();
  } else if (currentPage.value === 'payment' && paymentRef.value) {
    paymentRef.value.refresh();
  } else if (currentPage.value === 'notifications' && notificationsRef.value) {
    notificationsRef.value.refresh();
  } else if (currentPage.value === 'schedule' && scheduleRef.value) {
    scheduleRef.value.refresh();
  } else if (currentPage.value === 'banners' && bannersRef.value) {
    bannersRef.value.refresh();
  }
  
  setTimeout(() => {
    refreshing.value = false;
  }, 1000);
};
</script>

<style scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
