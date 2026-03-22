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
        <input v-model="filter.date_from" type="date" class="filter-input" />
        <span class="text-slate-400 text-sm">—</span>
        <input v-model="filter.date_to"   type="date" class="filter-input" />
        <!-- Owner filter -->
        <select v-model="filter.owner_id" class="filter-input">
          <option value="">พนักงานทุกคน</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
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
      </div>
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
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-400 font-medium mb-1">กิจกรรมทั้งหมด</p>
          <p class="text-2xl font-bold text-slate-800">{{ summary.total ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-400 font-medium mb-1">เสร็จแล้ว</p>
          <p class="text-2xl font-bold text-green-600">{{ statusCount('done') }}</p>
          <p class="text-xs text-slate-400 mt-0.5">{{ doneRate }}%</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-400 font-medium mb-1">ยังเปิดอยู่</p>
          <p class="text-2xl font-bold text-blue-600">{{ statusCount('open') }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <p class="text-xs text-slate-400 font-medium mb-1">ยกเลิก</p>
          <p class="text-2xl font-bold text-slate-400">{{ statusCount('cancelled') }}</p>
        </div>
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
              <div v-for="(item, i) in summary.by_type" :key="item.activity_type" class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: typeColors[i % typeColors.length] }"></span>
                <span class="text-sm text-slate-600">{{ typeLabel(item.activity_type) }}</span>
                <span class="ml-auto text-sm font-semibold text-slate-800">{{ item.count }}</span>
              </div>
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
              <div v-for="(item, i) in summary.by_status" :key="item.status" class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: statusColors[item.status] || '#94a3b8' }"></span>
                <span class="text-sm text-slate-600">{{ statusLabel(item.status) }}</span>
                <span class="ml-auto text-sm font-semibold text-slate-800">{{ item.count }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูล</p>
        </div>
      </div>

      <!-- Call result -->
      <div v-if="summary.call_results?.length" class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">ผลการโทร</h3>
        <div class="flex flex-wrap gap-3">
          <div v-for="r in summary.call_results" :key="r.call_result"
            class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <span class="text-base">{{ callResultIcon(r.call_result) }}</span>
            <span class="text-sm text-slate-600">{{ callResultLabel(r.call_result) }}</span>
            <span class="ml-1 text-sm font-bold text-slate-800">{{ r.count }}</span>
          </div>
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
        <div v-if="trendData.length" class="h-64">
          <Bar :data="trendChartData" :options="barOpts" />
        </div>
        <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูลในช่วงเวลานี้</p>
      </div>

      <!-- Summary trend table -->
      <div v-if="trendData.length" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">ช่วงเวลา</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ทั้งหมด</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">งาน</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">โทร</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ประชุม</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">เสร็จ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="r in trendData" :key="r.period" class="hover:bg-slate-50">
              <td class="px-4 py-2.5 font-medium text-slate-700">{{ fmtPeriod(r.period) }}</td>
              <td class="px-4 py-2.5 text-right font-semibold text-slate-800">{{ r.total }}</td>
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

      <!-- AI KPI Insights panel -->
      <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-lg">🤖</span>
            <h3 class="text-sm font-semibold text-purple-800">AI วิเคราะห์ KPI ทีม</h3>
            <span class="text-xs text-purple-400">(Gemini AI)</span>
          </div>
          <button @click="loadAiInsights" :disabled="aiInsightsLoading"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
            <svg v-if="aiInsightsLoading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            {{ aiInsightsLoading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ KPI' }}
          </button>
        </div>
        <div v-if="aiInsightsText"
          class="text-sm text-slate-700 whitespace-pre-line bg-white rounded-lg p-3 border border-purple-100 leading-relaxed">
          {{ aiInsightsText }}
        </div>
        <p v-else-if="!aiInsightsLoading" class="text-xs text-purple-400 italic">
          กดปุ่ม "วิเคราะห์ KPI" เพื่อให้ AI สรุปผลงานทีมและให้คำแนะนำ
        </p>
        <p v-if="aiInsightsError" class="text-xs text-red-500 mt-2">{{ aiInsightsError }}</p>
      </div>

      <!-- Bar chart: top 10 by total -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h3 class="text-sm font-semibold text-slate-700 mb-4">กิจกรรมของแต่ละคน (Top 10)</h3>
        <div v-if="ownerData.length" class="h-72">
          <Bar :data="ownerChartData" :options="ownerBarOpts" />
        </div>
        <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูล</p>
      </div>

      <!-- Owner table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-sm min-w-[700px]">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">พนักงาน</th>
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
              <td class="px-4 py-3">
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
              <td class="px-4 py-3 text-right font-bold text-slate-800">{{ u.total }}</td>
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
          <p class="text-xs text-slate-400 font-medium mb-1">พนักงานทั้งหมด</p>
          <p class="text-2xl font-bold text-slate-800">{{ kpiData.length }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p class="text-xs text-slate-400 font-medium mb-1">อัตราปิดงานเฉลี่ย</p>
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
        <div v-if="kpiData.length" class="h-64">
          <Bar :data="kpiDoneRateChart" :options="kpiBarOpts" />
        </div>
        <p v-else class="text-sm text-slate-400 text-center py-8">ไม่มีข้อมูล</p>
      </div>

      <!-- KPI table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-sm min-w-[800px]">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">พนักงาน</th>
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
              <td class="px-4 py-3">
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
              <td class="px-4 py-3 text-right font-bold text-slate-800">{{ u.total }}</td>
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

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div v-if="loadingAudit" class="text-center py-12 text-slate-400">
          <svg class="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          กำลังโหลด...
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-40">เวลา</th>
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
              <td class="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{{ fmtDateTime(r.created_at) }}</td>
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

// ── Load ──────────────────────────────────────────────────────
async function load() {
  loadingMain.value = true
  const p = { date_from: filter.date_from, date_to: filter.date_to, owner_id: filter.owner_id || undefined }
  const [s, o, k] = await Promise.all([
    api.get('/reports/summary',  { params: p }).then(r => r.data).catch(() => ({})),
    api.get('/reports/by-owner', { params: { date_from: p.date_from, date_to: p.date_to } }).then(r => r.data).catch(() => []),
    api.get('/reports/kpi',      { params: { date_from: p.date_from, date_to: p.date_to, user_id: p.owner_id } }).then(r => r.data).catch(() => []),
  ])
  summary.value   = s
  ownerData.value = o
  kpiData.value   = k
  loadingMain.value = false
  if (activeTab.value === 'trend') loadTrend()
}

async function loadTrend() {
  const p = { period: trendPeriod.value, date_from: filter.date_from, date_to: filter.date_to, owner_id: filter.owner_id || undefined }
  const data = await api.get('/reports/trend', { params: p }).then(r => r.data).catch(() => [])
  trendData.value = data
}

async function loadAudit(page = 1) {
  loadingAudit.value = true
  const p = { page, limit: 30, ...auditFilter, date_from: filter.date_from, date_to: filter.date_to }
  const res = await api.get('/reports/audit', { params: p }).then(r => r.data).catch(() => ({ data: [], pagination: {} }))
  auditRows.value = res.data || []
  Object.assign(auditPag, res.pagination || {})
  loadingAudit.value = false
}

function auditSearchDebounce() {
  clearTimeout(auditTimer)
  auditTimer = setTimeout(() => loadAudit(1), 400)
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
const ownerChartData = computed(() => ({
  labels: top10.value.map(u => u.name),
  datasets: [
    { label: 'งาน',    data: top10.value.map(u => u.tasks),    backgroundColor: '#3b82f6' },
    { label: 'โทร',    data: top10.value.map(u => u.calls),    backgroundColor: '#f97316' },
    { label: 'ประชุม', data: top10.value.map(u => u.meetings), backgroundColor: '#8b5cf6' },
  ],
}))
const ownerBarOpts = {
  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
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
const kpiDoneRateChart = computed(() => ({
  labels: kpiSorted.value.map(u => u.name),
  datasets: [{
    label: 'Done Rate (%)',
    data: kpiSorted.value.map(u => u.done_rate),
    backgroundColor: kpiSorted.value.map(u =>
      u.done_rate >= 70 ? '#10b981' : u.done_rate >= 40 ? '#f59e0b' : '#ef4444'
    ),
    borderRadius: 4,
  }],
}))
const kpiBarOpts = {
  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}%` } } },
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
  if (t === 'trend' && !trendData.value.length) loadTrend()
  if (t === 'audit' && !auditRows.value.length) loadAudit(1)
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
</style>
