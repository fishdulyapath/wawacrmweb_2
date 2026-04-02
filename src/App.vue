<template>
  <!-- LIFF pages — full screen, no sidebar, no auth wrapper -->
  <div v-if="route.meta.liff" class="liff-shell">
    <RouterView />
  </div>

  <!-- Login page — no sidebar -->
  <RouterView v-else-if="!auth.isLoggedIn" />

  <!-- Main layout -->
  <div v-else class="flex h-dvh bg-slate-50 overflow-hidden">
    <!-- ══ Sidebar overlay backdrop (mobile) ══ -->
    <Transition name="fade">
      <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="sidebarOpen = false" />
    </Transition>

    <!-- ══ Sidebar ══ -->
    <Transition name="slide">
      <aside v-show="sidebarOpen || isDesktop" class="fixed lg:static inset-y-0 left-0 z-40 w-60 bg-slate-900 flex flex-col flex-shrink-0 lg:translate-x-0 transition-transform duration-200">
        <!-- Logo -->
        <div class="px-5 py-5 border-b border-slate-700/60">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-white font-bold text-sm leading-none">WAWA CRM</p>
              <p class="text-slate-400 text-xs mt-0.5">CRM System</p>
            </div>
            <!-- Close button (mobile only) -->
            <button @click="sidebarOpen = false" class="lg:hidden text-slate-400 hover:text-white p-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">เมนูหลัก</p>
          <RouterLink to="/notifications" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
            <div class="relative shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span v-if="unreadNotif > 0" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {{ unreadNotif > 9 ? "9+" : unreadNotif }}
              </span>
            </div>
            การแจ้งเตือน
          </RouterLink>


          <RouterLink to="/activities" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            กิจกรรม
          </RouterLink>
          <RouterLink to="/customers" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            จัดการลูกค้า
          </RouterLink>
          <RouterLink to="/webboard" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
            </svg>
            เว็บบอร์ด
          </RouterLink>
          <!-- Reports (manager+) -->
          <template v-if="isManager">
            <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-2">จัดการ</p>
            <RouterLink to="/activities/review" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
              ตรวจสอบกิจกรรม
            </RouterLink>
            <RouterLink to="/reports" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              รายงานและประวัติ
            </RouterLink>
            <RouterLink to="/sales-reports" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              รายงานยอดขาย
            </RouterLink>
          </template>

          <!-- Settings (admin only) -->
          <template v-if="isAdmin">
            <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-2">ตั้งค่า</p>
            <RouterLink to="/settings/users" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
              <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              กำหนดสิทธิ์ผู้ใช้
            </RouterLink>
          </template>

          <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-2">บัญชี</p>
          <RouterLink to="/line-profile" class="nav-link" active-class="nav-link-active" @click="sidebarOpen = false">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            LINE Profile
          </RouterLink>
        </nav>

        <!-- User info + Logout -->
        <div class="px-3 py-4 border-t border-slate-700/60">
          <div class="flex items-center gap-3 px-3 py-2 mb-2">
            <!-- Avatar with superadmin crown -->
            <div class="relative flex-shrink-0">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                :class="isSuperAdmin ? 'bg-yellow-500' : avatarBgByRole(auth.user?.role)">
                {{ auth.user?.name?.charAt(0) || "?" }}
              </div>
              <span v-if="isSuperAdmin"
                class="absolute -top-1.5 -right-1.5 text-[11px] leading-none">👑</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm font-medium truncate">{{ auth.user?.name }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <!-- Role badge -->
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none"
                  :class="isSuperAdmin
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : roleBadgeDark(auth.user?.role)">
                  {{ isSuperAdmin ? 'ผู้ดูแลระบบ' : roleLabel(auth.user?.role) }}
                </span>
                <span class="text-slate-500 text-[10px] truncate">{{ auth.user?.code }}</span>
              </div>
            </div>
          </div>
          <button @click="doLogout" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </Transition>

    <!-- ══ Main content ══ -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Mobile top bar -->
      <header class="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        <button @click="sidebarOpen = true" class="p-2 rounded-lg text-slate-500 hover:bg-slate-100 -ml-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="font-bold text-slate-800">WAWA CRM</span>
        <div class="ml-auto flex items-center gap-2">
          <!-- notification bell -->
          <RouterLink to="/notifications" class="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span v-if="unreadNotif > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {{ unreadNotif > 9 ? "9+" : unreadNotif }}
            </span>
          </RouterLink>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto pb-20 lg:pb-0">
        <RouterView />
      </main>

      <!-- ══ Bottom nav (mobile only) ══ -->
      <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-1 safe-bottom">
        <RouterLink to="/customers" class="bottom-nav-item" active-class="bottom-nav-active">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>ลูกค้า</span>
        </RouterLink>

        <RouterLink to="/activities" class="bottom-nav-item" active-class="bottom-nav-active">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <span>กิจกรรม</span>
        </RouterLink>

        <RouterLink v-if="canCreate" to="/activities/new" class="bottom-nav-fab" active-class="">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
        </RouterLink>

        <RouterLink to="/notifications" class="bottom-nav-item" active-class="bottom-nav-active">
          <div class="relative">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span v-if="unreadNotif > 0" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {{ unreadNotif > 9 ? "9+" : unreadNotif }}
            </span>
          </div>
          <span>แจ้งเตือน</span>
        </RouterLink>

        <RouterLink to="/webboard" class="bottom-nav-item" active-class="bottom-nav-active">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
          </svg>
          <span>บอร์ด</span>
        </RouterLink>

        <RouterLink to="/line-profile" class="bottom-nav-item" active-class="bottom-nav-active">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>บัญชี</span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth.js";
import api from "./composables/useApi.js";
import { usePermissions } from "./composables/usePermissions.js";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { canCreate, isManager, isSuperAdmin } = usePermissions()
const isAdmin = computed(() => isSuperAdmin.value || auth.user?.role === 'admin')

const unreadNotif = ref(0);
const sidebarOpen = ref(false);
let notifTimer = null;

// ตรวจว่าเป็น desktop หรือไม่ (≥1024px)
const isDesktop = ref(window.innerWidth >= 1024);
function onResize() {
  isDesktop.value = window.innerWidth >= 1024;
  if (isDesktop.value) sidebarOpen.value = false;
}

async function fetchUnread() {
  if (!auth.isLoggedIn) return;
  try {
    const { data } = await api.get("/notifications", { params: { limit: 1 } });
    const newCount = data.unread_count || 0;
    if (newCount > unreadNotif.value) {
      // มี notification ใหม่เข้ามา — แจ้ง NotificationsList ให้ reload
      window.dispatchEvent(new Event("notifications-new"));
    }
    unreadNotif.value = newCount;
  } catch {}
}

onMounted(() => {
  fetchUnread();
  notifTimer = setInterval(fetchUnread, 15000);
  window.addEventListener("resize", onResize);
  window.addEventListener("notifications-read", fetchUnread);
});
onUnmounted(() => {
  clearInterval(notifTimer);
  window.removeEventListener("resize", onResize);
  window.removeEventListener("notifications-read", fetchUnread);
});

async function doLogout() {
  await auth.logout();
  router.push("/login");
}

function roleLabel(role) {
  return { admin: 'ผู้ดูแลระบบ', manager: 'ผู้จัดการ', supervisor: 'หัวหน้าทีม', sales_rep: 'พนักงาน' }[role] || 'พนักงาน'
}

function avatarBgByRole(role) {
  return { admin: 'bg-red-600', manager: 'bg-indigo-600', supervisor: 'bg-blue-500', sales_rep: 'bg-slate-500' }[role] || 'bg-slate-500'
}

function roleBadgeDark(role) {
  return {
    admin:      'bg-red-500/20 text-red-400',
    manager:    'bg-indigo-500/20 text-indigo-300',
    supervisor: 'bg-blue-500/20 text-blue-300',
    sales_rep:  'bg-slate-500/20 text-slate-400',
  }[role] || 'bg-slate-500/20 text-slate-400'
}
</script>

<style scoped>
.nav-link {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors duration-150 font-medium;
}
.nav-link-active {
  @apply bg-blue-600/20 text-blue-400 hover:bg-blue-600/20 hover:text-blue-400;
}

/* Bottom nav */
.bottom-nav-item {
  @apply flex flex-col items-center gap-0.5 px-3 py-2 text-slate-400 text-[10px] font-medium rounded-xl transition-colors;
}
.bottom-nav-active {
  @apply text-blue-600;
}
.bottom-nav-fab {
  @apply w-12 h-12 -mt-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 transition-transform active:scale-95;
}

/* Sidebar slide (mobile) */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
.slide-enter-to,
.slide-leave-from {
  transform: translateX(0);
}

/* Backdrop fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* LIFF shell */
.liff-shell {
  min-height: 100dvh;
  background: #060e1a;
  display: flex;
  justify-content: center;
}
.liff-shell > :deep(*) {
  width: 100%;
}

/* Safe area for iOS home indicator */
.safe-bottom {
  padding-bottom: max(0.25rem, env(safe-area-inset-bottom));
}
</style>
