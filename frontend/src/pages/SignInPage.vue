<template>
  <div class="min-h-screen bg-stone-50 flex flex-col">
    <!-- Main Content -->
    <div class="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div class="w-full max-w-sm space-y-6">
        <!-- Logo & Branding -->
        <div class="text-center space-y-3">
          <div class="mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-md">
            <img src="../assets/logo.jpg" alt="Sachanon Textile" class="w-full h-full object-cover" />
          </div>
        </div>

        <!-- Sign In Form Card -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div class="p-6">
            <form @submit.prevent="handleLogin" class="space-y-4 mb-4">
              <!-- Username/Phone Input -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">Username or Phone</label>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2">
                    <q-icon name="mail" size="16px" class="text-gray-400" />
                  </div>
                  <input
                    v-model="identifier"
                    type="text"
                    placeholder="Username or Phone"
                    required
                    :disabled="loading"
                    class="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <!-- Password Input -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-sm font-medium text-gray-700">Password</label>
                  <a href="#" class="text-xs text-emerald-600 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div class="relative">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2">
                    <q-icon name="lock" size="16px" class="text-gray-400" />
                  </div>
                  <input
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    required
                    :disabled="loading"
                    class="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" size="16px" />
                  </button>
                </div>
              </div>

              <!-- Error Message -->
              <transition name="fade">
                <div v-if="error" class="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <q-icon name="error_outline" size="20px" class="text-red-500" />
                  <span class="text-red-600 text-sm">{{ error }}</span>
                </div>
              </transition>

              <!-- Submit Button -->
              <button
                type="submit"
                :disabled="loading"
                class="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <q-spinner v-if="loading" color="white" size="20px" />
                <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
              </button>

              <!-- Divider -->
              <!-- <div class="relative py-2">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-200"></div>
                </div>
                <div class="relative flex justify-center">
                  <span class="bg-white px-2 text-xs text-gray-400">or continue with</span>
                </div>
              </div> -->

              <!-- Social Login -->
              <!-- <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  class="h-11 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  class="h-11 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
              </div> -->
            </form>
          </div>
        </div>

        <!-- Sign Up Link -->
        <p class="text-center text-sm text-gray-500">
          Don't have an account?
          <router-link to="/signup" class="text-emerald-600 font-medium hover:underline ml-1">
            Create account
          </router-link>
        </p>

        <!-- Back to Home -->
        <router-link to="/">
          <button class="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
            <q-icon name="arrow_back" size="16px" />
            Back to Home
          </button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'

const router = useRouter()

const identifier = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const getRedirectPath = () => {
  const path = sessionStorage.getItem('redirectAfterLogin') || '/'
  sessionStorage.removeItem('redirectAfterLogin')
  return path
}

onMounted(async () => {
  const token = localStorage.getItem('user_token')
  if (!token) return

  try {
    await api.get('/profile', { headers: { Authorization: 'Bearer ' + token } })
    await router.replace(getRedirectPath())
  } catch {
    localStorage.removeItem('user_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user_profile')
  }
})

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const response = await api.post('/user/login', {
      username: identifier.value,
      password: password.value
    })

    if (response.data.token) {
      // Store auth data
      localStorage.setItem('user_token', response.data.token)

      // Fetch user profile
      try {
        const profileRes = await api.get('/profile', {
          headers: { Authorization: `Bearer ${response.data.token}` }
        })
        localStorage.setItem('user_profile', JSON.stringify(profileRes.data))
      } catch (profileErr) {
        console.warn('Could not fetch profile:', profileErr)
      }

      await router.replace(getRedirectPath())
    }
  } catch (err) {
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'An error occurred. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
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
</style>
