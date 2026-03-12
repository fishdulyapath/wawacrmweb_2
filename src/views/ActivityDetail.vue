<template>
  <div class="p-6 max-w-2xl mx-auto">

    <!-- Close Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="closeModal.show" class="fixed inset-0 z-50 flex items-end lg:items-center justify-center px-0 lg:px-4">
          <div class="absolute inset-0 bg-black/50"></div>
          <div class="relative bg-white w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">

            <!-- Handle (mobile) -->
            <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 lg:hidden"></div>

            <!-- Header -->
            <div class="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                   :class="activity?.activity_type === 'call' ? 'bg-orange-50' : activity?.activity_type === 'meeting' ? 'bg-purple-50' : 'bg-blue-50'">
                {{ typeIcon(activity?.activity_type) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-slate-800 text-sm truncate">{{ activity?.subject }}</p>
                <p class="text-xs text-slate-400">ปิดงาน — บันทึกผลลัพธ์</p>
              </div>
              <button @click="closeModal.show = false" class="text-slate-300 hover:text-slate-500 p-1">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Body -->
            <div class="overflow-y-auto px-5 py-4 space-y-4 flex-1">

              <!-- CALL fields -->
              <template v-if="activity?.activity_type === 'call'">
                <div>
                  <label class="text-xs font-medium text-slate-500 mb-1 block">📞 เบอร์โทร</label>
                  <div v-if="closeModal.phones.length" class="space-y-1.5 mb-2">
                    <div v-for="ct in closeModal.phones" :key="ct.name" class="flex flex-wrap items-center gap-1.5">
                      <span class="text-xs text-slate-500 w-full">{{ ct.name }}</span>
                      <button v-for="ph in ct.phones" :key="ph"
                        @click="closeModal.form.call_phone = ph"
                        :class="closeModal.form.call_phone === ph
                          ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
                        class="px-3 py-1.5 border rounded-lg text-sm font-mono transition-colors">
                        📞 {{ ph }}
                      </button>
                    </div>
                  </div>
                  <input v-model="closeModal.form.call_phone" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="0812345678" type="tel" />
                </div>

                <div>
                  <label class="text-xs font-medium text-slate-500 mb-1 block">📊 ผลการโทร</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button v-for="s in callStatuses" :key="s.key"
                      @click="closeModal.form.call_result = s.key"
                      :class="closeModal.form.call_result === s.key
                        ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                      class="py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2">
                      <span>{{ s.icon }}</span><span>{{ s.label }}</span>
                    </button>
                  </div>
                </div>

                <div v-if="closeModal.form.call_result === 'answered' || closeModal.form.duration_sec > 0">
                  <label class="text-xs font-medium text-slate-500 mb-1 block">
                    ⏱ ระยะเวลา
                    <span v-if="closeModal.form.duration_sec > 0" class="ml-1 text-blue-600 font-semibold">
                      ({{ Math.floor(closeModal.form.duration_sec/60) }}:{{ String(closeModal.form.duration_sec%60).padStart(2,'0') }})
                    </span>
                  </label>
                  <div class="flex gap-2 flex-wrap mb-2">
                    <button v-for="d in [1,3,5,10,15,30]" :key="d"
                      @click="closeModal.form.duration_sec = d * 60"
                      :class="closeModal.form.duration_sec === d * 60 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                      class="w-11 h-10 rounded-lg border text-sm font-semibold transition-colors">
                      {{ d }}
                    </button>
                  </div>
                  <input :value="closeModal.form.duration_sec"
                         @input="closeModal.form.duration_sec = parseInt($event.target.value) || 0"
                         type="number" min="0"
                         class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" placeholder="กรอกจำนวนวินาที" />
                </div>

                <!-- CDR Picker -->
                <div class="border border-slate-200 rounded-xl overflow-hidden">
                  <div class="px-3 py-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
                    <p class="text-xs font-semibold text-slate-600">📋 แนบประวัติการโทร</p>
                    <div class="flex gap-2">
                      <div class="flex-1">
                        <p class="text-[10px] text-slate-400 mb-0.5">จากวันที่</p>
                        <input v-model="closeModal.cdrSearch.date_from" type="date"
                          class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      </div>
                      <div class="flex-1">
                        <p class="text-[10px] text-slate-400 mb-0.5">ถึงวันที่</p>
                        <input v-model="closeModal.cdrSearch.date_to" type="date"
                          class="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <input v-model="closeModal.cdrSearch.phone" type="tel" placeholder="เบอร์โทร (ว่างไว้ = ทั้งหมด)"
                        @keydown.enter.prevent="loadCdr"
                        class="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                      <button @click="loadCdr" :disabled="closeModal.cdrLoading"
                        class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 shrink-0">
                        <svg v-if="closeModal.cdrLoading" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        <span>{{ closeModal.cdrLoading ? '...' : '🔍 ค้นหา' }}</span>
                      </button>
                    </div>
                  </div>
                  <div v-if="closeModal.cdrError" class="px-3 py-2 text-xs text-slate-400 text-center">{{ closeModal.cdrError }}</div>
                  <div v-if="closeModal.selectedCdr" class="px-3 py-2 bg-green-50 border-b border-green-100 flex items-start gap-2">
                    <span class="text-green-500 text-sm mt-0.5">✓</span>
                    <div class="flex-1 text-xs">
                      <p class="font-semibold text-green-700">เลือกแล้ว: {{ closeModal.selectedCdr.destination_number }}</p>
                      <p class="text-slate-500">{{ closeModal.selectedCdr.start_stamp }} · {{ closeModal.selectedCdr.call_result }}
                        <template v-if="closeModal.selectedCdr.duration > 0"> · {{ Math.floor(closeModal.selectedCdr.duration/60) }}:{{ String(closeModal.selectedCdr.duration%60).padStart(2,'0') }} นาที</template>
                      </p>
                      <a v-if="closeModal.selectedCdr.recording" :href="closeModal.selectedCdr.recording" target="_blank"
                        class="text-blue-600 hover:underline">🎙 ฟังการโทร</a>
                    </div>
                    <button @click="closeModal.selectedCdr=null;closeModal.form.cdr_uuid=''" class="text-slate-300 hover:text-slate-500 text-xs">✕</button>
                  </div>
                  <div v-if="closeModal.cdrList.length" class="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    <button v-for="r in closeModal.cdrList" :key="r.xml_cdr_uuid"
                      @click="selectCdr(r)"
                      :class="closeModal.selectedCdr?.xml_cdr_uuid === r.xml_cdr_uuid ? 'bg-blue-50' : 'hover:bg-slate-50'"
                      class="w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors">
                      <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5"
                        :class="r.call_result==='Answered' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'">
                        {{ r.call_result === 'Answered' ? '✅' : '📵' }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-sm font-mono font-semibold text-slate-700">{{ r.destination_number }}</span>
                          <span class="text-xs text-slate-400">{{ r.caller_id_name }}</span>
                          <span v-if="r.duration > 0" class="text-xs text-green-600 font-medium">
                            {{ Math.floor(r.duration/60) }}:{{ String(r.duration%60).padStart(2,'0') }} นาที
                          </span>
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-xs text-slate-400">{{ r.start_stamp }}</span>
                          <a v-if="r.recording" :href="r.recording" target="_blank" @click.stop
                            class="text-xs text-blue-600 hover:underline">🎙 ฟัง</a>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </template>

              <!-- MEETING fields -->
              <template v-if="activity?.activity_type === 'meeting'">
                <div>
                  <label class="text-xs font-medium text-slate-500 mb-1 block">📊 ผลการประชุม</label>
                  <div class="grid grid-cols-3 gap-2">
                    <button v-for="s in meetingStatuses" :key="s.key"
                      @click="closeModal.form.meeting_result = s.key"
                      :class="closeModal.form.meeting_result === s.key
                        ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                      class="py-2.5 px-2 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-1">
                      <span class="text-base">{{ s.icon }}</span>
                      <span class="text-xs">{{ s.label }}</span>
                    </button>
                  </div>
                </div>
              </template>

              <!-- Outcome (ทุก type) -->
              <div>
                <label class="text-xs font-medium text-slate-500 mb-1 block">📝 ผลลัพธ์ / สิ่งที่ทำ</label>
                <textarea v-model="closeModal.form.outcome"
                  class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none min-h-[80px]" rows="3"
                  :placeholder="activity?.activity_type === 'call'
                    ? 'เช่น ลูกค้าสนใจ นัดส่งใบเสนอราคาวันพุธ...'
                    : activity?.activity_type === 'meeting'
                      ? 'เช่น ตกลงราคาแล้ว รอลูกค้าอนุมัติ...'
                      : 'เช่น ดำเนินการเสร็จแล้ว...'">
                </textarea>
              </div>
            </div>

            <!-- ไฟล์แนบ -->
            <div class="px-5 pb-3">
              <label class="text-xs font-medium text-slate-500 mb-2 block">📎 ไฟล์แนบ</label>
              <ActivityAttachments :activity-id="activityId" />
            </div>

            <!-- Footer -->
            <div class="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button @click="closeModal.show = false"
                class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                ยกเลิก
              </button>
              <button @click="confirmClose" :disabled="saving"
                class="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                ✓ ยืนยันปิดงาน
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
      <!-- ปุ่มปิดงาน (ถ้ายังไม่เสร็จ) -->
      <button v-if="activity && (activity.my_status || activity.status) === 'open'" @click="openCloseModal"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
        ✓ ปิดงาน
      </button>
      <span v-else-if="activity && (activity.my_status || activity.status) === 'done'"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-sm font-medium">
        ✓ เสร็จแล้ว
      </span>
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
      </div>

      <!-- Main card -->
      <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">

        <!-- Subject + Description -->
        <div class="px-5 py-4">
          <p class="text-lg font-bold text-slate-800">{{ activity.subject }}</p>
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
            <!-- ผู้ติดต่อ -->
            <div v-if="contactors.length" class="mt-2 space-y-2">
              <p class="text-xs text-slate-400 font-medium">ผู้ติดต่อ</p>
              <div v-for="ct in contactors" :key="ct.name" class="text-xs">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-slate-700">{{ ct.name }}</span>
                  <span v-if="ct.work_title" class="text-slate-400">{{ ct.work_title }}</span>
                </div>
                <div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  <a v-for="ph in ct.phones" :key="ph" :href="`tel:${ph}`"
                    class="text-blue-600 hover:underline font-mono">📞 {{ ph }}</a>
                  <span v-if="ct.email" class="text-slate-400">✉ {{ ct.email }}</span>
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
            <template v-if="activity.activity_type === 'task'">
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
                  <a :href="`tel:${activity.call_phone}`" class="text-sm text-blue-600 font-medium hover:underline">{{ activity.call_phone }}</a>
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
          <span v-if="activity.updated_at && activity.updated_at !== activity.created_at">
            แก้ไข: {{ fmtDateTime(activity.updated_at) }}
          </span>
        </div>
      </div>

      <!-- Attachments -->
      <div class="mt-4 bg-white rounded-xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">ไฟล์แนบ</h3>
        <ActivityAttachments :activity-id="activityId" :readonly="true" />
      </div>
    </template>

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
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import api from '../composables/useApi.js'
import ActivityAttachments from '../components/ActivityAttachments.vue'
import { usePermissions } from '../composables/usePermissions.js'

const { canEdit } = usePermissions()

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

// ── Close modal ──────────────────────────────────────────────
const closeModal = reactive({
  show: false,
  phones: [],
  form: { outcome: '', call_phone: '', call_result: '', call_direction: 'outbound', duration_sec: 0, meeting_result: '',
          cdr_uuid: '', cdr_recording_url: '', cdr_start_stamp: '', cdr_end_stamp: '' },
  cdrSearch: { phone: '', date_from: '', date_to: '' },
  cdrList: [], cdrLoading: false, cdrError: '', selectedCdr: null,
})
const callStatuses = [
  { key: 'answered',       label: 'ติดต่อได้',   icon: '✅' },
  { key: 'no_answer',      label: 'ไม่รับสาย',    icon: '📵' },
  { key: 'busy',           label: 'สายไม่ว่าง',  icon: '🔴' },
  { key: 'left_voicemail', label: 'ฝากข้อความ',  icon: '📨' },
]
const meetingStatuses = [
  { key: 'completed', label: 'เสร็จสิ้น', icon: '✅' },
  { key: 'postponed', label: 'เลื่อน',    icon: '📅' },
  { key: 'cancelled', label: 'ยกเลิก',    icon: '❌' },
]

async function openCloseModal() {
  closeModal.phones   = []
  closeModal.cdrList  = []; closeModal.cdrError = ''; closeModal.selectedCdr = null
  closeModal.form.outcome           = ''
  closeModal.form.call_phone        = ''
  closeModal.form.call_result       = ''
  closeModal.form.call_direction    = 'outbound'
  closeModal.form.duration_sec      = 0
  closeModal.form.meeting_result    = ''
  closeModal.form.cdr_uuid          = ''
  closeModal.form.cdr_recording_url = ''
  closeModal.form.cdr_start_stamp   = ''
  closeModal.form.cdr_end_stamp     = ''

  // init cdrSearch defaults
  const fmt = d => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
  const base = activity.value?.start_datetime ? new Date(activity.value.start_datetime) : new Date()
  closeModal.cdrSearch.date_from = fmt(base)
  closeModal.cdrSearch.date_to   = fmt(base)
  closeModal.cdrSearch.phone     = ''

  if (activity.value?.activity_type === 'call' && activity.value?.ar_code) {
    try {
      const { data: cust } = await api.get(`/customers/${activity.value.ar_code}`)
      const grouped = (cust.contactors || []).map(ct => ({
        name:   ct.name || '',
        phones: (ct.telephone || '').split(',').map(p => p.trim()).filter(Boolean),
      })).filter(ct => ct.phones.length)
      closeModal.phones = grouped
      if (grouped.length) {
        closeModal.form.call_phone = grouped[0].phones[0]
        closeModal.cdrSearch.phone = grouped[0].phones[0]
      }
    } catch {}
  }

  closeModal.show = true
}

async function loadCdr() {
  closeModal.cdrLoading = true; closeModal.cdrError = ''; closeModal.cdrList = []
  try {
    const params = {
      date_from: closeModal.cdrSearch.date_from,
      date_to:   closeModal.cdrSearch.date_to,
      direction: closeModal.form.call_direction,
    }
    if (closeModal.cdrSearch.phone.trim()) params.phone = closeModal.cdrSearch.phone.trim()
    const { data } = await api.get('/cdr', { params })
    closeModal.cdrList = data
    if (!data.length) closeModal.cdrError = 'ไม่พบประวัติการโทร'
  } catch {
    closeModal.cdrError = 'โหลดประวัติโทรไม่สำเร็จ'
  } finally {
    closeModal.cdrLoading = false
  }
}

function selectCdr(r) {
  closeModal.selectedCdr = r
  const resultMap = { 'Answered': 'answered', 'No Answer': 'no_answer', 'Busy': 'busy', 'Cancelled': 'no_answer', 'Voicemail': 'left_voicemail' }
  closeModal.form.call_result       = resultMap[r.call_result] || 'answered'
  closeModal.form.call_phone        = r.destination_number || closeModal.form.call_phone
  closeModal.form.call_direction    = r.direction === 'inbound' ? 'inbound' : 'outbound'
  closeModal.form.duration_sec      = parseInt(r.duration || 0)
  closeModal.form.cdr_uuid          = r.xml_cdr_uuid || ''
  closeModal.form.cdr_recording_url = r.recording || ''
  closeModal.form.cdr_start_stamp   = r.start_stamp ? r.start_stamp.replace(' ', 'T') + '+07:00' : ''
  closeModal.form.cdr_end_stamp     = r.end_stamp   ? r.end_stamp.replace(' ', 'T')   + '+07:00' : ''
}

async function confirmClose() {
  if (saving.value) return
  saving.value = true
  try {
    const payload = { outcome: closeModal.form.outcome || undefined }
    if (activity.value.activity_type === 'call') {
      if (closeModal.form.call_phone)  payload.call_phone  = closeModal.form.call_phone
      if (closeModal.form.call_result) payload.call_result = closeModal.form.call_result
      payload.call_direction = closeModal.form.call_direction
      if (closeModal.form.duration_sec > 0) payload.duration_sec = closeModal.form.duration_sec
      if (closeModal.form.cdr_uuid)          payload.cdr_uuid          = closeModal.form.cdr_uuid
      if (closeModal.form.cdr_recording_url) payload.cdr_recording_url = closeModal.form.cdr_recording_url
      if (closeModal.form.cdr_start_stamp)   payload.cdr_start_stamp   = closeModal.form.cdr_start_stamp
      if (closeModal.form.cdr_end_stamp)     payload.cdr_end_stamp     = closeModal.form.cdr_end_stamp
    }
    if (activity.value.activity_type === 'meeting' && closeModal.form.meeting_result) {
      const label = meetingStatuses.find(s => s.key === closeModal.form.meeting_result)?.label || ''
      payload.outcome = (closeModal.form.outcome ? closeModal.form.outcome + '\n' : '') + `ผลการประชุม: ${label}`
    }
    await api.patch(`/activities/${activityId.value}/done`, payload)
    closeModal.show = false
    activity.value = { ...activity.value, status: 'done', my_status: 'done' }
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'เกิดข้อผิดพลาด'
    showToast('error', msg)
    console.error('[confirmClose]', err)
  } finally {
    saving.value = false
  }
}
const activity   = ref(null)
const contactors = ref([])  // [{name, phones:[{number,name}]}]

onMounted(async () => {
  try {
    const { data } = await api.get(`/activities/${activityId.value}`)
    activity.value = data
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
      } catch {}
    }
  } catch (e) {
    errorMsg.value = e.message || 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

// ── Formatters ────────────────────────────────────────────────
const TZ = 'Asia/Bangkok'
function fmtDate(v) {
  if (!v) return '-'
  const d = new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00+07:00' : v)
  const [day, month, year] = [
    d.toLocaleDateString('en-GB', { day: '2-digit', timeZone: TZ }),
    d.toLocaleDateString('en-GB', { month: '2-digit', timeZone: TZ }),
    d.toLocaleDateString('en-GB', { year: 'numeric', timeZone: TZ }),
  ]
  return `${day}/${month}/${year}`
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

// ── Labels ────────────────────────────────────────────────────
function typeLabel(t) { return { task: 'งาน', call: 'โทรศัพท์', meeting: 'ประชุม' }[t] || t }
function typeIcon(t)  { return { task: '✅', call: '📞', meeting: '👥' }[t] || '' }
function typeClass(t) {
  return {
    task:    'bg-blue-50 border-blue-200 text-blue-700',
    call:    'bg-orange-50 border-orange-200 text-orange-700',
    meeting: 'bg-purple-50 border-purple-200 text-purple-700',
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
