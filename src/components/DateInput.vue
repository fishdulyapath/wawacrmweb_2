<template>
  <span class="relative block">
    <input
      v-bind="inputAttrs"
      ref="inputEl"
      type="text"
      :class="[attrs.class, 'pr-9']"
      :value="displayValue"
      :placeholder="placeholder"
      inputmode="numeric"
      autocomplete="off"
      pattern="[0-9/\-]*"
      @input="onInput"
      @blur="onBlur"
      @keydown.enter.prevent="onEnter"
    />
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-40"
      :disabled="isDisabled"
      tabindex="-1"
      aria-label="เลือกวันที่"
      @click="openPicker"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"/>
      </svg>
    </button>
    <input
      ref="pickerEl"
      type="date"
      class="sr-only"
      tabindex="-1"
      :value="modelValue"
      :min="min || undefined"
      :max="max || undefined"
      :disabled="isDisabled"
      @change="onPickerChange"
    />
  </span>
</template>

<script setup>
import { computed, ref, useAttrs, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  placeholder: { type: String, default: 'dd/mm/yyyy' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const attrs = useAttrs()
const inputEl = ref(null)
const pickerEl = ref(null)
const displayValue = ref(formatDate(props.modelValue))
const inputAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
const isDisabled = computed(() => attrs.disabled === '' || attrs.disabled === true)

watch(() => props.modelValue, value => {
  displayValue.value = formatDate(value)
})

function formatDate(value) {
  if (!value) return ''
  const raw = String(value).trim()
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`

  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${d.getFullYear()}`
}

function parseDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const th = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (th) return toIso(Number(th[3]), Number(th[2]), Number(th[1]))

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  return null
}

function toIso(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (props.min && iso < props.min) return null
  if (props.max && iso > props.max) return null
  return iso
}

function commit({ notifyChange = false } = {}) {
  const next = parseDate(displayValue.value)
  if (next === null) {
    displayValue.value = formatDate(props.modelValue)
    return
  }
  emit('update:modelValue', next)
  displayValue.value = formatDate(next)
  if (notifyChange) emit('change', next)
}

function onInput(event) {
  displayValue.value = event.target.value
  if (!displayValue.value.trim()) {
    emit('update:modelValue', '')
    return
  }
  const next = parseDate(displayValue.value)
  if (next !== null) emit('update:modelValue', next)
}

function onBlur() {
  commit({ notifyChange: true })
}

function onEnter() {
  commit({ notifyChange: true })
  inputEl.value?.blur()
}

function openPicker() {
  pickerEl.value?.showPicker?.()
  if (!pickerEl.value?.showPicker) pickerEl.value?.click()
}

function onPickerChange(event) {
  const next = event.target.value
  emit('update:modelValue', next)
  emit('change', next)
  displayValue.value = formatDate(next)
}
</script>
