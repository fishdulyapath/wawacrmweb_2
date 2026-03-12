<template>
  <div class="liff-root">

    <!-- Header -->
    <header class="log-header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <div>
        <h1 class="log-title">บันทึกการติดต่อ</h1>
        <p class="log-sub" v-if="form.customer_name">{{ form.customer_name }}</p>
      </div>
    </header>

    <!-- Customer Picker (ถ้ายังไม่ได้เลือก) -->
    <div v-if="!form.ar_code" class="customer-picker">
      <p class="section-label">เลือกลูกค้า</p>
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input v-model="customerSearch" class="search-input"
               placeholder="ค้นหาชื่อหรือรหัสลูกค้า..."
               @input="onCustomerSearch"/>
      </div>
      <div v-if="customerResults.length > 0" class="search-results">
        <div v-for="c in customerResults" :key="c.code"
             class="result-item" @click="selectCustomer(c)">
          <div class="result-avatar">{{ c.name_1?.charAt(0) }}</div>
          <div>
            <div class="result-name">{{ c.name_1 }}</div>
            <div class="result-code">{{ c.code }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Form -->
    <div v-if="form.ar_code" class="log-form">

      <!-- Customer Banner -->
      <div class="customer-banner">
        <div class="banner-avatar">{{ form.customer_name?.charAt(0) }}</div>
        <div class="banner-info">
          <div class="banner-name">{{ form.customer_name }}</div>
          <div class="banner-code">รหัส {{ form.ar_code }}</div>
        </div>
        <button class="change-btn" @click="form.ar_code = ''; form.customer_name = ''">
          เปลี่ยน
        </button>
      </div>

      <!-- Phone Number -->
      <div class="form-section">
        <p class="section-label">📞 เบอร์โทร</p>
        <div v-if="availablePhones.length > 0" class="phone-chips">
          <button v-for="p in availablePhones" :key="p"
                  @click="form.phone_number = p"
                  :class="['phone-chip', form.phone_number === p ? 'chip-active' : '']">
            {{ p }}
          </button>
        </div>
        <input v-model="form.phone_number"
               class="form-input" type="tel"
               placeholder="กรอกเบอร์โทร"/>
      </div>

      <!-- Call Status -->
      <div class="form-section">
        <p class="section-label">📊 ผลการโทร</p>
        <div class="status-grid">
          <button v-for="s in callStatuses" :key="s.key"
                  @click="form.call_status = s.key"
                  :class="['status-btn', form.call_status === s.key ? 'status-active' : '']"
                  :style="form.call_status === s.key ? { background: s.color + '22', borderColor: s.color, color: s.color } : {}">
            <span class="status-icon">{{ s.icon }}</span>
            <span class="status-label">{{ s.label }}</span>
          </button>
        </div>
      </div>

      <!-- Duration -->
      <div class="form-section" v-if="form.call_status === 'answered'">
        <p class="section-label">⏱ ระยะเวลา (นาที)</p>
        <div class="duration-row">
          <button v-for="d in [1,3,5,10,15,30]" :key="d"
                  @click="form.duration_min = d"
                  :class="['dur-btn', form.duration_min === d ? 'dur-active' : '']">
            {{ d }}
          </button>
        </div>
        <input v-model.number="form.duration_min" type="number" min="0"
               class="form-input" placeholder="กรอกจำนวนนาที (ถ้าไม่ตรง)"/>
      </div>

      <!-- Followup -->
      <div class="form-section" v-if="form.call_status === 'no_answer' || form.call_status === 'callback'">
        <p class="section-label">📅 นัด Follow-up</p>
        <input v-model="form.followup_date" type="date" class="form-input"/>
        <p class="form-hint">ระบบจะสร้าง Task ให้อัตโนมัติ</p>
      </div>

      <!-- Notes -->
      <div class="form-section">
        <p class="section-label">📝 บันทึกการสนทนา</p>
        <textarea v-model="form.notes" class="form-textarea"
                  rows="4"
                  placeholder="บันทึกรายละเอียดการสนทนา ผลที่ได้รับ ความต้องการของลูกค้า..."></textarea>
        <p class="char-count">{{ form.notes.length }} / 500</p>
      </div>

      <!-- Create Activity checkbox -->
      <div class="form-section">
        <label class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-title">สร้าง Activity ใน CRM</div>
            <div class="toggle-sub">บันทึกการโทรนี้เป็น Activity ในระบบ</div>
          </div>
          <div class="toggle-wrap" @click="form.create_activity = !form.create_activity">
            <div :class="['toggle', form.create_activity ? 'toggle-on' : '']">
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </label>
      </div>

    </div>

    <!-- Bottom Submit -->
    <div v-if="form.ar_code" class="submit-bar">
      <button @click="submit" :disabled="saving || !form.call_status || !form.phone_number"
              class="submit-btn"
              :class="{ 'submit-saving': saving }">
        <svg v-if="saving" class="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        {{ saving ? 'กำลังบันทึก...' : 'บันทึกการโทร' }}
      </button>
    </div>

    <!-- Success overlay -->
    <Teleport to="body">
      <div v-if="saved" class="success-overlay">
        <div class="success-card">
          <div class="success-icon">✅</div>
          <h2 class="success-title">บันทึกสำเร็จ!</h2>
          <p class="success-sub">{{ savedMessage }}</p>
          <div class="success-actions">
            <button @click="resetForm" class="suc-btn suc-outline">โทรใหม่</button>
            <button @click="goBack"    class="suc-btn suc-primary">กลับหน้าหลัก</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import liffApi, { ensureLiffAuth } from '../../composables/useLiffApi.js'

const router = useRouter()
const route  = useRoute()

const saving  = ref(false)
const saved   = ref(false)
const savedMessage = ref('')
const customerSearch  = ref('')
const customerResults = ref([])
const availablePhones = ref([])
let searchTimer = null

const form = reactive({
  ar_code:         '',
  customer_name:   '',
  phone_number:    '',
  call_status:     '',
  duration_min:    0,
  notes:           '',
  followup_date:   '',
  create_activity: true
})

const callStatuses = [
  { key: 'answered',  label: 'ติดต่อได้',     icon: '✅', color: '#059669' },
  { key: 'no_answer', label: 'ไม่รับสาย',      icon: '📵', color: '#ef4444' },
  { key: 'callback',  label: 'โทรกลับทีหลัง',  icon: '🔄', color: '#f59e0b' },
  { key: 'busy',      label: 'สายไม่ว่าง',     icon: '📶', color: '#8b5cf6' }
]

// ── Methods ───────────────────────────────────────────────
function onCustomerSearch() {
  clearTimeout(searchTimer)
  if (!customerSearch.value) { customerResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const { data } = await liffApi.get('/liff/customers', {
        params: { search: customerSearch.value, limit: 8 }
      })
      customerResults.value = data
    } catch {}
  }, 350)
}

async function selectCustomer(c) {
  form.ar_code       = c.code
  form.customer_name = c.name_1
  customerResults.value = []
  customerSearch.value  = ''
  // ดึงเบอร์โทรผู้ติดต่อ
  try {
    const { data } = await liffApi.get(`/liff/customers/${c.code}`)
    const phones = []
    for (const ct of (data.contactors || [])) {
      if (ct.telephone) {
        for (const p of ct.telephone.split(',')) {
          const n = p.trim()
          if (n) phones.push(n)
        }
      }
    }
    availablePhones.value = phones
    if (phones.length > 0) form.phone_number = phones[0]
  } catch {}
}

async function submit() {
  if (saving.value || !form.call_status || !form.phone_number) return
  saving.value = true
  try {
    await liffApi.post('/line/log-call', {
      ar_code:       form.ar_code,
      phone_number:  form.phone_number,
      call_status:   form.call_status,
      duration_sec:  (form.duration_min || 0) * 60,
      notes:         form.notes
    })

    // สร้าง Follow-up Task ถ้าต้องการ
    if (form.create_activity) {
      await liffApi.post('/liff/quick-activity', {
        ar_code:       form.ar_code,
        activity_type: 'call',
        subject:       `โทรหา ${form.customer_name}: ${callStatuses.find(s => s.key === form.call_status)?.label}`,
        call_direction: 'outbound',
        call_result:   form.call_status,
        call_phone:    form.phone_number,
        duration_sec:  (form.duration_min || 0) * 60,
        description:   form.notes,
        status:        'done'
      })
    }

    // สร้าง Follow-up Task อัตโนมัติถ้าไม่รับสาย
    if (form.followup_date && (form.call_status === 'no_answer' || form.call_status === 'callback')) {
      await liffApi.post('/liff/quick-activity', {
        ar_code:       form.ar_code,
        activity_type: 'task',
        subject:       `Follow-up ${form.customer_name}`,
        due_date:      form.followup_date,
        priority:      'normal',
        status:        'open',
        description:   `Follow-up หลังโทร ${new Date().toLocaleDateString('th-TH')}: ${form.notes}`
      })
      savedMessage.value = 'บันทึกการโทรและสร้าง Task Follow-up แล้ว'
    } else {
      savedMessage.value = 'บันทึกการโทรเรียบร้อย'
    }

    saved.value = true
  } catch (e) {
    alert('เกิดข้อผิดพลาด: ' + e.message)
  } finally {
    saving.value = false
  }
}

function resetForm() {
  saved.value = false
  form.ar_code = ''; form.customer_name = ''; form.phone_number = ''
  form.call_status = ''; form.duration_min = 0; form.notes = ''
  form.followup_date = ''; form.create_activity = true
  availablePhones.value = []
}

function goBack() { router.back() }

// ── Init — อ่าน query params ──────────────────────────────
onMounted(async () => {
  await ensureLiffAuth()
  const arCode = route.query.ar_code
  const name   = route.query.name
  if (arCode) {
    selectCustomer({ code: arCode, name_1: name || arCode })
  }
})
</script>

<style scoped>
.liff-root { min-height:100dvh; background:#0f172a; color:#f1f5f9; font-family:'Sarabun',sans-serif; padding-bottom:100px; max-width:480px; margin:0 auto; position:relative; }

/* Header */
.log-header {
  background:linear-gradient(145deg,#312e81,#4338ca);
  padding:52px 20px 20px; display:flex; align-items:flex-start; gap:14px;
}
.back-btn {
  width:36px; height:36px; background:rgba(255,255,255,0.1);
  border:1px solid rgba(255,255,255,0.2); border-radius:10px;
  display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0;
  cursor:pointer; margin-top:2px;
}
.log-title { font-size:20px; font-weight:700; color:#fff; }
.log-sub { font-size:13px; color:#a5b4fc; margin-top:2px; }

/* Customer Picker */
.customer-picker { padding:16px; }
.section-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }

.search-box { position:relative; }
.search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#475569; }
.search-input {
  width:100%; background:#1e293b; border:1px solid #334155; border-radius:12px;
  padding:12px 12px 12px 36px; color:#f1f5f9; font-size:14px;
  font-family:'Sarabun',sans-serif; outline:none;
}
.search-input:focus { border-color:#6366f1; }
.search-results { margin-top:8px; background:#1e293b; border:1px solid #334155; border-radius:12px; overflow:hidden; }
.result-item {
  display:flex; align-items:center; gap:12px; padding:12px 14px;
  border-bottom:1px solid #0f172a; cursor:pointer;
}
.result-item:last-child { border-bottom:none; }
.result-item:active { background:#0f172a; }
.result-avatar {
  width:36px; height:36px; border-radius:10px;
  background:linear-gradient(135deg,#4338ca,#6366f1);
  display:flex; align-items:center; justify-content:center;
  font-weight:700; color:#fff; font-size:16px; flex-shrink:0;
}
.result-name { font-size:14px; font-weight:600; color:#e2e8f0; }
.result-code { font-size:11px; color:#64748b; margin-top:1px; }

/* Log Form */
.log-form { padding:0 16px; }

.customer-banner {
  background:#1e293b; border:1px solid #4338ca; border-radius:14px;
  display:flex; align-items:center; gap:12px; padding:12px 14px; margin:16px 0;
}
.banner-avatar {
  width:40px; height:40px; border-radius:10px;
  background:linear-gradient(135deg,#4338ca,#6366f1);
  display:flex; align-items:center; justify-content:center;
  font-weight:700; color:#fff; font-size:17px; flex-shrink:0;
}
.banner-info { flex:1; }
.banner-name { font-size:15px; font-weight:700; color:#f1f5f9; }
.banner-code { font-size:11px; color:#64748b; margin-top:1px; }
.change-btn { font-size:12px; color:#818cf8; background:none; border:none; cursor:pointer; padding:4px 8px; }

.form-section { margin-bottom:20px; }

/* Phone chips */
.phone-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px; }
.phone-chip {
  padding:7px 14px; border-radius:20px; font-size:13px; font-weight:600;
  font-family:'JetBrains Mono',monospace; cursor:pointer;
  background:#1e293b; border:1px solid #334155; color:#94a3b8;
  transition:all 0.15s;
}
.chip-active { background:#4338ca22; border-color:#6366f1; color:#a5b4fc; }

.form-input {
  width:100%; background:#1e293b; border:1px solid #334155; border-radius:12px;
  padding:12px; color:#f1f5f9; font-size:14px;
  font-family:'Sarabun',sans-serif; outline:none; margin-top:6px;
  transition:border-color 0.15s;
}
.form-input:focus { border-color:#6366f1; }
.form-hint { font-size:11px; color:#64748b; margin-top:4px; padding-left:2px; }

/* Status grid */
.status-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.status-btn {
  padding:12px 8px; border-radius:12px; display:flex; flex-direction:column;
  align-items:center; gap:4px; cursor:pointer;
  background:#1e293b; border:1px solid #334155; color:#94a3b8;
  font-family:'Sarabun',sans-serif; transition:all 0.15s;
}
.status-btn:active { transform:scale(0.97); }
.status-icon { font-size:22px; }
.status-label { font-size:13px; font-weight:600; }

/* Duration */
.duration-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
.dur-btn {
  width:44px; height:44px; border-radius:10px; display:flex; align-items:center;
  justify-content:center; font-size:14px; font-weight:700; cursor:pointer;
  background:#1e293b; border:1px solid #334155; color:#94a3b8;
  font-family:'Sarabun',sans-serif; transition:all 0.15s;
}
.dur-active { background:#4338ca22; border-color:#6366f1; color:#a5b4fc; }

/* Textarea */
.form-textarea {
  width:100%; background:#1e293b; border:1px solid #334155; border-radius:12px;
  padding:12px; color:#f1f5f9; font-size:14px; font-family:'Sarabun',sans-serif;
  outline:none; resize:none; line-height:1.6; transition:border-color 0.15s;
}
.form-textarea:focus { border-color:#6366f1; }
.char-count { font-size:11px; color:#475569; text-align:right; margin-top:4px; }

/* Toggle */
.toggle-row { display:flex; align-items:center; gap:12px; justify-content:space-between; background:#1e293b; border:1px solid #334155; border-radius:12px; padding:14px; }
.toggle-info { flex:1; }
.toggle-title { font-size:14px; font-weight:600; color:#e2e8f0; }
.toggle-sub { font-size:12px; color:#64748b; margin-top:2px; }
.toggle-wrap { flex-shrink:0; cursor:pointer; }
.toggle { width:44px; height:26px; border-radius:13px; background:#334155; position:relative; transition:background 0.2s; }
.toggle-on { background:#4338ca; }
.toggle-thumb {
  position:absolute; top:3px; left:3px; width:20px; height:20px;
  border-radius:50%; background:#fff;
  transition:transform 0.2s cubic-bezier(.34,1.56,.64,1);
}
.toggle-on .toggle-thumb { transform:translateX(18px); }

/* Submit bar */
.submit-bar {
  position:fixed; bottom:0; left:0; right:0;
  background:#0f172a; border-top:1px solid #1e293b;
  padding:12px 16px calc(env(safe-area-inset-bottom,0px) + 12px);
}
.submit-btn {
  width:100%; padding:15px; border-radius:14px;
  background:linear-gradient(135deg,#4338ca,#6366f1);
  color:#fff; font-size:16px; font-weight:700; font-family:'Sarabun',sans-serif;
  border:none; cursor:pointer; display:flex; align-items:center;
  justify-content:center; gap:8px; transition:opacity 0.15s;
}
.submit-btn:disabled { opacity:.5; cursor:not-allowed; }
.submit-btn:active:not(:disabled) { opacity:.9; }
.submit-saving { background:linear-gradient(135deg,#312e81,#4338ca); }
.spin-icon { animation:spin 1s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }

/* Success overlay */
.success-overlay {
  position:fixed; inset:0; background:#0f172a;
  display:flex; align-items:center; justify-content:center;
  z-index:200; animation:fadeIn 0.3s ease;
}
@keyframes fadeIn { from{opacity:0} }
.success-card { text-align:center; padding:0 32px; }
.success-icon { font-size:72px; margin-bottom:16px; animation:bounceIn 0.6s cubic-bezier(.34,1.56,.64,1); }
@keyframes bounceIn { from{transform:scale(0)} to{transform:scale(1)} }
.success-title { font-size:26px; font-weight:800; color:#fff; margin-bottom:8px; }
.success-sub { font-size:15px; color:#64748b; margin-bottom:32px; }
.success-actions { display:flex; gap:12px; }
.suc-btn { flex:1; padding:14px; border-radius:12px; font-size:15px; font-weight:700; font-family:'Sarabun',sans-serif; cursor:pointer; transition:opacity 0.15s; }
.suc-outline { background:#1e293b; border:1px solid #334155; color:#94a3b8; }
.suc-primary { background:linear-gradient(135deg,#4338ca,#6366f1); color:#fff; border:none; }
</style>
