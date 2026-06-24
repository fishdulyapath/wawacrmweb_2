<template>
  <div class="p-4 lg:p-6">
    <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <RouterLink to="/purchase-planning/report" class="mb-2 inline-flex text-sm font-medium text-blue-600 hover:underline">กลับไปรายงานวางแผนสั่งซื้อ</RouterLink>
        <h1 class="text-xl font-bold text-slate-800">{{ item.ic_name || item.ic_code || 'รายละเอียดสินค้า' }}</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ item.ic_code }} / คลัง {{ options.warehouse || filter.warehouse }} / D_avg {{ options.days || filter.days }} วัน</p>
      </div>
      <button class="btn-secondary" :disabled="loading" @click="load">โหลดใหม่</button>
    </div>

    <div v-if="loading" class="card flex items-center justify-center py-20 text-slate-400">
      <svg class="mr-2 h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      กำลังโหลดรายละเอียด...
    </div>

    <div v-else-if="error" class="card px-4 py-16 text-center">
      <p class="font-medium text-red-500">{{ error }}</p>
      <button class="btn-secondary mx-auto mt-3" @click="load">ลองใหม่</button>
    </div>

    <template v-else>
      <section class="mb-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div class="card overflow-hidden">
          <div class="aspect-square bg-slate-100">
            <img :src="imageSrc" :alt="item.ic_name" class="h-full w-full object-contain" @error="imageFailed = true" />
          </div>
          <div class="border-t border-slate-200 p-4">
            <div class="mb-2"><span class="code-pill">{{ item.ic_code }}</span></div>
            <p class="text-sm font-semibold text-slate-800">{{ item.ic_name || '-' }}</p>
            <p class="mt-1 text-xs text-slate-500">หน่วย {{ item.unit_code || '-' }}</p>
            <p class="mt-2 text-xs text-slate-400">Barcode: {{ barcodeText }}</p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="คงเหลือ" :value="formatQty(item.balance_qty)" note="stock balance" />
          <MetricCard label="พร้อมใช้" :value="formatQty(item.available_qty)" note="balance + ค้างรับ - ค้างจอง - ค้างส่ง" tone="blue" />
          <MetricCard label="D_avg" :value="formatQty(item.d_avg)" :note="`${formatInt(item.active_stock_days)} วันมี stock`" />
          <MetricCard label="Stockout" :value="formatInt(item.stockout_days)" note="วัน stock เป็น 0" tone="amber" />
          <MetricCard label="Min/ROP" :value="formatQty(item.min_stock)" :note="`Lead ${formatInt(item.lead_time_days)} + Late ${formatInt(item.late_buffer_days)} + Wholesale ${formatInt(item.wholesale_buffer_days)}`" />
          <MetricCard label="Max" :value="formatQty(item.max_stock)" :note="`Cycle ${formatInt(item.order_cycle_days)} วัน`" />
          <MetricCard label="แนะนำซื้อ" :value="formatQty(item.suggest_qty)" note="ปัดตาม MOQ/pack size" tone="blue" />
          <MetricCard label="ต้นทุนเฉลี่ย" :value="formatMoney(item.average_cost)" note="average_cost_end" />
        </div>
      </section>

      <section class="mb-4 grid gap-4 xl:grid-cols-3">
        <div class="card p-4 xl:col-span-2">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="section-title">กราฟขาย/ซื้อ/เครดิตโน้ต 90 วัน</h2>
            <span :class="statusClass(item.stock_status)">{{ statusLabel(item.stock_status) }}</span>
          </div>
          <div class="h-64 overflow-hidden">
            <div class="flex h-full items-end gap-1">
              <div v-for="row in chartSample" :key="row.doc_date" class="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5" :title="chartTitle(row)">
                <div class="w-full rounded-t bg-blue-500" :style="{ height: barHeight(row.sale_qty) }"></div>
                <div class="w-full rounded-t bg-green-500" :style="{ height: barHeight(row.purchase_qty) }"></div>
                <div class="w-full rounded-t bg-amber-500" :style="{ height: barHeight(row.credit_note_qty) }"></div>
              </div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span class="legend-dot bg-blue-500"></span> ขาย
            <span class="legend-dot bg-green-500"></span> ซื้อ
            <span class="legend-dot bg-amber-500"></span> เครดิตโน้ต
          </div>
        </div>

        <div class="card p-4">
          <h2 class="section-title mb-3">ยอดขายย้อนหลัง</h2>
          <div class="space-y-3">
            <SaleTotal label="30 วัน" :qty="salesTotals.qty_30" :amount="salesTotals.amount_30" />
            <SaleTotal label="90 วัน" :qty="salesTotals.qty_90" />
            <SaleTotal label="180 วัน" :qty="salesTotals.qty_180" />
            <SaleTotal label="365 วัน" :qty="salesTotals.qty_365" :amount="salesTotals.amount_365" />
          </div>
        </div>
      </section>

      <section class="mb-4 grid gap-4 xl:grid-cols-2">
        <DataPanel title="Supplier ของสินค้านี้">
          <table class="detail-table min-w-[720px]">
            <thead>
              <tr>
                <th>เจ้าหนี้</th>
                <th class="text-right">ราคา</th>
                <th class="text-right">Lead</th>
                <th class="text-right">Late</th>
                <th class="text-right">Cycle</th>
                <th class="text-right">MOQ</th>
                <th class="text-right">Pack</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="supplier in suppliers" :key="supplier.ap_code">
                <td>
                  <div class="font-medium text-slate-800">{{ supplier.ap_name || '-' }}</div>
                  <div class="text-xs text-slate-400">{{ supplier.ap_code }}</div>
                </td>
                <td class="text-right tabular-nums">{{ formatMoney(supplier.last_purchase_price) }}</td>
                <td class="text-right tabular-nums">{{ formatInt(supplier.lead_time_days) }}</td>
                <td class="text-right tabular-nums">{{ formatInt(supplier.late_buffer_days) }}</td>
                <td class="text-right tabular-nums">{{ formatInt(supplier.order_cycle_days) }}</td>
                <td class="text-right tabular-nums">{{ formatQty(supplier.min_order_qty) }}</td>
                <td class="text-right tabular-nums">{{ formatQty(supplier.pack_size) }}</td>
              </tr>
              <tr v-if="!suppliers.length"><td colspan="7" class="empty-cell">ยังไม่มี supplier</td></tr>
            </tbody>
          </table>
        </DataPanel>

        <DataPanel title="บิลซื้อล่าสุด 5 ใบ">
          <table class="detail-table min-w-[720px]">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เอกสาร</th>
                <th>เจ้าหนี้</th>
                <th class="text-right">จำนวน</th>
                <th class="text-right">ราคา</th>
                <th class="text-right">ยอด</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bill in lastPurchases" :key="`${bill.doc_no}-${bill.ap_code}`">
                <td>{{ formatDate(bill.doc_date) }}</td>
                <td class="font-mono text-xs">{{ bill.doc_no }}</td>
                <td>{{ bill.ap_name || bill.ap_code || '-' }}</td>
                <td class="text-right tabular-nums">{{ formatQty(bill.qty) }}</td>
                <td class="text-right tabular-nums">{{ formatMoney(bill.price) }}</td>
                <td class="text-right tabular-nums">{{ formatMoney(bill.sum_amount) }}</td>
              </tr>
              <tr v-if="!lastPurchases.length"><td colspan="6" class="empty-cell">ไม่พบประวัติซื้อ</td></tr>
            </tbody>
          </table>
        </DataPanel>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <DataPanel title="ลูกค้าซื้อสูงสุด">
          <table class="detail-table min-w-[560px]">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th class="text-right">จำนวน</th>
                <th class="text-right">ยอดขาย</th>
                <th>ล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in topCustomers" :key="customer.cust_code">
                <td class="font-mono text-xs">{{ customer.cust_code || '-' }}</td>
                <td class="text-right tabular-nums">{{ formatQty(customer.qty) }}</td>
                <td class="text-right tabular-nums">{{ formatMoney(customer.amount) }}</td>
                <td>{{ formatDate(customer.last_sale_date) }}</td>
              </tr>
              <tr v-if="!topCustomers.length"><td colspan="4" class="empty-cell">ไม่พบประวัติขาย</td></tr>
            </tbody>
          </table>
        </DataPanel>

        <DataPanel title="ค้างรับ">
          <table class="detail-table min-w-[620px]">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เอกสาร</th>
                <th>เจ้าหนี้</th>
                <th class="text-right">จำนวน</th>
                <th class="text-right">รอ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pendingReceive" :key="`${row.doc_no}-${row.ap_code}`">
                <td>{{ formatDate(row.doc_date) }}</td>
                <td class="font-mono text-xs">{{ row.doc_no }}</td>
                <td>{{ row.ap_name || row.ap_code || '-' }}</td>
                <td class="text-right tabular-nums">{{ formatQty(row.qty) }}</td>
                <td class="text-right tabular-nums">{{ formatInt(row.waiting_days) }} วัน</td>
              </tr>
              <tr v-if="!pendingReceive.length"><td colspan="5" class="empty-cell">ไม่พบเอกสารค้างรับ</td></tr>
            </tbody>
          </table>
        </DataPanel>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../composables/useApi.js'

const MetricCard = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    note: { type: String, default: '' },
    tone: { type: String, default: 'slate' },
  },
  setup(props) {
    const color = computed(() => ({
      blue: 'text-blue-600',
      amber: 'text-amber-600',
      red: 'text-red-600',
      slate: 'text-slate-800',
    }[props.tone] || 'text-slate-800'))
    return () => h('div', { class: 'card p-4' }, [
      h('p', { class: 'text-xs font-semibold uppercase tracking-wide text-slate-400' }, props.label),
      h('p', { class: `mt-1 text-2xl font-bold ${color.value}` }, props.value),
      h('p', { class: 'mt-0.5 text-xs text-slate-400' }, props.note),
    ])
  },
})

const SaleTotal = defineComponent({
  props: {
    label: { type: String, required: true },
    qty: { type: [Number, String], default: 0 },
    amount: { type: [Number, String], default: null },
  },
  setup(props) {
    return () => h('div', { class: 'rounded-lg border border-slate-200 p-3' }, [
      h('div', { class: 'flex items-center justify-between gap-3' }, [
        h('span', { class: 'text-sm font-medium text-slate-600' }, props.label),
        h('strong', { class: 'tabular-nums text-slate-800' }, Number(props.qty || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })),
      ]),
      props.amount !== null ? h('p', { class: 'mt-1 text-right text-xs text-slate-400' }, Number(props.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : null,
    ])
  },
})

const DataPanel = defineComponent({
  props: { title: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h('section', { class: 'card overflow-hidden' }, [
      h('div', { class: 'border-b border-slate-200 px-4 py-3' }, h('h2', { class: 'section-title' }, props.title)),
      h('div', { class: 'overflow-x-auto' }, slots.default?.()),
    ])
  },
})

const route = useRoute()
const itemCode = computed(() => String(route.params.icCode || ''))
const filter = {
  days: Number(route.query.days || 30),
  as_of_date: route.query.as_of_date || new Date().toISOString().slice(0, 10),
  warehouse: route.query.warehouse || 'MMA01',
}
const loading = ref(false)
const error = ref('')
const imageFailed = ref(false)
const item = ref({})
const options = ref({})
const barcodes = ref([])
const lastPurchases = ref([])
const salesTotals = ref({})
const topCustomers = ref([])
const movementChart = ref([])
const pendingReceive = ref([])
const suppliers = ref([])

const imageSrc = computed(() => imageFailed.value ? placeholderSvg.value : (item.value.image_url || placeholderSvg.value))
const placeholderSvg = computed(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#f1f5f9"/><text x="50%" y="50%" text-anchor="middle" fill="#94a3b8" font-family="Arial" font-size="22">No image</text></svg>')}`)
const barcodeText = computed(() => barcodes.value.map((row) => row.barcode).filter(Boolean).slice(0, 3).join(', ') || '-')
const maxChartValue = computed(() => Math.max(1, ...movementChart.value.flatMap((row) => [Number(row.sale_qty || 0), Number(row.purchase_qty || 0), Number(row.credit_note_qty || 0)])))
const chartSample = computed(() => movementChart.value.filter((_, idx) => idx % 3 === 0 || movementChart.value.length <= 45))

async function load() {
  loading.value = true
  error.value = ''
  imageFailed.value = false
  try {
    const { data } = await api.get(`/purchase-planning/items/${encodeURIComponent(itemCode.value)}/detail`, {
      params: filter,
    })
    item.value = data.item || {}
    options.value = data.options || {}
    barcodes.value = data.barcodes || []
    lastPurchases.value = data.last_purchases || []
    salesTotals.value = data.sales_totals || {}
    topCustomers.value = data.top_customers || []
    movementChart.value = data.movement_chart || []
    pendingReceive.value = data.pending_receive || []
    suppliers.value = data.suppliers || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function barHeight(value) {
  const pct = Math.max(1, Math.round((Number(value || 0) / maxChartValue.value) * 100))
  return `${pct}%`
}

function chartTitle(row) {
  return `${formatDate(row.doc_date)} ขาย ${formatQty(row.sale_qty)} ซื้อ ${formatQty(row.purchase_qty)} เครดิต ${formatQty(row.credit_note_qty)}`
}

function formatInt(value) {
  return Number(value || 0).toLocaleString('th-TH')
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}

function statusLabel(status) {
  return {
    low: 'ต่ำกว่าเกณฑ์',
    normal: 'ปกติ',
    high: 'สูงกว่าเกณฑ์',
    inactive: 'ไม่เคลื่อนไหว',
    insufficient_sales_days: 'ข้อมูลขายไม่พอ',
  }[status] || status || '-'
}

function statusClass(status) {
  return {
    low: 'status-badge bg-red-100 text-red-700',
    normal: 'status-badge bg-green-100 text-green-700',
    high: 'status-badge bg-amber-100 text-amber-700',
    inactive: 'status-badge bg-slate-100 text-slate-500',
    insufficient_sales_days: 'status-badge bg-blue-100 text-blue-700',
  }[status] || 'status-badge bg-slate-100 text-slate-500'
}

onMounted(load)
</script>

<style scoped>
.section-title {
  @apply text-sm font-semibold text-slate-800;
}
.code-pill {
  @apply rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600;
}
.status-badge {
  @apply inline-flex rounded-full px-2 py-0.5 text-xs font-semibold;
}
.legend-dot {
  @apply inline-block h-3 w-3 rounded-sm;
}
.detail-table {
  @apply w-full text-sm;
}
.detail-table th {
  @apply bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500;
}
.detail-table td {
  @apply px-4 py-3 text-slate-600;
}
.empty-cell {
  @apply py-10 text-center text-slate-400;
}
</style>
