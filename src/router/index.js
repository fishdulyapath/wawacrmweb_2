import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login',    component: () => import('../views/Login.vue'),         meta: { public: true } },
    { path: '/',         redirect: '/notifications' },
    { path: '/customers',          component: () => import('../views/CustomerList.vue') },
    { path: '/customers/new',      component: () => import('../views/CustomerForm.vue') },
    { path: '/customers/:code/edit', component: () => import('../views/CustomerForm.vue'), props: true },

    // ── Activities ──
    { path: '/activities',           component: () => import('../views/ActivitiesList.vue') },
    { path: '/activities/new',       component: () => import('../views/ActivityForm.vue'),   meta: { requireManager: true } },
    { path: '/activities/review',    component: () => import('../views/ActivityReview.vue'),  meta: { requireManager: true } },
    { path: '/activities/review/:groupKey', component: () => import('../views/ActivityGroupDetail.vue'), meta: { requireManager: true }, props: true },
    { path: '/activities/:id',       component: () => import('../views/ActivityDetail.vue'), props: true },
    { path: '/activities/:id/edit',  component: () => import('../views/ActivityForm.vue'),   meta: { requireManager: true }, props: true },

    // ── Notifications ──
    { path: '/notifications',        component: () => import('../views/NotificationsList.vue') },

    // ── Reports ──
    { path: '/reports',              component: () => import('../views/ReportsDashboard.vue'), meta: { requireManager: true } },
    { path: '/sales-reports',        component: () => import('../views/SalesReportDashboard.vue'), meta: { requireManager: true } },

    // ── Settings ──
    { path: '/settings/users',       component: () => import('../views/UserPermissions.vue'), meta: { requireAdmin: true } },

    // ── LINE Profile ──
    { path: '/line-profile',         component: () => import('../views/LineProfile.vue') },

    // ── LIFF Pages (LINE Browser) ──
    { path: '/line',                         component: () => import('../views/line/LineHome.vue'),      meta: { liff: true } },
    { path: '/line/tasks',                   component: () => import('../views/line/LineTasks.vue'),     meta: { liff: true } },
    { path: '/line/customers',               component: () => import('../views/line/LineCustomers.vue'), meta: { liff: true } },
    { path: '/line/customers/:ar_code',      component: () => import('../views/line/LineCustomers.vue'), meta: { liff: true }, props: true },
    { path: '/line/log-call',                component: () => import('../views/line/LineLogCall.vue'),   meta: { liff: true } },
  ]
})

function isSuperAdmin(user) { return user?.code?.toUpperCase() === 'SUPERADMIN' }
function isManager(user)    { return isSuperAdmin(user) || ['admin', 'manager', 'supervisor'].includes(user?.role) }
function isAdmin(user)      { return isSuperAdmin(user) || user?.role === 'admin' }

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.liff) return   // LIFF pages จัดการ auth เอง
  if (!to.meta.public && !auth.isLoggedIn) return { path: '/login' }
  if (to.path === '/login' && auth.isLoggedIn) return { path: '/notifications' }
  if (to.meta.requireManager && !isManager(auth.user)) return { path: '/activities' }
  if (to.meta.requireAdmin   && !isAdmin(auth.user))   return { path: '/activities' }
})

export default router
