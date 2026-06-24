<template>
  <div class="max-w-5xl p-6">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">{{ isEdit ? 'แก้ไขเจ้าหนี้' : 'เพิ่มเจ้าหนี้' }}</h1>
        <p class="mt-0.5 text-sm text-slate-500">บันทึกข้อมูลเจ้าหนี้ไปที่ POS DB โดยตรง</p>
      </div>
      <button type="button" class="btn-secondary justify-center" @click="goBack">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        กลับไปหน้ารายการเจ้าหนี้
      </button>
    </div>

    <div v-if="loading" role="status" aria-live="polite" class="card flex items-center justify-center py-20 text-slate-400">
      <svg class="mr-2 h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      กำลังโหลดข้อมูล...
    </div>

    <div v-else-if="loadError" role="alert" aria-live="assertive" class="card px-4 py-16 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 class="font-bold text-slate-800">โหลดข้อมูลเจ้าหนี้ไม่สำเร็จ</h2>
      <p class="mt-2 text-sm text-slate-500">{{ loadError }}</p>
      <div class="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" class="btn-secondary justify-center" @click="goBack">กลับไปหน้ารายการเจ้าหนี้</button>
        <button type="button" class="btn-primary justify-center" @click="initPage">ลองใหม่</button>
      </div>
    </div>

    <form v-else class="space-y-4" @submit.prevent="saveSupplier">
      <div v-if="error" id="supplier-form-error" role="alert" aria-live="assertive" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ error }}
      </div>
      <div v-if="success" role="status" aria-live="polite" class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        {{ success }}
      </div>

      <section class="card overflow-hidden">
        <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 class="font-semibold text-slate-800">ข้อมูลหลัก</h2>
        </div>
        <div class="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label for="supplier-code" class="label-text">รหัสเจ้าหนี้ <span class="text-red-500">*</span></label>
            <input
              id="supplier-code"
              :value="form.code"
              class="input-field font-mono uppercase"
              placeholder="เช่น AP001"
              :disabled="isEdit"
              :aria-invalid="!!fieldErrors.code"
              :aria-describedby="fieldErrors.code ? 'supplier-code-error supplier-code-help' : 'supplier-code-help'"
              @input="normalizeCode"
            />
            <p id="supplier-code-help" class="mt-1 text-xs text-slate-400">ใช้ได้เฉพาะ A-Z, 0-9, - และ _</p>
            <p v-if="fieldErrors.code" id="supplier-code-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.code }}</p>
          </div>

          <div>
            <label for="supplier-name-1" class="label-text">ชื่อเจ้าหนี้ <span class="text-red-500">*</span></label>
            <input id="supplier-name-1" v-model.trim="form.name_1" class="input-field" placeholder="ชื่อเจ้าหนี้" :aria-invalid="!!fieldErrors.name_1" :aria-describedby="fieldErrors.name_1 ? 'supplier-name-1-error' : undefined" />
            <p v-if="fieldErrors.name_1" id="supplier-name-1-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.name_1 }}</p>
          </div>

          <div>
            <label for="supplier-name-2" class="label-text">ชื่อเจ้าหนี้ 2</label>
            <input id="supplier-name-2" v-model.trim="form.name_2" class="input-field" placeholder="ชื่อเพิ่มเติม" />
          </div>

          <div>
            <label for="supplier-name-en-1" class="label-text">ชื่อ EN</label>
            <input id="supplier-name-en-1" v-model.trim="form.name_eng_1" class="input-field" placeholder="English name" />
          </div>

          <div>
            <label for="supplier-telephone" class="label-text">โทรศัพท์</label>
            <input id="supplier-telephone" v-model.trim="form.telephone" class="input-field" placeholder="เบอร์โทรศัพท์" />
          </div>

          <div>
            <label for="supplier-email" class="label-text">อีเมล</label>
            <input id="supplier-email" v-model.trim="form.email" type="email" class="input-field" placeholder="email@example.com" :aria-invalid="!!fieldErrors.email" :aria-describedby="fieldErrors.email ? 'supplier-email-error' : undefined" />
            <p v-if="fieldErrors.email" id="supplier-email-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.email }}</p>
          </div>
        </div>
      </section>

      <section class="card overflow-hidden">
        <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 class="font-semibold text-slate-800">ที่อยู่</h2>
        </div>
        <div class="grid gap-4 p-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label for="supplier-address" class="label-text">ที่อยู่</label>
            <textarea id="supplier-address" v-model.trim="form.address" rows="3" class="input-field" placeholder="ที่อยู่"></textarea>
          </div>

          <div>
            <label for="supplier-tambon" class="label-text">ตำบล/แขวง</label>
            <input id="supplier-tambon" v-model.trim="form.tambon" class="input-field" />
          </div>
          <div>
            <label for="supplier-amper" class="label-text">อำเภอ/เขต</label>
            <input id="supplier-amper" v-model.trim="form.amper" class="input-field" />
          </div>
          <div>
            <label for="supplier-province" class="label-text">จังหวัด</label>
            <input id="supplier-province" v-model.trim="form.province" class="input-field" />
          </div>
          <div>
            <label for="supplier-zip-code" class="label-text">รหัสไปรษณีย์</label>
            <input id="supplier-zip-code" v-model.trim="form.zip_code" class="input-field" />
          </div>
        </div>
      </section>

      <section class="card overflow-hidden">
        <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 class="font-semibold text-slate-800">ภาษีและเครดิต</h2>
        </div>
        <div class="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label for="supplier-tax-id" class="label-text">เลขประจำตัวผู้เสียภาษี</label>
            <input id="supplier-tax-id" v-model.trim="form.tax_id" class="input-field" :aria-invalid="!!fieldErrors.tax_id" :aria-describedby="fieldErrors.tax_id ? 'supplier-tax-id-error' : undefined" />
            <p v-if="fieldErrors.tax_id" id="supplier-tax-id-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.tax_id }}</p>
          </div>
          <div>
            <label for="supplier-branch-code" class="label-text">รหัสสาขา</label>
            <input id="supplier-branch-code" v-model.trim="form.branch_code" class="input-field" placeholder="เช่น 00000" />
          </div>
          <div>
            <label for="supplier-branch-type" class="label-text">ประเภทสาขา</label>
            <select id="supplier-branch-type" v-model.number="form.branch_type" class="input-field">
              <option :value="0">ไม่ระบุ</option>
              <option :value="1">สำนักงานใหญ่</option>
              <option :value="2">สาขา</option>
            </select>
          </div>
          <div>
            <label for="supplier-credit-day" class="label-text">เครดิตวัน</label>
            <input id="supplier-credit-day" v-model.number="form.credit_day" type="number" min="0" step="1" class="input-field text-right" :aria-invalid="!!fieldErrors.credit_day" :aria-describedby="fieldErrors.credit_day ? 'supplier-credit-day-error' : undefined" />
            <p v-if="fieldErrors.credit_day" id="supplier-credit-day-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.credit_day }}</p>
          </div>
        </div>
      </section>

      <section class="card overflow-hidden">
        <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 class="font-semibold text-slate-800">ข้อมูลเพิ่มเติม</h2>
        </div>
        <div class="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label for="supplier-fax" class="label-text">แฟกซ์</label>
            <input id="supplier-fax" v-model.trim="form.fax" class="input-field" />
          </div>
          <div>
            <label for="supplier-website" class="label-text">เว็บไซต์</label>
            <input id="supplier-website" v-model.trim="form.website" class="input-field" />
          </div>
          <div class="md:col-span-2">
            <label for="supplier-remark" class="label-text">หมายเหตุ</label>
            <textarea id="supplier-remark" v-model.trim="form.remark" rows="3" class="input-field"></textarea>
          </div>
        </div>
      </section>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" class="btn-secondary justify-center" @click="goBack">ยกเลิก</button>
        <button class="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60" type="submit" :disabled="saving">
          <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ saving ? 'กำลังบันทึก...' : 'บันทึกไป POS DB' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import api from '../composables/useApi.js'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.code)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const loadError = ref('')
const success = ref('')
const initialSnapshot = ref('')
const fieldErrors = reactive({})

const form = reactive({
  code: '',
  name_1: '',
  name_2: '',
  name_eng_1: '',
  name_eng_2: '',
  address: '',
  tambon: '',
  amper: '',
  province: '',
  zip_code: '',
  telephone: '',
  fax: '',
  email: '',
  website: '',
  remark: '',
  tax_id: '',
  branch_code: '',
  branch_type: 0,
  credit_day: 0,
})

const isDirty = computed(() => initialSnapshot.value && initialSnapshot.value !== formSnapshot())

function normalizeCode(event) {
  form.code = String(event.target.value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
  fieldErrors.code = ''
}

function assignForm(data) {
  Object.assign(form, {
    code: data.code || '',
    name_1: data.name_1 || '',
    name_2: data.name_2 || '',
    name_eng_1: data.name_eng_1 || '',
    name_eng_2: data.name_eng_2 || '',
    address: data.address || '',
    tambon: data.tambon || '',
    amper: data.amper || '',
    province: data.province || '',
    zip_code: data.zip_code || '',
    telephone: data.telephone || '',
    fax: data.fax || '',
    email: data.email || '',
    website: data.website || '',
    remark: data.remark || '',
    tax_id: data.tax_id || '',
    branch_code: data.branch_code || '',
    branch_type: Number(data.branch_type || 0),
    credit_day: Number(data.credit_day || 0),
  })
}

function intValue(value) {
  if (value === '' || value === null || value === undefined) return 0
  const num = parseInt(value, 10)
  return Number.isFinite(num) ? num : NaN
}

function formSnapshot() {
  return JSON.stringify({
    ...form,
    branch_type: intValue(form.branch_type),
    credit_day: intValue(form.credit_day),
  })
}

function markClean() {
  initialSnapshot.value = formSnapshot()
}

function clearFieldErrors() {
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = ''
}

function validate() {
  clearFieldErrors()
  if (!form.code.trim()) fieldErrors.code = 'กรุณาระบุรหัสเจ้าหนี้'
  else if (!/^[A-Z0-9_-]+$/.test(form.code.trim())) fieldErrors.code = 'รูปแบบรหัสเจ้าหนี้ไม่ถูกต้อง'
  if (!form.name_1.trim()) fieldErrors.name_1 = 'กรุณาระบุชื่อเจ้าหนี้'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) fieldErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
  if (form.tax_id && !/^[0-9-]+$/.test(form.tax_id)) fieldErrors.tax_id = 'เลขประจำตัวผู้เสียภาษีใช้ได้เฉพาะตัวเลขและ -'
  const creditDay = intValue(form.credit_day)
  if (!Number.isFinite(creditDay) || creditDay < 0) fieldErrors.credit_day = 'เครดิตวันต้องเป็นตัวเลขไม่ติดลบ'
  else form.credit_day = creditDay
  form.branch_type = Math.max(0, intValue(form.branch_type) || 0)
  return Object.values(fieldErrors).filter(Boolean)
}

async function focusFirstInvalidField() {
  await nextTick()
  const first = [
    ['code', 'supplier-code'],
    ['name_1', 'supplier-name-1'],
    ['email', 'supplier-email'],
    ['tax_id', 'supplier-tax-id'],
    ['credit_day', 'supplier-credit-day'],
  ].find(([key]) => fieldErrors[key])
  if (first) document.getElementById(first[1])?.focus()
}

async function loadSupplier() {
  const { data } = await api.get(`/suppliers/${encodeURIComponent(route.params.code)}`)
  assignForm(data)
}

async function saveSupplier() {
  if (saving.value) return
  const errors = validate()
  error.value = errors.length ? 'กรุณาตรวจสอบข้อมูลที่จำเป็นก่อนบันทึก' : ''
  success.value = ''
  if (errors.length) {
    await focusFirstInvalidField()
    return
  }

  const ok = window.confirm('ยืนยันบันทึกข้อมูลเจ้าหนี้นี้ไปที่ POS DB โดยตรง?')
  if (!ok) return

  saving.value = true
  try {
    const payload = { ...form }
    if (isEdit.value) {
      await api.put(`/suppliers/${encodeURIComponent(form.code)}`, payload)
      success.value = 'บันทึกเจ้าหนี้เรียบร้อยแล้ว'
      markClean()
    } else {
      const { data } = await api.post('/suppliers', payload)
      success.value = 'เพิ่มเจ้าหนี้เรียบร้อยแล้ว'
      markClean()
      router.replace(`/suppliers/${encodeURIComponent(data.code || form.code)}/edit`)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/suppliers')
}

async function initPage() {
  loading.value = true
  error.value = ''
  loadError.value = ''
  try {
    if (isEdit.value) await loadSupplier()
    markClean()
  } catch (err) {
    loadError.value = err.message
  } finally {
    loading.value = false
  }
}

function onBeforeUnload(event) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave((_to, _from, next) => {
  if (!isDirty.value) return next()
  const ok = window.confirm('มีข้อมูลเจ้าหนี้ที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?')
  next(ok)
})

onMounted(() => {
  initPage()
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>
