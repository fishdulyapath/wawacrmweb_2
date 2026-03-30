<template>
  <div class="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-800">รายงานยอดขาย</h1>
        <p class="text-sm text-slate-500 mt-0.5">ข้อมูลจากระบบ POS (เอกสารขาย)</p>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <!-- Presets -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="p in presets" :key="p.key"
          @click="applyPreset(p.key)"
          :class="activePreset === p.key
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'"
          class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
        >{{ p.label }}</button>
      </div>
      <!-- Inputs row -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1.5">
          <label class="text-xs text-slate-500 whitespace-nowrap">จากวันที่</label>
          <input v-model="filter.date_from" type="date" class="filter-input" />
        </div>
        <div class="flex items-center gap-1.5">
          <label class="text-xs text-slate-500 whitespace-nowrap">ถึงวันที่</label>
          <input v-model="filter.date_to" type="date" class="filter-input" />
        </div>
        <!-- Searchable salesperson picker -->
        <div class="relative">
          <input
            v-model="saleSearch"
            @focus="saleDropOpen = true"
            @blur="saleBlur"
            @input="saleDropOpen = true"
            class="filter-input w-44"
            placeholder="ค้นหาพนักงาน..."
            autocomplete="off"
          />
          <button v-if="filter.sale_code" type="button"
            @click="filter.sale_code = ''; saleSearch = ''"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <div v-if="saleDropOpen && filteredSalespeople.length"
            class="absolute z-50 left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg w-56 max-h-56 overflow-y-auto">
            <button
              @mousedown.prevent="selectSalesperson({ code: '', name_1: '' })"
              class="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 border-b border-slate-100">
              — พนักงานทั้งหมด —
            </button>
            <button v-for="e in filteredSalespeople" :key="e.code"
              type="button"
              @mousedown.prevent="selectSalesperson(e)"
              class="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
              <p class="text-sm font-medium text-slate-800">{{ e.name_1 || e.code }}</p>
              <p class="text-xs text-slate-400">{{ e.code }}</p>
            </button>
          </div>
        </div>
        <button @click="load" :disabled="loadingMain"
          class="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <span v-if="loadingMain">กำลังโหลด...</span>
          <span v-else>โหลดข้อมูล</span>
        </button>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
      <button
        v-for="t in tabs" :key="t.key"
        @click="activeTab = t.key"
        :class="activeTab === t.key
          ? 'bg-white text-slate-800 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
      >{{ t.label }}</button>
    </div>

    <!-- ══ TAB: ภาพรวม ══ -->
    <div v-show="activeTab === 'overview'">

      <!-- Target Card -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2 shrink-0">
            <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span class="text-sm font-semibold text-slate-700">เป้าหมาย</span>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="targetInput"
              @change="saveTarget"
              type="number" min="0" step="1000"
              class="filter-input w-36 text-right font-mono"
              placeholder="0"
            />
            <span class="text-xs text-slate-400">บาท</span>
          </div>
          <div class="flex-1 min-w-[200px]">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-slate-500">ยอดขายช่วงนี้</span>
              <span class="text-xs font-semibold" :class="vsTarget >= 100 ? 'text-emerald-600' : 'text-slate-700'">
                {{ fmtAmount(periodSales) }} บาท
                <span v-if="target > 0" class="ml-1">({{ vsTarget }}%)</span>
              </span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                class="h-2.5 rounded-full transition-all duration-500"
                :class="vsTarget >= 100 ? 'bg-emerald-500' : vsTarget >= 60 ? 'bg-blue-500' : 'bg-amber-400'"
                :style="{ width: Math.min(vsTarget, 100) + '%' }"
              ></div>
            </div>
            <div v-if="target > 0" class="flex justify-between mt-1">
              <span class="text-xs text-slate-400">เป้า {{ fmtAmount(target) }} บาท</span>
              <span class="text-xs" :class="vsTarget >= 100 ? 'text-emerald-600 font-medium' : 'text-slate-400'">
                {{ vsTarget >= 100 ? 'บรรลุเป้าหมาย!' : `ขาดอีก ${fmtAmount(target - periodSales)} บาท` }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">ยอดขายรวม</p>
          <p class="text-2xl font-bold text-slate-800 mt-1">{{ fmtAmount(summary.total_amount) }}</p>
          <p class="text-xs text-slate-400 mt-0.5">บาท</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">จำนวนใบขาย</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{{ (summary.total_orders || 0).toLocaleString() }}</p>
          <p class="text-xs text-slate-400 mt-0.5">ใบ</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">เฉลี่ย/ใบ</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ fmtAmount(summary.avg_order_value) }}</p>
          <p class="text-xs text-slate-400 mt-0.5">บาท</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">ส่วนลดรวม</p>
          <p class="text-2xl font-bold text-amber-500 mt-1">{{ fmtAmount(summary.total_discount) }}</p>
          <p class="text-xs text-slate-400 mt-0.5">บาท</p>
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <!-- Trend line chart -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-slate-700">แนวโน้มยอดขาย</h3>
            <div class="flex gap-1">
              <button v-for="tp in trendPeriods" :key="tp.key"
                @click="trendPeriod = tp.key; loadTrend()"
                :class="trendPeriod === tp.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                class="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              >{{ tp.label }}</button>
            </div>
          </div>
          <div class="h-52">
            <Line v-if="trendChartData.labels.length" :data="trendChartData" :options="trendChartOpts" />
            <div v-else class="h-full flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูล</div>
          </div>
        </div>

        <!-- Doughnut top customers -->
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h3 class="text-sm font-semibold text-slate-700 mb-3">Top 5 ลูกค้า</h3>
          <div class="h-40 flex items-center justify-center">
            <Doughnut v-if="topCustChartData.labels.length" :data="topCustChartData" :options="doughnutOpts" />
            <span v-else class="text-slate-400 text-sm">ไม่มีข้อมูล</span>
          </div>
          <div class="mt-3 space-y-1.5">
            <div v-for="(r, i) in (summary.top_customers || [])" :key="r.cust_code"
              class="flex items-center gap-2 text-xs">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: chartColors[i] }"></span>
              <span class="text-slate-600 truncate flex-1">{{ r.cust_name || r.cust_code }}</span>
              <span class="font-medium text-slate-700">{{ fmtAmount(r.total_amount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- TOP 5 Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <!-- TOP 5 สินค้าขายดี -->
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h3 class="text-sm font-semibold text-slate-700 mb-3">TOP 5 สินค้าขายดี</h3>
          <div v-if="loadingRanking" class="h-40 flex items-center justify-center">
            <svg class="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <template v-else>
            <div class="h-48">
              <Bar v-if="topProductsChartData.labels.length" :data="topProductsChartData" :options="rankingBarOpts" />
              <div v-else class="h-full flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูล</div>
            </div>
            <div class="mt-3 space-y-1.5">
              <div v-for="(r, i) in topProducts" :key="r.item_code" class="flex items-center gap-2 text-xs">
                <span class="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  :style="{ background: chartColors[i] }">{{ i + 1 }}</span>
                <span class="text-slate-600 truncate flex-1">{{ r.item_name || r.item_code }}</span>
                <span class="text-slate-400 shrink-0">{{ r.total_qty }} ชิ้น</span>
                <span class="font-semibold text-slate-700 shrink-0">{{ fmtAmount(r.total_amount) }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- TOP 5 ทีมงานขาย -->
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <h3 class="text-sm font-semibold text-slate-700 mb-3">TOP 5 ทีมงานขาย</h3>
          <div v-if="loadingRanking" class="h-40 flex items-center justify-center">
            <svg class="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <template v-else>
            <div class="h-48">
              <Bar v-if="topSalespeopleChartData.labels.length" :data="topSalespeopleChartData" :options="rankingBarOpts" />
              <div v-else class="h-full flex items-center justify-center text-slate-400 text-sm">ไม่มีข้อมูล</div>
            </div>
            <div class="mt-3 space-y-1.5">
              <div v-for="(r, i) in topSalespeopleRanking" :key="r.sale_code" class="flex items-center gap-2 text-xs">
                <span class="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  :style="{ background: chartColors[i] }">{{ i + 1 }}</span>
                <span class="text-slate-600 truncate flex-1">{{ r.sale_name || r.sale_code }}</span>
                <span class="text-slate-400 shrink-0">{{ r.total_orders }} ใบ</span>
                <span class="font-semibold text-slate-700 shrink-0">{{ fmtAmount(r.total_amount) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Top tables -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Top customers -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100">
            <h3 class="text-sm font-semibold text-slate-700">Top ลูกค้า</h3>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">#</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">ลูกค้า</th>
                <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">ใบ</th>
                <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">ยอดรวม</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-if="!(summary.top_customers || []).length">
                <td colspan="4" class="py-6 text-center text-slate-400 text-xs">ไม่มีข้อมูล</td>
              </tr>
              <tr v-for="(r, i) in (summary.top_customers || [])" :key="r.cust_code" class="hover:bg-slate-50">
                <td class="px-4 py-2.5 text-xs text-slate-400">{{ i + 1 }}</td>
                <td class="px-4 py-2.5">
                  <div class="text-sm text-slate-700 font-medium">{{ r.cust_name || '—' }}</div>
                  <div class="text-xs text-slate-400">{{ r.cust_code }}</div>
                </td>
                <td class="px-4 py-2.5 text-right text-sm text-slate-600">{{ r.total_orders }}</td>
                <td class="px-4 py-2.5 text-right text-sm font-semibold text-slate-800">{{ fmtAmount(r.total_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Top salespeople (table) -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100">
            <h3 class="text-sm font-semibold text-slate-700">Top พนักงานขาย</h3>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">#</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">พนักงาน</th>
                <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">ใบ</th>
                <th class="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">ยอดรวม</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-if="!(summary.top_salespeople || []).length">
                <td colspan="4" class="py-6 text-center text-slate-400 text-xs">ไม่มีข้อมูล</td>
              </tr>
              <tr v-for="(r, i) in (summary.top_salespeople || [])" :key="r.sale_code" class="hover:bg-slate-50">
                <td class="px-4 py-2.5 text-xs text-slate-400">{{ i + 1 }}</td>
                <td class="px-4 py-2.5">
                  <div class="text-sm text-slate-700 font-medium">{{ r.sale_name || '—' }}</div>
                  <div class="text-xs text-slate-400">{{ r.sale_code }}</div>
                </td>
                <td class="px-4 py-2.5 text-right text-sm text-slate-600">{{ r.total_orders }}</td>
                <td class="px-4 py-2.5 text-right text-sm font-semibold text-slate-800">{{ fmtAmount(r.total_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ TAB: แยกตามลูกค้า ══ -->
    <div v-show="activeTab === 'by_customer'">
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700">ยอดขายแยกตามลูกค้า</h3>
          <span class="text-xs text-slate-400">{{ customerData.length }} ลูกค้า</span>
        </div>
        <div v-if="loadingTable" class="py-12 flex justify-center">
          <svg class="w-6 h-6 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm min-w-[600px]">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">รหัสลูกค้า</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">ชื่อลูกค้า</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">จำนวนใบ</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ยอดรวม (บาท)</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">เฉลี่ย/ใบ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!customerData.length">
                <td colspan="6" class="py-10 text-center text-slate-400 text-sm">ไม่มีข้อมูล</td>
              </tr>
              <tr v-for="(r, i) in customerData" :key="r.cust_code" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-xs text-slate-400">{{ i + 1 }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ r.cust_code }}</td>
                <td class="px-4 py-3 text-sm text-slate-700 font-medium">{{ r.cust_name || '—' }}</td>
                <td class="px-4 py-3 text-right text-sm text-slate-600">{{ r.total_orders.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-sm font-semibold text-slate-800">{{ fmtAmount(r.total_amount) }}</td>
                <td class="px-4 py-3 text-right text-sm text-slate-500">{{ fmtAmount(r.avg_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ TAB: แยกตามพนักงาน ══ -->
    <div v-show="activeTab === 'by_salesperson'">
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700">ยอดขายแยกตามพนักงาน</h3>
          <span class="text-xs text-slate-400">{{ salespersonData.length }} พนักงาน</span>
        </div>
        <div v-if="loadingTable" class="py-12 flex justify-center">
          <svg class="w-6 h-6 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm min-w-[560px]">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">รหัสพนักงาน</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">ชื่อพนักงาน</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">จำนวนใบ</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ยอดรวม (บาท)</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">เฉลี่ย/ใบ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!salespersonData.length">
                <td colspan="6" class="py-10 text-center text-slate-400 text-sm">ไม่มีข้อมูล</td>
              </tr>
              <tr v-for="(r, i) in salespersonData" :key="r.sale_code" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-xs text-slate-400">{{ i + 1 }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ r.sale_code }}</td>
                <td class="px-4 py-3 text-sm text-slate-700 font-medium">{{ r.sale_name || '—' }}</td>
                <td class="px-4 py-3 text-right text-sm text-slate-600">{{ r.total_orders.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-sm font-semibold text-slate-800">{{ fmtAmount(r.total_amount) }}</td>
                <td class="px-4 py-3 text-right text-sm text-slate-500">{{ fmtAmount(r.avg_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ TAB: รายการขาย ══ -->
    <div v-show="activeTab === 'transactions'" class="space-y-3">
      <!-- Transaction filters -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <input v-model="txFilter.doc_no" @input="txDebounce"
            class="filter-input w-36" placeholder="เลขที่เอกสาร..." />
          <input v-model="txFilter.sale_code" @input="txDebounce"
            class="filter-input w-32" placeholder="รหัสพนักงาน..." />
          <input v-model="txFilter.cust_code" @input="txDebounce"
            class="filter-input w-32" placeholder="รหัสลูกค้า..." />
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700">รายการเอกสารขาย</h3>
          <span class="text-xs text-slate-400">ทั้งหมด {{ txPag.total.toLocaleString() }} รายการ</span>
        </div>

        <div v-if="loadingTable" class="py-12 flex justify-center">
          <svg class="w-6 h-6 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm min-w-[700px]">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">วันที่</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">เลขที่</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">ลูกค้า</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">พนักงาน</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ยอดรวม</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-slate-500">VAT</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!transactions.length">
                <td colspan="7" class="py-10 text-center text-slate-400 text-sm">ไม่มีข้อมูล</td>
              </tr>
              <tr v-for="r in transactions" :key="r.doc_no" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{{ fmtDate(r.doc_date) }}</td>
                <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ r.doc_no }}</td>
                <td class="px-4 py-3">
                  <div class="text-sm text-slate-700">{{ r.cust_name || r.cust_code }}</div>
                </td>
                <td class="px-4 py-3 text-sm text-slate-500">{{ r.sale_name || r.sale_code }}</td>
                <td class="px-4 py-3 text-right text-sm font-semibold text-slate-800">{{ fmtAmount(r.total_amount) }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                    {{ vatLabel(r.vat_type) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button @click="openDetail(r.doc_no)"
                    class="text-xs text-blue-500 hover:text-blue-700 hover:underline">
                    รายละเอียด
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="txPag.pages > 1"
          class="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>หน้า {{ txPag.page }} / {{ txPag.pages }}</span>
          <div class="flex gap-1.5">
            <button @click="loadTransactions(txPag.page - 1)" :disabled="txPag.page <= 1"
              class="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">←</button>
            <span class="px-2 py-1">{{ txPag.page }}</span>
            <button @click="loadTransactions(txPag.page + 1)" :disabled="txPag.page >= txPag.pages"
              class="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">→</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Modal: รายละเอียดเอกสาร ══ -->
    <Teleport to="body">
      <div v-if="showDetail" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showDetail = false"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <div>
              <h3 class="text-base font-bold text-slate-800">รายละเอียดเอกสาร</h3>
              <p v-if="detailDoc" class="text-sm text-slate-500 mt-0.5">{{ detailDoc.header.doc_no }}</p>
            </div>
            <button @click="showDetail = false" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loadingDetail" class="flex-1 flex items-center justify-center py-16">
            <svg class="w-8 h-8 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>

          <div v-else-if="detailDoc" class="flex-1 overflow-y-auto p-6 space-y-4">
            <!-- Header info -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <p class="text-xs text-slate-400">วันที่</p>
                <p class="font-medium text-slate-700">{{ fmtDate(detailDoc.header.doc_date) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-400">ลูกค้า</p>
                <p class="font-medium text-slate-700">{{ detailDoc.header.cust_name || detailDoc.header.cust_code }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-400">พนักงาน</p>
                <p class="font-medium text-slate-700">{{ detailDoc.header.sale_name || detailDoc.header.sale_code || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-400">ภาษี</p>
                <p class="font-medium text-slate-700">{{ vatLabel(detailDoc.header.vat_type) }}</p>
              </div>
            </div>

            <!-- Line items table -->
            <div class="overflow-x-auto rounded-lg border border-slate-200">
              <table class="w-full text-xs min-w-[560px]">
                <thead class="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2.5 text-left font-semibold text-slate-500">รหัสสินค้า</th>
                    <th class="px-3 py-2.5 text-left font-semibold text-slate-500">ชื่อสินค้า</th>
                    <th class="px-3 py-2.5 text-right font-semibold text-slate-500">จำนวน</th>
                    <th class="px-3 py-2.5 text-left font-semibold text-slate-500">หน่วย</th>
                    <th class="px-3 py-2.5 text-right font-semibold text-slate-500">ราคา</th>
                    <th class="px-3 py-2.5 text-right font-semibold text-slate-500">ส่วนลด</th>
                    <th class="px-3 py-2.5 text-right font-semibold text-slate-500">รวม</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-if="!detailDoc.lines.length">
                    <td colspan="7" class="py-6 text-center text-slate-400">ไม่มีรายการสินค้า</td>
                  </tr>
                  <tr v-for="line in detailDoc.lines" :key="line.item_code + line.item_name"
                    class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-mono text-slate-600">{{ line.item_code }}</td>
                    <td class="px-3 py-2 text-slate-700">{{ line.item_name }}</td>
                    <td class="px-3 py-2 text-right text-slate-600">{{ line.qty }}</td>
                    <td class="px-3 py-2 text-slate-500">{{ line.unit_name || line.unit_code }}</td>
                    <td class="px-3 py-2 text-right text-slate-600">{{ fmtAmount(line.price) }}</td>
                    <td class="px-3 py-2 text-right text-slate-400">{{ line.discount || '—' }}</td>
                    <td class="px-3 py-2 text-right font-semibold text-slate-800">{{ fmtAmount(line.sum_amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Summary footer -->
            <div class="flex justify-end">
              <div class="text-right space-y-1 text-sm">
                <div class="flex gap-6 justify-between">
                  <span class="text-slate-500">ส่วนลดรวม</span>
                  <span class="text-amber-600 font-medium">{{ fmtAmount(detailDoc.header.total_discount) }}</span>
                </div>
                <div class="flex gap-6 justify-between">
                  <span class="text-slate-500">VAT</span>
                  <span class="text-slate-700">{{ fmtAmount(detailDoc.header.total_vat_value) }}</span>
                </div>
                <div class="flex gap-6 justify-between border-t border-slate-200 pt-1 mt-1">
                  <span class="font-semibold text-slate-700">ยอดรวมสุทธิ</span>
                  <span class="font-bold text-blue-700 text-base">{{ fmtAmount(detailDoc.header.total_amount) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex-1 flex items-center justify-center py-10 text-slate-400 text-sm">
            ไม่พบข้อมูลเอกสาร
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Line, Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, LineElement, PointElement, Title, Filler,
  BarElement,
} from 'chart.js'
import api from '../composables/useApi.js'
import { useAuthStore } from '../stores/auth.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, LineElement, PointElement, Title, Filler, BarElement)

const auth = useAuthStore()

// ── State ─────────────────────────────────────────────────────
const activeTab    = ref('overview')
const activePreset = ref('month')
const trendPeriod  = ref('day')
const loadingMain  = ref(false)
const loadingTable = ref(false)
const loadingDetail = ref(false)

const tabs = [
  { key: 'overview',       label: 'ภาพรวม' },
  { key: 'by_customer',    label: 'แยกตามลูกค้า' },
  { key: 'by_salesperson', label: 'แยกตามพนักงาน' },
  { key: 'transactions',   label: 'รายการขาย' },
]
const presets = [
  { key: 'today',   label: 'วันนี้'   },
  { key: 'week',    label: '7 วัน'   },
  { key: 'month',   label: '30 วัน'  },
  { key: 'quarter', label: '3 เดือน' },
  { key: 'year',    label: 'ปีนี้'   },
]
const trendPeriods = [
  { key: 'day',   label: 'รายวัน'      },
  { key: 'week',  label: 'รายสัปดาห์'  },
  { key: 'month', label: 'รายเดือน'    },
]
const chartColors = ['#3b82f6','#f97316','#8b5cf6','#10b981','#f59e0b']

const filter        = reactive({ date_from: '', date_to: '', sale_code: '' })
const txFilter      = reactive({ doc_no: '', sale_code: '', cust_code: '' })

const summary         = ref({})
const trendData       = ref([])
const customerData    = ref([])
const salespersonData = ref([])
const transactions    = ref([])
const txPag           = reactive({ total: 0, page: 1, pages: 1, limit: 20 })
const salespeople     = ref([])
const saleSearch      = ref('')
const saleDropOpen    = ref(false)

const filteredSalespeople = computed(() => {
  const q = saleSearch.value.trim().toLowerCase()
  if (!q) return salespeople.value
  return salespeople.value.filter(e =>
    (e.name_1 || '').toLowerCase().includes(q) ||
    (e.code  || '').toLowerCase().includes(q)
  )
})

function selectSalesperson(e) {
  filter.sale_code = e.code
  saleSearch.value = e.code ? `${e.name_1 || e.code} (${e.code})` : ''
  saleDropOpen.value = false
}

function saleBlur() {
  setTimeout(() => { saleDropOpen.value = false }, 150)
}

const showDetail    = ref(false)
const detailDoc     = ref(null)

// ── Target ────────────────────────────────────────────────────
const targetInput  = ref(parseFloat(localStorage.getItem('crm_sales_target') || '0'))
const target       = computed(() => parseFloat(targetInput.value) || 0)
const periodSales  = computed(() => parseFloat(summary.value.total_amount || 0))
const vsTarget     = computed(() => {
  if (!target.value) return 0
  return Math.round((periodSales.value / target.value) * 100)
})
function saveTarget() {
  localStorage.setItem('crm_sales_target', String(parseFloat(targetInput.value) || 0))
}

// ── Ranking (TOP 5) ───────────────────────────────────────────
const loadingRanking      = ref(false)
const topProducts         = ref([])
const topSalespeopleRanking = ref([])

const topProductsChartData = computed(() => ({
  labels: topProducts.value.map(r => r.item_name || r.item_code),
  datasets: [{
    label: 'ยอดขาย (บาท)',
    data: topProducts.value.map(r => parseFloat(r.total_amount || 0)),
    backgroundColor: chartColors,
    borderRadius: 4,
    borderWidth: 0,
  }],
}))

const topSalespeopleChartData = computed(() => ({
  labels: topSalespeopleRanking.value.map(r => r.sale_name || r.sale_code),
  datasets: [{
    label: 'ยอดขาย (บาท)',
    data: topSalespeopleRanking.value.map(r => parseFloat(r.total_amount || 0)),
    backgroundColor: chartColors,
    borderRadius: 4,
    borderWidth: 0,
  }],
}))

const rankingBarOpts = {
  responsive: true, maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ` ${fmtAmount(ctx.parsed.x)} บาท` } },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      ticks: { font: { size: 10 }, callback: v => fmtCompact(v) },
    },
    y: { grid: { display: false }, ticks: { font: { size: 10 } } },
  },
}

async function loadRanking() {
  loadingRanking.value = true
  const params = buildParams()
  const [prod, sale] = await Promise.all([
    api.get('/sales/top-products',    { params: { ...params, limit: 5 } }).then(r => r.data).catch(() => []),
    api.get('/sales/top-salespeople', { params: { ...params, limit: 5 } }).then(r => r.data).catch(() => []),
  ])
  topProducts.value          = prod
  topSalespeopleRanking.value = sale
  loadingRanking.value = false
}

// ── Presets ───────────────────────────────────────────────────
function applyPreset(key) {
  activePreset.value = key
  const now  = new Date()
  const pad  = n => String(n).padStart(2, '0')
  const fmt  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  const today = fmt(now)

  if (key === 'today') {
    filter.date_from = today; filter.date_to = today
  } else if (key === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 6)
    filter.date_from = fmt(d); filter.date_to = today
  } else if (key === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 29)
    filter.date_from = fmt(d); filter.date_to = today
  } else if (key === 'quarter') {
    const d = new Date(now); d.setMonth(d.getMonth() - 3)
    filter.date_from = fmt(d); filter.date_to = today
  } else if (key === 'year') {
    filter.date_from = `${now.getFullYear()}-01-01`; filter.date_to = today
  }
  load()
}

// ── Load functions ────────────────────────────────────────────
function buildParams(extra = {}) {
  const p = { date_from: filter.date_from, date_to: filter.date_to, ...extra }
  if (filter.sale_code) p.sale_code = filter.sale_code
  return p
}

async function load() {
  loadingMain.value = true
  // reset lazy-loaded tabs
  customerData.value    = []
  salespersonData.value = []
  transactions.value    = []
  txPag.total = 0; txPag.page = 1; txPag.pages = 1

  const [s, t] = await Promise.all([
    api.get('/sales/summary', { params: buildParams() }).then(r => r.data).catch(() => ({})),
    api.get('/sales/trend',   { params: buildParams({ period: trendPeriod.value }) }).then(r => r.data).catch(() => []),
  ])
  summary.value   = s
  trendData.value = t
  loadingMain.value = false
  loadRanking()

  // reload current tab if lazy
  if (activeTab.value === 'by_customer')    loadCustomerTab()
  if (activeTab.value === 'by_salesperson') loadSalespersonTab()
  if (activeTab.value === 'transactions')   loadTransactions(1)
}

async function loadTrend() {
  const t = await api.get('/sales/trend', { params: buildParams({ period: trendPeriod.value }) })
    .then(r => r.data).catch(() => [])
  trendData.value = t
}

async function loadCustomerTab() {
  loadingTable.value = true
  customerData.value = await api.get('/sales/by-customer', { params: buildParams() })
    .then(r => r.data).catch(() => [])
  loadingTable.value = false
}

async function loadSalespersonTab() {
  loadingTable.value = true
  salespersonData.value = await api.get('/sales/by-salesperson', { params: { date_from: filter.date_from, date_to: filter.date_to } })
    .then(r => r.data).catch(() => [])
  loadingTable.value = false
}

async function loadTransactions(page = 1) {
  loadingTable.value = true
  const p = {
    ...buildParams(),
    doc_no:    txFilter.doc_no    || undefined,
    sale_code: txFilter.sale_code || undefined,
    cust_code: txFilter.cust_code || undefined,
    page, limit: txPag.limit,
  }
  // sale_code from txFilter overrides filter sale_code for transaction search
  if (txFilter.sale_code) p.sale_code = txFilter.sale_code
  const res = await api.get('/sales/transactions', { params: p })
    .then(r => r.data).catch(() => ({ data: [], pagination: {} }))
  transactions.value = res.data || []
  if (res.pagination) Object.assign(txPag, res.pagination)
  txPag.page = page
  loadingTable.value = false
}

async function openDetail(doc_no) {
  showDetail.value    = true
  loadingDetail.value = true
  detailDoc.value     = null
  detailDoc.value = await api.get(`/sales/transactions/${doc_no}`)
    .then(r => r.data).catch(() => null)
  loadingDetail.value = false
}

// Debounce for transaction text filters
let txTimer = null
function txDebounce() {
  clearTimeout(txTimer)
  txTimer = setTimeout(() => loadTransactions(1), 350)
}

// ── Watch tab (lazy load) ─────────────────────────────────────
watch(activeTab, t => {
  if (t === 'by_customer'    && !customerData.value.length)    loadCustomerTab()
  if (t === 'by_salesperson' && !salespersonData.value.length) loadSalespersonTab()
  if (t === 'transactions'   && !transactions.value.length)    loadTransactions(1)
})

// ── Chart data ────────────────────────────────────────────────
const trendChartData = computed(() => ({
  labels: trendData.value.map(r => fmtPeriod(r.period)),
  datasets: [{
    label: 'ยอดขาย (บาท)',
    data: trendData.value.map(r => r.total_amount),
    backgroundColor: 'rgba(59,130,246,0.10)',
    borderColor: '#3b82f6',
    borderWidth: 2,
    fill: true,
    tension: 0.3,
    pointRadius: 3,
    pointBackgroundColor: '#3b82f6',
  }],
}))

const trendChartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ` ${fmtAmount(ctx.parsed.y)} บาท` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      ticks: { font: { size: 10 }, callback: v => fmtCompact(v) },
    },
  },
}

const topCustChartData = computed(() => {
  const top = summary.value.top_customers || []
  return {
    labels: top.map(r => r.cust_name || r.cust_code),
    datasets: [{
      data: top.map(r => r.total_amount),
      backgroundColor: chartColors,
      borderWidth: 0,
      hoverOffset: 4,
    }],
  }
})

const doughnutOpts = {
  responsive: true, maintainAspectRatio: false,
  cutout: '65%',
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmtAmount(ctx.parsed)} บาท` } } },
}

// ── Formatters ────────────────────────────────────────────────
function fmtAmount(v) {
  return parseFloat(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtCompact(v) {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
  if (v >= 1000)    return (v / 1000).toFixed(0) + 'K'
  return v
}
function fmtDate(v) {
  if (!v) return ''
  return new Date(v).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}
function fmtPeriod(v) {
  if (!v) return ''
  const d = new Date(v)
  if (trendPeriod.value === 'month') return d.toLocaleDateString('th-TH', { year: '2-digit', month: 'short' })
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
}
function vatLabel(v) {
  return { 0: 'แยก VAT', 1: 'รวม VAT', 2: 'อัตราศูนย์', 4: 'ไม่กระทบ' }[parseInt(v)] || String(v)
}

// ── Init ──────────────────────────────────────────────────────
onMounted(async () => {
  // ตั้ง auth token
  const token = localStorage.getItem('crm_token')
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`

  // โหลดรายชื่อพนักงานจาก POS DB (erp_user)
  const { data } = await api.get('/sales/salespeople').catch(() => ({ data: [] }))
  salespeople.value = data || []

  applyPreset('month')
})
</script>

<style scoped>
.filter-input {
  @apply border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400;
}
</style>
