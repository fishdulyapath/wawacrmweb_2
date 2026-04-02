<template>
  <div class="p-4 max-w-2xl mx-auto pb-24">

    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="goBack" class="p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <svg class="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="text-xl font-bold text-slate-800">{{ isEdit ? 'แก้ไขกระทู้' : 'สร้างกระทู้ใหม่' }}</h1>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-4">

      <!-- Category -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">หมวดหมู่ <span class="text-red-500">*</span></label>
        <select v-model="form.category_id"
          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">-- เลือกหมวดหมู่ --</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.icon }} {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">หัวข้อ <span class="text-red-500">*</span></label>
        <input v-model="form.title" type="text" maxlength="300"
          placeholder="ระบุหัวข้อกระทู้..."
          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <p class="text-xs text-slate-400 mt-1 text-right">{{ form.title.length }}/300</p>
      </div>

      <!-- Content -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">เนื้อหา <span class="text-red-500">*</span></label>
        <textarea v-model="form.content" rows="6"
          placeholder="เขียนเนื้อหากระทู้..."
          class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"></textarea>
      </div>

      <!-- Announcement checkbox (manager+ only) -->
      <div v-if="isManager" class="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
        <input id="announcement" v-model="form.is_announcement" type="checkbox"
          class="w-4 h-4 accent-red-500 cursor-pointer" />
        <label for="announcement" class="text-sm text-red-700 font-medium cursor-pointer">
          📢 ทำเครื่องหมายเป็นประกาศ (แสดงเด่นด้านบน)
        </label>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{{ errorMsg }}</div>

      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <button @click="goBack"
          class="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
          ยกเลิก
        </button>
        <button @click="submit" :disabled="saving"
          class="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <svg v-if="saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {{ saving ? 'กำลังบันทึก...' : (isEdit ? 'บันทึกการแก้ไข' : 'สร้างกระทู้') }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../composables/useApi.js'
import { usePermissions } from '../composables/usePermissions.js'

const props = defineProps({ id: { type: String, default: null } })

const router    = useRouter()
const { isManager } = usePermissions()
const isEdit    = computed(() => !!props.id)

const categories = ref([])
const saving     = ref(false)
const errorMsg   = ref('')
const form       = reactive({
  category_id:     '',
  title:           '',
  content:         '',
  is_announcement: false
})

async function loadCategories() {
  try {
    const { data } = await api.get('/webboard/categories')
    categories.value = data
  } catch {}
}

async function loadThread() {
  try {
    const { data } = await api.get(`/webboard/threads/${props.id}`)
    form.category_id     = data.thread.category_id
    form.title           = data.thread.title
    form.content         = data.thread.content
    form.is_announcement = data.thread.is_announcement
  } catch {
    errorMsg.value = 'ไม่สามารถโหลดข้อมูลกระทู้ได้'
  }
}

async function submit() {
  errorMsg.value = ''
  if (!form.category_id) { errorMsg.value = 'กรุณาเลือกหมวดหมู่'; return }
  if (!form.title.trim()) { errorMsg.value = 'กรุณากรอกหัวข้อ'; return }
  if (!form.content.trim()) { errorMsg.value = 'กรุณากรอกเนื้อหา'; return }

  saving.value = true
  try {
    if (isEdit.value) {
      await api.patch(`/webboard/threads/${props.id}`, form)
      router.push(`/webboard/${props.id}`)
    } else {
      const { data } = await api.post('/webboard/threads', form)
      router.push(`/webboard/${data.id}`)
    }
  } catch (e) {
    errorMsg.value = e.message || 'เกิดข้อผิดพลาด'
  } finally {
    saving.value = false
  }
}

function goBack() {
  if (isEdit.value) router.push(`/webboard/${props.id}`)
  else router.push('/webboard')
}

onMounted(async () => {
  await loadCategories()
  if (isEdit.value) await loadThread()
})
</script>
