<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-end lg:items-center justify-center px-0 lg:px-4"
           @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/50" @click="$emit('close')"></div>
        <div class="relative bg-white w-full lg:max-w-sm rounded-t-2xl lg:rounded-2xl shadow-2xl">

          <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 lg:hidden"></div>

          <div class="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-lg">⏰</div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-slate-800 text-sm truncate">{{ activity?.subject }}</p>
              <p class="text-xs text-slate-400">เลื่อนกำหนด</p>
            </div>
            <button @click="$emit('close')" class="text-slate-300 hover:text-slate-500 p-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="px-5 py-4 space-y-4">
            <!-- Quick shortcuts -->
            <div>
              <label class="modal-label">เลือกวันที่เร็ว</label>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="s in snoozeShortcuts" :key="s.label"
                  @click="applyShortcut(s.days)"
                  class="py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                  {{ s.label }}
                </button>
              </div>
            </div>
            <!-- Date picker -->
            <div>
              <label class="modal-label">หรือเลือกวันที่เอง</label>
              <input v-model="date" type="date" class="modal-input" :min="todayStr" />
            </div>
          </div>

          <div class="px-5 py-4 border-t border-slate-100 flex gap-3">
            <button @click="$emit('close')"
              class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button @click="confirmSnooze" :disabled="!date || saving"
              class="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              ⏰ เลื่อนงาน
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '../composables/useApi.js'

const props = defineProps({
  show:     { type: Boolean, default: false },
  activity: { type: Object,  default: null },
})

const emit = defineEmits(['close', 'snoozed'])

const date   = ref('')
const saving = ref(false)
const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })

const snoozeShortcuts = [
  { label: '+1 วัน',      days: 1 },
  { label: '+3 วัน',      days: 3 },
  { label: '+1 สัปดาห์',  days: 7 },
  { label: '+2 สัปดาห์',  days: 14 },
  { label: '+1 เดือน',    days: 30 },
  { label: 'สัปดาห์หน้า', days: null }, // จันทร์หน้า
]

watch(() => props.activity, () => { date.value = '' })

function applyShortcut(days) {
  const d = new Date()
  if (days === null) {
    // จันทร์หน้า
    const dow = d.getDay()
    d.setDate(d.getDate() + (dow === 0 ? 1 : 8 - dow))
  } else {
    d.setDate(d.getDate() + days)
  }
  date.value = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
}

async function confirmSnooze() {
  if (!date.value || saving.value) return
  saving.value = true
  try {
    const { data } = await api.patch(`/activities/${props.activity.id}/snooze`, { date: date.value })
    emit('snoozed', data)
  } catch (err) {
    alert(err.response?.data?.error || err.message || 'เกิดข้อผิดพลาด')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-label { @apply block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2; }
.modal-input { @apply w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500; }

.modal-fade-enter-active { transition: opacity 0.2s ease; }
.modal-fade-leave-active { transition: opacity 0.15s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to    { opacity: 0; }
</style>
