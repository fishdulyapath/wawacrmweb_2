<template>
  <div class="liff-root">

    <!-- Header -->
    <header class="home-header">
      <div class="header-top">
        <div class="brand">
          <span class="brand-dot"></span>
          <span class="brand-name">Cus Management</span>
        </div>
     
      </div>
      <div class="greeting">
        <p class="greeting-sub">{{ todayTH }}</p>
        <h1 class="greeting-name">สวัสดี, {{ user?.name?.split(' ')[0] || '...' }}</h1>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <div class="spinner"></div>
    </div>

    <template v-else>

      <!-- ── ยังไม่ได้ผูก LINE ── -->
      <div v-if="authState === 'not_linked'" class="not-linked-wrap">
        <div class="not-linked-card">
          <div class="nl-icon">🔗</div>
          <h2 class="nl-title">ยังไม่ได้เชื่อมต่อบัญชี</h2>
          <p class="nl-desc">
            LINE ของคุณยังไม่ได้ผูกกับบัญชี CRM<br>
            กรุณาทำตามขั้นตอนนี้:
          </p>
          <ol class="nl-steps">
            <li><span class="step-num">1</span> เข้าสู่ระบบ CRM ผ่านเว็บเบราว์เซอร์</li>
            <li><span class="step-num">2</span> ไปที่ <strong>โปรไฟล์ → เชื่อมต่อ LINE</strong></li>
            <li><span class="step-num">3</span> กดปุ่ม <strong>"ขอรหัส OTP"</strong></li>
            <li><span class="step-num">4</span> ส่งรหัส OTP (6 หลัก) มาที่ LINE Bot นี้</li>
          </ol>
          <button class="nl-btn" @click="openCrm">
            🌐 เปิดระบบ CRM
          </button>
          <button class="nl-btn-retry" @click="load">
            🔄 ลองใหม่
          </button>
        </div>
      </div>

      <!-- ── Error ── -->
      <div v-else-if="authState === 'error'" class="not-linked-wrap">
        <div class="not-linked-card">
          <div class="nl-icon">⚠️</div>
          <h2 class="nl-title">เกิดข้อผิดพลาด</h2>
          <p class="nl-desc">{{ authError || 'ไม่สามารถโหลดข้อมูลได้' }}</p>
          <button class="nl-btn-retry" @click="load">🔄 ลองใหม่</button>
        </div>
      </div>

      <!-- ── ปกติ ── -->
      <template v-else>
      <div class="summary-grid">
        <div class="sum-card" :class="summary.overdue_tasks > 0 ? 'sum-red' : 'sum-gray'" @click="router.push('/line/tasks')">
          <div class="sum-num">{{ summary.overdue_tasks || 0 }}</div>
          <div class="sum-label">เลยกำหนด</div>
        </div>
        <div class="sum-card sum-blue" @click="router.push('/line/tasks')">
          <div class="sum-num">{{ summary.open_tasks || 0 }}</div>
          <div class="sum-label">งานค้าง</div>
        </div>
        <div class="sum-card sum-purple" @click="router.push('/line/tasks')">
          <div class="sum-num">{{ summary.today_meetings || 0 }}</div>
          <div class="sum-label">นัดวันนี้</div>
        </div>
      </div>

      <!-- Alert: no contact 30d -->
      <div v-if="summary.no_contact_30d > 0" class="alert-card">
        <div class="alert-dot"></div>
        <div class="alert-body">
          <p class="alert-title">ลูกค้า {{ summary.no_contact_30d }} ราย ไม่ได้ติดต่อ 30+ วัน</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section-label">เมนู</div>
      <div class="nav-grid">
        <button class="nav-btn" @click="router.push('/line/tasks')">
          <div class="nav-icon" style="background:rgba(79,70,229,.10);color:#4f46e5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <span class="nav-label">งานของฉัน</span>
          <span v-if="summary.open_tasks > 0" class="nav-badge">{{ summary.open_tasks }}</span>
        </button>
        <button class="nav-btn" @click="openCrm">
          <div class="nav-icon" style="background:rgba(139,92,246,.10);color:#7c3aed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          </div>
          <span class="nav-label">เปิด CRM</span>
        </button>
      </div>

      <!-- Recent Tasks -->
      <template v-if="recentTasks.length > 0">
        <div class="section-label">งานล่าสุด</div>
        <div class="task-preview-list">
          <div v-for="t in recentTasks" :key="t.id"
               class="task-preview"
               :class="{ 'task-overdue': isOverdue(t) }"
               @click="router.push('/line/tasks')">
            <div class="tp-accent" :style="{ background: taskColor(t) }"></div>
            <div class="tp-body">
              <div class="tp-top">
                <span class="tp-type">{{ typeLabel(t) }}</span>
                <span v-if="isOverdue(t)" class="overdue-chip">เลยกำหนด</span>
                <span v-else-if="isDueToday(t)" class="today-chip">วันนี้</span>
              </div>
              <p class="tp-subject">{{ t.subject }}</p>
              <p class="tp-meta">
                <span v-if="t.customer_name">{{ t.customer_name }}</span>
                <span v-else-if="t.ar_code">{{ t.ar_code }}</span>
                <span v-if="t.due_date || t.start_datetime" class="tp-date">
                  · {{ formatDate(t.due_date || t.start_datetime) }}
                </span>
              </p>
            </div>
            <svg class="tp-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
        <button class="see-all-btn" @click="router.push('/line')">ดูทั้งหมด →</button>
      </template>

      </template><!-- /v-else normal content -->

    </template>

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

const router  = useRouter()
const loading = ref(true)
const authState = ref('loading') // 'loading' | 'ok' | 'not_linked' | 'error'
const authError = ref('')
const user    = ref(null)
const summary = ref({})
const recentTasks = ref([])
const toast = reactive({ show: false, type: '', message: '' })

const todayTH = computed(() => new Date().toLocaleDateString('th-TH', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
}))

async function load() {
  loading.value = true
  authState.value = 'loading'
  try {
    // พยายาม LIFF auto-auth ก่อนเรียก API
    await ensureLiffAuth()

    const [meRes, sumRes, taskRes] = await Promise.all([
      liffApi.get('/auth/me'),
      liffApi.get('/liff/summary'),
      liffApi.get('/liff/tasks')
    ])
    user.value    = meRes.data
    summary.value = sumRes.data
    recentTasks.value = taskRes.data.slice(0, 4)
    authState.value = 'ok'
  } catch (e) {
    // ตรวจว่าเป็นกรณียังไม่ได้ผูก LINE หรือไม่
    if (e.message?.includes('ยังไม่ได้ผูก') || e.message?.includes('NOT_LINKED')) {
      authState.value = 'not_linked'
    } else if (e.message?.includes('Token') || e.message?.includes('Login') || e.message?.includes('401')) {
      authState.value = 'not_linked'
      authError.value = e.message
    } else {
      authState.value = 'error'
      authError.value = e.message
      showToast('error', e.message)
    }
  } finally {
    loading.value = false
  }
}

function isOverdue(t) {
  const d = t.due_date || t.start_datetime
  if (!d) return false
  return new Date(d) < new Date(new Date().toDateString())
}

function isDueToday(t) {
  const d = t.due_date || t.start_datetime
  if (!d) return false
  return new Date(d).toDateString() === new Date().toDateString()
}

function taskColor(t) {
  if (isOverdue(t)) return '#ef4444'
  if (t.activity_type === 'meeting') return '#8b5cf6'
  if (t.priority === 'high') return '#f59e0b'
  return '#3b82f6'
}

function typeLabel(t) {
  return t.activity_type === 'task' ? 'งาน' : t.activity_type === 'call' ? 'โทร' : 'นัดประชุม'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function openCrm() {
  const url = import.meta.env.VITE_FRONTEND_URL || window.location.origin
  window.open(url, '_blank')
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
.home-header {
  background: #ffffff;
  padding: 52px 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 8px rgba(15, 23, 42, 0.06);
}
.header-top {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.brand { display: flex; align-items: center; gap: 8px; }
.brand-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #4f46e5;
}
.brand-name {
  font-size: 13px; font-weight: 700; color: #94a3b8;
  letter-spacing: .08em; text-transform: uppercase;
}
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: #f1f5f9; border: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #4f46e5;
}
.greeting-sub { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
.greeting-name { font-size: 24px; font-weight: 700; color: #0f172a; }

/* ── Summary Cards ── */
.summary-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; padding: 20px 16px 0;
}
.sum-card {
  border-radius: 16px; padding: 16px 12px;
  text-align: center; cursor: pointer;
  border: 1px solid transparent;
  background: #ffffff;
  transition: transform 0.1s, box-shadow 0.1s;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
}
.sum-card:active { transform: scale(0.96); }
.sum-num { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 5px; }
.sum-label { font-size: 11px; color: #64748b; }

.sum-blue   { border-color: #e0e7ff; }
.sum-blue .sum-num { color: #4f46e5; }

.sum-red    { border-color: #fee2e2; background: #fff5f5; }
.sum-red .sum-num { color: #dc2626; }

.sum-gray   { border-color: #e2e8f0; }
.sum-gray .sum-num { color: #94a3b8; }

.sum-purple { border-color: #ede9fe; }
.sum-purple .sum-num { color: #7c3aed; }

/* ── Alert ── */
.alert-card {
  margin: 14px 16px 0;
  background: #fff5f5; border: 1px solid #fecaca;
  border-radius: 12px; padding: 12px 14px;
  display: flex; align-items: center; gap: 10px;
}
.alert-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; flex-shrink: 0; }
.alert-title { font-size: 13px; color: #b91c1c; }

/* ── Section label ── */
.section-label {
  font-size: 11px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .1em;
  padding: 20px 16px 10px;
}

/* ── Nav grid ── */
.nav-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 10px; padding: 0 16px;
}
.nav-btn {
  background: #ffffff; border: 1px solid #e2e8f0;
  border-radius: 16px; padding: 16px 10px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  cursor: pointer; position: relative;
  font-family: 'Sarabun', sans-serif;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.nav-btn:active { background: #f8f9fc; border-color: #c7d2fe; box-shadow: none; }
.nav-icon {
  width: 44px; height: 44px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
}
.nav-label { font-size: 12px; font-weight: 600; color: #64748b; text-align: center; }
.nav-badge {
  position: absolute; top: 8px; right: 8px;
  background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 8px;
}

/* ── Task preview ── */
.task-preview-list { padding: 0 16px; display: flex; flex-direction: column; gap: 8px; }
.task-preview {
  background: #ffffff; border: 1px solid #e2e8f0;
  border-radius: 14px; display: flex; align-items: center;
  overflow: hidden; cursor: pointer;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
  transition: border-color 0.15s;
}
.task-preview:active { background: #f8f9fc; }
.task-overdue { border-color: #fecaca; background: #fff5f5; }

.tp-accent { width: 3px; height: 100%; flex-shrink: 0; align-self: stretch; min-height: 58px; }
.tp-body { flex: 1; padding: 12px 10px; min-width: 0; }
.tp-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.tp-type {
  font-size: 10px; color: #94a3b8; font-weight: 600;
  text-transform: uppercase; letter-spacing: .05em;
}
.overdue-chip {
  font-size: 10px; background: #fee2e2; color: #dc2626;
  padding: 1px 6px; border-radius: 6px; font-weight: 600;
}
.today-chip {
  font-size: 10px; background: #e0e7ff; color: #4f46e5;
  padding: 1px 6px; border-radius: 6px; font-weight: 600;
}
.tp-subject {
  font-size: 14px; font-weight: 600; color: #0f172a;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px;
}
.tp-meta { font-size: 11px; color: #94a3b8; }
.tp-date { color: #64748b; }
.tp-arrow { flex-shrink: 0; margin-right: 12px; color: #cbd5e1; }

/* ── See all ── */
.see-all-btn {
  display: block; width: calc(100% - 32px); margin: 10px 16px 0;
  padding: 12px; background: #ffffff; border: 1px solid #e2e8f0;
  border-radius: 12px; color: #64748b; font-size: 13px;
  font-family: 'Sarabun', sans-serif; cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.see-all-btn:active { border-color: #c7d2fe; color: #4f46e5; }

/* ── Loading ── */
.loading-wrap { display: flex; justify-content: center; padding: 80px; }
.spinner {
  width: 32px; height: 32px; border: 2px solid #e2e8f0;
  border-top-color: #4f46e5; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

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

/* ── Not Linked / Error ── */
.not-linked-wrap {
  display: flex; justify-content: center; align-items: flex-start;
  padding: 32px 20px; min-height: 60vh;
}
.not-linked-card {
  background: #fff; border-radius: 20px; padding: 32px 24px;
  text-align: center; box-shadow: 0 2px 16px rgba(15,23,42,0.08);
  max-width: 360px; width: 100%;
}
.nl-icon { font-size: 48px; margin-bottom: 12px; }
.nl-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
.nl-desc { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 20px; }
.nl-steps {
  text-align: left; list-style: none; padding: 0; margin: 0 0 24px;
  display: flex; flex-direction: column; gap: 12px;
}
.nl-steps li {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 14px; color: #334155; line-height: 1.5;
}
.step-num {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
  background: #ede9fe; color: #7c3aed; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.nl-btn {
  display: block; width: 100%; padding: 12px; border-radius: 12px;
  background: #4f46e5; color: #fff; font-size: 15px; font-weight: 600;
  border: none; cursor: pointer; margin-bottom: 10px;
  transition: background 0.2s;
}
.nl-btn:active { background: #4338ca; }
.nl-btn-retry {
  display: block; width: 100%; padding: 10px; border-radius: 12px;
  background: #f1f5f9; color: #475569; font-size: 14px; font-weight: 600;
  border: none; cursor: pointer;
  transition: background 0.2s;
}
.nl-btn-retry:active { background: #e2e8f0; }
</style>
