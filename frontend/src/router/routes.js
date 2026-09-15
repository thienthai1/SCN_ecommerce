import { api } from 'boot/axios'

// Auth guard for admin routes
const requireAuth = async (to, from, next) => {
  const token = localStorage.getItem('user_token') || localStorage.getItem('token')
  if (!token) {
    next('/')
    return
  }

  try {
    // backend endpoint `/user/profile/roles-permissions` requires admin; it will 200 for admins, 403 for others
    await api.get('/user/profile/roles-permissions', { headers: { Authorization: `Bearer ${token}` } })
    next()
  } catch (err) {
    // not admin or error -> redirect to home
    next('/')
  }
}

// Guest guard - redirect to dashboard if already logged in
const requireGuest = (to, from, next) => {
  const token = localStorage.getItem('token')
  if (token) {
    next('/admin/dashboard')
  } else {
    next()
  }
}

// Customer auth guard - require login for customer pages
const requireCustomerAuth = (to, from, next) => {
  const token = localStorage.getItem('user_token')
  if (!token) {
    // Store the intended destination for redirect after login
    sessionStorage.setItem('redirectAfterLogin', to.fullPath)
    next('/signin')
  } else {
    next()
  }
}

const routes = [
  {
    path: '/',
    component: () => import('pages/Home.vue')
  },
  {
    path: '/browse',
    component: () => import('pages/BrowsePage.vue')
  },
  {
    path: '/wishlist',
    component: () => import('pages/WishlistPage.vue')
  },
  {
    path: '/signin',
    component: () => import('pages/SignInPage.vue')
  },
  {
    path: '/signup',
    component: () => import('pages/SignUpPage.vue')
  },
  {
    path: '/register',
    redirect: '/signup'
  },
  {
    path: '/login',
    redirect: '/signin'
  },
  {
    path: '/product/:id',
    component: () => import('pages/ProductPage.vue')
  },
  {
    path: '/cart',
    component: () => import('pages/CartPage.vue')
  },
  {
    path: '/orders',
    component: () => import('pages/OrdersPage.vue'),
    beforeEnter: requireCustomerAuth
  },
  {
    path: '/checkout',
    component: () => import('pages/CheckoutPage.vue'),
    beforeEnter: requireCustomerAuth
  },
  {
    path: '/profile',
    component: () => import('pages/ProfileSettingPage.vue'),
    beforeEnter: requireCustomerAuth
  },

  // Admin Routes
  {
    path: '/admin/login',
    component: () => import('pages/admin/AdminLoginPage.vue'),
    beforeEnter: requireGuest
  },
  {
    path: '/admin/dashboard',
    component: () => import('pages/admin/AdminDashboard.vue'),
    beforeEnter: requireAuth
  },
  {
    path: '/admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/liffcallback',
    component: () => import('pages/lineliffHandling.vue')
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
