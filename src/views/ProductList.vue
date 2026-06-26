<template>
  <div class="p-6">
    <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">จัดการสินค้า</h1>
        <!-- <p class="text-slate-500 text-sm mt-0.5">ข้อมูลสินค้าอ่านและบันทึกที่ POS DB โดยตรง</p> -->
      </div>
      <!-- <RouterLink to="/products/new" class="btn-primary">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่มสินค้า
      </RouterLink> -->
    </div>

    <div class="card p-4 mb-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div class="flex-1 min-w-0">
          <label for="product-search" class="label-text">ค้นหาสินค้า</label>
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
            </svg>
            <input
              id="product-search"
              v-model="search"
              class="input-field pl-9"
              placeholder="ค้นหาตามรหัสสินค้า ชื่อสินค้า หรือบาร์โค้ด"
              @input="onSearchInput"
              @keyup.enter="applySearch"
            />
          </div>
        </div>
        <button class="btn-secondary justify-center" @click="resetSearch">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          ล้างคำค้น
        </button>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" role="status" aria-live="polite" class="flex items-center justify-center py-20 text-slate-400">
        <svg class="animate-spin w-6 h-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        กำลังโหลดข้อมูลสินค้า...
      </div>

      <div v-else-if="error" role="alert" aria-live="assertive" class="py-16 text-center">
        <p class="text-red-500 font-medium">{{ error }}</p>
        <button class="btn-secondary mt-3 mx-auto" @click="loadProducts">ลองใหม่</button>
      </div>

      <template v-else>
        <div class="lg:hidden p-4 space-y-3">
          <div v-if="products.length === 0" role="status" class="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            {{ emptyText }}
          </div>

          <div v-for="p in products" :key="p.code" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 gap-3">
                <ProductImage :item-code="p.code" :alt="p.name_1 || p.code" image-class="h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-slate-200" />
                <div class="min-w-0">
                  <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700">
                    {{ p.code }}
                  </span>
                  <p class="mt-2 font-semibold text-slate-800 leading-tight break-words">{{ p.name_1 || '-' }}</p>
                  <p v-if="p.name_eng_1" class="mt-1 text-xs text-slate-400 break-words">{{ p.name_eng_1 }}</p>
                </div>
              </div>
              <RouterLink :to="`/products/${encodeURIComponent(p.code)}/edit`" class="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-blue-600 hover:bg-blue-50 transition-colors" :aria-label="`แก้ไขสินค้า ${p.code}`">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span class="text-xs font-semibold">แก้ไข</span>
              </RouterLink>
            </div>

            <div class="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">หน่วย</p>
                <p class="mt-1 text-slate-700">{{ p.unit_standard || '-' }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">คงเหลือ</p>
                <p class="mt-1 font-semibold text-slate-800">{{ formatQty(p.balance_qty) }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">จุดสั่งซื้อ</p>
                <p class="mt-1 text-slate-700">{{ formatQty(p.purchase_point) }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">ค้างส่ง</p>
                <p class="mt-1 text-slate-700">{{ formatQty(p.accrued_out_qty) }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">จำนวนสั่งซื้อต่ำสุด</p>
                <p class="mt-1 text-slate-700">{{ formatQty(p.minimum_qty) }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">จำนวนสั่งซื้อสูงสุด</p>
                <p class="mt-1 text-slate-700">{{ formatQty(p.maximum_qty) }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">ค้างจอง</p>
                <p class="mt-1 text-slate-700">{{ formatQty(p.book_out_qty) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full min-w-[1180px] text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="table-head-static w-20">รูป</th>
                <th class="table-head w-36" :aria-sort="ariaSort('code')">
                  <button type="button" class="sort-button" @click="toggleSort('code')">รหัส <span aria-hidden="true">{{ sortIndicator('code') }}</span></button>
                </th>
                <th class="table-head" :aria-sort="ariaSort('name_1')">
                  <button type="button" class="sort-button" @click="toggleSort('name_1')">ชื่อสินค้า <span aria-hidden="true">{{ sortIndicator('name_1') }}</span></button>
                </th>
                <th class="table-head-static w-44">ชื่อ EN</th>
                <th class="table-head w-24" :aria-sort="ariaSort('unit_standard')">
                  <button type="button" class="sort-button" @click="toggleSort('unit_standard')">หน่วย <span aria-hidden="true">{{ sortIndicator('unit_standard') }}</span></button>
                </th>
                <th class="table-head text-right w-28" :aria-sort="ariaSort('balance_qty')">
                  <button type="button" class="sort-button justify-end" @click="toggleSort('balance_qty')">คงเหลือ <span aria-hidden="true">{{ sortIndicator('balance_qty') }}</span></button>
                </th>
                <th class="table-head text-right w-32" :aria-sort="ariaSort('purchase_point')">
                  <button type="button" class="sort-button justify-end" @click="toggleSort('purchase_point')">จุดสั่งซื้อ <span aria-hidden="true">{{ sortIndicator('purchase_point') }}</span></button>
                </th>
                <th class="table-head text-right w-40" :aria-sort="ariaSort('minimum_qty')">
                  <button type="button" class="sort-button justify-end" @click="toggleSort('minimum_qty')">จำนวนสั่งซื้อต่ำสุด <span aria-hidden="true">{{ sortIndicator('minimum_qty') }}</span></button>
                </th>
                <th class="table-head text-right w-40" :aria-sort="ariaSort('maximum_qty')">
                  <button type="button" class="sort-button justify-end" @click="toggleSort('maximum_qty')">จำนวนสั่งซื้อสูงสุด <span aria-hidden="true">{{ sortIndicator('maximum_qty') }}</span></button>
                </th>
                <th class="table-head-static text-right w-28">ค้างจอง</th>
                <th class="table-head-static text-right w-28">ค้างส่ง</th>
                <th class="table-head-static text-right w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="products.length === 0">
                <td colspan="12" role="status" class="py-16 text-center text-slate-400">{{ emptyText }}</td>
              </tr>
              <tr v-for="p in products" :key="p.code" class="hover:bg-slate-50 transition-colors duration-75">
                <td class="px-4 py-3">
                  <ProductImage :item-code="p.code" :alt="p.name_1 || p.code" />
                </td>
                <td class="px-4 py-3">
                  <span class="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{{ p.code }}</span>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-800">{{ p.name_1 || '-' }}</p>
                </td>
                <td class="px-4 py-3 text-slate-500">{{ p.name_eng_1 || '-' }}</td>
                <td class="px-4 py-3 text-slate-600">{{ p.unit_standard || '-' }}</td>
                <td class="px-4 py-3 text-right font-medium text-slate-800">{{ formatQty(p.balance_qty) }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ formatQty(p.purchase_point) }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ formatQty(p.minimum_qty) }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ formatQty(p.maximum_qty) }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ formatQty(p.book_out_qty) }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ formatQty(p.accrued_out_qty) }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end">
                    <RouterLink :to="`/products/${encodeURIComponent(p.code)}/edit`" class="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" :aria-label="`แก้ไขสินค้า ${p.code}`">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      <div v-if="!loading && !error && total > 0" class="flex flex-col gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50 lg:flex-row lg:items-center lg:justify-between">
        <p class="text-sm text-slate-500 text-center lg:text-left">
          แสดง {{ (page - 1) * limit + 1 }}-{{ Math.min(page * limit, total) }} จาก {{ total }} รายการ
        </p>
        <div class="flex flex-wrap justify-center gap-1 lg:justify-end">
          <button class="pager-btn" :disabled="page <= 1" @click="goPage(1)">หน้าแรก</button>
          <button class="pager-btn" :disabled="page <= 1" @click="goPage(page - 1)">ก่อนหน้า</button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            @click="goPage(p)"
            :aria-current="p === page ? 'page' : undefined"
            :aria-label="`หน้า ${p}`"
            :class="['pager-btn min-w-[44px]', p === page ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-600' : 'border-slate-300 text-slate-600 hover:bg-white']"
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
import ProductImage from '../components/ProductImage.vue'

const products = ref([])
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
const emptyText = computed(() => hasSearch.value ? 'ไม่พบสินค้าที่ตรงกับคำค้น' : 'ไม่พบข้อมูลสินค้า')
const pageNumbers = computed(() => {
  const pages = []
  for (let i = Math.max(1, page.value - 2); i <= Math.min(totalPages.value, page.value + 2); i++) pages.push(i)
  return pages
})

function formatQty(value) {
  return (Number(value) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadProducts() {
  const currentSeq = ++loadSeq
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/products', {
      params: {
        search: search.value,
        page: page.value,
        limit: limit.value,
        sort_by: sortBy.value,
        sort_dir: sortDir.value,
      },
    })
    if (currentSeq !== loadSeq) return
    products.value = data.data || []
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
  loadProducts()
}

function resetSearch() {
  search.value = ''
  page.value = 1
  loadProducts()
}

function goPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  page.value = nextPage
  loadProducts()
}

function toggleSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
  page.value = 1
  loadProducts()
}

function sortIndicator(field) {
  if (sortBy.value !== field) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function ariaSort(field) {
  if (sortBy.value !== field) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

onMounted(loadProducts)

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>

<style scoped>
.table-head {
  @apply px-4 py-0 text-xs font-semibold text-slate-500 uppercase tracking-wide;
}
.table-head-static {
  @apply px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide;
}
.sort-button {
  @apply flex w-full min-h-11 items-center gap-1 rounded-md text-left uppercase tracking-wide hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1;
}
.pager-btn {
  @apply min-h-11 px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors;
}
</style>
