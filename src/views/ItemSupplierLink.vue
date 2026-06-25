<template>
  <div class="p-6">
    <div class="mb-5">
      <h1 class="text-xl font-bold text-slate-800">ผูกสินค้ากับเจ้าหนี้</h1>
    </div>

    <!-- Tabs -->
    <div class="mb-5 flex gap-1 border-b border-slate-200">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="tab === 'item' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'"
        @click="switchTab('item')"
      >เลือกสินค้าก่อน</button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="tab === 'supplier' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'"
        @click="switchTab('supplier')"
      >เลือกเจ้าหนี้ก่อน</button>
    </div>

    <!-- ── TAB: เลือกสินค้าก่อน ── -->
    <template v-if="tab === 'item'">
      <!-- เลือกสินค้า -->
      <div class="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label class="label-text">ค้นหาสินค้า</label>
        <input v-model="itemSearch" class="input-field mt-1" placeholder="รหัส หรือ ชื่อสินค้า" @input="onItemSearch" />
        <div class="mt-3 overflow-auto rounded border border-slate-200" style="max-height: 240px">
          <table class="min-w-full text-sm">
            <thead class="sticky top-0 bg-slate-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-slate-600">รหัส</th>
                <th class="px-3 py-2 text-left font-medium text-slate-600">ชื่อสินค้า</th>
                <th class="px-3 py-2 text-left font-medium text-slate-600 w-20">หน่วย</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="itemsLoading"><td colspan="3" class="py-6 text-center text-slate-400">กำลังโหลด...</td></tr>
              <tr v-else-if="!items.length"><td colspan="3" class="py-6 text-center text-slate-400">ไม่พบสินค้า</td></tr>
              <tr
                v-for="row in items" :key="row.ic_code"
                class="cursor-pointer hover:bg-blue-50"
                :class="selectedItem?.ic_code === row.ic_code ? 'bg-blue-100' : ''"
                @click="selectItem(row)"
              >
                <td class="px-3 py-2 font-mono text-xs">{{ row.ic_code }}</td>
                <td class="px-3 py-2">{{ row.ic_name }}</td>
                <td class="px-3 py-2 text-slate-500">{{ row.unit_code }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>ทั้งหมด {{ itemTotal }} รายการ</span>
          <div class="flex gap-2">
            <button class="btn-secondary py-1 text-xs" :disabled="itemPage <= 1" @click="itemPage--; loadItems()">‹ ก่อน</button>
            <span class="px-2 py-1">หน้า {{ itemPage }}</span>
            <button class="btn-secondary py-1 text-xs" :disabled="itemPage * itemLimit >= itemTotal" @click="itemPage++; loadItems()">ถัดไป ›</button>
          </div>
        </div>
      </div>

      <!-- dual-pane เจ้าหนี้ -->
      <template v-if="selectedItem">
        <div class="mb-3">
          <span class="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800">
            {{ selectedItem.ic_code }} — {{ selectedItem.ic_name }}
          </span>
        </div>
        <DualPane
          left-title="เจ้าหนี้ที่ยังไม่ได้ผูก"
          right-title="เจ้าหนี้ที่ผูกแล้ว"
          left-placeholder="ค้นหาเจ้าหนี้..."
          :available="iAvailable"
          :linked="iLinked"
          :available-loading="iAvailableLoading"
          :linked-loading="iLinkedLoading"
          :linking="iLinking"
          :unlinking="iUnlinking"
          :error-msg="iErrorMsg"
          label-key="ap_name"
          sub-key="ap_code"
          @search="onIAvailableSearch"
          @link="iLink"
          @unlink="iUnlink"
        />
      </template>
    </template>

    <!-- ── TAB: เลือกเจ้าหนี้ก่อน ── -->
    <template v-if="tab === 'supplier'">
      <!-- เลือกเจ้าหนี้ -->
      <div class="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label class="label-text">ค้นหาเจ้าหนี้</label>
        <input v-model="supSearch" class="input-field mt-1" placeholder="รหัส หรือ ชื่อเจ้าหนี้" @input="onSupSearch" />
        <div class="mt-3 overflow-auto rounded border border-slate-200" style="max-height: 240px">
          <table class="min-w-full text-sm">
            <thead class="sticky top-0 bg-slate-50">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-slate-600">รหัส</th>
                <th class="px-3 py-2 text-left font-medium text-slate-600">ชื่อเจ้าหนี้</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="suppliersLoading"><td colspan="2" class="py-6 text-center text-slate-400">กำลังโหลด...</td></tr>
              <tr v-else-if="!suppliers.length"><td colspan="2" class="py-6 text-center text-slate-400">ไม่พบเจ้าหนี้</td></tr>
              <tr
                v-for="row in suppliers" :key="row.ap_code"
                class="cursor-pointer hover:bg-blue-50"
                :class="selectedSupplier?.ap_code === row.ap_code ? 'bg-blue-100' : ''"
                @click="selectSupplier(row)"
              >
                <td class="px-3 py-2 font-mono text-xs">{{ row.ap_code }}</td>
                <td class="px-3 py-2">{{ row.ap_name }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>ทั้งหมด {{ supTotal }} รายการ</span>
          <div class="flex gap-2">
            <button class="btn-secondary py-1 text-xs" :disabled="supPage <= 1" @click="supPage--; loadSuppliers()">‹ ก่อน</button>
            <span class="px-2 py-1">หน้า {{ supPage }}</span>
            <button class="btn-secondary py-1 text-xs" :disabled="supPage * supLimit >= supTotal" @click="supPage++; loadSuppliers()">ถัดไป ›</button>
          </div>
        </div>
      </div>

      <!-- dual-pane สินค้า -->
      <template v-if="selectedSupplier">
        <div class="mb-3">
          <span class="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800">
            {{ selectedSupplier.ap_code }} — {{ selectedSupplier.ap_name }}
          </span>
        </div>
        <DualPane
          left-title="สินค้าที่ยังไม่ได้ผูก"
          right-title="สินค้าที่ผูกแล้ว"
          left-placeholder="ค้นหาสินค้า..."
          :available="sAvailable"
          :linked="sLinked"
          :available-loading="sAvailableLoading"
          :linked-loading="sLinkedLoading"
          :linking="sLinking"
          :unlinking="sUnlinking"
          :error-msg="sErrorMsg"
          label-key="ic_name"
          sub-key="ic_code"
          @search="onSAvailableSearch"
          @link="sLink"
          @unlink="sUnlink"
        />
      </template>
    </template>
  </div>
</template>

<script setup>
import { defineComponent, h, ref } from 'vue'
import api from '../composables/useApi.js'

// ── Shared DualPane component ──────────────────────────────────────
const DualPane = defineComponent({
  props: {
    leftTitle: String, rightTitle: String, leftPlaceholder: String,
    available: Array, linked: Array,
    availableLoading: Boolean, linkedLoading: Boolean,
    linking: String, unlinking: String, errorMsg: String,
    labelKey: String, subKey: String,
  },
  emits: ['search', 'link', 'unlink'],
  setup(props, { emit }) {
    const search = ref('')
    function onInput() { emit('search', search.value) }
    return () => h('div', { class: 'space-y-3' }, [
      h('div', { class: 'grid grid-cols-1 gap-4 lg:grid-cols-2' }, [
        // กล่องซ้าย
        h('div', { class: 'rounded-lg border border-slate-200 bg-white shadow-sm' }, [
          h('div', { class: 'flex items-center justify-between border-b border-slate-200 px-4 py-3' }, [
            h('h2', { class: 'font-semibold text-slate-700' }, props.leftTitle),
            h('span', { class: 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500' }, props.available.length),
          ]),
          h('div', { class: 'p-3' }, [
            h('input', {
              value: search.value,
              class: 'input-field text-sm',
              placeholder: props.leftPlaceholder,
              onInput: (e) => { search.value = e.target.value; onInput() },
            }),
          ]),
          h('div', { class: 'overflow-auto', style: 'max-height:360px' }, [
            props.availableLoading
              ? h('div', { class: 'py-8 text-center text-slate-400 text-sm' }, 'กำลังโหลด...')
              : !props.available.length
                ? h('div', { class: 'py-8 text-center text-slate-400 text-sm' }, 'ไม่มีรายการที่ยังไม่ผูก')
                : props.available.map(row =>
                    h('div', { key: row[props.subKey], class: 'flex items-center justify-between border-b border-slate-50 px-4 py-2.5 hover:bg-slate-50' }, [
                      h('div', [
                        h('div', { class: 'text-sm font-medium text-slate-800' }, row[props.labelKey] || row[props.subKey]),
                        h('div', { class: 'text-xs text-slate-400' }, row[props.subKey]),
                      ]),
                      h('button', {
                        class: 'ml-2 flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50',
                        disabled: props.linking === row[props.subKey],
                        onClick: () => emit('link', row),
                      }, [
                        h('svg', { class: 'h-3.5 w-3.5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
                          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4v16m8-8H4' })),
                        'ผูก',
                      ]),
                    ]),
                  ),
          ]),
        ]),
        // กล่องขวา
        h('div', { class: 'rounded-lg border border-slate-200 bg-white shadow-sm' }, [
          h('div', { class: 'flex items-center justify-between border-b border-slate-200 px-4 py-3' }, [
            h('h2', { class: 'font-semibold text-slate-700' }, props.rightTitle),
            h('span', { class: 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700' }, props.linked.length),
          ]),
          h('div', { class: 'overflow-auto', style: 'max-height:420px' }, [
            props.linkedLoading
              ? h('div', { class: 'py-8 text-center text-slate-400 text-sm' }, 'กำลังโหลด...')
              : !props.linked.length
                ? h('div', { class: 'py-8 text-center text-slate-400 text-sm' }, 'ยังไม่มีรายการที่ผูก')
                : props.linked.map(row =>
                    h('div', { key: row[props.subKey], class: 'flex items-center justify-between border-b border-slate-50 px-4 py-2.5 hover:bg-slate-50' }, [
                      h('div', [
                        h('div', { class: 'text-sm font-medium text-slate-800' }, row[props.labelKey] || row[props.subKey]),
                        h('div', { class: 'text-xs text-slate-400' }, row[props.subKey]),
                      ]),
                      h('button', {
                        class: 'ml-2 flex items-center gap-1 rounded border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50',
                        disabled: props.unlinking === row[props.subKey],
                        onClick: () => emit('unlink', row),
                      }, [
                        h('svg', { class: 'h-3.5 w-3.5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
                          h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M6 18L18 6M6 6l12 12' })),
                        'ยกเลิก',
                      ]),
                    ]),
                  ),
          ]),
        ]),
      ]),
      props.errorMsg ? h('div', { class: 'rounded bg-red-50 px-4 py-2 text-sm text-red-700' }, props.errorMsg) : null,
    ])
  },
})

// ── Tab ───────────────────────────────────────────────────────────
const tab = ref('item')

function switchTab(t) {
  tab.value = t
  if (t === 'item' && !items.value.length) loadItems()
  if (t === 'supplier' && !suppliers.value.length) loadSuppliers()
}

// ══════════════════════════════════════════════════════════════════
// TAB: เลือกสินค้าก่อน
// ══════════════════════════════════════════════════════════════════
const itemSearch = ref('')
const items = ref([])
const itemTotal = ref(0)
const itemPage = ref(1)
const itemLimit = 20
const itemsLoading = ref(false)
let itemSearchTimer = null

async function loadItems() {
  itemsLoading.value = true
  try {
    const { data } = await api.get('/purchase-planning/item-supplier-link/items', {
      params: { search: itemSearch.value, page: itemPage.value, limit: itemLimit },
    })
    items.value = data.data || []
    itemTotal.value = data.total || 0
  } finally {
    itemsLoading.value = false
  }
}
function onItemSearch() { itemPage.value = 1; clearTimeout(itemSearchTimer); itemSearchTimer = setTimeout(loadItems, 300) }

const selectedItem = ref(null)
function selectItem(row) {
  selectedItem.value = row
  iAvailableSearch.value = ''
  loadILinked(); loadIAvailable()
}

const iLinked = ref([])
const iLinkedLoading = ref(false)
async function loadILinked() {
  if (!selectedItem.value) return
  iLinkedLoading.value = true
  try {
    const { data } = await api.get(`/purchase-planning/item-supplier-link/${encodeURIComponent(selectedItem.value.ic_code)}/linked`)
    iLinked.value = data.data || []
  } finally { iLinkedLoading.value = false }
}

const iAvailable = ref([])
const iAvailableSearch = ref('')
const iAvailableLoading = ref(false)
let iAvailableTimer = null
async function loadIAvailable() {
  if (!selectedItem.value) return
  iAvailableLoading.value = true
  try {
    const { data } = await api.get(`/purchase-planning/item-supplier-link/${encodeURIComponent(selectedItem.value.ic_code)}/available`, { params: { search: iAvailableSearch.value } })
    iAvailable.value = data.data || []
  } finally { iAvailableLoading.value = false }
}
function onIAvailableSearch(val) { iAvailableSearch.value = val; clearTimeout(iAvailableTimer); iAvailableTimer = setTimeout(loadIAvailable, 300) }

const iLinking = ref('')
const iUnlinking = ref('')
const iErrorMsg = ref('')
async function iLink(sup) {
  iLinking.value = sup.ap_code; iErrorMsg.value = ''
  try {
    await api.post(`/purchase-planning/item-supplier-link/${encodeURIComponent(selectedItem.value.ic_code)}/link`, { ap_code: sup.ap_code })
    await Promise.all([loadILinked(), loadIAvailable()])
  } catch (err) { iErrorMsg.value = err.response?.data?.error || err.message }
  finally { iLinking.value = '' }
}
async function iUnlink(sup) {
  iUnlinking.value = sup.ap_code; iErrorMsg.value = ''
  try {
    await api.delete(`/purchase-planning/item-supplier-link/${encodeURIComponent(selectedItem.value.ic_code)}/link/${encodeURIComponent(sup.ap_code)}`)
    await Promise.all([loadILinked(), loadIAvailable()])
  } catch (err) { iErrorMsg.value = err.response?.data?.error || err.message }
  finally { iUnlinking.value = '' }
}

// ══════════════════════════════════════════════════════════════════
// TAB: เลือกเจ้าหนี้ก่อน
// ══════════════════════════════════════════════════════════════════
const supSearch = ref('')
const suppliers = ref([])
const supTotal = ref(0)
const supPage = ref(1)
const supLimit = 20
const suppliersLoading = ref(false)
let supSearchTimer = null

async function loadSuppliers() {
  suppliersLoading.value = true
  try {
    const { data } = await api.get('/purchase-planning/item-supplier-link/suppliers', {
      params: { search: supSearch.value, page: supPage.value, limit: supLimit },
    })
    suppliers.value = data.data || []
    supTotal.value = data.total || 0
  } finally { suppliersLoading.value = false }
}
function onSupSearch() { supPage.value = 1; clearTimeout(supSearchTimer); supSearchTimer = setTimeout(loadSuppliers, 300) }

const selectedSupplier = ref(null)
function selectSupplier(row) {
  selectedSupplier.value = row
  sAvailableSearch.value = ''
  loadSLinked(); loadSAvailable()
}

const sLinked = ref([])
const sLinkedLoading = ref(false)
async function loadSLinked() {
  if (!selectedSupplier.value) return
  sLinkedLoading.value = true
  try {
    const { data } = await api.get(`/purchase-planning/item-supplier-link/by-supplier/${encodeURIComponent(selectedSupplier.value.ap_code)}/linked`)
    sLinked.value = data.data || []
  } finally { sLinkedLoading.value = false }
}

const sAvailable = ref([])
const sAvailableSearch = ref('')
const sAvailableLoading = ref(false)
let sAvailableTimer = null
async function loadSAvailable() {
  if (!selectedSupplier.value) return
  sAvailableLoading.value = true
  try {
    const { data } = await api.get(`/purchase-planning/item-supplier-link/by-supplier/${encodeURIComponent(selectedSupplier.value.ap_code)}/available`, { params: { search: sAvailableSearch.value } })
    sAvailable.value = data.data || []
  } finally { sAvailableLoading.value = false }
}
function onSAvailableSearch(val) { sAvailableSearch.value = val; clearTimeout(sAvailableTimer); sAvailableTimer = setTimeout(loadSAvailable, 300) }

const sLinking = ref('')
const sUnlinking = ref('')
const sErrorMsg = ref('')
async function sLink(item) {
  sLinking.value = item.ic_code; sErrorMsg.value = ''
  try {
    await api.post(`/purchase-planning/item-supplier-link/by-supplier/${encodeURIComponent(selectedSupplier.value.ap_code)}/link`, { ic_code: item.ic_code })
    await Promise.all([loadSLinked(), loadSAvailable()])
  } catch (err) { sErrorMsg.value = err.response?.data?.error || err.message }
  finally { sLinking.value = '' }
}
async function sUnlink(item) {
  sUnlinking.value = item.ic_code; sErrorMsg.value = ''
  try {
    await api.delete(`/purchase-planning/item-supplier-link/by-supplier/${encodeURIComponent(selectedSupplier.value.ap_code)}/link/${encodeURIComponent(item.ic_code)}`)
    await Promise.all([loadSLinked(), loadSAvailable()])
  } catch (err) { sErrorMsg.value = err.response?.data?.error || err.message }
  finally { sUnlinking.value = '' }
}

// ── init ──────────────────────────────────────────────────────────
loadItems()
</script>
