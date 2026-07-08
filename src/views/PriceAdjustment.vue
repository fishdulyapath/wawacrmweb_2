<template>
  <div class="p-6">
    <div class="mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-800">ปรับราคาสินค้า</h1>
        <p class="mt-1 text-sm text-slate-500">เลือกเอกสารซื้อหรือรับสินค้า แล้วนำราคารวมซื้อสูงสุดต่อสินค้า/หน่วยไปปรับราคาตามสูตร</p>
      </div>
    </div>

    <div v-if="error" role="alert" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>
    <div v-if="success" role="status" class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
      {{ success }}
    </div>

    <section class="card p-4">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="grid flex-1 gap-3 md:grid-cols-2">
          <div>
            <label class="label-text">เอกสารที่เลือก</label>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {{ selectedCount }} / {{ documents.length }} ใบ
            </div>
          </div>
          <div>
            <label class="label-text">รายการสินค้า</label>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {{ formatInt(items.length) }} รายการ
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary justify-center" @click="openDocumentDialog">
            เลือกเอกสาร
          </button>
          <button class="btn-secondary justify-center" @click="openProductDialog">
            เลือกสินค้า
          </button>
        </div>
      </div>
    </section>

    <div class="mt-4 flex flex-wrap gap-2 border-b border-slate-200" role="tablist" aria-label="หน้าปรับราคาสินค้า">
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'price'"
        class="px-4 py-2 text-sm font-semibold"
        :class="activeTab === 'price' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-800'"
        @click="activeTab = 'price'"
      >
        ตารางปรับราคา
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'formula'"
        class="px-4 py-2 text-sm font-semibold"
        :class="activeTab === 'formula' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-800'"
        @click="openFormulaTab"
      >
        สูตรคำนวณราคา
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeTab === 'history'"
        class="px-4 py-2 text-sm font-semibold"
        :class="activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-800'"
        @click="openHistoryTab"
      >
        ประวัติการปรับราคา
      </button>
    </div>

    <section v-if="activeTab === 'formula'" class="card mt-4 overflow-hidden" role="tabpanel">
      <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="font-semibold text-slate-800">สูตรคำนวณราคา</h2>
          <p class="text-sm text-slate-500">ราคาใหม่ = ราคารวมซื้อสูงสุด × (1 + (margin ราคา + margin หน่วย)/100) และถ้ามีเศษทศนิยมจะปัดขึ้นเสมอ</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary justify-center" :disabled="loadingMargins" @click="loadAllMarginMaster">โหลด margin จาก master</button>
          <button class="btn-secondary justify-center" :disabled="formulaRules.length === 0 || savingMargins" @click="saveMarginMaster">บันทึก margin เป็น master</button>
          <button class="btn-primary justify-center" :disabled="items.length === 0" @click="applyFormulaToItems">คำนวณราคาจากสูตร</button>
        </div>
      </div>
      <div class="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 md:flex-row md:items-end md:justify-between">
        <div class="w-full md:max-w-md">
          <label class="label-text">ค้นหา master margin</label>
          <input
            v-model="formulaSearch"
            class="input-field"
            placeholder="ค้นหารหัสหมวด หรือชื่อหมวดสินค้า"
          />
        </div>
        <div class="text-sm text-slate-500">
          แสดง {{ formatInt(filteredFormulaRules.length) }} / {{ formatInt(formulaRules.length) }} หมวด
        </div>
      </div>
      <div v-if="loadingMargins" class="py-12 text-center text-sm text-slate-400">
        กำลังโหลด master margin...
      </div>
      <div v-else-if="filteredFormulaRules.length === 0" class="py-12 text-center text-sm text-slate-400">
        ไม่พบ master margin ตามคำค้นหา
      </div>
      <div v-else class="max-h-[calc(100vh-280px)] overflow-auto">
        <table class="min-w-[1900px] text-sm">
          <thead class="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th class="table-head-static sticky left-0 z-30 w-32 min-w-[8rem] bg-slate-50" rowspan="2" scope="col">รหัสหมวด</th>
              <th class="table-head-static sticky left-32 z-30 w-64 min-w-[16rem] bg-slate-50 shadow-[1px_0_0_#e2e8f0]" rowspan="2" scope="col">หมวดสินค้า</th>
              <th class="table-head-static text-center" :colspan="priceFields.length" scope="colgroup">Margin ราคา</th>
              <th class="table-head-static border-l border-emerald-200 bg-emerald-50 text-center text-emerald-800" :colspan="unitMarginFields.length" scope="colgroup">Margin หน่วย</th>
            </tr>
            <tr>
              <th v-for="field in priceFields" :key="`${field}-margin`" class="table-head-static w-28 text-right" scope="col">{{ marginLabel(field) }}</th>
              <th
                v-for="(n, index) in unitMarginFields"
                :key="`unit-${n}`"
                class="table-head-static w-28 bg-emerald-50 text-right text-emerald-800"
                :class="index === 0 ? 'border-l border-emerald-200' : ''"
                scope="col"
              >
                หน่วย {{ n }} %
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="rule in filteredFormulaRules" :key="rule.key" class="hover:bg-slate-50">
              <td class="sticky left-0 z-10 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-700">{{ rule.category_code || '-' }}</td>
              <td class="sticky left-32 z-10 bg-white px-3 py-2 text-slate-700 shadow-[1px_0_0_#e2e8f0]">{{ rule.category_name || 'ไม่ระบุหมวด' }}</td>
              <td v-for="field in priceFields" :key="`${rule.key}-${field}`" class="px-2 py-2">
                <input v-model="rule.price_margins[field]" type="number" step="0.01" class="input-field h-8 text-right tabular-nums" />
              </td>
              <td
                v-for="(n, index) in unitMarginFields"
                :key="`${rule.key}-unit-${n}`"
                class="bg-emerald-50 px-2 py-2"
                :class="index === 0 ? 'border-l border-emerald-200' : ''"
              >
                <input v-model="rule.unit_margins[n]" type="number" step="0.01" class="input-field h-8 bg-white text-right tabular-nums" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="activeTab === 'price'" class="card mt-4 overflow-hidden" role="tabpanel">
      <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="font-semibold text-slate-800">ตารางปรับราคา</h2>
          <p class="text-sm text-slate-500">สินค้าที่พบในเอกสารจะแสดงทุกหน่วยจาก ic_unit_use เลือกราคารวมซื้อสูงสุด และแสดงราคาเก่า/ใหม่/ส่วนต่างตามคลิป</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary justify-center" :disabled="items.length === 0" @click="fillEmptyFromPurchase">เติมช่องว่างด้วยราคารวมซื้อสูงสุด</button>
          <button class="btn-secondary justify-center" :disabled="items.length === 0" @click="applyFormulaToItems">คำนวณราคาจากสูตร</button>
          <button class="btn-secondary justify-center" :disabled="printablePriceBarcodeRows.length === 0" @click="printPriceBarcodes">พิมพ์บาร์โค้ด</button>
          <button class="btn-secondary justify-center" :disabled="items.length === 0" @click="exportPriceExcel">Export Excel</button>
          <button class="btn-primary justify-center" :disabled="saving || items.length === 0" @click="openSaveDialog">บันทึกราคา</button>
        </div>
      </div>

      <div v-if="loadingItems" class="flex items-center justify-center py-12 text-slate-400">
        <svg class="mr-2 h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        กำลังดึงรายการสินค้า...
      </div>
      <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div>
          <h3 class="text-base font-semibold text-slate-700">ยังไม่มีรายการสินค้า</h3>
          <p class="mt-1 text-sm text-slate-500">เลือกเอกสารซื้อหรือรับสินค้า แล้วดึงรายการเพื่อเริ่มปรับราคา</p>
        </div>
        <button class="btn-primary justify-center" @click="openDocumentDialog">
          เลือกเอกสาร
        </button>
      </div>
      <div v-else class="max-h-[calc(100vh-280px)] overflow-auto">
        <table class="min-w-[4620px] text-sm">
          <thead class="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th class="table-head-static sticky left-0 z-30 w-32 min-w-[8rem] bg-slate-50" rowspan="2" scope="col">รหัสสินค้า</th>
              <th class="table-head-static sticky left-32 z-30 w-64 min-w-[16rem] bg-slate-50 shadow-[1px_0_0_#e2e8f0]" rowspan="2" scope="col">ชื่อสินค้า</th>
              <th class="table-head-static w-24" rowspan="2" scope="col">หน่วย</th>
              <th class="table-head-static w-24 text-right" rowspan="2" scope="col">อัตราส่วน</th>
              <th class="table-head-static w-64" rowspan="2" scope="col">กลุ่มสินค้า</th>
              <th class="table-head-static w-20 text-right" rowspan="2" scope="col">ลำดับหน่วย</th>
              <th class="table-head-static w-20 text-right" rowspan="2" scope="col">ภาษี</th>
              <th class="table-head-static w-28 text-right" rowspan="2" scope="col">ราคารวมซื้อสูงสุด</th>
              <th class="table-head-static w-28 text-right" rowspan="2" scope="col">ต้นทุนเฉลี่ย</th>
              <th class="table-head-static w-44" rowspan="2" scope="col">เอกสารอ้างอิง</th>
              <template v-for="field in priceFields" :key="`${field}-group`">
                <th class="table-head-static border-l border-slate-200 text-center" :class="priceBandClass(field)" colspan="3" scope="colgroup">{{ priceLabel(field) }}</th>
              </template>
              <th class="table-head-static w-36 text-center" rowspan="2" scope="col">คำสั่ง</th>
            </tr>
            <tr>
              <template v-for="field in priceFields" :key="`${field}-subhead`">
                <th class="table-head-static w-24 border-l border-slate-200 text-right" :class="priceBandClass(field)" scope="col">เก่า</th>
                <th class="table-head-static w-28 text-right" :class="priceBandClass(field)" scope="col">ใหม่</th>
                <th class="table-head-static w-28 text-right" :class="priceBandClass(field)" scope="col">ส่วนต่าง</th>
              </template>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in items" :key="itemLineKey(row)" class="transition hover:brightness-[0.98]">
              <td class="sticky left-0 z-10 px-3 py-2 align-top font-mono text-xs font-semibold text-slate-700" :class="itemRowBgClass(row)">{{ row.item_code }}</td>
              <td class="sticky left-32 z-10 px-3 py-2 align-top shadow-[1px_0_0_#e2e8f0]" :class="itemRowBgClass(row)">
                <div class="flex items-start gap-2">
                  <p class="font-medium text-slate-800">{{ row.item_name || '-' }}</p>
                  <button
                    v-if="hasOtherPrice(row)"
                    type="button"
                    class="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-200"
                    @click="openOtherPriceDialog(row)"
                  >
                    มีราคาอื่น
                  </button>
                </div>
                <p v-if="hasOtherPrice(row)" class="mt-1 text-[11px] text-red-600">{{ otherPriceSummaryText(row) }}</p>
                <p class="mt-1 text-xs text-slate-400">จาก {{ row.source_doc_count }} เอกสาร / {{ row.source_line_count }} รายการ</p>
              </td>
              <td class="px-3 py-2 align-top text-slate-600" :class="itemRowBgClass(row)">{{ row.unit_code }}</td>
              <td class="px-3 py-2 align-top text-right text-slate-600 tabular-nums" :class="itemRowBgClass(row)">{{ formatRatio(row.unit_ratio) }}</td>
              <td class="px-3 py-2 align-top" :class="itemRowBgClass(row)">
                <div class="flex items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium text-slate-700">{{ selectedCategoryLabel(row) || '-' }}</p>
                    <p class="mt-1 text-xs text-slate-400">ค่าเดิม: {{ row.category_name || row.category_code || '-' }}</p>
                  </div>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    :aria-label="`แก้ไขกลุ่มสินค้า ${row.item_code}`"
                    title="แก้ไขกลุ่มสินค้า"
                    @click="openCategoryDialog(row)"
                  >
                    ✎
                  </button>
                </div>
              </td>
              <td class="px-3 py-2 align-top text-right text-slate-600 tabular-nums" :class="itemRowBgClass(row)">{{ formatInt(row.unit_row_order) }}</td>
              <td class="px-3 py-2 align-top text-right text-slate-600 tabular-nums" :class="itemRowBgClass(row)">{{ formatInt(row.vat_type) }}</td>
              <td class="px-3 py-2 align-top text-right font-semibold text-slate-800 tabular-nums" :class="itemRowBgClass(row)">{{ formatMoney(row.purchase_price) }}</td>
              <td class="px-3 py-2 align-top text-right font-semibold text-slate-700 tabular-nums" :class="itemRowBgClass(row)">{{ formatMoney(row.average_cost) }}</td>
              <td class="px-3 py-2 align-top text-xs text-slate-500" :class="itemRowBgClass(row)">{{ row.source_docs || row.source_doc_no }}</td>
              <template v-for="field in priceFields" :key="`${row.item_code}-${row.unit_code}-${field}`">
                <td class="border-l border-slate-100 px-3 py-2 align-top text-right text-slate-500 tabular-nums" :class="itemRowBgClass(row)">
                  {{ formatPriceText(row.old_prices[field]) }}
                </td>
                <td class="px-2 py-2 align-top" :class="itemRowBgClass(row)">
                  <input
                    v-model="row.new_prices[field]"
                    type="number"
                    min="0"
                    step="1"
                    class="input-field h-8 w-24 text-right tabular-nums"
                    :aria-label="`${priceLabel(field)} ใหม่ ${row.item_code}`"
                    @blur="row.new_prices[field] = roundedPrice(row.new_prices[field])"
                  />
                </td>
                <td class="px-3 py-2 align-top text-right font-medium tabular-nums" :class="[itemRowBgClass(row), diffClass(row, field)]">
                  {{ formatDiff(row, field) }}
                </td>
              </template>
              <td class="px-3 py-2 align-top text-center" :class="itemRowBgClass(row)">
                <div class="flex flex-col gap-2">
                  <button class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700" @click="applyOldPrices(row)">
                    ใช้ราคาเดิม
                  </button>
                <button class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white" @click="applyPurchasePrice(row)">
                  ใช้ราคารวมซื้อ
                </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="activeTab === 'history'" class="card mt-4 overflow-hidden" role="tabpanel">
      <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="font-semibold text-slate-800">ประวัติการปรับราคา</h2>
          <p class="text-sm text-slate-500">ตรวจเอกสารที่ CRM บันทึกไปแล้ว พร้อมราคาเก่าและราคาใหม่ของแต่ละรายการ</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary justify-center" :disabled="!selectedHistory || loadingHistoryDetails || printableHistoryBarcodeRows.length === 0" @click="printHistoryBarcodes">พิมพ์บาร์โค้ด</button>
          <button class="btn-secondary justify-center" :disabled="!selectedHistory || loadingHistoryDetails || historyDetails.length === 0" @click="exportHistoryExcel">Export Excel</button>
          <button class="btn-secondary justify-center" :disabled="loadingHistory" @click="loadHistory">โหลดประวัติใหม่</button>
        </div>
      </div>

      <div class="grid min-h-[520px] xl:grid-cols-[420px_1fr]">
        <div class="border-b border-slate-200 xl:border-b-0 xl:border-r">
          <div v-if="loadingHistory" class="py-12 text-center text-sm text-slate-400">กำลังโหลดประวัติ...</div>
          <div v-else-if="historyRows.length === 0" class="py-12 text-center text-sm text-slate-400">ยังไม่มีประวัติการปรับราคา</div>
          <div v-else class="max-h-[calc(100vh-280px)] overflow-auto">
            <button
              v-for="row in historyRows"
              :key="row.doc_no"
              type="button"
              class="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
              :class="selectedHistory?.doc_no === row.doc_no ? 'bg-blue-50' : 'bg-white'"
              @click="loadHistoryDetails(row)"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-mono text-xs font-semibold text-slate-800">{{ row.doc_no }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ formatDateTime(row.create_datetime) }}</p>
                </div>
                <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{{ formatInt(row.line_count) }} รายการ</span>
              </div>
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded bg-green-50 px-2 py-1 font-semibold text-green-700">เพิ่ม {{ formatInt(row.insert_count) }}</span>
                <span class="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-700">แก้ไข {{ formatInt(row.update_count) }}</span>
              </div>
              <p class="mt-2 truncate text-xs text-slate-500">{{ row.creator_code || '-' }} · {{ row.remark || '-' }}</p>
            </button>
          </div>
        </div>

        <div class="overflow-hidden">
          <div v-if="!selectedHistory" class="py-16 text-center text-sm text-slate-400">เลือกเอกสารประวัติเพื่อดูรายละเอียด</div>
          <div v-else>
            <div class="border-b border-slate-200 px-4 py-3">
              <p class="font-semibold text-slate-800">{{ selectedHistory.doc_no }}</p>
              <p class="text-sm text-slate-500">บันทึกโดย {{ selectedHistory.creator_code || '-' }} · {{ formatDateTime(selectedHistory.create_datetime) }}</p>
            </div>
            <div v-if="loadingHistoryDetails" class="py-12 text-center text-sm text-slate-400">กำลังโหลดรายละเอียด...</div>
            <div v-else class="max-h-[calc(100vh-340px)] overflow-auto">
              <table class="min-w-[3600px] text-sm">
                <thead class="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th class="table-head-static sticky left-0 z-20 w-32 bg-slate-50" rowspan="2">รหัสสินค้า</th>
                    <th class="table-head-static sticky left-32 z-20 w-64 bg-slate-50 shadow-[1px_0_0_#e2e8f0]" rowspan="2">ชื่อสินค้า</th>
                    <th class="table-head-static w-24" rowspan="2">หน่วย</th>
                    <th class="table-head-static w-20 text-right" rowspan="2">ภาษี</th>
                    <th class="table-head-static w-56" rowspan="2">กลุ่มสูตรราคา</th>
                    <th class="table-head-static w-24" rowspan="2">คำสั่ง</th>
                    <template v-for="field in priceFields" :key="`${field}-history-group`">
                      <th class="table-head-static border-l border-slate-200 text-center" :class="priceBandClass(field)" colspan="3">{{ priceLabel(field) }}</th>
                    </template>
                  </tr>
                  <tr>
                    <template v-for="field in priceFields" :key="`${field}-history-sub`">
                      <th class="table-head-static w-24 border-l border-slate-200 text-right" :class="priceBandClass(field)">เก่า</th>
                      <th class="table-head-static w-24 text-right" :class="priceBandClass(field)">ใหม่</th>
                      <th class="table-head-static w-24 text-right" :class="priceBandClass(field)">ต่าง</th>
                    </template>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="row in historyDetails" :key="row.roworder" class="transition hover:brightness-[0.98]">
                    <td class="sticky left-0 z-10 px-3 py-2 align-top font-mono text-xs font-semibold text-slate-700" :class="historyRowBgClass(row)">{{ row.ic_code }}</td>
                    <td class="sticky left-32 z-10 px-3 py-2 align-top shadow-[1px_0_0_#e2e8f0]" :class="historyRowBgClass(row)">{{ row.item_name || '-' }}</td>
                    <td class="px-3 py-2 align-top text-slate-600" :class="historyRowBgClass(row)">{{ row.unit_code }}</td>
                    <td class="px-3 py-2 align-top text-right text-slate-600 tabular-nums" :class="historyRowBgClass(row)">{{ formatInt(row.tax_type) }}</td>
                    <td class="px-3 py-2 align-top" :class="historyRowBgClass(row)">
                      <p class="text-slate-700">{{ row.formula_category_name || '-' }}</p>
                      <p class="font-mono text-xs text-slate-400">{{ row.formula_category_code || '-' }}</p>
                    </td>
                    <td class="px-3 py-2 align-top" :class="historyRowBgClass(row)">
                      <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="commandClass(row.command)">{{ row.command }}</span>
                    </td>
                    <template v-for="field in priceFields" :key="`${row.roworder}-${field}`">
                      <td class="border-l border-slate-100 px-3 py-2 align-top text-right text-slate-500 tabular-nums" :class="historyRowBgClass(row)">
                        {{ row.old_price_available ? formatPriceText(row.old_prices?.[field]) : '-' }}
                      </td>
                      <td class="px-3 py-2 align-top text-right font-semibold text-slate-800 tabular-nums" :class="historyRowBgClass(row)">
                        {{ formatPriceText(row.new_prices?.[field]) }}
                      </td>
                      <td class="px-3 py-2 align-top text-right font-medium tabular-nums" :class="[historyRowBgClass(row), historyDiffClass(row, field)]">
                        {{ formatHistoryDiff(row, field) }}
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="saveDialogOpen"
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeSaveDialog"
    >
      <div class="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">ยืนยันบันทึกราคา</h2>
              <p class="mt-1 text-sm text-slate-500">ระบบจะบันทึกเข้า ic_inventory_price_formula ด้วย sale_type 0 และ tax_type ตามเอกสารอ้างอิงของแต่ละรายการ</p>
            </div>
            <button class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white" :disabled="saving" @click="closeSaveDialog">
              ปิด
            </button>
          </div>
        </div>

        <div class="space-y-4 overflow-auto p-5">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg border border-slate-200 bg-white p-4">
              <p class="text-xs font-semibold uppercase text-slate-400">รายการที่จะบันทึก</p>
              <p class="mt-2 text-2xl font-bold text-slate-800">{{ formatInt(pendingSaveItems.length) }}</p>
            </div>
            <div class="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p class="text-xs font-semibold uppercase text-blue-500">คาดว่าแก้ไข</p>
              <p class="mt-2 text-2xl font-bold text-blue-700">{{ formatInt(saveUpdateEstimate) }}</p>
            </div>
            <div class="rounded-lg border border-amber-100 bg-amber-50 p-4">
              <p class="text-xs font-semibold uppercase text-amber-500">คาดว่าเพิ่มใหม่</p>
              <p class="mt-2 text-2xl font-bold text-amber-700">{{ formatInt(saveInsertEstimate) }}</p>
            </div>
          </div>

          <div class="rounded-lg border border-slate-200">
            <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <p class="font-semibold text-slate-800">ตัวอย่างราคา 0 ที่จะบันทึก</p>
              <p class="text-sm text-slate-500">แสดง {{ formatInt(savePreviewRows.length) }} รายการแรกจากทั้งหมด {{ formatInt(pendingSaveItems.length) }} รายการ</p>
            </div>
            <div class="max-h-72 overflow-auto">
              <table class="w-full min-w-[760px] text-sm">
                <thead class="sticky top-0 bg-white">
                  <tr>
                    <th class="table-head-static">รหัสสินค้า</th>
                    <th class="table-head-static">ชื่อสินค้า</th>
                    <th class="table-head-static w-24">หน่วย</th>
                    <th class="table-head-static w-24 text-right">ภาษี</th>
                    <th class="table-head-static w-28 text-right">เก่า</th>
                    <th class="table-head-static w-28 text-right">ใหม่</th>
                    <th class="table-head-static w-28 text-right">ส่วนต่าง</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="row in savePreviewRows" :key="itemLineKey(row)">
                    <td class="px-3 py-2 font-mono text-xs font-semibold text-slate-700">{{ row.item_code }}</td>
                    <td class="px-3 py-2 text-slate-700">{{ row.item_name || '-' }}</td>
                    <td class="px-3 py-2 text-slate-600">{{ row.unit_code }}</td>
                    <td class="px-3 py-2 text-right text-slate-600 tabular-nums">{{ formatInt(row.vat_type) }}</td>
                    <td class="px-3 py-2 text-right text-slate-500 tabular-nums">{{ formatPriceText(row.old_prices?.price_0) }}</td>
                    <td class="px-3 py-2 text-right font-semibold text-slate-800 tabular-nums">{{ formatPriceText(row.new_prices?.price_0) }}</td>
                    <td class="px-3 py-2 text-right font-semibold tabular-nums" :class="diffClass(row, 'price_0')">{{ formatDiff(row, 'price_0') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-slate-500">หลังบันทึกแล้วจะมีประวัติใน tab ประวัติการปรับราคา พร้อมราคาเก่า/ใหม่</p>
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary justify-center" :disabled="saving" @click="closeSaveDialog">ยกเลิก</button>
            <button class="btn-primary justify-center" :disabled="saving || pendingSaveItems.length === 0" @click="confirmSavePrices">
              {{ saving ? 'กำลังบันทึก...' : 'ยืนยันบันทึกราคา' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="documentDialogOpen"
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="documentDialogOpen = false"
    >
      <div class="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-800">เลือกเอกสารซื้อ/รับสินค้า</h2>
            <p class="text-sm text-slate-500">เลือกแล้ว {{ selectedCount }} ใบ จาก {{ documents.length }} ใบ</p>
          </div>
          <button class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white" @click="documentDialogOpen = false">
            ปิด
          </button>
        </div>

        <div class="border-b border-slate-200 p-4">
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6 xl:items-end">
            <div>
              <label class="label-text">จากวันที่</label>
              <input v-model="filters.from_date" type="date" class="input-field" />
            </div>
            <div>
              <label class="label-text">ถึงวันที่</label>
              <input v-model="filters.to_date" type="date" class="input-field" />
            </div>
            <div>
              <label class="label-text">จากเลขที่เอกสาร</label>
              <input v-model="filters.doc_no_from" class="input-field" placeholder="เริ่มจากเลขที่เอกสาร" @keyup.enter="loadDocuments" />
            </div>
            <div>
              <label class="label-text">ถึงเลขที่เอกสาร</label>
              <input v-model="filters.doc_no_to" class="input-field" placeholder="ถึงเลขที่เอกสาร" @keyup.enter="loadDocuments" />
            </div>
            <div class="flex gap-2 xl:col-span-2">
              <button class="btn-primary flex-1 justify-center" :disabled="loadingDocs" @click="loadDocuments">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                </svg>
                ค้นหา
              </button>
              <button class="btn-secondary justify-center" :disabled="loadingDocs" @click="resetFilters">ล้าง</button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-auto">
          <div v-if="loadingDocs" class="flex items-center justify-center py-12 text-slate-400">
            <svg class="mr-2 h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            กำลังค้นหาเอกสาร...
          </div>
          <div v-else-if="documents.length === 0" class="py-12 text-center text-sm text-slate-400">
            ยังไม่มีรายการเอกสาร กดค้นหาเพื่อโหลดข้อมูล
          </div>
          <table v-else class="w-full min-w-[1080px] text-sm">
            <thead class="sticky top-0 bg-slate-50">
              <tr>
                <th class="table-head-static w-14 text-center">
                  <input type="checkbox" class="h-4 w-4 rounded border-slate-300" :checked="allDocsSelected" @change="toggleSelectAllDocs" />
                </th>
                <th class="table-head-static w-32">วันที่</th>
                <th class="table-head-static w-44">เลขที่เอกสาร</th>
                <th class="table-head-static w-28">ประเภท</th>
                <th class="table-head-static w-36">ภาษี</th>
                <th class="table-head-static">เจ้าหนี้</th>
                <th class="table-head-static w-24 text-right">รายการ</th>
                <th class="table-head-static w-32 text-right">ยอดรวม</th>
                <th class="table-head-static w-32">ผู้สร้าง</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="doc in documents" :key="docKey(doc)" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-center">
                  <input type="checkbox" class="h-4 w-4 rounded border-slate-300" :checked="selectedDocKeys.has(docKey(doc))" @change="toggleDoc(doc)" />
                </td>
                <td class="px-4 py-3 text-slate-600">{{ formatDate(doc.doc_date) }}</td>
                <td class="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{{ doc.doc_no }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{{ doc.trans_name }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1" :class="docVatTypeClass(doc)">{{ docVatTypeText(doc) }}</span>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-700">{{ doc.supplier_name || '-' }}</p>
                  <p class="font-mono text-xs text-slate-400">{{ doc.supplier_code || '-' }}</p>
                </td>
                <td class="px-4 py-3 text-right text-slate-600">{{ formatInt(doc.line_count) }}</td>
                <td class="px-4 py-3 text-right font-medium text-slate-700">{{ formatMoney(doc.total_amount) }}</td>
                <td class="px-4 py-3 text-slate-500">{{ doc.creator_code || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-slate-500">เลือกแล้ว {{ selectedCount }} ใบ</div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary justify-center" :disabled="documents.length === 0" @click="toggleSelectAllDocs">
              {{ allDocsSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด' }}
            </button>
            <button class="btn-primary justify-center" :disabled="selectedCount === 0 || loadingItems" @click="loadItemsAndCloseDialog">
              ดึงรายการสินค้า
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="productDialogOpen"
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="productDialogOpen = false"
    >
      <div class="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-800">เลือกสินค้าจากราคาตามสูตร</h2>
            <p class="text-sm text-slate-500">ค้นหาได้หลายคำ เช่น มาม่า 90 10g แล้วเลือกสินค้าเพื่อดึงราคาตามสูตรเข้าตารางปรับราคา</p>
          </div>
          <button class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white" @click="productDialogOpen = false">
            ปิด
          </button>
        </div>

        <div class="border-b border-slate-200 p-4">
          <div class="grid gap-3 lg:grid-cols-[1fr_320px_auto_auto] lg:items-end">
            <div>
              <label class="label-text">ค้นหาสินค้า</label>
              <input
                v-model="productSearch"
                class="input-field"
                placeholder="รหัสสินค้า ชื่อสินค้า หรือหลายคำ เช่น มาม่า 90 10g"
                @keyup.enter="searchProducts"
              />
            </div>
            <div class="relative">
              <label class="label-text">หมวดสินค้า</label>
              <div class="relative">
                <input
                  v-model="productCategoryQuery"
                  class="input-field pr-16"
                  placeholder="เลือกหรือค้นหาหมวดสินค้า"
                  role="combobox"
                  :aria-expanded="productCategoryDropdownOpen"
                  @focus="productCategoryDropdownOpen = true"
                  @input="onProductCategoryInput"
                  @keydown.escape="productCategoryDropdownOpen = false"
                  @keyup.enter="searchProducts"
                />
                <button
                  v-if="productCategoryQuery"
                  type="button"
                  class="absolute right-9 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  @click="clearProductCategory(true)"
                >
                  ล้าง
                </button>
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  @click="productCategoryDropdownOpen = !productCategoryDropdownOpen"
                >
                  ▾
                </button>
              </div>
              <div
                v-if="productCategoryDropdownOpen"
                class="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-xl"
              >
                <button
                  type="button"
                  class="flex w-full items-center justify-between px-3 py-2 text-left text-slate-600 hover:bg-blue-50"
                  @mousedown.prevent="clearProductCategory(false)"
                >
                  <span>ทุกหมวดสินค้า</span>
                  <span v-if="!productCategoryCode" class="text-xs font-semibold text-blue-600">เลือกอยู่</span>
                </button>
                <button
                  v-for="rule in filteredProductCategoryOptions"
                  :key="`product-category-${rule.key}`"
                  type="button"
                  class="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-blue-50"
                  :class="productCategoryCode === rule.category_code ? 'bg-blue-50 text-blue-700' : 'text-slate-700'"
                  @mousedown.prevent="selectProductCategory(rule)"
                >
                  <span>
                    <span class="font-semibold">{{ rule.category_name || 'ไม่ระบุหมวด' }}</span>
                    <span class="mt-0.5 block font-mono text-xs text-slate-400">{{ rule.category_code || '-' }}</span>
                  </span>
                  <span v-if="productCategoryCode === rule.category_code" class="text-xs font-semibold text-blue-600">เลือกอยู่</span>
                </button>
                <div v-if="filteredProductCategoryOptions.length === 0" class="px-3 py-3 text-center text-sm text-slate-400">
                  ไม่พบหมวดสินค้าตามคำค้นหา
                </div>
              </div>
            </div>
            <button class="btn-primary justify-center" :disabled="loadingProducts" @click="searchProducts">ค้นหา</button>
            <button class="btn-secondary justify-center" :disabled="loadingProducts" @click="clearProductSearch">ล้าง</button>
          </div>
        </div>

        <div class="flex-1 overflow-auto">
          <div v-if="loadingProducts" class="flex items-center justify-center py-12 text-slate-400">
            <svg class="mr-2 h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            กำลังค้นหาสินค้า...
          </div>
          <div v-else-if="productRows.length === 0" class="py-12 text-center text-sm text-slate-400">
            ยังไม่มีรายการสินค้า กดค้นหาเพื่อโหลดข้อมูลจากราคาตามสูตร
          </div>
          <table v-else class="w-full min-w-[980px] text-sm">
            <thead class="sticky top-0 bg-slate-50">
              <tr>
                <th class="table-head-static w-14 text-center">
                  <input type="checkbox" class="h-4 w-4 rounded border-slate-300" :checked="allProductsSelected" @change="toggleSelectAllProducts" />
                </th>
                <th class="table-head-static w-36">รหัสสินค้า</th>
                <th class="table-head-static">ชื่อสินค้า</th>
                <th class="table-head-static w-44">หมวดสินค้า</th>
                <th class="table-head-static w-24 text-right">หน่วย</th>
                <th class="table-head-static w-28 text-right">สูตรราคา</th>
                <th class="table-head-static">หน่วยในสูตร</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="product in productRows" :key="product.item_code" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-center">
                  <input type="checkbox" class="h-4 w-4 rounded border-slate-300" :checked="selectedProductKeys.has(product.item_code)" @change="toggleProduct(product)" />
                </td>
                <td class="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{{ product.item_code }}</td>
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-700">{{ product.item_name || '-' }}</p>
                  <p class="text-xs text-slate-400">{{ product.group_main || '-' }}</p>
                </td>
                <td class="px-4 py-3">
                  <p class="text-slate-700">{{ product.category_name || '-' }}</p>
                  <p class="font-mono text-xs text-slate-400">{{ product.category_code || '-' }}</p>
                </td>
                <td class="px-4 py-3 text-right text-slate-600 tabular-nums">{{ formatInt(product.unit_count) }}</td>
                <td class="px-4 py-3 text-right text-slate-600 tabular-nums">{{ formatInt(product.formula_count) }}</td>
                <td class="px-4 py-3 text-xs text-slate-500">{{ product.unit_codes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-slate-500">เลือกแล้ว {{ selectedProductCount }} รายการ จาก {{ productRows.length }} รายการ</div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary justify-center" :disabled="productRows.length === 0" @click="toggleSelectAllProducts">
              {{ allProductsSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด' }}
            </button>
            <button class="btn-primary justify-center" :disabled="selectedProductCount === 0 || loadingItems" @click="loadItemsFromProductsAndCloseDialog">
              ดึงสินค้าที่เลือก
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="categoryDialogOpen"
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeCategoryDialog"
    >
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-800">แก้ไขกลุ่มสินค้า</h2>
            <p class="text-sm text-slate-500">
              {{ categoryDialogRow?.item_code || '-' }} · {{ categoryDialogRow?.item_name || '-' }} · {{ categoryDialogRow?.unit_code || '-' }}
            </p>
          </div>
          <button class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white" @click="closeCategoryDialog">
            ปิด
          </button>
        </div>

        <div class="border-b border-slate-200 p-4">
          <label class="label-text">ค้นหาหมวดสินค้า</label>
          <input
            v-model="categoryDialogQuery"
            class="input-field"
            placeholder="ค้นหารหัสหมวด หรือชื่อหมวดสินค้า"
          />
        </div>

        <div class="flex-1 overflow-auto">
          <div v-if="loadingMargins" class="py-10 text-center text-sm text-slate-400">กำลังโหลดหมวดสินค้า...</div>
          <div v-else-if="filteredCategoryDialogOptions.length === 0" class="py-10 text-center text-sm text-slate-400">ไม่พบหมวดสินค้าตามคำค้นหา</div>
          <div v-else class="divide-y divide-slate-100">
            <button
              v-for="rule in filteredCategoryDialogOptions"
              :key="`category-dialog-${rule.key}`"
              type="button"
              class="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-blue-50"
              :class="categoryDialogKey === rule.key ? 'bg-blue-50 text-blue-700' : 'text-slate-700'"
              @click="selectCategoryDialogRule(rule)"
            >
              <span class="min-w-0">
                <span class="block truncate font-semibold">{{ rule.category_name || 'ไม่ระบุหมวด' }}</span>
                <span class="mt-0.5 block font-mono text-xs text-slate-400">{{ rule.category_code || '-' }}</span>
              </span>
              <span v-if="categoryDialogKey === rule.key" class="shrink-0 text-xs font-semibold text-blue-600">เลือกอยู่</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-slate-500">
            เลือก: {{ categoryDialogSelectedLabel || '-' }}
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary justify-center" @click="closeCategoryDialog">ยกเลิก</button>
            <button class="btn-primary justify-center" :disabled="!categoryDialogRow" @click="confirmCategoryDialog">
              ตกลงและคำนวณราคา
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="otherPriceDialogOpen"
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="otherPriceDialogOpen = false"
    >
      <div class="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div class="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-800">ราคาอื่นของสินค้า</h2>
            <p class="text-sm text-slate-500">
              {{ selectedOtherPriceItem?.item_code || '-' }} · {{ selectedOtherPriceItem?.item_name || '-' }}
            </p>
          </div>
          <button class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white" @click="otherPriceDialogOpen = false">
            ปิด
          </button>
        </div>

        <div v-if="loadingOtherPrices" class="flex items-center justify-center py-12 text-slate-400">
          <svg class="mr-2 h-5 w-5 animate-spin text-red-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          กำลังโหลดราคาอื่น...
        </div>
        <div v-else-if="otherPriceRows.length === 0" class="py-12 text-center text-sm text-slate-400">
          ไม่พบราคาอื่นของสินค้านี้
        </div>
        <div v-else class="overflow-auto">
          <table class="w-full min-w-[1500px] text-sm">
            <thead class="sticky top-0 bg-slate-50">
              <tr>
                <th class="table-head-static w-28">ประเภท</th>
                <th class="table-head-static w-20">หน่วย</th>
                <th class="table-head-static w-24 text-right">จากจำนวน</th>
                <th class="table-head-static w-24 text-right">ถึงจำนวน</th>
                <th class="table-head-static w-28">วันที่เริ่ม</th>
                <th class="table-head-static w-28">วันที่สิ้นสุด</th>
                <th class="table-head-static w-24">ขาย</th>
                <th class="table-head-static w-24">ขนส่ง</th>
                <th class="table-head-static w-28 text-right">ราคา 1</th>
                <th class="table-head-static w-28 text-right">ราคา 2</th>
                <th class="table-head-static w-52">ลูกค้า/กลุ่ม</th>
                <th class="table-head-static w-24">สถานะ</th>
                <th class="table-head-static w-32">เอกสาร</th>
                <th class="table-head-static w-32">ผู้สร้าง</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="price in otherPriceRows" :key="`${price.roworder}-${price.unit_code}`" class="hover:bg-slate-50">
                <td class="px-3 py-2">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="otherPriceTypeClass(price)">
                    {{ otherPriceTypeName(price) }}
                  </span>
                </td>
                <td class="px-3 py-2 text-slate-700">{{ price.unit_code || '-' }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatRatio(price.from_qty) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatRatio(price.to_qty) }}</td>
                <td class="px-3 py-2">{{ formatDate(price.from_date) }}</td>
                <td class="px-3 py-2">{{ formatDate(price.to_date) }}</td>
                <td class="px-3 py-2">{{ saleTypeName(price.sale_type) }}</td>
                <td class="px-3 py-2">{{ transportTypeName(price.transport_type) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatMoney(price.sale_price1) }}</td>
                <td class="px-3 py-2 text-right font-semibold text-slate-800 tabular-nums">{{ formatMoney(price.sale_price2) }}</td>
                <td class="px-3 py-2">
                  <p class="text-slate-700">{{ price.cust_name || price.cust_code || '-' }}</p>
                  <p class="text-xs text-slate-400">{{ customerGroupText(price) }}</p>
                </td>
                <td class="px-3 py-2">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="Number(price.status) === 1 ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'">
                    {{ Number(price.status) === 1 ? 'ใช้งาน' : 'ยกเลิก' }}
                  </span>
                </td>
                <td class="px-3 py-2 font-mono text-xs text-slate-600">{{ price.doc_no || '-' }}</td>
                <td class="px-3 py-2 text-slate-500">
                  <p>{{ price.creator_code || '-' }}</p>
                  <p class="text-xs">{{ price.doc_date || '' }} {{ price.doc_time || '' }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import api from '../composables/useApi.js'

const priceFields = Array.from({ length: 10 }, (_, i) => `price_${i}`)
const unitMarginFields = [1, 2, 3, 4]

const today = new Date()
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

const filters = reactive({
  from_date: toInputDate(firstDay),
  to_date: toInputDate(today),
  doc_no_from: '',
  doc_no_to: '',
})

const documents = ref([])
const selectedDocKeys = ref(new Set())
const items = ref([])
const formulaRules = ref([])
const formulaSearch = ref('')
const activeTab = ref('price')
const documentDialogOpen = ref(false)
const productDialogOpen = ref(false)
const saveDialogOpen = ref(false)
const loadingDocs = ref(false)
const loadingItems = ref(false)
const loadingProducts = ref(false)
const loadingMargins = ref(false)
const loadingHistory = ref(false)
const loadingHistoryDetails = ref(false)
const loadingOtherPrices = ref(false)
const savingMargins = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const pendingSaveItems = ref([])
const historyRows = ref([])
const selectedHistory = ref(null)
const historyDetails = ref([])
const productRows = ref([])
const selectedProductKeys = ref(new Set())
const productSearch = ref('')
const productCategoryQuery = ref('')
const productCategoryCode = ref('')
const productCategoryDropdownOpen = ref(false)
const categoryDialogOpen = ref(false)
const categoryDialogRow = ref(null)
const categoryDialogQuery = ref('')
const categoryDialogKey = ref('')
const categoryDialogSelectedCode = ref('')
const categoryDialogSelectedName = ref('')
const otherPriceDialogOpen = ref(false)
const otherPriceRows = ref([])
const selectedOtherPriceItem = ref(null)

const selectedCount = computed(() => selectedDocKeys.value.size)
const selectedProductCount = computed(() => selectedProductKeys.value.size)
const allDocsSelected = computed(() => documents.value.length > 0 && selectedDocKeys.value.size === documents.value.length)
const allProductsSelected = computed(() => productRows.value.length > 0 && selectedProductKeys.value.size === productRows.value.length)
const changedSaveRows = computed(() => items.value.filter((row) => rowHasSaveChange(row)))
const savePreviewRows = computed(() => changedSaveRows.value.slice(0, 8))
const saveUpdateEstimate = computed(() => changedSaveRows.value.filter((row) => hasAnyOldPrice(row)).length)
const saveInsertEstimate = computed(() => Math.max(pendingSaveItems.value.length - saveUpdateEstimate.value, 0))
const filteredFormulaRules = computed(() => {
  const keyword = formulaSearch.value.trim().toLowerCase()
  if (!keyword) return formulaRules.value
  return formulaRules.value.filter((rule) => {
    return [rule.category_code, rule.category_name]
      .some((value) => String(value || '').toLowerCase().includes(keyword))
  })
})
const printablePriceBarcodeRows = computed(() => buildBarcodePrintRows(items.value, 'price'))
const printableHistoryBarcodeRows = computed(() => buildBarcodePrintRows(historyDetails.value, 'history'))
const filteredProductCategoryOptions = computed(() => {
  const keyword = productCategoryQuery.value.trim().toLowerCase()
  if (!keyword) return formulaRules.value
  return formulaRules.value.filter((rule) => {
    const code = String(rule.category_code || '').toLowerCase()
    const name = String(rule.category_name || '').toLowerCase()
    const label = categoryOptionLabel(rule).toLowerCase()
    return code.includes(keyword) || name.includes(keyword) || label.includes(keyword)
  })
})
const filteredCategoryDialogOptions = computed(() => {
  const keyword = categoryDialogQuery.value.trim().toLowerCase()
  if (!keyword) return formulaRules.value
  return formulaRules.value.filter((rule) => {
    const code = String(rule.category_code || '').toLowerCase()
    const name = String(rule.category_name || '').toLowerCase()
    const label = categoryOptionLabel(rule).toLowerCase()
    return code.includes(keyword) || name.includes(keyword) || label.includes(keyword)
  })
})
const categoryDialogSelectedLabel = computed(() => categoryOptionLabel({
  category_code: categoryDialogSelectedCode.value,
  category_name: categoryDialogSelectedName.value,
}))
const itemRowBgClasses = ['bg-white', 'bg-sky-50', 'bg-emerald-50', 'bg-amber-50', 'bg-violet-50']
const itemRowToneMap = computed(() => {
  const map = new Map()
  for (const row of items.value) {
    const code = row.item_code || ''
    if (!map.has(code)) map.set(code, map.size % itemRowBgClasses.length)
  }
  return map
})
const historyRowToneMap = computed(() => {
  const map = new Map()
  for (const row of historyDetails.value) {
    const code = row.ic_code || ''
    if (!map.has(code)) map.set(code, map.size % itemRowBgClasses.length)
  }
  return map
})

function toInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function docKey(doc) {
  return `${doc.trans_flag}|${doc.doc_no}`
}

function itemLineKey(row) {
  return `${row.item_code || ''}|${row.unit_code || ''}|${row.vat_type ?? row.tax_type ?? 0}`
}

function selectedDocuments() {
  return documents.value
    .filter((doc) => selectedDocKeys.value.has(docKey(doc)))
    .map((doc) => ({ doc_no: doc.doc_no, trans_flag: doc.trans_flag }))
}

function selectedProducts() {
  return productRows.value
    .filter((product) => selectedProductKeys.value.has(product.item_code))
    .map((product) => ({ item_code: product.item_code }))
}

function categoryOptionLabel(rule) {
  const code = rule?.category_code || ''
  const name = rule?.category_name || ''
  if (code && name) return `${code} - ${name}`
  return code || name || ''
}

function selectedCategoryLabel(row) {
  return categoryOptionLabel({
    category_code: row.selected_category_code || row.category_code || '',
    category_name: row.selected_category_name || row.category_name || '',
  })
}

function normalizeItemRow(row) {
  const selectedCategoryCode = row.selected_category_code || row.category_code || ''
  const selectedCategoryName = row.selected_category_name || row.category_name || ''
  return {
    ...row,
    selected_category_code: selectedCategoryCode,
    selected_category_name: selectedCategoryName,
    selected_category_query: categoryOptionLabel({
      category_code: selectedCategoryCode,
      category_name: selectedCategoryName,
    }),
    old_prices: { ...(row.old_prices || {}) },
    new_prices: { ...(row.new_prices || {}) },
  }
}

function applyCategorySelection(row) {
  const query = String(row.selected_category_query || '').trim().toLowerCase()
  if (!query) {
    row.selected_category_code = row.category_code || ''
    row.selected_category_name = row.category_name || ''
    row.selected_category_query = selectedCategoryLabel(row)
    return
  }

  const rule = formulaRules.value.find((item) => {
    const code = String(item.category_code || '').toLowerCase()
    const name = String(item.category_name || '').toLowerCase()
    const label = categoryOptionLabel(item).toLowerCase()
    return query === code || query === name || query === label
  })

  if (!rule) {
    row.selected_category_query = selectedCategoryLabel(row)
    return
  }

  row.selected_category_code = rule.category_code || ''
  row.selected_category_name = rule.category_name || ''
  row.selected_category_query = selectedCategoryLabel(row)
}

function applyProductCategoryFilter() {
  const query = String(productCategoryQuery.value || '').trim().toLowerCase()
  if (!query) {
    productCategoryCode.value = ''
    productCategoryQuery.value = ''
    return
  }

  const exactRule = formulaRules.value.find((item) => {
    const code = String(item.category_code || '').toLowerCase()
    const name = String(item.category_name || '').toLowerCase()
    const label = categoryOptionLabel(item).toLowerCase()
    return query === code || query === name || query === label
  })
  const partialRule = exactRule || formulaRules.value.find((item) => {
    const code = String(item.category_code || '').toLowerCase()
    const name = String(item.category_name || '').toLowerCase()
    const label = categoryOptionLabel(item).toLowerCase()
    return code.includes(query) || name.includes(query) || label.includes(query)
  })

  if (!partialRule) {
    productCategoryCode.value = ''
    return
  }

  productCategoryCode.value = partialRule.category_code || ''
  productCategoryQuery.value = categoryOptionLabel(partialRule)
}

function onProductCategoryInput() {
  productCategoryCode.value = ''
  productCategoryDropdownOpen.value = true
}

function selectProductCategory(rule) {
  productCategoryCode.value = rule?.category_code || ''
  productCategoryQuery.value = categoryOptionLabel(rule)
  productCategoryDropdownOpen.value = false
}

function clearProductCategory(keepOpen = false) {
  productCategoryQuery.value = ''
  productCategoryCode.value = ''
  productCategoryDropdownOpen.value = keepOpen
}

async function openCategoryDialog(row) {
  if (!formulaRules.value.length) await loadAllMarginMaster()
  categoryDialogRow.value = row
  categoryDialogQuery.value = ''
  categoryDialogKey.value = categoryKey(row)
  categoryDialogSelectedCode.value = row.selected_category_code || row.category_code || ''
  categoryDialogSelectedName.value = row.selected_category_name || row.category_name || ''
  categoryDialogOpen.value = true
}

function selectCategoryDialogRule(rule) {
  categoryDialogKey.value = rule?.key || '__blank__'
  categoryDialogSelectedCode.value = rule?.category_code || ''
  categoryDialogSelectedName.value = rule?.category_name || ''
}

function closeCategoryDialog() {
  categoryDialogOpen.value = false
  categoryDialogRow.value = null
  categoryDialogQuery.value = ''
  categoryDialogKey.value = ''
  categoryDialogSelectedCode.value = ''
  categoryDialogSelectedName.value = ''
}

function confirmCategoryDialog() {
  const row = categoryDialogRow.value
  if (!row) return
  row.selected_category_code = categoryDialogSelectedCode.value
  row.selected_category_name = categoryDialogSelectedName.value
  row.selected_category_query = selectedCategoryLabel(row)
  applyFormulaToRow(row)
  closeCategoryDialog()
}

function setError(message) {
  error.value = message || ''
  if (message) success.value = ''
}

function resetFilters() {
  filters.from_date = toInputDate(firstDay)
  filters.to_date = toInputDate(today)
  filters.doc_no_from = ''
  filters.doc_no_to = ''
  selectedDocKeys.value = new Set()
  documents.value = []
  items.value = []
  formulaRules.value = []
  setError('')
  success.value = ''
}

function openDocumentDialog() {
  documentDialogOpen.value = true
  if (!documents.value.length) loadDocuments()
}

async function openProductDialog() {
  productDialogOpen.value = true
  if (!formulaRules.value.length) await loadAllMarginMaster()
}

async function loadDocuments() {
  loadingDocs.value = true
  setError('')
  success.value = ''
  selectedDocKeys.value = new Set()
  try {
    const { data } = await api.get('/price-adjustment/documents', {
      params: {
        from_date: filters.from_date,
        to_date: filters.to_date,
        doc_no_from: filters.doc_no_from,
        doc_no_to: filters.doc_no_to,
        limit: 300,
      },
    })
    documents.value = data.data || []
  } catch (err) {
    setError(err.message)
  } finally {
    loadingDocs.value = false
  }
}

async function loadItemsAndCloseDialog() {
  await loadItems()
  if (!error.value) {
    documentDialogOpen.value = false
    activeTab.value = 'price'
  }
}

function toggleDoc(doc) {
  const next = new Set(selectedDocKeys.value)
  const key = docKey(doc)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedDocKeys.value = next
}

function toggleSelectAllDocs() {
  if (allDocsSelected.value) {
    selectedDocKeys.value = new Set()
    return
  }
  selectedDocKeys.value = new Set(documents.value.map(docKey))
}

function toggleProduct(product) {
  const next = new Set(selectedProductKeys.value)
  if (next.has(product.item_code)) next.delete(product.item_code)
  else next.add(product.item_code)
  selectedProductKeys.value = next
}

function toggleSelectAllProducts() {
  if (allProductsSelected.value) {
    selectedProductKeys.value = new Set()
    return
  }
  selectedProductKeys.value = new Set(productRows.value.map((product) => product.item_code))
}

function clearProductSearch() {
  productSearch.value = ''
  clearProductCategory(false)
  selectedProductKeys.value = new Set()
  productRows.value = []
}

async function searchProducts() {
  loadingProducts.value = true
  setError('')
  success.value = ''
  selectedProductKeys.value = new Set()
  if (!formulaRules.value.length) await loadAllMarginMaster()
  applyProductCategoryFilter()
  productCategoryDropdownOpen.value = false
  const params = { q: productSearch.value }
  if (productCategoryCode.value) params.category_code = productCategoryCode.value
  try {
    const { data } = await api.get('/price-adjustment/formula-products', {
      params,
    })
    productRows.value = data.data || []
  } catch (err) {
    setError(err.message)
  } finally {
    loadingProducts.value = false
  }
}

async function loadItems() {
  const docs = selectedDocuments()
  if (!docs.length) {
    setError('กรุณาเลือกเอกสารก่อนดึงรายการสินค้า')
    return
  }

  loadingItems.value = true
  setError('')
  success.value = ''
  try {
    const { data } = await api.post('/price-adjustment/items-from-documents', {
      documents: docs,
    })
    items.value = (data.data || []).map(normalizeItemRow)
    await loadAllMarginMaster()
    activeTab.value = 'price'
    if (!items.value.length) setError('ไม่พบรายการสินค้าในเอกสารที่เลือก')
  } catch (err) {
    setError(err.message)
  } finally {
    loadingItems.value = false
  }
}

async function loadItemsFromProductsAndCloseDialog() {
  await loadItemsFromProducts()
  if (!error.value) {
    productDialogOpen.value = false
    activeTab.value = 'price'
  }
}

async function loadItemsFromProducts() {
  const products = selectedProducts()
  if (!products.length) {
    setError('กรุณาเลือกสินค้าก่อนดึงรายการสินค้า')
    return
  }

  loadingItems.value = true
  setError('')
  success.value = ''
  try {
    const { data } = await api.post('/price-adjustment/items-from-products', {
      products,
    })
    items.value = (data.data || []).map(normalizeItemRow)
    await loadAllMarginMaster()
    activeTab.value = 'price'
    if (!items.value.length) setError('ไม่พบราคาตามสูตรของสินค้าที่เลือก')
  } catch (err) {
    setError(err.message)
  } finally {
    loadingItems.value = false
  }
}

function hasOtherPrice(row) {
  return Number(row.other_price_count || 0) > 0
}

function otherPriceSummaryText(row) {
  const parts = []
  if (Number(row.customer_price_count || 0) > 0) parts.push(`ลูกค้า ${formatInt(row.customer_price_count)}`)
  if (Number(row.group_price_count || 0) > 0) parts.push(`กลุ่ม ${formatInt(row.group_price_count)}`)
  if (Number(row.qty_price_count || 0) > 0) parts.push(`จำนวน ${formatInt(row.qty_price_count)}`)
  return parts.length ? parts.join(' · ') : `${formatInt(row.other_price_count)} รายการ`
}

async function openOtherPriceDialog(row) {
  selectedOtherPriceItem.value = row
  otherPriceDialogOpen.value = true
  otherPriceRows.value = []
  loadingOtherPrices.value = true
  setError('')
  try {
    const { data } = await api.get('/price-adjustment/other-prices', {
      params: {
        item_code: row.item_code,
        unit_code: row.unit_code,
      },
    })
    otherPriceRows.value = data.data || []
  } catch (err) {
    setError(err.message)
  } finally {
    loadingOtherPrices.value = false
  }
}

async function openHistoryTab() {
  activeTab.value = 'history'
  if (!historyRows.value.length) await loadHistory()
}

async function openFormulaTab() {
  activeTab.value = 'formula'
  if (!formulaRules.value.length) await loadAllMarginMaster()
}

async function loadHistory() {
  loadingHistory.value = true
  setError('')
  try {
    const { data } = await api.get('/price-adjustment/history', {
      params: { limit: 100 },
    })
    historyRows.value = data.data || []
    if (historyRows.value.length) {
      const stillSelected = historyRows.value.find((row) => row.doc_no === selectedHistory.value?.doc_no)
      await loadHistoryDetails(stillSelected || historyRows.value[0])
    } else {
      selectedHistory.value = null
      historyDetails.value = []
    }
  } catch (err) {
    setError(err.message)
  } finally {
    loadingHistory.value = false
  }
}

async function loadHistoryDetails(row) {
  if (!row?.doc_no) return
  selectedHistory.value = row
  loadingHistoryDetails.value = true
  setError('')
  try {
    const { data } = await api.get(`/price-adjustment/history/${encodeURIComponent(row.doc_no)}/details`)
    historyDetails.value = data.data || []
  } catch (err) {
    setError(err.message)
    historyDetails.value = []
  } finally {
    loadingHistoryDetails.value = false
  }
}

function exportHistoryExcel() {
  if (!selectedHistory.value || historyDetails.value.length === 0) return

  const headers = [
    'เลขที่เอกสาร',
    'วันที่บันทึก',
    'ผู้บันทึก',
    'รหัสสินค้า',
    'ชื่อสินค้า',
    'หน่วย',
    'ภาษี',
    'รหัสกลุ่มสูตรราคา',
    'กลุ่มสูตรราคา',
    'คำสั่ง',
  ]
  for (const field of priceFields) {
    headers.push(`${priceLabel(field)} เก่า`, `${priceLabel(field)} ใหม่`, `${priceLabel(field)} ต่าง`)
  }

  const rows = historyDetails.value.map((row) => {
    const cells = [
      textCell(row.doc_no || selectedHistory.value.doc_no),
      textCell(formatDateTime(row.create_date_time_now || selectedHistory.value.create_datetime)),
      textCell(row.creator_code || selectedHistory.value.creator_code || ''),
      textCell(row.ic_code),
      textCell(row.item_name || ''),
      textCell(row.unit_code || ''),
      numberCell(row.tax_type, 0),
      textCell(row.formula_category_code || ''),
      textCell(row.formula_category_name || ''),
      textCell(row.command || ''),
    ]
    for (const field of priceFields) {
      cells.push(
        row.old_price_available ? numberCell(row.old_prices?.[field]) : textCell(''),
        numberCell(row.new_prices?.[field]),
        row.old_price_available ? numberCell(historyDiff(row, field)) : textCell(''),
      )
    }
    return cells
  })

  const html = excelHtml([
    [`ประวัติการปรับราคา ${selectedHistory.value.doc_no || ''}`],
    [`บันทึกโดย ${selectedHistory.value.creator_code || '-'} วันที่ ${formatDateTime(selectedHistory.value.create_datetime)}`],
    [],
    headers.map(textCell),
    ...rows,
  ])
  const filename = `price-adjustment-history-${safeFilePart(selectedHistory.value.doc_no || 'export')}.xls`
  downloadBlob(filename, html, 'application/vnd.ms-excel;charset=utf-8')
}

function exportPriceExcel() {
  if (items.value.length === 0) return

  const headers = [
    'รหัสสินค้า',
    'ชื่อสินค้า',
    'หน่วย',
    'อัตราส่วน',
    'รหัสกลุ่มสินค้า',
    'กลุ่มสินค้า',
    'ลำดับหน่วย',
    'ภาษี',
    'ราคารวมซื้อสูงสุด',
    'ต้นทุนเฉลี่ย',
    'เอกสารอ้างอิง',
    'จำนวนเอกสาร',
    'จำนวนรายการอ้างอิง',
  ]
  for (const field of priceFields) {
    headers.push(`${priceLabel(field)} เก่า`, `${priceLabel(field)} ใหม่`, `${priceLabel(field)} ต่าง`)
  }

  const rows = items.value.map((row) => {
    const cells = [
      textCell(row.item_code),
      textCell(row.item_name || ''),
      textCell(row.unit_code || ''),
      numberCell(row.unit_ratio, 4),
      textCell(row.selected_category_code || row.category_code || ''),
      textCell(row.selected_category_name || row.category_name || ''),
      numberCell(row.unit_row_order, 0),
      numberCell(row.vat_type, 0),
      numberCell(row.purchase_price),
      numberCell(row.average_cost),
      textCell(row.source_docs || row.source_doc_no || ''),
      numberCell(row.source_doc_count, 0),
      numberCell(row.source_line_count, 0),
    ]
    for (const field of priceFields) {
      cells.push(
        hasOldPrice(row, field) ? numberCell(row.old_prices?.[field]) : textCell(''),
        numberCell(row.new_prices?.[field]),
        hasOldPrice(row, field) ? numberCell(priceDiff(row, field)) : textCell(''),
      )
    }
    return cells
  })

  const html = excelHtml([
    ['ตารางปรับราคาสินค้า'],
    [`Export ${formatDateTime(new Date().toISOString())} จำนวน ${formatInt(items.value.length)} รายการ`],
    [],
    headers.map(textCell),
    ...rows,
  ])
  const filename = `price-adjustment-check-${safeFilePart(new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'))}.xls`
  downloadBlob(filename, html, 'application/vnd.ms-excel;charset=utf-8')
}

function price9Changed(row) {
  const newPrice = normalizedPrice(row.new_prices?.price_9 ?? row.price_9)
  if (!Number.isFinite(newPrice)) return false
  const hasOld = row.old_price_available === false ? false : hasOldPrice(row, 'price_9')
  if (!hasOld) return newPrice > 0
  const oldPrice = normalizedPrice(row.old_prices?.price_9 ?? row.old_price_9)
  return Number.isFinite(oldPrice) && newPrice !== oldPrice
}

function buildBarcodePrintRows(rows) {
  return rows
    .filter((row) => price9Changed(row))
    .map((row) => {
      const ratio = Number(row.unit_ratio || 1) || 1
      const price9 = normalizedPrice(row.new_prices?.price_9 ?? row.price_9)
      const barcode = String(row.barcode || '').trim()
      return {
        item_code: row.item_code || row.ic_code || '',
        item_name: row.barcode_description || row.item_name || '',
        unit_code: row.unit_code || '',
        ratio,
        barcode,
        price_9: price9,
        unit_per_value: ratio ? price9 / ratio : price9,
        show_unit_price: Math.abs(ratio - 1) > 0.000001,
      }
    })
    .filter((row) => row.barcode && Number.isFinite(row.price_9))
}

function printPriceBarcodes() {
  printBarcodeLabels(printablePriceBarcodeRows.value, 'พิมพ์บาร์โค้ดจากตารางปรับราคา')
}

function printHistoryBarcodes() {
  printBarcodeLabels(printableHistoryBarcodeRows.value, `พิมพ์บาร์โค้ดจากประวัติ ${selectedHistory.value?.doc_no || ''}`)
}

function printBarcodeLabels(rows, title) {
  if (!rows.length) {
    setError('ไม่มีรายการที่ราคา 9 ใหม่มีส่วนต่างและมีบาร์โค้ดสำหรับพิมพ์')
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    setError('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต popup แล้วลองใหม่')
    return
  }

  const todayText = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())

  const labels = rows.map((row) => {
    const qrData = encodeURIComponent(row.barcode)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=0&data=${qrData}`
    const unitPriceHtml = row.show_unit_price
      ? `
            <div class="unit-caption">ราคา [ย่อย] ต่อหน่วย<br><span>Price/Unit :</span></div>
            <div class="unit-price">${escapeHtml(formatBarcodeUnitPrice(row.unit_per_value))} <span>ชิ้น</span></div>`
      : ''
    return `
      <article class="barcode-label">
        <section class="label-top">
          <div class="price-box">
            <div class="tiny-label">ราคา<br><span>Price</span></div>
            <div class="main-price">${escapeHtml(formatBarcodePrice(row.price_9))}<span>${escapeHtml(row.unit_code)}</span></div>
            ${unitPriceHtml}
          </div>
          <div class="qr-box">
            <img class="qr-code" src="${qrUrl}" alt="QR ${escapeHtml(row.barcode)}" />
            <div class="barcode-text">${escapeHtml(row.barcode)}</div>
            <div class="print-date">${escapeHtml(todayText)}</div>
          </div>
        </section>
        <section class="description">${escapeHtml(row.item_name || row.item_code || '-')}</section>
      </article>
    `
  }).join('')

  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 6mm; }
    * { box-sizing: border-box; }
    html {
      margin: 0;
      padding: 0;
      background: #fff;
    }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: Tahoma, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      display: grid;
      grid-template-columns: repeat(3, 80mm);
      grid-auto-rows: 42mm;
      gap: 1mm 1mm;
      align-content: start;
      justify-content: start;
      width: 100%;
      min-height: 194mm;
      margin: 0;
      padding: 0;
    }
    .barcode-label {
      width: 80mm;
      height: 42mm;
      overflow: hidden;
      border: 0.7mm solid #555;
      page-break-inside: avoid;
      background: white;
    }
    .label-top {
      display: grid;
      grid-template-columns: 49mm 31mm;
      height: 28.5mm;
      border-bottom: 0.35mm solid #555;
    }
    .price-box {
      position: relative;
      padding: 2mm 2.4mm;
      border-right: 0.35mm solid #555;
    }
    .tiny-label {
      font-size: 7pt;
      font-weight: 700;
      line-height: 1;
    }
    .tiny-label span,
    .unit-caption span {
      font-size: 6.5pt;
    }
    .main-price {
      margin-top: 0mm;
      text-align: center;
      font-size: 21pt;
      font-weight: 800;
      line-height: 1;
      letter-spacing: 0;
    }
    .main-price span {
      margin-left: 1.4mm;
      font-size: 10pt;
      font-weight: 800;
    }
    .unit-caption {
      margin-top: 1.8mm;
      font-size: 7pt;
      font-weight: 700;
      line-height: 1.05;
    }
    .unit-price {
      margin-top: -2.5mm;
      padding-right: 2mm;
      text-align: right;
      font-size: 13pt;
      font-weight: 800;
      line-height: 1;
    }
    .unit-price span {
      font-size: 9pt;
      font-weight: 800;
    }
    .qr-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.4mm 1mm 0.8mm;
    }
    .qr-code {
      width: 13.5mm;
      height: 13.5mm;
      object-fit: contain;
      image-rendering: pixelated;
    }
    .barcode-text {
      margin-top: 1mm;
      max-width: 27mm;
      overflow: hidden;
      text-align: center;
      font-family: "Courier New", monospace;
      font-size: 7pt;
      line-height: 1;
      white-space: nowrap;
    }
    .print-date {
      margin-top: 0.4mm;
      font-size: 6.8pt;
      font-weight: 700;
      line-height: 1;
    }
    .description {
      height: 13.5mm;
      padding: 2mm 2.4mm;
      overflow: hidden;
      font-size: 9pt;
      font-weight: 800;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <main class="sheet">${labels}</main>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 800);
    });
  <\/script>
</body>
</html>`)
  printWindow.document.close()
}

function formatBarcodePrice(value) {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatBarcodeUnitPrice(value) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))
}

function applyPurchasePrice(row) {
  const value = roundedPrice(row.purchase_price)
  for (const field of priceFields) row.new_prices[field] = value
}

function applyOldPrices(row) {
  for (const field of priceFields) {
    row.new_prices[field] = hasOldPrice(row, field) ? roundedPrice(row.old_prices?.[field]) : ''
  }
}

function fillEmptyFromPurchase() {
  for (const row of items.value) {
    const value = roundedPrice(row.purchase_price)
    for (const field of priceFields) {
      if (row.new_prices[field] === '' || row.new_prices[field] == null) row.new_prices[field] = value
    }
  }
}

function categoryKey(row) {
  return row.selected_category_code || row.category_code || '__blank__'
}

function emptyMargins(fields, initial = 0) {
  return Object.fromEntries(fields.map((field) => [field, initial]))
}

function ruleFromMaster(row) {
  return {
    key: row.category_code || '__blank__',
    category_code: row.category_code || '',
    category_name: row.category_name || '',
    price_margins: Object.fromEntries(priceFields.map((field) => [field, marginNumber(row[`${field}_margin`])])),
    unit_margins: Object.fromEntries(unitMarginFields.map((field) => [field, marginNumber(row[`unit_${field}_margin`])])),
  }
}

async function loadAllMarginMaster() {
  loadingMargins.value = true
  try {
    const { data } = await api.get('/price-adjustment/margin-master')
    syncFormulaRules(data.data || [])
  } catch (err) {
    setError(err.message)
    formulaRules.value = []
  } finally {
    loadingMargins.value = false
  }
}

function syncFormulaRules(masterRows = []) {
  const existing = new Map(formulaRules.value.map((rule) => [rule.key, rule]))
  const next = masterRows.map((row) => {
    const master = ruleFromMaster(row)
    return existing.get(master.key) || master
  })
  for (const row of items.value) {
    const key = categoryKey(row)
    if (next.some((rule) => rule.key === key)) continue
    const old = existing.get(key)
    next.push(old || {
      key,
      category_code: row.selected_category_code || row.category_code || '',
      category_name: row.selected_category_name || row.category_name || '',
      price_margins: emptyMargins(priceFields),
      unit_margins: emptyMargins(unitMarginFields),
    })
  }
  formulaRules.value = next
}

async function saveMarginMaster() {
  const rows = formulaRules.value.filter((rule) => rule.category_code)
  if (!rows.length) {
    setError('ไม่มีหมวดสินค้าสำหรับบันทึก master margin')
    return
  }

  const payload = rows.map((rule) => {
    const item = {
      category_code: rule.category_code,
      category_name: rule.category_name,
    }
    for (const field of priceFields) item[`${field}_margin`] = marginNumber(rule.price_margins[field])
    for (const field of unitMarginFields) item[`unit_${field}_margin`] = marginNumber(rule.unit_margins[field])
    return item
  })

  savingMargins.value = true
  setError('')
  success.value = ''
  try {
    const { data } = await api.put('/price-adjustment/margin-master', { items: payload })
    success.value = `บันทึก master margin สำเร็จ ${formatInt(data.saved_count)} หมวดสินค้า`
  } catch (err) {
    setError(err.message)
  } finally {
    savingMargins.value = false
  }
}

function marginNumber(value) {
  const raw = String(value ?? '').replace(/,/g, '').trim()
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function formulaRuleFor(row) {
  return formulaRules.value.find((rule) => rule.key === categoryKey(row))
}

function unitMarginKey(row) {
  const order = Math.trunc(Number(row.unit_row_order || 0))
  return unitMarginFields.includes(order) ? order : null
}

function calculatedFormulaPrice(row, field) {
  const rule = formulaRuleFor(row)
  const priceMargin = marginNumber(rule?.price_margins?.[field])
  const unitKey = unitMarginKey(row)
  const unitMargin = unitKey == null ? 0 : marginNumber(rule?.unit_margins?.[unitKey])
  const price = Number(row.purchase_price || 0) * (1 + (priceMargin + unitMargin) / 100)
  return roundedPrice(price)
}

function applyFormulaToRow(row) {
  for (const field of priceFields) {
    row.new_prices[field] = calculatedFormulaPrice(row, field)
  }
}

function applyFormulaToItems() {
  for (const row of items.value) {
    applyCategorySelection(row)
    applyFormulaToRow(row)
  }
}

function roundedPrice(value) {
  const raw = String(value ?? '').replace(/,/g, '').trim()
  if (!raw) return '0'
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return ''
  return String(Math.ceil(n))
}

function normalizedPrice(value) {
  const raw = String(value ?? '').replace(/,/g, '').trim()
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.ceil(n) : NaN
}

function rowHasSaveChange(row) {
  return priceFields.some((field) => {
    const newPrice = normalizedPrice(row.new_prices?.[field])
    if (!Number.isFinite(newPrice)) return false
    if (!hasOldPrice(row, field)) return newPrice > 0
    return newPrice !== normalizedPrice(row.old_prices?.[field])
  })
}

function buildSavePayload() {
  if (!items.value.length) {
    setError('ไม่มีรายการสำหรับบันทึก')
    return null
  }

  const payloadItems = []
  for (const row of items.value) {
    applyCategorySelection(row)
    const item = {
      item_code: row.item_code,
      unit_code: row.unit_code,
      tax_type: Number(row.vat_type || 0),
      formula_category_code: row.selected_category_code || row.category_code || '',
      formula_category_name: row.selected_category_name || row.category_name || '',
    }
    for (const field of priceFields) {
      const price = normalizedPrice(row.new_prices[field])
      if (!Number.isFinite(price)) {
        setError(`ราคาของสินค้า ${row.item_code} ช่อง ${priceLabel(field)} ต้องเป็นตัวเลขและไม่ติดลบ`)
        return null
      }
      item[field] = price
    }
    if (rowHasSaveChange(row)) payloadItems.push(item)
  }

  if (!payloadItems.length) {
    setError('ไม่มีรายการที่มีการเปลี่ยนแปลงราคา')
    return null
  }

  return payloadItems
}

function openSaveDialog() {
  const payloadItems = buildSavePayload()
  if (!payloadItems) return
  pendingSaveItems.value = payloadItems
  saveDialogOpen.value = true
  setError('')
}

function closeSaveDialog() {
  if (saving.value) return
  saveDialogOpen.value = false
}

async function confirmSavePrices() {
  await savePrices(pendingSaveItems.value)
}

async function savePrices(payloadItems) {
  if (!payloadItems?.length) return

  saving.value = true
  setError('')
  success.value = ''
  try {
    const { data } = await api.post('/price-adjustment/save', {
      remark: `CRM price adjustment from ${selectedCount.value} purchase documents`,
      items: payloadItems,
    })
    const message = `บันทึกสำเร็จ เอกสาร ${data.doc_no} ทั้งหมด ${formatInt(data.saved_count)} รายการ (เพิ่ม ${formatInt(data.insert_count)}, แก้ไข ${formatInt(data.update_count)})`
    saveDialogOpen.value = false
    pendingSaveItems.value = []
    if (selectedCount.value > 0) await loadItems()
    await loadHistory()
    success.value = message
  } catch (err) {
    setError(err.message)
  } finally {
    saving.value = false
  }
}

function priceLabel(field) {
  return `ราคา ${field.split('_')[1]}`
}

function priceIndex(field) {
  return field.split('_')[1]
}

function priceBandClass(field) {
  return Number(priceIndex(field)) % 2 === 0 ? 'bg-slate-50' : 'bg-white'
}

function saleTypeName(value) {
  const map = { 0: 'ไม่ระบุ', 1: 'ขายสด', 2: 'ขายเชื่อ' }
  return map[Number(value)] || String(value ?? '-')
}

function transportTypeName(value) {
  const map = { 0: 'รับเอง', 1: 'ส่งให้' }
  return map[Number(value)] || String(value ?? '-')
}

function otherPriceTypeName(row) {
  const type = Number(row.price_type || 0)
  if (type === 3 || row.cust_code) return 'ตามลูกค้า'
  if (type === 2 || row.cust_group_1 || row.cust_group_2) return 'ตามกลุ่ม'
  if (Number(row.from_qty || 0) !== 0 || Number(row.to_qty || 0) !== 0) return 'ตามจำนวน'
  return 'ราคาอื่น'
}

function otherPriceTypeClass(row) {
  const name = otherPriceTypeName(row)
  if (name === 'ตามลูกค้า') return 'bg-red-100 text-red-700'
  if (name === 'ตามจำนวน') return 'bg-amber-100 text-amber-800'
  if (name === 'ตามกลุ่ม') return 'bg-violet-100 text-violet-700'
  return 'bg-slate-100 text-slate-700'
}

function customerGroupText(row) {
  const parts = []
  if (row.cust_code) parts.push(row.cust_code)
  if (row.cust_group_1) parts.push(`กลุ่มหลัก ${row.cust_group_1}`)
  if (row.cust_group_2) parts.push(`กลุ่มย่อย ${row.cust_group_2}`)
  return parts.join(' · ') || '-'
}

function itemRowBgClass(row) {
  return itemRowBgClasses[itemRowToneMap.value.get(row.item_code || '') ?? 0]
}

function historyRowBgClass(row) {
  return itemRowBgClasses[historyRowToneMap.value.get(row.ic_code || '') ?? 0]
}

function marginLabel(field) {
  return field === 'price_0' ? 'ราคากลาง %' : `${priceLabel(field)} %`
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).slice(0, 10)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function docVatTypeText(doc) {
  if (Number(doc.vat_type_count || 0) > 1) return 'หลายประเภท'
  const labels = {
    0: 'แยกนอก',
    1: 'รวมใน',
    2: 'ภาษีศูนย์',
    3: 'ไม่กระทบภาษี',
  }
  const value = Number(doc.vat_type ?? 0)
  return labels[value] || 'ไม่ทราบ'
}

function docVatTypeClass(doc) {
  if (Number(doc.vat_type_count || 0) > 1) return 'bg-slate-100 text-slate-700 ring-slate-200'
  const classes = {
    0: 'bg-orange-50 text-orange-700 ring-orange-200',
    1: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    2: 'bg-red-50 text-red-700 ring-red-200',
    3: 'bg-slate-100 text-slate-700 ring-slate-200',
  }
  return classes[Number(doc.vat_type ?? 0)] || 'bg-slate-100 text-slate-700 ring-slate-200'
}

function formatInt(value) {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatMoney(value) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))
}

function formatRatio(value) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(Number(value || 0))
}

function formatPriceText(value) {
  if (value === '' || value == null) return '-'
  const n = Number(value)
  return Number.isFinite(n) ? formatMoney(n) : String(value)
}

function hasOldPrice(row, field) {
  const value = row.old_prices?.[field]
  if (value === '' || value == null) return false
  return Number.isFinite(Number(value))
}

function hasAnyOldPrice(row) {
  return priceFields.some((field) => hasOldPrice(row, field))
}

function priceDiff(row, field) {
  const oldPrice = Number(row.old_prices?.[field] || 0)
  const newPrice = Number(row.new_prices?.[field] || 0)
  return Math.round((newPrice - oldPrice) * 100) / 100
}

function formatDiff(row, field) {
  if (!hasOldPrice(row, field) && Number(row.new_prices?.[field] || 0) > 0) return 'ราคาใหม่'
  const diff = priceDiff(row, field)
  if (!Number.isFinite(diff)) return '-'
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(diff)
}

function diffClass(row, field) {
  if (!hasOldPrice(row, field) && Number(row.new_prices?.[field] || 0) > 0) return '!bg-amber-100 text-amber-700'
  const diff = priceDiff(row, field)
  if (diff > 0) return '!bg-green-100 text-green-800'
  if (diff < 0) return '!bg-red-100 text-red-700'
  return 'text-slate-500'
}

function historyDiff(row, field) {
  const oldPrice = Number(row.old_prices?.[field] || 0)
  const newPrice = Number(row.new_prices?.[field] || 0)
  return Math.round((newPrice - oldPrice) * 100) / 100
}

function formatHistoryDiff(row, field) {
  if (!row.old_price_available) return '-'
  const diff = historyDiff(row, field)
  if (!Number.isFinite(diff)) return '-'
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(diff)
}

function textCell(value) {
  return { value: value ?? '', type: 'text' }
}

function numberCell(value, digits = 2) {
  const n = Number(value || 0)
  return { value: Number.isFinite(n) ? n : 0, type: 'number', digits }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function excelHtml(rows) {
  const body = rows.map((row) => {
    if (!row.length) return '<tr><td></td></tr>'
    const cells = row.map((cell) => {
      const normalized = typeof cell === 'object' && cell !== null ? cell : textCell(cell)
      const className = normalized.type === 'number' ? 'number' : 'text'
      return `<td class="${className}">${escapeHtml(normalized.value)}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; }
    td { border: 1px solid #d9e2ec; padding: 4px 8px; font-family: Tahoma, Arial, sans-serif; font-size: 11pt; }
    .text { mso-number-format:"\\@"; }
    .number { mso-number-format:"0.00"; text-align: right; }
  </style>
</head>
<body><table>${body}</table></body>
</html>`
}

function safeFilePart(value) {
  return String(value || 'export').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80)
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function historyDiffClass(row, field) {
  if (!row.old_price_available) return 'text-slate-400'
  const diff = historyDiff(row, field)
  if (diff > 0) return 'text-green-700'
  if (diff < 0) return 'text-red-700'
  return 'text-slate-500'
}

function commandClass(command) {
  return command === 'Insert' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
}
</script>
