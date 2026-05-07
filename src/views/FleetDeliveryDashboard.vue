<template>
  <main class="fleet-page">
    <header class="fleet-header">
      <div>
        <p class="eyebrow">GOOGLE SHEET MIRROR</p>
        <h1>FLEET INTELLIGENCE</h1>
      </div>
      <div class="sync-chip">
        <span>Sync</span>
        <strong>{{ lastSyncedAt || 'ยังไม่มีข้อมูล' }}</strong>
      </div>
    </header>

    <section class="search-panel">
      <label>
        <span>เที่ยวรถ</span>
        <input
          v-model.trim="filters.trip"
          type="search"
          placeholder="TMS-2026429-0003"
          @keyup.enter="searchTrips(0)"
        />
      </label>
      <label>
        <span>คนขับ</span>
        <input
          v-model.trim="filters.driver"
          type="search"
          placeholder="ชื่อคนขับ"
          @keyup.enter="searchTrips(0)"
        />
      </label>
      <button class="primary-btn" :disabled="loading" @click="searchTrips(0)">
        {{ loading ? 'กำลังค้นหา' : 'ค้นหา' }}
      </button>
      <button class="ghost-btn" :disabled="loading" @click="clearSearch">
        ล้าง
      </button>
    </section>

    <section class="content-grid">
      <div class="results-panel">
        <div class="panel-head">
          <div>
            <h2>รายการเที่ยวรถ</h2>
            <p>{{ fmt(meta.total) }} รายการ</p>
          </div>
        </div>

        <div v-if="loading" class="state">กำลังโหลดข้อมูล</div>
        <div v-else-if="error" class="state error">{{ error }}</div>
        <div v-else-if="!trips.length" class="state">ไม่พบข้อมูล</div>

        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เที่ยวรถ</th>
                <th>วันที่</th>
                <th>คนขับ</th>
                <th>รถ</th>
                <th class="num">ยอด</th>
                <th class="num">บิล</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="trip in trips"
                :key="trip.car_release_id"
                :class="{ active: selectedTrip?.car_release_id === trip.car_release_id }"
                @click="openTrip(trip.car_release_id)"
              >
                <td>
                  <strong>{{ trip.car_release_code || trip.car_release_id }}</strong>
                  <span>{{ trip.car_release_id }}</span>
                </td>
                <td>{{ fmtDate(trip.trip_date) }}</td>
                <td>{{ trip.driver_name || trip.user_id || '-' }}</td>
                <td>{{ trip.license_plate || trip.car_name || '-' }}</td>
                <td class="num">{{ fmtMoney(trip.total_amount) }}</td>
                <td class="num">{{ fmt(trip.total_number_of_bills) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="meta.total > meta.limit" class="pager">
          <button :disabled="meta.offset === 0 || loading" @click="searchTrips(meta.offset - meta.limit)">
            ก่อนหน้า
          </button>
          <span>{{ meta.offset + 1 }}-{{ Math.min(meta.offset + meta.limit, meta.total) }} จาก {{ fmt(meta.total) }}</span>
          <button :disabled="meta.offset + meta.limit >= meta.total || loading" @click="searchTrips(meta.offset + meta.limit)">
            ถัดไป
          </button>
        </div>
      </div>

      <aside class="detail-panel">
        <div v-if="detailLoading" class="state">กำลังโหลดรายละเอียด</div>
        <div v-else-if="!selectedTrip" class="empty-detail">
          <h2>เลือกรายการเพื่อดูรายละเอียด</h2>
        </div>

        <template v-else>
          <div class="detail-head">
            <p class="eyebrow">TRIP DETAIL</p>
            <h2>{{ selectedTrip.car_release_code || selectedTrip.car_release_id }}</h2>
            <p>{{ selectedTrip.driver_name || '-' }} · {{ selectedTrip.license_plate || selectedTrip.car_name || '-' }}</p>
          </div>

          <div class="metric-row">
            <div>
              <span>วันที่</span>
              <strong>{{ fmtDate(selectedTrip.trip_date) }}</strong>
            </div>
            <div>
              <span>จุดส่ง</span>
              <strong>{{ fmt(selectedTrip.stops?.length) }}</strong>
            </div>
            <div>
              <span>ยอดรวม</span>
              <strong>{{ fmtMoney(selectedTrip.total_amount) }}</strong>
            </div>
          </div>

          <div class="stops-list">
            <article v-for="stop in selectedTrip.stops" :key="stop.list_id" class="stop-card">
              <div class="stop-top">
                <div>
                  <span class="seq">#{{ stop.sequence_no || '-' }}</span>
                  <h3>{{ stop.store_name_result || stop.store_name || stop.store_id || '-' }}</h3>
                  <p>{{ stop.data_store_no || stop.zone || stop.list_id }}</p>
                </div>
                <span class="status" :class="stopStatusClass(stop)">
                  {{ stopStatus(stop) }}
                </span>
              </div>

              <div class="timeline">
                <div>
                  <span>Check-in</span>
                  <strong>{{ fmtDateTime(stop.date_time_check_in) }}</strong>
                </div>
                <div>
                  <span>Check-out</span>
                  <strong>{{ fmtDateTime(stop.date_time_check_out) }}</strong>
                </div>
              </div>

              <div class="note-grid">
                <div>
                  <span>ยอด</span>
                  <strong>{{ fmtMoney(stop.amount) }}</strong>
                </div>
                <div>
                  <span>Visit</span>
                  <strong>{{ displayVisit(stop.visit) }}</strong>
                </div>
              </div>

              <p v-if="stop.visit_note" class="note">{{ stop.visit_note }}</p>

              <div class="images-row" v-if="stop.image_check_in || stop.image_bill">
                <figure v-if="stop.image_check_in">
                  <img v-if="imageSrc(stop.image_check_in)" :src="imageSrc(stop.image_check_in)" alt="Check-in" />
                  <figcaption>รูป Check-in</figcaption>
                  <small v-if="!imageSrc(stop.image_check_in)">{{ stop.image_check_in }}</small>
                </figure>
                <figure v-if="stop.image_bill">
                  <img v-if="imageSrc(stop.image_bill)" :src="imageSrc(stop.image_bill)" alt="Check-out" />
                  <figcaption>รูป Check-out</figcaption>
                  <small v-if="!imageSrc(stop.image_bill)">{{ stop.image_bill }}</small>
                </figure>
              </div>

              <div v-if="stop.problems?.length" class="problems">
                <h4>ปัญหา</h4>
                <div v-for="problem in stop.problems" :key="problem.problem_id" class="problem-item">
                  <div>
                    <strong>{{ problem.problem_type || 'ไม่ระบุประเภท' }}</strong>
                    <p>{{ problem.description || problemNote(problem) || '-' }}</p>
                  </div>
                  <span :class="problem.is_resolved ? 'resolved' : 'open-problem'">
                    {{ problem.is_resolved ? 'แก้แล้ว' : 'ค้างอยู่' }}
                  </span>
                  <figure v-if="problem.image_problem">
                    <img v-if="imageSrc(problem.image_problem)" :src="imageSrc(problem.image_problem)" alt="Problem" />
                    <small v-else>{{ problem.image_problem }}</small>
                  </figure>
                </div>
              </div>
            </article>
          </div>
        </template>
      </aside>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import apiBase from '../composables/useApi.js'

const filters = reactive({
  trip: '',
  driver: '',
})

const trips = ref([])
const selectedTrip = ref(null)
const meta = ref({ total: 0, limit: 20, offset: 0 })
const loading = ref(false)
const detailLoading = ref(false)
const error = ref('')
const lastSyncedAt = ref('')
const imageUrls = reactive({})
let imageBatch = 0

function params(offset = 0) {
  const p = new URLSearchParams({ limit: '20', offset: String(Math.max(0, offset)) })
  if (filters.trip) p.set('q', filters.trip)
  if (filters.driver) p.set('driver', filters.driver)
  return p.toString()
}

async function searchTrips(offset = 0) {
  loading.value = true
  error.value = ''
  try {
    const { data } = await apiBase.get(`/fleet/trips?${params(offset)}`)
    trips.value = data.data || []
    meta.value = data.meta || { total: 0, limit: 20, offset }
    if (!selectedTrip.value && trips.value.length) {
      await openTrip(trips.value[0].car_release_id)
    } else if (selectedTrip.value && !trips.value.some(t => t.car_release_id === selectedTrip.value.car_release_id)) {
      selectedTrip.value = null
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function openTrip(id) {
  detailLoading.value = true
  try {
    const { data } = await apiBase.get(`/fleet/trips/${encodeURIComponent(id)}`)
    selectedTrip.value = data.data
  } catch (e) {
    error.value = e.response?.data?.error || e.message
  } finally {
    detailLoading.value = false
  }
}

function revokeFleetImages() {
  Object.values(imageUrls).forEach(url => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
  })
  Object.keys(imageUrls).forEach(key => delete imageUrls[key])
}

function collectImagePaths(trip) {
  const paths = []
  for (const stop of trip?.stops || []) {
    if (stop.image_check_in) paths.push(stop.image_check_in)
    if (stop.image_bill) paths.push(stop.image_bill)
    for (const problem of stop.problems || []) {
      if (problem.image_problem) paths.push(problem.image_problem)
    }
  }
  return [...new Set(paths.map(p => String(p).trim()).filter(Boolean))]
}

async function loadFleetImage(path, batch) {
  const value = String(path || '').trim()
  if (!value || imageUrls[value]) return
  if (/^https?:\/\//i.test(value)) {
    imageUrls[value] = value
    return
  }
  try {
    const { data } = await apiBase.get('/fleet/image', {
      params: { path: value },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    if (batch !== imageBatch) {
      URL.revokeObjectURL(url)
      return
    }
    imageUrls[value] = url
  } catch (e) {
    console.warn('[fleet image]', value, e.message)
  }
}

async function loadSelectedTripImages(trip) {
  const batch = ++imageBatch
  revokeFleetImages()
  const paths = collectImagePaths(trip)
  await Promise.all(paths.map(path => loadFleetImage(path, batch)))
}

function clearSearch() {
  filters.trip = ''
  filters.driver = ''
  selectedTrip.value = null
  searchTrips(0)
}

async function loadSyncStatus() {
  try {
    const { data } = await apiBase.get('/fleet/sync/status')
    const latest = (data.data || []).reduce((max, row) => {
      const t = row.finished_at ? new Date(row.finished_at).getTime() : 0
      return t > max ? t : max
    }, 0)
    lastSyncedAt.value = latest ? fmtDateTime(new Date(latest).toISOString()) : ''
  } catch {}
}

function fmt(v) {
  return Number(v || 0).toLocaleString('th-TH')
}

function fmtMoney(v) {
  const n = Number(v || 0)
  return n ? n.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }) : '-'
}

function fmtDate(v) {
  if (!v) return '-'
  return new Date(v).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtDateTime(v) {
  if (!v) return '-'
  return new Date(v).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function displayVisit(value) {
  if (value === true || value === 'TRUE' || value === 'true') return 'สำเร็จ'
  if (value === false || value === 'FALSE' || value === 'false') return 'ไม่สำเร็จ'
  return value || '-'
}

function stopStatus(stop) {
  if (stop.bypass) return 'ข้าม'
  if (stop.off_site) return 'นอกสถานที่'
  if (stop.date_time_check_out) return 'เช็คเอาท์แล้ว'
  if (stop.date_time_check_in) return 'เช็คอินแล้ว'
  return 'รอดำเนินการ'
}

function stopStatusClass(stop) {
  if (stop.bypass || stop.problems?.length) return 'warn'
  if (stop.date_time_check_out) return 'done'
  if (stop.date_time_check_in) return 'active'
  return ''
}

function imageSrc(path) {
  if (!path) return ''
  const value = String(path).trim()
  return imageUrls[value] || ''
}

function problemNote(problem) {
  return [
    problem.normal_bill_note,
    problem.edit_bill_note,
    problem.product_swap_note,
    problem.out_of_stock_note,
    problem.overstock_note,
  ].filter(Boolean).join(' · ')
}

onMounted(() => {
  const token = localStorage.getItem('crm_token')
  if (token) apiBase.defaults.headers.common.Authorization = `Bearer ${token}`
  searchTrips(0)
  loadSyncStatus()
})

watch(selectedTrip, trip => {
  loadSelectedTripImages(trip)
})

onUnmounted(() => {
  imageBatch++
  revokeFleetImages()
})
</script>

<style scoped>
.fleet-page {
  min-height: 100vh;
  background: #f6f8fb;
  color: #172033;
  padding: 24px;
}

.fleet-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  max-width: 1320px;
  margin: 0 auto 16px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #607086;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
}

h1, h2, h3, h4, p { margin: 0; }

h1 {
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: 0;
}

.sync-chip {
  min-width: 180px;
  background: #fff;
  border: 1px solid #dce4ee;
  border-radius: 8px;
  padding: 10px 12px;
  text-align: right;
}

.sync-chip span,
label span,
.metric-row span,
.timeline span,
.note-grid span {
  display: block;
  color: #6b7a90;
  font-size: 12px;
  font-weight: 600;
}

.sync-chip strong {
  display: block;
  margin-top: 2px;
  font-size: 13px;
}

.search-panel,
.content-grid {
  max-width: 1320px;
  margin: 0 auto;
}

.search-panel {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) minmax(180px, 1fr) auto auto;
  gap: 10px;
  background: #fff;
  border: 1px solid #dce4ee;
  border-radius: 8px;
  padding: 12px;
}

label input {
  width: 100%;
  margin-top: 5px;
  border: 1px solid #cfd9e6;
  border-radius: 7px;
  padding: 9px 10px;
  font-size: 14px;
  outline: none;
}

label input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
}

button {
  border: 1px solid #cfd9e6;
  border-radius: 7px;
  padding: 9px 14px;
  align-self: end;
  cursor: pointer;
  font-weight: 700;
}

button:disabled { opacity: .55; cursor: not-allowed; }
.primary-btn { background: #2563eb; color: #fff; border-color: #2563eb; }
.ghost-btn { background: #fff; color: #334155; }

.content-grid {
  display: grid;
  grid-template-columns: minmax(520px, 1fr) minmax(380px, .9fr);
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.results-panel,
.detail-panel {
  background: #fff;
  border: 1px solid #dce4ee;
  border-radius: 8px;
  overflow: hidden;
}

.detail-panel {
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}

.panel-head,
.detail-head {
  padding: 16px;
  border-bottom: 1px solid #edf1f6;
}

.panel-head h2,
.detail-head h2 {
  font-size: 18px;
}

.panel-head p,
.detail-head p {
  color: #607086;
  font-size: 13px;
  margin-top: 4px;
}

.state,
.empty-detail {
  padding: 34px 16px;
  text-align: center;
  color: #607086;
}

.state.error { color: #b42318; }

.table-wrap { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  background: #f8fafc;
  color: #607086;
  font-size: 11px;
  letter-spacing: .04em;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #dce4ee;
}

td {
  padding: 11px 12px;
  border-bottom: 1px solid #edf1f6;
  vertical-align: top;
}

tbody tr { cursor: pointer; }
tbody tr:hover,
tbody tr.active { background: #f1f6ff; }

td strong { display: block; }
td span {
  display: block;
  color: #7b8798;
  font-size: 11px;
  margin-top: 2px;
}

.num { text-align: right; white-space: nowrap; }

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  color: #607086;
  font-size: 13px;
  border-top: 1px solid #edf1f6;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid #edf1f6;
}

.metric-row div {
  padding: 14px 16px;
  border-right: 1px solid #edf1f6;
}

.metric-row div:last-child { border-right: none; }
.metric-row strong { display: block; margin-top: 3px; font-size: 16px; }

.stops-list {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.stop-card {
  border: 1px solid #dce4ee;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.stop-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.seq {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.stop-top h3 {
  font-size: 15px;
  margin-top: 3px;
}

.stop-top p {
  color: #607086;
  font-size: 12px;
  margin-top: 3px;
}

.status {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eef2f7;
  color: #4b5b70;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
}

.status.done { background: #dcfce7; color: #166534; }
.status.active { background: #dbeafe; color: #1d4ed8; }
.status.warn { background: #fff7ed; color: #c2410c; }

.timeline,
.note-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.timeline div,
.note-grid div {
  background: #f8fafc;
  border-radius: 7px;
  padding: 9px 10px;
}

.timeline strong,
.note-grid strong {
  display: block;
  margin-top: 3px;
  font-size: 13px;
}

.note {
  margin-top: 10px;
  background: #fffbe6;
  color: #6f5800;
  border: 1px solid #fde68a;
  border-radius: 7px;
  padding: 9px 10px;
  font-size: 13px;
}

.images-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

figure {
  margin: 0;
  border: 1px solid #edf1f6;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

figure img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}

figcaption,
figure small {
  display: block;
  padding: 7px 8px;
  color: #607086;
  font-size: 12px;
  word-break: break-all;
}

.problems {
  margin-top: 12px;
  border-top: 1px solid #edf1f6;
  padding-top: 10px;
}

.problems h4 {
  font-size: 13px;
  margin-bottom: 8px;
}

.problem-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: start;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 9px;
  margin-top: 8px;
}

.problem-item p {
  color: #7c2d12;
  font-size: 12px;
  margin-top: 3px;
}

.problem-item figure {
  grid-column: 1 / -1;
}

.resolved,
.open-problem {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
}

.resolved { background: #dcfce7; color: #166534; }
.open-problem { background: #fee2e2; color: #991b1b; }

@media (max-width: 980px) {
  .fleet-page { padding: 14px; }
  .fleet-header { align-items: stretch; flex-direction: column; }
  .sync-chip { text-align: left; }
  .search-panel { grid-template-columns: 1fr; }
  button { align-self: stretch; }
  .content-grid { grid-template-columns: 1fr; }
  .detail-panel { position: static; max-height: none; }
}

@media (max-width: 560px) {
  .metric-row,
  .timeline,
  .note-grid,
  .images-row {
    grid-template-columns: 1fr;
  }

  .metric-row div {
    border-right: none;
    border-bottom: 1px solid #edf1f6;
  }
}
</style>
