<template>
    <!-- Bottom Navigation - Mockup Style -->
    <nav aria-label="Main navigation" class="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 pb-[20px]">
      <div class="flex items-center justify-around h-16 px-2">
        <router-link
          v-for="nav in bottomNavItems"
          :key="nav.id"
          :to="nav.route"
          :aria-current="isActive(nav.id) ? (route.path === nav.route ? 'page' : 'location') : undefined"
          class="flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all duration-200"
          :class="isActive(nav.id)
            ? 'text-emerald-600' 
            : 'text-gray-400 hover:text-gray-600'"
        >
          <div
            class="p-1.5 rounded-xl transition-all duration-200"
            :class="isActive(nav.id) && 'bg-emerald-50'"
          >
            <q-icon
              :name="nav.icon"
              size="20px"
              :class="isActive(nav.id) ? 'text-emerald-600' : 'text-gray-400'"
            />
          </div>
          <span 
            class="text-[13px] font-medium transition-all"
            :class="isActive(nav.id) && 'text-emerald-600'"
          >
            {{ nav.label }}
          </span>
        </router-link>
      </div>
    </nav>
</template>

<script setup> 
import { useRoute } from 'vue-router'

const route = useRoute()

// Route metadata keeps related pages in the same navigation section.
const isActive = (section) => {
  return route.meta.bottomNav === section
}

// Bottom navigation items matching mockup
const bottomNavItems = [
  { id: 'home', label: 'Home', icon: 'eva-home-outline', route: '/' },
  { id: 'orders', label: 'Orders', icon: 'eva-archive-outline', route: '/orders' },
  { id: 'profile', label: 'Profile', icon: 'eva-person-outline', route: '/profile' },
]
</script>