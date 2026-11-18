import { createRouter, createWebHistory } from 'vue-router'
import { hasProfile } from '@/services/profiles'
import SetupView from '@/views/SetupView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ProductEntryView from '@/views/ProductEntryView.vue'
import ManualEntryView from '@/views/ManualEntryView.vue'
import CategoryEntryView from '@/views/CategoryEntryView.vue'
import RecipesView from '@/views/RecipesView.vue'
import BookmarksView from '@/views/BookmarksView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/setup', name: 'setup', component: SetupView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    { path: '/items/new', name: 'product-entry', component: ProductEntryView },
    { path: '/items/new/manual', name: 'manual-entry', component: ManualEntryView },
    { path: '/items/new', name: 'category-entry', component: CategoryEntryView},
    { path: '/recipes', name: 'recipes', component: RecipesView },
    { path: '/bookmarks', name: 'bookmarks', component: BookmarksView },
  ],
})

router.beforeEach((to) => {
  if (to.name !== 'setup' && !hasProfile()) return { name: 'setup' }
})

export default router
