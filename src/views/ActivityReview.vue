<template>
  <div class="p-4 lg:p-6 max-w-7xl mx-auto">

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg">
        {{ toast }}
      </div>
    </Teleport>

    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-lg lg:text-xl font-bold text-slate-800">📋 ตรวจสอบกิจกรรม</h1>
        <p class="text-xs lg:text-sm text-slate-500 mt-0.5">ภาพรวมกิจกรรมทั้งหมด แบบจัดกลุ่ม</p>
      </div>      <RouterLink :to="{ path: '/activities/new', query: { from: '/activities/review' } }"
        class="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        <span class="hidden sm:inline">เพิ่มกิจกรรม</span>
        <span class="sm:hidden">เพิ่ม</span>
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-slate-200 p-3 mb-4 space-y-2 lg:space-y-0 lg:flex lg:items-center lg:gap-3 lg:flex-wrap">
      <!-- Status Tabs -->
      <div class="flex gap-1 overflow-x-auto pb-0.5 lg:pb-0 scrollbar-hide">
        <button v-for="f in statusFilters" :key="f.key"
          @click="setStatusFilter(f.key)"
          :class="activeStatus === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'"
          class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap shrink-0">
          {{ f.label }}
        </button>
      </div>

      <!-- Type + Search + Date -->
      <div class="flex gap-2 items-center flex-wrap flex-1">
        <button v-for="t in typeOptions" :key="t.value"
          @click="toggleType(t.value)"
          :class="typeFilter === t.value ? t.activeClass : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'"
          class="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap">
          {{ t.icon }} {{ t.label }}
        </button>

        <div class="relative flex-1 min-w-[140px]">
          <svg class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8" stroke-width="2"/><path d="m21 21-4.35-4.35" stroke-width="2"/>
          </svg>
          <input v-model="searchInput" @input="onSearch"
            placeholder="ค้นหาชื่อกิจกรรม..."
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
      <!-- Empty state -->
      <div v-if="!groups.length" class="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
        <p class="text-4xl mb-3">📋</p>
        <p class="text-sm">ไม่พบกิจกรรม</p>
      </div>

      <!-- ══ Mobile: Card list ══ -->
      <div class="lg:hidden space-y-2">
        <div v-for="g in groups" :key="g.group_key"
          @click="goToDetail(g)"
          :class="groupCardClass(g)"
          class="bg-white rounded-xl border border-slate-200 p-4 transition-colors active:bg-slate-50 cursor-pointer">

          <!-- Row 1: type + priority + date -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span :class="typeClass(g.activity_type)" class="badge">
                {{ typeIcon(g.activity_type) }} {{ typeLabel(g.activity_type) }}
              </span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border" :class="priorityBadgeClass(g.priority)">
                {{ priorityLabel(g.priority) }}
              </span>
            </div>
            <span :class="dueDateClass(g)" class="text-xs font-medium">
              {{ relativeDate(g.start_datetime || g.due_date) }}
              <span v-if="g.start_datetime" class="font-normal text-slate-400 ml-1">
                {{ formatTime(g.start_datetime) }}
              </span>
            </span>
          </div>

          <!-- Row 2: subject -->
          <p class="font-medium text-slate-800 mb-1.5">{{ g.subject }}</p>

          <!-- Row 3: customers -->
          <div class="flex items-center gap-2 text-xs text-slate-400 flex-wrap mb-2">
            <span class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              👥 {{ g.member_count }} ลูกค้า
            </span>
            <span v-for="(name, i) in g.customer_names.slice(0, 3)" :key="i"
              class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[120px]">
              {{ name }}
            </span>
            <span v-if="g.customer_names.length > 3" class="text-slate-400">
              +{{ g.customer_names.length - 3 }}
            </span>
          </div>

          <!-- Row 4: progress + status -->
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-slate-500">ความคืบหน้า</span>
                <span class="font-semibold" :class="g.done_count === g.member_count ? 'text-green-600' : 'text-blue-600'">
                  {{ g.done_count }}/{{ g.member_count }}
                </span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                  :class="g.done_count === g.member_count ? 'bg-green-500' : 'bg-blue-500'"
                  :style="{ width: `${g.member_count > 0 ? (g.done_count / g.member_count) * 100 : 0}%` }">
                </div>
              </div>
            </div>
            <span :class="groupStatusClass(g.group_status)" class="badge shrink-0">
              {{ groupStatusLabel(g.group_status) }}
            </span>
          </div>

          <!-- Row 5: creator -->
          <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>👤 {{ g.creator_name || '—' }}</span>
            <svg class="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
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
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-48">ลูกค้า</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">ผู้สร้าง</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">กำหนด</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">ความคืบหน้า</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">สถานะ</th>
              <th class="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!groups.length">
              <td colspan="8" class="py-12 text-center text-slate-400">ไม่พบกิจกรรม</td>
            </tr>
            <tr v-for="g in groups" :key="g.group_key"
              @click="goToDetail(g)"
              :class="groupRowClass(g)"
              class="transition-colors group cursor-pointer">

              <!-- Type -->
              <td class="px-4 py-3">
                <span :class="typeClass(g.activity_type)" class="badge">
                  {{ typeIcon(g.activity_type) }} {{ typeLabel(g.activity_type) }}
                </span>
              </td>

              <!-- Subject -->
              <td class="px-4 py-3">
                <div class="flex items-start gap-2">
                  <span class="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0" :class="priorityBadgeClass(g.priority)">
                    {{ priorityLabel(g.priority) }}
                  </span>
                  <div class="min-w-0">
                    <p class="font-medium text-slate-800 truncate">{{ g.subject }}</p>
                  </div>
                </div>
              </td>

              <!-- Customers -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
                    👥 {{ g.member_count }}
                  </span>
                  <span v-for="(name, i) in g.customer_names.slice(0, 2)" :key="i"
                    class="text-xs text-slate-500 truncate max-w-[80px]" :title="name">
                    {{ name }}
                  </span>
                  <span v-if="g.customer_names.length > 2" class="text-xs text-slate-400">
                    +{{ g.customer_names.length - 2 }}
                  </span>
                </div>
              </td>

              <!-- Creator -->
              <td class="px-4 py-3">
                <span class="text-slate-600 text-sm">{{ g.creator_name || '—' }}</span>
              </td>

              <!-- Due date -->
              <td class="px-4 py-3">
                <p :class="dueDateClass(g)" class="text-sm">{{ relativeDate(g.start_datetime || g.due_date) }}</p>
                <p v-if="g.start_datetime" class="text-xs text-slate-400">{{ formatTime(g.start_datetime) }}</p>
              </td>

              <!-- Progress -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                      :class="g.done_count === g.member_count ? 'bg-green-500' : 'bg-blue-500'"
                      :style="{ width: `${g.member_count > 0 ? (g.done_count / g.member_count) * 100 : 0}%` }">
                    </div>
                  </div>
                  <span class="text-xs font-semibold min-w-[32px] text-right"
                    :class="g.done_count === g.member_count ? 'text-green-600' : 'text-slate-600'">
                    {{ g.done_count }}/{{ g.member_count }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3">
                <span :class="groupStatusClass(g.group_status)" class="badge">
                  {{ groupStatusLabel(g.group_status) }}
                </span>
              </td>

              <!-- Arrow -->
              <td class="px-4 py-3">
                <svg class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="flex items-center justify-between mt-4 text-sm text-slate-500">
      <span class="text-xs lg:text-sm">ทั้งหมด {{ pagination.total }} กลุ่ม</span>
      <div class="flex gap-2">
        <button @click="loadGroups(pagination.page - 1)" :disabled="pagination.page <= 1"
          class="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm">
          ← ก่อนหน้า
        </button>
        <span class="px-3 py-1.5 text-xs lg:text-sm">{{ pagination.page }} / {{ pagination.pages }}</span>
        <button @click="loadGroups(pagination.page + 1)" :disabled="pagination.page >= pagination.pages"
          class="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm">
          ถัดไป →
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../composables/useApi.js'

const router = useRouter()
const loading    = ref(false)
const toast      = ref('')
const groups     = ref([])
const pagination = reactive({ total: 0, page: 1, limit: 20, pages: 1 })
const activeStatus = ref('')
const typeFilter   = ref('')
const searchInput  = ref('')
let searchTimer    = null

// ── Filters ─────────────────────────────────────────────────
const statusFilters = [
  { key: '',        label: 'ทั้งหมด' },
  { key: 'open',    label: '🔄 กำลังดำเนินการ' },
  { key: 'overdue', label: '⚠️ เลยกำหนด' },
  { key: 'done',    label: '✅ เสร็จทั้งหมด' },
]

const typeOptions = [
  { value: 'task',    label: 'งาน',    icon: '✅', activeClass: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'call',    label: 'โทร',    icon: '📞', activeClass: 'bg-purple-50 text-purple-700 border-purple-300' },
  { value: 'meeting', label: 'ประชุม', icon: '👥', activeClass: 'bg-orange-50 text-orange-700 border-orange-300' },
]

const hasFilter = computed(() => activeStatus.value !== '' || typeFilter.value !== '' || searchInput.value !== '')

function setStatusFilter(key) { activeStatus.value = key; loadGroups(1) }
function toggleType(val) {
  typeFilter.value = typeFilter.value === val ? '' : val
  loadGroups(1)
}
function clearFilter() {
  activeStatus.value = ''; typeFilter.value = ''; searchInput.value = ''
  loadGroups(1)
}
function onSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadGroups(1), 300) }

// ── Load data ───────────────────────────────────────────────
async function loadGroups(page = 1) {
  loading.value = true
  try {
    const params = { page, limit: pagination.limit }
    if (activeStatus.value) params.status = activeStatus.value
    if (typeFilter.value) params.type = typeFilter.value
    if (searchInput.value.trim()) params.search = searchInput.value.trim()

    const { data } = await api.get('/activities/groups', { params })
    groups.value = data.data
    const pg = data.pagination
    Object.assign(pagination, pg)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// ── Navigation ──────────────────────────────────────────────
function goToDetail(g) {
  router.push(`/activities/review/${g.group_key}`)
}

// ── Helpers ─────────────────────────────────────────────────
const TZ = 'Asia/Bangkok'
function bkkDateStr(v) {
  if (!v) return ''
  const d = new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00+07:00' : v)
  return d.toLocaleDateString('sv-SE', { timeZone: TZ })
}
function todayBkkStr() { return new Date().toLocaleDateString('sv-SE', { timeZone: TZ }) }
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
function dueDateClass(g) {
  const d = g.start_datetime || g.due_date
  if (!d || g.group_status === 'done') return 'text-slate-400'
  const dateStr  = bkkDateStr(d)
  const todayStr = todayBkkStr()
  if (!dateStr) return 'text-slate-400'
  const diff = Math.round((new Date(dateStr) - new Date(todayStr)) / 86400000)
  if (diff < 0) return 'text-red-600 font-semibold'
  if (diff === 0) return 'text-amber-600 font-semibold'
  return 'text-slate-600'
}
function isOverdue(g) {
  const d = g.start_datetime || g.due_date
  if (!d || g.group_status === 'done') return false
  return new Date(bkkDateStr(d)) < new Date(todayBkkStr())
}
function groupCardClass(g) {
  if (g.group_status === 'done') return 'opacity-60'
  if (isOverdue(g)) return 'border-red-200 bg-red-50/30'
  return ''
}
function groupRowClass(g) {
  if (g.group_status === 'done') return 'opacity-60'
  if (isOverdue(g)) return 'bg-red-50/50'
  return 'hover:bg-slate-50'
}
function priorityLabel(p)      { return p === 'high' ? 'สูง' : p === 'low' ? 'ต่ำ' : 'ปกติ' }
function priorityBadgeClass(p) { return p === 'high' ? 'bg-red-50 text-red-600 border-red-200' : p === 'low' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-200' }
function typeIcon(t)           { return t === 'task' ? '✅' : t === 'call' ? '📞' : '👥' }
function typeLabel(t)          { return t === 'task' ? 'งาน' : t === 'call' ? 'โทร' : t === 'meeting' ? 'นัด' : t }
function typeClass(t)          { return t === 'task' ? 'badge-blue' : t === 'call' ? 'badge-purple' : 'badge-orange' }

function groupStatusLabel(s) {
  if (s === 'done') return '✅ เสร็จ'
  if (s === 'open') return '🔄 ดำเนินการ'
  return '⏳ รอ'
}
function groupStatusClass(s) {
  if (s === 'done') return 'badge-green'
  if (s === 'open') return 'badge-yellow'
  return 'badge-red'
}

onMounted(() => loadGroups())
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
