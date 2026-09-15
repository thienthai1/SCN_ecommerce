<template>
  <div class="admin-login-page min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute inset-0" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
    </div>

    <!-- Login Card -->
    <div class="relative w-full max-w-md">
      <!-- Glow Effect -->
      <div class="absolute -inset-1 bg-gradient-to-r from-red-600 via-pink-500 to-red-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
      
      <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-red-600 to-pink-600 px-8 py-8 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
            <q-icon name="admin_panel_settings" size="36px" class="text-white" />
          </div>
          <h1 class="text-2xl font-bold text-white tracking-wide">Admin Portal</h1>
          <p class="text-red-100 mt-2 text-sm">Sign in to access the dashboard</p>
        </div>

        <!-- Form Section -->
        <div class="p-8">
          <form @submit.prevent="handleLogin" class="space-y-6">
            <!-- Username Input -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-300">Username</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <q-icon name="person" size="20px" class="text-gray-400" />
                </div>
                <input
                  v-model="username"
                  type="text"
                  placeholder="Enter your username"
                  required
                  :disabled="loading"
                  class="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 hover:bg-white/10"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-300">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <q-icon name="lock" size="20px" class="text-gray-400" />
                </div>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your password"
                  required
                  :disabled="loading"
                  class="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 hover:bg-white/10"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" size="20px" />
                </button>
              </div>
            </div>

            <!-- Error Message -->
            <transition name="fade">
              <div v-if="error" class="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <q-icon name="error_outline" size="24px" class="text-red-400" />
                <span class="text-red-300 text-sm">{{ error }}</span>
              </div>
            </transition>

            <!-- Login Button -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-red-600/30 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              <q-spinner v-if="loading" color="white" size="20px" />
              <q-icon v-else name="login" size="20px" />
              <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
            </button>
          </form>

          <!-- Footer -->
          <div class="mt-8 pt-6 border-t border-white/10 text-center">
            <p class="text-gray-400 text-sm">
              <q-icon name="security" size="16px" class="mr-1" />
              Secure admin access only
            </p>
          </div>
        </div>
      </div>

      <!-- Back to Store Link -->
      <div class="mt-6 text-center">
        <router-link to="/" class="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <q-icon name="arrow_back" size="18px" />
          Back to Store
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../boot/axios';

const router = useRouter();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

// Check if already logged in
onMounted(() => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    router.push('/admin/dashboard');
  }
});

const handleLogin = async () => {
  error.value = '';
  loading.value = true;

  try {
    const response = await api.post('/user/login', {
      username: username.value,
      password: password.value
    });

    if (response.data.token && username.value === 'admin') {
      // Store auth data
      localStorage.setItem('user_token', response.data.token);
      localStorage.setItem('user_profile', JSON.stringify(response.data.user));
      
      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    }
  } catch (err) {
    if (err.response?.data?.error) {
      error.value = err.response.data.error;
    } else {
      error.value = 'An error occurred. Please try again.';
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 3s ease-in-out infinite;
}
</style>
