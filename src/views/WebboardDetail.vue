<template>
  <div class="p-4  mx-auto pb-24">

    <!-- Back -->
    <button @click="router.push('/webboard')"
      class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
      กลับ
    </button>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-slate-400 text-sm">
      <svg class="animate-spin w-5 h-5 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      กำลังโหลด...
    </div>

    <template v-else-if="thread">

      <!-- Thread card -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">

        <!-- Badges -->
        <div class="flex items-center gap-2 flex-wrap mb-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
            :style="{ backgroundColor: thread.category_color }">
            {{ thread.category_icon }} {{ thread.category_name }}
          </span>
          <span v-if="thread.is_pinned"
            class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
            📌 ปักหมุด
          </span>
          <span v-if="thread.is_announcement"
            class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
            📢 ประกาศ
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-xl font-bold text-slate-800 leading-snug mb-2">{{ thread.title }}</h1>

        <!-- Meta -->
        <div class="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <span class="w-6 h-6 rounded-full bg-slate-200 inline-flex items-center justify-center text-[11px] font-bold text-slate-600 shrink-0">
            {{ thread.author_name?.charAt(0)?.toUpperCase() }}
          </span>
          <span class="font-medium text-slate-600">{{ thread.author_name }}</span>
          <span>·</span>
          <span>{{ timeAgo(thread.created_at) }}</span>
          <span>·</span>
          <span>👁 {{ thread.view_count }}</span>
        </div>

        <!-- Content -->
        <div class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-4">{{ thread.content }}</div>

        <!-- Thread attachments -->
        <div v-if="thread.attachments?.length" class="mb-4 space-y-3">
          <!-- รูปภาพ: แสดง grid ใหญ่ -->
          <!-- รูป 1 รูป: inline ชิดซ้าย ขนาดตามจริง ไม่เกิน 384px -->
          <template v-if="thread.attachments.filter(a => isImage(a.mime_type)).length === 1">
            <div v-for="att in thread.attachments.filter(a => isImage(a.mime_type))" :key="att.id"
              class="relative group inline-block rounded-xl overflow-hidden cursor-pointer"
              @click="previewImg = att">
              <img :src="thumbUrl(att)" class="block max-h-96 max-w-full w-auto"/>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <svg class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                </svg>
              </div>
              <a :href="fileUrl(att)" target="_blank" download @click.stop
                class="absolute bottom-1.5 right-1.5 p-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </a>
            </div>
          </template>
          <!-- รูป 2+ รูป: grid -->
          <div v-else-if="thread.attachments.some(a => isImage(a.mime_type))"
            class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div v-for="att in thread.attachments.filter(a => isImage(a.mime_type))" :key="att.id"
              class="relative group rounded-xl overflow-hidden cursor-pointer bg-slate-100"
              @click="previewImg = att">
              <img :src="thumbUrl(att)" class="w-full  object-cover"/>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <svg class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                </svg>
              </div>
              <a :href="fileUrl(att)" target="_blank" download @click.stop
                class="absolute bottom-1.5 right-1.5 p-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </a>
            </div>
          </div>
          <!-- ไฟล์อื่น: pill แบบเดิม -->
          <div v-if="thread.attachments.some(a => !isImage(a.mime_type))" class="flex flex-wrap gap-2">
            <div v-for="att in thread.attachments.filter(a => !isImage(a.mime_type))" :key="att.id"
              class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <div class="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">{{ fileIcon(att.mime_type) }}</div>
              <div class="min-w-0">
                <p class="text-xs text-slate-700 truncate max-w-[140px]">{{ att.original_name }}</p>
                <p class="text-[10px] text-slate-400">{{ formatSize(att.file_size) }}</p>
              </div>
              <a :href="fileUrl(att)" target="_blank" download class="p-1 text-slate-400 hover:text-blue-500 rounded">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              </a>
            </div>
          </div>
        </div>

        <!-- Action bar -->
        <div class="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100">
          <!-- Follow toggle -->
          <button @click="toggleFollow"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="isFollowing
              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
            {{ isFollowing ? '🔔 ติดตามแล้ว' : '🔕 ติดตาม' }}
          </button>

          <!-- Edit (owner or manager+) -->
          <RouterLink v-if="canModThread" :to="`/webboard/${thread.id}/edit`"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            ✏️ แก้ไข
          </RouterLink>

          <!-- Pin (manager+ only) -->
          <button v-if="isManager" @click="togglePin"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="thread.is_pinned
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
            📌 {{ thread.is_pinned ? 'เลิกปักหมุด' : 'ปักหมุด' }}
          </button>

          <!-- Delete (owner or manager+) -->
          <button v-if="canModThread" @click="deleteThread"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto">
            🗑 ลบ
          </button>
        </div>

      </div>

      <!-- Comments section -->
      <div class="bg-white rounded-xl border border-slate-200 p-5">

        <h2 class="font-semibold text-slate-700 mb-4">
          ความคิดเห็น
          <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">{{ comments.length }}</span>
        </h2>

        <!-- Comment list -->
        <div v-if="comments.length" class="space-y-4 mb-5">
          <div v-for="c in comments" :key="c.id" class="flex gap-3">
            <!-- Avatar -->
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-0.5">
              {{ c.author_name?.charAt(0)?.toUpperCase() }}
            </div>
            <!-- Bubble -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-medium text-slate-700">{{ c.author_name }}</span>
                <span class="text-xs text-slate-400">{{ timeAgo(c.created_at) }}</span>
                <span v-if="c.updated_at !== c.created_at" class="text-xs text-slate-300">(แก้ไขแล้ว)</span>
              </div>

              <!-- Normal view -->
              <template v-if="editingComment?.id !== c.id">
                <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ c.content }}</p>
                <!-- Comment attachments -->
                <div v-if="c.attachments?.length" class="mt-2 flex flex-wrap gap-2">
                  <div v-for="att in c.attachments" :key="att.id"
                    class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                    <img v-if="isImage(att.mime_type)" :src="thumbUrl(att)" @click="previewImg = att"
                      class="w-8 h-8 object-cover rounded cursor-pointer"/>
                    <div v-else class="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">{{ fileIcon(att.mime_type) }}</div>
                    <p class="text-xs text-slate-600 truncate max-w-[100px]">{{ att.original_name }}</p>
                    <a :href="fileUrl(att)" target="_blank" download class="p-0.5 text-slate-400 hover:text-blue-500">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    </a>
                  </div>
                </div>
                <div v-if="canModComment(c)" class="flex gap-2 mt-1">
                  <button @click="startEdit(c)"
                    class="text-xs text-slate-400 hover:text-slate-600 transition-colors">แก้ไข</button>
                  <button @click="deleteComment(c.id)"
                    class="text-xs text-red-400 hover:text-red-600 transition-colors">ลบ</button>
                </div>
              </template>

              <!-- Edit mode -->
              <template v-else>
                <textarea v-model="editingComment.content" rows="3"
                  class="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"></textarea>
                <div class="flex gap-2 mt-1.5">
                  <button @click="saveEdit"
                    class="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                    บันทึก
                  </button>
                  <button @click="editingComment = null"
                    class="px-3 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50 transition-colors">
                    ยกเลิก
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-6 text-slate-400 text-sm mb-4">
          ยังไม่มีความคิดเห็น — เป็นคนแรกที่แสดงความคิดเห็น!
        </div>

        <!-- New comment -->
        <div class="border-t border-slate-100 pt-4">
          <textarea v-model="commentText" rows="3" placeholder="แสดงความคิดเห็น..."
            class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none mb-2"
            @keydown.ctrl.enter.prevent="submitComment"/>
          <!-- Pending file previews -->
          <div v-if="commentFiles.length" class="mb-2 flex flex-wrap gap-2">
            <div v-for="(pf, i) in commentFiles" :key="i"
              class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <img v-if="pf.preview" :src="pf.preview" class="w-8 h-8 object-cover rounded"/>
              <div v-else class="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">📎</div>
              <p class="text-xs text-slate-700 truncate max-w-[100px]">{{ pf.name }}</p>
              <button @click="commentFiles.splice(i,1)" class="p-0.5 text-slate-400 hover:text-red-500">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between gap-2">
            <button @click="$refs.commentFileInput.click()"
              class="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
              แนบไฟล์
            </button>
            <button @click="submitComment" :disabled="(!commentText.trim() && !commentFiles.length) || submitting"
              class="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-2">
              <svg v-if="submitting" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              ส่ง
            </button>
          </div>
          <input ref="commentFileInput" type="file" multiple class="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            @change="onCommentFileChange"/>
        </div>

      </div>

    </template>

    <!-- Not found -->
    <div v-else class="text-center py-16 text-slate-400 text-sm">ไม่พบกระทู้</div>

    <!-- Delete confirm dialog -->
    <Teleport to="body">
      <div v-if="deleteDialog.show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-slate-800">{{ deleteDialog.title }}</h3>
              <p class="text-slate-500 text-sm mt-0.5">{{ deleteDialog.message }}</p>
            </div>
          </div>
          <div class="flex gap-3">
            <button @click="deleteDialog.show = false"
              class="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button @click="deleteDialog.onConfirm()" :disabled="deleteDialog.loading"
              class="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <svg v-if="deleteDialog.loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              ลบ
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Image preview modal -->
    <Teleport to="body">
      <div v-if="previewImg" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        @click.self="previewImg = null">
        <div class="relative max-w-4xl max-h-full">
          <img :src="fileUrl(previewImg)" class="max-w-full max-h-[90vh] object-contain rounded-lg"/>
          <button @click="previewImg = null"
            class="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600">✕</button>
          <a :href="fileUrl(previewImg)" target="_blank" download
            class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-700 text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-slate-100">⬇ ดาวน์โหลด</a>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import api from '../composables/useApi.js'
import { useAuthStore } from '../stores/auth.js'
import { usePermissions } from '../composables/usePermissions.js'

const props = defineProps({ id: { type: String, required: true } })

const router     = useRouter()
const auth       = useAuthStore()
const { isManager } = usePermissions()

const thread           = ref(null)
const comments         = ref([])
const isFollowing      = ref(false)
const loading          = ref(false)
const commentText      = ref('')
const submitting       = ref(false)
const editingComment   = ref(null)
const previewImg       = ref(null)
const commentFiles     = ref([])
const commentFileInput = ref(null)
const deleteDialog     = ref({ show: false, title: '', message: '', loading: false, onConfirm: () => {} })

const IMAGE_TYPES = ['image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif']

function isImage(mime) { return mime?.startsWith('image/') }
function thumbUrl(att) { return att.thumb_path ? `/uploads/${att.thumb_path}` : `/uploads/${att.file_path}` }
function fileUrl(att)  { return `/uploads/${att.file_path}` }
function fileIcon(mime) {
  if (mime?.includes('pdf'))  return '📄'
  if (mime?.includes('word') || mime?.includes('doc')) return '📝'
  if (mime?.includes('sheet') || mime?.includes('xls')) return '📊'
  if (mime?.includes('zip') || mime?.includes('rar')) return '🗜️'
  return '📎'
}
function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function onCommentFileChange(e) {
  Array.from(e.target.files).forEach(file => {
    const isImg = IMAGE_TYPES.includes(file.type)
    const entry = { file, name: file.name, preview: null }
    if (isImg) {
      const reader = new FileReader()
      reader.onload = ev => { entry.preview = ev.target.result }
      reader.readAsDataURL(file)
    }
    commentFiles.value.push(entry)
  })
  if (commentFileInput.value) commentFileInput.value.value = ''
}

const canModThread = computed(() =>
  thread.value && (
    thread.value.created_by === auth.user?.id || auth.user?.code?.toUpperCase() === 'SUPERADMIN'
  )
)

function canModComment(c) {
  return c.created_by === auth.user?.id || auth.user?.code?.toUpperCase() === 'SUPERADMIN'
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/webboard/threads/${props.id}`)
    thread.value      = data.thread
    comments.value    = data.comments
    isFollowing.value = data.is_following
  } catch {
    thread.value = null
  } finally {
    loading.value = false
  }
}

async function toggleFollow() {
  const { data } = await api.post(`/webboard/threads/${props.id}/follow`)
  isFollowing.value = data.following
}

async function togglePin() {
  const { data } = await api.patch(`/webboard/threads/${props.id}/pin`)
  thread.value.is_pinned = data.is_pinned
}

function deleteThread() {
  deleteDialog.value = {
    show: true,
    title: 'ลบกระทู้',
    message: `ต้องการลบกระทู้ "${thread.value?.title}" ใช่ไหม?`,
    loading: false,
    onConfirm: async () => {
      deleteDialog.value.loading = true
      try {
        await api.delete(`/webboard/threads/${props.id}`)
        deleteDialog.value.show = false
        router.push('/webboard')
      } catch (e) {
        deleteDialog.value.loading = false
        alert(e.response?.data?.error || 'ลบไม่สำเร็จ')
      }
    }
  }
}

async function submitComment() {
  if ((!commentText.value.trim() && !commentFiles.value.length) || submitting.value) return
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('content', commentText.value)
    commentFiles.value.forEach(pf => fd.append('files', pf.file))
    const { data } = await api.post(`/webboard/threads/${props.id}/comments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    comments.value.push(data)
    commentText.value = ''
    commentFiles.value = []
  } finally {
    submitting.value = false
  }
}

function startEdit(c) {
  editingComment.value = { id: c.id, content: c.content }
}

async function saveEdit() {
  if (!editingComment.value?.content?.trim()) return
  const { data } = await api.patch(`/webboard/comments/${editingComment.value.id}`, {
    content: editingComment.value.content
  })
  const idx = comments.value.findIndex(c => c.id === data.id)
  if (idx !== -1) {
    comments.value[idx] = { ...comments.value[idx], ...data }
  }
  editingComment.value = null
}

function deleteComment(id) {
  deleteDialog.value = {
    show: true,
    title: 'ลบความคิดเห็น',
    message: 'ต้องการลบความคิดเห็นนี้ใช่ไหม?',
    loading: false,
    onConfirm: async () => {
      deleteDialog.value.loading = true
      try {
        await api.delete(`/webboard/comments/${id}`)
        comments.value = comments.value.filter(c => c.id !== id)
        deleteDialog.value.show = false
      } catch (e) {
        deleteDialog.value.loading = false
        alert(e.response?.data?.error || 'ลบไม่สำเร็จ')
      }
    }
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)   return 'เมื่อกี้'
  if (mins < 60)  return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs} ชั่วโมงที่แล้ว`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days} วันที่แล้ว`
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

onMounted(load)
</script>
