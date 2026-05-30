<template>
  <div class="bg-white rounded-xl border border-slate-200">
    <!-- Header -->
    <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
      <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <h3 class="text-sm font-semibold text-slate-700">ความคิดเห็น</h3>
      <span v-if="comments.length" class="text-xs text-slate-400">({{ comments.length }})</span>
    </div>

    <!-- Comment list -->
    <div class="divide-y divide-slate-50">
      <div v-if="loading" class="py-8 text-center text-slate-400 text-sm">กำลังโหลด...</div>
      <div v-else-if="!comments.length" class="py-8 text-center text-slate-400 text-sm">ยังไม่มีความคิดเห็น</div>

      <div v-for="c in comments" :key="c.id" class="px-5 py-4">
        <div class="flex items-start gap-3">
          <!-- Avatar -->
          <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {{ (c.user_name || c.user_code || '?').charAt(0).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <!-- Meta row -->
            <div class="flex items-center justify-between gap-2 mb-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-slate-700">{{ c.user_name || c.user_code }}</span>
                <span class="text-xs text-slate-400">{{ formatDatetime(c.created_at) }}</span>
              </div>
              <!-- Delete button: เฉพาะ owner หรือ admin/manager -->
              <button v-if="canDelete(c)" @click="deleteComment(c.id)"
                class="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title="ลบความคิดเห็น">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>

            <!-- Comment text -->
            <p class="text-sm text-slate-700 whitespace-pre-wrap break-words">{{ c.comment_text }}</p>

            <!-- Attachments -->
            <div v-if="c.attachments?.length" class="mt-2 flex flex-wrap gap-2">
              <div v-for="att in c.attachments" :key="att.id"
                class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                <!-- Image thumbnail -->
                <template v-if="isImage(att.mime_type)">
                  <img :src="thumbUrl(att)" @click="previewImg = att"
                    class="w-10 h-10 object-cover rounded cursor-pointer" />
                </template>
                <!-- Document icon -->
                <template v-else>
                  <div class="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                    {{ fileIcon(att.mime_type) }}
                  </div>
                </template>
                <div class="min-w-0">
                  <p class="text-xs text-slate-700 truncate max-w-[120px]">{{ att.original_name }}</p>
                  <p class="text-[10px] text-slate-400">{{ formatSize(att.file_size) }}</p>
                </div>
                <a :href="fileUrl(att)" target="_blank" download
                  class="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors" title="ดาวน์โหลด">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input box -->
    <div v-if="canComment" class="px-5 py-4 border-t border-slate-100">
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
          {{ (authUser?.name || authUser?.code || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1">
          <textarea v-model="newText" rows="2"
            placeholder="พิมพ์ความคิดเห็น..."
            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keydown.ctrl.enter.prevent="submitComment"
          />

          <!-- Pending file previews -->
          <div v-if="pendingFiles.length" class="mt-2 flex flex-wrap gap-2">
            <div v-for="(pf, i) in pendingFiles" :key="i"
              class="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <template v-if="pf.isImage">
                <img :src="pf.preview" class="w-10 h-10 object-cover rounded" />
              </template>
              <template v-else>
                <div class="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-lg">{{ fileIcon(pf.type) }}</div>
              </template>
              <div class="min-w-0">
                <p class="text-xs text-slate-700 truncate max-w-[100px]">{{ pf.name }}</p>
                <p class="text-[10px] text-slate-400">{{ formatSize(pf.size) }}</p>
              </div>
              <button @click="removePending(i)" class="p-0.5 text-slate-400 hover:text-red-500">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- Action row -->
          <div class="mt-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button @click="$refs.fileInput.click()"
                class="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                แนบไฟล์
              </button>
              <span class="text-[10px] text-slate-400">Ctrl+Enter เพื่อส่ง</span>
            </div>
            <button @click="submitComment" :disabled="sending || (!newText.trim() && !pendingFiles.length)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <div v-if="sending" class="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
              <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
              ส่ง
            </button>
          </div>
        </div>
      </div>
      <input ref="fileInput" type="file" multiple class="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        @change="onFileChange" />
    </div>

    <!-- Image preview modal -->
    <Teleport to="body">
      <div v-if="previewImg" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        @click.self="previewImg = null">
        <div class="relative max-w-4xl max-h-full">
          <img :src="fileUrl(previewImg)" class="max-w-full max-h-[90vh] object-contain rounded-lg" />
          <button @click="previewImg = null"
            class="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:text-slate-900">✕</button>
          <a :href="fileUrl(previewImg)" target="_blank" download
            class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-700 text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-slate-100 transition-colors">⬇ ดาวน์โหลด</a>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import api from '../composables/useApi.js'
import { useAuthStore } from '../stores/auth.js'

const props = defineProps({
  activityId: { type: [Number, String], required: true },
  canComment:  { type: Boolean, default: true }
})

const auth     = useAuthStore()
const authUser = computed(() => auth.user)

const comments    = ref([])
const loading     = ref(false)
const newText     = ref('')
const pendingFiles = ref([])   // { file, name, size, type, isImage, preview }
const sending     = ref(false)
const previewImg  = ref(null)
const fileInput   = ref(null)

// ── File helpers ────────────────────────────────────────
function thumbUrl(att) { return att.thumb_path ? `/uploads/${att.thumb_path}` : fileUrl(att) }
function fileUrl(att)  { return `/uploads/${att.file_path}` }
function isImage(mime) { return mime?.startsWith('image/') }
function fileIcon(mime) {
  if (mime?.includes('pdf'))  return '📄'
  if (mime?.includes('word') || mime?.includes('doc')) return '📝'
  if (mime?.includes('sheet') || mime?.includes('xls')) return '📊'
  if (mime?.includes('zip') || mime?.includes('rar')) return '🗜️'
  return '📎'
}
function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function formatDatetime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

// ── Permissions ──────────────────────────────────────────
function canDelete(comment) {
  if (!authUser.value) return false
  return comment.user_id === authUser.value.id ||
    ['admin', 'manager'].includes(authUser.value.role)
}

// ── Load ─────────────────────────────────────────────────
async function loadComments() {
  if (!props.activityId) return
  loading.value = true
  try {
    const { data } = await api.get(`/activities/${props.activityId}/comments`)
    comments.value = data
  } catch (err) {
    console.error('[ActivityComments] load:', err)
  } finally {
    loading.value = false
  }
}

// ── Submit ───────────────────────────────────────────────
async function submitComment() {
  if (sending.value) return
  const text = newText.value.trim()
  if (!text && !pendingFiles.value.length) return

  sending.value = true
  try {
    const fd = new FormData()
    fd.append('comment_text', text)
    pendingFiles.value.forEach(pf => fd.append('files', pf.file))

    const { data } = await api.post(`/activities/${props.activityId}/comments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    comments.value.push(data)
    newText.value = ''
    pendingFiles.value = []
    if (fileInput.value) fileInput.value.value = ''
  } catch (err) {
    alert(err.response?.data?.error || 'ส่งความคิดเห็นไม่สำเร็จ')
  } finally {
    sending.value = false
  }
}

// ── Delete ───────────────────────────────────────────────
async function deleteComment(id) {
  if (!confirm('ลบความคิดเห็นนี้?')) return
  try {
    await api.delete(`/activities/${props.activityId}/comments/${id}`)
    comments.value = comments.value.filter(c => c.id !== id)
  } catch (err) {
    alert(err.response?.data?.error || 'ลบไม่สำเร็จ')
  }
}

// ── File picking ─────────────────────────────────────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']

function onFileChange(e) {
  addFiles(e.target.files)
  if (fileInput.value) fileInput.value.value = ''
}

function addFiles(fileList) {
  Array.from(fileList).forEach(file => {
    const isImg = IMAGE_TYPES.includes(file.type)
    const entry = { file, name: file.name, size: file.size, type: file.type, isImage: isImg, preview: null }
    if (isImg) {
      const reader = new FileReader()
      reader.onload = e => { entry.preview = e.target.result }
      reader.readAsDataURL(file)
    }
    pendingFiles.value.push(entry)
  })
}

function removePending(index) {
  pendingFiles.value.splice(index, 1)
}

onMounted(loadComments)
watch(() => props.activityId, id => { if (id) loadComments() })
</script>
