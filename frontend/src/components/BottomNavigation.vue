<template>
    <!-- Bottom Navigation - Mockup Style -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 pb-[20px]">
      <div class="flex items-center justify-around h-16 px-2">
        <router-link
          v-for="nav in bottomNavItems"
          :key="nav.id"
          :to="nav.route"
          class="flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all duration-200"
          :class="isActive(nav.route) 
            ? 'text-emerald-600' 
            : 'text-gray-400 hover:text-gray-600'"
        >
          <div
            class="p-1.5 rounded-xl transition-all duration-200"
            :class="isActive(nav.route) && 'bg-emerald-50'"
          >
            <q-icon
              :name="nav.icon"
              size="20px"
              :class="isActive(nav.route) ? 'text-emerald-600' : 'text-gray-400'"
            />
          </div>
          <span 
            class="text-[15px] font-medium transition-all"
            :class="isActive(nav.route) && 'text-emerald-600'"
          >
            {{ nav.label }}
          </span>
        </router-link>
      </div>
    </nav>
</template>

<script setup> 
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Check if route is active
const isActive = (path) => {
  return route.path === path
}

// Bottom navigation items matching mockup
const bottomNavItems = [
  { id: 'home', label: 'หน้าแรก', icon: 'eva-home-outline', route: '/' },
  { id: 'orders', label: 'คำสั่งซื้อ', icon: 'eva-archive-outline', route: '/orders' },
  { id: 'browse', label: 'ค้นหา', icon: 'eva-search-outline', route: '/browse' },
]
</script>