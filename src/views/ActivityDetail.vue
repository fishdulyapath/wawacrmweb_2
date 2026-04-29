<template>
  <div class="p-6 max-w-2xl mx-auto">

    <!-- ── Close-Task Modal (shared component) ─── -->
    <CloseActivityModal
      :show="closeModal.show"
      :activity="activity"
      @close="closeModal.show = false"
      @done="onActivityDone"
    />

    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink to="/activities" class="text-slate-400 hover:text-slate-600">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </RouterLink>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-slate-800">รายละเอียดกิจกรรม</h1>
      </div>
      <!-- ปุ่มปิดงาน (ถ้ายังไม่เสร็จ) -->
      <button v-if="activity && (activity.my_status || activity.status) === 'open'" @click="openCloseModal"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
        ✓ ปิดงาน
      </button>
      <span v-else-if="activity && (activity.my_status || activity.status) === 'done'"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-sm font-medium">
        ✓ เสร็จแล้ว
      </span>
      <RouterLink v-if="canEdit" :to="`/activities/${activityId}/edit`"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
        แก้ไข
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-slate-400">
      <svg class="w-8 h-8 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      กำลังโหลด...
    </div>

    <!-- Error -->
    <div v-else-if="errorMsg" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      {{ errorMsg }}
    </div>

    <template v-else-if="activity">
      <!-- Type + Status badge -->
      <div class="flex items-center gap-3 mb-4">
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border"
          :class="typeClass(activity.activity_type)">
          {{ typeIcon(activity.activity_type) }} {{ typeLabel(activity.activity_type) }}
        </span>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
          :class="statusClass(activity.status)">
          {{ statusLabel(activity.status) }}
        </span>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
          :class="priorityClass(activity.priority)">
          {{ priorityLabel(activity.priority) }}
        </span>
      </div>

      <!-- Main card -->
      <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">

        <!-- Subject + Description -->
        <div class="px-5 py-4">
          <p class="text-lg font-bold text-slate-800">{{ activity.subject }}</p>
          <p v-if="activity.description" class="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{{ activity.description }}</p>
        </div>

        <!-- Customer -->
        <div v-if="activity.ar_code || activity.customer_name" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <div class="flex-1">
            <p class="text-xs text-slate-400 font-medium">ลูกค้า</p>
            <p class="text-sm font-semibold text-slate-800">
              <span class="font-mono text-slate-500 mr-1">{{ activity.ar_code }}</span>{{ activity.customer_name }}
            </p>
            <!-- ผู้ติดต่อ -->
            <div v-if="contactors.length" class="mt-2 space-y-2">
              <p class="text-xs text-slate-400 font-medium">ผู้ติดต่อ</p>
              <div v-for="ct in contactors" :key="ct.name" class="text-xs">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-slate-700">{{ ct.name }}</span>
                  <span v-if="ct.work_title" class="text-slate-400">{{ ct.work_title }}</span>
                </div>
                <div class="flex flex-wrap gap-1.5 mt-1">
                  <a v-for="ph in ct.phones" :key="ph" :href="`tel:${ph}`"
                    class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white rounded text-xs font-mono hover:bg-green-600 transition-colors">📞 {{ ph }}</a>
                  <span v-if="ct.email" class="text-slate-400 px-1">✉ {{ ct.email }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Owner(s) -->
        <div v-if="activity.owners?.length || activity.owner_name" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <div class="flex-1">
            <p class="text-xs text-slate-400 font-medium">ผู้รับผิดชอบ</p>
            <template v-if="activity.owners?.length">
              <div v-for="o in activity.owners.filter(o => !o.removed_at)" :key="o.user_id"
                class="flex items-center gap-2 mt-1">
                <span class="font-mono text-xs text-slate-400 w-16 shrink-0">{{ o.code }}</span>
                <span class="text-sm font-semibold text-slate-800">{{ o.name }}</span>
                <span v-if="o.is_primary" class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">ผู้ดูแลหลัก</span>
              </div>
            </template>
            <p v-else class="text-sm font-semibold text-slate-800 mt-1">{{ activity.owner_name }}</p>
          </div>
        </div>

        <!-- Date fields -->
        <div v-if="activity.due_date || activity.start_datetime" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <div class="flex-1">
            <template v-if="activity.activity_type === 'task'">
              <p class="text-xs text-slate-400 font-medium">วันที่ครบกำหนด</p>
              <p class="text-sm font-semibold text-slate-800">{{ fmtDate(activity.due_date) }}</p>
            </template>
            <template v-else>
              <p class="text-xs text-slate-400 font-medium">{{ activity.activity_type === 'call' ? 'วันและเวลาโทร' : 'วันและเวลาเริ่มประชุม' }}</p>
              <p class="text-sm font-semibold text-slate-800">{{ fmtDateTime(activity.start_datetime) }}</p>
              <div v-if="activity.end_datetime" class="mt-1">
                <p class="text-xs text-slate-400 font-medium">สิ้นสุด</p>
                <p class="text-sm text-slate-700">{{ fmtDateTime(activity.end_datetime) }}</p>
              </div>
            </template>
          </div>
        </div>

        <!-- Location (meeting) -->
        <div v-if="activity.location" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <div>
            <p class="text-xs text-slate-400 font-medium">สถานที่</p>
            <p class="text-sm text-slate-800">{{ activity.location }}</p>
          </div>
        </div>

        <!-- Meeting URL -->
        <div v-if="activity.meeting_url" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <div>
            <p class="text-xs text-slate-400 font-medium">ลิงก์ประชุม</p>
            <a :href="activity.meeting_url" target="_blank" rel="noopener"
              class="text-sm text-blue-600 hover:underline break-all">{{ activity.meeting_url }}</a>
          </div>
        </div>

        <!-- Invitees (meeting) -->
        <div v-if="activity.invitees && activity.invitees.length" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <div>
            <p class="text-xs text-slate-400 font-medium mb-1.5">ผู้เข้าร่วม ({{ activity.invitees.length }} คน)</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="u in activity.invitees" :key="u.id"
                class="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                {{ u.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Call fields -->
        <template v-if="activity.activity_type === 'call'">
          <div class="px-5 py-4 flex items-start gap-3">
            <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            <div class="flex-1 space-y-2">
              <div class="grid grid-cols-2 gap-x-6 gap-y-2">
                <div v-if="activity.call_phone">
                  <p class="text-xs text-slate-400 font-medium">เบอร์โทร</p>
                  <a :href="`tel:${activity.call_phone}`"
                    class="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-1 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors">
                    📞 {{ activity.call_phone }}
                  </a>
                </div>
                <div v-if="activity.call_direction">
                  <p class="text-xs text-slate-400 font-medium">ทิศทาง</p>
                  <p class="text-sm text-slate-800">{{ activity.call_direction === 'outbound' ? '↗ โทรออก' : '↙ รับสาย' }}</p>
                </div>
                <div v-if="activity.call_result">
                  <p class="text-xs text-slate-400 font-medium">ผลการโทร</p>
                  <p class="text-sm text-slate-800">{{ callResultLabel(activity.call_result) }}</p>
                </div>
                <div v-if="activity.duration_sec > 0">
                  <p class="text-xs text-slate-400 font-medium">ระยะเวลา</p>
                  <p class="text-sm text-slate-800">{{ fmtDuration(activity.duration_sec) }}</p>
                </div>
                <div v-if="activity.cdr_start_stamp">
                  <p class="text-xs text-slate-400 font-medium">เวลาโทร (จริง)</p>
                  <p class="text-sm text-slate-800">{{ fmtDateTime(activity.cdr_start_stamp) }}</p>
                </div>
                <div v-if="activity.cdr_end_stamp">
                  <p class="text-xs text-slate-400 font-medium">เวลาวาง</p>
                  <p class="text-sm text-slate-800">{{ fmtDateTime(activity.cdr_end_stamp) }}</p>
                </div>
              </div>
              <!-- Recording link -->
              <div v-if="activity.cdr_recording_url" class="pt-1">
                <p class="text-xs text-slate-400 font-medium mb-1">บันทึกเสียงการโทร</p>
                <a :href="activity.cdr_recording_url" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                  🎙 ฟังบันทึกการโทร
                </a>
              </div>
            </div>
          </div>
        </template>

        <!-- Outcome -->
        <div v-if="activity.outcome" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <p class="text-xs text-slate-400 font-medium">ผลลัพธ์</p>
            <p class="text-sm text-slate-800 whitespace-pre-wrap">{{ activity.outcome }}</p>
          </div>
        </div>

        <!-- Timestamps -->
        <div class="px-5 py-3 bg-slate-50 rounded-b-xl flex items-center gap-6 text-xs text-slate-400">
          <span>สร้าง: {{ fmtDateTime(activity.created_at) }}</span>
          <span v-if="activity.updated_at && activity.updated_at !== activity.created_at">
            แก้ไข: {{ fmtDateTime(activity.updated_at) }}
          </span>
        </div>
      </div>

      <!-- Attachments -->
      <div class="mt-4 bg-white rounded-xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">ไฟล์แนบ</h3>
        <ActivityAttachments :activity-id="activityId" :readonly="true" />
      </div>
    </template>

  <!-- Toast -->
  <Teleport to="body">
    <div v-if="toast.show"
         :class="['fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
           toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white']">
      <svg v-if="toast.type === 'success'" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      <svg v-else class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
      {{ toast.message }}
    </div>
  </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import api from '../composables/useApi.js'
import ActivityAttachments from '../components/ActivityAttachments.vue'
import CloseActivityModal from '../components/CloseActivityModal.vue'
import { usePermissions } from '../composables/usePermissions.js'

const { canEdit } = usePermissions()

const props = defineProps({ id: String })
const route = useRoute()
const activityId = computed(() => props.id || route.params.id)

const loading  = ref(true)
const errorMsg = ref('')
const saving   = ref(false)
const toast = reactive({ show: false, type: 'success', message: '' })

function showToast(type, message) {
  toast.type = type; toast.message = message; toast.show = true
  setTimeout(() => { toast.show = false }, 3500)
}

// ── Close modal (lightweight — logic in shared component) ────
const closeModal = reactive({ show: false })

function openCloseModal() {
  closeModal.show = true
}

function onActivityDone() {
  closeModal.show = false
  activity.value = { ...activity.value, status: 'done', my_status: 'done' }
}

const activity   = ref(null)
const contactors = ref([])

onMounted(async () => {
  try {
    const { data } = await api.get(`/activities/${activityId.value}`)
    activity.value = data
    // โหลด customer_name + contactors ถ้ามี ar_code
    if (data.ar_code) {
      try {
        const { data: cust } = await api.get(`/customers/${data.ar_code}`)
        // patch customer_name ถ้า backend ไม่ส่งมา
        if (!activity.value.customer_name && cust.name_1) {
          activity.value = { ...activity.value, customer_name: cust.name_1 }
        }
        // contactors ทุกคน (มีเบอร์หรือไม่ก็แสดง)
        contactors.value = (cust.contactors || []).map(ct => ({
          name:      ct.name || '',
          phones:    (ct.telephone || '').split(',').map(p => p.trim()).filter(Boolean),
          work_title: ct.work_title || '',
          email:     ct.email || '',
        }))
      } catch {}
    }
  } catch (e) {
    errorMsg.value = e.message || 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

// ── Formatters ────────────────────────────────────────────────
const TZ = 'Asia/Bangkok'
function fmtDate(v) {
  if (!v) return '-'
  const d = new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00+07:00' : v)
  const [day, month, year] = [
    d.toLocaleDateString('en-GB', { day: '2-digit', timeZone: TZ }),
    d.toLocaleDateString('en-GB', { month: '2-digit', timeZone: TZ }),
    d.toLocaleDateString('en-GB', { year: 'numeric', timeZone: TZ }),
  ]
  return `${day}/${month}/${year}`
}
function fmtDateTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${date} ${time}`
}
function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60
  return m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`
}

// ── Labels ────────────────────────────────────────────────────
function typeLabel(t) { return { task: 'งาน', call: 'โทรศัพท์', meeting: 'ประชุม' }[t] || t }
function typeIcon(t)  { return { task: '✅', call: '📞', meeting: '👥' }[t] || '' }
function typeClass(t) {
  return {
    task:    'bg-blue-50 border-blue-200 text-blue-700',
    call:    'bg-orange-50 border-orange-200 text-orange-700',
    meeting: 'bg-purple-50 border-purple-200 text-purple-700',
  }[t] || 'bg-slate-50 border-slate-200 text-slate-600'
}

function statusLabel(s) { return { open: 'เปิด', done: 'เสร็จแล้ว', snoozed: 'เลื่อน', cancelled: 'ยกเลิก' }[s] || s }
function statusClass(s) {
  return {
    open:      'bg-blue-100 text-blue-700',
    done:      'bg-green-100 text-green-700',
    snoozed:   'bg-amber-100 text-amber-700',
    cancelled: 'bg-slate-100 text-slate-500',
  }[s] || 'bg-slate-100 text-slate-500'
}

function priorityLabel(p) { return { low: 'ต่ำ', normal: 'ปกติ', high: 'สูง' }[p] || p }
function priorityClass(p) {
  return {
    low:    'bg-slate-50 border-slate-200 text-slate-500',
    normal: 'bg-slate-50 border-slate-200 text-slate-600',
    high:   'bg-red-50 border-red-200 text-red-600',
  }[p] || 'bg-slate-50 border-slate-200 text-slate-500'
}

function callResultLabel(r) {
  return {
    answered:       '✅ รับสาย',
    no_answer:      '📵 ไม่รับ',
    busy:           '🔴 สายไม่ว่าง',
    left_voicemail: '📨 ฝากข้อความ',
  }[r] || r
}
</script>

<style scoped>
.modal-fade-enter-active { transition: opacity 0.2s ease; }
.modal-fade-leave-active { transition: opacity 0.15s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to    { opacity: 0; }
</style>
