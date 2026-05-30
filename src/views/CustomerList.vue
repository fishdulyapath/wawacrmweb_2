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
          <select v-model="filter.status" @change="applyFilter" class="input-field">
            <option value="">ทั้งหมด</option>
            <option value="active">ใช้งาน</option>
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="blacklist">บัญชีดำ</option>
          </select>
        </div>

        <!-- Owner filter -->
        <div class="w-48">
          <label class="label-text">พนักงานผู้ดูแล</label>
          <select v-model="filter.owner" @change="applyFilter" class="input-field">
            <option value="">ทั้งหมด</option>
            <option v-for="e in employees" :key="e.code" :value="e.code">
              {{ e.code }} — {{ e.name_1 }}
            </option>
          </select>
        </div>

        <div class="w-48">
          <label class="label-text">ข้อมูลส่งของ</label>
          <select v-model="filter.fleet_status" @change="applyFilter" class="input-field">
            <option value="">ทั้งหมด</option>
            <option value="has_fleet">มีประวัติส่งของ</option>
            <option value="no_fleet">ไม่มีข้อมูลส่งของ</option>
            <option value="has_returns">มีคืนของ</option>
            <option value="has_problems">มีปัญหา</option>
            <option value="store_closed">ร้านปิดบ่อย/ร้านปิด</option>
          </select>
        </div>

        <!-- Follow-up filter -->
        <div class="w-44">
          <label class="label-text">Follow Up</label>
          <select v-model="filter.followup_enabled" @change="applyFilter" class="input-field">
            <option value="">ทั้งหมด</option>
            <option value="true">เปิดใช้งาน</option>
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

      <template v-else>
        <!-- Mobile + Tablet -->
        <div class="lg:hidden p-4 space-y-3">
          <div v-if="customers.length === 0" class="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <svg class="mx-auto w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            ไม่พบข้อมูลลูกค้า
          </div>

          <div v-for="c in customers" :key="c.code" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700">
                  {{ c.code }}
                </span>
                <p class="mt-2 font-semibold text-slate-800 leading-tight">{{ c.name_1 }}</p>
                <p v-if="c.address" class="mt-1 text-xs text-slate-400 leading-snug">{{ c.address }}</p>
              </div>
              <span :class="statusBadge(c.crm?.crm_status)">
                {{ statusLabel(c.crm?.crm_status) }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">ที่อยู่</p>
                <p class="mt-1 text-slate-700">
                  {{ c.amper_name && c.province_name
                      ? `${c.amper_name} (${c.province_name})`
                      : c.province_name || c.province || '—' }}
                </p>
              </div>
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">ประเภท</p>
                <p class="mt-1 text-slate-700">{{ c.crm?.customer_type || 'B2C' }}</p>
              </div>
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">Follow Up</p>
                <p class="mt-1" :class="followupDateClass(c.crm?.next_followup)">
                  {{ formatDate(c.crm?.next_followup) }}
                </p>
              </div>
              <div>
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">ซื้อล่าสุด</p>
                <p class="mt-1 text-slate-700 text-sm">{{ formatDate(c.last_purchase_date) }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">พนักงานผู้ดูแล</p>
                <div v-if="crmOwnerNames(c) || c.sale_name" class="mt-1 flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                       :class="crmOwnerNames(c) ? 'bg-blue-600' : 'bg-slate-500'">
                    {{ (crmOwnerNames(c) || c.sale_name).charAt(0) }}
                  </div>
                  <div>
                    <p class="text-slate-700 text-sm leading-tight">{{ crmOwnerNames(c) || c.sale_name }}</p>
                    <p v-if="crmOwnerNames(c) && c.sale_name" class="text-xs text-slate-400 leading-tight">POS: {{ c.sale_name }}</p>
                  </div>
                </div>
                <p v-else class="mt-1 text-xs text-slate-400">— ยังไม่ระบุ —</p>
              </div>
              <div class="col-span-2">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">ส่งของ</p>
                <div v-if="c.crm?.fleet" class="mt-1 space-y-1">
                  <span :class="fleetBadge(c.crm.fleet)">
                    {{ fleetLabel(c.crm.fleet) }}
                  </span>
                  <p class="text-[11px] text-slate-400">ล่าสุด {{ fleetDate(c.crm.fleet.latest_visit_at) }}</p>
                </div>
                <p v-else class="mt-1 text-xs text-slate-400">ไม่มีข้อมูลส่งของ</p>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <RouterLink :to="`/customers/${c.code}/edit`"
                          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                          title="แก้ไข">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                แก้ไข
              </RouterLink>
              <button @click="confirmDelete(c)"
                      class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      title="ลบ">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                ลบ
              </button>
            </div>
          </div>
        </div>

        <!-- Desktop -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full min-w-[1440px] text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th @click="toggleSort('code')" class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28 cursor-pointer select-none hover:bg-slate-100">
                  รหัส <span class="ml-1 text-slate-400">{{ sortIndicator('code') }}</span>
                </th>
                <th @click="toggleSort('name_1')" class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:bg-slate-100">
                  ชื่อลูกค้า <span class="ml-1 text-slate-400">{{ sortIndicator('name_1') }}</span>
                </th>
                <th @click="toggleSort('province')" class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-44 cursor-pointer select-none hover:bg-slate-100">
                  ที่อยู่ <span class="ml-1 text-slate-400">{{ sortIndicator('province') }}</span>
                </th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">พนักงานผู้ดูแล</th>
                <th @click="toggleSort('next_followup')" class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32 cursor-pointer select-none hover:bg-slate-100">
                  Follow Up <span class="ml-1 text-slate-400">{{ sortIndicator('next_followup') }}</span>
                </th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">ประเภท</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">สถานะ</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">ส่งของ</th>
                <th @click="toggleSort('last_purchase_date')" class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32 cursor-pointer select-none hover:bg-slate-100">
                  ซื้อล่าสุด <span class="ml-1 text-slate-400">{{ sortIndicator('last_purchase_date') }}</span>
                </th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="customers.length === 0">
                <td colspan="10" class="py-16 text-center text-slate-400">
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
                <td class="px-4 py-3 text-slate-600 text-sm">
                  {{ c.amper_name && c.province_name
                      ? `${c.amper_name} (${c.province_name})`
                      : c.province_name || c.province || '—' }}
                </td>
                <td class="px-4 py-3">
                  <template v-if="crmOwnerNames(c) || c.sale_name">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                           :class="crmOwnerNames(c) ? 'bg-blue-600' : 'bg-slate-500'">
                        {{ (crmOwnerNames(c) || c.sale_name).charAt(0) }}
                      </div>
                      <div>
                        <p class="text-slate-700 text-sm leading-tight">{{ crmOwnerNames(c) || c.sale_name }}</p>
                        <p v-if="crmOwnerNames(c) && c.sale_name"
                           class="text-xs text-slate-400 leading-tight">POS: {{ c.sale_name }}</p>
                      </div>
                    </div>
                  </template>
                  <span v-else class="text-slate-400 text-xs">— ยังไม่ระบุ —</span>
                </td>
                <td class="px-4 py-3">
                  <span :class="followupDateClass(c.crm?.next_followup)">
                    {{ formatDate(c.crm?.next_followup) }}
                  </span>
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
                  <div v-if="c.crm?.fleet" class="space-y-1">
                    <span :class="fleetBadge(c.crm.fleet)">
                      {{ fleetLabel(c.crm.fleet) }}
                    </span>
                    <p class="text-[11px] text-slate-400">
                      ล่าสุด {{ fleetDate(c.crm.fleet.latest_visit_at) }}
                    </p>
                  </div>
                  <span v-else class="text-xs text-slate-400">ไม่มีข้อมูลส่งของ</span>
                </td>
                <td class="px-4 py-3 text-slate-600 text-sm">
                  {{ formatDate(c.last_purchase_date) }}
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
        </div>
      </template>

      <!-- Pagination -->
      <div v-if="!loading && !error && total > 0"
           class="flex flex-col gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50 lg:flex-row lg:items-center lg:justify-between">
        <p class="text-sm text-slate-500 text-center lg:text-left">
          แสดง {{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, total) }}
          จาก {{ total }} รายการ
        </p>
        <div class="flex flex-wrap justify-center gap-1 lg:justify-end">
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

const filter = reactive({ search: '', status: '', owner: '', fleet_status: '', followup_enabled: '' })
const sortBy  = ref('code')
const sortDir = ref('asc')

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
      params: {
        search: filter.search,
        status: filter.status,
        owner: filter.owner,
        fleet_status: filter.fleet_status,
        page: page.value,
        limit: limit.value,
        followup_enabled: filter.followup_enabled,
        sort_by: sortBy.value,
        sort_dir: sortDir.value,
      }
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

function applyFilter() {
  page.value = 1
  loadData()
}

function resetFilter() {
  filter.search = ''
  filter.status = ''
  filter.owner  = ''
  filter.fleet_status = ''
  filter.followup_enabled = ''
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

function crmOwnerNames(c) {
  const owners = c.crm?.owners || []
  if (owners.length) return owners.map(o => o.name || o.code).filter(Boolean).join(', ')
  return c.crm?.owner_name || ''
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

function fleetBadge(fleet) {
  if (Number(fleet.problem_count || 0) > 0 || Number(fleet.store_closed_count || 0) > 0) return 'badge-blacklist'
  if (Number(fleet.return_total || 0) > 0) return 'badge-inactive'
  return 'badge-active'
}

function fleetLabel(fleet) {
  if (Number(fleet.store_closed_count || 0) > 0) return `ร้านปิด ${fleet.store_closed_count}`
  if (Number(fleet.problem_count || 0) > 0) return `มีปัญหา ${fleet.problem_count}`
  if (Number(fleet.return_total || 0) > 0) return 'มีคืนของ'
  return `ส่ง ${fleet.visits || 0} ครั้ง`
}

function fleetDate(v) {
  if (!v) return '-'
  return new Date(v).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}

function followupDateClass(dateStr) {
  if (!dateStr) return 'text-slate-300 text-xs'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysDiff = Math.floor((new Date(dateStr) - today) / 86400000)
  if (daysDiff < 0)  return 'text-red-600 font-medium text-sm'
  if (daysDiff <= 7) return 'text-amber-600 font-medium text-sm'
  return 'text-slate-600 text-sm'
}

function toggleSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value  = field
    sortDir.value = 'asc'
  }
  page.value = 1
  loadData()
}

function sortIndicator(field) {
  if (sortBy.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

// ── Init ──────────────────────────────────
onMounted(() => {
  loadData()
  loadEmployees()
})
</script>
