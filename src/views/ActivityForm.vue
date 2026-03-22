<template>
  <div class="p-6 max-w-2xl mx-auto">

    <!-- ── Custom Confirm Dialog ── -->
    <Transition name="dialog-fade">
      <div v-if="confirmDialog.show"
        class="fixed inset-0 z-50 flex items-center justify-center px-4">
        <!-- backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="confirmDialog.reject()"></div>
        <!-- panel -->
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center gap-4">
          <!-- icon -->
          <div class="w-14 h-14 rounded-full flex items-center justify-center"
            :class="confirmDialog.iconBg">
            <svg class="w-7 h-7" :class="confirmDialog.iconColor" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="confirmDialog.iconPath"/>
            </svg>
          </div>
          <div>
            <p class="font-semibold text-slate-800 text-base">{{ confirmDialog.title }}</p>
            <p v-if="confirmDialog.message" class="text-sm text-slate-500 mt-1">{{ confirmDialog.message }}</p>
          </div>
          <div class="flex gap-3 w-full mt-1">
            <button type="button" @click="confirmDialog.reject()"
              class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button type="button" @click="confirmDialog.resolve()"
              class="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
              :class="confirmDialog.confirmClass">
              {{ confirmDialog.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="goBack" class="text-slate-400 hover:text-slate-600">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <div>
        <h1 class="text-xl font-bold text-slate-800">{{ isEdit ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรม' }}</h1>
        <p class="text-sm text-slate-500">{{ isEdit ? `ID: ${activityId}` : 'สร้างกิจกรรมใหม่' }}</p>
      </div>
    </div>

    <!-- Banner: งานปิดแล้ว -->
    <div v-if="isEdit && form.status === 'done'"
      class="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
      <span class="text-green-600 text-lg">✅</span>
      <div class="flex-1">
        <p class="text-sm font-semibold text-green-800">งานนี้ปิดแล้ว</p>
        <p class="text-xs text-green-600">แก้ไขรายละเอียดหรือผลลัพธ์ได้ หรือเปลี่ยนสถานะกลับเป็น "เปิด"</p>
      </div>
    </div>
    <div v-if="isEdit && form.status === 'cancelled'"
      class="mb-4 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
      <span class="text-slate-400 text-lg">🚫</span>
      <div class="flex-1">
        <p class="text-sm font-semibold text-slate-600">งานนี้ถูกยกเลิก</p>
        <p class="text-xs text-slate-400">เปลี่ยนสถานะกลับเป็น "เปิด" เพื่อดำเนินการต่อ</p>
      </div>
    </div>

    <!-- Banner: Group Activity -->
    <div v-if="isEdit && groupMembers.length > 1"
      class="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
      <p class="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
        <span>👥</span> งานนี้เป็นส่วนหนึ่งของกลุ่ม — {{ groupMembers.length }} ลูกค้า
      </p>
      <!-- รายชื่อลูกค้าในกลุ่ม -->
      <div class="flex flex-wrap gap-2 mb-3">
        <!-- ถูกทำเครื่องหมายลบ -->
        <div v-for="m in groupMembers.filter(m => removedIds.includes(m.id))" :key="`rm-${m.id}`"
          class="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1 text-xs opacity-60 line-through">
          <span class="font-mono text-red-500">{{ m.ar_code }}</span>
          <span class="text-red-400">{{ m.customer_name }}</span>
          <button type="button" @click="cancelRemoveFromGroup(m.id)"
            class="text-red-400 hover:text-red-600 ml-1 no-underline" title="ยกเลิกการลบ">↩</button>
        </div>
        <!-- activity ปัจจุบัน -->
        <div v-for="m in groupMembers.filter(m => !removedIds.includes(m.id) && m.id === currentActivityId)" :key="`cur-${m.id}`"
          class="flex items-center gap-1 bg-blue-100 border border-blue-300 rounded-lg px-2 py-1 text-xs font-semibold">
          <span class="font-mono text-blue-700">{{ m.ar_code }}</span>
          <span class="text-blue-600">{{ m.customer_name }}</span>
          <span class="text-blue-400 text-[10px]">(งานนี้)</span>
        </div>
        <!-- ลูกค้าอื่นในกลุ่ม -->
        <div v-for="m in groupMembers.filter(m => !removedIds.includes(m.id) && m.id !== currentActivityId)" :key="`other-${m.id}`"
          class="flex items-center gap-1 bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs">
          <span class="font-mono text-blue-700">{{ m.ar_code }}</span>
          <span class="text-slate-600">{{ m.customer_name }}</span>
          <button type="button" @click="removeFromGroup(m.id)"
            class="text-red-300 hover:text-red-500 ml-1" title="ลบออกจากกลุ่ม">✕</button>
        </div>
        <!-- ลูกค้าใหม่ที่เพิ่มเข้า (pending) -->
        <div v-for="c in addedGroupCusts" :key="c.code"
          class="flex items-center gap-1 bg-green-50 border border-green-300 rounded-lg px-2 py-1 text-xs">
          <span class="text-green-600">+</span>
          <span class="font-mono text-green-700">{{ c.code }}</span>
          <span class="text-green-600">{{ c.name_1 }}</span>
          <button type="button" @click="cancelAddGroupCust(c.code)"
            class="text-green-400 hover:text-red-500 ml-1">✕</button>
        </div>
      </div>
      <!-- เพิ่มลูกค้าใหม่เข้ากลุ่ม (ใช้ customer search) -->
      <div class="relative">
        <input
          v-model="groupCustSearch"
          @input="onGroupCustInput"
          @focus="groupCustOpen = true"
          @blur="() => setTimeout(() => { groupCustOpen = false }, 300)"
          placeholder="+ เพิ่มลูกค้าเข้ากลุ่ม (พิมพ์ชื่อหรือรหัส)"
          class="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
        <div v-if="groupCustOpen && groupCustResults.length"
          class="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          <button v-for="c in groupCustResults" :key="c.code" type="button"
            @click="addToGroup(c)"
            class="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
            <span class="font-mono text-xs text-slate-400 w-20 shrink-0">{{ c.code }}</span>
            <span class="text-slate-700">{{ c.name_1 }}</span>
          </button>
        </div>
      </div>
      <p v-if="removedIds.length || addedGroupCusts.length"
        class="text-xs text-amber-600 mt-2 flex items-center gap-1">
        ⚠ การเปลี่ยนแปลงกลุ่มจะมีผลเมื่อกดบันทึก
      </p>
    </div>

    <form @submit.prevent="save" @keydown.enter.prevent class="bg-white rounded-xl border border-slate-200 p-6 space-y-5">

      <!-- ประเภท -->
      <div class="grid grid-cols-3 gap-2">
        <button v-for="t in typeOptions" :key="t.value" type="button"
          @click="form.activity_type = t.value"
          :class="form.activity_type === t.value
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-slate-200 text-slate-500 hover:border-slate-300'"
          class="py-3 rounded-xl border-2 text-sm font-medium transition-colors text-center">
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <!-- หัวข้อ -->
      <div>
        <label class="label">หัวข้อ <span class="text-red-500">*</span></label>
        <input v-model="form.subject" class="input" placeholder="เช่น โทรติดตามใบเสนอราคา" required />
      </div>

      <!-- รายละเอียด -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="label mb-0">รายละเอียด</label>
          <button v-if="speechSupported" type="button"
            @click="toggleSpeech('description')"
            :class="speechTarget === 'description' && isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-blue-500'"
            class="flex items-center gap-1 text-xs transition-colors"
            :title="isListening && speechTarget === 'description' ? 'หยุดฟัง' : 'พูดเพื่อบันทึก'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            {{ isListening && speechTarget === 'description' ? 'กำลังฟัง...' : '🎤' }}
          </button>
        </div>
        <textarea v-model="form.description" class="input min-h-[80px]" rows="3"></textarea>
        <p v-if="speechError && speechTarget === 'description'" class="text-xs text-red-500 mt-1">{{ speechError }}</p>
      </div>

      <!-- ── ลูกค้า ─── -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="label mb-0">ลูกค้า</label>
          <span v-if="!isEdit" class="text-xs text-slate-400">เพิ่มได้หลายรายการ</span>
        </div>

        <!-- Selected customers tags -->
        <div v-if="selectedCustomers.length" class="flex flex-wrap gap-2 mb-2">
          <div v-for="c in selectedCustomers" :key="c.code"
            class="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-2.5 py-1 rounded-lg">
            <span>{{ c.name_1 }}</span>
            <span class="text-xs text-blue-400">{{ c.code }}</span>
            <!-- ลบได้เสมอ (edit = เปลี่ยนลูกค้า, create = ลบออกจาก list) -->
            <button type="button" @click="removeCust(c.code)"
              class="text-blue-300 hover:text-blue-600 ml-1 leading-none">✕</button>
          </div>
        </div>

        <!-- Search input: edit mode ซ่อนถ้ามีลูกค้าแล้ว (เลือกได้แค่ 1 คน) -->
        <div v-if="!isEdit || selectedCustomers.length === 0" class="relative">
          <input
            ref="custInputRef"
            v-model="custSearch"
            @input="onCustInput"
            @focus="custOpen = true"
            @blur="custBlur"
            class="input"
            :placeholder="isEdit ? 'พิมพ์ชื่อหรือรหัสลูกค้า...' : (selectedCustomers.length ? 'เพิ่มลูกค้าอีก...' : 'พิมพ์ชื่อหรือรหัสลูกค้า...')"
            autocomplete="off"
          />
          <div v-if="custOpen && custResults.length"
            class="absolute z-20 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
            <button v-for="c in custResults" :key="c.code" type="button"
              @pointerdown.prevent="selectCust(c)"
              :class="isSelected(c.code) ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 active:bg-blue-50'"
              class="w-full text-left px-4 py-3 text-sm flex justify-between items-center min-h-[48px] border-b border-slate-100 last:border-0">
              <span class="font-medium">{{ c.name_1 }}</span>
              <span class="flex items-center gap-2 shrink-0 ml-2">
                <span class="text-xs text-slate-400">{{ c.code }}</span>
                <span v-if="isSelected(c.code)" class="text-blue-500">✓</span>
              </span>
            </button>
          </div>
        </div>
        <p v-if="!isEdit && selectedCustomers.length === 0" class="mt-1 text-xs text-slate-400">ไม่ระบุลูกค้า หรือเลือกได้หลายรายการ</p>
      </div>

      <!-- ── ผู้รับผิดชอบ ────────────────────────── -->
      <div>
        <label class="label">ผู้รับผิดชอบ</label>

        <!-- Tags: primary + co-owners ที่เลือกแล้ว -->
        <div v-if="form.owner_id || coOwners.length" class="flex flex-wrap gap-2 mb-2">
          <!-- Primary owner -->
          <div v-if="form.owner_id"
            class="flex items-center gap-1.5 bg-blue-50 border border-blue-300 text-blue-700 text-sm px-2.5 py-1 rounded-lg">
            <span class="text-[10px] text-blue-400 font-semibold uppercase">ผู้ดูแลหลัก</span>
            <span>{{ ownerName(form.owner_id) }}</span>
            <button type="button" @click="selectOwner(null)"
              class="text-blue-300 hover:text-blue-600 ml-0.5 leading-none">✕</button>
          </div>
          <!-- Co-owners -->
          <div v-for="uid in coOwners" :key="uid"
            class="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-sm px-2.5 py-1 rounded-lg">
            <span>{{ ownerName(uid) }}</span>
            <button type="button" @click="removeCoOwner(uid)"
              class="text-slate-400 hover:text-red-500 ml-0.5 leading-none">✕</button>
          </div>
        </div>

        <!-- Search input -->
        <div class="relative">
          <input
            v-model="ownerSearch"
            @focus="ownerOpen = true"
            @blur="ownerBlur"
            @input="onOwnerInput"
            class="input"
            :placeholder="form.owner_id ? '+ เพิ่มผู้รับผิดชอบร่วม...' : (ownerAutoNote ? ownerAutoNote : 'พิมพ์ชื่อพนักงาน หรือเว้นว่างให้ใช้ผู้ดูแลลูกค้า...')"
            autocomplete="off"
          />
          <div v-if="ownerOpen && filteredOwners.length"
            class="absolute z-20 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
            <button v-if="!form.owner_id" type="button"
              @pointerdown.prevent="selectOwner(null)"
              class="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 active:bg-blue-50 text-slate-400 border-b border-slate-100 min-h-[44px]">
              — ใช้ผู้ดูแลลูกค้าอัตโนมัติ —
            </button>
            <button v-for="u in filteredOwners" :key="u.id" type="button"
              @pointerdown.prevent="addOwnerFromSearch(u)"
              :class="isOwnerSelected(u.id) ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 active:bg-blue-50'"
              class="w-full text-left px-4 py-3 text-sm flex justify-between items-center min-h-[44px] border-b border-slate-100 last:border-0">
              <span>{{ u.name }}</span>
              <span class="flex items-center gap-2 shrink-0">
                <span class="text-xs text-slate-400">{{ u.code }}</span>
                <span v-if="isOwnerSelected(u.id)" class="text-blue-500 text-xs">✓</span>
              </span>
            </button>
          </div>
        </div>
        <!-- auto-owner hint -->
        <p v-if="!form.owner_id" class="mt-1 text-xs" :class="ownerAutoNote ? 'text-blue-600' : 'text-slate-400'">
          {{ ownerAutoNote || ownerFallbackNote }}
        </p>
      </div>

      <!-- Priority / Status -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">ความสำคัญ</label>
          <select v-model="form.priority" class="input">
            <option value="low">ต่ำ</option>
            <option value="normal">ปกติ</option>
            <option value="high">สูง</option>
          </select>
        </div>
        <!-- <div>
          <label class="label">สถานะ</label>
          <select v-model="form.status" class="input">
            <option value="open">เปิด</option>
            <option value="done">เสร็จแล้ว</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div> -->
      </div>

      <!-- Outcome (แสดงเมื่อ status = done) -->
      <div v-if="form.status === 'done'">
        <div class="flex items-center justify-between mb-1">
          <label class="label mb-0">ผลลัพธ์ / สิ่งที่ทำ</label>
          <button v-if="speechSupported" type="button"
            @click="toggleSpeech('outcome')"
            :class="speechTarget === 'outcome' && isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-blue-500'"
            class="flex items-center gap-1 text-xs transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            {{ isListening && speechTarget === 'outcome' ? 'กำลังฟัง...' : '🎤' }}
          </button>
        </div>
        <textarea v-model="form.outcome" class="input min-h-[70px]" rows="2"
          placeholder="เช่น ลูกค้าสนใจ นัดส่งเอกสารวันพุธ"></textarea>
        <p v-if="speechError && speechTarget === 'outcome'" class="text-xs text-red-500 mt-1">{{ speechError }}</p>
      </div>

      <!-- ── TASK: Due Date ─────────────────────── -->
      <div v-if="form.activity_type === 'task'">
        <label class="label">วันที่ครบกำหนด <span class="text-red-500">*</span></label>
        <input v-model="form.due_date" type="date" class="input" required />
        <div class="flex gap-2 mt-2">
          <button v-for="s in dateShortcuts" :key="s.label" type="button"
            @click="setDueDate(s.days)"
            class="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- ── CALL: วันเวลาโทร ───────────────────── -->
      <div v-if="form.activity_type === 'call'">
        <label class="label">วันและเวลาโทร <span class="text-red-500">*</span></label>
        <input v-model="form.start_datetime" type="datetime-local" class="input" required />
        <div class="flex gap-2 mt-2">
          <button v-for="s in dateShortcuts" :key="s.label" type="button"
            @click="setStartDate(s.days)"
            class="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- ── MEETING ──────────────────────────────── -->
      <template v-if="form.activity_type === 'meeting'">
        <div class="flex items-center gap-2">
          <input id="all_day" type="checkbox" v-model="form.all_day"
            class="w-4 h-4 text-blue-600 border-slate-300 rounded" />
          <label for="all_day" class="text-sm text-slate-700 cursor-pointer">กิจกรรมทั้งวัน (ไม่ระบุเวลา)</label>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">{{ form.all_day ? 'วันเริ่ม' : 'วันและเวลาเริ่ม' }} <span class="text-red-500">*</span></label>
            <input v-model="form.start_datetime" :type="form.all_day ? 'date' : 'datetime-local'" class="input" required />
          </div>
          <div>
            <label class="label">{{ form.all_day ? 'วันสิ้นสุด' : 'วันและเวลาสิ้นสุด' }}</label>
            <input v-model="form.end_datetime" :type="form.all_day ? 'date' : 'datetime-local'" class="input" />
          </div>
        </div>
        <div class="flex gap-2 -mt-2">
          <button v-for="s in dateShortcuts" :key="s.label" type="button"
            @click="setStartDate(s.days)"
            class="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
            {{ s.label }}
          </button>
        </div>
        <div>
          <label class="label">สถานที่</label>
          <input v-model="form.location" class="input" placeholder="เช่น ห้องประชุม A, สำนักงานลูกค้า" />
        </div>
        <div>
          <label class="label">ลิงก์ประชุมออนไลน์</label>
          <input v-model="form.meeting_url" class="input" placeholder="https://meet.google.com/..." type="text" />
        </div>
        <div>
          <label class="label">ผู้เข้าร่วมประชุม</label>
          <div class="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
            <label v-for="u in users" :key="u.id"
              class="flex items-center gap-2.5 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" :value="u.id" v-model="form.invitees"
                class="w-4 h-4 text-blue-600 border-slate-300 rounded" />
              <span class="text-sm text-slate-700">{{ u.name }}</span>
              <span class="text-xs text-slate-400 ml-auto">{{ u.code }}</span>
            </label>
            <p v-if="!users.length" class="text-xs text-slate-400 text-center py-2">กำลังโหลด...</p>
          </div>
          <p v-if="form.invitees.length" class="mt-1 text-xs text-blue-600">เลือก {{ form.invitees.length }} คน</p>
        </div>
      </template>

      <!-- ── CALL fields: แสดงเฉพาะ edit mode และสถานะเสร็จแล้ว ──── -->
      <template v-if="form.activity_type === 'call' && isEdit && form.status === 'done'">
        <div class="border-t border-slate-100 pt-4">
          <p class="text-sm font-semibold text-slate-700 mb-3">บันทึกผลการโทร</p>

          <!-- เบอร์โทร: ดึงจาก contactors ของลูกค้า -->
          <div class="mb-4">
            <label class="label">เบอร์โทร</label>
            <div v-if="contactorPhones.length" class="space-y-2 mb-2">
              <div v-for="ct in contactorPhones" :key="ct.name" class="flex flex-wrap items-center gap-2">
                <span class="text-xs text-slate-500 w-full">{{ ct.name }}</span>
                <button v-for="ph in ct.phones" :key="ph" type="button"
                  @click="form.call_phone = ph"
                  :class="form.call_phone === ph ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
                  class="px-3 py-1.5 border rounded-lg text-sm font-mono transition-colors">
                  📞 {{ ph }}
                </button>
              </div>
            </div>
            <input v-model="form.call_phone" class="input" :placeholder="contactorPhones.length ? 'หรือพิมพ์เบอร์เอง...' : '0812345678'" type="tel" />
          </div>

          <!-- ทิศทาง + ผลการโทร -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">ทิศทาง</label>
              <select v-model="form.call_direction" class="input">
                <option value="outbound">↗ โทรออก</option>
                <option value="inbound">↙ รับสาย</option>
              </select>
            </div>
            <div>
              <label class="label">ผลการโทร</label>
              <select v-model="form.call_result" class="input">
                <option value="">— ยังไม่ระบุ —</option>
                <option value="answered">✅ รับสาย</option>
                <option value="no_answer">📵 ไม่รับ</option>
                <option value="busy">🔴 สายไม่ว่าง</option>
                <option value="left_voicemail">📨 ฝากข้อความ</option>
              </select>
            </div>
          </div>

          <!-- ระยะเวลา -->
          <div class="mt-4">
            <label class="label">ระยะเวลาการโทร</label>
            <div class="flex items-center gap-2">
              <input v-model.number="form.duration_sec" type="number" min="0" class="input"
                placeholder="วินาที เช่น 120" />
              <span v-if="form.duration_sec > 0" class="text-xs text-slate-400 whitespace-nowrap">
                = {{ Math.floor(form.duration_sec / 60) }} นาที {{ form.duration_sec % 60 }} วินาที
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Preview: กี่ activities จะถูกสร้าง -->
      <div v-if="!isEdit && selectedCustomers.length > 1"
        class="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
        จะสร้าง <strong>{{ selectedCustomers.length }} กิจกรรม</strong> — แยกกิจกรรมให้แต่ละลูกค้า
        <span v-if="!form.owner_id"> โดยใช้ผู้ดูแลลูกค้าของแต่ละราย</span>
      </div>

      <!-- Error -->
      <p v-if="errorMsg" class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{{ errorMsg }}</p>

      <!-- ไฟล์แนบ -->
      <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 class="text-sm font-semibold text-slate-700 mb-3">ไฟล์แนบ</h3>

        <!-- Edit mode: ไฟล์เดิม + zone สำหรับแนบไฟล์ใหม่ -->
        <div v-if="isEdit">
          <ActivityAttachments :activity-id="activityId" />
          <!-- แนบไฟล์เพิ่มเติม (จะ upload เมื่อกดบันทึก) -->
          <div class="mt-3">
            <div v-if="pendingFiles.length" class="mb-2 flex flex-wrap gap-2">
              <div v-for="(f, i) in pendingFiles" :key="i"
                class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
                <span class="text-base">{{ pendingFileIcon(f) }}</span>
                <p class="text-xs text-slate-700 truncate max-w-[120px]">{{ f.name }}</p>
                <button type="button" @click="removePendingFile(i)"
                  class="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
            <div
              @dragover.prevent="pendingDragging = true"
              @dragleave="pendingDragging = false"
              @drop.prevent="onPendingDrop"
              :class="pendingDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'"
              class="border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer"
              @click="pendingFileInput?.click()">
              <p class="text-sm text-slate-500">📎 คลิกหรือลากเพื่อแนบไฟล์เพิ่มเติม</p>
              <p v-if="groupMembers.length > 1" class="text-xs text-blue-500 mt-0.5">ไฟล์จะถูกแนบให้ทุก {{ groupMembers.length }} กิจกรรมในกลุ่ม</p>
            </div>
            <input ref="pendingFileInput" type="file" multiple class="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              @change="onPendingFileChange" />
          </div>
        </div>

        <!-- Create mode: pending file picker -->
        <div v-else>
          <!-- แสดงไฟล์ที่เลือกแล้ว -->
          <div v-if="pendingFiles.length" class="mb-3 flex flex-wrap gap-2">
            <div v-for="(f, i) in pendingFiles" :key="i"
              class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
              <span class="text-base">{{ pendingFileIcon(f) }}</span>
              <div class="min-w-0">
                <p class="text-xs text-slate-700 truncate max-w-[120px]">{{ f.name }}</p>
                <p class="text-[10px] text-slate-400">{{ formatFileSize(f.size) }}</p>
              </div>
              <button type="button" @click="removePendingFile(i)"
                class="p-1 text-slate-400 hover:text-red-500 rounded transition-colors ml-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <!-- Drop zone -->
          <div
            @dragover.prevent="pendingDragging = true"
            @dragleave="pendingDragging = false"
            @drop.prevent="onPendingDrop"
            :class="pendingDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'"
            class="border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer"
            @click="pendingFileInput?.click()">
            <div class="text-2xl mb-1">📎</div>
            <p class="text-sm text-slate-500">คลิกหรือลากไฟล์มาวาง</p>
            <p class="text-xs text-slate-400 mt-0.5">ไฟล์จะถูกแนบหลังบันทึก</p>
          </div>
          <input ref="pendingFileInput" type="file" multiple class="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            @change="onPendingFileChange" />
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button type="submit" :disabled="saving"
          class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          {{ saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : (selectedCustomers.length > 1 ? `เพิ่ม ${selectedCustomers.length} กิจกรรม` : 'เพิ่มกิจกรรม') }}
        </button>
        <button @click="goBack" type="button"
          class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-center">
          ยกเลิก
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../composables/useApi.js'
import { useAuthStore } from '../stores/auth.js'
import ActivityAttachments from '../components/ActivityAttachments.vue'
import { useSpeech } from '../composables/useSpeech.js'

const props = defineProps({ id: String })
const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const activityId = computed(() => props.id || route.params.id)
const isEdit     = computed(() => !!activityId.value)
const saving     = ref(false)

// ── Speech-to-Text ────────────────────────────────────────────
const { isListening, errorMsg: speechError, isSupported: speechSupported, startListening, stopListening } = useSpeech()
const speechTarget = ref('')   // 'description' | 'outcome'

function toggleSpeech(field) {
  if (isListening.value && speechTarget.value === field) {
    stopListening()
    speechTarget.value = ''
    return
  }
  speechTarget.value = field
  startListening((text) => {
    if (field === 'description') form.description = (form.description ? form.description + ' ' : '') + text
    if (field === 'outcome')     form.outcome     = (form.outcome     ? form.outcome     + ' ' : '') + text
  })
}

// ── Back navigation: กลับไปหน้าที่มา ─────────────────────────
const backUrl = computed(() => route.query.from || '/activities')
function goBack() { router.push(backUrl.value) }

// ── Pending attachments (create mode) ─────────────────────────
const pendingFiles    = ref([])
const pendingDragging = ref(false)
const pendingFileInput = ref(null)

function onPendingFileChange(e) {
  addPendingFiles(e.target.files)
  e.target.value = ''
}
function onPendingDrop(e) {
  pendingDragging.value = false
  addPendingFiles(e.dataTransfer.files)
}
function addPendingFiles(files) {
  for (const f of Array.from(files)) {
    if (f.size > 20 * 1024 * 1024) continue // skip > 20MB
    if (!pendingFiles.value.find(x => x.name === f.name && x.size === f.size)) {
      pendingFiles.value.push(f)
    }
  }
}
function removePendingFile(i) {
  pendingFiles.value.splice(i, 1)
}
function pendingFileIcon(f) {
  const t = f.type
  if (t.startsWith('image/')) return '🖼️'
  if (t.includes('pdf')) return '📄'
  if (t.includes('word') || t.includes('doc')) return '📝'
  if (t.includes('sheet') || t.includes('xls')) return '📊'
  if (t.includes('zip') || t.includes('rar')) return '🗜️'
  return '📎'
}
function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
async function uploadPendingFiles(activityIds) {
  if (!pendingFiles.value.length) return
  const fd = new FormData()
  pendingFiles.value.forEach(f => fd.append('files', f))
  await Promise.all(activityIds.map(id =>
    api.post(`/activities/${id}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).catch(err => console.error('[uploadPendingFiles] error:', err))
  ))
}
const errorMsg   = ref('')

// ── Custom confirm dialog ──────────────────────────────────────
const confirmDialog = reactive({
  show: false,
  title: '', message: '',
  confirmLabel: 'ยืนยัน', confirmClass: 'bg-blue-600 hover:bg-blue-700',
  iconBg: 'bg-blue-50', iconColor: 'text-blue-500',
  iconPath: 'M5 13l4 4L19 7',
  resolve: () => {}, reject: () => {},
})

function showConfirm({ title, message, confirmLabel = 'ยืนยัน', confirmClass = 'bg-blue-600 hover:bg-blue-700',
  iconBg = 'bg-blue-50', iconColor = 'text-blue-500', iconPath = 'M5 13l4 4L19 7' }) {
  return new Promise((resolve, reject) => {
    Object.assign(confirmDialog, { show: true, title, message, confirmLabel, confirmClass, iconBg, iconColor, iconPath,
      resolve: () => { confirmDialog.show = false; resolve(true) },
      reject:  () => { confirmDialog.show = false; reject(false) },
    })
  })
}

// ── Date shortcuts ─────────────────────────────────────────────
const dateShortcuts = [
  { label: 'วันนี้',      days: 0 },
  { label: 'พรุ่งนี้',    days: 1 },
  { label: 'สัปดาห์หน้า', days: 7 },
]

const TZ = 'Asia/Bangkok'
function toLocalDateStr(d) {
  // YYYY-MM-DD ใน timezone Bangkok (สำหรับ input type="date")
  return d.toLocaleDateString('sv-SE', { timeZone: TZ })
}
function toLocalDateTimeStr(d) {
  // YYYY-MM-DDTHH:mm ใน timezone Bangkok (สำหรับ input type="datetime-local")
  const s = d.toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T')
  return s.slice(0, 16)
}
function bkkDateSlice(v) {
  // แปลง timestamp จาก DB เป็น YYYY-MM-DD ใน Bangkok time (สำหรับ input type="date")
  if (!v) return ''
  const d = new Date(typeof v === 'string' && v.length === 10 ? v + 'T00:00:00+07:00' : v)
  return d.toLocaleDateString('sv-SE', { timeZone: TZ })
}
function bkkDateTimeSlice(v) {
  // แปลง timestamp จาก DB เป็น YYYY-MM-DDTHH:mm ใน Bangkok time (สำหรับ input type="datetime-local")
  if (!v) return ''
  const d = new Date(v)
  return d.toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T').slice(0, 16)
}

function setDueDate(days) {
  const d = new Date(); d.setDate(d.getDate() + days)
  form.due_date = toLocalDateStr(d)
}
function setStartDate(days) {
  const d = new Date(); d.setDate(d.getDate() + days)
  if (form.all_day) { form.start_datetime = toLocalDateStr(d) }
  else { d.setHours(9, 0, 0, 0); form.start_datetime = toLocalDateTimeStr(d) }
}

// ── Users (owner + invitees) ───────────────────────────────────
const users       = ref([])
const ownerSearch = ref('')
const ownerOpen   = ref(false)

// co-owners (non-primary): แยกจาก form.invitees เพื่อไม่ชนกับ meeting invitees
const coOwners = ref([])  // [userId, ...]

const filteredOwners = computed(() => {
  const q = ownerSearch.value.toLowerCase()
  const base = q
    ? users.value.filter(u =>
        u.name.toLowerCase().includes(q) || (u.code || '').toLowerCase().includes(q)
      )
    : users.value.slice(0, 20)
  return base.slice(0, 20)
})

function ownerName(id) {
  const u = users.value.find(u => u.id === id)
  return u ? u.name : `#${id}`
}

function isOwnerSelected(id) {
  return form.owner_id === id || coOwners.value.includes(id)
}

function selectOwner(u) {
  if (!u) {
    form.owner_id     = null
    ownerSearch.value = ''
    ownerOpen.value   = false
    return
  }
  // ถ้า u เป็น co-owner อยู่แล้ว ให้เลื่อนขึ้นเป็น primary
  coOwners.value = coOwners.value.filter(id => id !== u.id)
  // ถ้ามี primary เดิม ให้ลด rank เป็น co-owner
  if (form.owner_id && form.owner_id !== u.id) {
    if (!coOwners.value.includes(form.owner_id)) coOwners.value.push(form.owner_id)
  }
  form.owner_id     = u.id
  ownerSearch.value = ''
  ownerOpen.value   = false
}

function addOwnerFromSearch(u) {
  if (!form.owner_id) {
    // ยังไม่มี primary → set เป็น primary
    selectOwner(u)
    return
  }
  if (u.id === form.owner_id) {
    ownerSearch.value = ''
    ownerOpen.value   = false
    return
  }
  // เพิ่มเป็น co-owner
  if (!coOwners.value.includes(u.id)) coOwners.value.push(u.id)
  ownerSearch.value = ''
  ownerOpen.value   = false
}

function removeCoOwner(id) {
  coOwners.value = coOwners.value.filter(x => x !== id)
}

function ownerBlur() { setTimeout(() => { ownerOpen.value = false }, 300) }

function onOwnerInput() {
  if (!ownerSearch.value.trim()) {
    // ไม่ clear owner_id โดยอัตโนมัติ — ให้กด ✕ บน tag แทน
  }
}

// hint fallback เมื่อไม่เลือกลูกค้าและไม่ได้เลือก owner
const ownerFallbackNote = computed(() => {
  if (selectedCustomers.value.length > 0) return '' // ownerAutoNote จัดการแทน
  const me = users.value.find(u => u.id === auth.user?.id)
  return me ? `จะใช้ผู้สร้าง: ${me.name} (${me.code})` : 'จะใช้ผู้ที่สร้างกิจกรรม'
})

// ── Group (multi-customer activity group) ──────────────────────
const groupMembers    = ref([])   // [{id, ar_code, customer_name}] — โหลดจาก GET /:id
const removedIds      = ref([])   // activity ids ที่ user ต้องการลบออกจากกลุ่ม
const addedGroupCusts = ref([])   // [{code, name_1}] — ลูกค้าใหม่ที่จะเพิ่มเข้ากลุ่ม
const currentActivityId = computed(() => activityId.value ? parseInt(activityId.value) : null)

function removeFromGroup(id) {
  if (!removedIds.value.includes(id)) removedIds.value.push(id)
}
function cancelRemoveFromGroup(id) {
  removedIds.value = removedIds.value.filter(x => x !== id)
}
function cancelAddGroupCust(code) {
  addedGroupCusts.value = addedGroupCusts.value.filter(c => c.code !== code)
}

const groupCustSearch  = ref('')
const groupCustResults = ref([])
const groupCustOpen    = ref(false)
let groupCustTimer     = null

function onGroupCustInput() {
  clearTimeout(groupCustTimer)
  const q = groupCustSearch.value.trim()
  if (!q) { groupCustResults.value = []; return }
  groupCustTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/customers', { params: { search: q, limit: 10 } })
      const all = data.data || data.customers || []
      const existingCodes = new Set([
        ...groupMembers.value.map(m => m.ar_code),
        ...addedGroupCusts.value.map(c => c.code),
      ])
      groupCustResults.value = all.filter(c => !existingCodes.has(c.code))
    } catch { groupCustResults.value = [] }
  }, 300)
}

function addToGroup(c) {
  if (!addedGroupCusts.value.find(x => x.code === c.code)) {
    addedGroupCusts.value.push({ code: c.code, name_1: c.name_1 })
  }
  groupCustSearch.value  = ''
  groupCustResults.value = []
  groupCustOpen.value    = false
}

// ── Multi-customer ─────────────────────────────────────────────
const selectedCustomers = ref([])   // [{ code, name_1, owner_id?, owner_name? }]
const custSearch        = ref('')
const custResults       = ref([])
const custOpen          = ref(false)
const custInputRef      = ref(null)
const contactorPhones   = ref([])
let custTimer           = null

// hint เมื่อไม่ระบุ owner แต่ลูกค้ามีผู้ดูแล
const ownerAutoNote = computed(() => {
  if (form.owner_id) return ''
  if (selectedCustomers.value.length === 0) return ''
  const me = users.value.find(u => u.id === auth.user?.id)
  const fallbackName = me ? `${me.name}` : 'ผู้สร้าง'
  if (selectedCustomers.value.length === 1) {
    const c = selectedCustomers.value[0]
    return c.owner_name
      ? `จะใช้ผู้ดูแล: ${c.owner_name}`
      : `ไม่มีผู้ดูแลลูกค้า — จะใช้ผู้สร้าง: ${fallbackName}`
  }
  const total = selectedCustomers.value.length
  const withOwner = selectedCustomers.value.filter(c => c.owner_name).length
  const noOwner   = total - withOwner
  if (withOwner === total) return `จะใช้ผู้ดูแลลูกค้าของแต่ละราย (${total} ราย)`
  if (withOwner === 0)     return `ไม่มีผู้ดูแลลูกค้า — จะใช้ผู้สร้าง: ${fallbackName} (${total} ราย)`
  return `${withOwner} ราย ใช้ผู้ดูแลลูกค้า, ${noOwner} ราย ใช้ผู้สร้าง: ${fallbackName}`
})

function isSelected(code) { return selectedCustomers.value.some(c => c.code === code) }

function onCustInput() {
  clearTimeout(custTimer)
  const q = custSearch.value.trim()
  if (!q) { custResults.value = []; return }
  custTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/customers', { params: { search: q, limit: 10 } })
      custResults.value = data.data || data.customers || []
    } catch { custResults.value = [] }
  }, 300)
}

async function selectCust(c) {
  if (isSelected(c.code)) { removeCust(c.code); return }

  // ใช้ owner จาก list result เป็น initial value (มีอยู่แล้วใน search response)
  const entry = {
    code: c.code,
    name_1: c.name_1,
    owner_id:   c.crm?.owner_user_id || null,
    owner_name: c.crm?.owner_name    || null,
  }
  try {
    const { data } = await api.get(`/customers/${c.code}`)
    // override ด้วยข้อมูลล่าสุดจาก detail (อาจใหม่กว่า list cache)
    if (data.crm?.owner_user_id) {
      entry.owner_id   = data.crm.owner_user_id
      entry.owner_name = data.crm.owner_name
    }
    // phones สำหรับ call — grouped by contactor
    contactorPhones.value = (data.contactors || []).map(ct => ({
      name:   ct.name || '',
      phones: (ct.telephone || '').split(',').map(p => p.trim()).filter(Boolean),
    })).filter(ct => ct.phones.length)
  } catch {}

  // edit mode = แทนที่ลูกค้าเดิม, create mode = เพิ่มเข้า list
  if (isEdit.value) selectedCustomers.value = [entry]
  else selectedCustomers.value.push(entry)

  // ล้าง search แต่คง dropdown เปิดไว้ (create mode) เพื่อให้พิมพ์ต่อได้ทันที
  if (!isEdit.value) {
    custSearch.value  = ''
    custResults.value = []
    custOpen.value    = true
    custKeepOpen      = true
    await nextTick()
    custInputRef.value?.focus()
  } else {
    custSearch.value  = ''
    custResults.value = []
    custOpen.value    = false
  }
}

function removeCust(code) {
  selectedCustomers.value = selectedCustomers.value.filter(c => c.code !== code)
  if (selectedCustomers.value.length === 0) contactorPhones.value = []
}

let custKeepOpen = false
function custBlur() {
  setTimeout(() => {
    if (!custKeepOpen) custOpen.value = false
    custKeepOpen = false
  }, 300)
}

// ── Form ──────────────────────────────────────────────────────
const typeOptions = [
  { value: 'task',    label: 'งาน',      icon: '✅' },
  { value: 'call',    label: 'โทรศัพท์',  icon: '📞' },
  { value: 'meeting', label: 'ประชุม',    icon: '👥' },
]

const form = reactive({
  activity_type:  'task',
  subject:        '',
  description:    '',
  owner_id:       null,
  priority:       'normal',
  status:         'open',
  outcome:        '',
  due_date:       '',
  start_datetime: '',
  end_datetime:   '',
  all_day:        false,
  location:       '',
  meeting_url:    '',
  invitees:       [],
  call_direction: 'outbound',
  call_result:    '',
  call_phone:     '',
  duration_sec:   null,
})

// ป้องกัน watch reset ขณะโหลดข้อมูล edit
let isLoadingActivity = false
watch(() => form.activity_type, () => {
  if (isLoadingActivity) return
  form.invitees    = [...coOwners.value]  // sync meeting checkboxes กับ coOwners ที่มีอยู่
  form.all_day     = false
  form.meeting_url = ''
})

// เมื่อ meeting invitees เปลี่ยน ให้ sync กลับไปที่ coOwners ด้วย
watch(() => form.invitees, (ids) => {
  if (form.activity_type !== 'meeting') return
  // รวม invitees ใหม่เข้า coOwners (ไม่รวม primary owner)
  const merged = new Set([...coOwners.value, ...ids])
  merged.delete(form.owner_id)
  coOwners.value = [...merged]
}, { deep: true })

async function loadUsers() {
  try {
    const { data } = await api.get('/employees/crm-users')
    users.value = data
  } catch {}
}

async function loadActivity() {
  try {
    isLoadingActivity = true
    const { data } = await api.get(`/activities/${activityId.value}`)

    const skip = ['invitees', 'ar_code', 'owners']
    Object.keys(form).forEach(k => {
      if (skip.includes(k)) return
      if (data[k] !== undefined) form[k] = data[k] ?? (k === 'owner_id' ? null : '')
    })
    if (form.due_date)       form.due_date       = bkkDateSlice(form.due_date)
    if (form.start_datetime) form.start_datetime = bkkDateTimeSlice(form.start_datetime)
    if (form.end_datetime)   form.end_datetime   = bkkDateTimeSlice(form.end_datetime)

    // โหลด owners จาก owners[] array (multi-owner format ใหม่)
    if (data.owners?.length) {
      const activeOwners = data.owners.filter(o => !o.removed_at)
      const primary      = activeOwners.find(o => o.is_primary) || activeOwners[0]
      const nonPrimary   = activeOwners.filter(o => o.user_id !== primary?.user_id)
      form.owner_id  = primary?.user_id || data.owner_id || null
      coOwners.value = nonPrimary.map(o => o.user_id)
      form.invitees  = nonPrimary.map(o => o.user_id)
    } else if (data.owner_id) {
      // fallback: activity เก่าที่ไม่มี owners array
      form.owner_id  = data.owner_id
      coOwners.value = []
      form.invitees  = []
    } else if (data.invitees?.length) {
      form.invitees  = data.invitees.map(u => u.id ?? u)
      coOwners.value = []
    }
    isLoadingActivity = false

    // โหลด group members (ถ้ามี)
    if (data.group_members?.length > 1) {
      groupMembers.value  = data.group_members
      removedIds.value    = []
      addedGroupCusts.value = []
    }

    // โหลด customer เดิม (edit mode = 1 ลูกค้า)
    if (data.ar_code) {
      const entry = { code: data.ar_code, name_1: data.ar_code, owner_id: null, owner_name: null }
      try {
        const { data: cd } = await api.get('/customers', { params: { search: data.ar_code, limit: 5 } })
        const list = cd.data || cd.customers || []
        const match = list.find(c => c.code === data.ar_code)
        if (match) entry.name_1 = match.name_1
      } catch {}
      selectedCustomers.value = [entry]
    }
    if (form.owner_id) {
      const u = users.value.find(u => u.id === form.owner_id)
      if (u) ownerSearch.value = `${u.name}${u.code ? ` (${u.code})` : ''}`
    }
  } catch {
    isLoadingActivity = false
    errorMsg.value = 'ไม่พบกิจกรรม'
  }
}

async function save() {
  // ตรวจ required date ก่อน
  if (form.activity_type === 'task' && !form.due_date) {
    errorMsg.value = 'กรุณาระบุวันที่ครบกำหนด'
    return
  }
  if ((form.activity_type === 'call' || form.activity_type === 'meeting') && !form.start_datetime) {
    errorMsg.value = form.activity_type === 'call' ? 'กรุณาระบุวันและเวลาโทร' : 'กรุณาระบุวันและเวลาเริ่ม'
    return
  }
  errorMsg.value = ''

  // ยืนยันก่อนบันทึก
  const count = selectedCustomers.value.length > 1 ? selectedCustomers.value.length : 1
  try {
    if (isEdit.value) {
      await showConfirm({
        title: 'บันทึกการแก้ไข?',
        message: `"${form.subject}"`,
        confirmLabel: 'บันทึก',
        confirmClass: 'bg-blue-600 hover:bg-blue-700',
        iconBg: 'bg-blue-50', iconColor: 'text-blue-500',
        iconPath: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      })
    } else if (count > 1) {
      await showConfirm({
        title: `สร้าง ${count} กิจกรรม?`,
        message: `"${form.subject}" — แยกสร้างให้ลูกค้าแต่ละราย`,
        confirmLabel: `สร้าง ${count} รายการ`,
        confirmClass: 'bg-blue-600 hover:bg-blue-700',
        iconBg: 'bg-blue-50', iconColor: 'text-blue-500',
        iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      })
    } else {
      await showConfirm({
        title: 'บันทึกกิจกรรม?',
        message: `"${form.subject}"`,
        confirmLabel: 'บันทึก',
        confirmClass: 'bg-blue-600 hover:bg-blue-700',
        iconBg: 'bg-green-50', iconColor: 'text-green-500',
        iconPath: 'M5 13l4 4L19 7',
      })
    }
  } catch { return } // กด ยกเลิก

  saving.value   = true
  errorMsg.value = ''
  try {
    const base = { ...form }
    // clean up empty values
    if (!base.due_date)       base.due_date       = null
    if (!base.start_datetime) base.start_datetime = null
    if (!base.end_datetime)   base.end_datetime   = null
    if (!base.call_result)    base.call_result    = null
    if (!base.location)       base.location       = null
    if (!base.description)    base.description    = null
    if (!base.outcome)        base.outcome        = null
    if (!base.meeting_url)    base.meeting_url    = null

    // คำนวณ owners list (ผู้รับผิดชอบเท่านั้น — ไม่รวม meeting invitees)
    const ownerIds = new Set()
    if (base.owner_id) ownerIds.add(Number(base.owner_id))
    coOwners.value.forEach(id => ownerIds.add(Number(id)))
    const ownerList = ownerIds.size > 0 ? [...ownerIds] : []
    const { invitees: _inv, owner_id: _oid, ...rest } = base

    if (isEdit.value) {
      const ar_code = selectedCustomers.value[0]?.code || null
      const ownerPayload = ownerList.length > 0
        ? { owners: ownerList, primary_owner_id: base.owner_id || null }
        : {}

      if (groupMembers.value.length > 1) {
        // group update — อัปเดตทั้งกลุ่ม
        const { data: grpRes } = await api.put(`/activities/${activityId.value}`, {
          ...rest, ar_code, ...ownerPayload,
          group_update: {
            add_ar_codes:        addedGroupCusts.value.map(c => c.code),
            remove_activity_ids: removedIds.value,
            owners:              ownerList,
            primary_owner_id:    base.owner_id || null,
          },
        })
        // upload ไฟล์ใหม่ไปยังทุก activity ในกลุ่ม
        const allGroupIds = grpRes.group_member_ids || [parseInt(activityId.value)]
        await uploadPendingFiles(allGroupIds)
      } else {
        // single activity update
        await api.put(`/activities/${activityId.value}`, { ...rest, ar_code, ...ownerPayload })
        await uploadPendingFiles([parseInt(activityId.value)])
      }
    } else if (selectedCustomers.value.length <= 1) {
      // สร้าง 1 activity
      const cust = selectedCustomers.value[0]
      const ar_code = cust?.code || null
      const fallbackOwnerId = base.owner_id || cust?.owner_id || null
      const createOwners = ownerList.length > 0 ? ownerList : (fallbackOwnerId ? [fallbackOwnerId] : [])
      const { data: created } = await api.post('/activities', {
        ...rest, ar_code,
        owners: createOwners,
        primary_owner_id: base.owner_id || fallbackOwnerId || null,
      })
      await uploadPendingFiles([created.id])
    } else {
      // สร้างหลาย activities พร้อมกัน (bulk) — ใส่ group_id เดียวกัน
      const groupId = crypto.randomUUID()
      const fallbackOwnerId = base.owner_id || null
      const createOwners = ownerList.length > 0 ? ownerList : (fallbackOwnerId ? [fallbackOwnerId] : [])
      const results = await Promise.all(selectedCustomers.value.map(cust => {
        const custFallback = cust.owner_id || null
        const finalOwners = createOwners.length > 0 ? createOwners : (custFallback ? [custFallback] : [])
        return api.post('/activities', {
          ...rest, ar_code: cust.code, group_id: groupId,
          owners: finalOwners,
          primary_owner_id: base.owner_id || custFallback || null,
        })
      }))
      await uploadPendingFiles(results.map(r => r.data.id))
    }
    goBack()
  } catch (err) {
    errorMsg.value = err.message || 'เกิดข้อผิดพลาด'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadUsers()
  if (isEdit.value) {
    await loadActivity()
  } else if (route.query.ar_code) {
    // Pre-fill ลูกค้าจาก query param (มาจากหน้า CustomerForm)
    try {
      const { data } = await api.get(`/customers/${route.query.ar_code}`)
      const c = data.customer || data
      await selectCust({ code: c.code || route.query.ar_code, name_1: c.name_1 || route.query.ar_code, crm: data.crm })
    } catch {
      // ถ้าโหลดไม่ได้ ใส่ code เปล่าไว้ก่อน
      selectedCustomers.value = [{ code: route.query.ar_code, name_1: route.query.ar_code, owner_id: null, owner_name: null }]
    }
  }
})
</script>

<style scoped>
.label { @apply block text-sm font-medium text-slate-700 mb-1; }
.input { @apply w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500; }

.dialog-fade-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dialog-fade-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dialog-fade-enter-from  { opacity: 0; }
.dialog-fade-leave-to    { opacity: 0; }
.dialog-fade-enter-from .relative,
.dialog-fade-leave-to .relative { transform: scale(0.95); }
</style>
