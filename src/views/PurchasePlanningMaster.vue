<template>
  <div class="p-6">
    <div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">กำหนดข้อมูลวางแผนสั่งซื้อ</h1>
        <p class="mt-0.5 text-sm text-slate-500">
          ลำดับความสำคัญ: สินค้า+เจ้าหนี้  > เจ้าหนี้ > ค่าเริ่มต้น 1 วัน
        </p>
      </div>
      <div v-if="canSyncCurrentTab" class="flex flex-wrap gap-2">
        <button class="btn-secondary" :disabled="syncing || exporting || importing" @click="syncFromHistory(true)">
          <svg class="h-4 w-4" :class="{ 'animate-spin': syncing }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          {{ syncCheckLabel }}
        </button>
        <button class="btn-primary" :disabled="syncing" @click="syncFromHistory(false)">
          <svg class="h-4 w-4" :class="{ 'animate-spin': syncing }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          {{ syncUpdateLabel }}
        </button>
        <button class="btn-secondary" :disabled="exporting || importing" @click="exportExcel">
          <svg class="h-4 w-4" :class="{ 'animate-spin': exporting }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {{ exporting ? 'กำลังโหลด...' : 'Export Excel' }}
        </button>
        <button class="btn-secondary" :disabled="exporting || importing" @click="triggerImport">
          <svg class="h-4 w-4" :class="{ 'animate-spin': importing }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ importing ? 'กำลังนำเข้า...' : 'Import Excel' }}
        </button>
        <input ref="importInput" type="file" accept=".xlsx,.xls" class="hidden" @change="onImportFile" />
      </div>
    </div>

    <div class="mb-4 flex flex-wrap gap-2 border-b border-slate-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :class="['px-4 py-3 text-sm font-semibold transition-colors', activeTab === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800']"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="syncResult" class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <strong>{{ syncResult.dryRun ? 'ผลตรวจสอบประวัติซื้อ' : 'ผลอัปเดต master' }}</strong>
        <span>
          พบที่ยังไม่มี {{ formatInt(syncResult.missingCount) }} {{ syncUnit }}
          <template v-if="!syncResult.dryRun">/ เพิ่มแล้ว {{ formatInt(syncResult.insertedCount) }} {{ syncUnit }}</template>
        </span>
      </div>
      <p v-if="syncPreviewText" class="mt-2 text-xs text-amber-700">ตัวอย่าง: {{ syncPreviewText }}</p>
    </div>

    <div v-if="importResult" class="mb-4 rounded-xl border p-4 text-sm" :class="importResult.errors.length ? 'border-red-200 bg-red-50 text-red-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'">
      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <strong>{{ importResult.commit ? 'บันทึกการนำเข้าสำเร็จ' : 'ผลตรวจสอบไฟล์ Excel' }}</strong>
        <span>
          ทั้งหมด {{ formatInt(importResult.total) }} รายการ
          <template v-if="importResult.commit">/ บันทึก {{ formatInt(importResult.updated) }} รายการ</template>
          <template v-else>/ พร้อมบันทึก {{ formatInt(importResult.updated) }} รายการ</template>
          <template v-if="importResult.errors.length"> / ผิดพลาด {{ formatInt(importResult.errors.length) }} รายการ</template>
        </span>
      </div>
      <div v-if="importResult.errors.length" class="mt-2 max-h-32 overflow-y-auto rounded bg-white/60 p-2 text-xs">
        <p v-for="(err, i) in importResult.errors.slice(0, 20)" :key="i">
          บรรทัด {{ err.line }}: {{ err.message }}<template v-if="err.ap_code"> ({{ err.ap_code }}<template v-if="err.ic_code">/{{ err.ic_code }}</template>)</template>
        </p>
        <p v-if="importResult.errors.length > 20" class="text-slate-500">...และอีก {{ formatInt(importResult.errors.length - 20) }} รายการ</p>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button v-if="!importResult.commit && importResult.updated > 0" class="btn-primary" :disabled="importing" @click="confirmImport">
          {{ importing ? 'กำลังบันทึก...' : `ยืนยันบันทึก ${formatInt(importResult.updated)} รายการ` }}
        </button>
        <button class="btn-secondary" @click="importResult = null">ปิด</button>
      </div>
    </div>

    <div class="card mb-4 p-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div class="min-w-0 flex-1">
          <label for="planning-search" class="label-text">{{ currentConfig.searchLabel }}</label>
          <input
            id="planning-search"
            v-model="search"
            class="input-field"
            :placeholder="currentConfig.searchPlaceholder"
            @input="onSearchInput"
            @keyup.enter="applySearch"
          />
        </div>
        <label class="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50">
          <input v-model="enabledOnly" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" @change="onToggleEnabled" />
          เฉพาะที่เปิดใช้
        </label>
        <button class="btn-secondary justify-center" @click="resetSearch">ล้างคำค้น</button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400">
        <svg class="mr-2 h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        กำลังโหลดข้อมูล...
      </div>

      <div v-else-if="error" class="py-16 text-center">
        <p class="font-medium text-red-500">{{ error }}</p>
        <button class="btn-secondary mx-auto mt-3" @click="loadRows">ลองใหม่</button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm" :class="currentConfig.tableClass">
          <thead class="border-b border-slate-200 bg-slate-50">
            <tr>
              <th v-for="col in currentConfig.columns" :key="col.key" :class="['table-head-static', col.class || 'text-left']">
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="rows.length === 0">
              <td :colspan="currentConfig.columns.length" class="py-16 text-center text-slate-400">{{ currentConfig.emptyText }}</td>
            </tr>
            <tr v-for="row in rows" :key="rowKey(row)" :class="['hover:bg-slate-50', isDirty(row) ? 'bg-amber-50/40' : '']">
              <template v-if="activeTab === 'supplier'">
                <td class="relative px-4 py-3">
                  <span v-if="isDirty(row)" class="absolute left-1 top-1/2 -translate-y-1/2 text-amber-500" title="ยังไม่ได้บันทึก">●</span>
                  <CodePill :value="row.ap_code" />
                </td>
                <td class="px-4 py-3 font-medium text-slate-800">{{ row.ap_name || '-' }}</td>
              </template>

              <template v-else>
                <td class="relative px-4 py-3">
                  <span v-if="isDirty(row)" class="absolute left-1 top-1/2 -translate-y-1/2 text-amber-500" title="ยังไม่ได้บันทึก">●</span>
                  <CodePill :value="row.ic_code" />
                </td>
                <td class="px-4 py-3 font-medium text-slate-800">{{ row.ic_name || '-' }}</td>
                <td class="px-4 py-3"><CodePill :value="row.ap_code" /></td>
                <td class="px-4 py-3 text-slate-700">{{ row.ap_name || '-' }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatMoney(row.last_purchase_price) }}</td>
              </template>

              <td v-for="field in dayFields" :key="field" class="px-2 py-3">
                <input v-model.number="row[field]" type="number" min="0" max="999" class="input-field h-10 text-right" placeholder="" @input="markDirty(row)" />
              </td>

              <template v-if="activeTab === 'itemSupplier'">
                <td class="px-2 py-3"><input v-model.number="row.min_order_qty" type="number" min="0" class="input-field h-10 text-right" @input="markDirty(row)" /></td>
                <td class="px-4 py-3 text-center"><input :checked="Number(row.is_preferred) === 1" type="checkbox" class="h-5 w-5 rounded border-slate-300 text-blue-600" @change="onToggleField(row, 'is_preferred', $event.target.checked)" /></td>
              </template>

              <td class="px-4 py-3 text-center">
                <input :checked="Number(row.planning_enabled) === 1" type="checkbox" class="h-5 w-5 rounded border-slate-300 text-blue-600" @change="onToggleField(row, 'planning_enabled', $event.target.checked)" />
              </td>
              <td class="px-2 py-3"><input v-model="row.remark" class="input-field h-10" @input="markDirty(row)" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && total > 0" class="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p class="text-center text-sm text-slate-500 lg:text-left">
          แสดง {{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }} จาก {{ formatInt(total) }} รายการ
        </p>
        <div class="flex flex-wrap justify-center gap-1">
          <button class="pager-btn" :disabled="page <= 1" @click="goPage(page - 1)">ก่อนหน้า</button>
          <button class="pager-btn" :disabled="page >= totalPages" @click="goPage(page + 1)">ถัดไป</button>
        </div>
      </div>
    </div>

    <!-- Floating save bar: แสดงเฉพาะเมื่อมี row ที่แก้แล้ว (dirty) -->
    <Transition name="slide-up">
      <div v-if="dirtyKeys.size > 0 && !loading" class="sticky bottom-4 z-30 mt-4 flex items-center justify-center gap-3 rounded-xl border border-amber-300 bg-white px-5 py-3 shadow-lg shadow-amber-200/50 lg:mx-auto lg:w-fit">
        <span class="flex items-center gap-2 text-sm text-amber-800">
          <span class="text-amber-500">●</span>
          แก้ไขแล้ว <strong>{{ formatInt(dirtyKeys.size) }}</strong> รายการ ยังไม่ได้บันทึก
        </span>
        <button class="btn-primary min-h-10 px-5" :disabled="savingAll" @click="saveAll">
          {{ savingAll ? '⏳ กำลังบันทึก...' : '💾 บันทึกทั้งหมด' }}
        </button>
      </div>
    </Transition>

    <!-- ผลลัพธ์การบันทึก -->
    <div v-if="saveAllResult" class="mt-3 rounded-xl border p-3 text-center text-sm"
      :class="saveAllResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'">
      <p class="font-medium">{{ saveAllResult.message }}</p>
      <div v-if="saveAllResult.errors?.length" class="mt-2 max-h-28 overflow-y-auto rounded bg-white/60 p-2 text-left text-xs">
        <p v-for="(err, i) in saveAllResult.errors.slice(0, 10)" :key="i">{{ err }}</p>
      </div>
    </div>

    <ConfirmDialog
      :open="confirmDialog.open"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :detail="confirmDialog.detail"
      :confirm-label="confirmDialog.confirmLabel"
      :cancel-label="confirmDialog.cancelLabel"
      :tone="confirmDialog.tone"
      :loading="syncing"
      :show-cancel="confirmDialog.showCancel"
      @confirm="resolveConfirm(true)"
      @cancel="resolveConfirm(false)"
    />
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import api from '../composables/useApi.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const CodePill = defineComponent({
  props: { value: { type: [String, Number], default: '' } },
  setup(props) {
    return () => h('span', { class: 'rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600' }, props.value || '-')
  },
})

const tabs = [
  { key: 'supplier', label: 'เจ้าหนี้' },
  { key: 'itemSupplier', label: 'สินค้า+เจ้าหนี้' },
]

const dayFields = ['lead_time_days', 'late_buffer_days', 'wholesale_buffer_days', 'order_cycle_days']
const activeTab = ref('supplier')
const rows = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const enabledOnly = ref(false)
const page = ref(1)
const limit = ref(30)
const total = ref(0)
const savingKey = ref('')
const syncing = ref(false)
const syncResult = ref(null)
const exporting = ref(false)
const importing = ref(false)
const importResult = ref(null)
const importInput = ref(null)
let pendingImportFile = null
// dirty tracking: snapshot ของ row ดั้งเดิม + set ของ row keys ที่เปลี่ยน
const dirtyKeys = ref(new Set())
const originalSnapshot = new Map()
const savingAll = ref(false)
const saveAllResult = ref(null)
const confirmDialog = reactive({
  open: false,
  title: '',
  message: '',
  detail: '',
  confirmLabel: 'ยืนยัน',
  cancelLabel: 'ยกเลิก',
  tone: 'info',
  showCancel: true,
  resolver: null,
})
let searchTimer = null
let loadSeq = 0

const configs = {
  supplier: {
    url: '/purchase-planning/supplier-settings',
    save: (row) => `/purchase-planning/supplier-settings/save/${encodeURIComponent(row.ap_code)}`,
    syncUrl: '/purchase-planning/supplier-settings/sync-from-purchase-history',
    exportUrl: '/purchase-planning/supplier-settings/export',
    importUrl: '/purchase-planning/supplier-settings/import',
    syncCheckLabel: 'ตรวจเจ้าหนี้จากประวัติซื้อ',
    syncUpdateLabel: 'อัปเดต master เจ้าหนี้',
    syncUnit: 'ราย',
    searchLabel: 'ค้นหาเจ้าหนี้',
    searchPlaceholder: 'ค้นหาตามรหัสหรือชื่อเจ้าหนี้',
    emptyText: 'ไม่พบข้อมูลเจ้าหนี้',
    tableClass: 'min-w-[1060px]',
    columns: [
      { key: 'ap_code', label: 'รหัสเจ้าหนี้', class: 'w-32 text-left' },
      { key: 'ap_name', label: 'ชื่อเจ้าหนี้', class: 'min-w-64 text-left' },
      { key: 'lead', label: 'Lead', class: 'w-28 text-right' },
      { key: 'late', label: 'Late', class: 'w-28 text-right' },
      { key: 'wholesale', label: 'Wholesale', class: 'w-32 text-right' },
      { key: 'cycle', label: 'Cycle', class: 'w-28 text-right' },
      { key: 'enabled', label: 'ใช้', class: 'w-24 text-center' },
      { key: 'remark', label: 'หมายเหตุ', class: 'min-w-44 text-left' },
    ],
  },
  itemSupplier: {
    url: '/purchase-planning/item-supplier-settings',
    save: () => '/purchase-planning/item-supplier-settings/save',
    syncUrl: '/purchase-planning/item-supplier-settings/sync-from-purchase-history',
    exportUrl: '/purchase-planning/item-supplier-settings/export',
    importUrl: '/purchase-planning/item-supplier-settings/import',
    syncCheckLabel: 'ตรวจการผูกสินค้ากับเจ้าหนี้',
    syncUpdateLabel: 'อัปเดตตารางผูกสินค้า+เจ้าหนี้',
    syncUnit: 'คู่',
    searchLabel: 'ค้นหาสินค้า+เจ้าหนี้',
    searchPlaceholder: 'ค้นหาตามรหัสสินค้า ชื่อสินค้า รหัสเจ้าหนี้ หรือชื่อเจ้าหนี้',
    emptyText: 'ไม่พบข้อมูลสินค้า+เจ้าหนี้',
    tableClass: 'min-w-[1380px]',
    columns: [
      { key: 'ic_code', label: 'รหัสสินค้า', class: 'w-32 text-left' },
      { key: 'ic_name', label: 'ชื่อสินค้า', class: 'min-w-64 text-left' },
      { key: 'ap_code', label: 'เจ้าหนี้', class: 'w-32 text-left' },
      { key: 'ap_name', label: 'ชื่อเจ้าหนี้', class: 'min-w-64 text-left' },
      { key: 'price', label: 'ราคาล่าสุด', class: 'w-28 text-right' },
      { key: 'lead', label: 'Lead', class: 'w-24 text-right' },
      { key: 'late', label: 'Late', class: 'w-24 text-right' },
      { key: 'wholesale', label: 'Wholesale', class: 'w-28 text-right' },
      { key: 'cycle', label: 'Cycle', class: 'w-24 text-right' },
      { key: 'moq', label: 'MOQ', class: 'w-28 text-right' },
      { key: 'preferred', label: 'หลัก', class: 'w-20 text-center' },
      { key: 'enabled', label: 'ใช้', class: 'w-20 text-center' },
      { key: 'remark', label: 'หมายเหตุ', class: 'min-w-44 text-left' },
    ],
  },
}

const currentConfig = computed(() => configs[activeTab.value])
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const canSyncCurrentTab = computed(() => Boolean(currentConfig.value.syncUrl))
const syncCheckLabel = computed(() => currentConfig.value.syncCheckLabel)
const syncUpdateLabel = computed(() => currentConfig.value.syncUpdateLabel)
const syncUnit = computed(() => currentConfig.value.syncUnit || 'รายการ')
const syncPreviewText = computed(() => {
  const preview = syncResult.value?.preview || []
  return preview.map((row) => row.ic_code ? `${row.ic_code}/${row.ap_code}` : `${row.ap_code}${row.ap_name ? ` ${row.ap_name}` : ''}`).join(', ')
})

function askConfirm(options) {
  return new Promise((resolve) => {
    Object.assign(confirmDialog, {
      open: true,
      title: options.title || 'ยืนยันการทำรายการ',
      message: options.message || '',
      detail: options.detail || '',
      confirmLabel: options.confirmLabel || 'ยืนยัน',
      cancelLabel: options.cancelLabel || 'ยกเลิก',
      tone: options.tone || 'info',
      showCancel: true,
      resolver: resolve,
    })
  })
}

function showNotice(options) {
  Object.assign(confirmDialog, {
    open: true,
    title: options.title || 'แจ้งเตือน',
    message: options.message || '',
    detail: options.detail || '',
    confirmLabel: options.confirmLabel || 'รับทราบ',
    cancelLabel: '',
    tone: options.tone || 'info',
    showCancel: false,
    resolver: null,
  })
}

function resolveConfirm(value) {
  const resolver = confirmDialog.resolver
  confirmDialog.open = false
  confirmDialog.resolver = null
  confirmDialog.showCancel = true
  if (resolver) resolver(value)
}

function formatInt(value) {
  return Number(value || 0).toLocaleString('th-TH')
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function rowKey(row) {
  if (activeTab.value === 'supplier') return row.ap_code
  if (activeTab.value === 'item') return row.ic_code
  return `${row.ic_code}::${row.ap_code}`
}

function normalizeRow(row) {
  for (const field of dayFields) {
    row[field] = row[field] === null || row[field] === undefined ? null : Number(row[field])
  }
  row.planning_enabled = Number(row.planning_enabled ?? 1)
  row.is_preferred = Number(row.is_preferred ?? 0)
  row.min_order_qty = Number(row.min_order_qty ?? 0)
  row.remark = row.remark || ''
  return row
}

// ฟิลด์ที่ใช้ track dirty (เฉพาะที่ editable)
const editableFields = [...dayFields, 'planning_enabled', 'is_preferred', 'min_order_qty', 'remark']

function snapshotRow(row) {
  const snap = {}
  for (const f of editableFields) snap[f] = row[f]
  return snap
}

function isDirty(row) {
  return dirtyKeys.value.has(rowKey(row))
}

function markDirty(row) {
  const key = rowKey(row)
  const snap = originalSnapshot.get(key)
  if (!snap) return
  // เปรียบเทียบค่าปัจจุบันกับ snapshot ถ้าเหมือนเดิม → ยกเลิก dirty
  const current = snapshotRow(row)
  const same = editableFields.every((f) => String(current[f] ?? '') === String(snap[f] ?? ''))
  const next = new Set(dirtyKeys.value)
  if (same) next.delete(key)
  else next.add(key)
  dirtyKeys.value = next
}

function onToggleField(row, field, checked) {
  row[field] = checked ? 1 : 0
  markDirty(row)
}

function resetDirtyTracking() {
  dirtyKeys.value = new Set()
  originalSnapshot.clear()
}

function seedSnapshot(rowsList) {
  resetDirtyTracking()
  for (const row of rowsList) {
    originalSnapshot.set(rowKey(row), snapshotRow(row))
  }
}


async function loadRows() {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(currentConfig.value.url, {
      params: { search: search.value, page: page.value, limit: limit.value, enabled_only: enabledOnly.value ? 1 : 0 },
    })
    if (seq !== loadSeq) return
    rows.value = (data.data || []).map(normalizeRow)
    seedSnapshot(rows.value)
    total.value = data.total || 0
  } catch (err) {
    if (seq !== loadSeq) return
    error.value = err.message
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

async function saveAll() {
  const dirtyRows = rows.value.filter((r) => isDirty(r))
  if (!dirtyRows.length) return
  savingAll.value = true
  saveAllResult.value = null
  let ok = 0
  let failed = 0
  const errors = []
  // บันทึกทีละ row ผ่าน save endpoint เดิม (parallel แบบจำกัด)
  await Promise.all(dirtyRows.map(async (row) => {
    try {
      await api.post(currentConfig.value.save(row), row)
      ok += 1
    } catch (err) {
      failed += 1
      errors.push(`${rowKey(row)}: ${err.message}`)
    }
  }))
  if (failed === 0) {
    saveAllResult.value = { ok: true, message: `✓ บันทึกสำเร็จ ${ok} รายการ` }
    // reload เพื่อ refresh snapshot (เคลียร์ dirty)
    await loadRows()
  } else {
    saveAllResult.value = { ok: false, message: `บันทึกสำเร็จ ${ok} / ล้มเหลว ${failed} รายการ`, errors }
    // reload เพื่อ refresh (row ที่สำเร็จจะเคลียร์ dirty)
    await loadRows()
  }
  savingAll.value = false
  // ล้างผลลัพธ์หลัง 5 วินาที
  setTimeout(() => { saveAllResult.value = null }, 5000)
}

async function syncFromHistory(dryRun) {
  if (!canSyncCurrentTab.value) return
  if (!dryRun) {
    const count = Number(syncResult.value?.missingCount || 0)
    const ok = await askConfirm({
      title: syncUpdateLabel.value,
      message: 'ระบบจะเพิ่มเฉพาะข้อมูลที่ยังไม่มีใน master และไม่ทับค่าที่ตั้งไว้แล้ว',
      detail: count ? `จำนวนที่จะอัปเดตประมาณ ${formatInt(count)} ${syncUnit.value}` : 'ยังไม่มีผลตรวจล่าสุด ระบบจะตรวจและอัปเดตจากประวัติซื้อ',
      confirmLabel: 'อัปเดต master',
      cancelLabel: 'ยกเลิก',
      tone: 'info',
    })
    if (!ok) return
  }

  syncing.value = true
  try {
    const { data } = await api.post(currentConfig.value.syncUrl, { dry_run: dryRun ? 1 : 0 })
    syncResult.value = data
    if (!dryRun) {
      page.value = 1
      await loadRows()
    }
  } catch (err) {
    showNotice({
      title: 'อัปเดต master ไม่สำเร็จ',
      message: err.message,
      tone: 'danger',
    })
  } finally {
    syncing.value = false
  }
}

// guard: เตือนก่อนทำ action ที่จะทำให้ dirty rows หาย
async function guardDirty(action) {
  if (dirtyKeys.value.size > 0) {
    const ok = await askConfirm({
      title: 'ยังไม่ได้บันทึกการแก้ไข',
      message: `มี ${formatInt(dirtyKeys.value.size)} รายการที่แก้แล้วยังไม่ได้บันทึก`,
      detail: 'ถ้าดำเนินการต่อ การแก้ไขเหล่านี้จะหายไป',
      confirmLabel: 'ดำเนินการต่อ (ทิ้งการแก้ไข)',
      cancelLabel: 'ยกเลิก',
      tone: 'danger',
    })
    if (!ok) return false
  }
  await action()
  return true
}

function switchTab(key) {
  if (key === activeTab.value) return
  guardDirty(() => {
    activeTab.value = key
    search.value = ''
    enabledOnly.value = false
    page.value = 1
    syncResult.value = null
    importResult.value = null
    pendingImportFile = null
    loadRows()
  })
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applySearch, 350)
}

function applySearch() {
  clearTimeout(searchTimer)
  guardDirty(() => {
    page.value = 1
    loadRows()
  })
}

function onToggleEnabled() {
  guardDirty(() => {
    page.value = 1
    loadRows()
  })
}

function resetSearch() {
  guardDirty(() => {
    search.value = ''
    page.value = 1
    loadRows()
  })
}

function goPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  guardDirty(() => {
    page.value = nextPage
    loadRows()
  })
}

// ── Excel export/import ──────────────────────────────────────────────────────
async function exportExcel() {
  const url = currentConfig.value.exportUrl
  if (!url) return
  exporting.value = true
  try {
    const response = await api.get(url, { responseType: 'blob' })
    // ดึงชื่อไฟล์จาก Content-Disposition ถ้ามี
    const disposition = response.headers['content-disposition'] || ''
    const match = /filename="?([^"]+)"?/.exec(disposition)
    const filename = match ? decodeURIComponent(match[1]) : `${activeTab.value}-${new Date().toISOString().slice(0, 10)}.xlsx`
    const blobUrl = URL.createObjectURL(new Blob([response.data]))
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    showNotice({ title: 'Export ไม่สำเร็จ', message: err.message, tone: 'danger' })
  } finally {
    exporting.value = false
  }
}

function triggerImport() {
  if (!currentConfig.value.importUrl) return
  importResult.value = null
  pendingImportFile = null
  if (importInput.value) importInput.value.value = ''
  importInput.value?.click()
}

async function onImportFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  pendingImportFile = file
  importing.value = true
  importResult.value = null
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('commit', '0')
    const { data } = await api.post(currentConfig.value.importUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importResult.value = data
  } catch (err) {
    showNotice({ title: 'นำเข้าไม่สำเร็จ', message: err.message, tone: 'danger' })
  } finally {
    importing.value = false
  }
}

async function confirmImport() {
  if (!pendingImportFile) return
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', pendingImportFile)
    formData.append('commit', '1')
    const { data } = await api.post(currentConfig.value.importUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importResult.value = data
    if (data.success) {
      page.value = 1
      await loadRows()
    }
  } catch (err) {
    showNotice({ title: 'บันทึกไม่สำเร็จ', message: err.message, tone: 'danger' })
  } finally {
    importing.value = false
  }
}

onMounted(loadRows)
onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  pendingImportFile = null
})
</script>

<style scoped>
.table-head-static {
  @apply px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500;
}
.pager-btn {
  @apply min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40;
}

/* Slide-up transition สำหรับ floating save bar */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
