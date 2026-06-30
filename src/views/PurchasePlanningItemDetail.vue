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
          <MetricCard label="D_avg" :value="formatQty(item.d_avg)" :note="dAvgNote" />
          <MetricCard label="Stockout" :value="formatInt(item.stockout_days)" note="วัน stock เป็น 0" tone="amber" />
          <MetricCard label="Min/ROP" :value="formatQty(item.min_stock)" :note="`Lead ${formatInt(item.lead_time_days)} + Late ${formatInt(item.late_buffer_days)} + Wholesale ${formatInt(item.wholesale_buffer_days)}`" />
          <MetricCard label="Max" :value="formatQty(item.max_stock)" :note="`Cycle ${formatInt(item.order_cycle_days)} วัน`" />
          <MetricCard label="แนะนำซื้อ" :value="formatQty(item.suggest_qty)" note="ปัดเป็นจำนวนเต็ม (ไม่ต่ำกว่า MOQ)" tone="blue" />
          <MetricCard label="ต้นทุนเฉลี่ย" :value="formatMoney(item.average_cost)" note="average_cost_end" />
        </div>
      </section>

      <!-- สต๊อกตามหน่วยนับ (แสดงเฉพาะเมื่อมีหลายหน่วย) -->
      <section v-if="units.length > 1" class="mb-4">
        <div class="card overflow-hidden">
          <div class="border-b border-slate-200 px-4 py-3">
            <h2 class="section-title">สต๊อกตามหน่วยนับ</h2>
            <p class="mt-0.5 text-xs text-slate-400">สต๊อกเก็บในหน่วยหลัก ({{ item.unit_code }}) · แปลงตาม ratio ใน ic_unit_use · ต้นทุนเฉลี่ย = average_cost × ratio · กำไร/หน่วยคำนวณจากยอดขายสุทธิ 365 วัน</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-500">หน่วยนับ</th>
                  <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">Ratio</th>
                  <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">คงเหลือ</th>
                  <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">พร้อมใช้</th>
                  <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">แนะนำซื้อ</th>
                  <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">ต้นทุนเฉลี่ย<br /><span class="font-normal normal-case text-slate-400">/หน่วย</span></th>
                  <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">ราคาขายเฉลี่ย<br /><span class="font-normal normal-case text-slate-400">/หน่วย · 365d</span></th>
                  <th class="px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">กำไร<br /><span class="font-normal normal-case text-slate-400">/หน่วย</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="u in units" :key="u.unit_code" :class="u.is_base ? 'bg-blue-50/40' : ''">
                  <td class="px-4 py-2.5">
                    <span class="font-medium text-slate-800">{{ u.unit_code }}</span>
                    <span v-if="u.is_base" class="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">หลัก</span>
                  </td>
                  <td class="px-4 py-2.5 text-right tabular-nums text-slate-500">{{ u.ratio }} : 1</td>
                  <td class="px-4 py-2.5 text-right tabular-nums" :class="u.is_base ? 'font-semibold text-slate-800' : 'text-slate-600'">{{ formatQty(item.balance_qty / u.ratio) }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums" :class="u.is_base ? 'font-semibold text-blue-700' : 'text-slate-600'">{{ formatQty(item.available_qty / u.ratio) }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums font-medium" :class="Number(item.suggest_qty) > 0 ? 'text-blue-700' : 'text-slate-400'">{{ formatQty(item.suggest_qty / u.ratio) }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums font-medium" :class="u.is_base ? 'text-slate-800' : 'text-slate-600'">{{ formatMoney(Number(item.average_cost || 0) * u.ratio) }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums" :class="u.is_base ? 'font-semibold text-slate-800' : 'text-slate-600'">{{ formatMoney(avgSalePricePerUnit(u.ratio)) }}</td>
                  <td class="px-4 py-2.5 text-right tabular-nums font-semibold" :class="profitPerUnitColor(u.ratio)">{{ formatMoney(profitPerUnit(u.ratio)) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="mb-4 grid gap-4 xl:grid-cols-3">
        <div class="card p-4 xl:col-span-2">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="section-title">กราฟขาย/ซื้อ/เครดิตโน้ต 90 วัน</h2>
            <span :class="statusClass(item.stock_status)"> {{ statusLabel(item.stock_status) }}</span>
          </div>
          <div class="relative">
            <div class="h-56 overflow-hidden">
              <div class="flex h-full items-end gap-1">
                <div
                  v-for="row in chartSample"
                  :key="row.doc_date"
                  class="flex min-w-0 flex-1 flex-col items-center justify-end cursor-pointer"
                  @mouseenter="hoverBar = row"
                  @mouseleave="hoverBar = null"
                >
                  <div v-if="Number(row.credit_note_qty) > 0" class="w-full rounded-t bg-amber-500" :style="{ height: barHeight(row.credit_note_qty) }"></div>
                  <div v-if="Number(row.receive_qty) > 0" class="w-full rounded-t bg-teal-500" :style="{ height: barHeight(row.receive_qty) }"></div>
                  <div v-if="Number(row.purchase_qty) > 0" class="w-full rounded-t bg-green-500" :style="{ height: barHeight(row.purchase_qty) }"></div>
                  <div v-if="Number(row.sale_qty) > 0" class="w-full rounded-t bg-blue-500" :style="{ height: barHeight(row.sale_qty) }"></div>
                  <div v-if="!hasMovement(row)" class="w-full" style="height: 2px; background: #e2e8f0;"></div>
                </div>
              </div>
            </div>

            <!-- Hover tooltip -->
            <div
              v-if="hoverBar"
              class="pointer-events-none absolute top-0 right-0 z-10 min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            >
              <p class="mb-1.5 font-semibold text-slate-700">{{ formatTooltipDate(hoverBar.doc_date) }}</p>
              <div class="flex items-center justify-between gap-4">
                <span class="flex items-center gap-1.5 text-slate-500"><span class="legend-dot bg-blue-500"></span>ขาย</span>
                <span class="font-semibold tabular-nums text-slate-800">{{ formatQty(hoverBar.sale_qty) }}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="flex items-center gap-1.5 text-slate-500"><span class="legend-dot bg-green-500"></span>ซื้อ</span>
                <span class="font-semibold tabular-nums text-slate-800">{{ formatQty(hoverBar.purchase_qty) }}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="flex items-center gap-1.5 text-slate-500"><span class="legend-dot bg-teal-500"></span>รับ</span>
                <span class="font-semibold tabular-nums text-slate-800">{{ formatQty(hoverBar.receive_qty) }}</span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="flex items-center gap-1.5 text-slate-500"><span class="legend-dot bg-amber-500"></span>เครดิตโน้ต</span>
                <span class="font-semibold tabular-nums text-slate-800">{{ formatQty(hoverBar.credit_note_qty) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span class="legend-dot bg-blue-500"></span> ขาย
            <span class="legend-dot bg-green-500"></span> ซื้อ
            <span class="legend-dot bg-teal-500"></span> รับ
            <span class="legend-dot bg-amber-500"></span> เครดิตโน้ต
          </div>
        </div>

        <div class="card p-4">
          <h2 class="section-title mb-3">ยอดขาย & กำไรขั้นต้น</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="border-b border-slate-200">
                <tr>
                  <th class="px-2 py-2 text-left text-xs font-semibold text-slate-500">ช่วง</th>
                  <th class="px-2 py-2 text-right text-xs font-semibold text-slate-500">จำนวน</th>
                  <th class="px-2 py-2 text-right text-xs font-semibold text-slate-500">ยอดขาย</th>
                  <th class="px-2 py-2 text-right text-xs font-semibold text-slate-500">ต้นทุน</th>
                  <th class="px-2 py-2 text-right text-xs font-semibold text-slate-500">กำไร</th>
                  <th class="px-2 py-2 text-right text-xs font-semibold text-slate-500">%กำไร</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr>
                  <td class="px-2 py-2 font-medium text-slate-700">30 วัน</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatQty(salesTotals.qty_30) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatMoney(salesTotals.amount_net_30) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatMoney(salesTotals.cost_net_30) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium" :class="profitColor(salesTotals.amount_net_30, salesTotals.cost_net_30)">{{ formatProfit(salesTotals.amount_net_30, salesTotals.cost_net_30) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium" :class="profitColor(salesTotals.amount_net_30, salesTotals.cost_net_30)">{{ formatPct(salesTotals.amount_net_30, salesTotals.cost_net_30) }}%</td>
                </tr>
                <tr>
                  <td class="px-2 py-2 font-medium text-slate-700">90 วัน</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatQty(salesTotals.qty_90) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatMoney(salesTotals.amount_net_90) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatMoney(salesTotals.cost_net_90) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium" :class="profitColor(salesTotals.amount_net_90, salesTotals.cost_net_90)">{{ formatProfit(salesTotals.amount_net_90, salesTotals.cost_net_90) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium" :class="profitColor(salesTotals.amount_net_90, salesTotals.cost_net_90)">{{ formatPct(salesTotals.amount_net_90, salesTotals.cost_net_90) }}%</td>
                </tr>
                <tr>
                  <td class="px-2 py-2 font-medium text-slate-700">180 วัน</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatQty(salesTotals.qty_180) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatMoney(salesTotals.amount_net_180) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatMoney(salesTotals.cost_net_180) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium" :class="profitColor(salesTotals.amount_net_180, salesTotals.cost_net_180)">{{ formatProfit(salesTotals.amount_net_180, salesTotals.cost_net_180) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium" :class="profitColor(salesTotals.amount_net_180, salesTotals.cost_net_180)">{{ formatPct(salesTotals.amount_net_180, salesTotals.cost_net_180) }}%</td>
                </tr>
                <tr>
                  <td class="px-2 py-2 font-medium text-slate-700">365 วัน</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatQty(salesTotals.qty_365) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatMoney(salesTotals.amount_net_365) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums text-slate-600">{{ formatMoney(salesTotals.cost_net_365) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium" :class="profitColor(salesTotals.amount_net_365, salesTotals.cost_net_365)">{{ formatProfit(salesTotals.amount_net_365, salesTotals.cost_net_365) }}</td>
                  <td class="px-2 py-2 text-right tabular-nums font-medium" :class="profitColor(salesTotals.amount_net_365, salesTotals.cost_net_365)">{{ formatPct(salesTotals.amount_net_365, salesTotals.cost_net_365) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-2 text-xs text-slate-400">กำไรขั้นต้น = ยอดขาย(ถอด VAT) − ต้นทุน · net = ขาย − รับคืน</p>
        </div>
      </section>

      <section class="mb-4 grid gap-4 xl:grid-cols-2">
        <DataPanel title="Supplier ของสินค้านี้">
          <table class="detail-table min-w-[640px]">
            <thead>
              <tr>
                <th>เจ้าหนี้</th>
                <th class="text-right">ราคา</th>
                <th class="text-right">Lead</th>
                <th class="text-right">Late</th>
                <th class="text-right">Cycle</th>
                <th class="text-right">MOQ</th>
                <th>หน่วยซื้อ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="supplier in suppliers" :key="supplier.ap_code">
                <td>
                  <div class="font-medium" :class="String(supplier.tax_type) === '1' ? 'text-red-600' : 'text-slate-800'">{{ supplier.ap_name || '-' }}<span v-if="String(supplier.tax_type) === '1'" class="ml-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold align-middle" title="มีภาษี">VAT</span></div>
                  <div class="text-xs text-slate-400">{{ supplier.ap_code }}</div>
                </td>
                <td class="text-right tabular-nums">{{ formatMoney(supplier.last_purchase_price ?? supplier.last_purchase_price_exclude_vat) }}</td>
                <td class="text-right tabular-nums">{{ formatInt(supplier.lead_time_days) }}</td>
                <td class="text-right tabular-nums">{{ formatInt(supplier.late_buffer_days) }}</td>
                <td class="text-right tabular-nums">{{ formatInt(supplier.order_cycle_days) }}</td>
                <td class="text-right tabular-nums">{{ formatQty(supplier.min_order_qty) }}</td>
                <td class="text-xs text-slate-500">{{ supplier.purchase_unit_code || item.unit_code || '-' }}</td>
              </tr>
              <tr v-if="!suppliers.length"><td colspan="7" class="empty-cell">ยังไม่มี supplier</td></tr>
            </tbody>
          </table>
        </DataPanel>

        <DataPanel title="บิลซื้อล่าสุด 5 ใบ">
          <table class="detail-table min-w-[760px]">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เอกสาร</th>
                <th>เจ้าหนี้</th>
                <th class="text-right">จำนวน</th>
                <th>หน่วย</th>
                <th class="text-right">ราคา/หน่วย<br /><span class="font-normal text-slate-400">(ถอด VAT)</span></th>
                <th class="text-right">ยอดรวม<br /><span class="font-normal text-slate-400">(ถอด VAT)</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bill in lastPurchases" :key="`${bill.doc_no}-${bill.ap_code}`">
                <td>{{ formatDate(bill.doc_date) }}</td>
                <td class="font-mono text-xs">{{ bill.doc_no }}</td>
                <td>
                  <div class="font-medium" :class="String(bill.tax_type) === '1' ? 'text-red-600' : 'text-slate-700'">{{ bill.ap_name || '-' }}<span v-if="String(bill.tax_type) === '1'" class="ml-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold align-middle" title="มีภาษี">VAT</span></div>
                  <div class="text-xs text-slate-400">{{ bill.ap_code }}</div>
                </td>
                <td class="text-right tabular-nums">{{ formatQty(bill.qty) }}</td>
                <td class="text-xs text-slate-500">{{ bill.unit_code || '-' }}</td>
                <td class="text-right tabular-nums">{{ formatMoney(bill.price) }}</td>
                <td class="text-right font-medium tabular-nums text-slate-800">{{ formatMoney(bill.sum_amount) }}</td>
              </tr>
              <tr v-if="!lastPurchases.length"><td colspan="7" class="empty-cell">ไม่พบประวัติซื้อ</td></tr>
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
                <td>
                  <div class="font-medium text-slate-700">{{ customer.cust_name || '-' }}</div>
                  <div class="text-xs text-slate-400">{{ customer.cust_code }}</div>
                </td>
                <td class="text-right tabular-nums">{{ formatQty(customer.qty) }} <span class="text-xs text-slate-400">{{ item.unit_code }}</span></td>
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
                <th>หน่วย</th>
                <th class="text-right">รอ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pendingReceive" :key="`${row.doc_no}-${row.ap_code}`">
                <td>{{ formatDate(row.doc_date) }}</td>
                <td class="font-mono text-xs">{{ row.doc_no }}</td>
                <td>
                  <div class="font-medium" :class="String(row.tax_type) === '1' ? 'text-red-600' : 'text-slate-700'">{{ row.ap_name || '-' }}<span v-if="String(row.tax_type) === '1'" class="ml-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold align-middle" title="มีภาษี">VAT</span></div>
                  <div class="text-xs text-slate-400">{{ row.ap_code }}</div>
                </td>
                <td class="text-right tabular-nums">{{ formatQty(row.qty) }}</td>
                <td class="text-xs text-slate-500">{{ row.unit_code || '-' }}</td>
                <td class="text-right tabular-nums">{{ formatInt(row.waiting_days) }} วัน</td>
              </tr>
              <tr v-if="!pendingReceive.length"><td colspan="6" class="empty-cell">ไม่พบเอกสารค้างรับ</td></tr>
            </tbody>
          </table>
        </DataPanel>
      </section>

      <!-- ทยอยรับ (trans_flag=310) — 5 ใบล่าสุด -->
      <section class="mb-4 mt-4">
        <DataPanel title="ทยอยรับ (10 ใบล่าสุด)">
          <table class="detail-table min-w-[760px]">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เวลา</th>
                <th>เอกสาร</th>
                <th>เจ้าหนี้</th>
                <th class="text-right">จำนวน</th>
                <th>หน่วย</th>
                <th class="text-right">ราคา/หน่วย<br /><span class="font-normal text-slate-400">(ถอด VAT)</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in billReceive" :key="row.doc_no">
                <td>{{ formatDate(row.doc_date) }}</td>
                <td class="tabular-nums text-slate-500">{{ row.doc_time || '-' }}</td>
                <td class="font-mono text-xs">{{ row.doc_no }}</td>
                <td>
                  <div class="font-medium" :class="String(row.tax_type) === '1' ? 'text-red-600' : 'text-slate-700'">{{ row.ap_name || '-' }}<span v-if="String(row.tax_type) === '1'" class="ml-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold align-middle" title="มีภาษี">VAT</span></div>
                  <div class="text-xs text-slate-400">{{ row.ap_code || '-' }}</div>
                </td>
                <td class="text-center tabular-nums">{{ formatQty(row.qty) }}</td>
                <td class="text-xs text-slate-500">{{ row.unit_code || '-' }}</td>
                <td class="text-right tabular-nums">{{ formatMoney(row.price_exclude_vat) }}</td>
              </tr>
              <tr v-if="!billReceive.length"><td colspan="7" class="empty-cell">ไม่พบเอกสารทยอยรับ</td></tr>
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
const billReceive = ref([]) // ทยอยรับ (trans_flag=310)
const suppliers = ref([])
const units = ref([]) // หน่วยนับทั้งหมดของสินค้า (จาก ic_unit_use)
const hoverBar = ref(null) // แท่งกราฟที่กำลัง hover เพื่อแสดง tooltip

const imageSrc = computed(() => imageFailed.value ? placeholderSvg.value : (item.value.image_url || placeholderSvg.value))
const placeholderSvg = computed(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#f1f5f9"/><text x="50%" y="50%" text-anchor="middle" fill="#94a3b8" font-family="Arial" font-size="22">No image</text></svg>')}`)
const barcodeText = computed(() => barcodes.value.map((row) => row.barcode).filter(Boolean).slice(0, 3).join(', ') || '-')
const dAvgNote = computed(() => {
  const method = item.value.d_avg_method === 'median' ? 'Median' : item.value.d_avg_method === 'mean' ? 'Mean' : '-'
  const frequency = `${(Number(item.value.sales_frequency || 0) * 100).toFixed(1)}%`
  return `${method} · freq ${frequency} · ${formatInt(item.value.sales_days)} / ${formatInt(item.value.active_stock_days)} วันขาย`
})
const maxChartValue = computed(() => Math.max(1, ...movementChart.value.flatMap((row) => [
  Number(row.sale_qty || 0),
  Number(row.purchase_qty || 0),
  Number(row.receive_qty || 0),
  Number(row.credit_note_qty || 0),
])))
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
    billReceive.value = data.bill_receive || []
    suppliers.value = data.suppliers || []
    // ดึงหน่วยนับ (parallel — ไม่บล็อก detail หลัก)
    try {
      const { data: unitData } = await api.get(`/purchase-planning/items/${encodeURIComponent(itemCode.value)}/units`)
      units.value = unitData.units || []
    } catch {
      units.value = []
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function barHeight(value) {
  // ใช้ px แทน % เพราะใน flexbox % อ้างอิงจาก content ไม่ใช่ parent height → bar สูง 0 ไม่แสดง
  // ความสูงกราฟสูงสุด ~220px (h-56 = 224px)
  const px = Math.max(2, Math.round((Number(value || 0) / maxChartValue.value) * 220))
  return `${px}px`
}

function hasMovement(row) {
  return Number(row.sale_qty) > 0 || Number(row.purchase_qty) > 0 || Number(row.receive_qty) > 0 || Number(row.credit_note_qty) > 0
}

function formatTooltipDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })
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

// กำไรขั้นต้น
function formatProfit(amountExclVat, cost) {
  const profit = Number(amountExclVat || 0) - Number(cost || 0)
  return formatMoney(profit)
}
function formatPct(amountExclVat, cost) {
  const amt = Number(amountExclVat || 0)
  if (amt === 0) return '0.0'
  const profit = amt - Number(cost || 0)
  return (profit * 100 / amt).toFixed(1)
}
function profitColor(amountExclVat, cost) {
  const amt = Number(amountExclVat || 0)
  if (amt === 0) return 'text-slate-400'
  const profit = amt - Number(cost || 0)
  if (profit > 0) return 'text-emerald-600'
  if (profit < 0) return 'text-red-600'
  return 'text-slate-500'
}

// คำนวณราคาขาย/กำไร ต่อหน่วยนับ — ฐานยอดขายสุทธิ 365 วัน (หน่วยหลัก)
// qty_365 เก็บในหน่วยหลัก, amount/cost ไม่ขึ้นหน่วย → ราคา/หน่วย = (total / qty_base) × ratio
const salesBaseQty = computed(() => Number(salesTotals.value.qty_365 || 0))
function avgSalePricePerUnit(ratio) {
  if (salesBaseQty.value <= 0) return null
  const avg = Number(salesTotals.value.amount_net_365 || 0) / salesBaseQty.value
  return avg * Number(ratio || 1)
}
function avgCostPerUnit(ratio) {
  if (salesBaseQty.value <= 0) return null
  const avg = Number(salesTotals.value.cost_net_365 || 0) / salesBaseQty.value
  return avg * Number(ratio || 1)
}
function profitPerUnit(ratio) {
  const sale = avgSalePricePerUnit(ratio)
  const cost = avgCostPerUnit(ratio)
  if (sale === null || cost === null) return null
  return sale - cost
}
function profitPerUnitColor(ratio) {
  const p = profitPerUnit(ratio)
  if (p === null) return 'text-slate-400'
  if (p > 0) return 'text-emerald-600'
  if (p < 0) return 'text-red-600'
  return 'text-slate-500'
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}

function statusLabel(status) {
  return {
    low: 'สต๊อกต่ำกว่าเกณฑ์',
    normal: 'สต๊อกปกติ',
    high: 'สต๊อกสูงกว่าเกณฑ์',
    inactive: 'สต๊อกไม่เคลื่อนไหว',
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
