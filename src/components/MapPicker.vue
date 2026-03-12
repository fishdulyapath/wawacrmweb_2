<template>
  <div class="space-y-2">
    <!-- Input manual lat/lng -->
    <div class="flex items-center gap-2">
      <input
        v-model="inputLat" type="number" step="any" placeholder="Latitude"
        @blur="applyManual" @keydown.enter.prevent="applyManual"
        class="w-36 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-blue-400"
      />
      <span class="text-slate-400 text-sm">,</span>
      <input
        v-model="inputLng" type="number" step="any" placeholder="Longitude"
        @blur="applyManual" @keydown.enter.prevent="applyManual"
        class="w-36 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-blue-400"
      />
      <button type="button" @click="toggle"
        class="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border"
        :class="open ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'">
        <span>🗺</span>
        <span>{{ open ? 'ซ่อน' : 'แผนที่' }}</span>
      </button>
      <button v-if="hasCoord" type="button" @click="clearCoord"
        class="text-xs text-red-400 hover:text-red-600">ลบ</button>
    </div>

    <!-- แผนที่ -->
    <div v-show="open" class="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <!-- Search bar -->
      <div class="bg-white px-3 py-2 border-b border-slate-200 relative">
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            @keydown.enter.prevent="searchPlace"
            placeholder="ค้นหาสถานที่... (กด Enter)"
            class="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
          />
          <button type="button" @click="searchPlace" :disabled="searching"
            class="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0">
            {{ searching ? '...' : '🔍' }}
          </button>
        </div>
        <!-- Results dropdown -->
        <div v-if="searchResults.length" class="absolute left-3 right-3 top-full z-[1000] bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          <button v-for="r in searchResults" :key="r.place_id" type="button"
            @click="selectPlace(r)"
            class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0">
            {{ r.display_name }}
          </button>
        </div>
        <p v-if="searchError" class="text-xs text-red-500 mt-1">{{ searchError }}</p>
      </div>
      <div class="bg-slate-50 px-3 py-1.5 text-xs text-slate-400 border-b border-slate-100">
        คลิกบนแผนที่เพื่อเลือกตำแหน่ง หรือลาก marker
      </div>
      <div :id="mapId" style="height:300px; width:100%;"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 },
  mapId: { type: String, required: true },
})
const emit = defineEmits(['update:lat', 'update:lng'])

const open        = ref(false)
const mapInstance = ref(null)
const marker      = ref(null)

// Search
const searchQuery   = ref('')
const searchResults = ref([])
const searchError   = ref('')
const searching     = ref(false)

async function searchPlace() {
  const q = searchQuery.value.trim()
  if (!q) return
  searching.value = true
  searchError.value = ''
  searchResults.value = []
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=th`,
      { headers: { 'Accept-Language': 'th' } }
    )
    const data = await res.json()
    if (!data.length) { searchError.value = 'ไม่พบสถานที่'; return }
    searchResults.value = data
  } catch {
    searchError.value = 'ค้นหาไม่สำเร็จ'
  } finally {
    searching.value = false
  }
}

function selectPlace(r) {
  const la = parseFloat(parseFloat(r.lat).toFixed(7))
  const ln = parseFloat(parseFloat(r.lon).toFixed(7))
  inputLat.value = la; inputLng.value = ln
  emit('update:lat', la); emit('update:lng', ln)
  moveMarker(la, ln)
  if (mapInstance.value) mapInstance.value.setView([la, ln], 15)
  searchResults.value = []
  searchQuery.value = r.display_name.split(',')[0]
}

const modelLat = computed(() => props.lat || 0)
const modelLng = computed(() => props.lng || 0)
const hasCoord = computed(() => modelLat.value !== 0 || modelLng.value !== 0)

// input fields — sync จาก props
const inputLat = ref(props.lat || '')
const inputLng = ref(props.lng || '')
watch(() => props.lat, v => { inputLat.value = v || '' })
watch(() => props.lng, v => { inputLng.value = v || '' })

const defaultCenter = [13.7563, 100.5018] // Bangkok

function applyManual() {
  const lat = parseFloat(inputLat.value)
  const lng = parseFloat(inputLng.value)
  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    emit('update:lat', lat)
    emit('update:lng', lng)
    moveMarker(lat, lng)
  }
}

function moveMarker(lat, lng) {
  if (!mapInstance.value) return
  if (marker.value) {
    marker.value.setLatLng([lat, lng])
  } else {
    addMarker(lat, lng)
  }
  mapInstance.value.setView([lat, lng], mapInstance.value.getZoom())
}

function addMarker(lat, lng) {
  if (!mapInstance.value) return
  import('leaflet').then(L => {
    marker.value = L.marker([lat, lng], { draggable: true }).addTo(mapInstance.value)
    marker.value.on('dragend', e => {
      const p = e.target.getLatLng()
      const la = parseFloat(p.lat.toFixed(7))
      const ln = parseFloat(p.lng.toFixed(7))
      inputLat.value = la
      inputLng.value = ln
      emit('update:lat', la)
      emit('update:lng', ln)
    })
  })
}

async function initMap() {
  await nextTick()
  const L = await import('leaflet')

  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  })

  const center = hasCoord.value ? [modelLat.value, modelLng.value] : defaultCenter
  const map = L.map(props.mapId).setView(center, 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  if (hasCoord.value) {
    marker.value = L.marker([modelLat.value, modelLng.value], { draggable: true }).addTo(map)
    marker.value.on('dragend', e => {
      const p = e.target.getLatLng()
      const la = parseFloat(p.lat.toFixed(7))
      const ln = parseFloat(p.lng.toFixed(7))
      inputLat.value = la; inputLng.value = ln
      emit('update:lat', la); emit('update:lng', ln)
    })
  }

  map.on('click', e => {
    const la = parseFloat(e.latlng.lat.toFixed(7))
    const ln = parseFloat(e.latlng.lng.toFixed(7))
    inputLat.value = la; inputLng.value = ln
    emit('update:lat', la); emit('update:lng', ln)
    if (marker.value) {
      marker.value.setLatLng([la, ln])
    } else {
      addMarker(la, ln)
    }
  })

  mapInstance.value = map
}

async function toggle() {
  open.value = !open.value
  if (open.value && !mapInstance.value) {
    await initMap()
  } else if (open.value && mapInstance.value) {
    await nextTick()
    mapInstance.value.invalidateSize()
  }
}

function clearCoord() {
  inputLat.value = ''; inputLng.value = ''
  emit('update:lat', 0); emit('update:lng', 0)
  if (marker.value && mapInstance.value) {
    mapInstance.value.removeLayer(marker.value)
    marker.value = null
  }
}

onBeforeUnmount(() => {
  if (mapInstance.value) { mapInstance.value.remove(); mapInstance.value = null }
})
</script>
