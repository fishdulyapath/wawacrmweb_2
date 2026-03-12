<template>
  <div class="p-6">

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-800">จัดการลูกค้า</h1>
        <p class="text-slate-500 text-sm mt-0.5">ข้อมูลจากระบบ POS</p>
      </div>
      <RouterLink to="/customers/new" class="btn-primary">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        เพิ่มลูกค้าใหม่
      </RouterLink>
    </div>

    <!-- Filter bar -->
    <div class="card p-4 mb-4">
      <div class="flex flex-wrap gap-3 items-end">

        <!-- Search -->
        <div class="flex-1 min-w-48">
          <label class="label-text">ค้นหา</label>
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input v-model="filter.search" @input="onSearchInput"
                   class="input-field pl-9" placeholder="รหัส หรือ ชื่อลูกค้า..."/>
          </div>
        </div>

        <!-- Status -->
        <div class="w-40">
          <label class="label-text">สถานะ CRM</label>
          <select v-model="filter.status" @change="loadData" class="input-field">
            <option value="">ทั้งหมด</option>
            <option value="active">ใช้งาน</option>
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="blacklist">บัญชีดำ</option>
          </select>
        </div>

        <!-- Owner filter -->
        <div class="w-48">
          <label class="label-text">พนักงานผู้ดูแล</label>
          <select v-model="filter.owner" @change="loadData" class="input-field">
            <option value="">ทั้งหมด</option>
            <option v-for="e in employees" :key="e.code" :value="e.code">
              {{ e.code }} — {{ e.name_1 }}
            </option>
          </select>
        </div>

        <!-- Reset -->
        <button @click="resetFilter" class="btn-secondary self-end">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          ล้างตัวกรอง
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400">
        <svg class="animate-spin w-6 h-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        กำลังโหลดข้อมูล...
      </div>

      <!-- Error -->
      <div v-else-if="error" class="py-16 text-center">
        <svg class="mx-auto w-10 h-10 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-red-500 font-medium">{{ error }}</p>
        <button @click="loadData" class="btn-secondary mt-3 mx-auto">ลองใหม่</button>
      </div>

      <!-- Table -->
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">รหัส</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ชื่อลูกค้า</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">จังหวัด</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">พนักงานผู้ดูแล</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">ประเภท</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">สถานะ</th>
            <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">จัดการ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="customers.length === 0">
            <td colspan="7" class="py-16 text-center text-slate-400">
              <svg class="mx-auto w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
              </svg>
              ไม่พบข้อมูลลูกค้า
            </td>
          </tr>
          <tr v-for="c in customers" :key="c.code"
              class="hover:bg-slate-50 transition-colors duration-75">
            <td class="px-4 py-3">
              <span class="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {{ c.code }}
              </span>
            </td>
            <td class="px-4 py-3">
              <p class="font-medium text-slate-800">{{ c.name_1 }}</p>
              <p v-if="c.address" class="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{{ c.address }}</p>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ c.province || '—' }}</td>
            <td class="px-4 py-3">
              <template v-if="c.crm?.owner_name || c.sale_name">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                       :class="c.crm?.owner_name ? 'bg-blue-600' : 'bg-slate-500'">
                    {{ (c.crm?.owner_name || c.sale_name).charAt(0) }}
                  </div>
                  <div>
                    <p class="text-slate-700 text-sm leading-tight">{{ c.crm?.owner_name || c.sale_name }}</p>
                    <p v-if="c.crm?.owner_name && c.sale_name && c.crm.owner_name !== c.sale_name"
                       class="text-xs text-slate-400 leading-tight">POS: {{ c.sale_name }}</p>
                  </div>
                </div>
              </template>
              <span v-else class="text-slate-400 text-xs">— ยังไม่ระบุ —</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-xs font-medium text-slate-600">
                {{ c.crm?.customer_type || 'B2C' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span :class="statusBadge(c.crm?.crm_status)">
                {{ statusLabel(c.crm?.crm_status) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-2">
                <RouterLink :to="`/customers/${c.code}/edit`"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="แก้ไข">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </RouterLink>
                <button @click="confirmDelete(c)"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="ลบ">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="!loading && !error && total > 0"
           class="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
        <p class="text-sm text-slate-500">
          แสดง {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, total) }}
          จาก {{ total }} รายการ
        </p>
        <div class="flex gap-1">
          <button @click="goPage(page - 1)" :disabled="page <= 1"
                  class="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600
                         hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← ก่อนหน้า
          </button>
          <button v-for="p in pageNumbers" :key="p"
                  @click="goPage(p)"
                  :class="['px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    p === page
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 text-slate-600 hover:bg-white']">
            {{ p }}
          </button>
          <button @click="goPage(page + 1)" :disabled="page >= totalPages"
                  class="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600
                         hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ถัดไป →
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div v-if="deleteTarget"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-slate-800">ยืนยันการลบ</h3>
              <p class="text-slate-500 text-sm mt-0.5">
                ลบลูกค้า <span class="font-semibold text-slate-700">{{ deleteTarget.name_1 }}</span>
                ({{ deleteTarget.code }}) ?
              </p>
            </div>
          </div>
          <p class="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-5">
            ⚠️ ข้อมูลจะถูกลบออกจากทั้ง POS และ CRM อย่างถาวร
          </p>
          <div class="flex gap-3">
            <button @click="deleteTarget = null" class="btn-secondary flex-1 justify-center">ยกเลิก</button>
            <button @click="doDelete" :disabled="deleting" class="btn-danger flex-1 justify-center">
              <svg v-if="deleting" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ deleting ? 'กำลังลบ...' : 'ยืนยันลบ' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="toast.show"
           :class="['fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
             toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white']">
        <svg v-if="toast.type === 'success'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        {{ toast.message }}
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../composables/useApi.js'

// ── State ─────────────────────────────────
const customers = ref([])
const employees  = ref([])
const loading    = ref(false)
const error      = ref(null)
const total      = ref(0)
const page       = ref(1)
const limit      = ref(20)
const deleteTarget = ref(null)
const deleting     = ref(false)
const toast = reactive({ show: false, type: 'success', message: '' })

const filter = reactive({ search: '', status: '', owner: '' })

let searchTimer = null

// ── Computed ──────────────────────────────
const totalPages = computed(() => Math.ceil(total.value / limit.value))
const pageNumbers = computed(() => {
  const pages = []
  for (let i = Math.max(1, page.value - 2); i <= Math.min(totalPages.value, page.value + 2); i++) {
    pages.push(i)
  }
  return pages
})

// ── Methods ───────────────────────────────
async function loadData() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/customers', {
      params: { search: filter.search, status: filter.status, owner: filter.owner, page: page.value, limit: limit.value }
    })
    customers.value = data.data
    total.value     = data.total
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadEmployees() {
  try {
    const { data } = await api.get('/employees')
    employees.value = data
  } catch {}
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; loadData() }, 400)
}

function resetFilter() {
  filter.search = ''
  filter.status = ''
  filter.owner  = ''
  page.value    = 1
  loadData()
}

function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  loadData()
}

function confirmDelete(c) { deleteTarget.value = c }

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/customers/${deleteTarget.value.code}`)
    showToast('success', `ลบลูกค้า ${deleteTarget.value.name_1} แล้ว`)
    deleteTarget.value = null
    loadData()
  } catch (e) {
    showToast('error', e.message)
  } finally {
    deleting.value = false
  }
}

function showToast(type, message) {
  toast.type    = type
  toast.message = message
  toast.show    = true
  setTimeout(() => { toast.show = false }, 3500)
}

function statusBadge(s) {
  return s === 'active' ? 'badge-active'
       : s === 'inactive' ? 'badge-inactive'
       : s === 'blacklist' ? 'badge-blacklist'
       : 'badge-inactive'
}
function statusLabel(s) {
  return s === 'active' ? 'ใช้งาน'
       : s === 'inactive' ? 'ไม่ใช้งาน'
       : s === 'blacklist' ? 'บัญชีดำ'
       : 'ไม่ระบุ'
}

// ── Init ──────────────────────────────────
onMounted(() => {
  loadData()
  loadEmployees()
})
</script>
