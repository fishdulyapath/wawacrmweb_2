<template>
  <div class="liff-root">

    <!-- Customer Detail View -->
    <template v-if="selectedCustomer">
      <header class="detail-header">
        <button class="back-btn" @click="goBack">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div class="detail-avatar">{{ selectedCustomer.name_1?.charAt(0) }}</div>
      </header>

      <div class="detail-hero">
        <h1 class="detail-name">{{ selectedCustomer.name_1 }}</h1>
        <div class="detail-code">รหัส {{ selectedCustomer.code }}</div>
        <div class="detail-tags">
          <span v-if="selectedCustomer.province" class="tag tag-blue">📍 {{ selectedCustomer.province }}</span>
          <span v-if="selectedCustomer.crm?.customer_type" class="tag tag-purple">
            {{ selectedCustomer.crm.customer_type }}
          </span>
          <span v-if="selectedCustomer.crm?.priority === 'high'" class="tag tag-orange">⭐ VIP</span>
          <span class="tag"
                :class="statusTagClass(selectedCustomer.crm?.crm_status)">
            {{ statusLabel(selectedCustomer.crm?.crm_status) }}
          </span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions" v-if="allPhones.length > 0">
        <p class="section-label">📞 โทรหาลูกค้า</p>
        <div class="phone-list">
          <a v-for="(phone, i) in allPhones" :key="i"
             :href="`tel:${phone.number}`"
             class="phone-card"
             @click="onCallClick(phone)">
            <div class="phone-icon">📞</div>
            <div class="phone-info">
              <div class="phone-number">{{ phone.number }}</div>
              <div class="phone-owner">{{ phone.ownerName }}</div>
            </div>
            <div class="phone-arrow">โทร →</div>
          </a>
        </div>
      </div>

      <!-- Info Sections -->
      <div class="info-sections">

        <!-- ที่อยู่ -->
        <div class="info-card">
          <p class="info-card-title">📍 ที่อยู่</p>
          <div v-if="selectedCustomer.address" class="info-row">
            <span class="info-val">{{ selectedCustomer.address }}</span>
          </div>
          <div class="info-row" v-if="selectedCustomer.tambon || selectedCustomer.amper">
            <span class="info-key">ตำบล/อำเภอ</span>
            <span class="info-val">{{ [selectedCustomer.tambon, selectedCustomer.amper].filter(Boolean).join(' / ') }}</span>
          </div>
          <div class="info-row" v-if="selectedCustomer.province">
            <span class="info-key">จังหวัด</span>
            <span class="info-val">{{ selectedCustomer.province }} {{ selectedCustomer.zip_code }}</span>
          </div>
          <p v-if="!selectedCustomer.address && !selectedCustomer.province" class="no-data">ไม่มีข้อมูลที่อยู่</p>
        </div>

        <!-- ผู้ติดต่อ -->
        <div class="info-card" v-if="customerDetail?.contactors?.length">
          <p class="info-card-title">👤 ผู้ติดต่อ</p>
          <div v-for="(c, i) in customerDetail.contactors" :key="i" class="contactor-item">
            <div class="contactor-name">{{ c.name }}</div>
            <div class="contactor-meta">
              <span v-if="c.email">✉️ {{ c.email }}</span>
              <span v-if="c.work_title">💬 {{ c.work_title }}</span>
            </div>
          </div>
        </div>

        <!-- CRM Info -->
        <div class="info-card">
          <p class="info-card-title">📊 CRM Info</p>
          <div v-if="selectedCustomer.crm?.owner_name" class="info-row">
            <span class="info-key">ผู้ดูแล</span>
            <span class="info-val">{{ selectedCustomer.crm.owner_name }}</span>
          </div>
          <div v-if="selectedCustomer.crm?.last_contacted" class="info-row">
            <span class="info-key">ติดต่อล่าสุด</span>
            <span class="info-val">{{ formatDate(selectedCustomer.crm.last_contacted) }}</span>
          </div>
          <div v-if="selectedCustomer.crm?.crm_remark" class="info-row">
            <span class="info-key">หมายเหตุ</span>
            <span class="info-val">{{ selectedCustomer.crm.crm_remark }}</span>
          </div>
        </div>
      </div>

      <!-- Bottom CTA -->
      <div class="bottom-cta">
        <button class="cta-btn cta-log"
                @click="router.push(`/line/log-call?ar_code=${selectedCustomer.code}&name=${selectedCustomer.name_1}`)">
          📝 บันทึกการติดต่อ
        </button>
      </div>
    </template>

    <!-- Customer List View -->
    <template v-else>
      <header class="list-header">
        <h1 class="list-title">ลูกค้าของฉัน</h1>
        <p class="list-sub">{{ customers.length }} รายการ</p>
      </header>

      <!-- Search -->
      <div class="search-wrap">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input v-model="search"
                 class="search-input"
                 placeholder="ค้นหาชื่อ หรือ รหัสลูกค้า..."
                 @input="onSearch"/>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-wrap">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- List -->
      <div v-else class="customer-list">
        <div v-if="filteredCustomers.length === 0" class="empty-wrap">
          <div class="empty-icon">🔍</div>
          <p class="empty-title">ไม่พบลูกค้า</p>
        </div>

        <div v-for="c in filteredCustomers" :key="c.code"
             class="customer-card" @click="selectCustomer(c)">
          <div class="cust-avatar">{{ c.name_1?.charAt(0) }}</div>
          <div class="cust-info">
            <div class="cust-name">{{ c.name_1 }}</div>
            <div class="cust-meta">
              <span class="cust-code">{{ c.code }}</span>
              <span v-if="c.province" class="cust-province">· {{ c.province }}</span>
            </div>
          </div>
          <div class="cust-right">
            <span v-if="c.crm?.crm_status" class="mini-badge"
                  :class="statusTagClass(c.crm?.crm_status)">
              {{ statusLabel(c.crm?.crm_status) }}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="cust-arrow">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      </div>
    </template>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toast.show" class="liff-toast" :class="toast.type">{{ toast.message }}</div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import liffApi, { ensureLiffAuth } from '../../composables/useLiffApi.js'

const router = useRouter()
const route  = useRoute()
const loading  = ref(true)
const customers = ref([])
const selectedCustomer = ref(null)
const customerDetail   = ref(null)
const search = ref('')
const fromUrl = ref(false)   // true = เข้ามาทาง URL param โดยตรง
const toast = reactive({ show: false, type: '', message: '' })

const filteredCustomers = computed(() => {
  if (!search.value) return customers.value
  const q = search.value.toLowerCase()
  return customers.value.filter(c =>
    c.name_1?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)
  )
})

const allPhones = computed(() => {
  if (!customerDetail.value) return []
  const phones = []
  for (const c of (customerDetail.value.contactors || [])) {
    if (c.telephone) {
      for (const p of c.telephone.split(',')) {
        const num = p.trim()
        if (num) phones.push({ number: num, ownerName: c.name })
      }
    }
  }
  return phones
})

async function load() {
  loading.value = true
  try {
    await ensureLiffAuth()
    // ถ้ามี ar_code ใน URL → โหลด detail โดยตรง ไม่ต้องโหลด list ก่อน
    if (route.params.ar_code) {
      fromUrl.value = true
      await loadDetail(route.params.ar_code)
      return
    }
    // โหลด list ปกติ
    const { data } = await liffApi.get('/liff/customers')
    customers.value = data
  } catch (e) {
    showToast('error', e.message)
  } finally {
    loading.value = false
  }
}

async function loadDetail(arCode) {
  try {
    const { data } = await liffApi.get(`/liff/customers/${arCode}`)
    customerDetail.value = data
    // สร้าง selectedCustomer จาก detail response
    const base = data.customer || {}
    selectedCustomer.value = { ...base, crm: data.crm || null }
  } catch (e) {
    showToast('error', 'ไม่พบข้อมูลลูกค้า: ' + arCode)
  } finally {
    loading.value = false
  }
}

async function selectCustomer(c) {
  selectedCustomer.value = c
  try {
    const { data } = await liffApi.get(`/liff/customers/${c.code}`)
    customerDetail.value = data
    if (data.crm) selectedCustomer.value = { ...c, crm: data.crm }
  } catch {}
}

function goBack() {
  if (fromUrl.value) {
    // มาจาก URL โดยตรง → กลับไป line customers list
    fromUrl.value = false
    selectedCustomer.value = null
    // โหลด list
    loading.value = true
    liffApi.get('/liff/customers').then(({ data }) => {
      customers.value = data
    }).catch(() => {}).finally(() => { loading.value = false })
  } else {
    selectedCustomer.value = null
  }
}

function onSearch() {}

function onCallClick(phone) {
  // บันทึก call log อัตโนมัติว่า initiated
  liffApi.post('/line/log-call', {
    ar_code: selectedCustomer.value.code,
    phone_number: phone.number,
    call_status: 'initiated',
    duration_sec: 0
  }).catch(() => {})
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}
function statusLabel(s) {
  return s === 'active' ? 'ใช้งาน' : s === 'inactive' ? 'ไม่ใช้งาน' : s === 'blacklist' ? 'บัญชีดำ' : '—'
}
function statusTagClass(s) {
  return s === 'active' ? 'tag-green' : s === 'blacklist' ? 'tag-red' : 'tag-gray'
}
function showToast(type, message) {
  toast.type = type; toast.message = message; toast.show = true
  setTimeout(() => { toast.show = false }, 3000)
}

onMounted(load)
</script>

<style scoped>
.liff-root { min-height:100dvh; background:#0f172a; color:#f1f5f9; font-family:'Sarabun',sans-serif; padding-bottom:env(safe-area-inset-bottom,20px); max-width:480px; margin:0 auto; position:relative; }

/* List header */
.list-header { background:linear-gradient(145deg,#134e4a,#0f766e); padding:52px 20px 20px; }
.list-title { font-size:24px; font-weight:700; color:#fff; }
.list-sub { font-size:13px; color:#99f6e4; margin-top:2px; }

/* Search */
.search-wrap { padding:12px 16px; }
.search-box { position:relative; }
.search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#475569; }
.search-input {
  width:100%; background:#1e293b; border:1px solid #334155; border-radius:12px;
  padding:11px 12px 11px 36px; color:#f1f5f9; font-size:14px;
  font-family:'Sarabun',sans-serif; outline:none;
}
.search-input::placeholder { color:#475569; }
.search-input:focus { border-color:#0d9488; }

/* Customer list */
.customer-list { padding:4px 16px 80px; display:flex; flex-direction:column; gap:8px; }
.customer-card {
  background:#1e293b; border:1px solid #334155; border-radius:14px;
  display:flex; align-items:center; gap:12px; padding:12px 14px;
  cursor:pointer; transition:border-color 0.15s;
  animation:fadeUp 0.25s ease both;
}
@keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
.customer-card:active { background:#0f172a; }

.cust-avatar {
  width:42px; height:42px; border-radius:12px;
  background:linear-gradient(135deg,#0d9488,#0891b2);
  display:flex; align-items:center; justify-content:center;
  font-size:18px; font-weight:700; color:#fff; flex-shrink:0;
}
.cust-info { flex:1; min-width:0; }
.cust-name { font-size:15px; font-weight:600; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cust-meta { display:flex; gap:4px; margin-top:2px; }
.cust-code { font-size:11px; color:#64748b; background:#0f172a; padding:1px 7px; border-radius:8px; }
.cust-province { font-size:11px; color:#64748b; }
.cust-right { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
.cust-arrow { color:#334155; }
.mini-badge { font-size:10px; padding:2px 7px; border-radius:8px; font-weight:600; }

/* Detail header */
.detail-header {
  background:#0f172a; padding:52px 20px 12px;
  display:flex; align-items:center; justify-content:space-between;
  position:sticky; top:0; z-index:10; border-bottom:1px solid #1e293b;
}
.back-btn {
  width:36px; height:36px; background:#1e293b; border:1px solid #334155;
  border-radius:10px; display:flex; align-items:center; justify-content:center;
  color:#94a3b8; cursor:pointer;
}
.detail-avatar {
  width:36px; height:36px; border-radius:50%;
  background:linear-gradient(135deg,#0d9488,#0891b2);
  display:flex; align-items:center; justify-content:center;
  font-size:15px; font-weight:700; color:#fff;
}

.detail-hero { background:linear-gradient(160deg,#134e4a,#0f766e); padding:20px 20px 24px; }
.detail-name { font-size:22px; font-weight:700; color:#fff; margin-bottom:4px; }
.detail-code { font-size:12px; color:#99f6e4; margin-bottom:10px; }
.detail-tags { display:flex; flex-wrap:wrap; gap:6px; }
.tag { font-size:11px; padding:3px 10px; border-radius:20px; font-weight:600; }
.tag-blue   { background:rgba(59,130,246,0.2); color:#93c5fd; }
.tag-purple { background:rgba(139,92,246,0.2); color:#c4b5fd; }
.tag-orange { background:rgba(245,158,11,0.2); color:#fcd34d; }
.tag-green  { background:rgba(16,185,129,0.2); color:#6ee7b7; }
.tag-red    { background:rgba(239,68,68,0.2);  color:#fca5a5; }
.tag-gray   { background:rgba(100,116,139,0.2); color:#94a3b8; }

/* Phone */
.quick-actions { padding:16px 16px 0; }
.section-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
.phone-list { display:flex; flex-direction:column; gap:8px; }
.phone-card {
  background:#1e293b; border:1px solid #334155; border-radius:12px;
  display:flex; align-items:center; gap:12px; padding:12px 14px;
  text-decoration:none; transition:border-color 0.15s;
}
.phone-card:active { border-color:#0d9488; background:#0f2a28; }
.phone-icon { font-size:20px; width:36px; text-align:center; }
.phone-info { flex:1; }
.phone-number { font-size:17px; font-weight:700; color:#34d399; font-family:'JetBrains Mono',monospace; }
.phone-owner { font-size:11px; color:#64748b; margin-top:1px; }
.phone-arrow { font-size:12px; color:#0d9488; font-weight:700; }

/* Info sections */
.info-sections { padding:12px 16px 0; display:flex; flex-direction:column; gap:10px; }
.info-card { background:#1e293b; border:1px solid #334155; border-radius:14px; padding:14px; }
.info-card-title { font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.07em; margin-bottom:10px; }
.info-row { display:flex; gap:8px; margin-bottom:7px; }
.info-key { font-size:12px; color:#64748b; min-width:70px; flex-shrink:0; padding-top:1px; }
.info-val { font-size:13px; color:#cbd5e1; flex:1; }
.no-data { font-size:13px; color:#475569; }

.contactor-item { padding:8px 0; border-bottom:1px solid #0f172a; }
.contactor-item:last-child { border-bottom:none; padding-bottom:0; }
.contactor-name { font-size:14px; font-weight:600; color:#e2e8f0; margin-bottom:3px; }
.contactor-meta { display:flex; flex-wrap:wrap; gap:8px; }
.contactor-meta span { font-size:12px; color:#64748b; }

/* Bottom CTA */
.bottom-cta {
  position:sticky; bottom:0; background:#0f172a;
  padding:12px 16px calc(env(safe-area-inset-bottom,0px) + 12px);
  border-top:1px solid #1e293b;
}
.cta-btn {
  width:100%; padding:14px; border-radius:14px;
  font-size:15px; font-weight:700; font-family:'Sarabun',sans-serif;
  cursor:pointer; border:none; transition:opacity 0.15s;
}
.cta-btn:active { opacity:0.85; }
.cta-log { background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; }

/* Shared */
.loading-wrap,.empty-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; gap:10px; color:#64748b; }
.spinner { width:36px; height:36px; border:3px solid #1e293b; border-top-color:#0d9488; border-radius:50%; animation:spin 0.8s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }
.empty-icon { font-size:48px; }
.empty-title { font-size:15px; font-weight:600; color:#475569; }
.liff-toast { position:fixed; bottom:calc(env(safe-area-inset-bottom,0px) + 24px); left:50%; transform:translateX(-50%); padding:10px 20px; border-radius:24px; font-size:14px; font-family:'Sarabun',sans-serif; font-weight:600; z-index:200; white-space:nowrap; animation:toastIn 0.3s ease; }
@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(10px)} }
.liff-toast.success { background:#059669; color:#fff; }
.liff-toast.error   { background:#dc2626; color:#fff; }
</style>
