<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-end lg:items-center justify-center px-0 lg:px-4">
        <div class="absolute inset-0 bg-black/50" @click="$emit('close')"></div>
        <div class="relative bg-white w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">

          <!-- Handle (mobile) -->
          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 lg:hidden"></div>

          <!-- Header -->
          <div class="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                 :class="activity?.activity_type === 'call' ? 'bg-purple-50' : activity?.activity_type === 'meeting' ? 'bg-orange-50' : 'bg-blue-50'">
              {{ typeIcon(activity?.activity_type) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-slate-800 text-sm truncate">{{ activity?.subject }}</p>
              <p class="text-xs text-slate-400">ปิดงาน — บันทึกผลลัพธ์</p>
            </div>
            <button @click="$emit('close')" class="text-slate-300 hover:text-slate-500 p-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="overflow-y-auto px-5 py-4 space-y-4 flex-1">

            <!-- CALL fields -->
            <template v-if="activity?.activity_type === 'call'">
              <div>
                <label class="modal-label">📞 เบอร์โทร</label>
                <div v-if="phones.length" class="space-y-1.5 mb-2">
                  <div v-for="ct in phones" :key="ct.name" class="flex flex-wrap items-center gap-1.5">
                    <span class="text-xs text-slate-500 w-full">{{ ct.name }}</span>
                    <span v-for="ph in ct.phones" :key="ph"
                      :class="form.call_phone === ph
                        ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'"
                      class="inline-flex items-stretch border rounded-lg overflow-hidden text-sm font-mono">
                      <button @click="form.call_phone = ph"
                        :class="form.call_phone === ph ? 'text-blue-700' : 'text-slate-600'"
                        class="px-3 py-1.5 transition-colors" type="button">
                        {{ ph }}
                      </button>
                      <a :href="`tel:${ph}`" @click="form.call_phone = ph"
                        class="px-2.5 py-1.5 bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center"
                        title="กดเพื่อโทร">📞</a>
                    </span>
                  </div>
                </div>
                <div class="flex items-stretch gap-2">
                  <input v-model="form.call_phone" class="modal-input flex-1" placeholder="0812345678" type="tel" />
                  <a v-if="form.call_phone" :href="`tel:${form.call_phone}`"
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center text-sm font-semibold whitespace-nowrap"
                    title="กดเพื่อโทร">📞 โทร</a>
                </div>
              </div>

              <div>
                <label class="modal-label">📊 ผลการโทร</label>
                <div class="grid grid-cols-2 gap-2">
                  <button v-for="s in callStatuses" :key="s.key"
                    @click="form.call_result = s.key"
                    :class="form.call_result === s.key
                      ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                    class="py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2">
                    <span>{{ s.icon }}</span><span>{{ s.label }}</span>
                  </button>
                </div>
              </div>

              <div v-if="form.call_result === 'answered' || form.duration_sec > 0">
                <label class="modal-label">
                  ⏱ ระยะเวลา
                  <span v-if="form.duration_sec > 0" class="ml-1 text-blue-600 font-semibold">
                    ({{ Math.floor(form.duration_sec/60) }}:{{ String(form.duration_sec%60).padStart(2,'0') }})
                  </span>
                </label>
                <div class="flex gap-2 flex-wrap mb-2">
                  <button v-for="d in [1,3,5,10,15,30]" :key="d"
                    @click="form.duration_sec = d * 60"
                    :class="form.duration_sec === d * 60 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                    class="w-11 h-10 rounded-lg border text-sm font-semibold transition-colors">
                    {{ d }}
                  </button>
                </div>
                <input :value="form.duration_sec"
                       @input="form.duration_sec = parseInt($event.target.value) || 0"
                       type="number" min="0"
                       class="modal-input" placeholder="กรอกจำนวนวินาที" />
              </div>

              <!-- CDR Picker -->
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <div class="px-3 py-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
                  <p class="text-xs font-semibold text-slate-600">📋 แนบประวัติการโทร</p>
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <p class="text-[10px] text-slate-400 mb-0.5">จากวันที่</p>
                      <input v-model="cdrSearch.date_from" type="date"
                        class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                    </div>
                    <div class="flex-1">
                      <p class="text-[10px] text-slate-400 mb-0.5">ถึงวันที่</p>
                      <input v-model="cdrSearch.date_to" type="date"
                        class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <input v-model="cdrSearch.phone" type="tel" placeholder="เบอร์โทร (ว่างไว้ = ทั้งหมด)"
                      @keydown.enter.prevent="loadCdr"
                      class="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                    <button @click="loadCdr" :disabled="cdrLoading"
                      class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 shrink-0">
                      <svg v-if="cdrLoading" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      <span>{{ cdrLoading ? '...' : '🔍 ค้นหา' }}</span>
                    </button>
                  </div>
                </div>
                <div v-if="cdrError" class="px-3 py-2 text-xs text-slate-400 text-center">{{ cdrError }}</div>
                <div v-if="selectedCdr" class="px-3 py-2 bg-green-50 border-b border-green-100 flex items-start gap-2">
                  <span class="text-green-500 text-sm mt-0.5">✓</span>
                  <div class="flex-1 text-xs">
                    <p class="font-semibold text-green-700">เลือกแล้ว: {{ selectedCdr.destination_number }}</p>
                    <p class="text-slate-500">{{ selectedCdr.start_stamp }} · {{ selectedCdr.call_result }}
                      <template v-if="selectedCdr.duration > 0"> · {{ Math.floor(selectedCdr.duration/60) }}:{{ String(selectedCdr.duration%60).padStart(2,'0') }} นาที</template>
                    </p>
                    <a v-if="selectedCdr.recording" :href="selectedCdr.recording" target="_blank"
                      class="text-blue-600 hover:underline">🎙 ฟังการโทร</a>
                  </div>
                  <button @click="selectedCdr=null;form.cdr_uuid=''" class="text-slate-300 hover:text-slate-500 text-xs">✕</button>
                </div>
                <div v-if="cdrList.length" class="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  <button v-for="r in cdrList" :key="r.xml_cdr_uuid"
                    @click="selectCdr(r)"
                    :class="selectedCdr?.xml_cdr_uuid === r.xml_cdr_uuid ? 'bg-blue-50' : 'hover:bg-slate-50'"
                    class="w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5"
                      :class="r.call_result==='Answered' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'">
                      {{ r.call_result === 'Answered' ? '✅' : '📵' }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-mono font-semibold text-slate-700">{{ r.destination_number }}</span>
                        <span class="text-xs text-slate-400">{{ r.caller_id_name }}</span>
                        <span v-if="r.duration > 0" class="text-xs text-green-600 font-medium">
                          {{ Math.floor(r.duration/60) }}:{{ String(r.duration%60).padStart(2,'0') }} นาที
                        </span>
                      </div>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-xs text-slate-400">{{ r.start_stamp }}</span>
                        <a v-if="r.recording" :href="r.recording" target="_blank" @click.stop
                          class="text-xs text-blue-600 hover:underline">🎙 ฟัง</a>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </template>

            <!-- MEETING fields -->
            <template v-if="activity?.activity_type === 'meeting'">
              <div>
                <label class="modal-label">📊 ผลการประชุม</label>
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="s in meetingStatuses" :key="s.key"
                    @click="form.meeting_result = s.key"
                    :class="form.meeting_result === s.key
                      ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                    class="py-2.5 px-2 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-1">
                    <span class="text-base">{{ s.icon }}</span>
                    <span class="text-xs">{{ s.label }}</span>
                  </button>
                </div>
              </div>
            </template>

            <!-- Outcome (ทุก type) -->
            <div>
              <label class="modal-label">📝 ผลลัพธ์ / สิ่งที่ทำ</label>
              <textarea v-model="form.outcome" class="modal-input min-h-[80px] resize-none" rows="3"
                :placeholder="activity?.activity_type === 'call'
                  ? 'เช่น ลูกค้าสนใจ นัดส่งใบเสนอราคาวันพุธ...'
                  : activity?.activity_type === 'meeting'
                    ? 'เช่น ตกลงราคาแล้ว รอลูกค้าอนุมัติ...'
                    : 'เช่น ดำเนินการเสร็จแล้ว...'">
              </textarea>
            </div>
          </div>

          <!-- ไฟล์แนบ -->
          <div v-if="activity?.id" class="px-5 pb-3">
            <label class="modal-label mb-2 block">📎 ไฟล์แนบ</label>
            <ActivityAttachments :activity-id="activity.id" />
          </div>

          <!-- Footer -->
          <div class="px-5 py-4 border-t border-slate-100 flex gap-3">
            <button @click="$emit('close')"
              class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button @click="confirmClose" :disabled="saving"
              class="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              ✓ ยืนยันปิดงาน
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import api from '../composables/useApi.js'
import ActivityAttachments from './ActivityAttachments.vue'

const props = defineProps({
  show:     { type: Boolean, default: false },
  activity: { type: Object,  default: null },
})

const emit = defineEmits(['close', 'done'])

// ── Form state ────────────────────────────────────────────────
const form = reactive({
  outcome: '', call_phone: '', call_result: '', call_direction: 'outbound',
  duration_sec: 0, meeting_result: '',
  cdr_uuid: '', cdr_recording_url: '', cdr_start_stamp: '', cdr_end_stamp: '',
})

const phones      = ref([])
const saving      = ref(false)
const cdrSearch   = reactive({ phone: '', date_from: '', date_to: '' })
const cdrList     = ref([])
const cdrLoading  = ref(false)
const cdrError    = ref('')
const selectedCdr = ref(null)

const callStatuses = [
  { key: 'answered',       label: 'ติดต่อได้',   icon: '✅' },
  { key: 'no_answer',      label: 'ไม่รับสาย',    icon: '📵' },
  { key: 'busy',           label: 'สายไม่ว่าง',  icon: '🔴' },
  { key: 'left_voicemail', label: 'ฝากข้อความ',  icon: '📨' },
]
const meetingStatuses = [
  { key: 'completed', label: 'เสร็จสิ้น', icon: '✅' },
  { key: 'postponed', label: 'เลื่อน',    icon: '📅' },
  { key: 'cancelled', label: 'ยกเลิก',    icon: '❌' },
]

function typeIcon(t) {
  return t === 'task' ? '✅' : t === 'call' ? '📞' : '👥'
}

// ── Reset form when activity changes ──────────────────────────
watch(() => props.activity, async (act) => {
  if (!act) return
  resetForm()
  // init cdrSearch defaults
  const fmt = d => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
  const base = act.start_datetime ? new Date(act.start_datetime) : new Date()
  cdrSearch.date_from = fmt(base)
  cdrSearch.date_to   = fmt(base)
  cdrSearch.phone     = ''

  if (act.activity_type === 'call' && act.ar_code) {
    try {
      const { data } = await api.get(`/customers/${act.ar_code}`)
      const grouped = (data.contactors || []).map(ct => ({
        name:   ct.name || '',
        phones: (ct.telephone || '').split(',').map(p => p.trim()).filter(Boolean),
      })).filter(ct => ct.phones.length)
      phones.value = grouped
      if (grouped.length) {
        form.call_phone  = grouped[0].phones[0]
        cdrSearch.phone  = grouped[0].phones[0]
      }
    } catch {}
  }
})

function resetForm() {
  form.outcome = ''; form.call_phone = ''; form.call_result = ''
  form.call_direction = 'outbound'; form.duration_sec = 0; form.meeting_result = ''
  form.cdr_uuid = ''; form.cdr_recording_url = ''; form.cdr_start_stamp = ''; form.cdr_end_stamp = ''
  phones.value = []; cdrList.value = []; cdrError.value = ''; selectedCdr.value = null
}

// ── CDR ───────────────────────────────────────────────────────
async function loadCdr() {
  cdrLoading.value = true; cdrError.value = ''; cdrList.value = []
  try {
    const params = {
      date_from: cdrSearch.date_from,
      date_to:   cdrSearch.date_to,
      direction: form.call_direction,
    }
    if (cdrSearch.phone.trim()) params.phone = cdrSearch.phone.trim()
    const { data } = await api.get('/cdr', { params })
    cdrList.value = data
    if (!data.length) cdrError.value = 'ไม่พบประวัติการโทร'
  } catch {
    cdrError.value = 'โหลดประวัติโทรไม่สำเร็จ'
  } finally {
    cdrLoading.value = false
  }
}

function selectCdr(r) {
  selectedCdr.value = r
  const resultMap = { 'Answered': 'answered', 'No Answer': 'no_answer', 'Busy': 'busy', 'Cancelled': 'no_answer', 'Voicemail': 'left_voicemail' }
  form.call_result       = resultMap[r.call_result] || 'answered'
  form.call_phone        = r.destination_number || form.call_phone
  form.call_direction    = r.direction === 'inbound' ? 'inbound' : 'outbound'
  form.duration_sec      = parseInt(r.duration || 0)
  form.cdr_uuid          = r.xml_cdr_uuid || ''
  form.cdr_recording_url = r.recording || ''
  form.cdr_start_stamp   = r.start_stamp ? r.start_stamp.replace(' ', 'T') + '+07:00' : ''
  form.cdr_end_stamp     = r.end_stamp   ? r.end_stamp.replace(' ', 'T')   + '+07:00' : ''
}

// ── Confirm close ─────────────────────────────────────────────
async function confirmClose() {
  if (saving.value) return
  saving.value = true
  try {
    const act = props.activity
    const payload = { outcome: form.outcome || undefined }

    if (act.activity_type === 'call') {
      if (form.call_phone)  payload.call_phone  = form.call_phone
      if (form.call_result) payload.call_result = form.call_result
      payload.call_direction = form.call_direction
      if (form.duration_sec > 0) payload.duration_sec = form.duration_sec
      if (form.cdr_uuid)          payload.cdr_uuid          = form.cdr_uuid
      if (form.cdr_recording_url) payload.cdr_recording_url = form.cdr_recording_url
      if (form.cdr_start_stamp)   payload.cdr_start_stamp   = form.cdr_start_stamp
      if (form.cdr_end_stamp)     payload.cdr_end_stamp     = form.cdr_end_stamp
    }
    if (act.activity_type === 'meeting' && form.meeting_result) {
      const label = meetingStatuses.find(s => s.key === form.meeting_result)?.label || ''
      payload.outcome = (form.outcome ? form.outcome + '\n' : '') + `ผลการประชุม: ${label}`
    }

    await api.patch(`/activities/${act.id}/done`, payload)
    emit('done', act)
  } catch (err) {
    alert(err.response?.data?.error || err.message || 'เกิดข้อผิดพลาด')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-label { @apply block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2; }
.modal-input { @apply w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500; }

.modal-fade-enter-active { transition: opacity 0.2s ease; }
.modal-fade-leave-active { transition: opacity 0.15s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to    { opacity: 0; }
</style>
