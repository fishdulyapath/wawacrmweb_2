<template>
  <div class="p-6 max-w-3xl mx-auto">

    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
        <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold text-slate-800">กำหนดสิทธิ์ผู้ใช้งาน</h1>
        <p class="text-sm text-slate-500">จัดการระดับการเข้าถึงของแต่ละบัญชี</p>
      </div>
    </div>

    <!-- Role legend -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
      <div v-for="r in roleOptions" :key="r.value"
        class="flex items-start gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2.5">
        <span class="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" :class="r.dot"></span>
        <div>
          <p class="text-xs font-semibold text-slate-700">{{ r.label }}</p>
          <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ r.desc }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-slate-400">
      <svg class="w-7 h-7 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      กำลังโหลด...
    </div>

    <!-- User list -->
    <div v-else class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">ชื่อ / รหัส</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">สิทธิ์ปัจจุบัน</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">เปลี่ยนเป็น</th>
            <th class="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="!users.length">
            <td colspan="4" class="py-10 text-center text-slate-400">ไม่พบผู้ใช้งาน</td>
          </tr>
          <tr v-for="u in users" :key="u.id"
            class="transition-colors hover:bg-slate-50"
            :class="{ 'opacity-50': u.id === currentUserId }">

            <!-- Name / code -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  :class="avatarBg(u.role)">
                  {{ u.name?.charAt(0) || '?' }}
                </div>
                <div>
                  <p class="font-medium text-slate-800">{{ u.name }}</p>
                  <p class="text-xs text-slate-400">{{ u.code }}</p>
                </div>
              </div>
            </td>

            <!-- Current role badge -->
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                :class="isSuperAdminUser(u) ? 'bg-yellow-50 text-yellow-700' : roleBadge(u.role)">
                <span class="w-1.5 h-1.5 rounded-full"
                  :class="isSuperAdminUser(u) ? 'bg-yellow-400' : roleDot(u.role)"></span>
                {{ isSuperAdminUser(u) ? 'ผู้ดูแลระบบ' : roleLabel(u.role) }}
              </span>
              <span v-if="u.id === currentUserId" class="ml-1 text-[10px] text-slate-400">(คุณ)</span>
              <span v-if="isSuperAdminUser(u)" class="ml-1 text-[10px] text-yellow-500 font-semibold">SUPERADMIN</span>
            </td>

            <!-- Role select -->
            <td class="px-4 py-3">
              <!-- SUPERADMIN lock -->
              <span v-if="isSuperAdminUser(u)"
                class="text-xs text-yellow-600 font-medium flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                ไม่สามารถเปลี่ยนได้
              </span>
              <select v-else-if="u.id !== currentUserId"
                v-model="pending[u.id]"
                class="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400">
                <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
              <span v-else class="text-xs text-slate-400">—</span>
            </td>

            <!-- Save button -->
            <td class="px-4 py-3 text-right">
              <button v-if="!isSuperAdminUser(u) && u.id !== currentUserId && pending[u.id] !== u.role"
                @click="saveRole(u)"
                :disabled="saving === u.id"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <svg v-if="saving === u.id" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                บันทึก
              </button>
              <span v-else-if="!isSuperAdminUser(u) && u.id !== currentUserId"
                class="text-xs text-slate-300">ไม่มีการเปลี่ยน</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Toast -->
    <Transition name="toast-fade">
      <div v-if="toast.show"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium"
        :class="toast.error ? 'bg-red-600 text-white' : 'bg-green-600 text-white'">
        <svg v-if="!toast.error" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast.msg }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import api from '../composables/useApi.js'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const currentUserId = computed(() => auth.user?.id)

const loading = ref(true)
const saving  = ref(null)   // user id ที่กำลัง save
const users   = ref([])
const pending = reactive({})  // { [userId]: selectedRole }

const toast = reactive({ show: false, msg: '', error: false })
let toastTimer = null

function showToast(msg, error = false) {
  clearTimeout(toastTimer)
  toast.msg = msg; toast.error = error; toast.show = true
  toastTimer = setTimeout(() => { toast.show = false }, 2500)
}

const roleOptions = [
  { value: 'sales_rep',  label: 'พนักงาน',    desc: 'ดูและปิดงาน',           dot: 'bg-slate-400' },
  { value: 'supervisor', label: 'หัวหน้าทีม', desc: 'สร้าง+แก้ไขงาน',        dot: 'bg-blue-400'  },
  { value: 'manager',    label: 'ผู้จัดการ',   desc: 'สร้าง+แก้ไข+ดูทุกงาน', dot: 'bg-indigo-500' },
  { value: 'admin',      label: 'ผู้ดูแลระบบ', desc: 'ทุกสิทธิ์+กำหนดสิทธิ์', dot: 'bg-red-500'   },
]

// SUPERADMIN = user ที่มี code === 'SUPERADMIN' (case-insensitive)
function isSuperAdminUser(u) {
  return u.code?.toUpperCase() === 'SUPERADMIN'
}

function roleLabel(r)  { return roleOptions.find(o => o.value === r)?.label || r }
function roleDot(r)    { return roleOptions.find(o => o.value === r)?.dot   || 'bg-slate-300' }
function roleBadge(r) {
  return {
    sales_rep:  'bg-slate-100 text-slate-600',
    supervisor: 'bg-blue-50 text-blue-700',
    manager:    'bg-indigo-50 text-indigo-700',
    admin:      'bg-red-50 text-red-700',
  }[r] || 'bg-slate-100 text-slate-500'
}
function avatarBg(r) {
  return {
    sales_rep:  'bg-slate-500',
    supervisor: 'bg-blue-500',
    manager:    'bg-indigo-600',
    admin:      'bg-red-600',
  }[r] || 'bg-slate-400'
}

async function loadUsers() {
  loading.value = true
  try {
    const { data } = await api.get('/employees/crm-users')
    users.value = data
    data.forEach(u => { pending[u.id] = u.role })
  } catch (e) {
    showToast(e.message, true)
  } finally {
    loading.value = false
  }
}

async function saveRole(u) {
  saving.value = u.id
  try {
    await api.patch(`/employees/crm-users/${u.id}/role`, { role: pending[u.id] })
    u.role = pending[u.id]
    showToast(`เปลี่ยนสิทธิ์ ${u.name} เป็น "${roleLabel(u.role)}" แล้ว`)
  } catch (e) {
    showToast(e.message, true)
    pending[u.id] = u.role   // reset
  } finally {
    saving.value = null
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active { transition: all .25s ease }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px) }
</style>
