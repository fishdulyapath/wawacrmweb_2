<template>
  <div class="p-4 lg:p-6">
    <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">{{ pageTitle }}</h1>
        <p class="mt-0.5 text-sm text-slate-500">{{ pageSubtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink v-if="canManagePlanningMaster" to="/purchase-planning/master" class="btn-secondary">กำหนด master</RouterLink>
        <RouterLink v-if="alertOnly" to="/purchase-planning/report" class="btn-secondary">รายงานทั้งหมด</RouterLink>
        <RouterLink to="/purchase-planning/cart" class="relative btn-secondary" title="ตะกร้าสั่งซื้อ">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span v-if="cartCount > 0" class="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{{ cartCount }}</span>
        </RouterLink>

        <RouterLink v-if="cartCount > 0" to="/purchase-planning/cart" class="btn-primary">สร้าง PR ({{ cartCount }})</RouterLink>
      </div>
    </div>

    <section class="card mb-4 p-4">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <div class="xl:col-span-2">
          <label class="label-text" for="planning-report-search">ค้นหาสินค้า</label>
          <input id="planning-report-search" v-model="filter.search" class="input-field" placeholder="รหัสสินค้า ชื่อสินค้า หรือ barcode" @keyup.enter="load" />
        </div>
        <div class="xl:col-span-2">
          <label class="label-text" for="planning-report-supplier">ผู้จัดจำหน่าย</label>
          <input id="planning-report-supplier" v-model="filter.supplier_search" class="input-field" placeholder="รหัสหรือชื่อเจ้าหนี้" @keyup.enter="load" />
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
          <button class="btn-primary min-h-10 flex-1 justify-center" @click="load()">โหลด</button>
          <button class="btn-secondary min-h-10 justify-center" :disabled="isBusy" @click="loadFresh">โหลดใหม่</button>
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

    <section class="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              <div class="supplier-chart-label" :class="String(supplier.tax_type) === '1' ? 'text-red-600 font-semibold' : ''" :title="`${supplier.ap_code} - ${supplier.ap_name}${String(supplier.tax_type) === '1' ? ' (มีภาษี)' : ''}`">
                {{ shortSupplierLabel(supplier) }}<span v-if="String(supplier.tax_type) === '1'" class="ml-1 text-[10px]">VAT</span>
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

    <section class="card">
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
        <button class="btn-secondary mx-auto mt-3" @click="load()">ลองใหม่</button>
      </div>

      <div v-else>
        <div v-if="jobStatus && jobStatus !== 'complete'" class="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          กำลังคำนวณต่อในพื้นหลัง {{ formatInt(processed) }} / {{ formatInt(total) }} รายการ แถวที่แสดงเป็นผลลัพธ์ที่คำนวณแล้วและเรียงตามแนะนำซื้อ
        </div>

        <!-- Filter สถานะสต็อก + Toggle คอลัมน์เพิ่มเติม -->
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500">สถานะสต็อก:</span>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="opt in stockStatusOptions"
                :key="opt.value"
                class="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
                :class="filterStockStatus === opt.value ? opt.activeClass : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-100'"
                @click="setStockStatus(opt.value)"
              >{{ opt.label }}</button>
            </div>
          </div>
          <label class="hidden cursor-pointer items-center gap-2 text-xs text-slate-600 lg:flex">
            <input v-model="showExtraColumns" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            แสดงคอลัมน์เพิ่มเติม (คงเหลือ/ค้างxxx/D_avg/Min/Max/Cover)
          </label>
        </div>

        <div class="overflow-auto" style="max-height: calc(100vh - 200px)">
        <table class="w-full border-collapse text-sm" :class="showExtraColumns ? 'min-w-[1760px]' : 'min-w-[1160px]'">
          <thead class="sticky top-0 z-10 border-b-2 border-slate-300 bg-slate-50">
            <tr>
              <th class="table-head w-12 border border-slate-200 text-center"></th>
              <th class="table-head w-[30rem] border border-slate-200 text-left">สินค้า</th>
              <th class="table-head min-w-56 border border-slate-200 text-left">เจ้าหนี้เริ่มต้น</th>
              <th class="table-head w-28 border border-slate-200 text-right">ราคา/หน่วยเล็ก</th>
              <th class="table-head w-24 border border-slate-200 text-right">พร้อมใช้</th>
              <th v-if="showExtraColumns" class="table-head w-24 border border-slate-200 text-right">คงเหลือ</th>
              <th v-if="showExtraColumns" class="table-head w-24 border border-slate-200 text-right">ค้างรับ</th>
              <th v-if="showExtraColumns" class="table-head w-24 border border-slate-200 text-right">ค้างจอง</th>
              <th v-if="showExtraColumns" class="table-head w-24 border border-slate-200 text-right">ค้างส่ง</th>
              <th v-if="showExtraColumns" class="table-head w-24 border border-slate-200 text-right">D_avg</th>
              <th v-if="showExtraColumns" class="table-head w-24 border border-slate-200 text-right">Min/ROP</th>
              <th v-if="showExtraColumns" class="table-head w-24 border border-slate-200 text-right">Max</th>
              <th v-if="showExtraColumns" class="table-head w-28 border border-slate-200 text-right">มูลค่าขายสุทธิ</th>
              <th v-if="showExtraColumns" class="table-head w-28 border border-slate-200 text-right">ต้นทุนสุทธิ</th>
              <th v-if="showExtraColumns" class="table-head w-28 border border-slate-200 text-right">กำไร(ขาดทุน)</th>
              <th v-if="showExtraColumns" class="table-head w-20 border border-slate-200 text-right">%กำไร</th>
              <th class="table-head w-28 border border-slate-200 text-right">แนะนำซื้อ</th>
              <th class="table-head w-40 border border-slate-200 text-left">สถานะ</th>
              <th v-if="showExtraColumns" class="table-head w-28 border border-slate-200 text-right">Cover</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(row, idx) in filteredRows" :key="row.ic_code">
              <tr :class="idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'">
                <td class="border border-slate-200 px-4 py-3 text-center">
                  <button
                    class="cart-add-btn"
                    :class="{ 'cart-add-btn--in-cart': rowInCart(row) }"
                    :aria-pressed="rowInCart(row)"
                    :style="cartButtonStyle(row.ic_code, selectedSupplierCode(row))"
                    :title="cartButtonTitle(row.ic_code, selectedSupplierCode(row), Number(row.suggest_qty || 0) > 0 ? 'ใส่ตะกร้า (ใช้ยอดแนะนำซื้อ)' : 'ใส่ตะกร้า (ไม่มียอดแนะนำซื้อ → ใช้ MOQ/1)')"
                    @click="addToCartFromRow(row)"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </button>
                </td>
                <td class="border border-slate-200 px-4 py-3">
                  <a :href="detailHref(row)" target="_blank" rel="noopener" class="font-semibold text-blue-600 hover:underline">{{ row.ic_name || '-' }}</a>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span class="code-pill">{{ row.ic_code }}</span>
                    <span class="text-xs text-slate-400">{{ row.unit_code || '-' }}</span>
                  </div>
                </td>
                <td class="border border-slate-200 px-4 py-3">
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
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span class="font-medium truncate" :class="hasTax(row) ? 'text-red-600' : 'text-slate-800'" :title="hasTax(row) ? 'เจ้าหนี้นี้มีภาษี' : ''">{{ selectedSupplierName(row) }}</span>
                        <span v-if="Number(row.is_preferred) === 1" class="preferred-badge" title="เจ้าหนี้หลัก">หลัก</span>
                        <span v-if="hasTax(row)" class="rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold text-red-600" title="มีภาษี">VAT</span>
                        <span v-if="visiblePRCount(row.ic_code, selectedSupplierCode(row)) > 0" class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm" :style="prBadgeStyle(row.ic_code, selectedSupplierCode(row))" :title="prBadgeTitle(row.ic_code, selectedSupplierCode(row))">PR {{ visiblePRCount(row.ic_code, selectedSupplierCode(row)) }}</span>
                      </div>
                      <div class="text-xs text-slate-400">{{ selectedSupplierCode(row) || '-' }}</div>
                    </div>
                  </div>
                </td>
                <td class="border border-slate-200 px-4 py-3 text-right tabular-nums text-slate-700">{{ formatMoney(selectedSupplierPrice(row)) }}</td>
                <td class="border border-slate-200 px-4 py-3 text-right font-semibold tabular-nums">{{ formatQty(row.available_qty) }} <span class="text-xs font-normal text-slate-400">{{ row.unit_code }}</span></td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums">{{ formatQty(row.balance_qty) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums">{{ formatQty(row.accrued_in_qty_calc) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums">{{ formatQty(row.book_out_qty) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums">{{ formatQty(row.accrued_out_qty_calc) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums">
                  <button
                    type="button"
                    class="davg-link"
                    :title="`ดูสูตร D_avg (${davgMethodLabel(row)})`"
                    @click="openDavgDialog(row)"
                  >
                    <span :style="davgMethodColor(row)">{{ formatQty(row.d_avg) }}</span>
                 
                  </button>
                </td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums">{{ formatQty(row.min_stock) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums">{{ formatQty(row.max_stock) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums text-slate-600">{{ formatMoney(row.amount_net_3m) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums text-slate-600">{{ formatMoney(row.cost_net_3m) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums" :class="profitColor(row.profit_lost_amount_3m)">{{ formatMoney(row.profit_lost_amount_3m) }}</td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums" :class="profitPctColor(row.profit_lost_amount_3m, row.amount_net_3m)">{{ formatPct(row.profit_lost_amount_3m, row.amount_net_3m) }}%</td>
                <td class="border border-slate-200 px-4 py-3 text-right font-semibold tabular-nums text-blue-700">{{ formatQty(row.suggest_qty) }} <span class="text-xs font-normal text-slate-400">{{ row.unit_code }}</span></td>
                <td class="border border-slate-200 px-4 py-3"><span :class="statusClass(row.stock_status)">{{ statusLabel(row.stock_status) }}</span></td>
                <td v-if="showExtraColumns" class="border border-slate-200 px-4 py-3 text-right tabular-nums">{{ row.stock_cover_days === null ? '-' : `${formatQty(row.stock_cover_days)} วัน` }}</td>
              </tr>

              <tr v-if="expanded[row.ic_code]" class="bg-slate-50/70">
                <td :colspan="showExtraColumns ? 19 : 7" class="px-4 py-4 sm:px-8">
                  <div v-if="supplierLoading[row.ic_code]" class="py-6 text-center text-sm text-slate-400">กำลังโหลด supplier...</div>
                  <div v-else-if="supplierErrors[row.ic_code]" class="py-4 text-center text-sm text-red-500">{{ supplierErrors[row.ic_code] }}</div>
                  <div v-else class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table class="w-full min-w-[820px] text-sm">
                      <thead class="bg-slate-50">
                        <tr>
                          <th class="supplier-head w-16 text-center">ใส่ตะกร้า</th>
                          <th class="supplier-head text-left">เจ้าหนี้</th>
                          <th class="supplier-head w-24 text-right">Lead</th>
                          <th class="supplier-head w-24 text-right">Late</th>
                          <th class="supplier-head w-28 text-right">Wholesale</th>
                          <th class="supplier-head w-24 text-right">Cycle</th>
                          <th class="supplier-head w-24 text-right">MOQ</th>
                          <th class="supplier-head w-28 text-right">แนะนำซื้อ</th>
                          <th class="supplier-head w-28 text-right">ราคา/หน่วยเล็ก</th>
                          <th class="supplier-head w-32 text-left">ซื้อล่าสุด</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        <tr v-if="!supplierRows(row).length">
                          <td colspan="10" class="py-8 text-center text-slate-400">ยังไม่มี supplier ที่ผูกกับสินค้านี้</td>
                        </tr>
                        <tr v-for="supplier in supplierRows(row)" :key="`${row.ic_code}-${supplier.ap_code}`" class="hover:bg-slate-50">
                          <td class="px-3 py-2 text-center">
                            <button
                              class="cart-add-btn"
                              :class="{ 'cart-add-btn--in-cart': supplierInCart(row, supplier) }"
                              :aria-pressed="supplierInCart(row, supplier)"
                              :style="cartButtonStyle(row.ic_code, supplier.ap_code)"
                              :title="cartButtonTitle(row.ic_code, supplier.ap_code, 'ใส่ตะกร้าจากเจ้าหนี้นี้')"
                              @click="addToCartFromSupplier(row, supplier)"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </button>
                          </td>
                          <td class="px-3 py-2">
                            <div class="flex flex-wrap items-center gap-1.5">
                              <span class="font-medium" :class="String(supplier.tax_type) === '1' ? 'text-red-600' : 'text-slate-800'">{{ supplier.ap_name || '-' }}</span>
                              <span v-if="String(supplier.tax_type) === '1'" class="rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold text-red-600" title="มีภาษี">VAT</span>
                              <span v-if="visiblePRCount(row.ic_code, supplier.ap_code) > 0" class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm" :style="prBadgeStyle(row.ic_code, supplier.ap_code)" :title="prBadgeTitle(row.ic_code, supplier.ap_code)">PR {{ visiblePRCount(row.ic_code, supplier.ap_code) }}</span>
                            </div>
                            <div class="text-xs text-slate-400">{{ supplier.ap_code }}</div>
                          </td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatInt(supplier.lead_time_days) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatInt(supplier.late_buffer_days) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatInt(supplier.wholesale_buffer_days) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatInt(supplier.order_cycle_days) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(supplier.min_order_qty) }}</td>
                          <td class="px-3 py-2 text-right font-semibold text-blue-700 tabular-nums">{{ formatQty(supplier.suggest_qty) }}</td>
                          <td class="px-3 py-2 text-right tabular-nums text-slate-700">{{ formatMoney(purchasePrice(supplier)) }}</td>
                          <td class="px-3 py-2 text-xs text-slate-500">{{ formatDate(supplier.last_purchase_date) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>

            <tr v-if="filteredRows.length === 0">
              <td :colspan="showExtraColumns ? 19 : 7" class="py-16 text-center text-slate-400">ไม่พบข้อมูลตามเงื่อนไข</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <div v-if="!loading && !error && total > 0" class="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p class="text-center text-sm text-slate-500 lg:text-left">แสดง {{ formatInt(filteredRows.length) }} จาก {{ formatInt(displayTotal) }} รายการ เรียงตามจำนวนแนะนำซื้อจากมากไปน้อย</p>
        <div class="flex justify-center gap-1">
          <button class="pager-btn" :disabled="!canLoadMore" @click="loadMore">
            {{ loadMoreLabel }}
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

    <Transition name="modal">
      <div
        v-if="davgDialogRow"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
        @click.self="closeDavgDialog"
      >
        <div class="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-slate-800">สูตรคำนวณ D_avg</h2>
              <p class="mt-1 truncate text-sm text-slate-500">
                {{ davgDialogRow.ic_code }} · {{ davgDialogRow.ic_name || '-' }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
              title="ปิด"
              @click="closeDavgDialog"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="max-h-[calc(90vh-72px)] overflow-y-auto px-5 py-4">
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="davg-card">
                <p class="davg-card-label">D_avg ที่ใช้จริง</p>
                <p class="davg-card-value text-blue-700">{{ formatQty(davgDialogRow.d_avg) }}</p>
                <p class="davg-card-note">{{ davgDialogRow.unit_code || '-' }} / วัน</p>
              </div>
              <div class="davg-card">
                <p class="davg-card-label">ประเภทสูตร</p>
                <p class="davg-card-value text-slate-800">{{ davgMethodLabel(davgDialogRow) }}</p>
                <p class="davg-card-note">{{ davgFormulaReason(davgDialogRow) }}</p>
              </div>
              <div class="davg-card">
                <p class="davg-card-label">Sales Frequency</p>
                <p class="davg-card-value text-emerald-700">{{ formatPercentValue(davgDialogRow.sales_frequency) }}%</p>
                <p class="davg-card-note">{{ formatInt(davgDialogRow.sales_days) }} / {{ formatInt(davgDialogRow.active_stock_days) }} วัน</p>
              </div>
            </div>

            <div class="mt-4 grid gap-4 lg:grid-cols-2">
              <section class="rounded-lg border border-slate-200 p-4">
                <h3 class="mb-3 text-sm font-semibold text-slate-700">วิธีเลือกสูตร Hybrid</h3>
                <div class="space-y-2 text-sm text-slate-600">
                  <div class="flex justify-between gap-4">
                    <span>เกณฑ์ Median</span>
                    <strong class="text-slate-800">Frequency ≥ 60%</strong>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span>เกณฑ์ Mean</span>
                    <strong class="text-slate-800">Frequency &lt; 60%</strong>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span>Median D_avg</span>
                    <strong class="tabular-nums text-slate-800">{{ formatQty(davgDialogRow.median_d_avg) }}</strong>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span>Mean D_avg</span>
                    <strong class="tabular-nums text-slate-800">{{ formatQty(davgDialogRow.mean_d_avg) }}</strong>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span>ยอดขายรวมในช่วงคำนวณ</span>
                    <strong class="tabular-nums text-slate-800">{{ formatQty(davgDialogRow.total_sales_qty) }}</strong>
                  </div>
                </div>
                <p class="mt-3 rounded bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                  {{ davgFormulaNote(davgDialogRow) }}
                </p>
              </section>

              <section class="rounded-lg border border-slate-200 p-4">
                <h3 class="mb-3 text-sm font-semibold text-slate-700">ตัวเลขสต๊อกที่ใช้คำนวณ</h3>
                <div class="space-y-2 text-sm text-slate-600">
                  <div class="flex justify-between gap-4">
                    <span>คงเหลือ</span>
                    <strong class="tabular-nums text-slate-800">{{ formatQty(davgDialogRow.balance_qty) }}</strong>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span>ค้างรับ</span>
                    <strong class="tabular-nums text-emerald-700">+ {{ formatQty(davgDialogRow.accrued_in_qty_calc) }}</strong>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span>ค้างจอง</span>
                    <strong class="tabular-nums text-red-600">- {{ formatQty(davgDialogRow.book_out_qty) }}</strong>
                  </div>
                  <div class="flex justify-between gap-4">
                    <span>ค้างส่ง</span>
                    <strong class="tabular-nums text-red-600">- {{ formatQty(davgDialogRow.accrued_out_qty_calc) }}</strong>
                  </div>
                  <div class="border-t border-slate-100 pt-2">
                    <div class="flex justify-between gap-4">
                      <span class="font-medium text-slate-700">พร้อมใช้</span>
                      <strong class="tabular-nums text-blue-700">{{ formatQty(davgDialogRow.available_qty) }}</strong>
                    </div>
                  </div>
                </div>
                <p class="mt-3 rounded bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
                  พร้อมใช้ = คงเหลือ + ค้างรับ - ค้างจอง - ค้างส่ง
                </p>
              </section>
            </div>

            <section class="mt-4 rounded-lg border border-slate-200 p-4">
              <h3 class="mb-3 text-sm font-semibold text-slate-700">Min / Max / แนะนำซื้อ</h3>
              <div class="grid gap-3 sm:grid-cols-4">
                <div class="davg-mini-stat">
                  <span>Lead</span>
                  <strong>{{ formatQty(davgDialogRow.lead_time_days) }} วัน</strong>
                </div>
                <div class="davg-mini-stat">
                  <span>Late</span>
                  <strong>{{ formatQty(davgDialogRow.late_buffer_days) }} วัน</strong>
                </div>
                <div class="davg-mini-stat">
                  <span>Wholesale</span>
                  <strong>{{ formatQty(davgDialogRow.wholesale_buffer_days) }} วัน</strong>
                </div>
                <div class="davg-mini-stat">
                  <span>Cycle</span>
                  <strong>{{ formatQty(davgDialogRow.order_cycle_days) }} วัน</strong>
                </div>
              </div>
              <div class="mt-3 grid gap-3 sm:grid-cols-3">
                <div class="davg-result">
                  <span>Min / ROP</span>
                  <strong>{{ formatQty(davgDialogRow.min_stock) }}</strong>
                </div>
                <div class="davg-result">
                  <span>Max</span>
                  <strong>{{ formatQty(davgDialogRow.max_stock) }}</strong>
                </div>
                <div class="davg-result">
                  <span>แนะนำซื้อ</span>
                  <strong>{{ formatQty(davgDialogRow.suggest_qty) }}</strong>
                </div>
              </div>
              <p class="mt-3 text-xs leading-relaxed text-slate-500">
                Min = Ceiling(D_avg × (Lead + Late + Wholesale)), Max = Ceiling(D_avg × (Lead + Late + Wholesale + Cycle)), แนะนำซื้อ = Max - พร้อมใช้ และเทียบ MOQ
              </p>
            </section>
          </div>
        </div>
      </div>
    </Transition>

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

const reportViewCache = new Map()
const CART_REFRESH_INTERVAL_MS = 15000
const REPORT_VIEW_CACHE_PREFIX = 'purchasePlanning.reportView.'
const REPORT_VIEW_META_PREFIX = 'purchasePlanning.reportMeta.'

const props = defineProps({
  alertOnly: { type: Boolean, default: false },
})

const auth = useAuthStore()
const { cart, createdPrItems, cartCount, addToCart, removeFromCart, loadCart } = usePlanningCart()
const toastMsg = ref('')
let toastTimer = null
const canManagePlanningMaster = computed(() =>
  auth.user?.code?.toUpperCase() === 'SUPERADMIN' ||
  auth.user?.role === 'admin' ||
  Number(auth.user?.purchase_planning_can_access || 0) === 1
)
const canTriggerAlert = computed(() => {
  const user = auth.user || {}
  return String(user.code || '').toUpperCase() === 'SUPERADMIN' || user.role === 'admin'
})

// เพิ่มลงตะกร้าพร้อม toast feedback สั้น
async function addToCartFromRow(row) {
  const apCode = selectedSupplierCode(row)
  await loadCart().catch(() => {})
  const existing = cartEntry(row.ic_code, apCode)
  if (existing) {
    if (existing.is_owner) {
      await removeFromCart(row.ic_code, apCode)
      showToast(`นำ "${row.ic_name || row.ic_code}" ออกจากตะกร้าแล้ว`)
    } else {
      showToast(`รายการนี้อยู่ในตะกร้าของ ${cartOwnerName(existing)} แล้ว`)
    }
    return
  }
  const suggest = Number(row.suggest_qty || 0)
  // ถ้าไม่มีแนะนำซื้อ → ใช้ MOQ ของเจ้าหนี้ที่เลือก, ถ้าไม่มี MOQ ด้วย → ใช้ 1
  const qty = suggest > 0 ? suggest : (selectedSupplierMOQ(row) > 0 ? selectedSupplierMOQ(row) : 1)
  try {
    await addToCart({
      ic_code: row.ic_code,
      ic_name: row.ic_name,
      unit_code: selectedSupplierUnitCode(row),
      ap_code: apCode,
      ap_name: selectedSupplierName(row),
      qty,
      base_qty: qty,
      price: 0,
      reference_unit_code: selectedSupplierUnitCode(row),
      reference_price: selectedSupplierPrice(row),
      suggest_qty: suggest,
    })
    showToast(`เพิ่ม "${row.ic_name || row.ic_code}" ลงตะกร้าแล้ว`)
  } catch (err) {
    showToast(err.response?.data?.error || err.message || 'เพิ่มลงตะกร้าไม่สำเร็จ')
  }
}

async function addToCartFromSupplier(row, supplier) {
  await loadCart().catch(() => {})
  const existing = cartEntry(row.ic_code, supplier.ap_code)
  if (existing) {
    if (existing.is_owner) {
      await removeFromCart(row.ic_code, supplier.ap_code)
      showToast(`นำ "${row.ic_name || row.ic_code}" ออกจากตะกร้าแล้ว`)
    } else {
      showToast(`รายการนี้อยู่ในตะกร้าของ ${cartOwnerName(existing)} แล้ว`)
    }
    return
  }
  const suggest = Number(supplier.suggest_qty || 0)
  // ถ้า supplier นี้ไม่มียอดแนะนำซื้อ → ใช้ MOQ, ถ้าไม่มี MOQ ด้วย → ใช้ 1
  const qty = suggest > 0 ? suggest : (Number(supplier.min_order_qty || 0) > 0 ? Number(supplier.min_order_qty) : 1)
  try {
    await addToCart({
      ic_code: row.ic_code,
      ic_name: row.ic_name,
      unit_code: supplier.last_purchase_unit_code || supplier.purchase_unit_code || row.unit_code,
      ap_code: supplier.ap_code,
      ap_name: supplier.ap_name,
      qty,
      base_qty: qty,
      price: 0,
      reference_unit_code: supplier.last_purchase_unit_code || supplier.purchase_unit_code || row.unit_code,
      reference_price: purchasePrice(supplier),
      suggest_qty: suggest,
    })
    showToast(`เพิ่ม "${row.ic_name || row.ic_code}" จาก "${supplier.ap_name || supplier.ap_code}" ลงตะกร้าแล้ว`)
  } catch (err) {
    showToast(err.response?.data?.error || err.message || 'เพิ่มลงตะกร้าไม่สำเร็จ')
  }
}

function showToast(msg) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
}

function cartEntry(icCode, apCode) {
  const itemCode = String(icCode || '').trim()
  const supplierCode = String(apCode || '').trim()
  if (!itemCode || !supplierCode) return null
  return cart.find((item) =>
    String(item.ic_code || '').trim() === itemCode &&
    String(item.ap_code || '').trim() === supplierCode,
  ) || null
}

function cartHas(icCode, apCode) {
  return Boolean(cartEntry(icCode, apCode))
}

function cartOwnerName(item) {
  return item?.user_name || item?.user_code || 'ผู้ใช้อื่น'
}

function cartButtonTitle(icCode, apCode, fallbackTitle = 'ใส่ตะกร้า') {
  const item = cartEntry(icCode, apCode)
  if (!item) return fallbackTitle
  return item.is_owner ? 'อยู่ในตะกร้าของคุณแล้ว (กดอีกครั้งเพื่อนำออก)' : `อยู่ในตะกร้าของ ${cartOwnerName(item)} แล้ว`
}

function cartButtonStyle(icCode, apCode) {
  const item = cartEntry(icCode, apCode)
  if (!item) return {}
  const color = item.cart_color || '#dc2626'
  return {
    borderColor: color,
    backgroundColor: `${color}18`,
    color,
    boxShadow: `0 0 0 1px ${color}22`,
  }
}

function rowInCart(row) {
  return cartHas(row.ic_code, selectedSupplierCode(row))
}

function supplierInCart(row, supplier) {
  return cartHas(row.ic_code, supplier.ap_code)
}

const davgDialogRow = ref(null)

function openDavgDialog(row) {
  davgDialogRow.value = row
}

function closeDavgDialog() {
  davgDialogRow.value = null
}

function davgMethodLabel(row) {
  const method = String(row?.d_avg_method || '').toLowerCase()
  if (method === 'median') return 'Median'
  if (method === 'mean') return 'Mean'
  return 'ไม่มีข้อมูลขาย'
}

function davgMethodColor(row) {
  const method = String(row?.d_avg_method || '').toLowerCase()
  if (method === 'median') return 'color: #2563eb; font-weight: 600;'
  if (method === 'mean') return 'color: #f59e0b; font-weight: 600;'
  return 'color: #6b7280; font-weight: 600;'
}


function davgFormulaReason(row) {
  const method = String(row?.d_avg_method || '').toLowerCase()
  const freq = formatPercentValue(row?.sales_frequency)
  if (method === 'median') return `Frequency ${freq}% >= 60%`
  if (method === 'mean') return `Frequency ${freq}% < 60%`
  return 'ไม่มีวันที่มีสต๊อกหรือไม่มีวันที่ขาย'
}

function davgFormulaNote(row) {
  const method = String(row?.d_avg_method || '').toLowerCase()
  const activeDays = Number(row?.active_stock_days || 0)
  const salesDays = Number(row?.sales_days || 0)
  if (method === 'median') {
    return `ใช้ Median เพราะสินค้ามีความถี่ขาย ${formatPercentValue(row?.sales_frequency)}% จาก ${formatInt(salesDays)} วันที่มีขาย / ${formatInt(activeDays)} วันที่มีสต๊อก จึงตัดยอดขายโดดออกได้ดี`
  }
  if (method === 'mean') {
    return `ใช้ Mean เพราะความถี่ขายต่ำกว่า 60% โดยคำนวณจากยอดขายรวม ${formatQty(row?.total_sales_qty)} / ${formatInt(activeDays)} วันที่มีสต๊อก และมีขั้นต่ำ 0.1 สำหรับสินค้าขายช้า`
  }
  return 'ยังไม่มีข้อมูลพอสำหรับคำนวณ D_avg ระบบจึงไม่สร้าง Min/Max จากสูตรนี้'
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
  supplier_search: '',
  days: 30,
  as_of_date: today,
  warehouse: 'MMA01',
})
const rows = ref([])
const total = ref(0)
const tableTotal = ref(0)
const limit = ref(30)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const summary = ref({})
// ใบเสนอซื้อ (PR) ที่ยังไม่ถูกดึงไปทำซื้อ (trans_flag=2, doc_success=0)
function emptyPendingPR() {
  return { total: 0, byAp: {}, byItemAp: {} }
}
const pendingPR = ref(emptyPendingPR())

// นับ PR รอทำซื้อของคู่สินค้า+เจ้าหนี้เท่านั้น
function pendingPRCount(icCode, apCode) {
  const itemCode = String(icCode || '').trim()
  const supplierCode = String(apCode || '').trim()
  if (!itemCode || !supplierCode) return 0
  return Number(pendingPR.value.byItemAp?.[itemCode]?.[supplierCode] || 0)
}

function createdPRRows(icCode, apCode) {
  const itemCode = String(icCode || '').trim()
  const supplierCode = String(apCode || '').trim()
  if (!itemCode || !supplierCode) return []
  return createdPrItems.filter((item) =>
    String(item.ic_code || '').trim() === itemCode &&
    String(item.ap_code || '').trim() === supplierCode,
  )
}

function visiblePRCount(icCode, apCode) {
  return Math.max(pendingPRCount(icCode, apCode), createdPRRows(icCode, apCode).length)
}

function prBadgeStyle(icCode, apCode) {
  const rows = createdPRRows(icCode, apCode)
  const color = rows[0]?.cart_color || '#dc2626'
  return { backgroundColor: color }
}

function prBadgeTitle(icCode, apCode) {
  const rows = createdPRRows(icCode, apCode)
  if (!rows.length) return 'สินค้านี้มีใบเสนอซื้อ (PR) กับเจ้าหนี้นี้แล้ว และยังไม่ถูกดึงไปทำใบซื้อ'
  const names = [...new Set(rows.map((row) => row.user_name || row.user_code || '').filter(Boolean))]
  const docs = [...new Set(rows.map((row) => row.pr_doc_no || '').filter(Boolean))]
  return `สินค้านี้มี PR แล้ว${docs.length ? `: ${docs.join(', ')}` : ''}${names.length ? ` โดย ${names.join(', ')}` : ''}`
}
const jobId = ref('')
const jobStatus = ref('')
const processed = ref(0)
const reportFromCache = ref(false)
const reportCacheUpdatedAt = ref('')
const hasMore = ref(false)
const selected = reactive({})
const expanded = reactive({})
const showExtraColumns = ref(true) // toggle คอลัมน์เพิ่มเติม (ค้างรับ/ค้างจอง/ค้างส่ง/D_avg/Min/Max/Cover) — default เปิด
const filterStockStatus = ref('')
const stockStatusOptions = [
  { value: '', label: 'ทั้งหมด', activeClass: 'border-slate-700 bg-slate-700 text-white' },
  { value: 'low', label: 'ต่ำกว่าเกณฑ์', activeClass: 'border-red-500 bg-red-500 text-white' },
  { value: 'normal', label: 'ปกติ', activeClass: 'border-green-500 bg-green-500 text-white' },
  { value: 'high', label: 'สูงกว่าเกณฑ์', activeClass: 'border-amber-500 bg-amber-500 text-white' },
  { value: 'insufficient_sales_days', label: 'ข้อมูลขายไม่พอ', activeClass: 'border-blue-500 bg-blue-500 text-white' },
  { value: 'inactive', label: 'ไม่เคลื่อนไหว', activeClass: 'border-slate-400 bg-slate-400 text-white' },
]
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
let cartRefreshTimer = null
let cartRefreshInFlight = false
let loadSeq = 0
const REPORT_REQUEST_TIMEOUT = 10 * 60 * 1000

const alertOnly = computed(() => props.alertOnly)
const pageTitle = computed(() => alertOnly.value ? 'แจ้งเตือนสั่งซื้อ' : 'รายงานวางแผนสั่งซื้อ')
const pageSubtitle = computed(() => alertOnly.value
  ? 'แสดงสินค้าที่พร้อมใช้ต่ำกว่าหรือเท่ากับจุดสั่งซื้อ กดชื่อสินค้าเพื่อดูรายละเอียด'
  : '1 แถวต่อสินค้า เลือกเจ้าหนี้เริ่มต้นและกดขยายเพื่อดูเจ้าหนี้รายอื่น')
const displayTotal = computed(() => {
  if (filterStockStatus.value) return Number(tableTotal.value || summary.value[filterStockStatus.value] || 0)
  return alertOnly.value ? Number(summary.value.total || rows.value.length || 0) : Number(tableTotal.value || total.value || 0)
})
const isBusy = computed(() => loading.value || loadingMore.value)
const isReportComplete = computed(() => {
  const totalRows = Number(total.value || 0)
  return jobStatus.value === 'complete' && (totalRows === 0 || Number(processed.value || 0) >= totalRows)
})
const canLoadMore = computed(() => isReportComplete.value && hasMore.value && !loading.value && !loadingMore.value)
const selectedCount = computed(() => Object.values(selected).filter(Boolean).length)
const showProgress = computed(() => loading.value || jobStatus.value === 'running' || jobStatus.value === 'queued' || processed.value > 0)
const progressPercent = computed(() => {
  if (jobStatus.value === 'complete' && total.value > 0) return 100
  if (!total.value) return processed.value > 0 ? 100 : 0
  return Math.min(100, Math.max(0, Math.round((Number(processed.value || 0) / Number(total.value || 1)) * 100)))
})
const progressStatusText = computed(() => {
  if (jobStatus.value === 'complete' && reportFromCache.value) return `ใช้รายงานที่ freeze ไว้${reportCacheUpdatedAt.value ? ` (${formatDate(reportCacheUpdatedAt.value)})` : ''}`
  if (jobStatus.value === 'complete') return `โหลดครบแล้ว ${formatInt(processed.value || total.value)} / ${formatInt(total.value)} รายการ`
  if (jobStatus.value === 'failed') return 'โหลดรายงานไม่สำเร็จ'
  if (!total.value) return 'กำลังเตรียมรายการสินค้า...'
  return `ประมวลผลแล้ว ${formatInt(processed.value)} / ${formatInt(total.value)} รายการ`
})
const loadMoreLabel = computed(() => {
  if (!isReportComplete.value) return 'รอคำนวณครบ'
  if (loadingMore.value) return 'กำลังโหลด...'
  if (!hasMore.value) return 'โหลดครบแล้ว'
  return 'โหลดเพิ่ม'
})
const summaryCards = computed(() => [
  { key: 'total', label: alertOnly.value ? 'รายการแจ้งเตือน' : 'สินค้าทั้งหมด', value: formatInt(summary.value.total), note: summaryNote.value, class: 'text-slate-800' },
  { key: 'low', label: alertOnly.value ? 'ถึงจุดสั่งซื้อ' : 'ต่ำกว่าเกณฑ์', value: formatInt(summary.value.low), note: 'available <= Min/ROP', class: 'text-red-600' },
  { key: 'normal', label: 'ปกติ', value: formatInt(summary.value.normal), note: 'อยู่ในช่วง Min-Max', class: 'text-green-600' },
  { key: 'high', label: 'สูงกว่าเกณฑ์', value: formatInt(summary.value.high), note: 'available > Max', class: 'text-amber-600' },
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
const filteredRows = computed(() =>
  filterStockStatus.value
    ? rows.value.filter((r) => r.stock_status === filterStockStatus.value)
    : rows.value
)
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
    days: filter.days,
    as_of_date: filter.as_of_date,
    warehouse: filter.warehouse,
    limit: limit.value,
    alert_only: alertOnly.value ? 1 : undefined,
  }
}

function searchParams() {
  return {
    search: filter.search || undefined,
    supplier_search: filter.supplier_search || undefined,
  }
}

function reportCacheKey() {
  return alertOnly.value ? 'alerts' : 'report'
}

function reportStorageKey(prefix = REPORT_VIEW_CACHE_PREFIX) {
  return `${prefix}${reportCacheKey()}`
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value))
}

function readStoredReportView(prefix = REPORT_VIEW_CACHE_PREFIX) {
  try {
    const raw = sessionStorage.getItem(reportStorageKey(prefix))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStoredReportView(payload) {
  const meta = {
    ...payload,
    rows: [],
    summary: {},
    pendingPR: emptyPendingPR(),
  }
  try {
    sessionStorage.setItem(reportStorageKey(REPORT_VIEW_META_PREFIX), JSON.stringify(meta))
  } catch {}
  try {
    sessionStorage.setItem(reportStorageKey(REPORT_VIEW_CACHE_PREFIX), JSON.stringify(payload))
  } catch {}
}

function applyCachedFilter(cached) {
  filter.search = cached?.filter?.search || ''
  filter.supplier_search = cached?.filter?.supplier_search || ''
  filter.days = Number(cached?.filter?.days || 30)
  filter.as_of_date = cached?.filter?.as_of_date || today
  filter.warehouse = cached?.filter?.warehouse || 'MMA01'
  filterStockStatus.value = cached?.filterStockStatus || ''
}

function saveReportViewCache() {
  if (!rows.value.length || jobStatus.value !== 'complete') return
  const payload = {
    filter: clonePlain(filter),
    filterStockStatus: filterStockStatus.value,
    rows: clonePlain(rows.value),
    summary: clonePlain(summary.value),
    pendingPR: emptyPendingPR(),
    total: total.value,
    tableTotal: tableTotal.value,
    processed: processed.value,
    reportFromCache: reportFromCache.value,
    reportCacheUpdatedAt: reportCacheUpdatedAt.value,
    hasMore: hasMore.value,
    jobId: jobId.value,
    jobStatus: jobStatus.value,
    savedAt: Date.now(),
  }
  reportViewCache.set(reportCacheKey(), payload)
  writeStoredReportView(payload)
}

function restoreReportViewCache() {
  const cached = reportViewCache.get(reportCacheKey())
    || readStoredReportView(REPORT_VIEW_CACHE_PREFIX)
    || readStoredReportView(REPORT_VIEW_META_PREFIX)
  if (!cached) return false
  applyCachedFilter(cached)
  if (!cached?.rows?.length) return false
  rows.value = cached.rows || []
  summary.value = cached.summary || {}
  pendingPR.value = emptyPendingPR()
  total.value = Number(cached.total || 0)
  tableTotal.value = Number(cached.tableTotal || rows.value.length || 0)
  processed.value = Number(cached.processed || total.value || rows.value.length || 0)
  reportFromCache.value = Boolean(cached.reportFromCache)
  reportCacheUpdatedAt.value = cached.reportCacheUpdatedAt || ''
  hasMore.value = Boolean(cached.hasMore)
  jobId.value = cached.jobId || ''
  jobStatus.value = cached.jobStatus || 'complete'
  loading.value = false
  loadingMore.value = false
  error.value = ''
  return true
}

function forgetReportViewCache() {
  reportViewCache.delete(reportCacheKey())
  try {
    sessionStorage.removeItem(reportStorageKey(REPORT_VIEW_CACHE_PREFIX))
    sessionStorage.removeItem(reportStorageKey(REPORT_VIEW_META_PREFIX))
  } catch {}
}

async function autoLoadServerSnapshot() {
  if (rows.value.length || loading.value || loadingMore.value) return
  try {
    const { data } = await api.get('/purchase-planning/report-snapshot/status', {
      params: requestParams(),
    })
    if (data.exists) await load(false)
  } catch {
    // no-op: first-time users still load manually
  }
}

function clearPollTimer() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

async function refreshCartState() {
  if (cartRefreshInFlight) return
  cartRefreshInFlight = true
  try {
    const [, pendingResult] = await Promise.allSettled([
      loadCart(),
      api.get('/purchase-planning/pending-pr'),
    ])
    if (pendingResult.status === 'fulfilled') {
      pendingPR.value = pendingResult.value.data || emptyPendingPR()
    }
  } catch {
    // keep the last known cart state; report rows are still usable
  } finally {
    cartRefreshInFlight = false
  }
}

function startCartStateRefresh() {
  stopCartStateRefresh()
  cartRefreshTimer = setInterval(() => {
    if (document.visibilityState !== 'hidden') refreshCartState()
  }, CART_REFRESH_INTERVAL_MS)
  window.addEventListener('focus', refreshCartState)
  document.addEventListener('visibilitychange', onVisibilityChange)
}

function stopCartStateRefresh() {
  if (cartRefreshTimer) clearInterval(cartRefreshTimer)
  cartRefreshTimer = null
  window.removeEventListener('focus', refreshCartState)
  document.removeEventListener('visibilitychange', onVisibilityChange)
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') refreshCartState()
}

function clearReportState() {
  clearPollTimer()
  loading.value = false
  loadingMore.value = false
  error.value = ''
  rows.value = []
  summary.value = {}
  pendingPR.value = emptyPendingPR()
  total.value = 0
  tableTotal.value = 0
  processed.value = 0
  reportFromCache.value = false
  reportCacheUpdatedAt.value = ''
  hasMore.value = false
  jobId.value = ''
  jobStatus.value = ''
}

async function load(forceReload = false) {
  const seq = ++loadSeq
  forgetReportViewCache()
  clearReportState()
  loading.value = true
  jobStatus.value = 'queued'
  try {
    await loadCart().catch(() => {})
    const { data } = await api.post('/purchase-planning/report-lazy', {
      ...requestParams(),
      batch_size: 5,
      force_reload: forceReload ? 1 : undefined,
    }, {
      timeout: REPORT_REQUEST_TIMEOUT,
    })
    if (seq !== loadSeq) return
    jobId.value = data.job_id
    total.value = data.total || 0
    processed.value = data.processed || 0
    jobStatus.value = data.status || 'queued'
    reportFromCache.value = Boolean(data.from_cache)
    reportCacheUpdatedAt.value = data.cache_updated_at || ''
    await pollReportJob(seq)
  } catch (err) {
    if (seq !== loadSeq) return
    rows.value = []
    summary.value = {}
    loading.value = false
    error.value = err.message
  }
}

async function loadFresh() {
  if (!window.confirm('ต้องการโหลดข้อมูลใหม่และเขียนทับรายงานที่ freeze ไว้หรือไม่?')) return
  await load(true)
}

async function pollReportJob(seq) {
  if (!jobId.value || seq !== loadSeq) return
  try {
    const { data } = await api.get(`/purchase-planning/report-lazy/${encodeURIComponent(jobId.value)}`, {
      timeout: REPORT_REQUEST_TIMEOUT,
      params: {
        offset: 0,
        limit: limit.value,
        stock_status: filterStockStatus.value || undefined,
        ...searchParams(),
      },
    })
    if (seq !== loadSeq) return
    jobStatus.value = data.status
    total.value = data.total || 0
    processed.value = data.processed || 0
    reportFromCache.value = Boolean(data.from_cache)
    reportCacheUpdatedAt.value = data.cache_updated_at || reportCacheUpdatedAt.value
    if (data.status === 'failed') throw new Error(data.error || 'คำนวณรายงานไม่สำเร็จ')
    if (data.status === 'complete') {
      rows.value = data.data || []
      summary.value = data.summary || {}
      pendingPR.value = data.pending_pr || emptyPendingPR()
      tableTotal.value = Number(data.filtered_total ?? data.total ?? rows.value.length ?? 0)
      hasMore.value = Boolean(data.has_more)
      loading.value = false
      saveReportViewCache()
      return
    }
    // partial result: แสดง row ที่คำนวณแล้วให้ user เห็นความคืบหน้า แต่ยัง poll ต่อ
    // ไม่ตั้ง hasMore = false เพราะ job ยังไม่ complete (อาจมี row ที่ suggest_qty สูงกว่ามาทีหลัง)
    if ((data.data || []).length) {
      rows.value = data.data || []
    }
    tableTotal.value = Number(data.filtered_total ?? rows.value.length ?? 0)
    summary.value = data.partial_summary || {}
    if (data.pending_pr) pendingPR.value = data.pending_pr
    pollTimer = setTimeout(() => pollReportJob(seq), 1200)
  } catch (err) {
    if (seq !== loadSeq) return
    loading.value = false
    error.value = err.message
  }
}

async function loadMore() {
  if (!jobId.value || !canLoadMore.value) return
  loadingMore.value = true
  try {
    const { data } = await api.get(`/purchase-planning/report-lazy/${encodeURIComponent(jobId.value)}`, {
      timeout: REPORT_REQUEST_TIMEOUT,
      params: {
        offset: rows.value.length,
        limit: limit.value,
        stock_status: filterStockStatus.value || undefined,
        ...searchParams(),
      },
    })
    rows.value = [...rows.value, ...(data.data || [])]
    total.value = data.total || total.value
    tableTotal.value = Number(data.filtered_total ?? tableTotal.value ?? rows.value.length ?? 0)
    summary.value = data.summary || summary.value
    hasMore.value = Boolean(data.has_more)
    saveReportViewCache()
  } catch (err) {
    error.value = err.message
  } finally {
    loadingMore.value = false
  }
}

async function setStockStatus(value) {
  if (filterStockStatus.value === value) return
  filterStockStatus.value = value
  if (!jobId.value) return
  clearPollTimer()
  rows.value = []
  hasMore.value = false
  await pollReportJob(loadSeq)
}

function resetFilter() {
  filter.search = ''
  filter.supplier_search = ''
  filter.days = 30
  filter.as_of_date = today
  filter.warehouse = 'MMA01'
  filterStockStatus.value = ''
  loadSeq += 1
  forgetReportViewCache()
  clearReportState()
}

async function toggleExpand(row) {
  expanded[row.ic_code] = !expanded[row.ic_code]
  // เมื่อกดขยายใหม่ทุกครั้ง → re-fetch เสมอ (ไม่ใช้ cache เดิม) เพื่อให้สะท้อนการแก้ไข master ล่าสุด
  if (!expanded[row.ic_code]) return

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
  row.selected_supplier_unit_code = supplier.last_purchase_unit_code || supplier.purchase_unit_code || row.unit_code
  row.selected_supplier_tax_type = supplier.tax_type
  row.selected_supplier_price = purchasePrice(supplier)
  row.suggest_qty = supplier.suggest_qty
  row.min_stock = supplier.min_stock
  row.max_stock = supplier.max_stock
  row.lead_time_days = supplier.lead_time_days
  row.late_buffer_days = supplier.late_buffer_days
  row.wholesale_buffer_days = supplier.wholesale_buffer_days
  row.order_cycle_days = supplier.order_cycle_days
  row.min_order_qty = supplier.min_order_qty
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
// เจ้าหนี้มีภาษี (tax_type = '1') → แสดงชื่อสีแดง
function hasTax(row) {
  const t = String(row.tax_type ?? row.selected_supplier_tax_type ?? '')
  return t === '1'
}

function selectedSupplierUnitCode(row) {
  return row.selected_supplier_unit_code || row.last_purchase_unit_code || row.purchase_unit_code || row.unit_code
}

function purchasePrice(source) {
  return Number(source?.last_purchase_price ?? source?.last_purchase_price_exclude_vat ?? 0) || 0
}

function selectedSupplierPrice(row) {
  return Number(row.selected_supplier_price ?? row.last_purchase_price ?? row.last_purchase_price_exclude_vat ?? 0) || 0
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

function formatPercentValue(value) {
  return (Number(value || 0) * 100).toLocaleString('th-TH', { maximumFractionDigits: 1 })
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

onMounted(async () => {
  const restored = restoreReportViewCache()
  await refreshCartState()
  if (!restored) await autoLoadServerSnapshot()
  startCartStateRefresh()
})

onBeforeUnmount(() => {
  clearPollTimer()
  stopCartStateRefresh()
})
watch(() => props.alertOnly, async () => {
  loadSeq += 1
  clearReportState()
  const restored = restoreReportViewCache()
  if (!restored) await autoLoadServerSnapshot()
})
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
  @apply grid grid-cols-[minmax(160px,34%)_minmax(0,1fr)] items-center gap-3;
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
.davg-link {
  @apply inline-flex flex-col items-end gap-1 rounded px-2 py-1 text-right font-semibold text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-800;
}
.davg-method-pill {
  @apply rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-500;
}
.davg-card {
  @apply rounded-lg border border-slate-200 bg-slate-50 px-4 py-3;
}
.davg-card-label {
  @apply text-xs font-semibold uppercase tracking-wide text-slate-400;
}
.davg-card-value {
  @apply mt-1 text-xl font-bold tabular-nums;
}
.davg-card-note {
  @apply mt-0.5 text-xs text-slate-500;
}
.davg-mini-stat,
.davg-result {
  @apply rounded-lg bg-slate-50 px-3 py-2 text-sm;
}
.davg-mini-stat span,
.davg-result span {
  @apply block text-xs font-medium text-slate-400;
}
.davg-mini-stat strong,
.davg-result strong {
  @apply mt-0.5 block tabular-nums text-slate-800;
}
.davg-result strong {
  @apply text-lg text-blue-700;
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
.cart-add-btn--in-cart {
  @apply border-red-500 bg-red-50 text-red-600 shadow-sm hover:border-red-600 hover:bg-red-100 hover:text-red-700;
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
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
