<template>
  <div class="p-4 max-w-2xl mx-auto pb-24">

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
            class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none mb-2"></textarea>
          <div class="flex justify-end">
            <button @click="submitComment" :disabled="!commentText.trim() || submitting"
              class="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-2">
              <svg v-if="submitting" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              ส่ง
            </button>
          </div>
        </div>

      </div>

    </template>

    <!-- Not found -->
    <div v-else class="text-center py-16 text-slate-400 text-sm">ไม่พบกระทู้</div>

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

const thread         = ref(null)
const comments       = ref([])
const isFollowing    = ref(false)
const loading        = ref(false)
const commentText    = ref('')
const submitting     = ref(false)
const editingComment = ref(null)  // { id, content }

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

async function deleteThread() {
  if (!confirm('ต้องการลบกระทู้นี้?')) return
  await api.delete(`/webboard/threads/${props.id}`)
  router.push('/webboard')
}

async function submitComment() {
  if (!commentText.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const { data } = await api.post(`/webboard/threads/${props.id}/comments`, {
      content: commentText.value
    })
    comments.value.push(data)
    commentText.value = ''
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

async function deleteComment(id) {
  if (!confirm('ต้องการลบความคิดเห็นนี้?')) return
  await api.delete(`/webboard/comments/${id}`)
  comments.value = comments.value.filter(c => c.id !== id)
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
