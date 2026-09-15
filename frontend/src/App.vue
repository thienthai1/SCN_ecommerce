<template>
  <!-- Main App Layout -->
  <q-layout view="hHh Lpr lff">
    <!-- App Install Banner - Mobile Only -->
    <AppInstallBanner />

    <Loading :isLoading="isLoading" />

    <q-page-container class="page-container-with-transition">
      <router-view v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

  </q-layout>
</template>

<script setup>
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Loading from './components/Loading.vue';
import AppInstallBanner from './components/AppInstallBanner.vue';

const transitionName = ref('slide-right');

// App loading state - only show on first app mount
const isLoading = ref(true);

onMounted(() => {
  if (isLoading.value) {
    setTimeout(() => {
      isLoading.value = false;
    }, 2000);
  }
});

const router = useRouter();
const route = useRoute();

// Use sessionStorage to keep a numeric index per visited fullPath.
// New entries get a higher index -> forward (slide-right). Lower index -> back (slide-left).
const NAV_INDEX_KEY = 'app_nav_index';
const ROUTE_MAP_KEY = 'app_route_map';

let counter = Number(sessionStorage.getItem(NAV_INDEX_KEY) || 0);
let routeMap = JSON.parse(sessionStorage.getItem(ROUTE_MAP_KEY) || '{}');

// ensure current route has an index
if (!routeMap[route.fullPath]) {
  counter += 1;
  routeMap[route.fullPath] = counter;
  sessionStorage.setItem(NAV_INDEX_KEY, String(counter));
  sessionStorage.setItem(ROUTE_MAP_KEY, JSON.stringify(routeMap));
}

router.beforeEach((to, from, next) => {
  const toIndex = routeMap[to.fullPath];
  const fromIndex = routeMap[from.fullPath];

  if (toIndex === undefined) {
    // new route, consider it forward
    counter += 1;
    routeMap[to.fullPath] = counter;
    sessionStorage.setItem(NAV_INDEX_KEY, String(counter));
    sessionStorage.setItem(ROUTE_MAP_KEY, JSON.stringify(routeMap));
    transitionName.value = 'slide-right';
  } else if (fromIndex === undefined) {
    transitionName.value = 'slide-right';
  } else if (toIndex > fromIndex) {
    transitionName.value = 'slide-right';
  } else {
    transitionName.value = 'slide-left';
  }

  next();
});

</script>

<style scoped>
.page-container-with-transition {
  position: relative;
  overflow: hidden;
}

/* Slide from right for entering page, and slide left when leaving */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 120ms ease-in;
  will-change: transform;
  backface-visibility: hidden;
}
.slide-right-enter-from {
  transform: translateX(100%);
}
.slide-right-enter-to {
  transform: translateX(0%);
}
.slide-right-leave-from {
  transform: translateX(0%);
}
.slide-right-leave-to {
  transform: translateX(-100%);
}

/* Make routed pages take full width so transform behaves predictably */
.slide-right-enter-active > *,
.slide-right-leave-active > * {
  width: 100%;
}

/* Slide-left inverse (enter from left, leave to right) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 120ms ease-in;
  will-change: transform;
  backface-visibility: hidden;
}
.slide-left-enter-from {
  transform: translateX(-100%);
}
.slide-left-enter-to {
  transform: translateX(0%);
}
.slide-left-leave-from {
  transform: translateX(0%);
}
.slide-left-leave-to {
  transform: translateX(100%);
}
.slide-left-enter-active > *,
.slide-left-leave-active > * {
  width: 100%;
}
</style>
