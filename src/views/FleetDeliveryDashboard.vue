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

          <div class="trip-images images-row" v-if="tripReleaseImages(selectedTrip).length || tripReturnImages(selectedTrip).length">
            <figure v-for="image in tripReleaseImages(selectedTrip)" :key="image.key">
              <button
                v-if="imageSrc(image.path)"
                type="button"
                class="image-thumb"
                :aria-label="`ขยาย${image.label}`"
                @click="openImagePreview(imageSrc(image.path), image.label, image.path)"
              >
                <img :src="imageSrc(image.path)" :alt="image.label" />
              </button>
              <figcaption>{{ image.label }}</figcaption>
              <small v-if="!imageSrc(image.path)">{{ image.path }}</small>
            </figure>
            <figure v-for="image in tripReturnImages(selectedTrip)" :key="image.key">
              <button
                v-if="imageSrc(image.path)"
                type="button"
                class="image-thumb"
                :aria-label="`ขยาย${image.label}`"
                @click="openImagePreview(imageSrc(image.path), image.label, image.path)"
              >
                <img :src="imageSrc(image.path)" :alt="image.label" />
              </button>
              <figcaption>{{ image.label }}</figcaption>
              <small v-if="!imageSrc(image.path)">{{ image.path }}</small>
            </figure>
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

              <div class="images-row" v-if="stopCheckInImage(stop) || stopCheckOutImages(stop).length">
                <figure v-if="stopCheckInImage(stop)">
                  <button
                    v-if="imageSrc(stopCheckInImage(stop))"
                    type="button"
                    class="image-thumb"
                    aria-label="ขยายรูป Check-in"
                    @click="openImagePreview(imageSrc(stopCheckInImage(stop)), 'รูป Check-in', stopCheckInImage(stop))"
                  >
                    <img :src="imageSrc(stopCheckInImage(stop))" alt="Check-in" />
                  </button>
                  <figcaption>รูป Check-in</figcaption>
                  <small v-if="!imageSrc(stopCheckInImage(stop))">{{ stopCheckInImage(stop) }}</small>
                </figure>
                <figure v-for="image in stopCheckOutImages(stop)" :key="image.key">
                  <button
                    v-if="imageSrc(image.path)"
                    type="button"
                    class="image-thumb"
                    :aria-label="`ขยาย${image.label}`"
                    @click="openImagePreview(imageSrc(image.path), image.label, image.path)"
                  >
                    <img :src="imageSrc(image.path)" :alt="image.label" />
                  </button>
                  <figcaption>{{ image.label }}</figcaption>
                  <small v-if="!imageSrc(image.path)">{{ image.path }}</small>
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
                  <figure v-if="problemImage(problem)">
                    <button
                      v-if="imageSrc(problemImage(problem))"
                      type="button"
                      class="image-thumb"
                      aria-label="ขยายรูปปัญหา"
                      @click="openImagePreview(imageSrc(problemImage(problem)), problem.problem_type || 'รูปปัญหา', problemImage(problem))"
                    >
                      <img :src="imageSrc(problemImage(problem))" alt="Problem" />
                    </button>
                    <small v-else>{{ problemImage(problem) }}</small>
                  </figure>
                </div>
              </div>
            </article>
          </div>
        </template>
      </aside>
    </section>

    <Teleport to="body">
      <div
        v-if="imagePreview.open"
        class="image-preview-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="imagePreview.label || 'ดูรูปภาพ'"
        @click.self="closeImagePreview"
      >
        <div class="image-preview-dialog">
          <div class="image-preview-head">
            <div>
              <h3>{{ imagePreview.label || 'รูปภาพ' }}</h3>
              <p v-if="imagePreview.path">{{ imagePreview.path }}</p>
            </div>
            <div class="image-preview-actions">
              <button type="button" aria-label="ซูมออก" @click="zoomImage(-0.25)">−</button>
              <span>{{ Math.round(imagePreview.scale * 100) }}%</span>
              <button type="button" aria-label="ซูมเข้า" @click="zoomImage(0.25)">+</button>
              <button type="button" aria-label="รีเซ็ตซูม" @click="resetImageZoom">Reset</button>
              <button type="button" class="image-preview-close" aria-label="ปิด" @click="closeImagePreview">
                ×
              </button>
            </div>
          </div>
          <div
            class="image-preview-body"
            :class="{ zoomed: imagePreview.scale > 1 }"
            @wheel.prevent="onImageWheel"
            @pointerdown="startImagePan"
            @pointermove="moveImagePan"
            @pointerup="endImagePan"
            @pointercancel="endImagePan"
            @pointerleave="endImagePan"
          >
            <img
              :src="imagePreview.src"
              :alt="imagePreview.label || 'รูปภาพ'"
              :style="imageTransformStyle"
              draggable="false"
              @dblclick="toggleImageZoom"
            />
          </div>
        </div>
      </div>
    </Teleport>
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
const imagePreview = reactive({
  open: false,
  src: '',
  label: '',
  path: '',
  scale: 1,
  x: 0,
  y: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
})
const imageTransformStyle = ref('')
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
  tripReleaseImages(trip).forEach(image => paths.push(image.path))
  tripReturnImages(trip).forEach(image => paths.push(image.path))
  for (const stop of trip?.stops || []) {
    const checkInImage = stopCheckInImage(stop)
    const checkOutImage = stopCheckOutImage(stop)
    if (checkInImage) paths.push(checkInImage)
    if (checkOutImage) paths.push(checkOutImage)
    stopCheckOutImages(stop).forEach(image => paths.push(image.path))
    for (const problem of stop.problems || []) {
      const path = problemImage(problem)
      if (path) paths.push(path)
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

function firstImagePath(...values) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function tripReleaseImages(trip) {
  const images = [
    ['image_mileage', 'รูปเลขไมล์'],
    ['image_front', 'รูปหน้ารถ'],
    ['image_around_1', 'รูปรอบรถ 1'],
    ['image_around_2', 'รูปรอบรถ 2'],
    ['image_around_3', 'รูปรอบรถ 3'],
    ['image_around_4', 'รูปรอบรถ 4'],
  ]

  const releaseImages = images
    .map(([key, label]) => ({ key, label, path: firstImagePath(trip?.[key]) }))
    .filter(image => image.path)

  if (!releaseImages.length) {
    const fallback = firstImagePath(trip?.car_release_image, trip?.image_car_release)
    if (fallback) releaseImages.push({ key: 'car_release_image', label: 'รูปปล่อยรถ', path: fallback })
  }

  return releaseImages
}

function tripReturnImages(trip) {
  const images = [
    ['return_image_mileage', 'คืนรถ - รูปเลขไมล์'],
    ['return_image_front', 'คืนรถ - รูปหน้ารถ'],
    ['return_image_around_1', 'คืนรถ - รูปรอบรถ 1'],
    ['return_image_around_2', 'คืนรถ - รูปรอบรถ 2'],
    ['return_image_around_3', 'คืนรถ - รูปรอบรถ 3'],
    ['return_image_around_4', 'คืนรถ - รูปรอบรถ 4'],
  ]

  const returnImages = images
    .map(([key, label]) => ({ key, label, path: firstImagePath(trip?.[key]) }))
    .filter(image => image.path)

  if (!returnImages.length) {
    const fallback = firstImagePath(trip?.car_return_image, trip?.image_car_return)
    if (fallback) returnImages.push({ key: 'car_return_image', label: 'รูปคืนรถ', path: fallback })
  }

  return returnImages
}

function stopCheckInImage(stop) {
  return firstImagePath(stop?.check_in_image, stop?.image_check_in)
}

function stopCheckOutImage(stop) {
  return firstImagePath(stop?.check_out_image, stop?.image_bill)
}

function stopCheckOutImages(stop) {
  const seen = new Set()
  const images = []
  const addImage = (path, label, key) => {
    const value = firstImagePath(path)
    if (!value || seen.has(value)) return
    seen.add(value)
    images.push({ key: key || value, label: label || `รูป Check-out ${images.length + 1}`, path: value })
  }

  addImage(stopCheckOutImage(stop), 'รูป Check-out', 'check_out_image')
  for (const image of stop?.check_out_images || []) {
    addImage(
      image.image_path ?? image.image_check_out ?? image.path,
      `รูป Check-out ${images.length + 1}`,
      image.image_check_out_id
    )
  }
  return images
}

function problemImage(problem) {
  return firstImagePath(problem?.problem_image, problem?.image_problem)
}

function imageSrc(path) {
  if (!path) return ''
  const value = String(path).trim()
  return imageUrls[value] || ''
}

function openImagePreview(src, label = '', path = '') {
  if (!src) return
  imagePreview.open = true
  imagePreview.src = src
  imagePreview.label = label
  imagePreview.path = String(path || '').trim()
  resetImageZoom()
  document.body.classList.add('modal-open')
}

function closeImagePreview() {
  imagePreview.open = false
  imagePreview.src = ''
  imagePreview.label = ''
  imagePreview.path = ''
  resetImageZoom()
  document.body.classList.remove('modal-open')
}

function onPreviewKeydown(event) {
  if (event.key === 'Escape' && imagePreview.open) closeImagePreview()
  if (!imagePreview.open) return
  if (event.key === '+' || event.key === '=') zoomImage(0.25)
  if (event.key === '-') zoomImage(-0.25)
  if (event.key === '0') resetImageZoom()
}

function updateImageTransform() {
  imageTransformStyle.value = `transform: translate(${imagePreview.x}px, ${imagePreview.y}px) scale(${imagePreview.scale});`
}

function setImageScale(nextScale) {
  imagePreview.scale = Math.min(5, Math.max(1, Number(nextScale.toFixed(2))))
  if (imagePreview.scale === 1) {
    imagePreview.x = 0
    imagePreview.y = 0
  }
  updateImageTransform()
}

function zoomImage(delta) {
  setImageScale(imagePreview.scale + delta)
}

function resetImageZoom() {
  imagePreview.scale = 1
  imagePreview.x = 0
  imagePreview.y = 0
  imagePreview.dragging = false
  updateImageTransform()
}

function toggleImageZoom() {
  if (imagePreview.scale > 1) resetImageZoom()
  else setImageScale(2)
}

function onImageWheel(event) {
  zoomImage(event.deltaY < 0 ? 0.2 : -0.2)
}

function startImagePan(event) {
  if (imagePreview.scale <= 1) return
  imagePreview.dragging = true
  imagePreview.startX = event.clientX
  imagePreview.startY = event.clientY
  imagePreview.originX = imagePreview.x
  imagePreview.originY = imagePreview.y
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

function moveImagePan(event) {
  if (!imagePreview.dragging) return
  imagePreview.x = imagePreview.originX + (event.clientX - imagePreview.startX)
  imagePreview.y = imagePreview.originY + (event.clientY - imagePreview.startY)
  updateImageTransform()
}

function endImagePan(event) {
  if (!imagePreview.dragging) return
  imagePreview.dragging = false
  event.currentTarget?.releasePointerCapture?.(event.pointerId)
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
  window.addEventListener('keydown', onPreviewKeydown)
})

watch(selectedTrip, trip => {
  if (imagePreview.open) closeImagePreview()
  loadSelectedTripImages(trip)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onPreviewKeydown)
  closeImagePreview()
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

.trip-images {
  margin: 0;
  padding: 14px 16px;
  border-bottom: 1px solid #edf1f6;
}

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

.image-thumb {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
  position: relative;
}

.image-thumb::after {
  content: 'ขยาย';
  position: absolute;
  right: 8px;
  bottom: 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, .72);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity .16s ease, transform .16s ease;
}

.image-thumb:hover::after,
.image-thumb:focus-visible::after {
  opacity: 1;
  transform: translateY(0);
}

.image-thumb:focus-visible {
  outline: 3px solid rgba(37, 99, 235, .35);
  outline-offset: -3px;
}

figure img,
.image-thumb img {
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

.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, .82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.image-preview-dialog {
  width: min(1120px, 100%);
  max-height: calc(100vh - 40px);
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .35);
  display: flex;
  flex-direction: column;
}

.image-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, .06);
  color: #fff;
}

.image-preview-head h3 {
  font-size: 15px;
}

.image-preview-head p {
  margin-top: 3px;
  color: #cbd5e1;
  font-size: 12px;
  word-break: break-all;
}

.image-preview-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.image-preview-actions button {
  min-width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, .18);
  background: rgba(255, 255, 255, .08);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.image-preview-actions span {
  min-width: 48px;
  text-align: center;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 700;
}

.image-preview-close {
  width: 34px;
  height: 34px;
  font-size: 24px;
}

.image-preview-body {
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  touch-action: none;
  user-select: none;
  cursor: zoom-in;
}

.image-preview-body.zoomed {
  cursor: grab;
}

.image-preview-body.zoomed:active {
  cursor: grabbing;
}

.image-preview-body img {
  max-width: 100%;
  max-height: calc(100vh - 150px);
  object-fit: contain;
  border-radius: 6px;
  transform-origin: center center;
  transition: transform .12s ease-out;
  will-change: transform;
}

:global(body.modal-open) {
  overflow: hidden;
}

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
  .image-preview-overlay {
    padding: 0;
  }

  .image-preview-dialog {
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
  }

  .image-preview-head {
    flex-direction: column;
  }

  .image-preview-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .image-preview-body img {
    max-height: calc(100vh - 96px);
  }

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
