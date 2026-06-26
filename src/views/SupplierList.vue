<template>
  <div class="p-6">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">จัดการเจ้าหนี้</h1>
        <p class="mt-0.5 text-sm text-slate-500">ข้อมูลเจ้าหนี้อ่านและบันทึกที่ POS DB โดยตรง</p>
      </div>
      <RouterLink to="/suppliers/new" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่มเจ้าหนี้
      </RouterLink>
    </div>

    <div class="card mb-4 p-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div class="min-w-0 flex-1">
          <label for="supplier-search" class="label-text">ค้นหาเจ้าหนี้</label>
          <div class="relative">
            <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
            <input
              id="supplier-search"
              v-model="search"
              class="input-field pl-9"
              placeholder="ค้นหาตามรหัส ชื่อเจ้าหนี้ โทรศัพท์ หรือเลขภาษี"
              @input="onSearchInput"
              @keyup.enter="applySearch"
            />
          </div>
        </div>
        <button class="btn-secondary justify-center" @click="resetSearch">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          ล้างคำค้น
        </button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" role="status" aria-live="polite" class="flex items-center justify-center py-20 text-slate-400">
        <svg class="mr-2 h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        กำลังโหลดข้อมูลเจ้าหนี้...
      </div>

      <div v-else-if="error" role="alert" aria-live="assertive" class="py-16 text-center">
        <p class="font-medium text-red-500">{{ error }}</p>
        <button class="btn-secondary mx-auto mt-3" @click="loadSuppliers">ลองใหม่</button>
      </div>

      <template v-else>
        <div class="space-y-3 p-4 lg:hidden">
          <div v-if="suppliers.length === 0" role="status" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center text-slate-400">
            {{ emptyText }}
          </div>

          <div v-for="supplier in suppliers" :key="supplier.code" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700">
                  {{ supplier.code }}
                </span>
                <p class="mt-2 break-words font-semibold leading-tight text-slate-800">{{ supplier.name_1 || '-' }}</p>
                <p v-if="supplier.address" class="mt-1 break-words text-xs text-slate-400">{{ supplier.address }}</p>
              </div>
              <RouterLink :to="`/suppliers/${encodeURIComponent(supplier.code)}/edit`" class="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-blue-600 transition-colors hover:bg-blue-50" :aria-label="`แก้ไขเจ้าหนี้ ${supplier.code}`">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span class="text-xs font-semibold">แก้ไข</span>
              </RouterLink>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">จังหวัด</p>
                <p class="mt-1 break-words text-slate-700">{{ supplier.province || '-' }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">โทรศัพท์</p>
                <p class="mt-1 break-words text-slate-700">{{ supplier.telephone || '-' }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">เลขภาษี</p>
                <p class="mt-1 break-words text-slate-700">{{ supplier.tax_id || '-' }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">ภาษี</p>
                <p class="mt-1"><span v-if="supplier.tax_type" class="rounded px-2 py-0.5 text-xs font-medium" :class="taxTypeBadgeClass(supplier.tax_type)">{{ taxTypeLabel(supplier.tax_type) }}</span><span v-else class="text-slate-300">-</span></p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">เครดิตวัน</p>
                <p class="mt-1 break-words text-slate-700">{{ supplier.credit_day || 0 }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="hidden overflow-x-auto lg:block">
          <table class="w-full min-w-[980px] text-sm">
            <thead class="border-b border-slate-200 bg-slate-50">
              <tr>
                <th class="table-head w-36" :aria-sort="ariaSort('code')">
                  <button type="button" class="sort-button" @click="toggleSort('code')">รหัส <span aria-hidden="true">{{ sortIndicator('code') }}</span></button>
                </th>
                <th class="table-head" :aria-sort="ariaSort('name_1')">
                  <button type="button" class="sort-button" @click="toggleSort('name_1')">ชื่อเจ้าหนี้ <span aria-hidden="true">{{ sortIndicator('name_1') }}</span></button>
                </th>
                <th class="table-head text-left w-36" :aria-sort="ariaSort('province')">
                  <button type="button" class="sort-button" @click="toggleSort('province')">จังหวัด <span aria-hidden="true">{{ sortIndicator('province') }}</span></button>
                </th>
                <th class="table-head text-left w-36" :aria-sort="ariaSort('telephone')">
                  <button type="button" class="sort-button" @click="toggleSort('telephone')">โทรศัพท์ <span aria-hidden="true">{{ sortIndicator('telephone') }}</span></button>
                </th>
                <th class="table-head text-left w-40" :aria-sort="ariaSort('tax_id')">
                  <button type="button" class="sort-button" @click="toggleSort('tax_id')">เลขภาษี <span aria-hidden="true">{{ sortIndicator('tax_id') }}</span></button>
                </th>
                <th class="table-head text-left w-32">ภาษี</th>
                <th class="table-head-static w-24 text-right">เครดิตวัน</th>
                <th class="table-head-static w-24 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="suppliers.length === 0">
                <td colspan="8" role="status" class="py-16 text-center text-slate-400">{{ emptyText }}</td>
              </tr>
              <tr v-for="supplier in suppliers" :key="supplier.code" class="transition-colors duration-75 hover:bg-slate-50">
                <td class="px-4 py-3">
                  <span class="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600">{{ supplier.code }}</span>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-800">{{ supplier.name_1 || '-' }}</p>
                  <p v-if="supplier.address" class="mt-0.5 truncate text-xs text-slate-400">{{ supplier.address }}</p>
                </td>
                <td class="px-4 py-3 text-slate-600">{{ supplier.province || '-' }}</td>
                <td class="px-4 py-3 text-slate-600">{{ supplier.telephone || '-' }}</td>
                <td class="px-4 py-3 text-slate-600">{{ supplier.tax_id || '-' }}</td>
                <td class="px-4 py-3"><span v-if="supplier.tax_type" class="rounded px-2 py-0.5 text-xs font-medium" :class="taxTypeBadgeClass(supplier.tax_type)">{{ taxTypeLabel(supplier.tax_type) }}</span><span v-else class="text-slate-300">-</span></td>
                <td class="px-4 py-3 text-right text-slate-600">{{ supplier.credit_day || 0 }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end">
                    <RouterLink :to="`/suppliers/${encodeURIComponent(supplier.code)}/edit`" class="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600" :aria-label="`แก้ไขเจ้าหนี้ ${supplier.code}`">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </RouterLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-if="!loading && !error && total > 0" class="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p class="text-center text-sm text-slate-500 lg:text-left">
          แสดง {{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }} จาก {{ total }} รายการ
        </p>
        <div class="flex flex-wrap justify-center gap-1 lg:justify-end">
          <button class="pager-btn" :disabled="page <= 1" @click="goPage(1)">หน้าแรก</button>
          <button class="pager-btn" :disabled="page <= 1" @click="goPage(page - 1)">ก่อนหน้า</button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            :aria-current="p === page ? 'page' : undefined"
            :aria-label="`หน้า ${p}`"
            :class="['pager-btn min-w-[44px]', p === page ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-600' : 'border-slate-300 text-slate-600 hover:bg-white']"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button class="pager-btn" :disabled="page >= totalPages" @click="goPage(page + 1)">ถัดไป</button>
          <button class="pager-btn" :disabled="page >= totalPages" @click="goPage(totalPages)">หน้าสุดท้าย</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../composables/useApi.js'

const suppliers = ref([])
const loading = ref(false)
const error = ref('')
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const search = ref('')
const sortBy = ref('code')
const sortDir = ref('asc')
let searchTimer = null
let loadSeq = 0

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
const hasSearch = computed(() => search.value.trim().length > 0)
const emptyText = computed(() => hasSearch.value ? 'ไม่พบเจ้าหนี้ที่ตรงกับคำค้น' : 'ไม่พบข้อมูลเจ้าหนี้')
const pageNumbers = computed(() => {
  const pages = []
  for (let i = Math.max(1, page.value - 2); i <= Math.min(totalPages.value, page.value + 2); i++) pages.push(i)
  return pages
})

async function loadSuppliers() {
  const currentSeq = ++loadSeq
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/suppliers', {
      params: {
        search: search.value,
        page: page.value,
        limit: limit.value,
        sort_by: sortBy.value,
        sort_dir: sortDir.value,
      },
    })
    if (currentSeq !== loadSeq) return
    suppliers.value = data.data || []
    total.value = data.total || 0
  } catch (err) {
    if (currentSeq !== loadSeq) return
    error.value = err.message
  } finally {
    if (currentSeq === loadSeq) loading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applySearch, 350)
}

function applySearch() {
  clearTimeout(searchTimer)
  page.value = 1
  loadSuppliers()
}

function resetSearch() {
  search.value = ''
  page.value = 1
  loadSuppliers()
}

function goPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  page.value = nextPage
  loadSuppliers()
}

function toggleSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
  page.value = 1
  loadSuppliers()
}

function sortIndicator(field) {
  if (sortBy.value !== field) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function ariaSort(field) {
  if (sortBy.value !== field) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

// ประเภทภาษี: '0'=ภาษีแยกนอก, '1'=ภาษีรวมใน, '2'=ภาษีศูนย์
function taxTypeLabel(taxType) {
  return { '0': 'แยกนอก', '1': 'รวมใน', '2': 'ศูนย์' }[String(taxType)] || '-'
}
function taxTypeBadgeClass(taxType) {
  // '1' (รวมใน) เด่นสีแดง เพราะกระทบราคา/ภาษีมากสุด
  return {
    '0': 'bg-slate-100 text-slate-600',
    '1': 'bg-red-100 text-red-600',
    '2': 'bg-emerald-100 text-emerald-700',
  }[String(taxType)] || 'bg-slate-100 text-slate-600'
}

onMounted(loadSuppliers)

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>

<style scoped>
.table-head {
  @apply px-4 py-0 text-xs font-semibold uppercase tracking-wide text-slate-500;
}
.table-head-static {
  @apply px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500;
}
.sort-button {
  @apply flex min-h-11 w-full items-center gap-1 rounded-md text-left uppercase tracking-wide hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1;
}
.pager-btn {
  @apply min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
