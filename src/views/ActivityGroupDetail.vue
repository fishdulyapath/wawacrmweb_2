<template>
  <div class="p-4 lg:p-6 max-w-5xl mx-auto">

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

    <!-- ── Bulk Close Confirm Modal ─── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="bulkCloseModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div class="absolute inset-0 bg-black/50" @click="bulkCloseModal = false"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-2">⚡ ปิดงานทั้งกลุ่ม</h3>
            <p class="text-sm text-slate-500 mb-4">
              จะปิดงานทั้ง {{ info?.member_count }} รายการพร้อมกัน
              <br>กิจกรรมที่ปิดแล้วจะไม่ถูกกระทบ
            </p>
            <div class="mb-4">
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">📝 หมายเหตุ (ไม่บังคับ)</label>
              <textarea v-model="bulkOutcome" rows="2" class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="เช่น ปิดงานรวมทั้งกลุ่ม..."></textarea>
            </div>
            <div class="flex gap-3">
              <button @click="bulkCloseModal = false"
                class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                ยกเลิก
              </button>
              <button @click="confirmBulkClose" :disabled="bulkClosing"
                class="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <svg v-if="bulkClosing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                ✓ ยืนยันปิดทั้งกลุ่ม
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Loading -->
    <div v-if="loading" class="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
      <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      กำลังโหลด...
    </div>

    <template v-else-if="info">
      <!-- Back + Header -->
      <div class="flex items-center gap-3 mb-4">
        <button @click="$router.push('/activities/review')"
          class="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shrink-0">
          <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span :class="typeClass(info.activity_type)" class="badge">
              {{ typeIcon(info.activity_type) }} {{ typeLabel(info.activity_type) }}
            </span>
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border" :class="priorityBadgeClass(info.priority)">
              {{ priorityLabel(info.priority) }}
            </span>
            <span :class="groupStatusClass(info.group_status)" class="badge">
              {{ groupStatusLabel(info.group_status) }}
            </span>
          </div>
          <h1 class="text-lg font-bold text-slate-800 mt-1 truncate">{{ info.subject }}</h1>
        </div>
      </div>

      <!-- Summary Card -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 lg:p-5 mb-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p class="text-xs text-slate-400 mb-0.5">📅 กำหนด</p>
            <p class="text-sm font-medium text-slate-700">
              {{ relativeDate(info.start_datetime || info.due_date) }}
              <span v-if="info.start_datetime" class="text-slate-400 ml-1">{{ formatTime(info.start_datetime) }}</span>
            </p>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-0.5">👤 ผู้สร้าง</p>
            <p class="text-sm font-medium text-slate-700">{{ info.creator_name || '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-0.5">👥 จำนวนลูกค้า</p>
            <p class="text-sm font-medium text-slate-700">{{ info.member_count }} ราย</p>
          </div>
          <div>
            <p class="text-xs text-slate-400 mb-0.5">📊 ความคืบหน้า</p>
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                  :class="info.done_count === info.member_count ? 'bg-green-500' : 'bg-blue-500'"
                  :style="{ width: `${info.member_count > 0 ? (info.done_count / info.member_count) * 100 : 0}%` }">
                </div>
              </div>
              <span class="text-sm font-bold" :class="info.done_count === info.member_count ? 'text-green-600' : 'text-blue-600'">
                {{ info.done_count }}/{{ info.member_count }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="info.description" class="mt-3 pt-3 border-t border-slate-100">
          <p class="text-xs text-slate-400 mb-1">📝 รายละเอียด</p>
          <p class="text-sm text-slate-600 whitespace-pre-line">{{ info.description }}</p>
        </div>
        <div v-if="info.location" class="mt-2">
          <p class="text-xs text-slate-400 mb-0.5">📍 สถานที่</p>
          <p class="text-sm text-slate-600">{{ info.location }}</p>
        </div>
      </div>      <!-- Action Buttons -->
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        <RouterLink :to="{ path: `/activities/${info.first_activity_id || activities[0]?.id}/edit`, query: { from: $route.fullPath } }"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          แก้ไขกิจกรรม
        </RouterLink>
        <button v-if="hasOpenActivities" @click="bulkCloseModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          ปิดงานทั้งกลุ่ม ({{ openCount }} รายการ)
        </button>
        <RouterLink :to="{ path: '/activities/new', query: { from: $route.fullPath } }"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors ml-auto">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M12 4v16m8-8H4"/>
          </svg>
          สร้างกิจกรรมใหม่
        </RouterLink>
      </div>

      <!-- Activities List -->
      <div class="space-y-2">
        <h2 class="text-sm font-bold text-slate-700 mb-2">รายการกิจกรรมแยกตามลูกค้า</h2>

        <div v-for="a in activities" :key="a.id"
          :class="actCardClass(a)"
          class="bg-white rounded-xl border border-slate-200 p-4 transition-colors">

          <!-- Top Row: Customer + Status -->
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-slate-800">
                  🏢 {{ a.customer_name || a.ar_code || '(ไม่ระบุลูกค้า)' }}
                </span>
                <span v-if="a.customer_name && a.ar_code" class="text-xs text-slate-400 font-mono">{{ a.ar_code }}</span>
              </div>
              <!-- Owners -->
              <div class="flex items-center gap-1 mt-1 flex-wrap">
                <span v-for="o in a.owners" :key="o.user_id"
                  :class="[
                    o.is_primary ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500',
                    ownerStatusDot(o.status)
                  ]"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium">
                  <span class="w-1.5 h-1.5 rounded-full" :class="ownerDotColor(o.status)"></span>
                  {{ o.name?.split(' ')[0] }}
                </span>
              </div>
            </div>
            <span :class="actStatusClass(a.status)" class="badge shrink-0 ml-2">
              {{ actStatusLabel(a.status) }}
            </span>
          </div>

          <!-- Outcome -->
          <div v-if="a.outcome" class="mb-2 bg-slate-50 rounded-lg px-3 py-2">
            <p class="text-xs text-slate-400 mb-0.5">📝 ผลลัพธ์</p>
            <p class="text-sm text-slate-600 whitespace-pre-line">{{ a.outcome }}</p>
          </div>

          <!-- Call info -->
          <div v-if="info.activity_type === 'call' && (a.call_result || a.call_phone)" class="mb-2 flex gap-3 text-xs text-slate-500 flex-wrap">
            <span v-if="a.call_phone" class="font-mono">📞 {{ a.call_phone }}</span>
            <span v-if="a.call_result" :class="callResultClass(a.call_result)">{{ callResultLabel(a.call_result) }}</span>
            <span v-if="a.duration_sec > 0" class="text-green-600">⏱ {{ Math.floor(a.duration_sec/60) }}:{{ String(a.duration_sec%60).padStart(2,'0') }}</span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
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
              ดูรายละเอียด
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            </RouterLink>
          </div>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <div v-else-if="!loading" class="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
      <p class="text-4xl mb-3">🔍</p>
      <p class="text-sm">ไม่พบกลุ่มกิจกรรมนี้</p>
      <RouterLink to="/activities/review" class="text-blue-600 text-sm mt-2 inline-block hover:underline">← กลับไปหน้ารายการ</RouterLink>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../composables/useApi.js'
import CloseActivityModal from '../components/CloseActivityModal.vue'
import SnoozeActivityModal from '../components/SnoozeActivityModal.vue'

const route = useRoute()
const loading    = ref(false)
const toast      = ref('')
const info       = ref(null)
const activities = ref([])

// ── Modals ──────────────────────────────────────────────────
const closeModal = reactive({ show: false, activity: null })
const snoozeModal = reactive({ show: false, activity: null })
const bulkCloseModal = ref(false)
const bulkClosing = ref(false)
const bulkOutcome = ref('')

function openCloseModal(a) {
  // Build a full-ish activity object for the modal
  closeModal.activity = {
    id: a.id,
    subject: info.value?.subject,
    activity_type: info.value?.activity_type,
    ar_code: a.ar_code,
    start_datetime: info.value?.start_datetime,
  }
  closeModal.show = true
}

function openSnoozeModal(a) {
  snoozeModal.activity = {
    id: a.id,
    subject: info.value?.subject,
    activity_type: info.value?.activity_type,
    start_datetime: info.value?.start_datetime,
    due_date: info.value?.due_date,
  }
  snoozeModal.show = true
}

function onActivityDone() {
  closeModal.show = false
  showToast('ปิดงานเรียบร้อย ✓')
  setTimeout(() => loadDetail(), 800)
}

function onSnoozed() {
  snoozeModal.show = false
  showToast('เลื่อนกำหนดเรียบร้อย ✓')
  setTimeout(() => loadDetail(), 800)
}

// ── Bulk close ──────────────────────────────────────────────
const hasOpenActivities = computed(() => activities.value.some(a => a.status === 'open'))
const openCount = computed(() => activities.value.filter(a => a.status === 'open').length)

async function confirmBulkClose() {
  bulkClosing.value = true
  try {
    const groupKey = route.params.groupKey
    await api.patch(`/activities/groups/${groupKey}/bulk-close`, {
      outcome: bulkOutcome.value || undefined,
    })
    bulkCloseModal.value = false
    bulkOutcome.value = ''
    showToast(`ปิดงานทั้งกลุ่มเรียบร้อย (${openCount.value} รายการ) ✓`)
    setTimeout(() => loadDetail(), 800)
  } catch (err) {
    alert(err.message || 'เกิดข้อผิดพลาด')
  } finally {
    bulkClosing.value = false
  }
}

// ── Toast ───────────────────────────────────────────────────
function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 3000)
}

// ── Load data ───────────────────────────────────────────────
async function loadDetail() {
  loading.value = true
  try {
    const groupKey = route.params.groupKey
    const { data } = await api.get(`/activities/groups/${groupKey}`)
    info.value = data.group_info
    activities.value = data.activities
    // Store first_activity_id for edit link
    if (data.activities.length && !info.value.first_activity_id) {
      info.value.first_activity_id = data.activities[0].id
    }
  } catch (err) {
    console.error(err)
    info.value = null
    activities.value = []
  } finally {
    loading.value = false
  }
}

// ── Helpers ─────────────────────────────────────────────────
const TZ = 'Asia/Bangkok'
function bkkDateStr(v) {
  if (!v) return ''
  const d = new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00+07:00' : v)
  return d.toLocaleDateString('sv-SE', { timeZone: TZ })
}
function todayBkkStr() { return new Date().toLocaleDateString('sv-SE', { timeZone: TZ }) }
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
  const s = bkkDateStr(v)
  const [y, m, dd] = s.split('-')
  return `${dd}/${m}/${y}`
}
function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}
function priorityLabel(p)      { return p === 'high' ? 'สูง' : p === 'low' ? 'ต่ำ' : 'ปกติ' }
function priorityBadgeClass(p) { return p === 'high' ? 'bg-red-50 text-red-600 border-red-200' : p === 'low' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-200' }
function typeIcon(t)           { return t === 'task' ? '✅' : t === 'call' ? '📞' : '👥' }
function typeLabel(t)          { return t === 'task' ? 'งาน' : t === 'call' ? 'โทร' : t === 'meeting' ? 'นัด' : t }
function typeClass(t)          { return t === 'task' ? 'badge-blue' : t === 'call' ? 'badge-purple' : 'badge-orange' }

function groupStatusLabel(s) {
  if (s === 'done') return '✅ เสร็จทั้งหมด'
  if (s === 'open') return '🔄 กำลังดำเนินการ'
  return '⏳ รอดำเนินการ'
}
function groupStatusClass(s) {
  if (s === 'done') return 'badge-green'
  if (s === 'open') return 'badge-yellow'
  return 'badge-red'
}

function actStatusLabel(s) {
  if (s === 'done') return '✅ เสร็จ'
  if (s === 'open') return '🔄 เปิด'
  return '⏸ ยกเลิก'
}
function actStatusClass(s) {
  if (s === 'done') return 'badge-green'
  if (s === 'open') return 'badge-yellow'
  return 'badge-red'
}
function actCardClass(a) {
  if (a.status === 'done') return 'opacity-70'
  return ''
}

function ownerDotColor(s) {
  if (s === 'done') return 'bg-green-500'
  if (s === 'open') return 'bg-amber-400'
  return 'bg-slate-300'
}
function ownerStatusDot() { return '' }

function callResultLabel(r) {
  return r === 'answered' ? '✅ รับสาย' : r === 'no_answer' ? '📵 ไม่รับ' : r === 'busy' ? '🔴 สายไม่ว่าง' : r === 'left_voicemail' ? '📨 ฝากข้อความ' : r
}
function callResultClass(r) { return r === 'answered' ? 'text-green-500' : 'text-red-400' }

onMounted(() => loadDetail())
</script>

<style scoped>
.badge        { @apply inline-flex items-center px-2 py-0.5 rounded text-xs font-medium; }
.badge-blue   { @apply bg-blue-100 text-blue-700; }
.badge-purple { @apply bg-purple-100 text-purple-700; }
.badge-orange { @apply bg-orange-100 text-orange-700; }
.badge-yellow { @apply bg-yellow-100 text-yellow-700; }
.badge-green  { @apply bg-green-100 text-green-700; }
.badge-red    { @apply bg-red-100 text-red-600; }

.modal-fade-enter-active { transition: opacity 0.2s ease; }
.modal-fade-leave-active { transition: opacity 0.15s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to    { opacity: 0; }
</style>
