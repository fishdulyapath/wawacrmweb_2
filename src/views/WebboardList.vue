<template>
  <div class="p-4 max-w-3xl mx-auto pb-24">

    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-slate-800">เว็บบอร์ด</h1>
      <RouterLink to="/webboard/new"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        สร้างกระทู้
      </RouterLink>
    </div>

    <!-- Search -->
    <div class="relative mb-3">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
      </svg>
      <input v-model="searchInput" type="text" placeholder="ค้นหากระทู้..."
        class="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
    </div>

    <!-- Category chips -->
    <div class="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
      <button @click="selectCat(null)"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        :class="activeCatId === null ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
        ทั้งหมด
      </button>
      <button v-for="cat in categories" :key="cat.id"
        @click="selectCat(cat.id)"
        class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        :class="activeCatId === cat.id
          ? 'text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        :style="activeCatId === cat.id ? { backgroundColor: cat.color } : {}">
        {{ cat.icon }} {{ cat.name }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-slate-400 text-sm">
      <svg class="animate-spin w-5 h-5 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      กำลังโหลด...
    </div>

    <!-- Empty -->
    <div v-else-if="!threads.length" class="text-center py-16 text-slate-400 text-sm">
      <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      ยังไม่มีกระทู้
    </div>

    <!-- Thread list -->
    <div v-else class="space-y-3">
      <RouterLink v-for="t in threads" :key="t.id" :to="`/webboard/${t.id}`"
        class="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all hover:border-slate-300">

        <!-- Badges row -->
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
            :style="{ backgroundColor: t.category_color }">
            {{ t.category_icon }} {{ t.category_name }}
          </span>
          <span v-if="t.is_pinned"
            class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
            📌 ปักหมุด
          </span>
          <span v-if="t.is_announcement"
            class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
            📢 ประกาศ
          </span>
        </div>

        <!-- Title -->
        <p class="font-semibold text-slate-800 leading-snug mb-1">{{ t.title }}</p>

        <!-- Content preview -->
        <p class="text-sm text-slate-500 line-clamp-2 mb-3">{{ t.content }}</p>

        <!-- Meta -->
        <div class="flex items-center gap-3 text-xs text-slate-400">
          <span class="flex items-center gap-1">
            <span class="w-5 h-5 rounded-full bg-slate-200 inline-flex items-center justify-center text-[10px] font-bold text-slate-600">
              {{ t.author_name?.charAt(0)?.toUpperCase() }}
            </span>
            {{ t.author_name }}
          </span>
          <span>·</span>
          <span>{{ timeAgo(t.created_at) }}</span>
          <span>·</span>
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            {{ t.comment_count }}
          </span>
          <span>·</span>
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            {{ t.view_count }}
          </span>
        </div>
      </RouterLink>
    </div>

    <!-- Load more -->
    <div v-if="hasMore" class="mt-4 text-center">
      <button @click="loadMore" :disabled="loadingMore"
        class="px-6 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
        {{ loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม' }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../composables/useApi.js'

const categories   = ref([])
const threads      = ref([])
const activeCatId  = ref(null)
const searchInput  = ref('')
const page         = ref(1)
const totalPages   = ref(1)
const loading      = ref(false)
const loadingMore  = ref(false)
const LIMIT        = 20

const hasMore = computed(() => page.value < totalPages.value)

async function loadCategories() {
  try {
    const { data } = await api.get('/webboard/categories')
    categories.value = data
  } catch {}
}

async function load() {
  loading.value = true
  page.value    = 1
  try {
    const params = {
      page: 1, limit: LIMIT,
      category_id: activeCatId.value || undefined,
      search: searchInput.value.trim() || undefined
    }
    const { data } = await api.get('/webboard/threads', { params })
    threads.value    = data.data
    totalPages.value = data.pagination.pages
  } catch {
    threads.value = []
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    page.value++
    const params = {
      page: page.value, limit: LIMIT,
      category_id: activeCatId.value || undefined,
      search: searchInput.value.trim() || undefined
    }
    const { data } = await api.get('/webboard/threads', { params })
    threads.value.push(...data.data)
    totalPages.value = data.pagination.pages
  } catch {
    page.value--
  } finally {
    loadingMore.value = false
  }
}

function selectCat(id) {
  activeCatId.value = id
  load()
}

let searchTimer = null
watch(searchInput, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(), 400)
})

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

onMounted(async () => {
  await loadCategories()
  await load()
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
