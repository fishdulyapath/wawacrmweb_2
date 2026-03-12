<template>
  <div>
    <!-- รายการไฟล์ที่มีอยู่แล้ว -->
    <div v-if="attachments.length > 0" class="mb-3 flex flex-wrap gap-2">
      <div v-for="att in attachments" :key="att.id"
        class="relative group flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm">

        <!-- รูปภาพ: thumbnail -->
        <template v-if="isImage(att.mime_type)">
          <img :src="thumbUrl(att)" @click="openPreview(att)"
            class="w-10 h-10 object-cover rounded cursor-pointer" />
        </template>
        <!-- ไฟล์อื่น: icon -->
        <template v-else>
          <div class="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
            {{ fileIcon(att.mime_type) }}
          </div>
        </template>

        <div class="min-w-0">
          <p class="text-xs text-slate-700 truncate max-w-[120px]">{{ att.original_name }}</p>
          <p class="text-[10px] text-slate-400">{{ formatSize(att.file_size) }}</p>
        </div>

        <!-- ปุ่มดาวน์โหลด + ลบ -->
        <div class="flex items-center gap-1 ml-1">
          <a :href="fileUrl(att)" target="_blank" download
            class="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors" title="ดาวน์โหลด">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </a>
          <button v-if="!readonly" @click="confirmDelete(att)"
            class="p-1 text-slate-400 hover:text-red-500 rounded transition-colors" title="ลบ">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Upload zone -->
    <div v-if="!readonly"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
      :class="dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'"
      class="border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer"
      @click="$refs.fileInput.click()">

      <div v-if="uploading" class="flex items-center justify-center gap-2 text-sm text-blue-600">
        <div class="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        กำลังอัปโหลด {{ uploadProgress }}%...
      </div>
      <div v-else>
        <div class="text-2xl mb-1">📎</div>
        <p class="text-sm text-slate-500">คลิกหรือลากไฟล์มาวางที่นี่</p>
        <p class="text-xs text-slate-400 mt-0.5">รูปภาพ, PDF, Word, Excel (สูงสุด 20MB/ไฟล์, ครั้งละไม่เกิน 10 ไฟล์)</p>
        <p class="text-xs text-blue-500 mt-1">รูปภาพจะถูกลดขนาดอัตโนมัติ</p>
      </div>
    </div>

    <input ref="fileInput" type="file" multiple class="hidden"
      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
      @change="onFileChange" />

    <!-- Image preview modal -->
    <Teleport to="body">
      <div v-if="preview" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        @click.self="preview = null">
        <div class="relative max-w-4xl max-h-full">
          <img :src="fileUrl(preview)" class="max-w-full max-h-[90vh] object-contain rounded-lg" />
          <button @click="preview = null"
            class="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:text-slate-900">
            ✕
          </button>
          <a :href="fileUrl(preview)" target="_blank" download
            class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-700 text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-slate-100 transition-colors">
            ⬇ ดาวน์โหลด
          </a>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../composables/useApi.js'

const props = defineProps({
  activityId: { type: [Number, String], required: true },
  readonly:   { type: Boolean, default: false }
})

const attachments    = ref([])
const uploading      = ref(false)
const uploadProgress = ref(0)
const dragging       = ref(false)
const preview        = ref(null)
const fileInput      = ref(null)

function thumbUrl(att) {
  return att.thumb_path ? `/uploads/${att.thumb_path}` : fileUrl(att)
}
function fileUrl(att) {
  return `/uploads/${att.file_path}`
}
function isImage(mime) {
  return mime?.startsWith('image/')
}
function fileIcon(mime) {
  if (mime?.includes('pdf'))  return '📄'
  if (mime?.includes('word') || mime?.includes('doc')) return '📝'
  if (mime?.includes('sheet') || mime?.includes('xls')) return '📊'
  if (mime?.includes('presentation') || mime?.includes('ppt')) return '📑'
  if (mime?.includes('zip') || mime?.includes('rar')) return '🗜️'
  return '📎'
}
function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function load() {
  if (!props.activityId) return
  try {
    const { data } = await api.get(`/activities/${props.activityId}/attachments`)
    attachments.value = data
  } catch (err) {
    console.error('[ActivityAttachments] load error:', err)
  }
}

async function uploadFiles(files) {
  if (!files.length || uploading.value) return

  uploading.value = true
  uploadProgress.value = 0

  const fd = new FormData()
  Array.from(files).forEach(f => fd.append('files', f))

  try {
    const { data } = await api.post(`/activities/${props.activityId}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
    })
    attachments.value.unshift(...data)
  } catch (err) {
    alert(err.response?.data?.error || 'อัปโหลดไม่สำเร็จ')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    if (fileInput.value) fileInput.value.value = ''
  }
}

function onFileChange(e) {
  uploadFiles(e.target.files)
}
function onDrop(e) {
  dragging.value = false
  uploadFiles(e.dataTransfer.files)
}

async function confirmDelete(att) {
  if (!confirm(`ลบไฟล์ "${att.original_name}" ?`)) return
  try {
    await api.delete(`/activities/${props.activityId}/attachments/${att.id}`)
    attachments.value = attachments.value.filter(a => a.id !== att.id)
  } catch (err) {
    alert(err.response?.data?.error || 'ลบไม่สำเร็จ')
  }
}

function openPreview(att) {
  preview.value = att
}

onMounted(load)
watch(() => props.activityId, (id) => { if (id) load() })
</script>
