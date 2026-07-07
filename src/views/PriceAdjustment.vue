<template>
  <div class="p-6">
    <div class="mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-800">ปรับราคาสินค้า</h1>
        <p class="mt-1 text-sm text-slate-500">เลือกเอกสารซื้อหรือรับสินค้า แล้วนำราคาซื้อสูงสุดต่อสินค้า/หน่วยไปปรับราคาตามสูตร</p>
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
          <button class="btn-secondary justify-center" :disabled="selectedCount === 0 || loadingItems" @click="loadItems">
            ดึงรายการสินค้า
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
        @click="activeTab = 'formula'"
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
          <p class="text-sm text-slate-500">ราคาใหม่ = ราคาซื้อ × (1 + (margin ราคา + margin หน่วย)/100) และถ้ามีเศษทศนิยมจะปัดขึ้นเสมอ</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary justify-center" :disabled="items.length === 0 || loadingMargins" @click="loadMarginMasterForItems">โหลด margin จาก master</button>
          <button class="btn-secondary justify-center" :disabled="items.length === 0 || savingMargins" @click="saveMarginMaster">บันทึก margin เป็น master</button>
          <button class="btn-primary justify-center" :disabled="items.length === 0" @click="applyFormulaToItems">คำนวณราคาจากสูตร</button>
        </div>
      </div>
      <div v-if="items.length === 0" class="py-12 text-center text-sm text-slate-400">
        เลือกเอกสารและดึงรายการสินค้าก่อนตั้งค่าสูตรคำนวณราคา
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
            <tr v-for="rule in formulaRules" :key="rule.key" class="hover:bg-slate-50">
              <td class="sticky left-0 z-10 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-700">{{ rule.category_code || '-' }}</td>
              <td class="sticky left-32 z-10 bg-white px-3 py-2 text-slate-700 shadow-[1px_0_0_#e2e8f0]">{{ rule.category_name || 'ไม่ระบุหมวด' }}</td>
              <td v-for="field in priceFields" :key="`${rule.key}-${field}`" class="px-2 py-2">
                <input v-model="rule.price_margins[field]" type="number" step="0.01" class="input-field h-8 text-right tabular-nums" />
              </td>
              <td
                v-for="(n, index) in unitMarginFields"
                :key="`${rule.key}-unit-${n}`"
                class="bg-emerald-50/60 px-2 py-2"
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
          <p class="text-sm text-slate-500">สินค้าที่พบในเอกสารจะแสดงทุกหน่วยจาก ic_unit_use เลือกราคาซื้อสูงสุด และแสดงราคาเก่า/ใหม่/ส่วนต่างตามคลิป</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary justify-center" :disabled="items.length === 0" @click="fillEmptyFromPurchase">เติมช่องว่างด้วยราคาซื้อสูงสุด</button>
          <button class="btn-secondary justify-center" :disabled="items.length === 0" @click="applyFormulaToItems">คำนวณราคาจากสูตร</button>
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
        <table class="min-w-[4300px] text-sm">
          <thead class="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th class="table-head-static sticky left-0 z-30 w-32 min-w-[8rem] bg-slate-50" rowspan="2" scope="col">รหัสสินค้า</th>
              <th class="table-head-static sticky left-32 z-30 w-64 min-w-[16rem] bg-slate-50 shadow-[1px_0_0_#e2e8f0]" rowspan="2" scope="col">ชื่อสินค้า</th>
              <th class="table-head-static w-24" rowspan="2" scope="col">หน่วย</th>
              <th class="table-head-static w-24 text-right" rowspan="2" scope="col">อัตราส่วน</th>
              <th class="table-head-static w-32" rowspan="2" scope="col">กลุ่มสินค้า</th>
              <th class="table-head-static w-20 text-right" rowspan="2" scope="col">ลำดับหน่วย</th>
              <th class="table-head-static w-20 text-right" rowspan="2" scope="col">ภาษี</th>
              <th class="table-head-static w-28 text-right" rowspan="2" scope="col">ราคาซื้อสูงสุด</th>
              <th class="table-head-static w-44" rowspan="2" scope="col">เอกสารอ้างอิง</th>
              <template v-for="field in priceFields" :key="`${field}-group`">
                <th class="table-head-static border-l border-slate-200 text-center" :class="priceBandClass(field)" colspan="3" scope="colgroup">{{ priceLabel(field) }}</th>
              </template>
              <th class="table-head-static w-28 text-center" rowspan="2" scope="col">คำสั่ง</th>
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
            <tr v-for="row in items" :key="`${row.item_code}|${row.unit_code}`" class="transition hover:brightness-[0.98]">
              <td class="sticky left-0 z-10 px-3 py-2 align-top font-mono text-xs font-semibold text-slate-700" :class="itemRowBgClass(row)">{{ row.item_code }}</td>
              <td class="sticky left-32 z-10 px-3 py-2 align-top shadow-[1px_0_0_#e2e8f0]" :class="itemRowBgClass(row)">
                <p class="font-medium text-slate-800">{{ row.item_name || '-' }}</p>
                <p class="mt-1 text-xs text-slate-400">จาก {{ row.source_doc_count }} เอกสาร / {{ row.source_line_count }} รายการ</p>
              </td>
              <td class="px-3 py-2 align-top text-slate-600" :class="itemRowBgClass(row)">{{ row.unit_code }}</td>
              <td class="px-3 py-2 align-top text-right text-slate-600 tabular-nums" :class="itemRowBgClass(row)">{{ formatRatio(row.unit_ratio) }}</td>
              <td class="px-3 py-2 align-top" :class="itemRowBgClass(row)">
                <p class="text-slate-700">{{ row.group_main || '-' }}</p>
                <p class="text-xs text-slate-400">สูตร: {{ row.category_name || row.category_code || '-' }}</p>
              </td>
              <td class="px-3 py-2 align-top text-right text-slate-600 tabular-nums" :class="itemRowBgClass(row)">{{ formatInt(row.unit_row_order) }}</td>
              <td class="px-3 py-2 align-top text-right text-slate-600 tabular-nums" :class="itemRowBgClass(row)">{{ formatInt(row.vat_type) }}</td>
              <td class="px-3 py-2 align-top text-right font-semibold text-slate-800 tabular-nums" :class="itemRowBgClass(row)">{{ formatMoney(row.purchase_price) }}</td>
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
                <button class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white" @click="applyPurchasePrice(row)">
                  ใช้ราคาซื้อ
                </button>
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
        <button class="btn-secondary justify-center" :disabled="loadingHistory" @click="loadHistory">โหลดประวัติใหม่</button>
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
              <table class="min-w-[3400px] text-sm">
                <thead class="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th class="table-head-static sticky left-0 z-20 w-32 bg-slate-50" rowspan="2">รหัสสินค้า</th>
                    <th class="table-head-static sticky left-32 z-20 w-64 bg-slate-50 shadow-[1px_0_0_#e2e8f0]" rowspan="2">ชื่อสินค้า</th>
                    <th class="table-head-static w-24" rowspan="2">หน่วย</th>
                    <th class="table-head-static w-20 text-right" rowspan="2">ภาษี</th>
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
                  <tr v-for="row in savePreviewRows" :key="`${row.item_code}|${row.unit_code}`">
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
          <table v-else class="w-full min-w-[980px] text-sm">
            <thead class="sticky top-0 bg-slate-50">
              <tr>
                <th class="table-head-static w-14 text-center">
                  <input type="checkbox" class="h-4 w-4 rounded border-slate-300" :checked="allDocsSelected" @change="toggleSelectAllDocs" />
                </th>
                <th class="table-head-static w-32">วันที่</th>
                <th class="table-head-static w-44">เลขที่เอกสาร</th>
                <th class="table-head-static w-28">ประเภท</th>
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
const activeTab = ref('price')
const documentDialogOpen = ref(false)
const saveDialogOpen = ref(false)
const loadingDocs = ref(false)
const loadingItems = ref(false)
const loadingMargins = ref(false)
const loadingHistory = ref(false)
const loadingHistoryDetails = ref(false)
const savingMargins = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const pendingSaveItems = ref([])
const historyRows = ref([])
const selectedHistory = ref(null)
const historyDetails = ref([])

const selectedCount = computed(() => selectedDocKeys.value.size)
const allDocsSelected = computed(() => documents.value.length > 0 && selectedDocKeys.value.size === documents.value.length)
const savePreviewRows = computed(() => items.value.slice(0, 8))
const saveUpdateEstimate = computed(() => items.value.filter((row) => hasAnyOldPrice(row)).length)
const saveInsertEstimate = computed(() => Math.max(pendingSaveItems.value.length - saveUpdateEstimate.value, 0))
const itemRowBgClasses = ['bg-white', 'bg-sky-50/70', 'bg-emerald-50/70', 'bg-amber-50/60', 'bg-violet-50/60']
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

function selectedDocuments() {
  return documents.value
    .filter((doc) => selectedDocKeys.value.has(docKey(doc)))
    .map((doc) => ({ doc_no: doc.doc_no, trans_flag: doc.trans_flag }))
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
    items.value = (data.data || []).map((row) => ({
      ...row,
      old_prices: { ...(row.old_prices || {}) },
      new_prices: { ...(row.new_prices || {}) },
    }))
    await loadMarginMasterForItems()
    activeTab.value = 'price'
    if (!items.value.length) setError('ไม่พบรายการสินค้าในเอกสารที่เลือก')
  } catch (err) {
    setError(err.message)
  } finally {
    loadingItems.value = false
  }
}

async function openHistoryTab() {
  activeTab.value = 'history'
  if (!historyRows.value.length) await loadHistory()
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

function applyPurchasePrice(row) {
  const value = roundedPrice(row.purchase_price)
  for (const field of priceFields) row.new_prices[field] = value
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
  return row.category_code || '__blank__'
}

function emptyMargins(fields, initial = 0) {
  return Object.fromEntries(fields.map((field) => [field, initial]))
}

function uniqueCategoryCodes() {
  return [...new Set(items.value.map((row) => row.category_code).filter(Boolean))]
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

async function loadMarginMasterForItems() {
  if (!items.value.length) {
    formulaRules.value = []
    return
  }

  const codes = uniqueCategoryCodes()
  if (!codes.length) {
    syncFormulaRules(new Map())
    return
  }

  loadingMargins.value = true
  try {
    const { data } = await api.get('/price-adjustment/margin-master', {
      params: { category_codes: codes.join(',') },
    })
    const masterMap = new Map((data.data || []).map((row) => [row.category_code, ruleFromMaster(row)]))
    syncFormulaRules(masterMap)
  } catch (err) {
    setError(err.message)
    syncFormulaRules(new Map())
  } finally {
    loadingMargins.value = false
  }
}

function syncFormulaRules(masterMap = new Map()) {
  const existing = new Map(formulaRules.value.map((rule) => [rule.key, rule]))
  const next = []
  for (const row of items.value) {
    const key = categoryKey(row)
    if (next.some((rule) => rule.key === key)) continue
    const master = masterMap.get(row.category_code)
    const old = existing.get(key)
    next.push(master || old || {
      key,
      category_code: row.category_code || '',
      category_name: row.category_name || '',
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

function applyFormulaToItems() {
  for (const row of items.value) {
    for (const field of priceFields) {
      row.new_prices[field] = calculatedFormulaPrice(row, field)
    }
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

function buildSavePayload() {
  if (!items.value.length) {
    setError('ไม่มีรายการสำหรับบันทึก')
    return null
  }

  const payloadItems = []
  for (const row of items.value) {
    const item = { item_code: row.item_code, unit_code: row.unit_code, tax_type: Number(row.vat_type || 0) }
    for (const field of priceFields) {
      const price = normalizedPrice(row.new_prices[field])
      if (!Number.isFinite(price)) {
        setError(`ราคาของสินค้า ${row.item_code} ช่อง ${priceLabel(field)} ต้องเป็นตัวเลขและไม่ติดลบ`)
        return null
      }
      item[field] = price
    }
    payloadItems.push(item)
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
    await loadItems()
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
