<template>
  <div class="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
    <div class="w-full max-w-md space-y-6">
      <!-- Logo & Branding -->
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <img
            src="../assets/logo.jpg"
            alt="Logo"
            class="w-20 h-20 rounded-2xl object-cover shadow-md"
          />
        </div>
        <div>
          <span class="text-2xl font-bold text-gray-800">Create account</span>
        </div>
      </div>

      <!-- Sign Up Form -->
      <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <form @submit.prevent="handleRegister" class="space-y-4">
          <!-- First & Last Name -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">First name</label>
              <input
                v-model="form.firstName"
                type="text"
                placeholder="First name"
                required
                :disabled="loading"
                class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">Last name</label>
              <input
                v-model="form.lastName"
                type="text"
                placeholder="Last name"
                required
                :disabled="loading"
                class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <!-- Phone -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Phone number</label>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="Phone number"
              required
              :disabled="loading"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Username -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Username</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="Username"
              required
              :disabled="loading"
              class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Password</label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                required
                minlength="6"
                :disabled="loading"
                class="w-full px-4 py-3 pr-10 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" size="18px" />
              </button>
            </div>
          </div>

          <!-- Confirm Password -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div class="relative">
              <input
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="••••••••"
                required
                minlength="6"
                :disabled="loading"
                class="w-full px-4 py-3 pr-10 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <q-icon :name="showConfirmPassword ? 'visibility_off' : 'visibility'" size="18px" />
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

          <!-- Success Message -->
          <transition name="fade">
            <div v-if="success" class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <q-icon name="check_circle" size="20px" class="text-green-500" />
              <span class="text-green-600 text-sm">{{ success }}</span>
            </div>
          </transition>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <q-spinner v-if="loading" color="white" size="20px" />
            <span>{{ loading ? 'Creating account...' : 'Create account' }}</span>
          </button>
        </form>

        <!-- Sign In Link -->
        <p class="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
          Already have an account?
          <router-link to="/signin" class="text-emerald-600 font-medium hover:underline ml-1">
            Sign in
          </router-link>
        </p>
      </div>

      <!-- Back to Home -->
      <router-link to="/">
        <button class="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
          <q-icon name="arrow_back" size="16px" />
          Back to Home
        </button>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'

const router = useRouter()

const form = reactive({
  firstName: '',
  lastName: '',
  username: '',
  phone: '',
  password: '',
  confirmPassword: ''
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleRegister = async () => {
  error.value = ''
  success.value = ''

  // Validate passwords match
  if (form.password !== form.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true

  try {
    const response = await api.post('/user/register', {
      name: `${form.firstName} ${form.lastName}`.trim(),
      username: form.username,
      phone: form.phone,
      password: form.password
    })

    if (response.data) {
      success.value = 'Account created successfully! Signing you in...'
      
      // Auto login after successful registration
      try {
        const loginResponse = await api.post('/user/login', {
          username: form.username,
          password: form.password
        })

        if (loginResponse.data.token) {
          // Store auth data
          localStorage.setItem('user_token', loginResponse.data.token)

          // Fetch user profile
          try {
            const profileRes = await api.get('/profile', {
              headers: { Authorization: `Bearer ${loginResponse.data.token}` }
            })
            localStorage.setItem('user_profile', JSON.stringify(profileRes.data))
          } catch (profileErr) {
            console.warn('Could not fetch profile:', profileErr)
          }

          // Redirect to home page
          router.push('/')
        }
      } catch (loginErr) {
        // If auto-login fails, redirect to sign in page
        console.warn('Auto-login failed:', loginErr)
        success.value = 'Account created successfully! Redirecting to sign in...'
        setTimeout(() => {
          router.push('/signin')
        }, 2000)
      }
    }
  } catch (err) {
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else if (err.response?.data?.message) {
      error.value = err.response.data.message
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
