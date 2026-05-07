<template>
  <div class="p-4 lg:p-6 max-w-7xl mx-auto">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
      <div class="flex-1">
        <h1 class="text-xl font-bold text-slate-800">รายงานและประวัติ</h1>
        <p class="text-sm text-slate-500 mt-0.5">วิเคราะห์กิจกรรมและติดตามการทำงาน</p>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Date preset -->
        <div class="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button v-for="p in presets" :key="p.key"
            @click="applyPreset(p.key)"
            :class="activePreset === p.key
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'"
            class="px-3 py-1 rounded-md text-xs font-medium transition-all">
            {{ p.label }}
          </button>
        </div>
        <!-- Custom date range -->
        <input v-model="filter.date_from" type="date" class="filter-input" @change="onManualDateChange" />
        <span class="text-slate-400 text-sm">—</span>
        <input v-model="filter.date_to"   type="date" class="filter-input" @change="onManualDateChange" />
        <!-- Owner filter -->
        <div class="relative w-56">
          <input
            v-model="ownerSearch"
            type="text"
            class="filter-input w-full pr-9"
            placeholder="ค้นหาพนักงาน..."
            @focus="ownerDropdown = true"
            @input="onOwnerSearchInput"
            @blur="hideOwnerDropdown"
          />
          <button
            v-if="ownerSearch || filter.owner_id"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            @mousedown.prevent="clearOwnerFilter"
          >
            ×
          </button>
          <div
            v-if="ownerDropdown"
            class="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              @mousedown.prevent="selectOwner(null)"
            >
              พนักงานทุกคน
            </button>
            <button
              v-for="u in filteredUsers"
              :key="u.id"
              type="button"
              class="w-full px-3 py-2 text-left hover:bg-blue-50"
              @mousedown.prevent="selectOwner(u)"
            >
              <span class="block text-sm font-medium text-slate-700">{{ u.name }}</span>
              <span class="block text-[11px] text-slate-400">{{ u.code }}</span>
            </button>
            <div v-if="!filteredUsers.length" class="px-3 py-3 text-sm text-slate-400">
              ไม่พบพนักงาน
            </div>
          </div>
        </div>
        <button @click="load" :disabled="loadingMain"
          class="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
          <svg v-if="loadingMain" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          โหลด
        </button>
        <button @click="resetFilters" :disabled="loadingMain"
          class="px-3 py-1.5 border border-slate-200 text-slate-600 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">
          รีเซ็ต
        </button>
        <button @click="exportCurrentTab" :disabled="loadingMain || trendLoading || loadingAudit"
          class="px-3 py-1.5 border border-slate-200 text-slate-600 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">
          Export CSV
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-4 text-xs">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
        {{ filterSummary }}
      </span>
      <span v-if="dateError" class="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
        {{ dateError }}
      </span>
      <span v-else-if="reportError" class="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
        {{ reportError }}
      </span>
      <span v-else-if="loadingMain || trendLoading || loadingAudit" class="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
        กำลังโหลดข้อมูล
      </span>
    </div>

    <!-- ── Tab bar ──────────────────────────────────────────────── -->
    <div class="flex gap-1 border-b border-slate-200 mb-6">
      <button v-for="t in tabs" :key="t.key"
        @click="activeTab = t.key"
        :class="activeTab === t.key
          ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
          : 'text-slate-500 hover:text-slate-700'"
        class="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px">
        {{ t.icon }} {{ t.label }}
      </button>
    </div>

    <!-- ══ TAB: ภาพรวม ════════════════════════════════════════════ -->
    <div v-if="activeTab === 'summary'">

      <!-- KPI cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <RouterLink :to="activityLink()" class="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors" title="กิจกรรมทั้งหมดตามช่วงวันที่และพนักงานที่เลือก">
          <p class="text-xs text-slate-400 font-medium mb-1">กิจกรรมทั้งหมด</p>
          <p class="text-2xl font-bold text-slate-800">{{ summary.total ?? '—' }}</p>
        </RouterLink>
        <RouterLink :to="activityLink({ status: 'done' })" class="bg-white rounded-xl border border-slate-200 p-4 hover:border-green-300 transition-colors" title="กิจกรรมที่ปิดเสร็จในช่วงที่เลือก">
          <p class="text-xs text-slate-400 font-medium mb-1">เสร็จแล้ว</p>
          <p class="text-2xl font-bold text-green-600">{{ statusCount('done') }}</p>
          <p class="text-xs text-slate-400 mt-0.5">{{ doneRate }}%</p>
        </RouterLink>
        <RouterLink :to="activityLink({ status: 'open' })" class="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors" title="กิจกรรมที่ยังเปิดอยู่ในช่วงที่เลือก">
          <p class="text-xs text-slate-400 font-medium mb-1">ยังเปิดอยู่</p>
          <p class="text-2xl font-bold text-blue-600">{{ statusCount('open') }}</p>
        </RouterLink>
        <RouterLink :to="activityLink({ status: 'cancelled' })" class="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors" title="กิจกรรมที่ถูกยกเลิกในช่วงที่เลือก">
          <p class="text-xs text-slate-400 font-medium mb-1">ยกเลิก</p>
          <p class="text-2xl font-bold text-slate-400">{{ statusCount('cancelled') }}</p>
        </RouterLink>
      </div>

      <!-- Charts row 1 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <!-- Doughnut: by type -->
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-700 mb-4">แยกตามประเภท</h3>
          <div v-if="hasData" class="flex items-center gap-6">
            <div class="w-44 h-44 flex-shrink-0">
              <Doughnut :data="typeChartData" :options="doughnutOpts" />
            </div>
            <div class="space-y-2">
              <RouterLink v-for="(item, i) in summary.by_type" :key="item.activity_type" :to="activityLink({ type: item.activity_type })" class="flex items-center gap-2 hover:text-blue-600">
                <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: typeColors[i % typeColors.length] }"></span>
                <span class="text-sm text-slate-600">{{ typeLabel(item.activity_type) }}</span>
                <span class="ml-auto text-sm font-semibold text-slate-800">{{ item.count }}</span>
              </RouterLink>
            </div>
          </div>
          <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูล</p>
        </div>

        <!-- Doughnut: by status -->
        <div class="bg-white rounded-xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-700 mb-4">แยกตามสถานะ</h3>
          <div v-if="hasData" class="flex items-center gap-6">
            <div class="w-44 h-44 flex-shrink-0">
              <Doughnut :data="statusChartData" :options="doughnutOpts" />
            </div>
            <div class="space-y-2">
              <RouterLink v-for="(item, i) in summary.by_status" :key="item.status" :to="activityLink({ status: item.status })" class="flex items-center gap-2 hover:text-blue-600">
                <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: statusColors[item.status] || '#94a3b8' }"></span>
                <span class="text-sm text-slate-600">{{ statusLabel(item.status) }}</span>
                <span class="ml-auto text-sm font-semibold text-slate-800">{{ item.count }}</span>
              </RouterLink>
            </div>
          </div>
          <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูล</p>
        </div>
      </div>

      <!-- Call result -->
      <div v-if="summary.call_results?.length" class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">ผลการโทร</h3>
        <div class="flex flex-wrap gap-3">
          <RouterLink v-for="r in summary.call_results" :key="r.call_result" :to="activityLink({ type: 'call', call_result: r.call_result })"
            class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-300 transition-colors">
            <span class="text-base">{{ callResultIcon(r.call_result) }}</span>
            <span class="text-sm text-slate-600">{{ callResultLabel(r.call_result) }}</span>
            <span class="ml-1 text-sm font-bold text-slate-800">{{ r.count }}</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- ══ TAB: แนวโน้ม ════════════════════════════════════════════ -->
    <div v-if="activeTab === 'trend'">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm text-slate-500">ช่วงเวลา:</span>
        <div class="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button v-for="p in trendPeriods" :key="p.key"
            @click="trendPeriod = p.key; loadTrend()"
            :class="trendPeriod === p.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'"
            class="px-3 py-1 rounded-md text-xs font-medium transition-all">{{ p.label }}</button>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">กิจกรรมแยกตามวัน</h3>
        <div v-if="trendLoading" class="text-center py-12 text-slate-400">
          <svg class="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          กำลังโหลด...
        </div>
        <div v-else-if="trendData.length" class="h-64">
          <Bar :data="trendChartData" :options="barOpts" />
        </div>
        <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูลในช่วงเวลานี้</p>
      </div>

      <!-- Summary trend table -->
      <div v-if="trendData.length" class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-sm min-w-[620px]">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="sticky-col px-4 py-3 text-left text-xs font-semibold text-slate-500">ช่วงเวลา</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ทั้งหมด</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">งาน</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">โทร</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ประชุม</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">เสร็จ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="r in trendData" :key="r.period" class="hover:bg-slate-50">
              <td class="sticky-col px-4 py-2.5 font-medium text-slate-700">{{ fmtPeriod(r.period) }}</td>
              <td class="px-4 py-2.5 text-right font-semibold text-slate-800">
                <RouterLink :to="activityLink(trendActivityParams(r))" class="text-blue-600 hover:underline">{{ r.total }}</RouterLink>
              </td>
              <td class="px-4 py-2.5 text-right text-blue-600">{{ r.tasks }}</td>
              <td class="px-4 py-2.5 text-right text-orange-600">{{ r.calls }}</td>
              <td class="px-4 py-2.5 text-right text-purple-600">{{ r.meetings }}</td>
              <td class="px-4 py-2.5 text-right text-green-600">{{ r.done }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ TAB: พนักงาน ════════════════════════════════════════════ -->
    <div v-if="activeTab === 'byowner'">


      <!-- Bar chart: top 10 by total -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">กิจกรรมของแต่ละคน (Top 10)</h3>
        <div v-if="ownerData.length" :style="{ height: ownerChartHeight }">
          <Bar :data="ownerChartData" :options="ownerBarOpts" />
        </div>
        <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูล</p>
      </div>

      <!-- Owner table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-sm min-w-[700px]">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="sticky-col px-4 py-3 text-left text-xs font-semibold text-slate-500">พนักงาน</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ทั้งหมด</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">เปิด</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-blue-500">งาน</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-orange-500">โทร</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-purple-500">ประชุม</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-green-500">เสร็จ</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">อัตราเสร็จ</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">เฉลี่ยโทร</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!ownerData.length">
              <td colspan="9" class="py-10 text-center text-slate-400">ไม่มีข้อมูล</td>
            </tr>
            <tr v-for="u in ownerData" :key="u.id" class="hover:bg-slate-50">
              <td class="sticky-col px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {{ u.name?.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-slate-800 text-xs">{{ u.name }}</p>
                    <p class="text-[11px] text-slate-400">{{ u.code }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-bold text-slate-800">
                <RouterLink :to="activityLink({ owner_id: u.id })" class="text-blue-600 hover:underline">{{ u.total }}</RouterLink>
              </td>
              <td class="px-4 py-3 text-right text-slate-500">{{ u.open }}</td>
              <td class="px-4 py-3 text-right text-blue-600">{{ u.tasks }}</td>
              <td class="px-4 py-3 text-right text-orange-600">{{ u.calls }}</td>
              <td class="px-4 py-3 text-right text-purple-600">{{ u.meetings }}</td>
              <td class="px-4 py-3 text-right text-green-600">{{ u.done }}</td>
              <td class="px-4 py-3 text-right">
                <span v-if="u.total > 0" class="text-xs font-semibold"
                  :class="doneRateVal(u) >= 70 ? 'text-green-600' : doneRateVal(u) >= 40 ? 'text-amber-600' : 'text-red-500'">
                  {{ doneRateVal(u) }}%
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-4 py-3 text-right text-slate-500 text-xs">
                {{ u.avg_call_sec ? fmtDuration(u.avg_call_sec) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ TAB: KPI ════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'kpi'">

      <!-- KPI top bar -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p class="text-xs text-slate-400 font-medium mb-1" title="จำนวนพนักงานที่มีข้อมูล KPI ในช่วงที่เลือก">พนักงานทั้งหมด</p>
          <p class="text-2xl font-bold text-slate-800">{{ kpiData.length }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p class="text-xs text-slate-400 font-medium mb-1" title="ค่าเฉลี่ย done rate ของพนักงานที่มีงานในช่วงที่เลือก">อัตราปิดงานเฉลี่ย</p>
          <p class="text-2xl font-bold text-green-600">{{ avgDoneRate }}%</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p class="text-xs text-slate-400 font-medium mb-1">กิจกรรมรวม</p>
          <p class="text-2xl font-bold text-blue-600">{{ kpiTotalActivities }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p class="text-xs text-slate-400 font-medium mb-1">เสร็จรวม</p>
          <p class="text-2xl font-bold text-indigo-600">{{ kpiTotalDone }}</p>
        </div>
      </div>

      <!-- KPI chart: done_rate bar -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">อัตราปิดงาน (Done Rate) แต่ละคน</h3>
        <div v-if="kpiData.length" :style="{ height: kpiChartHeight }">
          <Bar :data="kpiDoneRateChart" :options="kpiBarOpts" />
        </div>
        <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูล</p>
      </div>

      <!-- KPI table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-sm min-w-[800px]">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="sticky-col px-4 py-3 text-left text-xs font-semibold text-slate-500">พนักงาน</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ทั้งหมด</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-green-500">เสร็จ</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-blue-500">เปิด</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-red-500">เกินกำหนด</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-orange-500">โทร</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-purple-500">ประชุม</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ลูกค้า</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">Done Rate</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">Overdue %</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">เฉลี่ยโทร</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!kpiData.length">
              <td colspan="11" class="py-10 text-center text-slate-400">ไม่มีข้อมูล</td>
            </tr>
            <tr v-for="u in kpiData" :key="u.id" class="hover:bg-slate-50">
              <td class="sticky-col px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {{ u.name?.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-slate-800 text-xs">{{ u.name }}</p>
                    <p class="text-[11px] text-slate-400">{{ u.code }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-right font-bold text-slate-800">
                <RouterLink :to="activityLink({ owner_id: u.id })" class="text-blue-600 hover:underline">{{ u.total }}</RouterLink>
              </td>
              <td class="px-4 py-3 text-right text-green-600 font-medium">{{ u.done }}</td>
              <td class="px-4 py-3 text-right text-blue-600">{{ u.open }}</td>
              <td class="px-4 py-3 text-right">
                <span :class="u.overdue > 0 ? 'text-red-600 font-semibold' : 'text-slate-300'">{{ u.overdue || 0 }}</span>
              </td>
              <td class="px-4 py-3 text-right text-orange-600">{{ u.calls }}</td>
              <td class="px-4 py-3 text-right text-purple-600">{{ u.meetings }}</td>
              <td class="px-4 py-3 text-right text-slate-500">{{ u.unique_customers }}</td>
              <!-- Done Rate bar -->
              <td class="px-4 py-3 text-right">
                <div class="flex items-center gap-2 justify-end">
                  <div class="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full rounded-full transition-all"
                      :class="u.done_rate >= 70 ? 'bg-green-500' : u.done_rate >= 40 ? 'bg-amber-400' : 'bg-red-400'"
                      :style="{ width: u.done_rate + '%' }"></div>
                  </div>
                  <span class="text-xs font-semibold w-9 text-right"
                    :class="u.done_rate >= 70 ? 'text-green-600' : u.done_rate >= 40 ? 'text-amber-600' : 'text-red-500'">
                    {{ u.done_rate }}%
                  </span>
                </div>
              </td>
              <!-- Overdue rate -->
              <td class="px-4 py-3 text-right text-xs">
                <span v-if="u.open > 0"
                  :class="u.overdue_rate > 30 ? 'text-red-600 font-semibold' : u.overdue_rate > 10 ? 'text-amber-600' : 'text-slate-400'">
                  {{ u.overdue_rate }}%
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-4 py-3 text-right text-slate-500 text-xs">
                {{ u.avg_call_sec ? fmtDuration(u.avg_call_sec) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ TAB: Audit Log ══════════════════════════════════════════ -->
    <div v-if="activeTab === 'audit'">
      <!-- Audit filters -->
      <div class="flex flex-wrap gap-2 mb-4">
        <select v-model="auditFilter.action" class="filter-input" @change="loadAudit(1)">
          <option value="">ทุกประเภท Action</option>
          <option value="INSERT">INSERT — สร้างใหม่</option>
          <option value="UPDATE">UPDATE — แก้ไข</option>
          <option value="DELETE">DELETE — ลบ</option>
        </select>
        <select v-model="auditFilter.table_name" class="filter-input" @change="loadAudit(1)">
          <option value="">ทุกตาราง</option>
          <option value="crm_activities">Activities</option>
          <option value="crm_customers">Customers</option>
        </select>
        <input v-model="auditFilter.user_code" @input="auditSearchDebounce" type="text"
          placeholder="รหัสผู้ใช้..." class="filter-input w-28" />
      </div>
      <p class="text-xs text-slate-400 mb-3">Audit Log เปิดให้ admin และ manager ตามสิทธิ์หน้า Reports</p>

      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div v-if="loadingAudit" class="text-center py-12 text-slate-400">
          <svg class="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          กำลังโหลด...
        </div>
        <table v-else class="w-full text-sm min-w-[760px]">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="sticky-col px-4 py-3 text-left text-xs font-semibold text-slate-500 w-40">เวลา</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-20">Action</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-32">ตาราง</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">ผู้ดำเนินการ</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">ลูกค้า / ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">ฟิลด์ที่เปลี่ยน</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!auditRows.length">
              <td colspan="6" class="py-10 text-center text-slate-400">ไม่มีข้อมูล</td>
            </tr>
            <tr v-for="r in auditRows" :key="r.id" class="hover:bg-slate-50">
              <td class="sticky-col px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{{ fmtDateTime(r.created_at) }}</td>
              <td class="px-4 py-2.5">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                  :class="actionClass(r.action)">{{ r.action }}</span>
              </td>
              <td class="px-4 py-2.5 text-xs text-slate-500">{{ tableLabel(r.table_name) }}</td>
              <td class="px-4 py-2.5">
                <p class="text-xs font-medium text-slate-700">{{ r.user_name || r.user_code }}</p>
                <p v-if="r.user_name" class="text-[11px] text-slate-400">{{ r.user_code }}</p>
              </td>
              <td class="px-4 py-2.5 text-xs text-slate-500">
                <span v-if="r.ar_code">{{ r.ar_code }}</span>
                <span class="ml-1 text-slate-300">#{{ r.record_id }}</span>
              </td>
              <td class="px-4 py-2.5">
                <div class="flex flex-wrap gap-1">
                  <span v-for="f in (r.changed_fields || []).slice(0,5)" :key="f"
                    class="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">{{ f }}</span>
                  <span v-if="(r.changed_fields || []).length > 5" class="text-[11px] text-slate-400">
                    +{{ r.changed_fields.length - 5 }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Audit pagination -->
        <div v-if="auditPag.pages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          <span>ทั้งหมด {{ auditPag.total }} รายการ</span>
          <div class="flex gap-2">
            <button @click="loadAudit(auditPag.page - 1)" :disabled="auditPag.page <= 1"
              class="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">←</button>
            <span>{{ auditPag.page }} / {{ auditPag.pages }}</span>
            <button @click="loadAudit(auditPag.page + 1)" :disabled="auditPag.page >= auditPag.pages"
              class="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">→</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js'
import api from '../composables/useApi.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

// ── State ─────────────────────────────────────────────────────
const activeTab    = ref('summary')
const activePreset = ref('month')
const trendPeriod  = ref('day')
const loadingMain  = ref(false)
const loadingAudit = ref(false)
const trendLoading = ref(false)
const reportError  = ref('')
const dateError    = ref('')
const loadedTrendKey = ref('')
const loadedAuditKey = ref('')
const ownerSearch = ref('')
const ownerDropdown = ref(false)

const tabs = [
  { key: 'summary', label: 'ภาพรวม',  icon: '📊' },
  { key: 'trend',   label: 'แนวโน้ม', icon: '📈' },
  { key: 'byowner', label: 'พนักงาน', icon: '👥' },
  { key: 'kpi',     label: 'KPI',      icon: '🏆' },
  { key: 'audit',   label: 'Audit Log',icon: '🔍' },
]

const presets = [
  { key: 'today',  label: 'วันนี้'    },
  { key: 'week',   label: '7 วัน'    },
  { key: 'month',  label: '30 วัน'   },
  { key: 'quarter',label: '3 เดือน'  },
  { key: 'year',   label: 'ปีนี้'    },
]
const trendPeriods = [
  { key: 'day',   label: 'รายวัน'  },
  { key: 'week',  label: 'รายสัปดาห์' },
  { key: 'month', label: 'รายเดือน' },
]

const filter = reactive({ date_from: '', date_to: '', owner_id: '' })
const auditFilter = reactive({ action: '', table_name: '', user_code: '' })

const summary   = ref({})
const trendData = ref([])
const ownerData = ref([])
const kpiData   = ref([])
const auditRows = ref([])
const users     = ref([])
const auditPag  = reactive({ total: 0, page: 1, pages: 1 })

const selectedUser = computed(() =>
  users.value.find(u => Number(u.id) === Number(filter.owner_id))
)
const filteredUsers = computed(() => {
  const q = ownerSearch.value.trim().toLowerCase()
  if (!q || selectedUser.value?.name === ownerSearch.value) return users.value
  return users.value.filter(u =>
    String(u.name || '').toLowerCase().includes(q)
    || String(u.code || '').toLowerCase().includes(q)
  )
})
const filterSummary = computed(() => {
  const preset = presets.find(p => p.key === activePreset.value)?.label
  const range = preset || `${filter.date_from || '-'} ถึง ${filter.date_to || '-'}`
  const owner = selectedUser.value ? selectedUser.value.name : 'พนักงานทุกคน'
  return `${range} · ${owner}`
})

// AI KPI Insights
const aiInsightsText    = ref('')
const aiInsightsLoading = ref(false)
const aiInsightsError   = ref('')

async function loadAiInsights() {
  aiInsightsLoading.value = true
  aiInsightsError.value   = ''
  try {
    const params = {}
    if (filter.date_from) params.date_from = filter.date_from
    if (filter.date_to)   params.date_to   = filter.date_to
    const res = await api.get('/reports/ai-insights', { params })
    aiInsightsText.value = res.data.insight
  } catch (e) {
    aiInsightsError.value = e.response?.data?.error || e.message
  } finally {
    aiInsightsLoading.value = false
  }
}

let auditTimer = null

// ── Presets ───────────────────────────────────────────────────
function applyPreset(key) {
  activePreset.value = key
  dateError.value = ''
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

function onManualDateChange() {
  activePreset.value = ''
  dateError.value = ''
}

function resetFilters() {
  filter.owner_id = ''
  ownerSearch.value = ''
  ownerDropdown.value = false
  auditFilter.action = ''
  auditFilter.table_name = ''
  auditFilter.user_code = ''
  trendPeriod.value = 'day'
  loadedTrendKey.value = ''
  loadedAuditKey.value = ''
  applyPreset('month')
}

function onOwnerSearchInput() {
  ownerDropdown.value = true
  if (selectedUser.value?.name !== ownerSearch.value) filter.owner_id = ''
}

function selectOwner(user) {
  filter.owner_id = user?.id || ''
  ownerSearch.value = user?.name || ''
  ownerDropdown.value = false
}

function clearOwnerFilter() {
  filter.owner_id = ''
  ownerSearch.value = ''
  ownerDropdown.value = false
}

function hideOwnerDropdown() {
  setTimeout(() => {
    ownerDropdown.value = false
    if (filter.owner_id && selectedUser.value) ownerSearch.value = selectedUser.value.name
  }, 120)
}

function validateDateRange() {
  if (filter.date_from && filter.date_to && filter.date_from > filter.date_to) {
    dateError.value = 'วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด'
    return false
  }
  dateError.value = ''
  return true
}

function apiErrorMessage(err, fallback = 'โหลดรายงานไม่สำเร็จ') {
  return err.response?.data?.error || err.message || fallback
}

function baseReportParams() {
  return {
    date_from: filter.date_from,
    date_to: filter.date_to,
    owner_id: filter.owner_id || undefined,
  }
}

function trendKey() {
  return JSON.stringify({ ...baseReportParams(), period: trendPeriod.value })
}

function auditKey() {
  return JSON.stringify({
    ...baseReportParams(),
    action: auditFilter.action,
    table_name: auditFilter.table_name,
    user_code: auditFilter.user_code,
  })
}

// ── Load ──────────────────────────────────────────────────────
async function load() {
  if (!validateDateRange()) return
  loadingMain.value = true
  reportError.value = ''
  const p = baseReportParams()
  try {
    const [s, o, k] = await Promise.all([
      api.get('/reports/summary',  { params: p }).then(r => r.data),
      api.get('/reports/by-owner', { params: p }).then(r => r.data),
      api.get('/reports/kpi',      { params: { date_from: p.date_from, date_to: p.date_to, user_id: p.owner_id } }).then(r => r.data),
    ])
    summary.value   = s
    ownerData.value = o
    kpiData.value   = k
    if (activeTab.value === 'trend') await loadTrend()
    if (activeTab.value === 'audit') await loadAudit(1)
  } catch (err) {
    reportError.value = apiErrorMessage(err)
  } finally {
    loadingMain.value = false
  }
}

async function loadTrend() {
  if (!validateDateRange()) return
  trendLoading.value = true
  reportError.value = ''
  const p = { period: trendPeriod.value, ...baseReportParams() }
  try {
    const { data } = await api.get('/reports/trend', { params: p })
    trendData.value = data
    loadedTrendKey.value = trendKey()
  } catch (err) {
    trendData.value = []
    reportError.value = apiErrorMessage(err, 'โหลดแนวโน้มไม่สำเร็จ')
  } finally {
    trendLoading.value = false
  }
}

async function loadAudit(page = 1) {
  if (!validateDateRange()) return
  loadingAudit.value = true
  reportError.value = ''
  const p = {
    page,
    limit: 30,
    ...auditFilter,
    owner_id: filter.owner_id || undefined,
    date_from: filter.date_from,
    date_to: filter.date_to,
  }
  try {
    const { data: res } = await api.get('/reports/audit', { params: p })
    auditRows.value = res.data || []
    Object.assign(auditPag, res.pagination || {})
    loadedAuditKey.value = auditKey()
  } catch (err) {
    auditRows.value = []
    Object.assign(auditPag, { total: 0, page: 1, pages: 1 })
    reportError.value = apiErrorMessage(err, 'โหลดประวัติไม่สำเร็จ')
  } finally {
    loadingAudit.value = false
  }
}

function auditSearchDebounce() {
  clearTimeout(auditTimer)
  auditTimer = setTimeout(() => loadAudit(1), 400)
}

function cleanQuery(query) {
  return Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

function activityLink(extra = {}) {
  return {
    path: '/activities',
    query: cleanQuery({
      report: '1',
      date_from: extra.date_from || filter.date_from,
      date_to: extra.date_to || filter.date_to,
      owner_id: extra.owner_id || filter.owner_id || undefined,
      type: extra.type,
      status: extra.status,
      call_result: extra.call_result,
    }),
  }
}

function isoDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function trendActivityParams(row) {
  const start = new Date(row.period)
  const end = new Date(start)
  if (trendPeriod.value === 'week') end.setDate(end.getDate() + 6)
  else if (trendPeriod.value === 'month') end.setMonth(end.getMonth() + 1, 0)
  return {
    date_from: isoDate(start),
    date_to: isoDate(end),
    owner_id: filter.owner_id || undefined,
  }
}

function shortLabel(value, max = 18) {
  const text = String(value || '-')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename, rows) {
  if (!rows.length) return
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportCurrentTab() {
  const stamp = `${filter.date_from || 'all'}_${filter.date_to || 'all'}`
  if (activeTab.value === 'summary') {
    const rows = [['section', 'label', 'count']]
    ;(summary.value.by_status || []).forEach(r => rows.push(['status', statusLabel(r.status), r.count]))
    ;(summary.value.by_type || []).forEach(r => rows.push(['type', typeLabel(r.activity_type), r.count]))
    ;(summary.value.call_results || []).forEach(r => rows.push(['call_result', callResultLabel(r.call_result), r.count]))
    downloadCsv(`reports-summary-${stamp}.csv`, rows)
  } else if (activeTab.value === 'trend') {
    downloadCsv(`reports-trend-${stamp}.csv`, [
      ['period', 'total', 'tasks', 'calls', 'meetings', 'done'],
      ...trendData.value.map(r => [fmtPeriod(r.period), r.total, r.tasks, r.calls, r.meetings, r.done]),
    ])
  } else if (activeTab.value === 'byowner') {
    downloadCsv(`reports-by-owner-${stamp}.csv`, [
      ['code', 'name', 'total', 'open', 'tasks', 'calls', 'meetings', 'done', 'done_rate', 'avg_call_sec'],
      ...ownerData.value.map(u => [u.code, u.name, u.total, u.open, u.tasks, u.calls, u.meetings, u.done, doneRateVal(u), u.avg_call_sec || '']),
    ])
  } else if (activeTab.value === 'kpi') {
    downloadCsv(`reports-kpi-${stamp}.csv`, [
      ['code', 'name', 'total', 'done', 'open', 'overdue', 'calls', 'meetings', 'tasks', 'unique_customers', 'done_rate', 'overdue_rate'],
      ...kpiData.value.map(u => [u.code, u.name, u.total, u.done, u.open, u.overdue, u.calls, u.meetings, u.tasks, u.unique_customers, u.done_rate, u.overdue_rate]),
    ])
  } else if (activeTab.value === 'audit') {
    downloadCsv(`reports-audit-${stamp}.csv`, [
      ['created_at', 'action', 'table', 'user_code', 'user_name', 'ar_code', 'record_id', 'changed_fields'],
      ...auditRows.value.map(r => [fmtDateTime(r.created_at), r.action, r.table_name, r.user_code, r.user_name || '', r.ar_code || '', r.record_id, (r.changed_fields || []).join('|')]),
    ])
  }
}

// ── Charts ────────────────────────────────────────────────────
const typeColors   = ['#3b82f6', '#f97316', '#8b5cf6', '#10b981']
const statusColors = { open: '#3b82f6', done: '#10b981', cancelled: '#94a3b8', snoozed: '#f59e0b' }

const hasData = computed(() => summary.value.total > 0)

const typeChartData = computed(() => ({
  labels: (summary.value.by_type || []).map(r => typeLabel(r.activity_type)),
  datasets: [{ data: (summary.value.by_type || []).map(r => r.count), backgroundColor: typeColors, borderWidth: 0, hoverOffset: 4 }],
}))
const statusChartData = computed(() => ({
  labels: (summary.value.by_status || []).map(r => statusLabel(r.status)),
  datasets: [{ data: (summary.value.by_status || []).map(r => r.count),
    backgroundColor: (summary.value.by_status || []).map(r => statusColors[r.status] || '#94a3b8'),
    borderWidth: 0, hoverOffset: 4 }],
}))
const doughnutOpts = {
  responsive: true, maintainAspectRatio: false, cutout: '65%',
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } } },
}

const trendChartData = computed(() => {
  const labels = trendData.value.map(r => fmtPeriod(r.period))
  return {
    labels,
    datasets: [
      { label: 'งาน',    data: trendData.value.map(r => r.tasks),    backgroundColor: '#3b82f6', stack: 'a' },
      { label: 'โทร',    data: trendData.value.map(r => r.calls),    backgroundColor: '#f97316', stack: 'a' },
      { label: 'ประชุม', data: trendData.value.map(r => r.meetings), backgroundColor: '#8b5cf6', stack: 'a' },
    ],
  }
})
const barOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
  scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
}

const top10 = computed(() => [...ownerData.value].sort((a, b) => b.total - a.total).slice(0, 10))
const ownerChartHeight = computed(() => `${Math.min(520, Math.max(288, top10.value.length * 34 + 80))}px`)
const ownerChartData = computed(() => ({
  labels: top10.value.map(u => shortLabel(u.name)),
  datasets: [
    { label: 'งาน',    data: top10.value.map(u => u.tasks),    backgroundColor: '#3b82f6' },
    { label: 'โทร',    data: top10.value.map(u => u.calls),    backgroundColor: '#f97316' },
    { label: 'ประชุม', data: top10.value.map(u => u.meetings), backgroundColor: '#8b5cf6' },
  ],
}))
const ownerBarOpts = {
  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
    tooltip: { callbacks: { title: items => top10.value[items?.[0]?.dataIndex]?.name || items?.[0]?.label || '' } },
  },
  scales: {
    x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    y: { stacked: true, grid: { display: false } },
  },
}

// ── KPI computed ──────────────────────────────────────────────
const avgDoneRate = computed(() => {
  if (!kpiData.value.length) return 0
  const active = kpiData.value.filter(u => u.total > 0)
  if (!active.length) return 0
  return Math.round(active.reduce((s, u) => s + u.done_rate, 0) / active.length)
})
const kpiTotalActivities = computed(() =>
  kpiData.value.reduce((s, u) => s + (u.total || 0), 0)
)
const kpiTotalDone = computed(() =>
  kpiData.value.reduce((s, u) => s + (u.done || 0), 0)
)

const kpiSorted = computed(() => [...kpiData.value].sort((a, b) => b.done_rate - a.done_rate))
const kpiChartRows = computed(() => kpiSorted.value.slice(0, 12))
const kpiChartHeight = computed(() => `${Math.min(560, Math.max(288, kpiChartRows.value.length * 34 + 80))}px`)
const kpiDoneRateChart = computed(() => ({
  labels: kpiChartRows.value.map(u => shortLabel(u.name)),
  datasets: [{
    label: 'Done Rate (%)',
    data: kpiChartRows.value.map(u => u.done_rate),
    backgroundColor: kpiChartRows.value.map(u =>
      u.done_rate >= 70 ? '#10b981' : u.done_rate >= 40 ? '#f59e0b' : '#ef4444'
    ),
    borderRadius: 4,
  }],
}))
const kpiBarOpts = {
  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: items => kpiChartRows.value[items?.[0]?.dataIndex]?.name || items?.[0]?.label || '',
        label: ctx => ` ${ctx.parsed.x}%`,
      },
    },
  },
  scales: {
    x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#f1f5f9' } },
    y: { grid: { display: false } },
  },
}

// ── Computed helpers ──────────────────────────────────────────
const doneRate = computed(() => {
  const d = summary.value.by_status?.find(r => r.status === 'done')?.count || 0
  return summary.value.total > 0 ? Math.round(d / summary.value.total * 100) : 0
})
function statusCount(s) {
  return summary.value.by_status?.find(r => r.status === s)?.count ?? 0
}
function doneRateVal(u) {
  return u.done_rate ?? (u.total > 0 ? Math.round(u.done / u.total * 100) : 0)
}

// ── Formatters ────────────────────────────────────────────────
function typeLabel(t)   { return { task: 'งาน', call: 'โทรศัพท์', meeting: 'ประชุม' }[t] || t }
function statusLabel(s) { return { open: 'เปิด', done: 'เสร็จ', cancelled: 'ยกเลิก', snoozed: 'เลื่อน' }[s] || s }
function callResultLabel(r) { return { answered: 'รับสาย', no_answer: 'ไม่รับ', busy: 'สายไม่ว่าง', left_voicemail: 'ฝากข้อความ' }[r] || r }
function callResultIcon(r)  { return { answered: '✅', no_answer: '📵', busy: '🔴', left_voicemail: '📨' }[r] || '📞' }
function actionClass(a) { return { INSERT: 'bg-green-100 text-green-700', UPDATE: 'bg-blue-100 text-blue-700', DELETE: 'bg-red-100 text-red-700' }[a] || 'bg-slate-100 text-slate-500' }
function tableLabel(t)  { return { crm_activities: 'Activities', crm_customers: 'Customers', crm_users: 'Users' }[t] || t }

function fmtPeriod(v) {
  if (!v) return ''
  const d = new Date(v)
  if (trendPeriod.value === 'month') return d.toLocaleDateString('th-TH', { year: '2-digit', month: 'short' })
  if (trendPeriod.value === 'week')  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
}
function fmtDateTime(v) {
  if (!v) return ''
  return new Date(v).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60
  return m > 0 ? `${m}:${String(s).padStart(2,'0')} น.` : `${s} วิ`
}

// ── Watch tab change ──────────────────────────────────────────
watch(activeTab, t => {
  if (t === 'trend' && loadedTrendKey.value !== trendKey()) loadTrend()
  if (t === 'audit' && loadedAuditKey.value !== auditKey()) loadAudit(1)
})

// ── Init ──────────────────────────────────────────────────────
onMounted(async () => {
  const { data } = await api.get('/employees/crm-users').catch(() => ({ data: [] }))
  users.value = data
  applyPreset('month')
})
</script>

<style scoped>
.filter-input {
  @apply border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400;
}
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 10;
  background: white;
  box-shadow: 1px 0 0 #e2e8f0;
}
thead .sticky-col {
  background: #f8fafc;
  z-index: 20;
}
</style>
