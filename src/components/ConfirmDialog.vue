<template>
  <Transition name="dialog-fade">
    <div v-if="open" class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-4" @click.self="$emit('cancel')">
      <div class="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div class="flex gap-3 p-5">
          <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-full', toneClass.iconBg]">
            <svg v-if="tone === 'danger'" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <svg v-else-if="tone === 'success'" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 13 4 4L19 7" />
            </svg>
            <svg v-else class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="text-base font-semibold text-slate-900">{{ title }}</h2>
            <p v-if="message" class="mt-1 text-sm leading-6 text-slate-600">{{ message }}</p>
            <div v-if="detail" class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {{ detail }}
            </div>
          </div>
        </div>

        <div class="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button v-if="showCancel" type="button" class="btn-secondary justify-center" :disabled="loading" @click="$emit('cancel')">
            {{ cancelLabel }}
          </button>
          <button type="button" :class="['inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50', toneClass.button]" :disabled="loading" @click="$emit('confirm')">
            <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8z" />
            </svg>
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'ยืนยันการทำรายการ' },
  message: { type: String, default: '' },
  detail: { type: String, default: '' },
  confirmLabel: { type: String, default: 'ยืนยัน' },
  cancelLabel: { type: String, default: 'ยกเลิก' },
  tone: { type: String, default: 'info' },
  loading: { type: Boolean, default: false },
  showCancel: { type: Boolean, default: true },
})

defineEmits(['confirm', 'cancel'])

const toneClass = computed(() => {
  if (props.tone === 'danger') {
    return { iconBg: 'bg-red-100', button: 'bg-red-600 hover:bg-red-700' }
  }
  if (props.tone === 'success') {
    return { iconBg: 'bg-green-100', button: 'bg-green-600 hover:bg-green-700' }
  }
  return { iconBg: 'bg-blue-100', button: 'bg-blue-600 hover:bg-blue-700' }
})
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.16s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
