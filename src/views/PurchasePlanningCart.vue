<template>
  <div class="p-4 lg:p-6">
    <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">ตะกร้าสั่งซื้อ</h1>
        <p class="mt-0.5 text-sm text-slate-500">
          {{ cartCount > 0 ? `${cartCount} รายการ · ${cartGroups.length} เจ้าหนี้ · รวม ${formatMoney(cartTotal)} บาท` : 'ยังไม่มีรายการในตะกร้า' }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink to="/purchase-planning/report" class="btn-secondary">กลับรายงาน</RouterLink>
        <button v-if="cartCount > 0" class="btn-secondary border-red-200 text-red-600 hover:bg-red-50" @click="confirmClear">ล้างตะกร้า</button>
      </div>
    </div>

    <div v-if="cartCount === 0" class="card py-16 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
        <svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13 5.4 5M7 13l-2 8m12-8 2 8M9 21h6" />
        </svg>
      </div>
      <p class="font-medium text-slate-600">ยังไม่มีรายการในตะกร้า</p>
      <p class="mt-1 text-sm text-slate-400">ไปที่รายงานวางแผนสั่งซื้อแล้วกดใส่ตะกร้าได้เลย</p>
      <RouterLink to="/purchase-planning/report" class="btn-primary mx-auto mt-4">ไปรายงานวางแผน</RouterLink>
    </div>

    <template v-else>
      <div v-for="group in cartGroups" :key="group.ap_code" class="card mb-4 overflow-hidden">
        <div class="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div class="flex items-center gap-2">
            <input :checked="selectedGroups[group.ap_code] ?? true" type="checkbox" class="h-5 w-5 rounded border-slate-300 text-blue-600" @change="selectedGroups[group.ap_code] = $event.target.checked" />
            <div>
              <p class="font-semibold text-slate-800">{{ group.ap_name || group.ap_code }}</p>
              <p class="text-xs text-slate-400">{{ group.ap_code }} · {{ group.items.length }} รายการ</p>
            </div>
          </div>
          <p class="shrink-0 text-right">
            <span class="text-xs text-slate-400">ยอดรวมกลุ่ม</span><br />
            <strong class="text-lg tabular-nums text-slate-800">{{ formatMoney(group.subtotal) }}</strong>
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead class="border-b-2 border-slate-200 bg-slate-50">
              <tr>
                <th class="table-head text-left">สินค้า</th>
                <th class="table-head w-32 text-right">จำนวน</th>
                <th class="table-head w-28 text-left">หน่วยนับ</th>
                <th class="table-head w-32 text-right">ราคา/หน่วย</th>
                <th class="table-head w-36 text-right">ยอดรวม</th>
                <th class="table-head w-16 text-center"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="(item, idx) in group.items" :key="`${item.ic_code}-${item.ap_code}`" :class="[idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white', 'transition-colors hover:bg-blue-50/50']">
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-800">{{ item.ic_name || item.ic_code }}</p>
                  <p class="mt-0.5 text-xs text-slate-400">
                    <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{{ item.ic_code }}</span>
                    <span v-if="item.suggest_qty" class="ml-1.5">· แนะนำ {{ formatQty(item.suggest_qty) }} {{ item.unit_code }}</span>
                  </p>
                  <p v-if="hasReferenceDetail(item)" class="mt-1 text-xs text-slate-500">
                    จากรายงาน: หน่วย {{ item.reference_unit_code || '-' }} · ราคา {{ formatMoney(item.reference_price) }}
                  </p>
                </td>
                <td class="px-3 py-3 text-right">
                  <input :value="item.qty" type="number" min="0" step="1" class="input-field h-10 text-right" @input="onQtyChange(item, $event.target.value)" />
                </td>
                <td class="px-3 py-3">
                  <select v-if="(item.units || []).length > 1" :value="item.selected_unit || item.unit_code" class="input-field h-10" @change="onUnitChange(item, $event)">
                    <option v-for="u in (item.units || [])" :key="u.unit_code" :value="u.unit_code">
                      {{ u.unit_code }}{{ !u.is_base ? ` (x${u.ratio})` : '' }}
                    </option>
                  </select>
                  <span v-else class="text-sm text-slate-500">{{ item.selected_unit || item.unit_code }}</span>
                </td>
                <td class="px-3 py-3 text-right">
                  <input :value="item.price" type="number" min="0" step="0.01" class="input-field h-10 text-right" @input="onPriceChange(item, $event.target.value)" />
                </td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums text-blue-700">{{ formatMoney(lineTotal(item)) }}</td>
                <td class="px-2 py-3 text-center">
                  <button class="text-red-400 hover:text-red-600" title="ลบรายการ" @click="removeFromCart(item.ic_code, item.ap_code)">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="border-t border-slate-200 bg-slate-50/50 px-4 py-3">
          <label class="label-text" :for="`remark-${group.ap_code}`">หมายเหตุ PR ใบนี้ ({{ group.ap_code }})</label>
          <input
            :id="`remark-${group.ap_code}`"
            :value="groupRemarks[group.ap_code] || ''"
            class="input-field mt-1"
            placeholder="เช่น สั่งตามแผนวันที่... (เว้นว่าง = ไม่มีหมายเหตุ)"
            @input="groupRemarks[group.ap_code] = $event.target.value"
          />
        </div>
      </div>

      <div class="card sticky bottom-4 z-20 p-4 shadow-lg">
        <div class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label class="label-text" for="pr-doc-date">วันที่เอกสาร</label>
            <input id="pr-doc-date" v-model="docDate" type="date" class="input-field mt-1 max-w-xs" />
          </div>
          <div class="flex flex-col items-end gap-1">
            <p class="text-sm text-slate-500">
              จะสร้าง <strong class="text-slate-800">{{ selectedGroupCount }}</strong> ใบ PR · ยอดรวม <strong class="tabular-nums text-slate-800">{{ formatMoney(selectedTotal) }}</strong>
            </p>
            <button class="btn-primary min-w-48" :disabled="creating || selectedGroupCount === 0" @click="createPR">
              {{ creating ? 'กำลังสร้าง...' : `สร้าง PR (${selectedGroupCount})` }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="prResult && !prResult.success" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
        <p class="font-semibold text-red-800">{{ prResult.error }}</p>
      </div>
    </template>

    <Transition name="dialog-fade">
      <div v-if="prResult && prResult.success" class="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <div class="flex flex-col items-center gap-4 px-6 py-8 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg class="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p class="text-lg font-bold text-slate-800">บันทึกสำเร็จ</p>
              <p class="mt-1 text-sm text-slate-500">สร้างใบเสนอซื้อ (PR) เรียบร้อย {{ prResult.pr_count }} ใบ</p>
            </div>

            <div class="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">เลขที่เอกสาร</p>
              <div class="space-y-2">
                <div v-for="doc in prResult.pr_docs" :key="doc.doc_no" class="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                  <div class="min-w-0">
                    <span class="font-mono font-bold text-blue-700">{{ doc.doc_no }}</span>
                    <div class="mt-0.5 text-xs text-slate-500">
                      {{ doc.ap_name || doc.ap_code }} · {{ doc.item_count }} รายการ
                    </div>
                  </div>
                  <strong class="shrink-0 tabular-nums text-slate-700">{{ formatMoney(doc.total_amount) }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 border-t border-slate-100 px-6 py-4">
            <button class="btn-secondary flex-1" @click="goReport">กลับไปรายงาน</button>
            <button class="btn-primary flex-1" @click="closeConfirm">ทำรายการใหม่</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="dialog-fade">
      <div v-if="confirmState.show" class="fixed inset-0 z-[60] flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="resolveConfirm(false)"></div>
        <div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div class="flex flex-col items-center gap-4 px-6 py-7 text-center">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-full"
              :class="{
                'bg-blue-100': confirmState.variant === 'primary',
                'bg-red-100': confirmState.variant === 'danger',
                'bg-amber-100': confirmState.variant === 'warning',
              }"
            >
              <svg v-if="confirmState.variant === 'primary'" class="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              <svg v-else-if="confirmState.variant === 'danger'" class="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 7-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
              </svg>
              <svg v-else class="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 0 0-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>

            <div>
              <p class="text-base font-bold text-slate-800">{{ confirmState.title }}</p>
              <p v-if="confirmState.message" class="mt-1 text-sm text-slate-500">{{ confirmState.message }}</p>
            </div>

            <div v-if="confirmState.details && confirmState.details.length" class="w-full space-y-1 rounded-lg bg-slate-50 p-3 text-left">
              <div v-for="(d, i) in confirmState.details" :key="i" class="flex items-center justify-between gap-3 text-sm">
                <span class="truncate text-slate-500">{{ d.label }}</span>
                <span class="shrink-0 font-medium tabular-nums text-slate-700">{{ d.value }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 border-t border-slate-100 px-6 py-4">
            <button v-if="confirmState.cancelText !== null" class="btn-secondary flex-1" @click="resolveConfirm(false)">{{ confirmState.cancelText }}</button>
            <button
              class="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              :class="{
                'bg-blue-600 hover:bg-blue-700': confirmState.variant === 'primary',
                'bg-red-600 hover:bg-red-700': confirmState.variant === 'danger',
                'bg-amber-500 hover:bg-amber-600': confirmState.variant === 'warning',
              }"
              @click="resolveConfirm(true)"
            >
              {{ confirmState.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../composables/useApi.js'
import { usePlanningCart } from '../composables/usePlanningCart.js'

const router = useRouter()
const { cart, cartCount, cartGroups, cartTotal, removeFromCart, updateQty, updatePrice, updateUnit, setUnits, clearCart } = usePlanningCart()

const today = new Date().toISOString().slice(0, 10)
const docDate = ref(today)
const creating = ref(false)
const prResult = ref(null)
const selectedGroups = reactive({})
const groupRemarks = reactive({})
const unitsLoaded = reactive({})

const selectedGroupCount = computed(() => cartGroups.value.filter((g) => selectedGroups[g.ap_code] ?? true).length)
const selectedTotal = computed(() => (
  Math.round(
    cartGroups.value
      .filter((g) => selectedGroups[g.ap_code] ?? true)
      .reduce((sum, group) => sum + Number(group.subtotal || 0), 0) * 100,
  ) / 100
))

async function loadUnitsForItem(icCode, apCode) {
  if (unitsLoaded[icCode]) {
    setUnits(icCode, apCode, unitsLoaded[icCode])
    return
  }
  try {
    const { data } = await api.get(`/purchase-planning/items/${encodeURIComponent(icCode)}/units`)
    unitsLoaded[icCode] = data.units || []
    setUnits(icCode, apCode, data.units || [])
  } catch {
    setUnits(icCode, apCode, [])
  }
}

function onUnitChange(item, event) {
  updateUnit(item.ic_code, item.ap_code, event.target.value)
}

function onQtyChange(item, value) {
  updateQty(item.ic_code, item.ap_code, value)
}

function onPriceChange(item, value) {
  updatePrice(item.ic_code, item.ap_code, value)
}

function lineTotal(item) {
  return Math.round(Number(item.qty || 0) * Number(item.price || 0) * 100) / 100
}

function hasReferenceDetail(item) {
  return Boolean(item.reference_unit_code) || Number(item.reference_price || 0) > 0
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('th-TH')
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

onMounted(() => {
  for (const item of cart) {
    if (!item.units || item.units.length <= 1) {
      loadUnitsForItem(item.ic_code, item.ap_code)
    }
  }
})

function confirmClear() {
  showConfirm({
    variant: 'danger',
    title: 'ล้างตะกร้า',
    message: 'ยืนยันล้างรายการในตะกร้าทั้งหมด?',
    confirmText: 'ล้างตะกร้า',
    cancelText: 'ยกเลิก',
  }).then((ok) => {
    if (ok) clearCart()
  })
}

async function createPR() {
  const groupsToSend = cartGroups.value
    .filter((g) => selectedGroups[g.ap_code] ?? true)
    .map((g) => ({
      ap_code: g.ap_code,
      ap_name: g.ap_name,
      remark: (groupRemarks[g.ap_code] || '').trim(),
      items: g.items.map((it) => {
        const selectedUnit = (it.units || []).find((unit) => unit.unit_code === (it.selected_unit || it.unit_code))
        return {
          item_code: it.ic_code,
          item_name: it.ic_name,
          unit_code: it.selected_unit || it.unit_code,
          qty: Number(it.qty),
          price: Number(it.price || 0),
          unit_ratio: Number(it.unit_ratio || selectedUnit?.ratio || 1),
          unit_stand_value: Number(selectedUnit?.stand_value || it.unit_ratio || 1),
          unit_divide_value: Number(selectedUnit?.divide_value || 1),
          base_unit: it.unit_code,
        }
      }),
    }))

  if (!groupsToSend.length) return

  for (const g of groupsToSend) {
    for (const it of g.items) {
      const where = `${g.ap_name || g.ap_code}${g.ap_name ? ` (${g.ap_code})` : ''} · ${it.item_name || it.item_code}`
      if (!(it.qty > 0)) {
        await showConfirm({ variant: 'warning', title: 'ข้อมูลไม่ถูกต้อง', message: `จำนวนของ "${where}" ต้องมากกว่า 0`, confirmText: 'แก้ไข', cancelText: null })
        return
      }
      if (Number(it.price) < 0) {
        await showConfirm({ variant: 'warning', title: 'ข้อมูลไม่ถูกต้อง', message: `ราคาของ "${where}" ต้องไม่ติดลบ`, confirmText: 'แก้ไข', cancelText: null })
        return
      }
    }
  }

  const totalQty = groupsToSend.reduce((s, g) => s + g.items.length, 0)
  const groupDetails = groupsToSend.map((g) => {
    const subtotal = Math.round(g.items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0), 0) * 100) / 100
    return { label: g.ap_name || g.ap_code, value: `${g.items.length} รายการ · ${formatMoney(subtotal)}` }
  })

  const ok = await showConfirm({
    variant: 'primary',
    title: 'ยืนยันสร้างใบเสนอซื้อ (PR)',
    message: `จะสร้าง ${groupsToSend.length} ใบ PR · ${totalQty} รายการ · รวม ${formatMoney(selectedTotal.value)}`,
    details: groupDetails,
    confirmText: 'สร้าง PR',
    cancelText: 'ยกเลิก',
  })
  if (!ok) return

  creating.value = true
  prResult.value = null
  try {
    const { data } = await api.post('/purchase-planning/pr/create', {
      doc_date: docDate.value,
      groups: groupsToSend,
    })
    prResult.value = data
    if (data.success) {
      removeCreatedGroupsFromCart(groupsToSend, data.pr_docs || [])
    }
  } catch (err) {
    prResult.value = { success: false, error: err.response?.data?.error || err.message || 'เกิดข้อผิดพลาด' }
  } finally {
    creating.value = false
  }
}

function removeCreatedGroupsFromCart(groupsToSend, prDocs) {
  const createdApCodes = new Set((prDocs || []).map((doc) => String(doc.ap_code || '').trim()).filter(Boolean))
  const groupsToRemove = createdApCodes.size
    ? groupsToSend.filter((group) => createdApCodes.has(String(group.ap_code || '').trim()))
    : groupsToSend

  for (const group of groupsToRemove) {
    for (const item of group.items) {
      removeFromCart(item.item_code, group.ap_code)
    }
    delete selectedGroups[group.ap_code]
    delete groupRemarks[group.ap_code]
  }
}

function goReport() {
  router.push('/purchase-planning/report')
}

function closeConfirm() {
  prResult.value = null
  for (const k of Object.keys(groupRemarks)) delete groupRemarks[k]
  for (const k of Object.keys(selectedGroups)) delete selectedGroups[k]
}

const confirmState = ref({ show: false })
let confirmResolve = null

function showConfirm(opts) {
  confirmState.value = {
    show: true,
    variant: opts.variant || 'primary',
    title: opts.title || '',
    message: opts.message || '',
    details: opts.details || null,
    confirmText: opts.confirmText || 'ตกลง',
    cancelText: opts.cancelText === undefined ? 'ยกเลิก' : opts.cancelText,
  }
  return new Promise((resolve) => { confirmResolve = resolve })
}

function resolveConfirm(ok) {
  confirmState.value.show = false
  if (confirmResolve) {
    confirmResolve(ok)
    confirmResolve = null
  }
}
</script>

<style scoped>
.table-head {
  @apply px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
