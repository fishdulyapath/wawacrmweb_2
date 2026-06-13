<template>
  <div class="product-image" :class="imageClass">
    <img v-if="src" :src="src" :alt="alt" class="h-full w-full object-cover" @error="clearImage" />
    <div v-else class="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
      <svg class="h-1/2 w-1/2 max-h-8 max-w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4-4 4 4 4-5 4 5M4 6h16v12H4z" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import api from '../composables/useApi.js'

const props = defineProps({
  itemCode: { type: String, default: '' },
  guidCode: { type: String, default: '' },
  alt: { type: String, default: '' },
  imageClass: { type: String, default: 'h-12 w-12 rounded-lg overflow-hidden border border-slate-200' },
})

const src = ref('')
let objectUrl = ''
let loadSeq = 0

function revokeObjectUrl() {
  if (!objectUrl) return
  URL.revokeObjectURL(objectUrl)
  objectUrl = ''
}

function clearImage() {
  revokeObjectUrl()
  src.value = ''
}

async function loadImage() {
  const guid = props.guidCode?.trim()
  const item = props.itemCode?.trim()
  const currentSeq = ++loadSeq
  clearImage()
  if (!guid && !item) return

  try {
    const url = guid ? `/products/images/${encodeURIComponent(guid)}` : '/products/images/primary'
    const config = {
      responseType: 'blob',
      params: guid ? undefined : { item_code: item },
    }
    const { data } = await api.get(url, config)
    if (currentSeq !== loadSeq || !data?.size) return
    objectUrl = URL.createObjectURL(data)
    src.value = objectUrl
  } catch {
    if (currentSeq === loadSeq) clearImage()
  }
}

watch(() => [props.itemCode, props.guidCode], loadImage, { immediate: true })

onBeforeUnmount(() => {
  loadSeq += 1
  revokeObjectUrl()
})
</script>
