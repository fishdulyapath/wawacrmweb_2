<template>
  <div class="p-4 lg:p-6 max-w-7xl mx-auto">

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
        {{ toast }}
      </div>
    </Teleport>

    <!-- ── Close-Task Modal (shared component) ─── -->
    <CloseActivityModal
      :show="closeModal.show"
      :activity="closeModal.activity"
      @close="closeModal.show = false"
      @done="onActivityDone"
    />

    <!-- ── Snooze Modal (shared component) ─── -->
    <SnoozeActivityModal
      :show="snoozeModal.show"
      :activity="snoozeModal.activity"
      @close="snoozeModal.show = false"
      @snoozed="onSnoozed"
    />

    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-lg lg:text-xl font-bold text-slate-800">กิจกรรม</h1>
        <p class="text-xs lg:text-sm text-slate-500 mt-0.5">จัดการงาน, การโทร และการประชุม</p>
      </div>
      <RouterLink v-if="canCreate" to="/activities/new"
        class="hidden lg:inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        เพิ่มกิจกรรม
      </RouterLink>
    </div>

    <!-- Stats Bar -->
    <div class="grid grid-cols-4 gap-2 lg:gap-3 mb-4">
      <button @click="setQuickFilter('overdue')"
        :class="quickFilter === 'overdue' ? 'ring-2 ring-red-400' : 'hover:shadow-sm'"
        class="bg-white rounded-xl border border-slate-200 p-3 lg:p-4 text-left transition-all">
        <p class="text-xl lg:text-2xl font-bold text-red-500">{{ stats.overdue || 0 }}</p>
        <p class="text-[10px] lg:text-xs text-slate-500 mt-0.5 lg:mt-1">เลยกำหนด</p>
      </button>
      <button @click="setQuickFilter('today')"
        :class="quickFilter === 'today' ? 'ring-2 ring-amber-400' : 'hover:shadow-sm'"
        class="bg-white rounded-xl border border-slate-200 p-3 lg:p-4 text-left transition-all">
        <p class="text-xl lg:text-2xl font-bold text-amber-500">{{ stats.today || 0 }}</p>
        <p class="text-[10px] lg:text-xs text-slate-500 mt-0.5 lg:mt-1">วันนี้</p>
      </button>
      <button @click="setQuickFilter('')"
        :class="quickFilter === '' && !typeFilter.length ? 'ring-2 ring-blue-400' : 'hover:shadow-sm'"
        class="bg-white rounded-xl border border-slate-200 p-3 lg:p-4 text-left transition-all">
        <p class="text-xl lg:text-2xl font-bold text-blue-600">{{ stats.open || 0 }}</p>
        <p class="text-[10px] lg:text-xs text-slate-500 mt-0.5 lg:mt-1">เปิดอยู่</p>
      </button>
      <button @click="setQuickFilter('meeting')"
        :class="quickFilter === 'meeting' ? 'ring-2 ring-purple-400' : 'hover:shadow-sm'"
        class="bg-white rounded-xl border border-slate-200 p-3 lg:p-4 text-left transition-all">
        <p class="text-xl lg:text-2xl font-bold text-purple-600">{{ stats.meetings_today || 0 }}</p>
        <p class="text-[10px] lg:text-xs text-slate-500 mt-0.5 lg:mt-1">นัดวันนี้</p>
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-200 p-3 mb-4 space-y-2 lg:space-y-0 lg:flex lg:items-center lg:gap-3 lg:flex-wrap">

      <!-- Quick Filter Tabs — scroll on mobile -->
      <div class="flex gap-1 overflow-x-auto pb-0.5 lg:pb-0 scrollbar-hide">
        <button v-for="f in quickFilters" :key="f.key"
          @click="setQuickFilter(f.key)"
          :class="quickFilter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'"
          class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap shrink-0">
          {{ f.label }}
        </button>
      </div>

      <!-- Type Chips + Search row -->
      <div class="flex gap-2 items-center flex-wrap">
        <button v-for="t in typeOptions" :key="t.value"
          @click="toggleType(t.value)"
          :class="typeFilter.includes(t.value) ? t.activeClass : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'"
          class="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap">
          {{ t.icon }} {{ t.label }}
        </button>

        <div class="relative flex-1 min-w-[140px]">
          <svg class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke-width="2"/>
          </svg>
          <input v-model="searchInput" @input="onSearch"
            placeholder="ค้นหา..."
            class="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <button v-if="hasFilter" @click="clearFilter"
          class="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 whitespace-nowrap">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
          ล้าง
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
      <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      กำลังโหลด...
    </div>

    <template v-else>
      <!-- ══ Mobile: Card list ══ -->
      <div class="lg:hidden space-y-2">
        <div v-if="!activities.length" class="py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          ไม่พบกิจกรรม
        </div>
        <div v-for="a in activities" :key="a.id"
          :class="cardClass(a)"
          class="bg-white rounded-xl border border-slate-200 p-4 transition-colors">

          <!-- Row 1: type badge + priority + date -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span :class="typeClass(a.activity_type)" class="badge">
                {{ typeIcon(a.activity_type) }} {{ typeLabel(a.activity_type) }}
              </span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border" :class="priorityBadgeClass(a.priority)">{{ priorityLabel(a.priority) }}</span>
              <span :class="statusClass(a.status)" class="badge">{{ statusLabel(a.status) }}</span>
            </div>
            <span :class="dueDateClass(a.activity_type !== 'task' ? a.start_datetime : a.due_date, a.status)"
              class="text-xs font-medium">
              {{ relativeDate(a.activity_type !== 'task' ? a.start_datetime : a.due_date) }}
              <span v-if="a.activity_type !== 'task' && a.start_datetime" class="font-normal text-slate-400 ml-1">
                {{ formatTime(a.start_datetime) }}
              </span>
            </span>
          </div>

          <!-- Row 2: subject -->
          <p class="font-medium text-slate-800 mb-1">{{ a.subject }}</p>

          <!-- Row 3: customer + owner -->
          <div class="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
            <span v-if="a.ar_code" class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{{ a.ar_code }}</span>
            <span v-if="a.customer_name">{{ a.customer_name }}</span>
            <div class="ml-auto flex items-center gap-1 flex-wrap justify-end">
              <template v-if="a.owners?.length">
                <span v-for="o in a.owners.slice(0,3)" :key="o.user_id"
                  :class="o.is_primary ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'"
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium">
                  {{ o.is_primary ? '👤' : '' }}{{ o.name?.split(' ')[0] }}
                </span>
                <span v-if="a.owners.length > 3" class="text-[10px] text-slate-400">+{{ a.owners.length - 3 }}</span>
              </template>
              <span v-else-if="a.owner_name" class="text-[10px]">👤 {{ a.owner_name }}</span>
            </div>
          </div>

          <!-- Row 4: call info -->
          <div v-if="a.activity_type === 'call' && (a.call_direction || a.call_result)" class="mt-1.5 flex gap-2 text-xs">
            <span class="text-slate-400">{{ a.call_direction === 'outbound' ? '↗ โทรออก' : '↙ รับสาย' }}</span>
            <span v-if="a.call_result" :class="callResultClass(a.call_result)">· {{ callResultLabel(a.call_result) }}</span>
          </div>

          <!-- Row 5: actions -->
          <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
            <template v-if="a.status === 'open'">
              <button @click="openCloseModal(a)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                ปิดงาน
              </button>
              <button @click="openSnoozeModal(a)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                เลื่อน
              </button>
            </template>
            <span v-else-if="a.status === 'done'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-600 text-xs font-semibold">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              ปิดแล้ว
            </span>
            <span v-else-if="a.status === 'cancelled'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold">
              ยกเลิก
            </span>
            <RouterLink :to="`/activities/${a.id}`"
              class="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors">
              ดู
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </RouterLink>
            <RouterLink v-if="canEdit" :to="`/activities/${a.id}/edit`"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors">
              แก้ไข
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- ══ Desktop: Table ══ -->
      <div class="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">ประเภท</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">หัวข้อ</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">ลูกค้า</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">ผู้รับผิดชอบ</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">กำหนด</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">สถานะ</th>
              <th class="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!activities.length">
              <td colspan="7" class="py-12 text-center text-slate-400">ไม่พบกิจกรรม</td>
            </tr>
            <tr v-for="a in activities" :key="a.id"
                :class="rowClass(a)"
                class="transition-colors group">

              <td class="px-4 py-3">
                <span :class="typeClass(a.activity_type)" class="badge">
                  {{ typeIcon(a.activity_type) }} {{ typeLabel(a.activity_type) }}
                </span>
              </td>

              <td class="px-4 py-3 max-w-xs">
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0" :class="priorityBadgeClass(a.priority)">{{ priorityLabel(a.priority) }}</span>
                  <div class="min-w-0">
                    <p class="font-medium text-slate-800 truncate">{{ a.subject }}</p>
                    <p v-if="a.description" class="text-xs text-slate-400 truncate">{{ a.description }}</p>
                    <div v-if="a.activity_type === 'call' && (a.call_direction || a.call_result)" class="flex gap-2 mt-0.5">
                      <span v-if="a.call_direction" class="text-xs text-slate-400">
                        {{ a.call_direction === 'outbound' ? '↗ โทรออก' : '↙ รับสาย' }}
                      </span>
                      <span v-if="a.call_result" class="text-xs" :class="callResultClass(a.call_result)">
                        · {{ callResultLabel(a.call_result) }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <td class="px-4 py-3">
                <template v-if="a.ar_code">
                  <p class="text-slate-700 text-sm">{{ a.customer_name || a.ar_code }}</p>
                  <p v-if="a.customer_name" class="text-xs text-slate-400">{{ a.ar_code }}</p>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>

              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <template v-if="a.owners?.length">
                    <span v-for="o in a.owners.slice(0,3)" :key="o.user_id"
                      :class="o.is_primary ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs">
                      {{ o.name?.split(' ')[0] }}
                    </span>
                    <span v-if="a.owners.length > 3" class="text-xs text-slate-400 self-center">+{{ a.owners.length - 3 }}</span>
                  </template>
                  <span v-else class="text-slate-400 text-sm">{{ a.owner_name || '—' }}</span>
                </div>
              </td>

              <td class="px-4 py-3">
                <template v-if="a.activity_type !== 'task' && a.start_datetime">
                  <p :class="dueDateClass(a.start_datetime, a.status)" class="text-sm">{{ relativeDate(a.start_datetime) }}</p>
                  <p class="text-xs text-slate-400">{{ formatTime(a.start_datetime) }}</p>
                </template>
                <template v-else-if="a.due_date">
                  <p :class="dueDateClass(a.due_date, a.status)" class="text-sm">{{ relativeDate(a.due_date) }}</p>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>

              <td class="px-4 py-3">
                <span :class="statusClass(a.status)" class="badge">{{ statusLabel(a.status) }}</span>
              </td>

              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5 justify-end">
                  <template v-if="a.status === 'open'">
                    <button @click="openCloseModal(a)"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      ปิด
                    </button>
                    <button @click="openSnoozeModal(a)"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      เลื่อน
                    </button>
                  </template>
                  <RouterLink :to="`/activities/${a.id}`"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    ดู
                  </RouterLink>
                  <RouterLink v-if="canEdit" :to="`/activities/${a.id}/edit`"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    แก้ไข
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="flex items-center justify-between mt-4 text-sm text-slate-500">
      <span class="text-xs lg:text-sm">ทั้งหมด {{ pagination.total }} รายการ</span>
      <div class="flex gap-2">
        <button @click="loadActivities(pagination.page - 1)" :disabled="pagination.page <= 1"
          class="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm">
          ← ก่อนหน้า
        </button>
        <span class="px-3 py-1.5 text-xs lg:text-sm">{{ pagination.page }} / {{ pagination.pages }}</span>
        <button @click="loadActivities(pagination.page + 1)" :disabled="pagination.page >= pagination.pages"
          class="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm">
          ถัดไป →
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../composables/useApi.js'
import CloseActivityModal from '../components/CloseActivityModal.vue'
import SnoozeActivityModal from '../components/SnoozeActivityModal.vue'
import { usePermissions } from '../composables/usePermissions.js'
import { useAuthStore } from '../stores/auth.js'

const { canCreate, canEdit } = usePermissions()
const auth = useAuthStore()
const currentUserId = computed(() => auth.user?.id)

const loading    = ref(false)
const saving     = ref(false)
const toast      = ref('')
const activities = ref([])
const stats      = ref({})
const pagination = reactive({ total: 0, page: 1, limit: 20, pages: 1 })
const quickFilter = ref('')
const typeFilter  = ref([])
const searchInput = ref('')
let searchTimer   = null

// ── Close-task modal (lightweight — logic lives in CloseActivityModal) ──
const closeModal = reactive({ show: false, activity: null })

function openCloseModal(activity) {
  closeModal.activity = activity
  closeModal.show = true
}

function onActivityDone(act) {
  closeModal.show = false
  // update local state immediately
  const local = activities.value.find(a => a.id === act.id)
  if (local) local.status = 'done'
  // reload after brief delay
  setTimeout(() => Promise.all([loadActivities(), loadStats()]), 1200)
}

// ── Snooze modal (lightweight — logic lives in SnoozeActivityModal) ──
const snoozeModal = reactive({ show: false, activity: null })

function openSnoozeModal(activity) {
  snoozeModal.activity = activity
  snoozeModal.show = true
}

function onSnoozed(data) {
  snoozeModal.show = false
  const act = snoozeModal.activity
  if (act && data) {
    act.due_date       = data.due_date
    act.start_datetime = data.start_datetime
  }
  loadStats()
}

// ── Filters ──────────────────────────────────────────────────
const quickFilters = [
  { key: '',        label: 'ทั้งหมด' },
  { key: 'overdue', label: '⚠️ เลยกำหนด' },
  { key: 'today',   label: '📅 วันนี้' },
  { key: 'week',    label: '📆 สัปดาห์นี้' },
  { key: 'done',    label: '✅ เสร็จแล้ว' },
]

const typeOptions = [
  { value: 'task',    label: 'งาน',    icon: '✅', activeClass: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'call',    label: 'โทร',    icon: '📞', activeClass: 'bg-purple-50 text-purple-700 border-purple-300' },
  { value: 'meeting', label: 'ประชุม', icon: '👥', activeClass: 'bg-orange-50 text-orange-700 border-orange-300' },
]

const hasFilter = computed(() =>
  quickFilter.value !== '' || typeFilter.value.length > 0 || searchInput.value !== ''
)

function setQuickFilter(key) { quickFilter.value = key; loadActivities(1) }
function toggleType(val) {
  const idx = typeFilter.value.indexOf(val)
  if (idx === -1) typeFilter.value.push(val); else typeFilter.value.splice(idx, 1)
  loadActivities(1)
}
function clearFilter() {
  quickFilter.value = ''; typeFilter.value = []; searchInput.value = ''
  loadActivities(1)
}
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadActivities(1), 300) }

// ── Data loading ─────────────────────────────────────────────
async function loadStats() {
  try { const { data } = await api.get('/activities/stats'); stats.value = data } catch {}
}

async function loadActivities(page = 1) {
  loading.value = true
  try {
    const params = { page, limit: pagination.limit }
    if (quickFilter.value === 'done') params.status = 'done'
    else if (['overdue', 'today', 'week'].includes(quickFilter.value)) { params.due = quickFilter.value }
    else if (quickFilter.value === 'meeting') { params.type = 'meeting'; params.due = 'today' }
    else { params.status = 'open' }
    if (typeFilter.value.length === 1) params.type = typeFilter.value[0]
    if (searchInput.value.trim()) params.search = searchInput.value.trim()

    const { data } = await api.get('/activities', { params })
    activities.value = data.data
    const pg = data.pagination || { total: data.total, page: data.page, limit: data.limit, pages: Math.ceil((data.total||0) / (data.limit||20)) }
    Object.assign(pagination, pg)
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

// ── Helpers ──────────────────────────────────────────────────
function cardClass(a) {
  if (a.status === 'done') return 'opacity-60'
  if (isOverdue(a)) return 'border-red-200 bg-red-50/30'
  if (isDueToday(a)) return 'border-amber-200 bg-amber-50/30'
  return ''
}
function rowClass(a) {
  if (a.status === 'done') return 'opacity-60'
  if (isOverdue(a)) return 'bg-red-50/50'
  if (isDueToday(a)) return 'bg-amber-50/50'
  return 'hover:bg-slate-50'
}
function isOverdue(a) {
  const d = a.activity_type === 'meeting' ? a.start_datetime : a.due_date
  if (!d || a.status !== 'open') return false
  return new Date(d) < new Date(new Date().toDateString())
}
function isDueToday(a) {
  const d = a.activity_type === 'meeting' ? a.start_datetime : a.due_date
  if (!d) return false
  return new Date(d).toDateString() === new Date().toDateString()
}
const TZ = 'Asia/Bangkok'

function bkkDateStr(v) {
  if (!v) return ''
  const d = new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00+07:00' : v)
  return d.toLocaleDateString('sv-SE', { timeZone: TZ })
}

function todayBkkStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

function fmtDateDDMMYYYY(v) {
  if (!v) return '—'
  const s = bkkDateStr(v)
  if (!s) return '—'
  const [y, m, dd] = s.split('-')
  return `${dd}/${m}/${y}`
}

function relativeDate(v) {
  if (!v) return '—'
  const dateStr  = bkkDateStr(v)
  const todayStr = todayBkkStr()
  if (!dateStr) return '—'
  const diff = Math.round((new Date(dateStr) - new Date(todayStr)) / 86400000)
  if (diff === 0) return 'วันนี้'
  if (diff === 1) return 'พรุ่งนี้'
  if (diff === -1) return 'เมื่อวาน'
  if (diff < 0) return `${-diff} วันที่แล้ว`
  if (diff <= 7) return `อีก ${diff} วัน`
  return fmtDateDDMMYYYY(v)
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

function dueDateClass(d, status) {
  if (!d || status === 'done') return 'text-slate-400'
  const dateStr  = bkkDateStr(d)
  const todayStr = todayBkkStr()
  if (!dateStr) return 'text-slate-400'
  const diff = Math.round((new Date(dateStr) - new Date(todayStr)) / 86400000)
  if (diff < 0) return 'text-red-600 font-semibold'
  if (diff === 0) return 'text-amber-600 font-semibold'
  return 'text-slate-600'
}
function priorityLabel(p) { return p === 'high' ? 'สูง' : p === 'low' ? 'ต่ำ' : 'ปกติ' }
function priorityBadgeClass(p) { return p === 'high' ? 'bg-red-50 text-red-600 border-red-200' : p === 'low' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-200' }
function typeIcon(t)  { return t === 'task' ? '✅' : t === 'call' ? '📞' : '👥' }
function typeLabel(t) { return t === 'task' ? 'งาน' : t === 'call' ? 'โทร' : t === 'meeting' ? 'นัด' : t }
function typeClass(t) { return t === 'task' ? 'badge-blue' : t === 'call' ? 'badge-purple' : 'badge-orange' }
function statusLabel(s) { return s === 'open' ? 'เปิด' : s === 'done' ? 'เสร็จ' : 'ยกเลิก' }
function statusClass(s) { return s === 'open' ? 'badge-yellow' : s === 'done' ? 'badge-green' : 'badge-red' }
function callResultLabel(r) {
  return r === 'answered' ? 'รับสาย' : r === 'no_answer' ? 'ไม่รับ' : r === 'busy' ? 'สายไม่ว่าง' : r === 'left_voicemail' ? 'ฝากข้อความ' : r
}
function callResultClass(r) { return r === 'answered' ? 'text-green-500' : 'text-red-400' }

onMounted(() => {
  loadStats()
  loadActivities()
})
</script>

<style scoped>
.badge        { @apply inline-flex items-center px-2 py-0.5 rounded text-xs font-medium; }
.badge-blue   { @apply bg-blue-100 text-blue-700; }
.badge-purple { @apply bg-purple-100 text-purple-700; }
.badge-orange { @apply bg-orange-100 text-orange-700; }
.badge-yellow { @apply bg-yellow-100 text-yellow-700; }
.badge-green  { @apply bg-green-100 text-green-700; }
.badge-red    { @apply bg-red-100 text-red-600; }
.scrollbar-hide { scrollbar-width: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
