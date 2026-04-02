<template>
  <div class="p-4 max-w-3xl mx-auto">

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-xl font-bold text-slate-800">การแจ้งเตือน</h1>
        <p v-if="unreadCount > 0" class="text-sm text-slate-500 mt-0.5">
          ยังไม่อ่าน <span class="font-semibold text-blue-600">{{ unreadCount }}</span> รายการ
        </p>
      </div>
      <button v-if="unreadCount > 0" @click="readAll"
        class="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
        อ่านทั้งหมด
      </button>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-4">
      <button @click="unreadOnly = false; page = 1; load()"
        :class="!unreadOnly ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'"
        class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">ทั้งหมด</button>
      <button @click="unreadOnly = true; page = 1; load()"
        :class="unreadOnly ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'"
        class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
        ยังไม่อ่าน
        <span v-if="unreadCount > 0" class="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{{ unreadCount }}</span>
      </button>
    </div>

    <!-- List -->
    <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      <div v-if="loading" class="py-16 text-center text-slate-400">
        <div class="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
        กำลังโหลด...
      </div>

      <div v-else-if="!notifications.length" class="py-16 text-center">
        <div class="text-4xl mb-2">🔔</div>
        <p class="text-slate-400 text-sm">ไม่มีการแจ้งเตือน</p>
      </div>

      <div v-for="n in notifications" :key="n.id"
        @click="handleClick(n)"
        :class="[!n.is_read ? 'bg-blue-50/60' : '', isClickable(n) ? 'cursor-pointer hover:bg-slate-50' : '']"
        class="flex items-start gap-3 px-4 py-3.5 transition-colors">

        <!-- Icon -->
        <div :class="iconBg(n.noti_type)"
          class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-base">
          {{ iconEmoji(n.noti_type) }}
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold text-slate-800 leading-snug">{{ n.title }}</p>
            <span class="text-xs text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">{{ timeAgo(n.created_at) }}</span>
          </div>
          <p v-if="n.message" class="text-sm text-slate-500 mt-0.5 leading-snug">{{ n.message }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{{ notiTypeLabel(n.noti_type) }}</span>
            <span v-if="n.ar_code" class="text-xs text-slate-400">{{ n.ar_code }}</span>
            <span v-if="isClickable(n)" class="text-xs text-blue-500">ดูรายละเอียด →</span>
          </div>
        </div>

        <!-- Unread dot -->
        <div v-if="!n.is_read" class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2"></div>
      </div>
    </div>

    <!-- Load more -->
    <div v-if="hasMore" class="mt-4 text-center">
      <button @click="loadMore" :disabled="loadingMore"
        class="text-sm text-blue-600 hover:underline disabled:opacity-50">
        {{ loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม' }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../composables/useApi.js'
import { usePermissions } from '../composables/usePermissions.js'

const { canEdit } = usePermissions()

const router = useRouter()

const loading      = ref(false)
const loadingMore  = ref(false)
const notifications = ref([])
const unreadCount  = ref(0)
const unreadOnly   = ref(false)
const page         = ref(1)
const totalPages   = ref(1)
const LIMIT        = 30

const hasMore = computed(() => page.value < totalPages.value)

async function load() {
  loading.value = true
  try {
    const params = { page: page.value, limit: LIMIT }
    if (unreadOnly.value) params.unread_only = 'true'
    const { data } = await api.get('/notifications', { params })
    notifications.value = data.data
    unreadCount.value = data.unread_count
    totalPages.value = data.pagination.pages || 1
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    page.value++
    const params = { page: page.value, limit: LIMIT }
    if (unreadOnly.value) params.unread_only = 'true'
    const { data } = await api.get('/notifications', { params })
    notifications.value.push(...data.data)
    unreadCount.value = data.unread_count
    totalPages.value = data.pagination.pages || 1
  } catch (err) {
    console.error(err)
  } finally {
    loadingMore.value = false
  }
}

async function markRead(n) {
  if (n.is_read) return
  n.is_read = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
  await api.patch(`/notifications/${n.id}/read`)
  window.dispatchEvent(new Event('notifications-read'))
}

async function readAll() {
  await api.patch('/notifications/read-all')
  notifications.value.forEach(n => n.is_read = true)
  unreadCount.value = 0
  window.dispatchEvent(new Event('notifications-read'))
}

function isClickable(n) {
  return (n.ref_type === 'activity' && n.ref_id)
      || (n.ref_type === 'customer' && n.ar_code)
      || (n.ref_type === 'webboard' && n.ref_id)
}

async function handleClick(n) {
  await markRead(n)
  if (n.ref_type === 'activity' && n.ref_id) {
    router.push(`/activities/${n.ref_id}`)
  } else if (n.ref_type === 'customer' && n.ar_code) {
    router.push(`/customers/${n.ar_code}/edit`)
  } else if (n.ref_type === 'webboard' && n.ref_id) {
    router.push(`/webboard/${n.ref_id}`)
  }
}

function iconEmoji(notiType) {
  const map = {
    assigned:         '📋',
    task_due:         '⏰',
    task_overdue:     '🔴',
    meeting_remind:   '📅',
    no_contact:       '💬',
    activity_update:  '✏️',
    webboard_comment: '💬',
  }
  return map[notiType] || '🔔'
}

function iconBg(notiType) {
  const map = {
    assigned:         'bg-blue-100',
    task_due:         'bg-orange-100',
    task_overdue:     'bg-red-100',
    meeting_remind:   'bg-purple-100',
    no_contact:       'bg-yellow-100',
    activity_update:  'bg-green-100',
    webboard_comment: 'bg-teal-100',
  }
  return map[notiType] || 'bg-slate-100'
}

function notiTypeLabel(notiType) {
  const map = {
    assigned:         'งานใหม่',
    task_due:         'ครบกำหนด',
    task_overdue:     'เลยกำหนด',
    meeting_remind:   'Meeting',
    no_contact:       'ไม่ได้ติดต่อ',
    activity_update:  'อัปเดต',
    webboard_comment: 'เว็บบอร์ด',
  }
  return map[notiType] || 'แจ้งเตือน'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'เมื่อกี้'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} ชั่วโมงที่แล้ว`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days} วันที่แล้ว`
  return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
}

function onNewNotification() {
  // มี notification ใหม่เข้ามา — reload หน้า 1 โดยไม่แสดง loading spinner
  page.value = 1
  api.get('/notifications', { params: { page: 1, limit: LIMIT } })
    .then(({ data }) => {
      notifications.value = data.data
      unreadCount.value = data.unread_count
      totalPages.value = data.pagination.pages || 1
    })
    .catch(() => {})
}

onMounted(() => {
  load()
  window.addEventListener('notifications-new', onNewNotification)
})
onUnmounted(() => {
  window.removeEventListener('notifications-new', onNewNotification)
})
</script>
