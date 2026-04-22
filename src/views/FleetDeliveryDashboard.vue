<template>
  <div class="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Dashboard ขนส่งสินค้า</h1>
        <p class="text-sm text-slate-500 mt-0.5">ข้อมูลจาก Google Sheets (AppSheet) — อ่านอย่างเดียว</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Sync status badge -->
        <div v-if="syncStatus" class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full"
          :class="syncStatus.has_error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'">
          <div class="w-1.5 h-1.5 rounded-full"
            :class="syncStatus.has_error ? 'bg-red-500' : 'bg-green-500'"></div>
          Sync {{ syncStatus.last_synced ? formatRelative(syncStatus.last_synced) : 'ยังไม่ได้ sync' }}
        </div>
        <!-- Manual sync (admin) -->
        <button v-if="isAdmin" @click="triggerSync" :disabled="syncing"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <svg class="w-3.5 h-3.5" :class="syncing ? 'animate-spin' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ syncing ? 'กำลัง sync...' : 'Sync ตอนนี้' }}
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div class="flex flex-wrap gap-1.5">
        <button v-for="p in presets" :key="p.key" @click="applyPreset(p.key)"
          :class="activePreset === p.key
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'"
          class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors">
          {{ p.label }}
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1.5">
          <label class="text-xs text-slate-500 whitespace-nowrap">จากวันที่</label>
          <input v-model="filter.from" type="date" @change="onFilterChange" class="filter-input" />
        </div>
        <div class="flex items-center gap-1.5">
          <label class="text-xs text-slate-500 whitespace-nowrap">ถึงวันที่</label>
          <input v-model="filter.to" type="date" @change="onFilterChange" class="filter-input" />
        </div>
        <button @click="loadAll"
          class="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
          โหลด
        </button>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-24"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <template v-else>
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-500 font-medium">รายได้รวม</p>
          <p class="text-2xl font-bold text-slate-800 mt-1">{{ formatMoney(summary.total_revenue) }}</p>
          <p class="text-xs text-slate-400 mt-1">฿ ทั้งหมด</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-500 font-medium">จำนวน Trips</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{{ Number(summary.total_trips || 0).toLocaleString() }}</p>
          <p class="text-xs text-slate-400 mt-1">เที่ยวรถ</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-500 font-medium">พนักงานขับรถ</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ Number(summary.total_drivers || 0).toLocaleString() }}</p>
          <p class="text-xs text-slate-400 mt-1">คน</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-500 font-medium">ร้านค้าที่แวะ</p>
          <p class="text-2xl font-bold text-violet-600 mt-1">{{ Number(summary.total_stores_visited || 0).toLocaleString() }}</p>
          <p class="text-xs text-slate-400 mt-1">ร้าน</p>
        </div>
      </div>

      <!-- Cash vs Transfer -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-500 font-medium mb-1">เงินสด</p>
          <p class="text-xl font-bold text-amber-600">{{ formatMoney(summary.total_cash) }}</p>
          <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-amber-400 rounded-full" :style="{ width: cashPct + '%' }"></div>
          </div>
          <p class="text-xs text-slate-400 mt-1">{{ cashPct }}% ของรายได้รวม</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-500 font-medium mb-1">โอนเงิน</p>
          <p class="text-xl font-bold text-sky-600">{{ formatMoney(summary.total_transfer) }}</p>
          <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-sky-400 rounded-full" :style="{ width: (100 - cashPct) + '%' }"></div>
          </div>
          <p class="text-xs text-slate-400 mt-1">{{ 100 - cashPct }}% ของรายได้รวม</p>
        </div>
      </div>

      <!-- Monthly Revenue Chart -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <h2 class="text-sm font-semibold text-slate-700 mb-3">รายได้รายเดือน</h2>
        <div class="h-64">
          <canvas ref="monthlyChart"></canvas>
        </div>
      </div>

      <!-- Top Drivers + Top Cars -->
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-700 mb-3">Top 10 พนักงานขับรถ (รายได้)</h2>
          <div class="space-y-2">
            <div v-for="(d, i) in topDrivers" :key="d.user_id"
              class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-400 w-5 text-right">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                  <span class="text-xs font-medium text-slate-700 truncate">{{ d.driver_name || d.user_id }}</span>
                  <span class="text-xs text-slate-500 ml-2 shrink-0">{{ formatMoney(d.revenue) }}</span>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-500 rounded-full"
                    :style="{ width: pct(d.revenue, topDrivers[0]?.revenue) + '%' }"></div>
                </div>
              </div>
            </div>
            <p v-if="!topDrivers.length" class="text-xs text-slate-400">ไม่มีข้อมูล</p>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-700 mb-3">Top 10 รถ (จำนวน trips)</h2>
          <div class="space-y-2">
            <div v-for="(c, i) in topCars" :key="c.car_id"
              class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-400 w-5 text-right">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                  <span class="text-xs font-medium text-slate-700 truncate">{{ c.car_name || c.license_plate || c.car_id }}</span>
                  <span class="text-xs text-slate-500 ml-2 shrink-0">{{ c.trips }} trips</span>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full"
                    :style="{ width: pct(c.trips, topCars[0]?.trips) + '%' }"></div>
                </div>
              </div>
            </div>
            <p v-if="!topCars.length" class="text-xs text-slate-400">ไม่มีข้อมูล</p>
          </div>
        </div>
      </div>

      <!-- Top Stores -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-slate-700">Top 10 ร้านค้า</h2>
          <div class="flex rounded-lg overflow-hidden border border-slate-200">
            <button @click="storeBy = 'revenue'" :class="storeBy === 'revenue' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'"
              class="px-3 py-1 text-xs font-medium transition-colors">รายได้</button>
            <button @click="storeBy = 'visits'" :class="storeBy === 'visits' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'"
              class="px-3 py-1 text-xs font-medium transition-colors">ครั้งที่แวะ</button>
          </div>
        </div>
        <div class="space-y-2">
          <div v-for="(s, i) in topStoresFiltered" :key="s.store_id" class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-400 w-5 text-right">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs font-medium text-slate-700 truncate">{{ s.store_name || s.store_id }}</span>
                <span class="text-xs text-slate-500 ml-2 shrink-0">
                  {{ storeBy === 'revenue' ? formatMoney(s.revenue) : s.visits + ' ครั้ง' }}
                </span>
              </div>
              <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-violet-500 rounded-full"
                  :style="{ width: pct(storeBy === 'revenue' ? s.revenue : s.visits, storeBy === 'revenue' ? topStoresFiltered[0]?.revenue : topStoresFiltered[0]?.visits) + '%' }"></div>
              </div>
            </div>
          </div>
          <p v-if="!topStoresFiltered.length" class="text-xs text-slate-400">ไม่มีข้อมูล</p>
        </div>
      </div>

      <!-- Day of Week + Problems -->
      <div class="grid md:grid-cols-2 gap-4">
        <!-- Day of week chart -->
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-700 mb-3">trips ตามวันในสัปดาห์</h2>
          <div class="h-48">
            <canvas ref="dowChart"></canvas>
          </div>
        </div>

        <!-- Problems -->
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h2 class="text-sm font-semibold text-slate-700 mb-3">ปัญหาที่พบ</h2>
          <div v-if="problems.length" class="space-y-2">
            <div v-for="p in problems" :key="p.problem_type" class="flex items-center gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                  <span class="text-xs font-medium text-slate-700 truncate">{{ p.problem_type }}</span>
                  <span class="text-xs text-slate-500 ml-2 shrink-0">{{ p.count }} ครั้ง</span>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-red-400 rounded-full" :style="{ width: pct(p.count, problems[0]?.count) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-slate-400">ไม่มีข้อมูลปัญหา</p>
        </div>
      </div>

      <!-- Recent Trips Table -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-slate-700">รายการ Trips ล่าสุด</h2>
          <span class="text-xs text-slate-400">{{ trips.meta?.total?.toLocaleString() }} รายการ</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="text-left py-2 px-2 font-medium text-slate-500">วันที่</th>
                <th class="text-left py-2 px-2 font-medium text-slate-500">คนขับ</th>
                <th class="text-left py-2 px-2 font-medium text-slate-500">รถ</th>
                <th class="text-left py-2 px-2 font-medium text-slate-500">เส้นทาง</th>
                <th class="text-right py-2 px-2 font-medium text-slate-500">ยอดรวม</th>
                <th class="text-right py-2 px-2 font-medium text-slate-500">บิล</th>
                <th class="text-left py-2 px-2 font-medium text-slate-500">สถานะบัญชี</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in trips.data" :key="t.car_release_id"
                class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td class="py-2 px-2 text-slate-600">{{ formatDate(t.created_at) }}</td>
                <td class="py-2 px-2 text-slate-700 font-medium">{{ t.driver_name || '-' }}</td>
                <td class="py-2 px-2 text-slate-600">{{ t.car_name || t.license_plate || '-' }}</td>
                <td class="py-2 px-2 text-slate-600 max-w-32 truncate">{{ t.route_name || t.description || '-' }}</td>
                <td class="py-2 px-2 text-right font-medium text-slate-700">{{ formatMoney(t.total_amount) }}</td>
                <td class="py-2 px-2 text-right text-slate-600">{{ t.total_number_of_bills || '-' }}</td>
                <td class="py-2 px-2">
                  <span class="px-1.5 py-0.5 rounded text-xs"
                    :class="t.accounting_status === 'ตรวจแล้ว' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">
                    {{ t.accounting_status || 'รอ' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div v-if="trips.meta?.total > trips.meta?.limit" class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <button @click="prevPage" :disabled="tripsOffset === 0"
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            ← ก่อนหน้า
          </button>
          <span class="text-xs text-slate-500">
            {{ tripsOffset + 1 }}–{{ Math.min(tripsOffset + tripsLimit, trips.meta.total) }} จาก {{ trips.meta.total.toLocaleString() }}
          </span>
          <button @click="nextPage" :disabled="tripsOffset + tripsLimit >= trips.meta?.total"
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            ถัดไป →
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import axios from 'axios'

Chart.register(...registerables)

// ---------------------------------------------------------------------------
// Auth / permission (ใช้ localStorage token ที่ backend ออกไว้)
// ---------------------------------------------------------------------------
const token = () => localStorage.getItem('token') || ''
const user = JSON.parse(localStorage.getItem('user') || '{}')
const isAdmin = computed(() => ['admin'].includes(user.role))

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------
const presets = [
  { key: '7d',  label: '7 วัน' },
  { key: '30d', label: '30 วัน' },
  { key: '3m',  label: '3 เดือน' },
  { key: '6m',  label: '6 เดือน' },
  { key: '1y',  label: '1 ปี' },
  { key: 'all', label: 'ทั้งหมด' },
]
const activePreset = ref('3m')
const filter = ref({ from: '', to: '' })

function applyPreset(key) {
  activePreset.value = key
  const now = new Date()
  const to = now.toISOString().split('T')[0]
  const from = new Date(now)
  if (key === '7d')  from.setDate(from.getDate() - 7)
  if (key === '30d') from.setDate(from.getDate() - 30)
  if (key === '3m')  from.setMonth(from.getMonth() - 3)
  if (key === '6m')  from.setMonth(from.getMonth() - 6)
  if (key === '1y')  from.setFullYear(from.getFullYear() - 1)
  if (key === 'all') { filter.value = { from: '', to: '' }; loadAll(); return }
  filter.value = { from: from.toISOString().split('T')[0], to }
  loadAll()
}

function onFilterChange() {
  activePreset.value = ''
  loadAll()
}

// ---------------------------------------------------------------------------
// Data state
// ---------------------------------------------------------------------------
const loading   = ref(false)
const error     = ref('')
const summary   = ref({})
const monthly   = ref([])
const topDrivers = ref([])
const topCars   = ref([])
const topStores = ref([])
const dayOfWeek = ref([])
const problems  = ref([])
const trips     = ref({ data: [], meta: {} })
const syncStatus = ref(null)
const syncing   = ref(false)

const tripsLimit  = 20
const tripsOffset = ref(0)
const storeBy     = ref('revenue')

const topStoresFiltered = computed(() => [...topStores.value].sort(
  (a, b) => storeBy.value === 'visits' ? b.visits - a.visits : b.revenue - a.revenue
).slice(0, 10))

const cashPct = computed(() => {
  const rev = parseFloat(summary.value.total_revenue || 0)
  if (!rev) return 0
  return Math.round((parseFloat(summary.value.total_cash || 0) / rev) * 100)
})

// ---------------------------------------------------------------------------
// Chart refs
// ---------------------------------------------------------------------------
const monthlyChart = ref(null)
const dowChart     = ref(null)
let monthlyChartInst = null
let dowChartInst     = null

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
const api = axios.create({ baseURL: '/api/fleet' })
api.interceptors.request.use(cfg => {
  cfg.headers.Authorization = `Bearer ${token()}`
  return cfg
})

function qs() {
  const p = new URLSearchParams()
  if (filter.value.from) p.set('from', filter.value.from)
  if (filter.value.to)   p.set('to',   filter.value.to)
  return p.toString() ? '?' + p.toString() : ''
}

// ---------------------------------------------------------------------------
// Load functions
// ---------------------------------------------------------------------------
async function loadAll() {
  loading.value = true
  error.value   = ''
  tripsOffset.value = 0
  try {
    const q = qs()
    const [s, m, d, c, st, dow, prob, tr, sync] = await Promise.all([
      api.get(`/dashboard/summary${q}`),
      api.get(`/dashboard/monthly${q}`),
      api.get(`/dashboard/top-drivers${q}&limit=10`),
      api.get(`/dashboard/top-cars${q}&limit=10`),
      api.get(`/dashboard/top-stores${q}&limit=10`),
      api.get(`/dashboard/day-of-week${q}`),
      api.get(`/dashboard/problems${q}`),
      api.get(`/trips${q}&limit=${tripsLimit}&offset=0`),
      api.get('/sync/status'),
    ])
    summary.value    = s.data.data
    monthly.value    = m.data.data
    topDrivers.value = d.data.data
    topCars.value    = c.data.data
    topStores.value  = st.data.data
    dayOfWeek.value  = dow.data.data
    problems.value   = prob.data.data
    trips.value      = tr.data
    // build sync status summary
    const statuses = sync.data.data || []
    const hasError = statuses.some(s => s.status === 'failed')
    const last = statuses.reduce((a, b) => (a.finished_at > b.finished_at ? a : b), statuses[0])
    syncStatus.value = { has_error: hasError, last_synced: last?.finished_at }

    await nextTick()
    renderMonthlyChart()
    renderDowChart()
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function loadTrips() {
  try {
    const q = qs()
    const r = await api.get(`/trips${q}&limit=${tripsLimit}&offset=${tripsOffset.value}`)
    trips.value = r.data
  } catch {}
}

function prevPage() { tripsOffset.value = Math.max(0, tripsOffset.value - tripsLimit); loadTrips() }
function nextPage() { tripsOffset.value += tripsLimit; loadTrips() }

async function triggerSync() {
  syncing.value = true
  try {
    await api.post('/sync/trigger')
    setTimeout(() => { syncing.value = false; loadAll() }, 3000)
  } catch { syncing.value = false }
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
function renderMonthlyChart() {
  if (!monthlyChart.value) return
  monthlyChartInst?.destroy()
  const labels = monthly.value.map(r => r.month)
  const data   = monthly.value.map(r => parseFloat(r.revenue))
  monthlyChartInst = new Chart(monthlyChart.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'รายได้ (฿)',
        data,
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => (v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v) } }
      }
    }
  })
}

function renderDowChart() {
  if (!dowChart.value) return
  dowChartInst?.destroy()
  const ALL_DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
  const map = Object.fromEntries(dayOfWeek.value.map(r => [r.day_name, r.trips]))
  dowChartInst = new Chart(dowChart.value, {
    type: 'bar',
    data: {
      labels: ALL_DAYS,
      datasets: [{
        label: 'Trips',
        data: ALL_DAYS.map(d => map[d] || 0),
        backgroundColor: ALL_DAYS.map(d => ['เสาร์','อาทิตย์'].includes(d) ? 'rgba(139,92,246,0.7)' : 'rgba(16,185,129,0.7)'),
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatMoney(v) {
  const n = parseFloat(v || 0)
  if (n >= 1e6) return '฿' + (n/1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '฿' + n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
  return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
}

function formatDate(v) {
  if (!v) return '-'
  return new Date(v).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatRelative(v) {
  if (!v) return ''
  const diff = Date.now() - new Date(v).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'เมื่อกี้'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs/24)} วันที่แล้ว`
}

function pct(val, max) {
  const v = parseFloat(val || 0)
  const m = parseFloat(max || 1)
  return m === 0 ? 0 : Math.round((v / m) * 100)
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
onMounted(() => { applyPreset('3m') })
watch(storeBy, () => {}) // reactive sort handled by computed
</script>

<style scoped>
.filter-input {
  @apply border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
</style>
