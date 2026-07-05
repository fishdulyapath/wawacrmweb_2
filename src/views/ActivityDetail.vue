<template>
  <div class="p-6 max-w-7xl mx-auto">

    <!-- ── Close-Task Modal (shared component) ─── -->
    <CloseActivityModal
      :show="closeModal.show"
      :activity="activity"
      @close="closeModal.show = false"
      @done="onActivityDone"
      @snooze="onCloseRequestedSnooze"
    />

    <SnoozeActivityModal
      :show="snoozeModal.show"
      :activity="activity"
      @close="snoozeModal.show = false"
      @snoozed="onSnoozed"
    />

    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink to="/activities" class="text-slate-400 hover:text-slate-600">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </RouterLink>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-slate-800">รายละเอียดกิจกรรม</h1>
      </div>
      <!-- ปุ่มส่งงาน (ถ้ายังไม่เสร็จ) -->
      <button v-if="activity && (activity.my_status || activity.status) === 'open' && canCloseActivity(activity)" @click="openCloseModal"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
        ✓ ส่งงาน
      </button>
      <span v-else-if="activity && (activity.my_status || activity.status) === 'open' && activity.requires_owner_assignment"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-sm font-medium">
        รอระบุผู้รับผิดชอบ
      </span>
      <span v-else-if="activity && (activity.my_status || activity.status) === 'done'"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-sm font-medium">
        ✓ ส่งแล้ว
      </span>
      <!-- ปุ่มติดตาม -->
      <button v-if="activity" @click="toggleFollow"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="isFollowing
          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
          : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'">
        {{ isFollowing ? '🔔 ติดตามแล้ว' : '🔕 ติดตาม' }}
      </button>
      <RouterLink v-if="canEdit" :to="`/activities/${activityId}/edit`"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
        แก้ไข
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 text-slate-400">
      <svg class="w-8 h-8 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      กำลังโหลด...
    </div>

    <!-- Error -->
    <div v-else-if="errorMsg" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      {{ errorMsg }}
    </div>

    <template v-else-if="activity">
      <!-- Type + Status badge -->
      <div class="flex items-center gap-3 mb-4">
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border"
          :class="typeClass(activity.activity_type)">
          {{ typeIcon(activity.activity_type) }} {{ typeLabel(activity.activity_type) }}
        </span>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
          :class="statusClass(activity.status)">
          {{ statusLabel(activity.status) }}
        </span>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
          :class="priorityClass(activity.priority)">
          {{ priorityLabel(activity.priority) }}
        </span>
        <span v-if="activity.system_created"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
          สร้างโดยระบบ
        </span>
        <span v-if="activity.followup_type === 'no_answer_retry'"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
          โทรซ้ำ{{ activity.attempt_no ? ` #${activity.attempt_no}` : '' }}
        </span>
        <span v-if="activity.followup_type === 'visit_scheduled'"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-200">
          เยี่ยมตามนัด
        </span>
        <span v-if="activity.followup_type === 'no_met_retry'"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-orange-50 text-orange-700 border-orange-200">
          เยี่ยมซ้ำ{{ activity.attempt_no ? ` #${activity.attempt_no}` : '' }}
        </span>
        <span v-if="activity.requires_owner_assignment"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
          รอระบุผู้รับผิดชอบ
        </span>
      </div>

      <div v-if="activity.requires_owner_assignment"
        class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ลูกค้ารายนี้ยังไม่มีทีมผู้ดูแล CRM ตอนระบบสร้างงาน กรุณาระบุผู้รับผิดชอบก่อนติดตามงานต่อ
      </div>

      <!-- Main card -->
      <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">

        <!-- Subject + Description -->
        <div class="px-5 py-4">
          <p class="text-lg font-bold text-slate-800">{{ activity.subject }}</p>
          <p v-if="activity.act_no" class="text-xs font-mono text-slate-400 mt-0.5">{{ activity.act_no }}</p>
          <p v-if="activity.description" class="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{{ activity.description }}</p>
        </div>

        <!-- Customer -->
        <div v-if="activity.ar_code || activity.customer_name" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <div class="flex-1">
            <p class="text-xs text-slate-400 font-medium">ลูกค้า</p>
            <p class="text-sm font-semibold text-slate-800">
              <span class="font-mono text-slate-500 mr-1">{{ activity.ar_code }}</span>{{ activity.customer_name }}
            </p>
            <div class="flex flex-wrap gap-1 mt-0.5">
              <span v-if="activity.price_level != null && activity.price_level !== ''" class="text-[13px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">ราคา {{ activity.price_level }}</span>
              <span v-if="activity.sale_area_name || activity.sale_area" class="text-[13px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">{{ activity.sale_area }}{{ activity.sale_area_name ? ' · ' + activity.sale_area_name : '' }}</span>
            </div>
            <!-- ผู้ติดต่อ -->
            <div v-if="contactors.length" class="mt-2 space-y-2">
              <p class="text-xs text-slate-400 font-medium">ผู้ติดต่อ</p>
              <div v-for="ct in contactors" :key="ct.name" class="text-xs">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-slate-700">{{ ct.name }}</span>
                  <span v-if="ct.work_title" class="text-slate-400">{{ ct.work_title }}</span>
                </div>
                <div class="flex flex-wrap gap-1.5 mt-1">
                  <a v-for="ph in ct.phones" :key="ph" :href="`tel:${ph}`"
                    class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white rounded text-xs font-mono hover:bg-green-600 transition-colors">📞 {{ ph }}</a>
                  <span v-if="ct.email" class="text-slate-400 px-1">✉ {{ ct.email }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Owner(s) -->
        <div v-if="activity.owners?.length || activity.owner_name" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <div class="flex-1">
            <p class="text-xs text-slate-400 font-medium">ผู้รับผิดชอบ</p>
            <template v-if="activity.owners?.length">
              <div v-for="o in activity.owners.filter(o => !o.removed_at)" :key="o.user_id"
                class="flex items-center gap-2 mt-1">
                <span class="font-mono text-xs text-slate-400 w-16 shrink-0">{{ o.code }}</span>
                <span class="text-sm font-semibold text-slate-800">{{ o.name }}</span>
                <span v-if="o.is_primary" class="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">ผู้ดูแลหลัก</span>
              </div>
            </template>
            <p v-else class="text-sm font-semibold text-slate-800 mt-1">{{ activity.owner_name }}</p>
          </div>
        </div>

        <!-- Date fields -->
        <div v-if="activity.due_date || activity.start_datetime" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <div class="flex-1">
            <template v-if="activity.activity_type === 'task' || activity.activity_type === 'transfer'">
              <p class="text-xs text-slate-400 font-medium">วันที่ครบกำหนด</p>
              <p class="text-sm font-semibold text-slate-800">{{ fmtDate(activity.due_date) }}</p>
            </template>
            <template v-else>
              <p class="text-xs text-slate-400 font-medium">{{ activity.activity_type === 'call' ? 'วันและเวลาโทร' : 'วันและเวลาเริ่มประชุม' }}</p>
              <p class="text-sm font-semibold text-slate-800">{{ fmtDateTime(activity.start_datetime) }}</p>
              <div v-if="activity.end_datetime" class="mt-1">
                <p class="text-xs text-slate-400 font-medium">สิ้นสุด</p>
                <p class="text-sm text-slate-700">{{ fmtDateTime(activity.end_datetime) }}</p>
              </div>
              <div v-if="activity.retry_due_at" class="mt-1">
                <p class="text-xs text-slate-400 font-medium">เวลาแจ้งโทรซ้ำ</p>
                <p class="text-sm text-amber-700 font-semibold">{{ fmtDateTime(activity.retry_due_at) }}</p>
              </div>
            </template>
          </div>
        </div>

        <!-- Location (meeting) -->
        <div v-if="activity.location" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <div>
            <p class="text-xs text-slate-400 font-medium">สถานที่</p>
            <p class="text-sm text-slate-800">{{ activity.location }}</p>
          </div>
        </div>

        <!-- Meeting URL -->
        <div v-if="activity.meeting_url" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <div>
            <p class="text-xs text-slate-400 font-medium">ลิงก์ประชุม</p>
            <a :href="activity.meeting_url" target="_blank" rel="noopener"
              class="text-sm text-blue-600 hover:underline break-all">{{ activity.meeting_url }}</a>
          </div>
        </div>

        <!-- Invitees (meeting) -->
        <div v-if="activity.invitees && activity.invitees.length" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <div>
            <p class="text-xs text-slate-400 font-medium mb-1.5">ผู้เข้าร่วม ({{ activity.invitees.length }} คน)</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="u in activity.invitees" :key="u.id"
                class="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                {{ u.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- Call fields -->
        <template v-if="activity.activity_type === 'call'">
          <div class="px-5 py-4 flex items-start gap-3">
            <svg class="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            <div class="flex-1 space-y-2">
              <div class="grid grid-cols-2 gap-x-6 gap-y-2">
                <div v-if="activity.call_phone">
                  <p class="text-xs text-slate-400 font-medium">เบอร์โทร</p>
                  <a :href="`tel:${activity.call_phone}`"
                    class="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-1 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors">
                    📞 {{ activity.call_phone }}
                  </a>
                </div>
                <div v-if="activity.call_direction">
                  <p class="text-xs text-slate-400 font-medium">ทิศทาง</p>
                  <p class="text-sm text-slate-800">{{ activity.call_direction === 'outbound' ? '↗ โทรออก' : '↙ รับสาย' }}</p>
                </div>
                <div v-if="activity.call_result">
                  <p class="text-xs text-slate-400 font-medium">ผลการโทร</p>
                  <p class="text-sm text-slate-800">{{ callResultLabel(activity.call_result) }}</p>
                </div>
                <div v-if="activity.duration_sec > 0">
                  <p class="text-xs text-slate-400 font-medium">ระยะเวลา</p>
                  <p class="text-sm text-slate-800">{{ fmtDuration(activity.duration_sec) }}</p>
                </div>
                <div v-if="activity.cdr_start_stamp">
                  <p class="text-xs text-slate-400 font-medium">เวลาโทร (จริง)</p>
                  <p class="text-sm text-slate-800">{{ fmtDateTime(activity.cdr_start_stamp) }}</p>
                </div>
                <div v-if="activity.cdr_end_stamp">
                  <p class="text-xs text-slate-400 font-medium">เวลาวาง</p>
                  <p class="text-sm text-slate-800">{{ fmtDateTime(activity.cdr_end_stamp) }}</p>
                </div>
              </div>
              <!-- Recording link -->
              <div v-if="activity.cdr_recording_url" class="pt-1">
                <p class="text-xs text-slate-400 font-medium mb-1">บันทึกเสียงการโทร</p>
                <a :href="activity.cdr_recording_url" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                  🎙 ฟังบันทึกการโทร
                </a>
              </div>
            </div>
          </div>
        </template>

        <!-- Visit fields -->
        <template v-if="activity.activity_type === 'visit'">
          <div class="px-5 py-4 flex items-start gap-3">
            <span class="text-lg mt-0.5 shrink-0">🤝</span>
            <div class="flex-1">
              <p class="text-xs text-slate-400 font-medium mb-2">ผลการเข้าเยี่ยม</p>
              <div class="flex flex-wrap gap-2">
                <span v-if="activity.visit_met === true"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                  ✅ ได้พบลูกค้า
                </span>
                <span v-else-if="activity.visit_met === false"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-600 border border-red-200">
                  ❌ ไม่ได้พบลูกค้า
                </span>
                <template v-if="activity.visit_met === true">
                  <span v-if="activity.visit_order === true"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    🛒 ได้ออเดอร์
                  </span>
                  <span v-else-if="activity.visit_order === false"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    — ไม่ได้ออเดอร์
                  </span>
                  <span v-if="activity.visit_order_amount"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    ฿{{ Number(activity.visit_order_amount).toLocaleString() }}
                  </span>
                </template>
              </div>
            </div>
          </div>
        </template>

        <!-- Outcome -->
        <div v-if="activity.outcome" class="px-5 py-4 flex items-start gap-3">
          <svg class="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <p class="text-xs text-slate-400 font-medium">ผลลัพธ์</p>
            <p class="text-sm text-slate-800 whitespace-pre-wrap">{{ activity.outcome }}</p>
          </div>
        </div>

        <!-- Timestamps -->
        <div class="px-5 py-3 bg-slate-50 rounded-b-xl flex items-center gap-6 text-xs text-slate-400">
          <span>สร้าง: {{ fmtDateTime(activity.created_at) }}</span>
          <span>อัปเดทล่าสุด: {{ fmtDateTime(activity.updated_at || activity.created_at) }}</span>
        </div>
      </div>

      <!-- Attachments -->
      <div class="mt-4 bg-white rounded-xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">ไฟล์แนบ</h3>
        <ActivityAttachments :activity-id="activityId" :readonly="true" />
      </div>

      <!-- Comments -->
      <div class="mt-4">
        <ActivityComments
          :activity-id="activityId"
          :can-comment="!['done','cancelled'].includes(activity?.status)"
          @changed="refreshActivity"
        />
      </div>

      <!-- Customer history tabs -->
      <div v-if="activity.ar_code" class="mt-6">
        <h2 class="font-semibold text-slate-700 mb-3">ข้อมูลลูกค้า</h2>

        <!-- Tab bar -->
        <div class="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
          <button v-for="tab in customerTabs" :key="tab.key"
            @click="customerActiveTab = tab.key"
            :class="customerActiveTab === tab.key
              ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
              : 'text-slate-500 hover:text-slate-700'"
            class="px-4 py-2 text-sm transition-colors whitespace-nowrap">
            {{ tab.label }}
          </button>
        </div>

        <!-- ── ประวัติการขนส่ง / ประวัติการเยี่ยม ── -->
        <div v-show="customerActiveTab === 'delivery_history' || customerActiveTab === 'visit_history'" class="space-y-4">
          <!-- Filter row -->
          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <input v-model="currentFleetFilter.bill" @input="fleetHistoryDebounce"
              class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="ค้นหาเลขบิล / ร้าน / เที่ยวรถ..." />
            <div class="flex items-center gap-1.5 w-full sm:w-auto">
              <span class="text-xs text-slate-500">จาก</span>
              <DateInput v-model="currentFleetFilter.date_from" @change="loadFleetHistory(1)"
                class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div class="flex items-center gap-1.5 w-full sm:w-auto">
              <span class="text-xs text-slate-500">ถึง</span>
              <DateInput v-model="currentFleetFilter.date_to" @change="loadFleetHistory(1)"
                class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <div v-if="currentFleetLoading" class="text-center text-slate-400 py-8 text-sm">
            <svg class="animate-spin w-5 h-5 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            กำลังโหลด...
          </div>

          <div v-else class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table class="w-full text-sm min-w-[700px]">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="w-8 px-4 py-3"></th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">วันที่</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">เที่ยวรถ</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">คนขับ / รถ</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">เลขบิล</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ยอด (บาท)</th>
                  <th v-if="!isVisitHistoryTab" class="px-4 py-3 text-center text-xs font-semibold text-slate-500">สถานะ</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-slate-500">ปัญหา</th>
                </tr>
              </thead>
              <tbody v-if="!currentFleetTimeline.length">
                <tr>
                  <td :colspan="isVisitHistoryTab ? 7 : 8" class="py-10 text-center text-slate-400 text-sm">{{ fleetHistoryEmptyMessage }}</td>
                </tr>
              </tbody>
              <tbody v-for="row in currentFleetTimeline" :key="row.list_id" class="border-b border-slate-100">
                <tr class="hover:bg-slate-50 cursor-pointer" @click="toggleFleetRow(row)">
                  <td class="px-4 py-3 text-center">
                    <svg class="w-3.5 h-3.5 text-slate-400 transition-transform inline-block"
                      :class="expandedFleetId === row.list_id ? 'rotate-90' : ''"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {{ row.trip_date ? new Date(row.trip_date).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' }) : '—' }}
                  </td>
                  <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ row.car_release_code || '—' }}</td>
                  <td class="px-4 py-3 text-xs text-slate-600">
                    <div>{{ row.driver_name || '—' }}</div>
                    <div class="text-slate-400">{{ row.license_plate || row.car_name || '' }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ row.data_store_no || '—' }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ dlFmtAmount(row.amount) }}</td>
                  <td v-if="!isVisitHistoryTab" class="px-4 py-3 text-center">
                    <span v-if="row.bypass" class="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-600">ข้าม</span>
                    <span v-else-if="row.off_site" class="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700">นอกสถานที่</span>
                    <span v-else-if="!row.check_out_id" class="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-600">ไม่มี checkout</span>
                    <span v-else class="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700">{{ row.visit_name || (isVisitHistoryTab ? 'เยี่ยมแล้ว' : 'ส่งสำเร็จ') }}</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span v-if="row.problem_count > 0"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-600 border border-red-200">
                      ⚠ {{ row.problem_count }}
                    </span>
                    <span v-else class="text-slate-300 text-xs">—</span>
                  </td>
                </tr>
                <tr v-if="expandedFleetId === row.list_id">
                  <td :colspan="isVisitHistoryTab ? 7 : 8" class="bg-slate-50/70 px-6 py-4">
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div class="space-y-3">
                        <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">{{ fleetHistoryDetailTitle }}</div>
                        <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div class="text-slate-500">Check-in</div>
                          <div class="text-slate-700">{{ dlFmtDateTime(row.date_time_check_in) }}</div>
                          <div class="text-slate-500">Check-out</div>
                          <div class="text-slate-700">{{ dlFmtDateTime(row.date_time_check_out) }}</div>
                          <div class="text-slate-500">ชำระ</div>
                          <div class="text-slate-700">{{ row.payment_name || '—' }}</div>
                          <div v-if="row.visit_note" class="text-slate-500">หมายเหตุ</div>
                          <div v-if="row.visit_note" class="text-slate-700">{{ row.visit_note }}</div>
                        </div>
                        <div v-if="row.problems && row.problems.length" class="space-y-1">
                          <div class="text-xs text-red-600 font-semibold">ปัญหาที่พบ</div>
                          <div v-for="p in row.problems" :key="p.problem_id"
                            class="text-xs text-slate-600 bg-red-50 border border-red-100 rounded px-2 py-1">
                            <span class="font-medium text-red-700">{{ p.problem_type }}</span>
                            <span v-if="p.description"> — {{ p.description }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="space-y-3">
                        <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">รูปภาพ</div>
                        <div class="flex flex-wrap gap-2">
                          <div v-if="row.image_check_in">
                            <div class="text-[10px] text-slate-400 mb-1">Check-in</div>
                            <img v-if="deliveryImgCache[row.image_check_in] && deliveryImgCache[row.image_check_in] !== 'loading'"
                              :src="deliveryImgCache[row.image_check_in]"
                              class="h-24 w-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                              @click="openLightbox(row.image_check_in, 'Check-in')" />
                            <div v-else class="h-24 w-24 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-400 cursor-pointer"
                              @click="openLightbox(row.image_check_in, 'Check-in')">
                              <span>โหลดรูป</span>
                            </div>
                          </div>
                          <div v-for="(img, idx) in (row.check_out_images || [])" :key="img.image_check_out_id">
                            <div class="text-[10px] text-slate-400 mb-1">รูป {{ idx + 1 }}<span v-if="img.note"> · {{ img.note }}</span></div>
                            <img v-if="deliveryImgCache[img.image_path] && deliveryImgCache[img.image_path] !== 'loading'"
                              :src="deliveryImgCache[img.image_path]"
                              class="h-24 w-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                              @click="openLightbox(img.image_path, `รูป ${idx + 1}${img.note ? ' · ' + img.note : ''}`)" />
                            <div v-else class="h-24 w-24 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-400 cursor-pointer"
                              @click="openLightbox(img.image_path, `รูป ${idx + 1}${img.note ? ' · ' + img.note : ''}`)">
                              <span>โหลดรูป</span>
                            </div>
                          </div>
                          <div v-if="!row.image_check_in && !(row.check_out_images && row.check_out_images.length)"
                            class="text-xs text-slate-400">ไม่มีรูปภาพ</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-if="currentFleetPag.pages > 1"
              class="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
              <span>ทั้งหมด {{ currentFleetPag.total }} รายการ</span>
              <div class="flex gap-1.5">
                <button @click="loadFleetHistory(currentFleetPag.page - 1)"
                  :disabled="currentFleetPag.page <= 1"
                  class="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">←</button>
                <span class="px-2 py-1">{{ currentFleetPag.page }} / {{ currentFleetPag.pages }}</span>
                <button @click="loadFleetHistory(currentFleetPag.page + 1)"
                  :disabled="currentFleetPag.page >= currentFleetPag.pages"
                  class="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">→</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── ประวัติการซื้อ ── -->
        <div v-show="customerActiveTab === 'purchase_history'" class="space-y-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <input v-model="purchaseFilter.doc_no" @input="purchaseDebounce"
              class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="เลขที่เอกสาร..." />
            <input v-model="purchaseFilter.quote_no" @input="purchaseDebounce"
              class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="ใบเสนอราคา..." />
            <input v-model="purchaseFilter.sale_code" @input="purchaseDebounce"
              class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-32 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="รหัสพนักงาน..." />
            <div class="flex items-center gap-1.5 w-full sm:w-auto">
              <span class="text-xs text-slate-500">จาก</span>
              <DateInput v-model="purchaseFilter.date_from" @change="loadPurchaseHistory(1)"
                class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div class="flex items-center gap-1.5 w-full sm:w-auto">
              <span class="text-xs text-slate-500">ถึง</span>
              <DateInput v-model="purchaseFilter.date_to" @change="loadPurchaseHistory(1)"
                class="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <div v-if="loadingPurchase" class="text-center text-slate-400 py-8 text-sm">
            <svg class="animate-spin w-5 h-5 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            กำลังโหลด...
          </div>

          <div v-else class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table class="w-full text-sm min-w-[600px]">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="w-8 px-4 py-3"></th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">วันที่</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">เลขที่เอกสาร</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">ใบเสนอราคา</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">พนักงาน</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ยอดรวม (บาท)</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-slate-500">VAT</th>
                </tr>
              </thead>
              <tbody v-if="!purchaseHistory.length">
                <tr>
                  <td colspan="7" class="py-10 text-center text-slate-400 text-sm">ไม่มีข้อมูลการซื้อ</td>
                </tr>
              </tbody>
              <tbody v-for="row in purchaseHistory" :key="row.doc_no" class="border-b border-slate-100">
                <tr class="hover:bg-slate-50 cursor-pointer" @click="toggleExpandDoc(row.doc_no)">
                  <td class="px-4 py-3 text-center">
                    <svg class="w-3.5 h-3.5 text-slate-400 transition-transform inline-block"
                      :class="expandedDoc === row.doc_no ? 'rotate-90' : ''"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {{ new Date(row.doc_date).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' }) }}
                  </td>
                  <td class="px-4 py-3 font-mono text-xs text-slate-700">{{ row.doc_no }}</td>
                  <td class="px-4 py-3 font-mono text-xs">
                    <span v-if="row.quote_no"
                      class="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      {{ row.quote_no }}
                    </span>
                    <span v-else class="text-slate-300">—</span>
                  </td>
                  <td class="px-4 py-3 text-sm text-slate-600">{{ row.sale_name || row.sale_code || '—' }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ phFmtAmount(row.total_amount) }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                      {{ phVatLabel(row.vat_type) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="expandedDoc === row.doc_no">
                  <td colspan="7" class="bg-slate-50/70 px-6 py-3">
                    <div v-if="loadingLines" class="text-xs text-slate-400 py-2 text-center">กำลังโหลดรายการสินค้า...</div>
                    <table v-else class="w-full text-xs">
                      <thead>
                        <tr class="text-slate-500">
                          <th class="pb-1.5 text-left font-semibold">รหัสสินค้า</th>
                          <th class="pb-1.5 text-left font-semibold">ชื่อสินค้า</th>
                          <th class="pb-1.5 text-right font-semibold">จำนวน</th>
                          <th class="pb-1.5 text-left font-semibold">หน่วย</th>
                          <th class="pb-1.5 text-right font-semibold">ราคา</th>
                          <th class="pb-1.5 text-right font-semibold">ส่วนลด</th>
                          <th class="pb-1.5 text-right font-semibold">รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!expandedLines.length">
                          <td colspan="7" class="py-3 text-center text-slate-400">ไม่มีรายการสินค้า</td>
                        </tr>
                        <tr v-for="line in expandedLines" :key="line.item_code + '_' + line.item_name"
                          class="border-t border-slate-100">
                          <td class="py-1.5 font-mono text-slate-600">{{ line.item_code }}</td>
                          <td class="py-1.5 text-slate-700">{{ line.item_name }}</td>
                          <td class="py-1.5 text-right text-slate-600">{{ line.qty }}</td>
                          <td class="py-1.5 text-slate-500 pl-2">{{ line.unit_name || line.unit_code }}</td>
                          <td class="py-1.5 text-right text-slate-600">{{ phFmtAmount(line.price) }}</td>
                          <td class="py-1.5 text-right text-slate-400">{{ line.discount || '—' }}</td>
                          <td class="py-1.5 text-right font-medium text-slate-800">{{ phFmtAmount(line.sum_amount) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-if="purchasePag.pages > 1"
              class="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
              <span>ทั้งหมด {{ purchasePag.total }} รายการ</span>
              <div class="flex gap-1.5">
                <button @click="loadPurchaseHistory(purchasePag.page - 1)"
                  :disabled="purchasePag.page <= 1"
                  class="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">←</button>
                <span class="px-2 py-1">{{ purchasePag.page }} / {{ purchasePag.pages }}</span>
                <button @click="loadPurchaseHistory(purchasePag.page + 1)"
                  :disabled="purchasePag.page >= purchasePag.pages"
                  class="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">→</button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="customerActiveTab === 'activities'" class="space-y-4">
          <section v-if="followupSummary" class="card p-4 border border-blue-100 bg-blue-50/40">
            <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <h3 class="text-sm font-semibold text-slate-800">Follow-up โทร</h3>
              </div>
              <button v-if="isManager" type="button" @click="toggleCustomerFollowup"
                :disabled="savingFollowup"
                :class="followupForm.followup_enabled ? 'bg-blue-600' : 'bg-slate-300'"
                class="relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-60">
                <span :class="followupForm.followup_enabled ? 'translate-x-5' : 'translate-x-0'"
                  class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow transition-transform" />
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="label-text">วันติดตามถัดไป</label>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <DateInput v-model="followupForm.next_followup" class="input-field text-sm" :disabled="!isManager" />
                  <button v-if="isManager" type="button" @click="saveFollowupOverride({ next_followup: followupForm.next_followup || null })"
                    :disabled="savingFollowup"
                    class="px-3 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 disabled:opacity-60">
                    บันทึก
                  </button>
                </div>
              </div>
              <div>
                <label class="label-text">พักถึงวันที่</label>
                <DateInput v-model="followupForm.followup_pause_until" class="input-field text-sm" :disabled="!isManager" />
              </div>
              <div>
                <label class="label-text">เหตุผลพัก</label>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <input v-model="followupForm.followup_pause_reason" class="input-field text-sm" placeholder="เช่น รอลูกค้าติดต่อกลับ" :disabled="!isManager" />
                  <button v-if="isManager" type="button" @click="pauseCustomerFollowup"
                    :disabled="savingFollowup || !followupForm.followup_pause_until"
                    class="px-3 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-60">
                    พัก
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-3 rounded-xl border border-blue-100 bg-white/70 p-3">
              <div class="flex flex-wrap items-end gap-3">
                <div class="min-w-[180px]">
                  <label class="label-text">รอบโทรเฉพาะลูกค้า</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <input
                      v-model.number="followupForm.followup_interval_days"
                      type="number"
                      min="1"
                      max="365"
                      class="input-field text-sm max-w-[140px]"
                      :disabled="!isManager"
                    />
                    <span class="text-xs text-slate-500">วัน</span>
                    <button v-if="isManager" type="button" @click="saveCustomerFollowupInterval"
                      :disabled="savingFollowup"
                      class="px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 disabled:opacity-60">
                      บันทึกรอบโทร
                    </button>
                    <button v-if="isManager" type="button" @click="useDefaultFollowupInterval"
                      :disabled="savingFollowup || !followupForm.followup_interval_days"
                      class="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60">
                      ใช้ค่ากลาง
                    </button>
                  </div>
                </div>
                <div class="text-xs text-slate-500">
                  <span class="inline-flex rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">{{ followupIntervalBadge }}</span>
                  <span class="ml-2">{{ followupIntervalHelp }}</span>
                </div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span v-if="!followupForm.followup_enabled" class="px-2 py-1 rounded bg-slate-100 text-slate-600">ปิด follow-up</span>
              <span v-if="followupForm.followup_pause_until" class="px-2 py-1 rounded bg-amber-100 text-amber-700">
                พักถึง {{ formatActDate(followupForm.followup_pause_until) }}
              </span>
              <span v-if="followupSummary.next_open_followup" class="px-2 py-1 rounded bg-white border border-slate-200">
                งานถัดไป: {{ followupSummary.next_open_followup.subject }} · {{ formatActDateTime(followupSummary.next_open_followup.start_datetime || followupSummary.next_open_followup.retry_due_at || followupSummary.next_open_followup.due_date) }}
              </span>
              <span v-if="followupSummary.policy" class="px-2 py-1 rounded bg-white border border-slate-200">
                โทรทุก {{ followupSummary.policy.default_call_interval_days }} วัน · โทรซ้ำ {{ followupSummary.policy.no_answer_retry_minutes }} นาที
              </span>
              <span v-if="!isManager" class="ml-auto text-slate-400">ดูได้อย่างเดียว</span>
              <button v-if="isManager && (followupForm.followup_pause_until || !followupForm.followup_enabled)"
                type="button"
                @click="resumeCustomerFollowup"
                :disabled="savingFollowup"
                class="ml-auto text-blue-700 font-semibold hover:underline disabled:opacity-60">
                เปิดใช้งานอีกครั้ง
              </button>
            </div>
          </section>

          <section v-if="followupSummary" class="card p-4 border border-green-100 bg-green-50/40">
            <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <h3 class="text-sm font-semibold text-slate-800">Follow-up เยี่ยม</h3>
              </div>
              <button v-if="isManager" type="button" @click="toggleCustomerVisitFollowup"
                :disabled="savingFollowup"
                :class="followupForm.visit_followup_enabled ? 'bg-green-600' : 'bg-slate-300'"
                class="relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-60">
                <span :class="followupForm.visit_followup_enabled ? 'translate-x-5' : 'translate-x-0'"
                  class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow transition-transform" />
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="label-text">วันเยี่ยมถัดไป</label>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <DateInput v-model="followupForm.next_visit_followup" class="input-field text-sm" :disabled="!isManager" />
                  <button v-if="isManager" type="button" @click="saveFollowupOverride({ next_visit_followup: followupForm.next_visit_followup || null })"
                    :disabled="savingFollowup"
                    class="px-3 rounded-lg bg-white border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-50 disabled:opacity-60">
                    บันทึก
                  </button>
                </div>
              </div>
              <div>
                <label class="label-text">พักถึงวันที่</label>
                <DateInput v-model="followupForm.visit_followup_pause_until" class="input-field text-sm" :disabled="!isManager" />
              </div>
              <div>
                <label class="label-text">เหตุผลพัก</label>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <input v-model="followupForm.visit_followup_pause_reason" class="input-field text-sm" placeholder="เช่น นัดหมายแล้ว" :disabled="!isManager" />
                  <button v-if="isManager" type="button" @click="pauseCustomerVisitFollowup"
                    :disabled="savingFollowup || !followupForm.visit_followup_pause_until"
                    class="px-3 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-60">
                    พัก
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-3 rounded-xl border border-green-100 bg-white/70 p-3">
              <div class="flex flex-wrap items-end gap-3">
                <div class="min-w-[180px]">
                  <label class="label-text">รอบเยี่ยมเฉพาะลูกค้า</label>
                  <div class="flex flex-wrap items-center gap-2">
                    <input
                      v-model.number="followupForm.visit_followup_interval_days"
                      type="number"
                      min="1"
                      max="365"
                      class="input-field text-sm max-w-[140px]"
                      :disabled="!isManager"
                    />
                    <span class="text-xs text-slate-500">วัน</span>
                    <button v-if="isManager" type="button" @click="saveCustomerVisitInterval"
                      :disabled="savingFollowup"
                      class="px-3 py-2 rounded-lg bg-white border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-50 disabled:opacity-60">
                      บันทึกรอบเยี่ยม
                    </button>
                    <button v-if="isManager" type="button" @click="useDefaultVisitInterval"
                      :disabled="savingFollowup || !followupForm.visit_followup_interval_days"
                      class="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60">
                      ใช้ค่ากลาง
                    </button>
                  </div>
                </div>
                <div class="text-xs text-slate-500">
                  <span class="inline-flex rounded-full bg-green-50 px-2 py-1 font-semibold text-green-700">
                    {{ followupForm.visit_followup_interval_days ? `${followupForm.visit_followup_interval_days} วัน` : 'ใช้ค่ากลาง' }}
                  </span>
                  <span class="ml-2">{{ followupForm.visit_followup_interval_days ? 'รอบเยี่ยมเฉพาะลูกค้า' : 'ตามค่า global' }}</span>
                </div>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span v-if="!followupForm.visit_followup_enabled" class="px-2 py-1 rounded bg-slate-100 text-slate-600">ปิด follow-up เยี่ยม</span>
              <span v-if="followupForm.visit_followup_pause_until" class="px-2 py-1 rounded bg-amber-100 text-amber-700">
                พักถึง {{ formatActDate(followupForm.visit_followup_pause_until) }}
              </span>
              <span v-if="followupSummary.policy" class="px-2 py-1 rounded bg-white border border-slate-200">
                เยี่ยมทุก {{ followupSummary.policy.default_visit_interval_days || 30 }} วัน
              </span>
              <span v-if="!isManager" class="ml-auto text-slate-400">ดูได้อย่างเดียว</span>
              <button v-if="isManager && (followupForm.visit_followup_pause_until || !followupForm.visit_followup_enabled)"
                type="button"
                @click="resumeCustomerVisitFollowup"
                :disabled="savingFollowup"
                class="ml-auto text-green-700 font-semibold hover:underline disabled:opacity-60">
                เปิดใช้งานอีกครั้ง
              </button>
            </div>
          </section>

          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div class="relative flex-1 min-w-[180px]">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input v-model="customerActivityFilter.search" @input="customerActivityDebounce" class="input-field pl-9 text-sm" placeholder="ค้นหาหัวข้อ..."/>
            </div>
            <select v-model="customerActivityFilter.status" @change="loadCustomerActivities(true)" class="input-field w-full text-sm sm:w-auto">
              <option value="all">ทุกสถานะ</option>
              <option value="open">ค้างอยู่</option>
              <option value="done">ปิดแล้ว</option>
              <option value="deleted">ถูกลบ</option>
            </select>
          </div>

          <div v-if="loadingCustomerActivities" class="text-center text-slate-400 py-8 text-sm">
            <svg class="animate-spin w-5 h-5 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            กำลังโหลด...
          </div>

          <div v-else-if="customerActivities.length === 0" class="card p-8 text-center text-slate-400">
            <svg class="mx-auto w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <p class="text-sm">ยังไม่มีกิจกรรมสำหรับลูกค้านี้</p>
          </div>

          <template v-else>
            <div v-for="act in customerActivities" :key="act.id"
              :class="[
                'card border cursor-pointer hover:shadow-md transition-shadow',
                act.status === 'deleted' ? 'opacity-50' : '',
                act.status === 'done' ? 'border-green-200' : '',
                actOverdueDays(act) > 0 ? 'border-red-200 bg-red-50/30' : ''
              ]"
              @click="openCustomerActivityDialog(act)">
              <div class="p-4">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="text-lg flex-shrink-0">{{ actTypeIcon(act.activity_type) }}</span>
                    <div class="min-w-0">
                      <p :class="['text-sm font-semibold', act.status === 'deleted' ? 'line-through text-slate-400' : 'text-slate-800']">
                        {{ act.subject }}
                      </p>
                      <p class="text-xs text-slate-400 mt-0.5">
                        {{ actTypeLabel(act.activity_type) }}
                        <span v-if="act.group_id" class="ml-1 text-purple-500" title="กิจกรรมกลุ่ม">👥</span>
                        <span v-if="act.followup_type === 'no_answer_retry'" class="ml-1 text-amber-600 font-semibold">
                          โทรซ้ำ {{ act.attempt_no ? `#${act.attempt_no}` : '' }}
                        </span>
                        <span v-else-if="act.system_created" class="ml-1 text-indigo-600 font-semibold">สร้างโดยระบบ</span>
                      </p>
                      <p v-if="act.activity_type === 'call' && (act.call_direction || act.call_result)" class="text-xs mt-0.5">
                        <span class="text-slate-400">{{ act.call_direction === 'outbound' ? 'โทรออก' : act.call_direction === 'inbound' ? 'รับสาย' : '' }}</span>
                        <span v-if="act.call_result" :class="act.call_result === 'answered' ? 'text-green-600' : 'text-red-500'">
                          {{ act.call_direction ? ' · ' : '' }}{{ callResultLabel(act.call_result) }}
                        </span>
                      </p>
                      <div v-if="act.activity_type === 'visit'" class="flex flex-wrap gap-1 mt-0.5">
                        <span v-if="act.visit_met === true" class="bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full text-[10px]">ได้พบ</span>
                        <span v-if="act.visit_met === false" class="bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full text-[10px]">ไม่ได้พบ</span>
                        <span v-if="act.visit_order === true" class="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full text-[10px]">ออเดอร์</span>
                        <span v-if="act.visit_order_amount" class="text-[10px] text-slate-500 self-center">฿{{ Number(act.visit_order_amount).toLocaleString() }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', actStatusBadge(act.status, act).cls]">
                      {{ actStatusBadge(act.status, act).label }}
                    </span>
                    <span class="text-xs text-slate-400 whitespace-nowrap">
                      {{ formatActDate(act.due_date || act.start_datetime) }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1 text-xs text-slate-500 min-w-0">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <span class="truncate">
                      {{ (act.owners || []).filter(o => !o.removed_at).map(o => o.name).join(', ') || 'ไม่มีผู้รับผิดชอบ' }}
                    </span>
                  </div>
                  <span v-if="actOverdueDays(act) > 0" class="text-xs text-red-500 font-medium whitespace-nowrap">
                    เลยกำหนด {{ actOverdueDays(act) }} วัน
                  </span>
                </div>

                <div v-if="act.status === 'done' && act.outcome"
                  class="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <p class="text-xs font-medium text-green-700 mb-1">ผลลัพธ์</p>
                  <p class="text-sm text-green-800 whitespace-pre-wrap">{{ act.outcome }}</p>
                  <p v-if="act.created_by_name" class="text-xs text-green-600 mt-1">
                    อัปเดตล่าสุด {{ formatActDateTime(act.updated_at) }}
                  </p>
                </div>

                <div v-else-if="act.status === 'done' && !act.outcome"
                  class="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <p class="text-xs font-medium text-green-700">งานเสร็จสิ้น</p>
                </div>
              </div>
            </div>

            <div v-if="customerActivities.length < customerActivityTotal" class="text-center pt-2">
              <button @click="loadMoreCustomerActivities" :disabled="loadingCustomerActivities"
                class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                ดูเพิ่ม (แสดง {{ customerActivities.length }} จาก {{ customerActivityTotal }}) →
              </button>
            </div>
          </template>
        </div>

        <div v-show="customerActiveTab === 'notes'" class="space-y-4">
          <div class="card p-4">
            <label class="label-text mb-2 block">เพิ่มบันทึกใหม่</label>
            <textarea v-model="newNote" rows="3" class="input-field mb-3"
              placeholder="บันทึกการติดต่อ, ข้อสังเกต, หมายเหตุ..."/>
            <div
              class="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 transition-colors"
              :class="noteFileDragging ? 'border-blue-400 bg-blue-50' : ''"
              @dragover.prevent="noteFileDragging = true"
              @dragleave.prevent="noteFileDragging = false"
              @drop.prevent="onNewNoteFileDrop">
              <input ref="noteFileInput" type="file" multiple class="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                @change="onNewNoteFileChange" />
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-medium text-slate-700">แนบรูป/ไฟล์ประกอบบันทึก</p>
                  <p class="text-xs text-slate-400">ลากไฟล์มาวาง หรือเลือกไฟล์ได้สูงสุด 10 ไฟล์</p>
                </div>
                <button type="button" class="btn-secondary text-xs px-3 py-1.5" @click="noteFileInput?.click()">
                  เลือกไฟล์
                </button>
              </div>
              <div v-if="newNoteFiles.length" class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div v-for="(item, idx) in newNoteFiles" :key="item.id" class="relative rounded-lg border border-slate-200 bg-white p-2">
                  <img v-if="item.previewUrl" :src="item.previewUrl" class="h-20 w-full rounded-md object-cover" />
                  <div v-else class="h-20 rounded-md bg-slate-100 flex items-center justify-center text-xs text-slate-500 text-center px-2">
                    {{ item.file.name }}
                  </div>
                  <p class="mt-1 truncate text-[11px] text-slate-500">{{ item.file.name }}</p>
                  <button type="button" class="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs text-red-500 shadow"
                    @click="removeNewNoteFile(idx)">
                    x
                  </button>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input v-model="newNotePinned" type="checkbox" class="rounded"/>
                ปักหมุด
              </label>
              <button @click="addNote" :disabled="!canAddNote || savingNote"
                class="btn-primary text-sm px-4 py-1.5 disabled:opacity-40">
                {{ savingNote ? 'กำลังบันทึก...' : 'บันทึก' }}
              </button>
            </div>
          </div>

          <div v-if="loadingNotes" class="text-center text-slate-400 py-8 text-sm">กำลังโหลด...</div>

          <div v-else-if="!notes.length" class="card p-8 text-center text-slate-400 text-sm">
            ยังไม่มีบันทึก
          </div>

          <div v-for="note in notes" :key="note.id"
            :class="note.is_pinned ? 'border-yellow-300 bg-yellow-50/50' : ''"
            class="card p-4 border">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-sm text-slate-800 whitespace-pre-wrap">{{ note.note_text }}</p>
                <div v-if="note.attachments?.length" class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button v-for="att in note.attachments" :key="att.id" type="button"
                    class="text-left rounded-lg border border-slate-200 bg-slate-50 overflow-hidden hover:border-blue-300"
                    @click="isNoteImage(att) ? openNoteAttachmentPreview(att, $event) : null">
                    <img v-if="isNoteImage(att)" :src="noteAttachmentThumbUrl(att)" class="h-24 w-full object-cover" />
                    <div v-else class="h-24 flex items-center justify-center bg-white text-xs text-slate-500 px-2 text-center">
                      {{ att.original_name || att.filename }}
                    </div>
                    <div class="px-2 py-1">
                      <p class="truncate text-[11px] text-slate-600">{{ att.original_name || att.filename }}</p>
                      <p class="text-[10px] text-slate-400">{{ formatFileSize(att.file_size) }}</p>
                    </div>
                  </button>
                </div>
                <p class="text-xs text-slate-400 mt-2">
                  {{ note.created_by_name || 'ไม่ระบุ' }} · {{ formatNoteDate(note.created_at) }}
                  <span v-if="note.is_pinned" class="ml-2 text-yellow-600 font-medium">📌 ปักหมุด</span>
                </p>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button @click="togglePin(note)" title="ปักหมุด"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                  </svg>
                </button>
                <button @click="deleteNote(note)" title="ลบ"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="customerActiveTab === 'credit_detail'" class="space-y-4">
          <div v-if="loadingCreditDetail" class="text-center text-slate-400 py-8 text-sm">
            <svg class="animate-spin w-5 h-5 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            กำลังโหลด...
          </div>

          <template v-else>
            <div v-if="creditDetail" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="bg-white rounded-xl border border-slate-200 p-4">
                <p class="text-slate-400 text-xs font-medium">วงเงินเครดิต</p>
                <p class="text-lg font-bold text-slate-800 mt-1">{{ creditDetail.data_head.credit_money }}</p>
              </div>
              <div class="bg-white rounded-xl border border-slate-200 p-4">
                <p class="text-slate-400 text-xs font-medium">สั่งขาย</p>
                <p class="text-lg font-bold text-blue-600 mt-1">{{ creditDetail.data_head.sum_sr }}</p>
              </div>
              <div class="bg-white rounded-xl border border-slate-200 p-4">
                <p class="text-slate-400 text-xs font-medium">เช็คคงค้าง</p>
                <p class="text-lg font-bold text-amber-600 mt-1">{{ creditDetail.data_head.sum_cheque }}</p>
              </div>
              <div class="bg-white rounded-xl border border-slate-200 p-4">
                <p class="text-slate-400 text-xs font-medium">หนี้คงค้าง</p>
                <p class="text-lg font-bold text-red-600 mt-1">{{ creditDetail.data_head.sum_status }}</p>
              </div>
            </div>
            <div v-else class="bg-white rounded-xl border border-slate-200 p-4 text-center text-slate-400 text-sm">ไม่พบข้อมูลเครดิต</div>

            <div class="flex gap-1 bg-slate-50 rounded-xl p-1 border border-slate-200 overflow-x-auto">
              <button v-for="t in [
                  { key: 'credit_docs',    label: 'รายการคงค้าง' },
                  { key: 'credit_cheques', label: 'เช็ค' },
                  { key: 'credit_srss',    label: 'SR/SS' }
                ]" :key="t.key"
                @click="creditActiveTab = t.key"
                class="flex-1 min-w-max py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                :class="creditActiveTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-white/60'">
                {{ t.label }}
              </button>
            </div>

            <div v-if="creditActiveTab === 'credit_docs'" class="space-y-2">
              <div v-if="creditDetail" class="bg-white rounded-xl border border-red-200 bg-red-50 py-3 px-4 flex justify-between items-center">
                <span class="text-sm font-medium text-slate-600">ยอดรวมหนี้คงค้าง</span>
                <span class="text-lg font-bold text-red-600">{{ creditDetail.data_head.sum_status }}</span>
              </div>
              <div v-if="!creditDetail || !creditDetail.data_1.length" class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
              <div v-else v-for="(item, i) in creditDetail.data_1" :key="i" class="bg-white rounded-xl border border-slate-200 py-3 px-4">
                <div class="flex justify-between items-start">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-700">{{ item.doc_no }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">{{ creditFmtDate(item.doc_date) }} · ครบกำหนด {{ creditFmtDate(item.due_date) }}</p>
                    <p v-if="item.remark" class="text-xs text-slate-400 mt-0.5">{{ item.remark }}</p>
                  </div>
                  <div class="text-right ml-3">
                    <p class="text-sm font-medium" :class="Number(item.amount) < 0 ? 'text-emerald-600' : 'text-slate-800'">{{ creditFmt(item.amount) }}</p>
                    <p class="text-xs text-slate-400">คงค้าง {{ creditFmt(item.ar_balance) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="creditActiveTab === 'credit_cheques'" class="space-y-2">
              <div v-if="creditDetail" class="bg-amber-50 border border-amber-200 rounded-xl py-3 px-4 flex justify-between items-center">
                <span class="text-sm font-medium text-slate-600">ยอดรวมเช็คคงค้าง</span>
                <span class="text-lg font-bold text-amber-600">{{ creditDetail.data_head.sum_cheque }}</span>
              </div>
              <div v-if="!creditDetail || !creditDetail.data_2.length" class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
              <div v-else v-for="(item, i) in creditDetail.data_2" :key="i" class="bg-white rounded-xl border border-slate-200 py-3 px-4">
                <div class="flex justify-between items-start">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-700">{{ item.chq_number }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">รับเช็ค {{ creditFmtDate(item.chq_get_date) }} · ครบกำหนด {{ creditFmtDate(item.chq_due_date) }}</p>
                    <p v-if="item.doc_ref" class="text-xs text-slate-400 mt-0.5">อ้างอิง: {{ item.doc_ref }}</p>
                  </div>
                  <div class="text-right ml-3">
                    <p class="text-sm font-medium text-slate-800">{{ creditFmt(item.amount) }}</p>
                    <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{{ item.status }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="creditActiveTab === 'credit_srss'" class="space-y-2">
              <div v-if="creditDetail" class="bg-blue-50 border border-blue-200 rounded-xl py-3 px-4 flex justify-between items-center">
                <span class="text-sm font-medium text-slate-600">ยอดรวมสั่งขาย</span>
                <span class="text-lg font-bold text-blue-600">{{ creditDetail.data_head.sum_sr }}</span>
              </div>
              <div v-if="!creditDetail || !creditDetail.data_3.length" class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
              <div v-else v-for="(item, i) in creditDetail.data_3" :key="i" class="bg-white rounded-xl border border-slate-200 py-3 px-4">
                <div class="flex justify-between items-start">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-slate-700">{{ item.doc_no }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">{{ creditFmtDate(item.doc_date) }}</p>
                    <p v-if="item.remark" class="text-xs text-slate-400 mt-0.5">{{ item.remark }}</p>
                  </div>
                  <div class="text-right ml-3">
                    <p class="text-sm font-medium text-slate-800">{{ creditFmt(item.total_amount) }}</p>
                    <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                      :class="String(item.trans_flag) === '36' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'">
                      {{ String(item.trans_flag) === '36' ? 'SR' : 'SS' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

      </div>
    </template>

  <Teleport to="body">
    <div v-if="selectedCustomerActivity"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeCustomerActivityDialog">
      <div class="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" :class="typeClass(selectedCustomerActivity.activity_type)">
                {{ actTypeLabel(selectedCustomerActivity.activity_type) }}
              </span>
              <span :class="['inline-flex rounded-full px-2 py-0.5 text-xs font-medium', actStatusBadge(selectedCustomerActivity.status, selectedCustomerActivity).cls]">
                {{ actStatusBadge(selectedCustomerActivity.status, selectedCustomerActivity).label }}
              </span>
              <span v-if="selectedCustomerActivity.system_created" class="text-xs font-semibold text-indigo-600">สร้างโดยระบบ</span>
            </div>
            <h3 class="truncate text-lg font-semibold text-slate-800">{{ selectedCustomerActivity.subject || '-' }}</h3>
            <p class="mt-1 text-xs text-slate-400">
              {{ formatActDateTime(selectedCustomerActivity.start_datetime || selectedCustomerActivity.due_date || selectedCustomerActivity.created_at) }}
            </p>
          </div>
          <button type="button"
            class="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
            @click="closeCustomerActivityDialog">
            ปิด
          </button>
        </div>

        <div class="max-h-[calc(90vh-88px)] overflow-y-auto px-5 py-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p class="text-xs font-medium text-slate-400">ผู้รับผิดชอบ</p>
              <p class="mt-1 text-sm text-slate-700">
                {{ customerActivityOwnerNames(selectedCustomerActivity) || 'ไม่มีผู้รับผิดชอบ' }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p class="text-xs font-medium text-slate-400">ผู้สร้าง</p>
              <p class="mt-1 text-sm text-slate-700">{{ selectedCustomerActivity.created_by_name || 'ไม่ระบุ' }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p class="text-xs font-medium text-slate-400">วันที่เริ่ม / กำหนด</p>
              <p class="mt-1 text-sm text-slate-700">
                {{ formatActDateTime(selectedCustomerActivity.start_datetime || selectedCustomerActivity.due_date) || '-' }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p class="text-xs font-medium text-slate-400">อัปเดตล่าสุด</p>
              <p class="mt-1 text-sm text-slate-700">{{ formatActDateTime(selectedCustomerActivity.updated_at) || '-' }}</p>
            </div>
          </div>

          <div v-if="selectedCustomerActivity.description" class="mt-4 rounded-xl border border-slate-200 p-4">
            <p class="mb-2 text-xs font-medium text-slate-400">รายละเอียด</p>
            <p class="whitespace-pre-wrap text-sm text-slate-700">{{ selectedCustomerActivity.description }}</p>
          </div>

          <div v-if="selectedCustomerActivity.activity_type === 'call'" class="mt-4 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
            <p class="mb-2 text-xs font-semibold text-orange-700">ข้อมูลการโทร</p>
            <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <span class="text-slate-400">ทิศทาง: </span>
                <span class="text-slate-700">{{ selectedCustomerActivity.call_direction === 'outbound' ? 'โทรออก' : selectedCustomerActivity.call_direction === 'inbound' ? 'รับสาย' : '-' }}</span>
              </div>
              <div>
                <span class="text-slate-400">ผลการโทร: </span>
                <span class="text-slate-700">{{ selectedCustomerActivity.call_result ? callResultLabel(selectedCustomerActivity.call_result) : '-' }}</span>
              </div>
            </div>
          </div>

          <div v-if="selectedCustomerActivity.activity_type === 'visit'" class="mt-4 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
            <p class="mb-2 text-xs font-semibold text-teal-700">ข้อมูลการเยี่ยม</p>
            <div class="flex flex-wrap gap-2 text-xs">
              <span v-if="selectedCustomerActivity.visit_met === true" class="rounded-full border border-green-200 bg-green-50 px-2 py-1 font-medium text-green-700">ได้พบ</span>
              <span v-if="selectedCustomerActivity.visit_met === false" class="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-600">ไม่ได้พบ</span>
              <span v-if="selectedCustomerActivity.visit_order === true" class="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-600">มีออเดอร์</span>
              <span v-if="selectedCustomerActivity.visit_order_amount" class="rounded-full border border-slate-200 bg-white px-2 py-1 font-medium text-slate-600">
                ยอด {{ Number(selectedCustomerActivity.visit_order_amount).toLocaleString('th-TH') }}
              </span>
            </div>
          </div>

          <div v-if="selectedCustomerActivity.outcome" class="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-4">
            <p class="mb-2 text-xs font-medium text-green-700">ผลลัพธ์</p>
            <p class="whitespace-pre-wrap text-sm text-green-800">{{ selectedCustomerActivity.outcome }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Lightbox -->
  <Teleport to="body">
    <div v-if="lightbox.open"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      @click.self="closeLightbox">
      <div class="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center">
        <button @click="closeLightbox"
          class="absolute -top-10 right-0 text-white/80 hover:text-white text-3xl leading-none">&times;</button>
        <img :src="lightbox.src" class="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain" />
        <div v-if="lightbox.label" class="mt-3 text-sm text-white/70">{{ lightbox.label }}</div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="noteAttachmentPreview"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      @click.self="noteAttachmentPreview = null">
      <div class="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p class="truncate text-sm font-medium text-slate-700">
            {{ noteAttachmentPreview.original_name || noteAttachmentPreview.filename }}
          </p>
          <button type="button" class="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
            @click="noteAttachmentPreview = null">
            ปิด
          </button>
        </div>
        <div class="max-h-[82vh] overflow-auto bg-slate-950 p-3">
          <img :src="noteAttachmentUrl(noteAttachmentPreview)" class="mx-auto max-h-[78vh] max-w-full rounded-lg object-contain" />
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Toast -->
  <Teleport to="body">
    <div v-if="toast.show"
         :class="['fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
           toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white']">
      <svg v-if="toast.type === 'success'" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      <svg v-else class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
      {{ toast.message }}
    </div>
  </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../composables/useApi.js'
import ActivityAttachments from '../components/ActivityAttachments.vue'
import ActivityComments from '../components/ActivityComments.vue'
import CloseActivityModal from '../components/CloseActivityModal.vue'
import SnoozeActivityModal from '../components/SnoozeActivityModal.vue'
import DateInput from '../components/DateInput.vue'
import { usePermissions } from '../composables/usePermissions.js'

const { canEdit, isManager } = usePermissions()

const props = defineProps({ id: String })
const route = useRoute()
const activityId = computed(() => props.id || route.params.id)

const loading  = ref(true)
const errorMsg = ref('')
const saving   = ref(false)
const toast = reactive({ show: false, type: 'success', message: '' })

function showToast(type, message) {
  toast.type = type; toast.message = message; toast.show = true
  setTimeout(() => { toast.show = false }, 3500)
}

// ── Close modal (lightweight — logic in shared component) ────
const closeModal = reactive({ show: false })
const snoozeModal = reactive({ show: false })

function openCloseModal() {
  closeModal.show = true
}

async function toggleFollow() {
  try {
    const { data } = await api.post(`/activities/${activityId.value}/follow`)
    isFollowing.value = data.following
    showToast('success', data.following ? 'ติดตามกิจกรรมแล้ว' : 'เลิกติดตามกิจกรรมแล้ว')
  } catch (e) {
    showToast('error', e.response?.data?.error || 'เกิดข้อผิดพลาด')
  }
}

function canCloseActivity(act) {
  return !act?.requires_owner_assignment
}

function onCloseRequestedSnooze() {
  closeModal.show = false
  snoozeModal.show = true
}

function onSnoozed(data) {
  snoozeModal.show = false
  if (data) {
    activity.value = { ...activity.value, ...data }
  }
  showToast('success', 'เลื่อนงานแล้ว')
}

function onActivityDone(doneActivity) {
  closeModal.show = false
  const nextStatus = doneActivity?.activity_status || doneActivity?.status || 'done'
  activity.value = { ...activity.value, ...(doneActivity || {}), status: nextStatus, my_status: nextStatus }
  if (doneActivity?.retry?.created) {
    showToast('success', `สร้างงานโทรซ้ำ #${doneActivity.retry.activity_id} แล้ว`)
  } else if (doneActivity?.retry?.skipped) {
    showToast('success', retrySkippedMessage(doneActivity.retry))
  }
}

const activity   = ref(null)
const contactors = ref([])
const isFollowing = ref(false)

// ── Customer history tabs ─────────────────────────────────────
const customerActiveTab = ref('delivery_history')
const customerTabs = [
  { key: 'delivery_history', label: 'ประวัติการขนส่ง' },
  { key: 'visit_history', label: 'ประวัติการเยี่ยม' },
  { key: 'activities', label: 'กิจกรรม' },
  { key: 'notes', label: 'บันทึก' },
  { key: 'purchase_history', label: 'ประวัติการซื้อ' },
  { key: 'credit_detail',   label: 'หนี้คงค้าง' },
]

// Delivery history
const deliveryTimeline  = ref([])
const deliveryPag       = reactive({ total: 0, page: 1, pages: 1, limit: 20 })
const loadingDelivery   = ref(false)
const deliveryFilter    = reactive({ bill: '', date_from: '', date_to: '' })
const expandedDelivery  = ref(null)
const visitTimeline     = ref([])
const visitPag          = reactive({ total: 0, page: 1, pages: 1, limit: 20 })
const loadingVisit      = ref(false)
const visitFilter       = reactive({ bill: '', date_from: '', date_to: '' })
const expandedVisit     = ref(null)
const deliveryImgCache  = reactive({})
const lightbox          = reactive({ open: false, src: null, label: '' })

// Purchase history
const purchaseHistory = ref([])
const purchasePag     = reactive({ total: 0, page: 1, pages: 1, limit: 10 })
const loadingPurchase = ref(false)
const purchaseFilter  = reactive({ doc_no: '', sale_code: '', quote_no: '', date_from: '', date_to: '' })
const expandedDoc     = ref(null)
const expandedLines   = ref([])
const loadingLines    = ref(false)

// Customer activities
const customerActivities = ref([])
const customerActivityTotal = ref(0)
const customerActivityLimit = ref(10)
const loadingCustomerActivities = ref(false)
const customerActivityFilter = reactive({ search: '', status: 'all' })
const selectedCustomerActivity = ref(null)
const followupSummary = ref(null)
const savingFollowup = ref(false)
const followupForm = reactive({
  followup_enabled: false,
  followup_pause_until: '',
  followup_pause_reason: '',
  next_followup: '',
  followup_interval_days: '',
  visit_followup_enabled: false,
  visit_followup_pause_until: '',
  visit_followup_pause_reason: '',
  next_visit_followup: '',
  visit_followup_interval_days: '',
})

const followupIntervalDays = computed(() => {
  const n = Number(followupForm.followup_interval_days || 0)
  return Number.isInteger(n) && n > 0 ? n : null
})
const defaultFollowupIntervalDays = computed(() => Number(followupSummary.value?.policy?.default_call_interval_days || 30))
const followupIntervalBadge = computed(() => {
  return followupIntervalDays.value
    ? `โทรทุก ${followupIntervalDays.value} วัน`
    : `โทรทุก ${defaultFollowupIntervalDays.value} วัน`
})
const followupIntervalHelp = computed(() => {
  return followupIntervalDays.value
    ? `ลูกค้ารายนี้ใช้รอบเฉพาะ โทรทุก ${followupIntervalDays.value} วัน`
    : `ยังไม่ได้ตั้งรอบเฉพาะ ใช้ค่ากลาง ${defaultFollowupIntervalDays.value} วัน`
})

// Customer notes
const notes = ref([])
const loadingNotes = ref(false)
const savingNote = ref(false)
const newNote = ref('')
const newNotePinned = ref(false)
const newNoteFiles = ref([])
const noteFileInput = ref(null)
const noteFileDragging = ref(false)
const noteAttachmentPreview = ref(null)
const canAddNote = computed(() => newNote.value.trim() || newNoteFiles.value.length > 0)

// Credit detail
const creditDetail        = ref(null)
const loadingCreditDetail = ref(false)
const creditActiveTab     = ref('credit_docs')

async function refreshActivity() {
  const { data } = await api.get(`/activities/${activityId.value}`)
  activity.value = { ...(activity.value || {}), ...data }
  isFollowing.value = data.is_following ?? isFollowing.value
  return data
}

onMounted(async () => {
  try {
    const data = await refreshActivity()
    // โหลด customer_name + contactors ถ้ามี ar_code
    if (data.ar_code) {
      try {
        const { data: cust } = await api.get(`/customers/${data.ar_code}`)
        // patch customer_name ถ้า backend ไม่ส่งมา
        if (!activity.value.customer_name && cust.name_1) {
          activity.value = { ...activity.value, customer_name: cust.name_1 }
        }
        // contactors ทุกคน (มีเบอร์หรือไม่ก็แสดง)
        contactors.value = (cust.contactors || []).map(ct => ({
          name:      ct.name || '',
          phones:    (ct.telephone || '').split(',').map(p => p.trim()).filter(Boolean),
          work_title: ct.work_title || '',
          email:     ct.email || '',
        }))
        applyCustomerFollowupData(cust)
      } catch {}
    }
    if (data.ar_code) loadDeliveryHistory(1)
  } catch (e) {
    errorMsg.value = e.message || 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

// ── Customer history functions ────────────────────────────────

const isVisitHistoryTab = computed(() => customerActiveTab.value === 'visit_history')
const currentFleetFilter = computed(() => isVisitHistoryTab.value ? visitFilter : deliveryFilter)
const currentFleetPag = computed(() => isVisitHistoryTab.value ? visitPag : deliveryPag)
const currentFleetTimeline = computed(() => isVisitHistoryTab.value ? visitTimeline.value : deliveryTimeline.value)
const currentFleetLoading = computed(() => isVisitHistoryTab.value ? loadingVisit.value : loadingDelivery.value)
const expandedFleetId = computed(() => isVisitHistoryTab.value ? expandedVisit.value : expandedDelivery.value)
const fleetHistoryEmptyMessage = computed(() => isVisitHistoryTab.value ? 'ไม่มีข้อมูลการเยี่ยม' : 'ไม่มีข้อมูลการขนส่ง')
const fleetHistoryDetailTitle = computed(() => isVisitHistoryTab.value ? 'ข้อมูลการเยี่ยม' : 'ข้อมูลการส่ง')

async function loadDeliveryHistory(page = 1) {
  return loadFleetHistory(page, 'delivery')
}

async function loadVisitHistory(page = 1) {
  return loadFleetHistory(page, 'visit')
}

async function loadFleetHistory(page = 1, kind = (isVisitHistoryTab.value ? 'visit' : 'delivery')) {
  const code = activity.value?.ar_code
  if (!code) return
  const isVisit = kind === 'visit'
  const filter = isVisit ? visitFilter : deliveryFilter
  const pag = isVisit ? visitPag : deliveryPag
  if (isVisit) loadingVisit.value = true
  else loadingDelivery.value = true
  const p = {
    from:  filter.date_from || undefined,
    to:    filter.date_to   || undefined,
    bill:  filter.bill      || undefined,
    kind,
    page, limit: pag.limit,
  }
  const res = await api.get(`/fleet/customer/${code}/timeline`, { params: p })
    .then(r => r.data).catch(() => ({ timeline: [], pagination: {} }))
  if (isVisit) {
    visitTimeline.value = res.timeline || []
    if (res.pagination) Object.assign(visitPag, res.pagination)
    visitPag.page = page
    loadingVisit.value = false
  } else {
    deliveryTimeline.value = res.timeline || []
    if (res.pagination) Object.assign(deliveryPag, res.pagination)
    deliveryPag.page = page
    loadingDelivery.value = false
  }
}

let deliveryTimer = null
function deliveryDebounce() {
  clearTimeout(deliveryTimer)
  deliveryTimer = setTimeout(() => loadDeliveryHistory(1), 350)
}

let visitTimer = null
function visitDebounce() {
  clearTimeout(visitTimer)
  visitTimer = setTimeout(() => loadVisitHistory(1), 350)
}

function fleetHistoryDebounce() {
  if (isVisitHistoryTab.value) visitDebounce()
  else deliveryDebounce()
}

function toggleDeliveryRow(row) {
  toggleFleetRow(row, 'delivery')
}

function toggleVisitRow(row) {
  toggleFleetRow(row, 'visit')
}

function toggleFleetRow(row, kind = (isVisitHistoryTab.value ? 'visit' : 'delivery')) {
  const target = kind === 'visit' ? expandedVisit : expandedDelivery
  if (target.value === row.list_id) {
    target.value = null
    return
  }
  target.value = row.list_id
  if (row.image_check_in) loadDeliveryImg(row.image_check_in)
  ;(row.check_out_images || []).forEach(img => loadDeliveryImg(img.image_path))
}

async function loadDeliveryImg(path) {
  if (!path || deliveryImgCache[path] !== undefined) return
  deliveryImgCache[path] = 'loading'
  const blob = await api.get('/fleet/image', { params: { path }, responseType: 'blob' })
    .then(r => r.data).catch(() => null)
  deliveryImgCache[path] = blob ? URL.createObjectURL(blob) : null
}

async function openLightbox(path, label) {
  if (!path) return
  if (!deliveryImgCache[path] || deliveryImgCache[path] === 'loading') {
    await loadDeliveryImg(path)
  }
  if (!deliveryImgCache[path]) return
  lightbox.src = deliveryImgCache[path]
  lightbox.label = label || ''
  lightbox.open = true
}
function closeLightbox() { lightbox.open = false }

function dlFmtAmount(v) {
  return parseFloat(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function dlFmtDateTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function loadPurchaseHistory(page = 1) {
  const code = activity.value?.ar_code
  if (!code) return
  loadingPurchase.value = true
  const p = {
    date_from:  purchaseFilter.date_from  || undefined,
    date_to:    purchaseFilter.date_to    || undefined,
    doc_no:     purchaseFilter.doc_no     || undefined,
    sale_code:  purchaseFilter.sale_code  || undefined,
    quote_no:   purchaseFilter.quote_no   || undefined,
    page, limit: purchasePag.limit,
  }
  const res = await api.get(`/sales/customer/${code}`, { params: p })
    .then(r => r.data).catch(() => ({ data: [], pagination: {} }))
  purchaseHistory.value = res.data || []
  if (res.pagination) Object.assign(purchasePag, res.pagination)
  purchasePag.page = page
  loadingPurchase.value = false
}

async function toggleExpandDoc(doc_no) {
  if (expandedDoc.value === doc_no) {
    expandedDoc.value = null; expandedLines.value = []; return
  }
  expandedDoc.value   = doc_no
  expandedLines.value = []
  loadingLines.value  = true
  const res = await api.get(`/sales/transactions/${doc_no}`)
    .then(r => r.data).catch(() => null)
  expandedLines.value = res?.lines || []
  loadingLines.value  = false
}

let purchaseTimer = null
function purchaseDebounce() {
  clearTimeout(purchaseTimer)
  purchaseTimer = setTimeout(() => loadPurchaseHistory(1), 350)
}

async function loadCustomerActivities(reset = false) {
  const code = activity.value?.ar_code
  if (!code) return
  if (reset) {
    customerActivities.value = []
    customerActivityLimit.value = 10
  }
  loadingCustomerActivities.value = true
  const params = {
    status: customerActivityFilter.status || 'all',
    search: customerActivityFilter.search || undefined,
    limit: customerActivityLimit.value,
    offset: 0,
  }
  const res = await api.get(`/activities/by-customer/${encodeURIComponent(code)}`, { params })
    .then(r => r.data)
    .catch(() => ({ activities: [], total: 0 }))
  customerActivities.value = res.activities || []
  customerActivityTotal.value = Number(res.total || 0)
  loadingCustomerActivities.value = false
}

function loadMoreCustomerActivities() {
  customerActivityLimit.value += 10
  loadCustomerActivities(false)
}

function openCustomerActivityDialog(act) {
  selectedCustomerActivity.value = act
}

function closeCustomerActivityDialog() {
  selectedCustomerActivity.value = null
}

function customerActivityOwnerNames(act) {
  return (act?.owners || [])
    .filter(o => !o.removed_at)
    .map(o => o.name || o.code)
    .filter(Boolean)
    .join(', ')
}

let customerActivityTimer = null
function customerActivityDebounce() {
  clearTimeout(customerActivityTimer)
  customerActivityTimer = setTimeout(() => loadCustomerActivities(true), 350)
}

function applyCustomerFollowupData(data = {}) {
  followupSummary.value = data.followup_summary || null
  const crm = data.crm || {}
  followupForm.followup_enabled = crm.followup_enabled === true
  followupForm.followup_pause_until = dateOnly(crm.followup_pause_until)
  followupForm.followup_pause_reason = crm.followup_pause_reason || ''
  followupForm.next_followup = dateOnly(crm.next_followup)
  followupForm.followup_interval_days = crm.followup_interval_days || ''
  followupForm.visit_followup_enabled = crm.visit_followup_enabled === true
  followupForm.visit_followup_pause_until = dateOnly(crm.visit_followup_pause_until)
  followupForm.visit_followup_pause_reason = crm.visit_followup_pause_reason || ''
  followupForm.next_visit_followup = dateOnly(crm.next_visit_followup)
  followupForm.visit_followup_interval_days = crm.visit_followup_interval_days || ''
}

function applyFollowupOverride(data = {}) {
  followupForm.followup_enabled = data.followup_enabled === true
  followupForm.followup_pause_until = dateOnly(data.followup_pause_until)
  followupForm.followup_pause_reason = data.followup_pause_reason || ''
  followupForm.next_followup = dateOnly(data.next_followup)
  followupForm.followup_interval_days = data.followup_interval_days || ''
  if ('visit_followup_enabled' in data) followupForm.visit_followup_enabled = data.visit_followup_enabled === true
  if ('visit_followup_pause_until' in data) followupForm.visit_followup_pause_until = dateOnly(data.visit_followup_pause_until)
  if ('visit_followup_pause_reason' in data) followupForm.visit_followup_pause_reason = data.visit_followup_pause_reason || ''
  if ('next_visit_followup' in data) followupForm.next_visit_followup = dateOnly(data.next_visit_followup)
  if ('visit_followup_interval_days' in data) followupForm.visit_followup_interval_days = data.visit_followup_interval_days || ''
  if (followupSummary.value) followupSummary.value = { ...followupSummary.value }
}

async function saveFollowupOverride(patch) {
  const code = activity.value?.ar_code
  if (!code || savingFollowup.value) return
  savingFollowup.value = true
  try {
    const { data } = await api.patch(`/customers/${encodeURIComponent(code)}/followup`, patch)
    applyFollowupOverride(data)
    showToast('success', 'บันทึกการติดตามลูกค้าแล้ว')
  } catch (e) {
    showToast('error', e.response?.data?.error || e.message)
  } finally {
    savingFollowup.value = false
  }
}

function toggleCustomerFollowup() {
  saveFollowupOverride({ followup_enabled: !followupForm.followup_enabled })
}

function pauseCustomerFollowup() {
  saveFollowupOverride({
    followup_enabled: true,
    followup_pause_until: followupForm.followup_pause_until,
    followup_pause_reason: followupForm.followup_pause_reason || null,
  })
}

function saveCustomerFollowupInterval() {
  const n = Number(followupForm.followup_interval_days || 0)
  if (!Number.isInteger(n) || n < 1 || n > 365) {
    showToast('error', 'รอบโทรรายลูกค้าต้องอยู่ระหว่าง 1-365 วัน')
    return
  }
  saveFollowupOverride({ followup_interval_days: n })
}

function useDefaultFollowupInterval() {
  saveFollowupOverride({ followup_interval_days: null })
}

function resumeCustomerFollowup() {
  saveFollowupOverride({
    followup_enabled: true,
    followup_pause_until: null,
    followup_pause_reason: null,
  })
}

function toggleCustomerVisitFollowup() {
  saveFollowupOverride({ visit_followup_enabled: !followupForm.visit_followup_enabled })
}

function pauseCustomerVisitFollowup() {
  saveFollowupOverride({
    visit_followup_enabled: true,
    visit_followup_pause_until: followupForm.visit_followup_pause_until,
    visit_followup_pause_reason: followupForm.visit_followup_pause_reason || null,
  })
}

function saveCustomerVisitInterval() {
  const n = Number(followupForm.visit_followup_interval_days || 0)
  if (!Number.isInteger(n) || n < 1 || n > 365) {
    showToast('error', 'รอบเยี่ยมรายลูกค้าต้องอยู่ระหว่าง 1-365 วัน')
    return
  }
  saveFollowupOverride({ visit_followup_interval_days: n })
}

function useDefaultVisitInterval() {
  saveFollowupOverride({ visit_followup_interval_days: null })
}

function resumeCustomerVisitFollowup() {
  saveFollowupOverride({
    visit_followup_enabled: true,
    visit_followup_pause_until: null,
    visit_followup_pause_reason: null,
  })
}

function addNewNoteFiles(files) {
  const picked = Array.from(files || []).slice(0, Math.max(0, 10 - newNoteFiles.value.length))
  picked.forEach(file => {
    const isImage = file.type?.startsWith('image/')
    newNoteFiles.value.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: isImage ? URL.createObjectURL(file) : ''
    })
  })
}

function clearNewNoteFiles() {
  newNoteFiles.value.forEach(item => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  })
  newNoteFiles.value = []
  if (noteFileInput.value) noteFileInput.value.value = ''
}

function removeNewNoteFile(idx) {
  const item = newNoteFiles.value[idx]
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
  newNoteFiles.value.splice(idx, 1)
  if (noteFileInput.value) noteFileInput.value.value = ''
}

function onNewNoteFileChange(e) {
  addNewNoteFiles(e.target.files)
  if (noteFileInput.value) noteFileInput.value.value = ''
}

function onNewNoteFileDrop(e) {
  noteFileDragging.value = false
  addNewNoteFiles(e.dataTransfer.files)
}

async function loadNotes() {
  const code = activity.value?.ar_code
  if (!code) return
  loadingNotes.value = true
  const data = await api.get('/notes', { params: { ar_code: code } })
    .then(r => r.data)
    .catch(() => [])
  notes.value = Array.isArray(data) ? data : []
  loadingNotes.value = false
}

async function addNote() {
  const code = activity.value?.ar_code
  if (!code || !canAddNote.value) return
  savingNote.value = true
  try {
    const fd = new FormData()
    fd.append('ar_code', code)
    fd.append('note_text', newNote.value)
    fd.append('is_pinned', newNotePinned.value ? 'true' : 'false')
    newNoteFiles.value.forEach(item => fd.append('files', item.file))

    const { data } = await api.post('/notes', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    notes.value.unshift(data)
    newNote.value = ''
    newNotePinned.value = false
    clearNewNoteFiles()
  } catch (e) {
    showToast('error', e.response?.data?.error || e.message)
  } finally {
    savingNote.value = false
  }
}

async function togglePin(note) {
  try {
    const { data } = await api.patch(`/notes/${note.id}/pin`)
    note.is_pinned = data.is_pinned
    notes.value.sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
  } catch (e) {
    showToast('error', e.response?.data?.error || e.message)
  }
}

async function deleteNote(note) {
  if (!window.confirm('ต้องการลบบันทึกนี้? ไม่สามารถกู้คืนได้')) return
  try {
    await api.delete(`/notes/${note.id}`)
    notes.value = notes.value.filter(n => n.id !== note.id)
  } catch (e) {
    showToast('error', e.response?.data?.error || e.message)
  }
}

function formatNoteDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function noteAttachmentUrl(att) {
  if (!att?.file_path) return '#'
  return `/uploads/${att.file_path}`
}

function noteAttachmentThumbUrl(att) {
  return att.thumb_path ? `/uploads/${att.thumb_path}` : noteAttachmentUrl(att)
}

function isNoteImage(att) {
  const mime = String(att?.mime_type || '').toLowerCase()
  const name = String(att?.filename || att?.original_name || '').toLowerCase()
  return mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
}

function openNoteAttachmentPreview(att, event) {
  event?.preventDefault()
  noteAttachmentPreview.value = att
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0)
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function phFmtAmount(v) {
  return parseFloat(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function phVatLabel(v) {
  return { 0: 'แยก VAT', 1: 'รวม VAT', 2: 'อัตราศูนย์', 4: 'ไม่กระทบ' }[parseInt(v)] || String(v)
}

async function loadCreditDetail() {
  const code = activity.value?.ar_code
  if (!code) return
  loadingCreditDetail.value = true
  const res = await api.get(`/customers/${code}/credit-detail`)
    .then(r => r.data).catch(() => null)
  creditDetail.value = res?.success ? res : null
  loadingCreditDetail.value = false
}

function creditFmt(v) {
  return parseFloat(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function creditFmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}

watch(customerActiveTab, t => {
  const code = activity.value?.ar_code
  if (!code) return
  if (t === 'delivery_history' && !deliveryTimeline.value.length) loadDeliveryHistory(1)
  if (t === 'visit_history' && !visitTimeline.value.length) loadVisitHistory(1)
  if (t === 'activities' && !customerActivities.value.length) loadCustomerActivities(true)
  if (t === 'notes' && !notes.value.length) loadNotes()
  if (t === 'purchase_history' && !purchaseHistory.value.length)  loadPurchaseHistory(1)
  if (t === 'credit_detail'   && !creditDetail.value)             loadCreditDetail()
})

// ── Formatters ────────────────────────────────────────────────
const TZ = 'Asia/Bangkok'
function fmtDate(v) {
  if (!v) return '-'
  // รองรับทั้ง DATE string "2026-05-02" และ ISO timestamp "2026-05-01T17:00:00.000Z"
  // toLocaleDateString + timeZone Bangkok แปลงกลับเป็นวันที่ไทยได้ถูกต้องทั้งสองรูปแบบ
  const d = new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00+07:00' : v)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ
  })
}
function fmtDateTime(v) {
  if (!v) return '-'
  const d = new Date(v)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${date} ${time}`
}
function fmtDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60
  return m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`
}

function dateOnly(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw.split('T')[0] || ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

function formatActDate(d) {
  if (!d) return ''
  const only = dateOnly(d)
  if (only) {
    const [year, month, day] = only.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  }
  return ''
}

function formatActDateTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function actTypeLabel(t) {
  if (t === 'task') return 'งาน'
  if (t === 'call') return 'โทร'
  if (t === 'transfer') return 'โอนเงิน'
  if (t === 'visit') return 'เยี่ยมลูกค้า'
  return 'นัดประชุม'
}

function actTypeIcon(t) {
  return typeIcon(t) || ''
}

function actStatusBadge(status, a) {
  if (status === 'deleted') return { label: 'ถูกลบ', cls: 'bg-slate-100 text-slate-500' }
  if (status === 'done') return { label: 'ปิดแล้ว', cls: 'bg-green-100 text-green-700' }
  if (status === 'cancelled') return { label: 'ยกเลิก', cls: 'bg-slate-100 text-slate-500' }
  const dueStr = a.due_date || a.start_datetime
  if (dueStr && new Date(dueStr) < new Date(new Date().toDateString())) {
    return { label: 'เลยกำหนด', cls: 'bg-red-100 text-red-700' }
  }
  return { label: 'ค้างอยู่', cls: 'bg-blue-100 text-blue-700' }
}

function actOverdueDays(a) {
  if (a.status === 'done' || a.status === 'deleted' || a.status === 'cancelled') return 0
  const dueStr = a.due_date || a.start_datetime
  if (!dueStr) return 0
  const diff = Math.floor((new Date(new Date().toDateString()) - new Date(new Date(dueStr).toDateString())) / 86400000)
  return diff > 0 ? diff : 0
}

// ── Labels ────────────────────────────────────────────────────
function retrySkippedMessage(retry) {
  const reason = retry?.reason
  if (reason === 'skip_today') return 'บันทึกแล้ว: ข้ามการโทรซ้ำวันนี้'
  if (reason === 'max_attempts') return `บันทึกแล้ว: โทรครบ ${retry.max_attempts || ''} ครั้งวันนี้`
  if (reason === 'already_exists') return 'บันทึกแล้ว: มีงานโทรซ้ำเปิดอยู่แล้ว'
  if (reason === 'customer_disabled') return 'บันทึกแล้ว: ลูกค้ารายนี้ปิด follow-up อยู่'
  if (reason === 'customer_paused') return 'บันทึกแล้ว: ลูกค้ารายนี้พัก follow-up อยู่'
  return 'บันทึกแล้ว: ไม่ได้สร้างงานโทรซ้ำ'
}

function typeLabel(t) { return { task: 'งาน', call: 'โทรศัพท์', meeting: 'ประชุม', transfer: 'โอนเงิน', visit: 'เยี่ยมลูกค้า' }[t] || t }
function typeIcon(t)  { return { task: '✅', call: '📞', meeting: '👥', transfer: '💸', visit: '🤝' }[t] || '' }
function typeClass(t) {
  return {
    task:     'bg-blue-50 border-blue-200 text-blue-700',
    call:     'bg-orange-50 border-orange-200 text-orange-700',
    meeting:  'bg-purple-50 border-purple-200 text-purple-700',
    transfer: 'bg-green-50 border-green-200 text-green-700',
    visit:    'bg-teal-50 border-teal-200 text-teal-700',
  }[t] || 'bg-slate-50 border-slate-200 text-slate-600'
}

function statusLabel(s) { return { open: 'เปิด', done: 'เสร็จแล้ว', snoozed: 'เลื่อน', cancelled: 'ยกเลิก' }[s] || s }
function statusClass(s) {
  return {
    open:      'bg-blue-100 text-blue-700',
    done:      'bg-green-100 text-green-700',
    snoozed:   'bg-amber-100 text-amber-700',
    cancelled: 'bg-slate-100 text-slate-500',
  }[s] || 'bg-slate-100 text-slate-500'
}

function priorityLabel(p) { return { low: 'ต่ำ', normal: 'ปกติ', high: 'สูง' }[p] || p }
function priorityClass(p) {
  return {
    low:    'bg-slate-50 border-slate-200 text-slate-500',
    normal: 'bg-slate-50 border-slate-200 text-slate-600',
    high:   'bg-red-50 border-red-200 text-red-600',
  }[p] || 'bg-slate-50 border-slate-200 text-slate-500'
}

function callResultLabel(r) {
  return {
    answered:       '✅ รับสาย',
    no_answer:      '📵 ไม่รับ',
    busy:           '🔴 สายไม่ว่าง',
    left_voicemail: '📨 ฝากข้อความ',
  }[r] || r
}
</script>

<style scoped>
.modal-fade-enter-active { transition: opacity 0.2s ease; }
.modal-fade-leave-active { transition: opacity 0.15s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to    { opacity: 0; }
</style>
