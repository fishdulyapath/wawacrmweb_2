<template>
  <div class="p-4  mx-auto pb-24">

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

      <!-- File attachments -->
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1.5">ไฟล์แนบ <span class="text-xs text-slate-400">(ไม่บังคับ)</span></label>
        <div
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          :class="dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'"
          class="border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer"
          @click="$refs.fileInput.click()">
          <div class="text-2xl mb-1">📎</div>
          <p class="text-sm text-slate-500">คลิกหรือลากไฟล์มาวาง</p>
          <p class="text-xs text-slate-400 mt-0.5">รูปภาพ, PDF, Word, Excel (สูงสุด 20MB/ไฟล์)</p>
        </div>
        <input ref="fileInput" type="file" multiple class="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          @change="onFileChange"/>
        <!-- ไฟล์แนบเดิม (กรณีแก้ไข) -->
        <div v-if="existingAtts.length" class="mt-2 flex flex-wrap gap-2">
          <div v-for="att in existingAtts" :key="att.id"
            class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
            <img v-if="att.mime_type?.startsWith('image/')" :src="`/uploads/${att.thumb_path || att.file_path}`" class="w-10 h-10 object-cover rounded"/>
            <div v-else class="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-lg">📎</div>
            <div class="min-w-0">
              <p class="text-xs text-slate-700 truncate max-w-[120px]">{{ att.original_name }}</p>
              <p class="text-[10px] text-slate-400">{{ formatSize(att.file_size) }}</p>
            </div>
            <button @click.stop="removeExisting(att.id)" class="p-0.5 text-slate-400 hover:text-red-500" title="ลบไฟล์นี้">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <!-- Pending previews -->
        <div v-if="pendingFiles.length" class="mt-2 flex flex-wrap gap-2">
          <div v-for="(pf, i) in pendingFiles" :key="i"
            class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
            <img v-if="pf.preview" :src="pf.preview" class="w-10 h-10 object-cover rounded"/>
            <div v-else class="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-lg">📎</div>
            <div class="min-w-0">
              <p class="text-xs text-slate-700 truncate max-w-[120px]">{{ pf.name }}</p>
              <p class="text-[10px] text-slate-400">{{ formatSize(pf.size) }}</p>
            </div>
            <button @click.stop="pendingFiles.splice(i,1)" class="p-0.5 text-slate-400 hover:text-red-500">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
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

const categories   = ref([])
const saving       = ref(false)
const errorMsg     = ref('')
const dragging     = ref(false)
const pendingFiles = ref([])
const existingAtts = ref([])   // attachments เดิมของ thread (กรณี edit)
const fileInput    = ref(null)
const form         = reactive({
  category_id:     '',
  title:           '',
  content:         '',
  is_announcement: false
})

const IMAGE_TYPES = ['image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif']

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function addFiles(fileList) {
  Array.from(fileList).forEach(file => {
    const isImg = IMAGE_TYPES.includes(file.type)
    const entry = { file, name: file.name, size: file.size, preview: null }
    if (isImg) {
      const reader = new FileReader()
      reader.onload = e => { entry.preview = e.target.result }
      reader.readAsDataURL(file)
    }
    pendingFiles.value.push(entry)
  })
}
function onFileChange(e) { addFiles(e.target.files); if (fileInput.value) fileInput.value.value = '' }
function onDrop(e) { dragging.value = false; addFiles(e.dataTransfer.files) }

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
    existingAtts.value   = data.thread.attachments || []
  } catch {
    errorMsg.value = 'ไม่สามารถโหลดข้อมูลกระทู้ได้'
  }
}

async function removeExisting(attId) {
  try {
    await api.delete(`/webboard/threads/${props.id}/attachments/${attId}`)
    existingAtts.value = existingAtts.value.filter(a => a.id !== attId)
  } catch (e) {
    alert(e.response?.data?.error || 'ลบไม่สำเร็จ')
  }
}

async function submit() {
  errorMsg.value = ''
  if (!form.category_id) { errorMsg.value = 'กรุณาเลือกหมวดหมู่'; return }
  if (!form.title.trim()) { errorMsg.value = 'กรุณากรอกหัวข้อ'; return }
  if (!form.content.trim()) { errorMsg.value = 'กรุณากรอกเนื้อหา'; return }

  saving.value = true
  try {
    const fd = new FormData()
    fd.append('category_id', form.category_id)
    fd.append('title', form.title)
    fd.append('content', form.content)
    fd.append('is_announcement', form.is_announcement)
    pendingFiles.value.forEach(pf => fd.append('files', pf.file))
    const headers = { 'Content-Type': 'multipart/form-data' }

    if (isEdit.value) {
      await api.patch(`/webboard/threads/${props.id}`, fd, { headers })
      router.push(`/webboard/${props.id}`)
    } else {
      const { data } = await api.post('/webboard/threads', fd, { headers })
      router.push(`/webboard/${data.id}`)
    }
  } catch (e) {
    errorMsg.value = e.response?.data?.error || e.message || 'เกิดข้อผิดพลาด'
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
