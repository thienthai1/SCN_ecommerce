<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 flex items-center justify-center px-4 pt-2">
    <div class="w-full max-w-lg">
      <div class="bg-white shadow-xl rounded-2xl border border-slate-100 overflow-hidden relative bottom-[40px]">
        <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-white">
          <p class="text-sm uppercase tracking-[0.15em] font-semibold">LINE Registration</p>
          <span class="text-2xl font-bold mt-1">ยืนยันข้อมูลติดต่อของคุณ</span>
        </div>

        <form @submit.prevent="handleRegisterLine" class="p-6 space-y-5">
          <div class="space-y-2">
            <label class="block text-sm font-semibold text-slate-800">เบอร์โทรศัพท์ <span class="text-red-500">*</span></label>
            <input
              v-model="form.phone"
              type="tel"
              required
              placeholder="e.g., 081-234-5678"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
            <p class="text-xs text-slate-500">Use a number reachable for verification.</p>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-semibold text-slate-800">อีเมล</label>
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="you@example.com"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
            <p class="text-xs text-slate-500">We will never share your email without consent.</p>
          </div>

          <div v-if="error" class="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            <span class="font-semibold">Error:</span>
            <span>{{ error }}</span>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-3 shadow-lg shadow-emerald-200 transition"
          >
            <span v-if="!loading">Register & Continue</span>
            <span v-else>Registering...</span>
          </button>

          <p class="text-xs text-slate-500 text-center">By continuing, you agree to receive account-related messages.</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import liff from '@line/liff'

const form = reactive({ phone: '', email: '' })
const loading = ref(false)
const error = ref('')
const LIFF_ID = import.meta.env.VITE_LINE_CHANNEL_ID;
const router = useRouter()


const handleRegisterLine = async () => {
  error.value = ''

  // basic client-side validation
  if (!form.phone) {
    error.value = 'Phone is required.'
    return
  }

  loading.value = true
  try {
    if (!LIFF_ID) {
      error.value = 'Server misconfigured: missing LIFF ID.'
      return
    }

    // init LIFF and ensure logged in
    await liff.init({ liffId: LIFF_ID })
    if (!liff.isLoggedIn()) {
      // this will redirect to LINE login; no further code runs here
      liff.login()
      return
    }

    const profile = await liff.getProfile()
    const username = profile.userId
    const name = profile.displayName || ''

    // Prepare payload for line register
    const payload = {
      username,
      name,
      phone: form.phone,
      email: form.email || ''
    }

    // Try registering the user. If already exists (409), proceed to login.
    try {
      await api.post('/user/line/register', payload)
    } catch (regErr) {
      const status = regErr?.response?.status
      const data = regErr?.response?.data
      if (status === 409) {
        // user exists — continue to login
        console.warn('User exists, attempting login')
      } else {
        error.value = data?.error || 'Registration failed'
        return
      }
    }

    // Login (line login only requires username)
    try {
      const loginRes = await api.post('/user/line/login', { username })
      const token = loginRes?.data?.token
      if (!token) {
        error.value = 'Login failed: no token returned'
        return
      }

      // store token and fetch profile
      localStorage.setItem('user_token', token)
      try {
        const profileRes = await api.get('/profile', { headers: { Authorization: `Bearer ${token}` } })
        localStorage.setItem('user_profile', JSON.stringify(profileRes.data))
      } catch (profileErr) {
        console.warn('Could not fetch profile after login', profileErr)
      }

      // redirect to home
      router.push('/')
    } catch (loginErr) {
      error.value = loginErr?.response?.data?.error || 'Login failed'
      return
    }
  } catch (err) {
    console.error('Error in LINE register flow', err)
    error.value = 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

const checkProfile = async () => {

  if (!LIFF_ID) {
    console.warn('Missing LIFF ID; skipping auto-check')
    return
  }

  try {
    await liff.init({ liffId: LIFF_ID })
    if (!liff.isLoggedIn()) {
      // user not logged in with LIFF — do not auto-redirect
      return
    }

    const profile = await liff.getProfile()
    const username = profile.userId

    // Try to login using LINE username; if succeeds, redirect to home
    try {
      const loginRes = await api.post('/user/line/login', { username })
      const token = loginRes?.data?.token
      if (token) {
        localStorage.setItem('user_token', token)
        try {
          const profileRes = await api.get('/profile', { headers: { Authorization: `Bearer ${token}` } })
          localStorage.setItem('user_profile', JSON.stringify(profileRes.data))
        } catch (e) {
          console.warn('Could not fetch profile after auto-login', e)
        }
        router.push('/')
      }
    } catch (loginErr) {
      // If login failed (user not found), stay on page so user can fill phone/email
      if (loginErr?.response?.status === 401) {
        return
      }
      console.error('Auto-login error', loginErr)
    }
  } catch (err) {
    console.error('Error during LIFF auto-check', err)
  }
}


onMounted(async () => {
  await checkProfile()
})

</script>