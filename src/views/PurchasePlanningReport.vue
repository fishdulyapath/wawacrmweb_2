<template>
  <div class="p-4 lg:p-6">
    <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">{{ pageTitle }}</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ pageSubtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink to="/purchase-planning/master" class="btn-secondary">กำหนด master</RouterLink>
        <RouterLink v-if="alertOnly" to="/purchase-planning/report" class="btn-secondary">รายงานทั้งหมด</RouterLink>
        <RouterLink to="/purchase-planning/cart" class="relative btn-secondary" title="ตะกร้าสั่งซื้อ">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span v-if="cartCount > 0" class="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{{ cartCount }}</span>
        </RouterLink>
        <RouterLink v-if="cartCount > 0" to="/purchase-planning/cart" class="btn-primary">สร้าง PR ({{ cartCount }})</RouterLink>
      </div>
    </div>

    <section class="card mb-4 p-4">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div class="xl:col-span-2">
          <label class="label-text" for="planning-report-search">ค้นหาสินค้า</label>
          <input id="planning-report-search" v-model="filter.search" class="input-field" placeholder="รหัสสินค้า ชื่อสินค้า หรือ barcode" @keyup.enter="load" />
        </div>
        <div>
          <label class="label-text" for="planning-report-days">D_avg</label>
          <select id="planning-report-days" v-model.number="filter.days" class="input-field">
            <option :value="30">30 วัน</option>
            <option :value="90">90 วัน</option>
            <option :value="180">180 วัน</option>
            <option :value="365">365 วัน</option>
          </select>
        </div>
        <div>
          <label class="label-text" for="planning-report-date">วันที่คำนวณ</label>
          <input id="planning-report-date" v-model="filter.as_of_date" type="date" class="input-field" />
        </div>
        <div>
          <label class="label-text" for="planning-report-wh">คลัง</label>
          <input id="planning-report-wh" v-model="filter.warehouse" class="input-field font-mono" />
        </div>
        <div class="flex items-end gap-2">
          <button class="btn-primary min-h-10 flex-1 justify-center" :disabled="isBusy" @click="load">โหลด</button>
          <button class="btn-secondary min-h-10 justify-center" :disabled="isBusy" @click="resetFilter">ล้าง</button>
        </div>
      </div>
    </section>

    <section v-if="showProgress" class="card mb-4 p-4">
      <div class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-slate-800">ความคืบหน้าการโหลดรายงาน</p>
          <p class="text-xs text-slate-400">{{ progressStatusText }}</p>
        </div>
        <strong class="text-lg tabular-nums text-blue-700">{{ progressPercent }}%</strong>
      </div>
      <div class="h-3 overflow-hidden rounded-full bg-slate-100">
        <div class="h-full rounded-full bg-blue-600 transition-all duration-300" :style="{ width: `${progressPercent}%` }"></div>
      </div>
    </section>

    <section class="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <div v-for="card in summaryCards" :key="card.key" class="card p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-bold" :class="card.class">{{ card.value }}</p>
        <p class="mt-0.5 text-xs text-slate-400">{{ card.note }}</p>
      </div>
    </section>

    <section v-if="hasNoSupplierLinks" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <p class="font-medium">ยังไม่มีข้อมูลผูกสินค้า+เจ้าหนี้ในหน้ารายงานนี้</p>
        <RouterLink to="/purchase-planning/master" class="btn-secondary border-amber-300 bg-white text-amber-900 hover:bg-amber-100">ไป sync master</RouterLink>
      </div>
    </section>

    <section class="mb-4 grid gap-4 xl:grid-cols-2">
      <div class="card overflow-hidden">
        <div class="chart-header">
          <h2 class="chart-title text-white">จำนวนแนะนำซื้อรวม / ผู้จัดจำหน่าย</h2>
        </div>
        <div class="h-[260px] overflow-y-auto p-4">
          <div v-if="supplierOrderChart.length" class="space-y-3">
            <div v-for="supplier in supplierOrderChart" :key="supplier.ap_code" class="supplier-chart-row">
              <div class="supplier-chart-label" :title="`${supplier.ap_code} - ${supplier.ap_name}`">
                {{ shortSupplierLabel(supplier) }}
              </div>
              <div class="supplier-chart-track">
                <div class="supplier-chart-bar" :style="{ width: supplierOrderWidth(supplier) }"></div>
                <span class="supplier-chart-value">{{ formatQty(supplier.suggest_qty) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="flex h-full items-center justify-center text-sm text-slate-400">
            ยังไม่มีสินค้าถึงจุดสั่งซื้อ
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="chart-header">
          <h2 class="chart-title text-white">ยอดขายเปรียบเทียบยอดสั่งซื้อ / สถานะสต๊อก</h2>
        </div>
        <div class="p-4">
          <div class="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span class="inline-flex items-center gap-1.5"><span class="legend-dot bg-sky-400"></span>ยอดขายย้อนหลัง 3 เดือน</span>
            <span class="inline-flex items-center gap-1.5"><span class="legend-dot bg-indigo-700"></span>ยอดสั่งซื้อย้อนหลัง 3 เดือน</span>
          </div>
          <div v-if="stockStatusAmountChart.length" class="compare-chart">
            <div class="compare-axis">
              <span v-for="tick in amountAxisTicks" :key="tick">{{ formatCompactMoney(tick) }}</span>
            </div>
            <div class="compare-plot">
              <div class="compare-grid">
                <span v-for="tick in amountAxisTicks" :key="`grid-${tick}`"></span>
              </div>
              <div class="compare-bars">
                <div v-for="row in stockStatusAmountChart" :key="row.stock_status" class="compare-group">
                  <div class="compare-bar-pair">
                    <div
                      class="compare-bar bg-sky-400"
                      :style="{ height: statusBarHeight(row.sale_amount_3m) }"
                      :title="`ยอดขาย ${formatMoney(row.sale_amount_3m)}`"
                    ></div>
                    <div
                      class="compare-bar bg-indigo-700"
                      :style="{ height: statusBarHeight(row.purchase_amount_3m) }"
                      :title="`ยอดสั่งซื้อ ${formatMoney(row.purchase_amount_3m)}`"
                    ></div>
                  </div>
                  <div class="compare-label">{{ chartStatusLabel(row.stock_status) }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex h-[220px] items-center justify-center text-sm text-slate-400">
            ยังไม่มีข้อมูลยอดขาย/ยอดซื้อย้อนหลัง
          </div>
        </div>
      </div>
    </section>

    <section class="mb-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div class="card p-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="chart-title">สถานะสต็อก</h2>
          <span class="text-xs text-slate-400">ข้อมูลรวมที่คำนวณแล้ว</span>
        </div>
        <div class="mb-4 flex h-4 overflow-hidden rounded-full bg-slate-100">
          <div
            v-for="segment in statusSegments"
            :key="segment.key"
            class="h-full"
            :class="segment.barClass"
            :style="{ width: `${segment.percent}%` }"
            :title="`${segment.label}: ${segment.count}`"
          ></div>
        </div>
        <div class="space-y-2">
          <div v-for="segment in statusSegments" :key="segment.key" class="flex items-center justify-between gap-3 text-sm">
            <div class="flex min-w-0 items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full" :class="segment.dotClass"></span>
              <span class="truncate text-slate-600">{{ segment.label }}</span>
            </div>
            <span class="font-semibold tabular-nums text-slate-800">{{ formatInt(segment.count) }}</span>
          </div>
        </div>
      </div>

      <div class="card p-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="chart-title">Top แนะนำซื้อ</h2>
          <span class="text-xs text-slate-400">เรียงตามจำนวนแนะนำซื้อ</span>
        </div>
        <div v-if="topSuggestRows.length" class="space-y-3">
          <div v-for="row in topSuggestRows" :key="row.ic_code" class="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3">
            <div class="min-w-0">
              <div class="mb-1 flex items-center justify-between gap-2 text-xs">
                <span class="truncate font-medium text-slate-700">{{ row.ic_name || row.ic_code }}</span>
                <span class="shrink-0 font-semibold tabular-nums text-blue-700">{{ formatQty(row.suggest_qty) }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-blue-500" :style="{ width: topSuggestWidth(row) }"></div>
              </div>
            </div>
            <a :href="detailHref(row)" target="_blank" rel="noopener" class="text-right text-xs font-medium text-blue-600 hover:underline">detail</a>
          </div>
        </div>
        <p v-else class="py-8 text-center text-sm text-slate-400">ไม่มีรายการแนะนำซื้อในหน้าปัจจุบัน</p>
      </div>

      <!-- <div class="card p-4">
        <div class="mb-4">
          <h2 class="chart-title">ความพร้อม supplier</h2>
          <p class="mt-0.5 text-xs text-slate-400">ใช้ตรวจว่าพร้อม expand และเลือก supplier หรือยัง</p>
        </div>
        <div class="space-y-4">
          <div>
            <div class="mb-1 flex justify-between text-sm">
              <span class="text-slate-600">มี supplier</span>
              <strong class="text-slate-800">{{ formatInt(supplierCoverage.withSupplier) }}</strong>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-green-500" :style="{ width: supplierCoverage.withPercent }"></div>
            </div>
          </div>
          <div>
            <div class="mb-1 flex justify-between text-sm">
              <span class="text-slate-600">ยังไม่มี supplier</span>
              <strong class="text-slate-800">{{ formatInt(supplierCoverage.withoutSupplier) }}</strong>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-amber-500" :style="{ width: supplierCoverage.withoutPercent }"></div>
            </div>
          </div>
          <div class="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            รายการที่ไม่มี supplier จะยังสร้าง PU อัตโนมัติไม่ได้ ต้อง sync หรือกำหนดคู่สินค้า+เจ้าหนี้ก่อน
          </div>
        </div>
      </div> -->
    </section>

    <section class="card overflow-hidden">
      <div v-if="loading && rows.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400">
        <svg class="mr-2 h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p class="mt-3">กำลังคำนวณรายงานทั้งหมดและเรียงตามจำนวนแนะนำซื้อ...</p>
        <p v-if="total > 0" class="mt-1 text-xs text-slate-400">ประมวลผล {{ formatInt(processed) }} / {{ formatInt(total) }} รายการ</p>
      </div>

      <div v-else-if="error" class="py-16 text-center">
        <p class="font-medium text-red-500">{{ error }}</p>
        <button class="btn-secondary mx-auto mt-3" @click="load">ลองใหม่</button>
      </div>

      <div v-else class="overflow-x-auto">
        <div v-if="jobStatus && jobStatus !== 'complete'" class="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          กำลังคำนวณต่อในพื้นหลัง {{ formatInt(processed) }} / {{ formatInt(total) }} รายการ แถวที่แสดงเป็นผลลัพธ์ที่คำนวณแล้วและเรียงตามแนะนำซื้อ
        </div>

        <!-- Toggle คอลัมน์เพิ่มเติม (desktop เท่านั้น) -->
        <div class="hidden items-center justify-end gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2 lg:flex">
          <label class="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input v-model="showExtraColumns" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            แสดงคอลัมน์เพิ่มเติม (คงเหลือ/ค้างxxx/D_avg/Min/Max/Cover)
          </label>
        </div>

        <table class="w-full text-sm" :class="showExtraColumns ? 'min-w-[1640px]' : 'min-w-[1040px]'">
          <thead class="border-b border-slate-200 bg-slate-50">
            <tr>
              <th class="table-head w-12 text-center"></th>
              <th class="table-head w-60 text-left">สินค้า</th>
              <th class="table-head min-w-56 text-left">เจ้าหนี้เริ่มต้น</th>
              <th class="table-head w-24 text-right">พร้อมใช้</th>
              <th v-if="showExtraColumns" class="table-head w-24 text-right">คงเหลือ</th>
              <th v-if="showExtraColumns" class="table-head w-24 text-right">ค้างรับ</th>
              <th v-if="showExtraColumns" class="table-head w-24 text-right">ค้างจอง</th>
              <th v-if="showExtraColumns" class="table-head w-24 text-right">ค้างส่ง</th>
              <th v-if="showExtraColumns" class="table-head w-24 text-right">D_avg</th>
              <th v-if="showExtraColumns" class="table-head w-24 text-right">Min/ROP</th>
              <th v-if="showExtraColumns" class="table-head w-24 text-right">Max</th>
              <th v-if="showExtraColumns" class="table-head w-28 text-right">มูลค่าขายสุทธิ</th>
              <th v-if="showExtraColumns" class="table-head w-28 text-right">ต้นทุนสุทธิ</th>
              <th v-if="showExtraColumns" class="table-head w-28 text-right">กำไร(ขาดทุน)</th>
              <th v-if="showExtraColumns" class="table-head w-20 text-right">%กำไร</th>
              <th class="table-head w-28 text-right">แนะนำซื้อ</th>
              <th class="table-head w-40 text-left">สถานะ</th>
              <th v-if="showExtraColumns" class="table-head w-28 text-right">Cover</th>
              <th class="table-head w-24 text-right">ราคา</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template v-for="row in rows" :key="row.ic_code">
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 text-center">
                  <button class="cart-add-btn" :title="Number(row.suggest_qty || 0) > 0 ? 'ใส่ตะกร้า (ใช้ยอดแนะนำซื้อ)' : 'ใส่ตะกร้า (ไม่มียอดแนะนำซื้อ → ใช้ MOQ/1)'" @click="addToCartFromRow(row)">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </button>
                </td>
                <td class="px-4 py-3">
                  <a :href="detailHref(row)" target="_blank" rel="noopener" class="font-semibold text-blue-600 hover:underline">{{ row.ic_name || '-' }}</a>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span class="code-pill">{{ row.ic_code }}</span>
                    <span class="text-xs text-slate-400">{{ row.unit_code || '-' }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <!-- ปุ่มเปิดดูรายละเอียดเจ้าหนี้ (สวยใหม่) -->
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="supplier-toggle-btn"
                      :class="{ 'supplier-toggle-btn--open': expanded[row.ic_code] }"
                      :disabled="Number(row.supplier_count || 0) === 0"
                      :title="expandTitle(row)"
                      @click="toggleExpand(row)"
                    >
                      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" :d="expanded[row.ic_code] ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'" />
                      </svg>
                      <span class="supplier-toggle-count">{{ formatInt(row.supplier_count) }}</span>
                    </button>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-medium text-slate-800 truncate">{{ selectedSupplierName(row) }}</span>
                        <span v-if="Number(row.is_preferred) === 1" class="preferred-badge" title="เจ้าหนี้หลัก">หลัก</span>
                      </div>
                      <div class="text-xs text-slate-400">{{ selectedSupplierCode(row) || '-' }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ formatQty(row.available_qty) }} <span class="text-xs font-normal text-slate-400">{{ row.unit_code }}</span></td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums">{{ formatQty(row.balance_qty) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums">{{ formatQty(row.accrued_in_qty_calc) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums">{{ formatQty(row.book_out_qty) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums">{{ formatQty(row.accrued_out_qty_calc) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums">{{ formatQty(row.d_avg) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums">{{ formatQty(row.min_stock) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums">{{ formatQty(row.max_stock) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums text-slate-600">{{ formatMoney(row.amount_net_3m) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums text-slate-600">{{ formatMoney(row.cost_net_3m) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums" :class="profitColor(row.profit_lost_amount_3m)">{{ formatMoney(row.profit_lost_amount_3m) }}</td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums" :class="profitPctColor(row.profit_lost_amount_3m, row.amount_net_3m)">{{ formatPct(row.profit_lost_amount_3m, row.amount_net_3m) }}%</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums text-blue-700">{{ formatQty(row.suggest_qty) }} <span class="text-xs font-normal text-slate-400">{{ row.unit_code }}</span></td>
                <td class="px-4 py-3"><span :class="statusClass(row.stock_status)">{{ statusLabel(row.stock_status) }}</span></td>
                <td v-if="showExtraColumns" class="px-4 py-3 text-right tabular-nums">{{ row.stock_cover_days === null ? '-' : `${formatQty(row.stock_cover_days)} วัน` }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatMoney(selectedSupplierPrice(row)) }}</td>
              </tr>

              <tr v-if="expanded[row.ic_code]" class="bg-slate-50/70">
                <td :colspan="showExtraColumns ? 19 : 7" class="px-4 py-4 sm:px-8">
                  <div v-if="supplierLoading[row.ic_code]" class="py-6 text-center text-sm text-slate-400">กำลังโหลด supplier...</div>
                  <div v-else-if="supplierErrors[row.ic_code]" class="py-4 text-center text-sm text-red-500">{{ supplierErrors[row.ic_code] }}</div>
                  <div v-else class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table class="w-full min-w-[720px] text-sm">
                      <thead class="bg-slate-50">
                        <tr>
                          <th class="supplier-head w-16 text-center">ใส่ตะกร้า</th>
                          <th class="supplier-head text-left">เจ้าหนี้</th>
                          <th class="supplier-head w-28 text-right">ราคา</th>
                          <th class="supplier-head w-24 text-right">Lead</th>
                          <th class="supplier-head w-24 text-right">Late</th>
                          <th class="supplier-head w-28 text-right">Wholesale</th>
                          <th class="supplier-head w-24 text-right">Cycle</th>
                          <th class="supplier-head w-24 text-right">MOQ</th>
                          <th class="supplier-head w-28 text-right">แนะนำซื้อ</th>
                          <th class="supplier-head w-32 text-left">ซื้อล่าสุด</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        <tr v-if="!supplierRows(row).length">
                          <td colspan="10" class="py-8 text-center text-slate-400">ยังไม่มี supplier ที่ผูกกับสินค้านี้</td>
                        </tr>
                        <tr v-for="supplier in supplierRows(row)" :key="`${row.ic_code}-${supplier.ap_code}`" class="hover:bg-slate-50">
                          <td class="px-3 py-2 text-center">
                            <button class="cart-add-btn" title="ใส่ตะกร้าจากเจ้าหนี้นี้" @click="addToCartFromSupplier(row, supplier)">
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </button>
                          </td>
                          <td class="px-3 py-2">
                            <div class="font-medium text-slate-800">{{ supplier.ap_name || '-' }}</div>
                            <div class="text-xs text-slate-400">{{ supplier.ap_code }}</div>
                          </td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatMoney(supplier.last_purchase_price) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatInt(supplier.lead_time_days) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatInt(supplier.late_buffer_days) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatInt(supplier.wholesale_buffer_days) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatInt(supplier.order_cycle_days) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(supplier.min_order_qty) }}</td>
                          <td class="px-3 py-2 text-right font-semibold text-blue-700 tabular-nums">{{ formatQty(supplier.suggest_qty) }}</td>
                          <td class="px-3 py-2 text-xs text-slate-500">{{ formatDate(supplier.last_purchase_date) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>

            <tr v-if="rows.length === 0">
              <td :colspan="showExtraColumns ? 19 : 7" class="py-16 text-center text-slate-400">ไม่พบข้อมูลตามเงื่อนไข</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error && total > 0" class="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p class="text-center text-sm text-slate-500 lg:text-left">แสดง {{ formatInt(rows.length) }} จาก {{ formatInt(displayTotal) }} รายการ เรียงตามจำนวนแนะนำซื้อจากมากไปน้อย</p>
        <div class="flex justify-center gap-1">
          <button class="pager-btn" :disabled="jobStatus !== 'complete' || !hasMore || loadingMore" @click="loadMore">
            {{ jobStatus !== 'complete' ? 'รอคำนวณครบ' : loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่ม' }}
          </button>
        </div>
      </div>
    </section>

    <ConfirmDialog
      :open="noticeDialog.open"
      :title="noticeDialog.title"
      :message="noticeDialog.message"
      :detail="noticeDialog.detail"
      confirm-label="รับทราบ"
      :show-cancel="false"
      tone="info"
      @confirm="noticeDialog.open = false"
      @cancel="noticeDialog.open = false"
    />

    <!-- Toast feedback สั้นเมื่อเพิ่มลงตะกร้า -->
    <Transition name="toast">
      <div v-if="toastMsg" class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        ✓ {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import api from '../composables/useApi.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAuthStore } from '../stores/auth.js'
import { usePlanningCart } from '../composables/usePlanningCart.js'

const props = defineProps({
  alertOnly: { type: Boolean, default: false },
})

const auth = useAuthStore()
const { cartCount, addToCart } = usePlanningCart()
const toastMsg = ref('')
let toastTimer = null
const canTriggerAlert = computed(() => {
  const user = auth.user || {}
  return String(user.code || '').toUpperCase() === 'SUPERADMIN' || user.role === 'admin'
})

// เพิ่มลงตะกร้าพร้อม toast feedback สั้น
function addToCartFromRow(row) {
  const suggest = Number(row.suggest_qty || 0)
  // ถ้าไม่มีแนะนำซื้อ → ใช้ MOQ ของเจ้าหนี้ที่เลือก, ถ้าไม่มี MOQ ด้วย → ใช้ 1
  const qty = suggest > 0 ? suggest : (selectedSupplierMOQ(row) > 0 ? selectedSupplierMOQ(row) : 1)
  addToCart({
    ic_code: row.ic_code,
    ic_name: row.ic_name,
    unit_code: row.unit_code,
    ap_code: selectedSupplierCode(row),
    ap_name: selectedSupplierName(row),
    qty,
    price: Number(selectedSupplierPrice(row) || 0),
    suggest_qty: suggest,
  })
  showToast(`เพิ่ม "${row.ic_name || row.ic_code}" ลงตะกร้าแล้ว`)
}

function addToCartFromSupplier(row, supplier) {
  const suggest = Number(supplier.suggest_qty || 0)
  // ถ้า supplier นี้ไม่มียอดแนะนำซื้อ → ใช้ MOQ, ถ้าไม่มี MOQ ด้วย → ใช้ 1
  const qty = suggest > 0 ? suggest : (Number(supplier.min_order_qty || 0) > 0 ? Number(supplier.min_order_qty) : 1)
  addToCart({
    ic_code: row.ic_code,
    ic_name: row.ic_name,
    unit_code: supplier.last_purchase_unit_code || row.unit_code,
    ap_code: supplier.ap_code,
    ap_name: supplier.ap_name,
    qty,
    price: Number(supplier.last_purchase_price || 0),
    suggest_qty: suggest,
  })
  showToast(`เพิ่ม "${row.ic_name || row.ic_code}" จาก "${supplier.ap_name || supplier.ap_code}" ลงตะกร้าแล้ว`)
}

function showToast(msg) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
}
const triggering = ref(false)
const triggerResult = ref('')

async function triggerAlert() {
  triggering.value = true
  triggerResult.value = ''
  try {
    const { data } = await api.post('/purchase-planning/trigger-alert')
    triggerResult.value = data.skipped
      ? 'ไม่มี user ที่เปิดแจ้งเตือน'
      : `ส่งแล้ว ${data.sent} คน / พบสินค้า ${data.itemCount} รายการ`
  } catch (err) {
    triggerResult.value = `ผิดพลาด: ${err.message}`
  } finally {
    triggering.value = false
    setTimeout(() => { triggerResult.value = '' }, 8000)
  }
}

const today = new Date().toISOString().slice(0, 10)
const filter = reactive({
  search: '',
  days: 30,
  as_of_date: today,
  warehouse: 'MMA01',
})
const rows = ref([])
const total = ref(0)
const limit = ref(30)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const summary = ref({})
const jobId = ref('')
const jobStatus = ref('')
const processed = ref(0)
const hasMore = ref(false)
const selected = reactive({})
const expanded = reactive({})
const showExtraColumns = ref(true) // toggle คอลัมน์เพิ่มเติม (ค้างรับ/ค้างจอง/ค้างส่ง/D_avg/Min/Max/Cover) — default เปิด
const suppliersByItem = reactive({})
const supplierLoading = reactive({})
const supplierErrors = reactive({})
const noticeDialog = reactive({
  open: false,
  title: '',
  message: '',
  detail: '',
})
let pollTimer = null
let loadSeq = 0

const alertOnly = computed(() => props.alertOnly)
const pageTitle = computed(() => alertOnly.value ? 'แจ้งเตือนสั่งซื้อ' : 'รายงานวางแผนสั่งซื้อ')
const pageSubtitle = computed(() => alertOnly.value
  ? 'แสดงสินค้าที่พร้อมใช้ต่ำกว่าหรือเท่ากับจุดสั่งซื้อ กดชื่อสินค้าเพื่อดูรายละเอียด'
  : '1 แถวต่อสินค้า เลือกเจ้าหนี้เริ่มต้นจากราคาซื้อล่าสุดที่ถูกที่สุด และกดขยายเพื่อดูเจ้าหนี้รายอื่น')
const displayTotal = computed(() => alertOnly.value ? Number(summary.value.total || rows.value.length || 0) : total.value)
const isBusy = computed(() => loading.value || loadingMore.value)
const selectedCount = computed(() => Object.values(selected).filter(Boolean).length)
const showProgress = computed(() => loading.value || jobStatus.value === 'running' || jobStatus.value === 'queued' || processed.value > 0)
const progressPercent = computed(() => {
  if (jobStatus.value === 'complete' && total.value > 0) return 100
  if (!total.value) return processed.value > 0 ? 100 : 0
  return Math.min(100, Math.max(0, Math.round((Number(processed.value || 0) / Number(total.value || 1)) * 100)))
})
const progressStatusText = computed(() => {
  if (jobStatus.value === 'complete') return `โหลดครบแล้ว ${formatInt(processed.value || total.value)} / ${formatInt(total.value)} รายการ`
  if (jobStatus.value === 'failed') return 'โหลดรายงานไม่สำเร็จ'
  return `ประมวลผลแล้ว ${formatInt(processed.value)} / ${formatInt(total.value)} รายการ`
})
const summaryCards = computed(() => [
  { key: 'total', label: alertOnly.value ? 'รายการแจ้งเตือน' : 'สินค้าทั้งหมด', value: formatInt(summary.value.total), note: summaryNote.value, class: 'text-slate-800' },
  { key: 'low', label: alertOnly.value ? 'ถึงจุดสั่งซื้อ' : 'ต่ำกว่าเกณฑ์', value: formatInt(summary.value.low), note: 'available <= Min/ROP', class: 'text-red-600' },
  { key: 'normal', label: 'ปกติ', value: formatInt(summary.value.normal), note: 'อยู่ในช่วง Min-Max', class: 'text-green-600' },
  { key: 'high', label: 'สูงกว่าเกณฑ์', value: formatInt(summary.value.high), note: 'available > Max', class: 'text-amber-600' },
  { key: 'มูลค่าแนะนำซื้อ', label: 'มูลค่าแนะนำซื้อ', value: formatMoney(summary.value.suggest_amount), note: 'คำนวณจากราคาซื้อ default', class: 'text-blue-600' },
])
const summaryNote = computed(() => {
  if (jobStatus.value !== 'complete') return `กำลังคำนวณ ${formatInt(processed.value)} / ${formatInt(total.value)} รายการ`
  return alertOnly.value
    ? `พบสินค้าถึงจุดสั่งซื้อ ${formatInt(displayTotal.value)} รายการ`
    : `รวมทั้งหมด ${formatInt(total.value)} รายการ`
})
const statusMeta = [
  { key: 'low', label: 'ต่ำกว่าเกณฑ์', barClass: 'bg-red-500', dotClass: 'bg-red-500' },
  { key: 'normal', label: 'ปกติ', barClass: 'bg-green-500', dotClass: 'bg-green-500' },
  { key: 'high', label: 'สูงกว่าเกณฑ์', barClass: 'bg-amber-500', dotClass: 'bg-amber-500' },
  { key: 'insufficient_sales_days', label: 'ข้อมูลขายไม่พอ', barClass: 'bg-blue-500', dotClass: 'bg-blue-500' },
  { key: 'inactive', label: 'ไม่เคลื่อนไหว', barClass: 'bg-slate-400', dotClass: 'bg-slate-400' },
]
const statusSegments = computed(() => {
  const totalRows = Math.max(1, Number(summary.value.total || rows.value.length || 0))
  return statusMeta.map((meta) => {
    const count = Number(summary.value[meta.key] || 0)
    return { ...meta, count, percent: Math.max(count ? 3 : 0, Math.round((count / totalRows) * 100)) }
  })
})
const topSuggestRows = computed(() => [...rows.value]
  .filter((row) => Number(row.suggest_qty || 0) > 0)
  .sort((a, b) => Number(b.suggest_qty || 0) - Number(a.suggest_qty || 0))
  .slice(0, 10))
const topSuggestMax = computed(() => Math.max(1, ...topSuggestRows.value.map((row) => Number(row.suggest_qty || 0))))
const supplierCoverage = computed(() => {
  const totalRows = Math.max(1, Number(summary.value.total || rows.value.length || 0))
  const withSupplier = Number(summary.value.with_supplier ?? rows.value.filter((row) => Number(row.supplier_count || 0) > 0).length)
  const withoutSupplier = Number(summary.value.without_supplier ?? Math.max(0, rows.value.length - withSupplier))
  return {
    withSupplier,
    withoutSupplier,
    withPercent: `${Math.round((withSupplier / totalRows) * 100)}%`,
    withoutPercent: `${Math.round((withoutSupplier / totalRows) * 100)}%`,
  }
})
const hasNoSupplierLinks = computed(() => rows.value.length > 0 && rows.value.every((row) => Number(row.supplier_count || 0) === 0))
const supplierOrderChart = computed(() => summary.value.supplier_order_chart || [])
const supplierOrderMax = computed(() => Math.max(1, ...supplierOrderChart.value.map((row) => Number(row.suggest_qty || 0))))
const stockStatusAmountChart = computed(() => summary.value.stock_status_amount_chart || [])
const statusAmountMax = computed(() => Math.max(
  1,
  ...stockStatusAmountChart.value.flatMap((row) => [
    Number(row.sale_amount_3m || 0),
    Number(row.purchase_amount_3m || 0),
  ]),
))
const amountAxisTicks = computed(() => {
  const max = statusAmountMax.value
  return [max, max * 0.67, max * 0.34, 0]
})

function requestParams() {
  return {
    search: filter.search || undefined,
    days: filter.days,
    as_of_date: filter.as_of_date,
    warehouse: filter.warehouse,
    limit: limit.value,
    alert_only: alertOnly.value ? 1 : undefined,
  }
}

function clearPollTimer() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

async function load() {
  const seq = ++loadSeq
  clearPollTimer()
  loading.value = true
  loadingMore.value = false
  error.value = ''
  rows.value = []
  summary.value = {}
  total.value = 0
  processed.value = 0
  hasMore.value = false
  jobId.value = ''
  jobStatus.value = 'queued'
  try {
    const { data } = await api.post('/purchase-planning/report-lazy', {
      ...requestParams(),
      batch_size: 5,
    })
    if (seq !== loadSeq) return
    jobId.value = data.job_id
    total.value = data.total || 0
    processed.value = data.processed || 0
    jobStatus.value = data.status || 'queued'
    await pollReportJob(seq)
  } catch (err) {
    if (seq !== loadSeq) return
    rows.value = []
    summary.value = {}
    error.value = err.message
  }
}

async function pollReportJob(seq) {
  if (!jobId.value || seq !== loadSeq) return
  try {
    const { data } = await api.get(`/purchase-planning/report-lazy/${encodeURIComponent(jobId.value)}`, {
      params: { offset: 0, limit: limit.value },
    })
    if (seq !== loadSeq) return
    jobStatus.value = data.status
    total.value = data.total || 0
    processed.value = data.processed || 0
    if (data.status === 'failed') throw new Error(data.error || 'คำนวณรายงานไม่สำเร็จ')
    if (data.status === 'complete') {
      rows.value = data.data || []
      summary.value = data.summary || {}
      hasMore.value = Boolean(data.has_more)
      loading.value = false
      return
    }
    // partial result: แสดง row ที่คำนวณแล้วให้ user เห็นความคืบหน้า แต่ยัง poll ต่อ
    // ไม่ตั้ง hasMore = false เพราะ job ยังไม่ complete (อาจมี row ที่ suggest_qty สูงกว่ามาทีหลัง)
    if ((data.data || []).length) {
      rows.value = data.data || []
    }
    summary.value = data.partial_summary || {}
    pollTimer = setTimeout(() => pollReportJob(seq), 1200)
  } catch (err) {
    if (seq !== loadSeq) return
    loading.value = false
    error.value = err.message
  }
}

async function loadMore() {
  if (!jobId.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const { data } = await api.get(`/purchase-planning/report-lazy/${encodeURIComponent(jobId.value)}`, {
      params: { offset: rows.value.length, limit: limit.value },
    })
    rows.value = [...rows.value, ...(data.data || [])]
    total.value = data.total || total.value
    summary.value = data.summary || summary.value
    hasMore.value = Boolean(data.has_more)
  } catch (err) {
    error.value = err.message
  } finally {
    loadingMore.value = false
  }
}

function resetFilter() {
  filter.search = ''
  filter.days = 30
  filter.as_of_date = today
  filter.warehouse = 'MMA01'
  load()
}

async function toggleExpand(row) {
  expanded[row.ic_code] = !expanded[row.ic_code]
  if (!expanded[row.ic_code] || suppliersByItem[row.ic_code]) return

  supplierLoading[row.ic_code] = true
  supplierErrors[row.ic_code] = ''
  try {
    const { data } = await api.get(`/purchase-planning/items/${encodeURIComponent(row.ic_code)}/suppliers`, {
      params: { days: filter.days, as_of_date: filter.as_of_date, warehouse: filter.warehouse },
    })
    suppliersByItem[row.ic_code] = data.data || []
  } catch (err) {
    supplierErrors[row.ic_code] = err.message
  } finally {
    supplierLoading[row.ic_code] = false
  }
}

function chooseSupplier(row, supplier) {
  row.selected_supplier_code = supplier.ap_code
  row.selected_supplier_name = supplier.ap_name
  row.selected_supplier_price = supplier.last_purchase_price
  row.suggest_qty = supplier.suggest_qty
  row.min_stock = supplier.min_stock
  row.max_stock = supplier.max_stock
}

function toggleSelected(row, checked) {
  selected[row.ic_code] = checked ? {
    item_code: row.ic_code,
    item_name: row.ic_name,
    selected_supplier_code: selectedSupplierCode(row),
    selected_supplier_name: selectedSupplierName(row),
    suggest_qty: Number(row.suggest_qty || 0),
  } : null
}

function isSelected(row) {
  return Boolean(selected[row.ic_code])
}

function selectedSupplierCode(row) {
  return row.selected_supplier_code || row.ap_code || ''
}

function selectedSupplierName(row) {
  return row.selected_supplier_name || row.ap_name || '-'
}

function selectedSupplierPrice(row) {
  return row.selected_supplier_price ?? row.last_purchase_price
}

// MOQ ของเจ้าหนี้ที่เลือกอยู่ (ใช้เป็น qty เริ่มต้นเมื่อ suggest_qty = 0)
function selectedSupplierMOQ(row) {
  const apCode = selectedSupplierCode(row)
  const list = supplierRows(row)
  const match = apCode ? list.find((s) => s.ap_code === apCode) : null
  if (match) return Number(match.min_order_qty || 0)
  // ถ้าไม่เจอเจ้าหนี้ที่เลือก → ใช้ MOQ ของเจ้าหนี้แรกที่มีค่า
  const withMoq = list.find((s) => Number(s.min_order_qty || 0) > 0)
  return withMoq ? Number(withMoq.min_order_qty || 0) : 0
}

function supplierRows(row) {
  return suppliersByItem[row.ic_code] || []
}

function expandTitle(row) {
  return Number(row.supplier_count || 0) === 0 ? 'ยังไม่มี supplier' : 'ดู supplier ทั้งหมด'
}

function detailLink(row) {
  return {
    path: `/purchase-planning/items/${encodeURIComponent(row.ic_code)}`,
    query: { days: filter.days, as_of_date: filter.as_of_date, warehouse: filter.warehouse },
  }
}

// สร้าง full URL สำหรับเปิด new tab (RouterLink + target=_blank ใน SPA ไม่เปิด tab จริง)
function detailHref(row) {
  const link = detailLink(row)
  const query = new URLSearchParams(link.query).toString()
  return `${link.path}${query ? `?${query}` : ''}`
}

function topSuggestWidth(row) {
  return `${Math.max(4, Math.round((Number(row.suggest_qty || 0) / topSuggestMax.value) * 100))}%`
}

function supplierOrderWidth(row) {
  return `${Math.max(3, Math.round((Number(row.suggest_qty || 0) / supplierOrderMax.value) * 100))}%`
}

function statusBarHeight(value) {
  return `${Math.max(Number(value || 0) > 0 ? 3 : 0, Math.round((Number(value || 0) / statusAmountMax.value) * 100))}%`
}

function shortSupplierLabel(supplier) {
  const code = supplier.ap_code === 'NO_SUPPLIER' ? '' : supplier.ap_code
  return [code, supplier.ap_name].filter(Boolean).join(' - ') || '-'
}

function chartStatusLabel(status) {
  return statusLabel(status).replace('ข้อมูลขายไม่พอ', 'ข้อมูลไม่พอ')
}

function showPuNotice() {
  Object.assign(noticeDialog, {
    open: true,
    title: 'สร้าง PU ยังไม่เปิดใช้งาน',
    message: 'ขั้นสร้าง PU จะทำเป็น phase สุดท้าย หลังตรวจรายงานและการเลือก supplier แล้ว',
    detail: selectedCount.value > 0 ? `เลือกไว้แล้ว ${formatInt(selectedCount.value)} รายการ` : '',
  })
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

// กำไรขั้นต้น: % และสี
function formatPct(profit, amount) {
  const amt = Number(amount || 0)
  if (amt === 0) return '0.0'
  return (Number(profit || 0) * 100 / amt).toFixed(1)
}
function profitColor(profit) {
  const p = Number(profit || 0)
  if (p > 0) return 'text-emerald-600 font-medium'
  if (p < 0) return 'text-red-600 font-medium'
  return 'text-slate-400'
}
function profitPctColor(profit, amount) {
  const pct = Number(formatPct(profit, amount))
  if (pct >= 15) return 'text-emerald-700 font-semibold'
  if (pct >= 5) return 'text-emerald-600 font-medium'
  if (pct > 0) return 'text-amber-600 font-medium'
  if (Number(amount || 0) > 0) return 'text-red-600 font-medium'
  return 'text-slate-400'
}

function formatCompactMoney(value) {
  const num = Number(value || 0)
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toLocaleString('th-TH', { maximumFractionDigits: 1 })}ล้าน`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toLocaleString('th-TH', { maximumFractionDigits: 0 })}พัน`
  return num.toLocaleString('th-TH', { maximumFractionDigits: 0 })
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

onMounted(() => load())
onBeforeUnmount(clearPollTimer)
watch(() => props.alertOnly, () => load())
</script>

<style scoped>
.table-head {
  @apply px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500;
}
.chart-title {
  @apply text-sm font-semibold text-slate-800;
}
.chart-header {
  @apply flex h-9 items-center border-b border-blue-800 bg-blue-700 px-3;
}
.chart-header .chart-title {
  @apply text-white;
}
.legend-dot {
  @apply inline-block h-3 w-3 rounded-full;
}
.supplier-chart-row {
  @apply grid grid-cols-[minmax(160px,42%)_minmax(0,1fr)] items-center gap-3;
}
.supplier-chart-label {
  @apply truncate text-right text-sm font-medium text-slate-600;
}
.supplier-chart-track {
  @apply relative h-6 overflow-hidden border-l border-slate-200;
}
.supplier-chart-bar {
  @apply h-full rounded-r bg-orange-200;
}
.supplier-chart-value {
  @apply absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold tabular-nums text-orange-700;
}
.compare-chart {
  @apply grid h-[220px] grid-cols-[52px_minmax(0,1fr)] gap-3;
}
.compare-axis {
  @apply flex h-full flex-col justify-between text-right text-xs tabular-nums text-slate-500;
}
.compare-plot {
  @apply relative h-full border-b border-slate-200;
}
.compare-grid {
  @apply pointer-events-none absolute inset-0 flex flex-col justify-between;
}
.compare-grid span {
  @apply block border-t border-dashed border-slate-200;
}
.compare-bars {
  @apply relative z-10 flex h-full items-end justify-around gap-3 px-3;
}
.compare-group {
  @apply flex h-full min-w-0 flex-1 flex-col justify-end;
}
.compare-bar-pair {
  @apply flex min-h-0 flex-1 items-end justify-center gap-2;
}
.compare-bar {
  @apply w-7 rounded-t opacity-90 shadow-sm;
}
.compare-label {
  @apply mt-2 min-h-8 text-center text-xs leading-tight text-slate-500;
}
.supplier-head {
  @apply px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500;
}
.code-pill {
  @apply rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600;
}
.status-badge {
  @apply inline-flex rounded-full px-2 py-0.5 text-xs font-semibold;
}
.icon-btn {
  @apply inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40;
}

/* ปุ่มเปิดดูรายละเอียดเจ้าหนี้ (พร้อมจำนวน supplier) */
.supplier-toggle-btn {
  @apply inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40;
}
.supplier-toggle-btn--open {
  @apply border-blue-500 bg-blue-600 text-white hover:bg-blue-700 hover:text-white;
}
.supplier-toggle-count {
  @apply rounded-full bg-slate-100 px-1.5 text-[10px] leading-4 text-slate-600;
}
.supplier-toggle-btn--open .supplier-toggle-count {
  @apply bg-white/25 text-white;
}

/* Badge "หลัก" สำหรับ preferred supplier */
.preferred-badge {
  @apply inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-700;
}
.pager-btn {
  @apply min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40;
}
/* ปุ่มใส่ตะกร้า (icon) */
.cart-add-btn {
  @apply inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30;
}
/* Toast animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
