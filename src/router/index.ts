import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from '@/firebase'
import { hasProfile } from '@/services/profiles'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import SetupView from '@/views/SetupView.vue'
import DashboardView from '@/views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
    { path: '/setup', name: 'setup', component: SetupView, meta: { requiresAuth: true } },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const user = await getCurrentUser()

  if (to.meta.requiresAuth && !user) return { name: 'login' }
  if (!user) return

  const profileExists = await hasProfile(user.uid)

  if (to.meta.guestOnly) return { name: profileExists ? 'dashboard' : 'setup' }

  if (to.meta.requiresAuth) {
    if (!profileExists && to.name !== 'setup') return { name: 'setup' }
    if (profileExists && to.name === 'setup') return { name: 'dashboard' }
  }
})

export default router
