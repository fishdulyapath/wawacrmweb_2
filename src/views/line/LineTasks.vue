<template>
  <div class="liff-root">

    <!-- Header -->
    <header class="liff-header">
      <button class="back-btn" @click="router ? router.push('/line') : null">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <div class="header-center">
        <h1 class="header-title">งานของฉัน</h1>
        <p class="header-sub">{{ todayTH }}</p>
      </div>
  
    </header>

    <!-- Stats strip -->
    <div class="stats-strip">
      <div class="stat-pill" :class="{ 'stat-danger': stats.overdue > 0 }">
        <span class="stat-num">{{ stats.overdue }}</span>
        <span class="stat-lbl">เลยกำหนด</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-pill">
        <span class="stat-num stat-blue">{{ stats.today }}</span>
        <span class="stat-lbl">วันนี้</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-pill">
        <span class="stat-num">{{ stats.all }}</span>
        <span class="stat-lbl">ทั้งหมด</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat-pill">
        <span class="stat-num stat-purple">{{ stats.meetings }}</span>
        <span class="stat-lbl">นัดวันนี้</span>
      </div>
    </div>

    <!-- Filter chips -->
    <div class="filter-bar">
      <button v-for="f in filters" :key="f.key"
              @click="activeFilter = f.key"
              :class="['filter-chip', activeFilter === f.key ? 'chip-active' : '']">
        {{ f.label }}
        <span v-if="f.count > 0" class="chip-count">{{ f.count }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-wrap">
      <div class="spinner"></div>
    </div>

    <!-- Auth failed -->
    <div v-else-if="authFailed" class="center-wrap">
      <div class="empty-icon" style="font-size:40px">🔗</div>
      <p class="empty-title">ยังไม่ได้เชื่อมต่อ LINE กับ CRM</p>
      <p class="empty-sub">กรุณาผูก LINE ผ่านระบบ CRM ก่อน</p>
      <button @click="router.push('/line')" style="margin-top:12px;padding:8px 20px;border-radius:10px;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer">กลับหน้าหลัก</button>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredActivities.length === 0" class="center-wrap">
      <div class="empty-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      </div>
      <p class="empty-title">ไม่มีงานค้าง</p>
      <p class="empty-sub">ยอดเยี่ยม!</p>
    </div>

    <!-- Task list -->
    <div v-else class="task-list">
      <div v-for="act in filteredActivities" :key="act.id"
           class="task-card"
           :class="{ 'card-overdue': isOverdue(act), 'card-meeting': act.activity_type === 'meeting' }"
           @click="openTask(act)">

        <div class="card-accent" :style="{ background: accentColor(act) }"></div>

        <div class="card-body">
          <div class="card-top">
            <span class="type-chip">{{ typeLabel(act) }}</span>
            <span v-if="isOverdue(act)" class="badge-danger">เลยกำหนด</span>
            <span v-else-if="isDueToday(act)" class="badge-blue">วันนี้</span>
            <span class="prio-dot" :style="{ background: priorityColor(act.priority) }"></span>
          </div>
          <p class="card-subject">{{ act.subject }}</p>
          <div class="card-meta">
            <span v-if="act.customer_name" class="meta-item">{{ act.customer_name }}</span>
            <span v-else-if="act.ar_code" class="meta-item meta-code">{{ act.ar_code }}</span>
            <span v-if="act.due_date || act.start_datetime" class="meta-item meta-date"
                  :class="{ 'meta-danger': isOverdue(act) }">
              {{ formatDate(act.due_date || act.start_datetime) }}
              <template v-if="act.activity_type !== 'task' && act.start_datetime">
                {{ formatTime(act.start_datetime) }}
              </template>
            </span>
            <span v-if="act.activity_type === 'call' && act.call_result" class="meta-item">
              {{ callResultLabel(act.call_result) }}
            </span>
          </div>
          <!-- ผู้ติดต่อ (งานโทร) -->
          <div v-if="act.activity_type === 'call' && act.contactors?.length" class="card-contacts">
            <span v-for="ct in act.contactors" :key="ct.name" class="contact-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {{ ct.name }}
              <span v-if="ct.phones?.length" class="contact-tel">· {{ ct.phones[0] }}</span>
            </span>
          </div>
        </div>

        <svg class="card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>

    <!-- ── Detail Modal ── -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="selectedTask" class="overlay" @click.self="selectedTask = null">
          <div class="sheet">
            <div class="sheet-handle"></div>

            <!-- Sheet header -->
            <div class="sheet-header" :style="{ borderColor: accentColor(selectedTask) }">
              <div class="sh-left">
                <div class="sh-type-row">
                  <span class="sh-type-chip" :style="{ background: accentColor(selectedTask) + '18', color: accentColor(selectedTask) }">
                    {{ typeLabel(selectedTask) }}
                  </span>
                  <span v-if="isOverdue(selectedTask)" class="badge-danger">เลยกำหนด</span>
                  <span v-else-if="isDueToday(selectedTask)" class="badge-blue">วันนี้</span>
                </div>
                <h2 class="sh-title">{{ selectedTask.subject }}</h2>
                <p v-if="selectedTask.customer_name" class="sh-customer">{{ selectedTask.customer_name }}</p>
                <p v-else-if="selectedTask.ar_code" class="sh-customer sh-code">{{ selectedTask.ar_code }}</p>
              </div>
              <button class="close-btn" @click="selectedTask = null">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Sheet body -->
            <div class="sheet-body">

              <!-- กำหนดการ -->
              <div v-if="selectedTask.due_date || selectedTask.start_datetime" class="info-row">
                <span class="info-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </span>
                <div class="info-content">
                  <p class="info-label">{{ selectedTask.activity_type === 'meeting' ? 'เริ่มต้น' : 'กำหนด' }}</p>
                  <p class="info-val" :class="{ 'val-danger': isOverdue(selectedTask) }">
                    {{ formatDateFull(selectedTask.due_date || selectedTask.start_datetime) }}
                  </p>
                </div>
              </div>

              <div v-if="selectedTask.end_datetime" class="info-row">
                <span class="info-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </span>
                <div class="info-content">
                  <p class="info-label">สิ้นสุด</p>
                  <p class="info-val">{{ formatDateFull(selectedTask.end_datetime) }}</p>
                </div>
              </div>

              <div v-if="selectedTask.location" class="info-row">
                <span class="info-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                </span>
                <div class="info-content">
                  <p class="info-label">สถานที่</p>
                  <p class="info-val">{{ selectedTask.location }}</p>
                </div>
              </div>

              <!-- Priority -->
              <div class="info-row">
                <span class="info-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                </span>
                <div class="info-content">
                  <p class="info-label">ลำดับความสำคัญ</p>
                  <span class="prio-badge" :style="{ background: priorityColor(selectedTask.priority)+'18', color: priorityColor(selectedTask.priority) }">
                    {{ priorityLabel(selectedTask.priority) }}
                  </span>
                </div>
              </div>

              <!-- Owners -->
              <div v-if="selectedTask.owners_names" class="info-row">
                <span class="info-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                </span>
                <div class="info-content">
                  <p class="info-label">ผู้รับผิดชอบ</p>
                  <p class="info-val">{{ selectedTask.owners_names }}</p>
                </div>
              </div>

              <!-- ผู้ติดต่อ (contactors จาก POS) -->
              <div v-if="selectedTask.contactors?.length" class="info-row">
                <span class="info-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                </span>
                <div class="info-content">
                  <p class="info-label">ผู้ติดต่อ</p>
                  <div class="invitee-list">
                    <div v-for="ct in selectedTask.contactors" :key="ct.name" class="invitee-row">
                      <div class="invitee-info">
                        <span class="invitee-name">{{ ct.name }}</span>
                        <span v-if="ct.work_title" class="invitee-title">{{ ct.work_title }}</span>
                      </div>
                      <div v-if="ct.phones?.length" class="invitee-phones">
                        <a v-for="phone in ct.phones" :key="phone" :href="`tel:${phone}`" class="invitee-tel">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.82 9.2 19.79 19.79 0 01.77 4.73 2 2 0 012.75 2.5h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 10a16 16 0 006.29 6.29l.87-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                          {{ phone }}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- CALL specific -->
              <template v-if="selectedTask.activity_type === 'call'">
                <div v-if="selectedTask.call_phone" class="info-row">
                  <span class="info-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.82 9.2 19.79 19.79 0 01.77 4.73 2 2 0 012.75 2.5h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 10a16 16 0 006.29 6.29l.87-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  </span>
                  <div class="info-content">
                    <p class="info-label">เบอร์โทร</p>
                    <a :href="`tel:${selectedTask.call_phone}`" class="info-val info-phone">
                      {{ selectedTask.call_phone }}
                    </a>
                  </div>
                </div>

                <div v-if="selectedTask.call_result" class="info-row">
                  <span class="info-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </span>
                  <div class="info-content">
                    <p class="info-label">ผลการโทร</p>
                    <span class="result-badge" :class="callResultClass(selectedTask.call_result)">
                      {{ callResultLabel(selectedTask.call_result) }}
                    </span>
                  </div>
                </div>

                <div v-if="selectedTask.duration_sec > 0" class="info-row">
                  <span class="info-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </span>
                  <div class="info-content">
                    <p class="info-label">ระยะเวลา</p>
                    <p class="info-val">{{ formatDuration(selectedTask.duration_sec) }}</p>
                  </div>
                </div>

                <div v-if="selectedTask.cdr_recording_url" class="info-row">
                  <span class="info-icon">🎙</span>
                  <div class="info-content">
                    <p class="info-label">บันทึกเสียง</p>
                    <a :href="selectedTask.cdr_recording_url" target="_blank" class="info-val info-link">เล่นการบันทึก ↗</a>
                  </div>
                </div>
              </template>

              <!-- Description -->
              <div v-if="selectedTask.description" class="info-row">
                <span class="info-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </span>
                <div class="info-content">
                  <p class="info-label">รายละเอียด</p>
                  <p class="info-val">{{ selectedTask.description }}</p>
                </div>
              </div>

              <!-- Outcome -->
              <div v-if="selectedTask.outcome" class="info-row">
                <span class="info-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                </span>
                <div class="info-content">
                  <p class="info-label">ผลลัพธ์</p>
                  <p class="info-val">{{ selectedTask.outcome }}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toast.show" class="liff-toast" :class="toast.type">{{ toast.message }}</div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import liffApi, { ensureLiffAuth } from '../../composables/useLiffApi.js'

const router = useRouter()
const loading = ref(true)
const authFailed = ref(false)
const activities = ref([])
const user = ref(null)
const selectedTask = ref(null)
const activeFilter = ref('all')
const toast = reactive({ show: false, type: '', message: '' })

const todayTH = computed(() => new Date().toLocaleDateString('th-TH', {
  weekday: 'long', day: 'numeric', month: 'long'
}))

const stats = computed(() => ({
  overdue:  activities.value.filter(a => isOverdue(a)).length,
  today:    activities.value.filter(a => isDueToday(a)).length,
  all:      activities.value.length,
  meetings: activities.value.filter(a => a.activity_type === 'meeting' && isDueToday(a)).length
}))

const filters = computed(() => [
  { key: 'all',     label: 'ทั้งหมด',   count: 0 },
  { key: 'overdue', label: 'เลยกำหนด',  count: stats.value.overdue },
  { key: 'today',   label: 'วันนี้',     count: stats.value.today },
  { key: 'call',    label: 'โทร',        count: activities.value.filter(a => a.activity_type === 'call').length },
  { key: 'meeting', label: 'นัด',        count: stats.value.meetings },
])

const filteredActivities = computed(() => {
  switch (activeFilter.value) {
    case 'overdue': return activities.value.filter(a => isOverdue(a))
    case 'today':   return activities.value.filter(a => isDueToday(a))
    case 'call':    return activities.value.filter(a => a.activity_type === 'call')
    case 'meeting': return activities.value.filter(a => a.activity_type === 'meeting')
    default:        return activities.value
  }
})

async function load() {
  loading.value = true
  authFailed.value = false
  try {
    await ensureLiffAuth()
    const [actRes, meRes] = await Promise.all([
      liffApi.get('/liff/tasks'),
      liffApi.get('/auth/me')
    ])
    activities.value = actRes.data
    user.value = meRes.data
  } catch (e) {
    if (e.message?.includes('ยังไม่ได้ผูก') || e.message?.includes('NOT_LINKED') || e.message?.includes('Token') || e.message?.includes('401')) {
      authFailed.value = true
    }
    showToast('error', e.message)
  } finally {
    loading.value = false
  }
}

function openTask(act) { selectedTask.value = act }

function isOverdue(act) {
  const d = act.due_date || act.start_datetime
  if (!d) return false
  return new Date(d) < new Date(new Date().toDateString())
}

function isDueToday(act) {
  const d = act.due_date || act.start_datetime
  if (!d) return false
  return new Date(d).toDateString() === new Date().toDateString()
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function formatDateFull(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(sec) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`
}

function typeLabel(act) {
  return act.activity_type === 'task' ? 'งาน' : act.activity_type === 'call' ? 'โทร' : 'นัดประชุม'
}

function accentColor(act) {
  if (isOverdue(act)) return '#ef4444'
  if (act.activity_type === 'meeting') return '#8b5cf6'
  if (act.activity_type === 'call') return '#10b981'
  if (act.priority === 'high') return '#f59e0b'
  return '#3b82f6'
}

function priorityColor(p) {
  return p === 'high' ? '#f59e0b' : p === 'low' ? '#6b7280' : '#3b82f6'
}

function priorityLabel(p) {
  return p === 'high' ? 'สูง' : p === 'low' ? 'ต่ำ' : 'ปกติ'
}

function callResultLabel(r) {
  const map = { answered: 'ติดต่อได้', no_answer: 'ไม่รับสาย', busy: 'สายไม่ว่าง', left_voicemail: 'ฝากข้อความ', wrong_number: 'ผิดเบอร์' }
  return map[r] || r
}

function callResultClass(r) {
  if (r === 'answered') return 'result-green'
  if (r === 'no_answer' || r === 'busy') return 'result-red'
  return 'result-gray'
}

function showToast(type, message) {
  toast.type = type; toast.message = message; toast.show = true
  setTimeout(() => { toast.show = false }, 3000)
}

onMounted(load)
</script>

<style scoped>
.liff-root {
  min-height: 100dvh;
  background: #f8f9fc;
  color: #0f172a;
  font-family: 'Sarabun', sans-serif;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
  max-width: 480px;
  margin: 0 auto;
}

/* ── Header ── */
.liff-header {
  display: flex; align-items: center; gap: 12px;
  padding: 52px 16px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.06);
}
.back-btn {
  width: 34px; height: 34px; border-radius: 10px;
  background: #f1f5f9; border: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  color: #64748b; cursor: pointer; flex-shrink: 0;
}
.header-center { flex: 1; }
.header-title { font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.2; }
.header-sub { font-size: 11px; color: #94a3b8; }
.avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: #ede9fe; border: 1px solid #ddd6fe;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #4f46e5; flex-shrink: 0;
}

/* ── Stats strip ── */
.stats-strip {
  display: flex; align-items: center;
  padding: 12px 16px; gap: 0;
  background: #ffffff; border-bottom: 1px solid #e2e8f0;
}
.stat-pill { flex: 1; text-align: center; padding: 4px 0; }
.stat-num { display: block; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.1; }
.stat-num.stat-blue   { color: #4f46e5; }
.stat-num.stat-purple { color: #7c3aed; }
.stat-pill.stat-danger .stat-num { color: #dc2626; }
.stat-lbl { display: block; font-size: 10px; color: #94a3b8; margin-top: 2px; }
.stat-sep { width: 1px; background: #e2e8f0; height: 32px; margin: 0 4px; }

/* ── Filter chips ── */
.filter-bar {
  display: flex; gap: 6px; padding: 12px 14px;
  overflow-x: auto; scrollbar-width: none; background: #f8f9fc;
  border-bottom: 1px solid #e2e8f0;
}
.filter-bar::-webkit-scrollbar { display: none; }
.filter-chip {
  flex-shrink: 0; padding: 5px 12px; border-radius: 20px;
  font-size: 12px; font-family: 'Sarabun', sans-serif; font-weight: 600;
  background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;
  display: flex; align-items: center; gap: 5px; cursor: pointer;
  transition: all 0.15s;
}
.chip-active { background: #4f46e5; color: #ffffff; border-color: #4f46e5; }
.chip-count {
  background: rgba(0, 0, 0, 0.12); color: inherit;
  font-size: 10px; font-weight: 700;
  padding: 1px 5px; border-radius: 8px;
}
.chip-active .chip-count { background: rgba(255, 255, 255, 0.25); }

/* ── Loading / Empty ── */
.center-wrap {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 60px 20px; gap: 10px;
}
.spinner {
  width: 32px; height: 32px; border: 2px solid #e2e8f0;
  border-top-color: #4f46e5; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { color: #cbd5e1; }
.empty-title { font-size: 15px; font-weight: 600; color: #64748b; }
.empty-sub { font-size: 12px; color: #94a3b8; }

/* ── Task list ── */
.task-list { padding: 10px 14px 80px; display: flex; flex-direction: column; gap: 8px; }

.task-card {
  background: #ffffff; border-radius: 14px;
  display: flex; align-items: center; overflow: hidden;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
  transition: border-color 0.15s, box-shadow 0.15s;
  animation: fadeUp 0.25s ease both;
}
.task-card:active { background: #f8f9fc; box-shadow: none; }
.card-overdue { border-color: #fecaca; background: #fff5f5; }
.card-meeting { border-color: #ede9fe; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card-accent { width: 3px; align-self: stretch; flex-shrink: 0; min-height: 64px; }
.card-body { flex: 1; padding: 12px 10px; min-width: 0; }
.card-arrow { flex-shrink: 0; margin-right: 12px; color: #cbd5e1; }

.card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; flex-wrap: wrap; }
.type-chip {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
  color: #94a3b8; background: #f1f5f9; padding: 2px 7px; border-radius: 6px;
}
.badge-danger {
  font-size: 10px; background: #fee2e2; color: #dc2626;
  padding: 2px 7px; border-radius: 6px; font-weight: 600;
}
.badge-blue {
  font-size: 10px; background: #e0e7ff; color: #4f46e5;
  padding: 2px 7px; border-radius: 6px; font-weight: 600;
}
.prio-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-left: auto; }

.card-subject {
  font-size: 14px; font-weight: 600; color: #0f172a;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;
}

.card-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.meta-item { font-size: 11px; color: #94a3b8; }
.meta-code { font-family: monospace; color: #64748b; }
.meta-date { color: #64748b; }
.meta-danger { color: #dc2626 !important; }

/* ── Modal overlay ── */
.overlay {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
  z-index: 100; display: flex; align-items: flex-end;
}
.sheet {
  width: 100%; background: #ffffff;
  border-radius: 20px 20px 0 0;
  max-height: 88dvh; overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom, 20px);
  box-shadow: 0 -4px 32px rgba(15, 23, 42, 0.12);
}
.sheet-handle {
  width: 32px; height: 3px; background: #e2e8f0; border-radius: 2px;
  margin: 10px auto 0;
}

/* ── Sheet header ── */
.sheet-header {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 16px 20px;
  border-bottom: 2px solid transparent;
}
.sh-left { flex: 1; }
.sh-type-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
.sh-type-chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 8px; }
.sh-title { font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.3; margin-bottom: 4px; }
.sh-customer { font-size: 13px; color: #64748b; }
.sh-code { font-family: monospace; }
.close-btn {
  width: 30px; height: 30px; border-radius: 8px;
  background: #f1f5f9; border: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  color: #94a3b8; cursor: pointer; flex-shrink: 0; margin-top: 2px;
}

/* ── Sheet body ── */
.sheet-body { padding: 8px 20px 20px; display: flex; flex-direction: column; gap: 0; }

.info-row {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 12px 0; border-bottom: 1px solid #f1f5f9;
}
.info-row:last-child { border-bottom: none; }
.info-icon {
  width: 28px; height: 28px; border-radius: 8px;
  background: #f8f9fc; border: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  color: #94a3b8; flex-shrink: 0; font-size: 14px; margin-top: 2px;
}
.info-content { flex: 1; }
.info-label {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px;
}
.info-val { font-size: 14px; color: #0f172a; line-height: 1.5; }
.val-danger { color: #dc2626 !important; }
.info-phone { color: #4f46e5; text-decoration: none; }
.info-link  { color: #7c3aed; text-decoration: none; }

/* ── Priority badge ── */
.prio-badge { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 8px; display: inline-block; }

/* ── Card contacts (งานโทร) ── */
.card-contacts { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.contact-tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #4f46e5;
  background: #ede9fe; border-radius: 6px; padding: 2px 7px;
}
.contact-tel { color: #7c3aed; font-weight: 600; }

/* ── Invitee list (detail sheet) ── */
.invitee-list { display: flex; flex-direction: column; gap: 10px; }
.invitee-row { display: flex; flex-direction: column; gap: 4px; }
.invitee-info { display: flex; align-items: baseline; gap: 6px; }
.invitee-name { font-size: 14px; font-weight: 600; color: #0f172a; }
.invitee-title { font-size: 11px; color: #94a3b8; }
.invitee-phones { display: flex; flex-direction: column; gap: 3px; }
.invitee-tel {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 13px; color: #4f46e5; text-decoration: none; font-weight: 600;
}

/* ── Call result badge ── */
.result-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 8px; display: inline-block; }
.result-green { background: #d1fae5; color: #065f46; }
.result-red   { background: #fee2e2; color: #991b1b; }
.result-gray  { background: #f1f5f9; color: #64748b; }

/* ── Sheet transition ── */
.sheet-enter-active { animation: slideUp 0.3s cubic-bezier(.16,1,.3,1); }
.sheet-leave-active { animation: slideUp 0.2s cubic-bezier(.16,1,.3,1) reverse; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.sheet-enter-active .overlay,
.sheet-leave-active .overlay { transition: opacity 0.2s; }
.sheet-enter-from { opacity: 0; }
.sheet-leave-to   { opacity: 0; }

/* ── Toast ── */
.liff-toast {
  position: fixed; bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
  left: 50%; transform: translateX(-50%);
  padding: 10px 20px; border-radius: 24px;
  font-size: 14px; font-family: 'Sarabun', sans-serif;
  font-weight: 600; z-index: 200; white-space: nowrap;
  animation: toastIn 0.3s ease;
}
@keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(10px); } }
.liff-toast.success { background: #059669; color: #fff; }
.liff-toast.error   { background: #dc2626; color: #fff; }
</style>
