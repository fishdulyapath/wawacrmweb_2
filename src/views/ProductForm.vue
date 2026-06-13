<template>
  <div class="p-6 max-w-5xl">
    <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">{{ isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า' }}</h1>
        <p class="text-slate-500 text-sm mt-0.5">บันทึกข้อมูลสินค้าไปที่ POS DB โดยตรง</p>
      </div>
      <button type="button" class="btn-secondary justify-center" @click="goBack">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        กลับไปหน้ารายการสินค้า
      </button>
    </div>

    <div v-if="loading" role="status" aria-live="polite" class="card flex items-center justify-center py-20 text-slate-400">
      <svg class="animate-spin w-6 h-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      กำลังโหลดข้อมูล...
    </div>

    <div v-else-if="loadError" role="alert" aria-live="assertive" class="card py-16 px-4 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 class="font-bold text-slate-800">โหลดข้อมูลสินค้าไม่สำเร็จ</h2>
      <p class="mt-2 text-sm text-slate-500">{{ loadError }}</p>
      <div class="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" class="btn-secondary justify-center" @click="goBack">กลับไปหน้ารายการสินค้า</button>
        <button type="button" class="btn-primary justify-center" @click="initPage">ลองใหม่</button>
      </div>
    </div>

    <form v-else class="space-y-4" @submit.prevent="saveProduct">
      <div v-if="error" id="product-form-error" role="alert" aria-live="assertive" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ error }}
      </div>
      <div v-if="success" role="status" aria-live="polite" class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        {{ success }}
      </div>

      <section v-if="isEdit" class="card overflow-hidden">
        <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold text-slate-800">รูปภาพสินค้า</h2>
            <p class="mt-0.5 text-xs text-slate-500">บันทึก metadata ที่ POS DB และไฟล์รูปที่ POS Images DB โดยตรง</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <button type="button" class="btn-secondary justify-center" :disabled="images.length < 2 || savingImageOrder" @click="saveImageOrder">
              บันทึกลำดับ
            </button>
            <button type="button" class="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60" :disabled="savingImage" @click="chooseImageFile">
              <svg v-if="savingImage" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              เพิ่มรูปภาพ
            </button>
          </div>
          <input ref="imageFileInput" class="hidden" type="file" accept="image/*" @change="uploadImage" />
        </div>

        <div v-if="loadingImages" role="status" aria-live="polite" class="flex items-center justify-center py-12 text-slate-400">
          <svg class="mr-2 h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          กำลังโหลดรูปภาพ...
        </div>
        <div v-else-if="imageError" role="alert" class="p-4 text-sm text-red-600">
          {{ imageError }}
        </div>
        <div v-else-if="images.length === 0" role="status" class="p-8 text-center text-sm text-slate-400">
          ยังไม่มีรูปภาพสินค้า
        </div>
        <div v-else class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="(img, index) in images" :key="img.guid_code" class="rounded-lg border border-slate-200 bg-white p-3">
            <ProductImage :guid-code="img.guid_code" :alt="`รูปสินค้า ${form.code} ลำดับ ${index + 1}`" image-class="aspect-square w-full rounded-lg overflow-hidden border border-slate-200" />
            <div class="mt-3 flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-slate-500">ลำดับ {{ index + 1 }}</span>
              <div class="flex gap-1">
                <button type="button" class="image-action-btn" :disabled="index === 0" aria-label="เลื่อนรูปขึ้น" @click="moveImage(index, index - 1)">↑</button>
                <button type="button" class="image-action-btn" :disabled="index === images.length - 1" aria-label="เลื่อนรูปลง" @click="moveImage(index, index + 1)">↓</button>
                <button type="button" class="image-action-btn text-red-600 hover:bg-red-50" aria-label="ลบรูปภาพ" @click="deleteImage(img)">ลบ</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 class="font-semibold text-slate-800">ข้อมูลหลัก</h2>
        </div>
        <div class="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label for="product-code" class="label-text">รหัสสินค้า <span class="text-red-500">*</span></label>
            <input
              id="product-code"
              :value="form.code"
              class="input-field font-mono uppercase"
              placeholder="เช่น ITM001"
              :disabled="isEdit"
              :aria-invalid="!!fieldErrors.code"
              :aria-describedby="fieldErrors.code ? 'product-code-error product-code-help' : 'product-code-help'"
              @input="normalizeCode"
            />
            <p id="product-code-help" class="mt-1 text-xs text-slate-400">ใช้ได้เฉพาะ A-Z, 0-9, - และ _</p>
            <p v-if="fieldErrors.code" id="product-code-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.code }}</p>
          </div>

          <div>
            <label for="product-category" class="label-text">หมวดสินค้า</label>
            <select id="product-category" v-model="form.item_category" class="input-field">
              <option value="">ไม่ระบุ</option>
              <option v-for="c in categories" :key="c.code" :value="c.code">{{ optionLabel(c) }}</option>
            </select>
          </div>

          <div>
            <label for="product-name-1" class="label-text">ชื่อสินค้า <span class="text-red-500">*</span></label>
            <input id="product-name-1" v-model.trim="form.name_1" class="input-field" placeholder="ชื่อสินค้า" :aria-invalid="!!fieldErrors.name_1" :aria-describedby="fieldErrors.name_1 ? 'product-name-1-error' : undefined" />
            <p v-if="fieldErrors.name_1" id="product-name-1-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.name_1 }}</p>
          </div>

          <div>
            <label for="product-name-2" class="label-text">ชื่อสินค้า 2</label>
            <input id="product-name-2" v-model.trim="form.name_2" class="input-field" placeholder="ชื่อเพิ่มเติม" />
          </div>

          <div>
            <label for="product-name-en-1" class="label-text">ชื่อ EN</label>
            <input id="product-name-en-1" v-model.trim="form.name_eng_1" class="input-field" placeholder="English name" />
          </div>

          <div>
            <label for="product-name-en-2" class="label-text">ชื่อ EN 2</label>
            <input id="product-name-en-2" v-model.trim="form.name_eng_2" class="input-field" placeholder="English name 2" />
          </div>

          <div>
            <label for="product-unit-standard" class="label-text">หน่วยมาตรฐาน <span class="text-red-500">*</span></label>
            <select id="product-unit-standard" v-model="form.unit_standard" class="input-field" :aria-invalid="!!fieldErrors.unit_standard" :aria-describedby="fieldErrors.unit_standard ? 'product-unit-standard-error' : undefined">
              <option value="">เลือกหน่วย</option>
              <option v-for="u in units" :key="u.code" :value="u.code">{{ optionLabel(u) }}</option>
            </select>
            <p v-if="fieldErrors.unit_standard" id="product-unit-standard-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.unit_standard }}</p>
          </div>

          <div>
            <label for="product-unit-cost" class="label-text">หน่วยต้นทุน</label>
            <select id="product-unit-cost" v-model="form.unit_cost" class="input-field">
              <option value="">ใช้หน่วยมาตรฐาน</option>
              <option v-for="u in units" :key="u.code" :value="u.code">{{ optionLabel(u) }}</option>
            </select>
          </div>
        </div>
      </section>

      <section class="card overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 class="font-semibold text-slate-800">คลังและจุดสั่งซื้อ</h2>
        </div>
        <div class="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <label for="product-warehouse" class="label-text">คลัง <span class="text-red-500">*</span></label>
            <select id="product-warehouse" v-model="form.wh_code" class="input-field" :aria-invalid="!!fieldErrors.wh_code" :aria-describedby="fieldErrors.wh_code ? 'product-warehouse-error' : undefined" @change="onWarehouseChange">
              <option value="">เลือกคลัง</option>
              <option v-for="w in warehouses" :key="w.code" :value="w.code">{{ optionLabel(w) }}</option>
            </select>
            <p v-if="fieldErrors.wh_code" id="product-warehouse-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.wh_code }}</p>
          </div>

          <div>
            <label for="product-shelf" class="label-text">ที่เก็บ <span class="text-red-500">*</span></label>
            <select id="product-shelf" v-model="form.shelf_code" class="input-field" :disabled="!form.wh_code" :aria-invalid="!!fieldErrors.shelf_code" :aria-describedby="fieldErrors.shelf_code ? 'product-shelf-error' : undefined">
              <option value="">เลือกที่เก็บ</option>
              <option v-for="s in shelves" :key="`${s.whcode}-${s.code}`" :value="s.code">{{ optionLabel(s) }}</option>
            </select>
            <p v-if="fieldErrors.shelf_code" id="product-shelf-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.shelf_code }}</p>
          </div>

          <div>
            <label for="product-purchase-point" class="label-text">จุดสั่งซื้อ</label>
            <input
              id="product-purchase-point"
              v-model.number="form.purchase_point"
              type="number"
              min="0"
              step="0.01"
              class="input-field text-right"
              :aria-invalid="!!fieldErrors.purchase_point"
              :aria-describedby="fieldErrors.purchase_point ? 'product-purchase-point-error' : undefined"
            />
            <p v-if="fieldErrors.purchase_point" id="product-purchase-point-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.purchase_point }}</p>
          </div>

          <div>
            <label for="product-minimum-qty" class="label-text">จำนวนสั่งซื้อต่ำสุด</label>
            <input
              id="product-minimum-qty"
              v-model.number="form.minimum_qty"
              type="number"
              min="0"
              step="0.01"
              class="input-field text-right"
              :aria-invalid="!!fieldErrors.minimum_qty"
              :aria-describedby="fieldErrors.minimum_qty ? 'product-minimum-qty-error' : undefined"
            />
            <p v-if="fieldErrors.minimum_qty" id="product-minimum-qty-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.minimum_qty }}</p>
          </div>

          <div>
            <label for="product-maximum-qty" class="label-text">จำนวนสั่งซื้อสูงสุด</label>
            <input
              id="product-maximum-qty"
              v-model.number="form.maximum_qty"
              type="number"
              min="0"
              step="0.01"
              class="input-field text-right"
              :aria-invalid="!!fieldErrors.maximum_qty"
              :aria-describedby="fieldErrors.maximum_qty ? 'product-maximum-qty-error' : undefined"
            />
            <p v-if="fieldErrors.maximum_qty" id="product-maximum-qty-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.maximum_qty }}</p>
          </div>
        </div>
      </section>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" class="btn-secondary justify-center" @click="goBack">ยกเลิก</button>
        <button class="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60" type="submit" :disabled="saving">
          <svg v-if="saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
import ProductImage from '../components/ProductImage.vue'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.code)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const loadError = ref('')
const success = ref('')
const imageError = ref('')
const initialSnapshot = ref('')
const units = ref([])
const categories = ref([])
const warehouses = ref([])
const shelves = ref([])
const images = ref([])
const loadingImages = ref(false)
const savingImage = ref(false)
const savingImageOrder = ref(false)
const imageFileInput = ref(null)
const fieldErrors = reactive({})

const form = reactive({
  code: '',
  name_1: '',
  name_2: '',
  name_eng_1: '',
  name_eng_2: '',
  unit_standard: '',
  unit_cost: '',
  item_category: '',
  wh_code: '',
  shelf_code: '',
  purchase_point: 0,
  minimum_qty: 0,
  maximum_qty: 0,
})

const isDirty = computed(() => initialSnapshot.value && initialSnapshot.value !== formSnapshot())

function optionLabel(row) {
  return row?.name_1 ? `${row.code} - ${row.name_1}` : row?.code || ''
}

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
    unit_standard: data.unit_standard || '',
    unit_cost: data.unit_cost || '',
    item_category: data.item_category || '',
    wh_code: data.wh_code || '',
    shelf_code: data.shelf_code || '',
    purchase_point: Number(data.purchase_point || 0),
    minimum_qty: Number(data.minimum_qty || 0),
    maximum_qty: Number(data.maximum_qty || 0),
  })
}

function formSnapshot() {
  return JSON.stringify({
    code: form.code,
    name_1: form.name_1,
    name_2: form.name_2,
    name_eng_1: form.name_eng_1,
    name_eng_2: form.name_eng_2,
    unit_standard: form.unit_standard,
    unit_cost: form.unit_cost,
    item_category: form.item_category,
    wh_code: form.wh_code,
    shelf_code: form.shelf_code,
    purchase_point: qtyValue(form.purchase_point),
    minimum_qty: qtyValue(form.minimum_qty),
    maximum_qty: qtyValue(form.maximum_qty),
  })
}

function qtyValue(value) {
  if (value === '' || value === null || value === undefined) return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : NaN
}

function validateQtyField(key, label) {
  const value = qtyValue(form[key])
  if (!Number.isFinite(value)) {
    fieldErrors[key] = `${label}ไม่ถูกต้อง`
    return
  }
  if (value < 0) {
    fieldErrors[key] = `${label}ต้องไม่ติดลบ`
    return
  }
  form[key] = value
}

function markClean() {
  initialSnapshot.value = formSnapshot()
}

async function loadMasters() {
  const [unitRes, categoryRes, whRes] = await Promise.all([
    api.get('/products/masters/units'),
    api.get('/products/masters/categories'),
    api.get('/products/masters/warehouses'),
  ])
  units.value = unitRes.data.data || []
  categories.value = categoryRes.data.data || []
  warehouses.value = whRes.data.data || []
}

async function loadShelves() {
  if (!form.wh_code) {
    shelves.value = []
    return
  }
  const { data } = await api.get('/products/masters/shelves', { params: { wh_code: form.wh_code } })
  shelves.value = data.data || []
}

async function onWarehouseChange() {
  form.shelf_code = ''
  fieldErrors.wh_code = ''
  fieldErrors.shelf_code = ''
  await loadShelves()
}

async function loadProduct() {
  const { data } = await api.get(`/products/${encodeURIComponent(route.params.code)}`)
  assignForm(data)
  await loadShelves()
}

async function loadImages() {
  if (!isEdit.value || !form.code) {
    images.value = []
    return
  }
  loadingImages.value = true
  imageError.value = ''
  try {
    const { data } = await api.get('/products/images/list', { params: { item_code: form.code } })
    images.value = data.data || []
  } catch (err) {
    imageError.value = err.message
  } finally {
    loadingImages.value = false
  }
}

function chooseImageFile() {
  imageFileInput.value?.click()
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'))
    reader.readAsDataURL(file)
  })
}

async function uploadImage(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !form.code) return
  if (!file.type.startsWith('image/')) {
    imageError.value = 'ไฟล์รูปภาพไม่ถูกต้อง'
    return
  }

  savingImage.value = true
  imageError.value = ''
  try {
    const imageFile = await readFileAsDataUrl(file)
    await api.post('/products/images', { item_code: form.code, image_file: imageFile })
    await loadImages()
  } catch (err) {
    imageError.value = err.message
  } finally {
    savingImage.value = false
  }
}

async function deleteImage(img) {
  if (!img?.guid_code) return
  const ok = window.confirm('ต้องการลบรูปภาพสินค้านี้จาก POS Images DB หรือไม่?')
  if (!ok) return

  imageError.value = ''
  try {
    await api.delete(`/products/images/${encodeURIComponent(img.guid_code)}`)
    await loadImages()
  } catch (err) {
    imageError.value = err.message
  }
}

function moveImage(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= images.value.length) return
  const next = [...images.value]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  images.value = next
}

async function saveImageOrder() {
  if (!form.code || images.value.length < 2) return
  savingImageOrder.value = true
  imageError.value = ''
  try {
    const orders = images.value.map((img, index) => ({
      guid_code: img.guid_code,
      image_order: index + 1,
    }))
    await api.put('/products/images/order', { item_code: form.code, orders })
    await loadImages()
  } catch (err) {
    imageError.value = err.message
  } finally {
    savingImageOrder.value = false
  }
}

function clearFieldErrors() {
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = ''
}

function validate() {
  clearFieldErrors()
  if (!form.code.trim()) fieldErrors.code = 'กรุณาระบุรหัสสินค้า'
  else if (!/^[A-Z0-9_-]+$/.test(form.code.trim())) fieldErrors.code = 'รูปแบบรหัสสินค้าไม่ถูกต้อง'
  if (!form.name_1.trim()) fieldErrors.name_1 = 'กรุณาระบุชื่อสินค้า'
  if (!form.unit_standard) fieldErrors.unit_standard = 'กรุณาเลือกหน่วยมาตรฐาน'
  if (!form.wh_code) fieldErrors.wh_code = 'กรุณาเลือกคลัง'
  if (!form.shelf_code) fieldErrors.shelf_code = 'กรุณาเลือกที่เก็บ'
  validateQtyField('purchase_point', 'จุดสั่งซื้อ')
  validateQtyField('minimum_qty', 'จำนวนสั่งซื้อต่ำสุด')
  validateQtyField('maximum_qty', 'จำนวนสั่งซื้อสูงสุด')
  const minimumQty = qtyValue(form.minimum_qty)
  const maximumQty = qtyValue(form.maximum_qty)
  if (
    Number.isFinite(minimumQty) &&
    Number.isFinite(maximumQty) &&
    minimumQty > 0 &&
    maximumQty > 0 &&
    minimumQty > maximumQty
  ) {
    fieldErrors.minimum_qty = 'จำนวนสั่งซื้อต่ำสุดต้องไม่มากกว่าจำนวนสั่งซื้อสูงสุด'
    fieldErrors.maximum_qty = 'จำนวนสั่งซื้อสูงสุดต้องไม่น้อยกว่าจำนวนสั่งซื้อต่ำสุด'
  }
  return Object.values(fieldErrors).filter(Boolean)
}

async function focusFirstInvalidField() {
  await nextTick()
  const first = [
    ['code', 'product-code'],
    ['name_1', 'product-name-1'],
    ['unit_standard', 'product-unit-standard'],
    ['wh_code', 'product-warehouse'],
    ['shelf_code', 'product-shelf'],
    ['purchase_point', 'product-purchase-point'],
    ['minimum_qty', 'product-minimum-qty'],
    ['maximum_qty', 'product-maximum-qty'],
  ].find(([key]) => fieldErrors[key])
  if (first) document.getElementById(first[1])?.focus()
}

async function saveProduct() {
  const errors = validate()
  error.value = errors.length ? 'กรุณาตรวจสอบข้อมูลที่จำเป็นก่อนบันทึก' : ''
  success.value = ''
  if (errors.length) {
    await focusFirstInvalidField()
    return
  }

  const ok = window.confirm('ยืนยันบันทึกข้อมูลสินค้านี้ไปที่ POS DB โดยตรง?')
  if (!ok) return

  saving.value = true
  try {
    const payload = {
      ...form,
      unit_cost: form.unit_cost || form.unit_standard,
      purchase_point: qtyValue(form.purchase_point),
      minimum_qty: qtyValue(form.minimum_qty),
      maximum_qty: qtyValue(form.maximum_qty),
    }
    if (isEdit.value) {
      await api.put(`/products/${encodeURIComponent(form.code)}`, payload)
      success.value = 'บันทึกสินค้าเรียบร้อยแล้ว'
      markClean()
    } else {
      const { data } = await api.post('/products', payload)
      success.value = 'เพิ่มสินค้าเรียบร้อยแล้ว'
      markClean()
      router.replace(`/products/${encodeURIComponent(data.code || form.code)}/edit`)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/products')
}

async function initPage() {
  loading.value = true
  error.value = ''
  loadError.value = ''
  try {
    await loadMasters()
    if (isEdit.value) {
      await loadProduct()
      await loadImages()
    }
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
  const ok = window.confirm('มีข้อมูลสินค้าที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?')
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

<style scoped>
.image-action-btn {
  @apply inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
