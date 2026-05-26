<template>
  <div class="p-6 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <RouterLink to="/customers"
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300
                         text-slate-500 hover:bg-slate-100 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </RouterLink>
      <div>
        <h1 class="text-xl font-bold text-slate-800">
          {{ isEdit ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่' }}
        </h1>
        <p v-if="isEdit" class="text-slate-500 text-sm mt-0.5">รหัส: {{ props.code }}</p>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loadingInit" class="card p-8 text-center text-slate-400">
      <svg class="animate-spin w-6 h-6 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <p class="mt-3 text-sm">กำลังโหลดข้อมูล...</p>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="border-b border-slate-200 mb-6">
        <nav class="flex gap-6 -mb-px">
          <button v-for="tab in tabs" :key="tab.key"
                  @click="activeTab = tab.key"
                  :class="['pb-3 text-sm transition-colors', activeTab === tab.key ? 'tab-active' : 'tab-inactive']">
            {{ tab.label }}
            <span v-if="tab.key === 'contactors'"
                  class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
              {{ form.contactors.length }}
            </span>
            <span v-if="tab.key === 'transport'"
                  class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
              {{ form.transport_labels.length }}
            </span>
            <span v-if="tab.key === 'notes' && notes.length"
                  class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
              {{ notes.length }}
            </span>
            <span v-if="tab.key === 'activities' && custActTotal > 0"
                  class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
              {{ custActTotal }}
            </span>
          </button>
        </nav>
      </div>

      <div class="space-y-6">

        <!-- ══════════════════════════════
             TAB: ข้อมูลหลัก
        ══════════════════════════════ -->
        <div v-show="activeTab === 'main'" class="card p-6">
          <h2 class="font-semibold text-slate-700 mb-4">ข้อมูลลูกค้าหลัก</h2>
          <div class="grid grid-cols-2 gap-4">

            <div v-if="!isEdit">
              <label class="label-text">รหัสลูกค้า <span class="text-red-500">*</span></label>
              <input v-model="form.code" class="input-field font-mono" placeholder="เช่น C00001"/>
            </div>

            <div :class="isEdit ? 'col-span-2' : ''">
              <label class="label-text">ชื่อลูกค้า <span class="text-red-500">*</span></label>
              <input v-model="form.name_1" class="input-field" placeholder="ชื่อบริษัท หรือ ชื่อลูกค้า"/>
            </div>

            <div class="col-span-2">
              <label class="label-text">ที่อยู่</label>
              <textarea v-model="form.address" class="input-field" rows="2" placeholder="ที่อยู่..."/>
            </div>

            <div>
              <label class="label-text">จังหวัด</label>
              <select v-model="form.province" @change="onProvinceChange" class="input-field">
                <option value="">— เลือกจังหวัด —</option>
                <option v-for="p in provinces" :key="p.code" :value="p.code">{{ p.name_1 }}</option>
              </select>
            </div>
            <div>
              <label class="label-text">อำเภอ</label>
              <select v-model="form.amper" @change="onAmperChange" class="input-field" :disabled="!form.province">
                <option value="">— เลือกอำเภอ —</option>
                <option v-for="a in ampers" :key="a.code" :value="a.code">{{ a.name_1 }}</option>
              </select>
            </div>
            <div>
              <label class="label-text">ตำบล</label>
              <select v-model="form.tambon" class="input-field" :disabled="!form.amper">
                <option value="">— เลือกตำบล —</option>
                <option v-for="t in tambons" :key="t.code" :value="t.code">{{ t.name_1 }}</option>
              </select>
            </div>
            <div>
              <label class="label-text">รหัสไปรษณีย์</label>
              <input v-model="form.zip_code" class="input-field" placeholder="รหัสไปรษณีย์"/>
            </div>
            <div>
              <label class="label-text">ประเทศ</label>
              <input v-model="form.country" class="input-field" placeholder="ประเทศ"/>
            </div>

            <div class="col-span-2">
              <label class="label-text">พิกัด GPS</label>
              <MapPicker
                map-id="map-main"
                :lat="form.latitude || 0"
                :lng="form.longitude || 0"
                @update:lat="form.latitude = $event"
                @update:lng="form.longitude = $event"
              />
            </div>

            <div class="col-span-2">
              <label class="label-text">หมายเหตุ</label>
              <textarea v-model="form.remark" class="input-field" rows="2" placeholder="หมายเหตุ..."/>
            </div>

            <div class="col-span-2 relative">
              <label class="label-text">พนักงานผู้ดูแล</label>
              <div class="relative">
                <input
                  v-model="empSearch"
                  @focus="empOpen = true"
                  @blur="empBlur"
                  @input="empOpen = true"
                  class="input-field pr-8"
                  placeholder="พิมพ์ชื่อหรือรหัสเพื่อค้นหา..."
                  autocomplete="off"
                />
                <button v-if="form.sale_code" type="button"
                  @click="form.sale_code = ''; empSearch = ''"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div v-if="empOpen && filteredEmployees.length > 0"
                   class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                <button v-for="e in filteredEmployees" :key="e.code"
                  type="button"
                  @mousedown.prevent="selectEmployee(e)"
                  class="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0">
                  <div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {{ e.name_1.charAt(0) }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-slate-800">{{ e.name_1 }}</p>
                    <p class="text-xs text-slate-400">{{ e.code }}</p>
                  </div>
                </button>
              </div>
              <p v-if="form.sale_code" class="text-xs text-blue-600 mt-1">
                เลือก: {{ form.sale_code }}
              </p>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════
             TAB: ผู้ติดต่อ
        ══════════════════════════════ -->
        <div v-show="activeTab === 'contactors'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-slate-700">ผู้ติดต่อ</h2>
            <button @click="addContactor" class="btn-secondary text-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              เพิ่มผู้ติดต่อ
            </button>
          </div>

          <div v-if="form.contactors.length === 0"
               class="card p-8 text-center text-slate-400">
            <svg class="mx-auto w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            ยังไม่มีผู้ติดต่อ — คลิก "เพิ่มผู้ติดต่อ"
          </div>

          <div v-for="(c, idx) in form.contactors" :key="idx" class="card p-5">
            <div class="flex items-start justify-between mb-4">
              <span class="text-sm font-semibold text-slate-600">ผู้ติดต่อที่ {{ idx + 1 }}</span>
              <button @click="removeContactor(idx)"
                      class="p-1 text-slate-400 hover:text-red-500 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label-text">ชื่อ-นามสกุล</label>
                <input v-model="c.name" class="input-field" placeholder="ชื่อ-นามสกุล"/>
              </div>
              <div>
                <label class="label-text">E-Mail</label>
                <input v-model="c.email" type="email" class="input-field" placeholder="email@example.com"/>
              </div>
              <div>
                <label class="label-text">โทรศัพท์ (คั่นด้วย ,)</label>
                <input v-model="c.telephone" class="input-field" placeholder="0812345678,0989999999"/>
              </div>
              <div>
                <label class="label-text">วันเกิด</label>
                <DateInput v-model="c.birthday" class="input-field"/>
              </div>
              <div class="col-span-2">
                <label class="label-text">Line ID</label>
                <input v-model="c.work_title" class="input-field" placeholder="Line ID"/>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════
             TAB: ที่อยู่จัดส่ง
        ══════════════════════════════ -->
        <div v-show="activeTab === 'transport'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-slate-700">ที่อยู่จัดส่ง</h2>
            <button @click="addTransport" class="btn-secondary text-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              เพิ่มที่อยู่จัดส่ง
            </button>
          </div>

          <div v-if="form.transport_labels.length === 0"
               class="card p-8 text-center text-slate-400">
            <svg class="mx-auto w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            </svg>
            ยังไม่มีที่อยู่จัดส่ง — คลิก "เพิ่มที่อยู่จัดส่ง"
          </div>

          <div v-for="(t, idx) in form.transport_labels" :key="idx" class="card p-5">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm font-semibold text-slate-600">ที่อยู่จัดส่งที่ {{ idx + 1 }}</span>
              <button @click="removeTransport(idx)"
                      class="p-1 text-slate-400 hover:text-red-500 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="label-text">ที่อยู่</label>
                <textarea v-model="t.address" class="input-field" rows="2"/>
              </div>
              <div>
                <label class="label-text">จังหวัด</label>
                <select v-model="t.province" @change="onTProvinceChange(t, idx)" class="input-field">
                  <option value="">— เลือกจังหวัด —</option>
                  <option v-for="p in provinces" :key="p.code" :value="p.code">{{ p.name_1 }}</option>
                </select>
              </div>
              <div>
                <label class="label-text">อำเภอ</label>
                <select v-model="t.amper" @change="onTAmperChange(t, idx)" class="input-field" :disabled="!t.province">
                  <option value="">— เลือกอำเภอ —</option>
                  <option v-for="a in (tAmpers[idx] || [])" :key="a.code" :value="a.code">{{ a.name_1 }}</option>
                </select>
              </div>
              <div>
                <label class="label-text">ตำบล</label>
                <select v-model="t.tambon" class="input-field" :disabled="!t.amper">
                  <option value="">— เลือกตำบล —</option>
                  <option v-for="tb in (tTambons[idx] || [])" :key="tb.code" :value="tb.code">{{ tb.name_1 }}</option>
                </select>
              </div>
              <div>
                <label class="label-text">รหัสไปรษณีย์</label>
                <input v-model="t.zip_code" class="input-field"/>
              </div>
              <div>
                <label class="label-text">ประเทศ</label>
                <input v-model="t.country" class="input-field"/>
              </div>
              <div class="col-span-2">
                <label class="label-text">พิกัด GPS</label>
                <MapPicker
                  :map-id="`map-transport-${idx}`"
                  :lat="t.latitude || 0"
                  :lng="t.longitude || 0"
                  @update:lat="t.latitude = $event"
                  @update:lng="t.longitude = $event"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════
             TAB: CRM Info
        ══════════════════════════════ -->
        <div v-show="activeTab === 'crm'" class="card p-6">
          <h2 class="font-semibold text-slate-700 mb-4">ข้อมูล CRM</h2>
          <div class="grid grid-cols-2 gap-4">

            <div>
              <label class="label-text">ประเภทลูกค้า</label>
              <select v-model="form.crm.customer_type" class="input-field">
                <option value="B2C">B2C (ลูกค้าทั่วไป)</option>
                <option value="B2B">B2B (ลูกค้าองค์กร)</option>
              </select>
            </div>

            <div>
              <label class="label-text">สถานะ CRM</label>
              <select v-model="form.crm.status" class="input-field">
                <option value="active">ใช้งาน</option>
                <option value="inactive">ไม่ใช้งาน</option>
                <option value="blacklist">บัญชีดำ</option>
              </select>
            </div>

            <div>
              <label class="label-text">ลำดับความสำคัญ</label>
              <select v-model="form.crm.priority" class="input-field">
                <option value="high">High (สูง)</option>
                <option value="normal">Normal (ปกติ)</option>
                <option value="low">Low (ต่ำ)</option>
              </select>
            </div>

            <div>
              <label class="label-text">แหล่งที่มา</label>
              <select v-model="form.crm.source" class="input-field">
                <option value="">— ไม่ระบุ —</option>
                <option value="walk-in">Walk-in</option>
                <option value="referral">Referral</option>
                <option value="online">Online</option>
                <option value="social">Social Media</option>
                <option value="exhibition">งานแสดงสินค้า</option>
              </select>
            </div>

            <div class="col-span-2">
              <label class="label-text">ทีมผู้ดูแลลูกค้า CRM</label>
              <div class="space-y-2">
                <div class="relative">
                  <input v-model="crmOwnerSearch"
                         @focus="crmOwnerOpen = true"
                         @blur="crmOwnerBlur"
                         class="input-field"
                         placeholder="ค้นหาชื่อหรือรหัสพนักงาน CRM..." />
                  <div v-if="crmOwnerOpen && filteredCrmOwnerOptions.length"
                       class="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                    <button v-for="u in filteredCrmOwnerOptions" :key="u.id" type="button"
                            @mousedown.prevent="addCrmOwner(u.id)"
                            class="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between gap-3">
                      <span class="min-w-0">
                        <span class="block text-sm font-medium text-slate-800 truncate">{{ u.name }}</span>
                        <span class="block text-xs text-slate-400 truncate">{{ u.code }}</span>
                      </span>
                      <span class="text-xs text-blue-600 flex-shrink-0">เพิ่ม</span>
                    </button>
                  </div>
                  <div v-else-if="crmOwnerOpen && crmOwnerSearch && !filteredCrmOwnerOptions.length"
                       class="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-3 text-sm text-slate-400">
                    ไม่พบพนักงานที่ค้นหา หรือเลือกไว้แล้ว
                  </div>
                </div>

                <div v-if="selectedCrmOwnerUsers.length"
                     class="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                  <div v-for="u in selectedCrmOwnerUsers" :key="u.id"
                       class="flex items-center gap-3 px-3 py-2.5">
                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {{ ownerInitial(u) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-slate-800 truncate">{{ u.name }}</p>
                      <p class="text-xs text-slate-400 truncate">{{ u.code }}</p>
                    </div>
                    <label class="flex items-center gap-1.5 text-xs text-slate-500">
                      <input type="radio"
                             name="primaryCrmOwner"
                             :checked="isPrimaryCrmOwner(u.id)"
                             @change="setPrimaryCrmOwner(u.id)"
                             class="w-3.5 h-3.5 border-slate-300 text-blue-600" />
                      หลัก
                    </label>
                    <button type="button"
                            @click="removeCrmOwner(u.id)"
                            class="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                            title="ลบผู้ดูแล">
                      ×
                    </button>
                  </div>
                </div>
                <div v-else class="border border-dashed border-slate-200 rounded-xl px-3 py-4 text-sm text-slate-400 text-center">
                  ยังไม่ได้เลือกผู้ดูแล CRM
                </div>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                คนที่เลือกไว้จะถูกใช้เป็นค่าเริ่มต้นเวลาสร้างกิจกรรมของลูกค้านี้
              </p>
            </div>

            <div>
              <label class="label-text">วันที่ Follow-up ถัดไป</label>
              <DateInput v-model="form.crm.next_followup" class="input-field"/>
            </div>

            <div class="col-span-2">
              <label class="label-text">หมายเหตุ CRM</label>
              <textarea v-model="form.crm.crm_remark" class="input-field" rows="3"
                        placeholder="บันทึกข้อมูลเพิ่มเติมสำหรับทีม CRM..."/>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════
             TAB: บันทึก (Notes)
        ══════════════════════════════ -->
        <div v-show="activeTab === 'notes'" class="space-y-4">

          <!-- แสดงเฉพาะตอน edit -->
          <div v-if="!isEdit" class="card p-8 text-center text-slate-400 text-sm">
            กรุณาบันทึกข้อมูลลูกค้าก่อน จึงจะสามารถเพิ่มบันทึกได้
          </div>

          <template v-else>
            <!-- กล่องเพิ่ม note ใหม่ -->
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

            <!-- รายการ notes -->
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
          </template>
        </div>

        <!-- ══════════════════════════════
             TAB: กิจกรรม (Activities)
        ══════════════════════════════ -->
        <div v-show="activeTab === 'activities'" class="space-y-4">

          <!-- แสดงเฉพาะ edit mode -->
          <div v-if="!isEdit" class="card p-8 text-center text-slate-400 text-sm">
            กรุณาบันทึกข้อมูลลูกค้าก่อน จึงจะดูกิจกรรมได้
          </div>

          <template v-else>

            <section v-if="followupSummary" class="card p-4 border border-blue-100 bg-blue-50/40">
              <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">Follow-up ลูกค้า</h3>
       
                </div>
                <button v-if="isManager" type="button" @click="toggleCustomerFollowup"
                  :disabled="savingFollowup"
                  :class="followupForm.followup_enabled ? 'bg-blue-600' : 'bg-slate-300'"
                  class="relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-60">
                  <span :class="followupForm.followup_enabled ? 'translate-x-6' : 'translate-x-1'"
                    class="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform" />
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="label-text">วันติดตามถัดไป</label>
                  <div class="flex gap-2">
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
                  <div class="flex gap-2">
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
                  งานถัดไป: {{ followupSummary.next_open_followup.subject }} • {{ formatActDateTime(followupSummary.next_open_followup.start_datetime || followupSummary.next_open_followup.retry_due_at || followupSummary.next_open_followup.due_date) }}
                </span>
                <span v-if="followupSummary.policy" class="px-2 py-1 rounded bg-white border border-slate-200">
                  โทรทุก {{ followupSummary.policy.default_call_interval_days }} วัน • โทรซ้ำ {{ followupSummary.policy.no_answer_retry_minutes }} นาที
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

            <!-- Toolbar: ค้นหา + ตัวกรองสถานะ + ปุ่มสร้าง -->
            <div class="flex flex-wrap items-center gap-3">
              <div class="relative flex-1 min-w-[180px]">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input v-model="actSearchQuery" @input="loadActivities(true)" class="input-field pl-9 text-sm" placeholder="ค้นหาหัวข้อ..."/>
              </div>
              <select v-model="actStatusFilter" @change="loadActivities(true)" class="input-field w-auto text-sm">
                <option value="all">ทุกสถานะ</option>
                <option value="open">ค้างอยู่</option>
                <option value="done">ปิดแล้ว</option>
                <option value="deleted">ถูกลบ</option>
              </select>
              <button @click="router.push({ path: '/activities/new', query: { ar_code: props.code } })"
                      class="btn-primary text-sm px-3 py-2 whitespace-nowrap">
                <svg class="w-4 h-4 inline -mt-0.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                สร้างกิจกรรม
              </button>
            </div>

            <!-- Loading -->
            <div v-if="loadingActivities" class="text-center text-slate-400 py-8 text-sm">
              <svg class="animate-spin w-5 h-5 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              กำลังโหลด...
            </div>

            <!-- Empty -->
            <div v-else-if="custActivities.length === 0" class="card p-8 text-center text-slate-400">
              <svg class="mx-auto w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p class="text-sm">ยังไม่มีกิจกรรมสำหรับลูกค้านี้</p>
            </div>

            <!-- Activity Cards -->
            <template v-else>
              <div v-for="act in custActivities" :key="act.id"
                   :class="[
                     'card border cursor-pointer hover:shadow-md transition-shadow',
                     act.status === 'deleted' ? 'opacity-50' : '',
                     act.status === 'done' ? 'border-green-200' : '',
                     actOverdueDays(act) > 0 ? 'border-red-200 bg-red-50/30' : ''
                   ]"
                   @click="router.push({ path: `/activities/${act.id}`, query: { from: `/customers/${props.code}?tab=activities` } })">
                <div class="p-4">
                  <!-- Row 1: type + subject + status badge + date -->
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
                            {{ act.call_direction ? ' • ' : '' }}{{ callResultLabel(act.call_result) }}
                          </span>
                        </p>
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

                  <!-- Row 2: owners + overdue -->
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
                      ⏰ เลยกำหนด {{ actOverdueDays(act) }} วัน
                    </span>
                  </div>

                  <!-- Row 3: ผลลัพธ์ (เฉพาะ done) -->
                  <div v-if="act.status === 'done' && act.outcome"
                       class="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <p class="text-xs font-medium text-green-700 mb-1">📋 ผลลัพธ์</p>
                    <p class="text-sm text-green-800 whitespace-pre-wrap">{{ act.outcome }}</p>
                    <p v-if="act.created_by_name" class="text-xs text-green-600 mt-1">
                      ปิดเมื่อ {{ formatActDateTime(act.updated_at) }}
                    </p>
                  </div>

                  <!-- Row 3 alt: ผลลัพธ์แยกตาม owner (ถ้าไม่มี outcome หลัก) -->
                  <div v-else-if="act.status === 'done' && !act.outcome"
                       class="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <p class="text-xs font-medium text-green-700">✅ งานเสร็จสิ้น</p>
                  </div>
                </div>
              </div>

              <!-- Load more -->
              <div v-if="custActivities.length < custActTotal" class="text-center pt-2">
                <button @click="loadMoreActivities" :disabled="loadingActivities"
                        class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  ดูเพิ่ม (แสดง {{ custActivities.length }} จาก {{ custActTotal }}) →
                </button>
              </div>
            </template>
          </template>
        </div>

        <!-- ══════════════════════════════
             TAB: ประวัติการซื้อ
        ══════════════════════════════ -->
        <div v-show="activeTab === 'purchase_history'" class="space-y-4">

          <div v-if="!isEdit" class="card p-8 text-center text-slate-400 text-sm">
            กรุณาบันทึกข้อมูลลูกค้าก่อน จึงจะดูประวัติการซื้อได้
          </div>

          <template v-else>
            <!-- Filter row -->
            <div class="flex flex-wrap items-center gap-2">
              <input v-model="purchaseFilter.doc_no" @input="purchaseDebounce"
                class="input-field w-36 text-sm" placeholder="เลขที่เอกสาร..." />
              <input v-model="purchaseFilter.sale_code" @input="purchaseDebounce"
                class="input-field w-32 text-sm" placeholder="รหัสพนักงาน..." />
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-slate-500">จาก</span>
                <DateInput v-model="purchaseFilter.date_from" @change="loadPurchaseHistory(1)"
                  class="input-field text-sm" />
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-slate-500">ถึง</span>
                <DateInput v-model="purchaseFilter.date_to" @change="loadPurchaseHistory(1)"
                  class="input-field text-sm" />
              </div>
            </div>

            <!-- Loading -->
            <div v-if="loadingPurchase" class="text-center text-slate-400 py-8 text-sm">
              <svg class="animate-spin w-5 h-5 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              กำลังโหลด...
            </div>

            <!-- Table -->
            <div v-else class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table class="w-full text-sm min-w-[600px]">
                <thead class="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th class="w-8 px-4 py-3"></th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">วันที่</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">เลขที่เอกสาร</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500">พนักงาน</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500">ยอดรวม (บาท)</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-slate-500">VAT</th>
                  </tr>
                </thead>
                <tbody v-if="!purchaseHistory.length">
                  <tr>
                    <td colspan="6" class="py-10 text-center text-slate-400 text-sm">ไม่มีข้อมูลการซื้อ</td>
                  </tr>
                </tbody>
                <tbody v-for="row in purchaseHistory" :key="row.doc_no" class="border-b border-slate-100">
                    <!-- Main row -->
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
                      <td class="px-4 py-3 text-sm text-slate-600">{{ row.sale_name || row.sale_code || '—' }}</td>
                      <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ phFmtAmount(row.total_amount) }}</td>
                      <td class="px-4 py-3 text-center">
                        <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                          {{ phVatLabel(row.vat_type) }}
                        </span>
                      </td>
                    </tr>
                    <!-- Expanded line items -->
                    <tr v-if="expandedDoc === row.doc_no">
                      <td colspan="6" class="bg-slate-50/70 px-6 py-3">
                        <div v-if="loadingLines" class="text-xs text-slate-400 py-2 text-center">
                          กำลังโหลดรายการสินค้า...
                        </div>
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

              <!-- Pagination -->
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
          </template>
        </div>

        <!-- ══════════════════════════════
             TAB: หนี้คงค้าง
        ══════════════════════════════ -->
        <div v-show="activeTab === 'credit_detail'" class="space-y-4">

          <div v-if="!isEdit" class="card p-8 text-center text-slate-400 text-sm">
            กรุณาบันทึกข้อมูลลูกค้าก่อน จึงจะดูข้อมูลหนี้คงค้างได้
          </div>

          <template v-else>
            <!-- Loading -->
            <div v-if="loadingCreditDetail" class="text-center text-slate-400 py-8 text-sm">
              <svg class="animate-spin w-5 h-5 mx-auto text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              กำลังโหลด...
            </div>

            <template v-else>
              <!-- Credit Summary -->
              <div v-if="creditDetail" class="grid grid-cols-2 gap-3">
                <div class="card p-4">
                  <p class="text-slate-400 text-xs font-medium">วงเงินเครดิต</p>
                  <p class="text-lg font-bold text-slate-800 mt-1">{{ creditDetail.data_head.credit_money }}</p>
                </div>
                <div class="card p-4">
                  <p class="text-slate-400 text-xs font-medium">สั่งขาย</p>
                  <p class="text-lg font-bold text-blue-600 mt-1">{{ creditDetail.data_head.sum_sr }}</p>
                </div>
                <div class="card p-4">
                  <p class="text-slate-400 text-xs font-medium">เช็คคงค้าง</p>
                  <p class="text-lg font-bold text-amber-600 mt-1">{{ creditDetail.data_head.sum_cheque }}</p>
                </div>
                <div class="card p-4">
                  <p class="text-slate-400 text-xs font-medium">หนี้คงค้าง</p>
                  <p class="text-lg font-bold text-red-600 mt-1">{{ creditDetail.data_head.sum_status }}</p>
                </div>
              </div>
              <div v-else class="card p-4 text-center text-slate-400 text-sm">ไม่พบข้อมูลเครดิต</div>

              <!-- Sub-tabs -->
              <div class="flex gap-1 bg-slate-50 rounded-xl p-1 border border-slate-200">
                <button v-for="t in [
                    { key: 'credit_docs',    label: 'รายการคงค้าง' },
                    { key: 'credit_cheques', label: 'เช็ค' },
                    { key: 'credit_srss',    label: 'SR/SS' }
                  ]" :key="t.key"
                  @click="creditActiveTab = t.key"
                  class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  :class="creditActiveTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-white/60'">
                  {{ t.label }}
                </button>
              </div>

              <!-- รายการคงค้าง -->
              <div v-if="creditActiveTab === 'credit_docs'" class="space-y-2">
                <div v-if="creditDetail" class="card py-3 px-4 bg-red-50 flex justify-between items-center">
                  <span class="text-sm font-medium text-slate-600">ยอดรวมหนี้คงค้าง</span>
                  <span class="text-lg font-bold text-red-600">{{ creditDetail.data_head.sum_status }}</span>
                </div>
                <div v-if="!creditDetail || !creditDetail.data_1.length" class="card p-8 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
                <div v-else v-for="(item, i) in creditDetail.data_1" :key="i" class="card py-3 px-4">
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

              <!-- เช็ค -->
              <div v-if="creditActiveTab === 'credit_cheques'" class="space-y-2">
                <div v-if="creditDetail" class="card py-3 px-4 bg-amber-50 flex justify-between items-center">
                  <span class="text-sm font-medium text-slate-600">ยอดรวมเช็คคงค้าง</span>
                  <span class="text-lg font-bold text-amber-600">{{ creditDetail.data_head.sum_cheque }}</span>
                </div>
                <div v-if="!creditDetail || !creditDetail.data_2.length" class="card p-8 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
                <div v-else v-for="(item, i) in creditDetail.data_2" :key="i" class="card py-3 px-4">
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

              <!-- SR/SS -->
              <div v-if="creditActiveTab === 'credit_srss'" class="space-y-2">
                <div v-if="creditDetail" class="card py-3 px-4 bg-blue-50 flex justify-between items-center">
                  <span class="text-sm font-medium text-slate-600">ยอดรวมสั่งขาย</span>
                  <span class="text-lg font-bold text-blue-600">{{ creditDetail.data_head.sum_sr }}</span>
                </div>
                <div v-if="!creditDetail || !creditDetail.data_3.length" class="card p-8 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
                <div v-else v-for="(item, i) in creditDetail.data_3" :key="i" class="card py-3 px-4">
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
          </template>
        </div>

      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
        <RouterLink to="/customers" class="btn-secondary">ยกเลิก</RouterLink>
        <button @click="submit" :disabled="saving" class="btn-primary px-8">
          <svg v-if="saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {{ saving ? 'กำลังบันทึก...' : (isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า') }}
        </button>
      </div>
    </template>

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
           :class="['fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
             toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white']">
        <svg v-if="toast.type === 'success'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        {{ toast.message }}
      </div>
    </Teleport>

    <!-- Confirm Dialog -->
    <Teleport to="body">
      <div v-if="confirmDialog.show"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
           @click.self="confirmDialog.show = false">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div class="p-6">
              <div class="flex items-start gap-4">
                <div :class="['w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  confirmDialog.danger ? 'bg-red-100' : 'bg-blue-100']">
                  <svg v-if="confirmDialog.danger" class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <svg v-else class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-slate-800 text-base">{{ confirmDialog.title }}</h3>
                  <p class="text-slate-500 text-sm mt-1">{{ confirmDialog.message }}</p>
                </div>
              </div>
            </div>
            <div class="flex gap-2 px-6 pb-5">
              <button @click="confirmDialog.show = false"
                      class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                ยกเลิก
              </button>
              <button @click="confirmDialog.onConfirm(); confirmDialog.show = false"
                      :class="['flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors',
                        confirmDialog.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700']">
                {{ confirmDialog.confirmLabel || 'ยืนยัน' }}
              </button>
            </div>
          </div>
        </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import api from '../composables/useApi.js'
import MapPicker from '../components/MapPicker.vue'
import DateInput from '../components/DateInput.vue'
import { usePermissions } from '../composables/usePermissions.js'

// ── Props ─────────────────────────────────
const props = defineProps({ code: { type: String, default: null } })
const isEdit = computed(() => !!props.code)
const { isManager } = usePermissions()

// ── Router ────────────────────────────────
const router = useRouter()
const route  = useRoute()

// ── State ─────────────────────────────────
const validTabs = ['main', 'contactors', 'transport', 'crm', 'notes', 'activities', 'purchase_history', 'credit_detail']
const activeTab  = ref(validTabs.includes(route.query.tab) ? route.query.tab : 'main')
const loadingInit = ref(false)
const saving      = ref(false)
const employees   = ref([])
const crmUsers    = ref([])
const toast = reactive({ show: false, type: 'success', message: '' })
const confirmDialog = reactive({
  show: false, title: '', message: '', danger: false,
  confirmLabel: 'ยืนยัน', onConfirm: () => {}
})

function openConfirm({ title, message, danger = false, confirmLabel = 'ยืนยัน', onConfirm }) {
  confirmDialog.title = title
  confirmDialog.message = message
  confirmDialog.danger = danger
  confirmDialog.confirmLabel = confirmLabel
  confirmDialog.onConfirm = onConfirm
  confirmDialog.show = true
}

// ── Province / Amper / Tambon dropdowns ───────────
const provinces = ref([])
const ampers    = ref([])
const tambons   = ref([])
// สำหรับ transport_labels แต่ละแถว (indexed by idx)
const tAmpers   = ref({})
const tTambons  = ref({})

async function loadProvinces() {
  try { const { data } = await api.get('/customers/provinces'); provinces.value = data } catch {}
}

async function onProvinceChange() {
  form.amper = ''; form.tambon = ''; ampers.value = []; tambons.value = []
  if (!form.province) return
  try { const { data } = await api.get('/customers/ampers', { params: { province: form.province } }); ampers.value = data } catch {}
}

async function onAmperChange() {
  form.tambon = ''; tambons.value = []
  if (!form.province || !form.amper) return
  try { const { data } = await api.get('/customers/tambons', { params: { province: form.province, amper: form.amper } }); tambons.value = data } catch {}
}

async function onTProvinceChange(t, idx) {
  t.amper = ''; t.tambon = ''
  tAmpers.value[idx] = []; tTambons.value[idx] = []
  if (!t.province) return
  try { const { data } = await api.get('/customers/ampers', { params: { province: t.province } }); tAmpers.value[idx] = data } catch {}
}

async function onTAmperChange(t, idx) {
  t.tambon = ''; tTambons.value[idx] = []
  if (!t.province || !t.amper) return
  try { const { data } = await api.get('/customers/tambons', { params: { province: t.province, amper: t.amper } }); tTambons.value[idx] = data } catch {}
}

// โหลด ampers+tambons ของ form หลักเมื่อมีข้อมูลแล้ว (edit mode)
async function loadExistingGeo() {
  if (form.province) {
    try { const { data } = await api.get('/customers/ampers', { params: { province: form.province } }); ampers.value = data } catch {}
  }
  if (form.province && form.amper) {
    try { const { data } = await api.get('/customers/tambons', { params: { province: form.province, amper: form.amper } }); tambons.value = data } catch {}
  }
  // transport_labels
  for (let i = 0; i < form.transport_labels.length; i++) {
    const t = form.transport_labels[i]
    if (t.province) {
      try { const { data } = await api.get('/customers/ampers', { params: { province: t.province } }); tAmpers.value[i] = data } catch {}
    }
    if (t.province && t.amper) {
      try { const { data } = await api.get('/customers/tambons', { params: { province: t.province, amper: t.amper } }); tTambons.value[i] = data } catch {}
    }
  }
}

// ── Employee searchable dropdown ───────────
const empSearch = ref('')
const empOpen   = ref(false)
const filteredEmployees = computed(() => {
  const q = empSearch.value.toLowerCase()
  return employees.value.filter(e =>
    e.name_1.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
  ).slice(0, 20)
})
function selectEmployee(e) {
  form.sale_code = e.code
  empSearch.value = `${e.name_1} (${e.code})`
  empOpen.value = false
}
function empBlur() {
  setTimeout(() => { empOpen.value = false }, 150)
}

// CRM owner searchable multi-select
const crmOwnerSearch = ref('')
const crmOwnerOpen   = ref(false)
const selectedCrmOwnerUsers = computed(() =>
  form.crm.owners.map(o => {
    const user = crmUsers.value.find(u => Number(u.id) === Number(o.user_id))
    return user || { id: o.user_id, code: `#${o.user_id}`, name: `User #${o.user_id}` }
  })
)
const filteredCrmOwnerOptions = computed(() => {
  const q = crmOwnerSearch.value.trim().toLowerCase()
  return crmUsers.value
    .filter(u => !isCrmOwnerSelected(u.id))
    .filter(u => {
      if (!q) return true
      return String(u.name || '').toLowerCase().includes(q) ||
             String(u.code || '').toLowerCase().includes(q)
    })
    .slice(0, 20)
})
function crmOwnerBlur() {
  setTimeout(() => { crmOwnerOpen.value = false }, 150)
}
function ownerInitial(u) {
  return String(u.name || u.code || '?').trim().charAt(0).toUpperCase()
}

// Notes state
const notes       = ref([])
const loadingNotes = ref(false)
const savingNote  = ref(false)
const newNote     = ref('')
const newNotePinned = ref(false)
const newNoteFiles = ref([])
const noteFileInput = ref(null)
const noteFileDragging = ref(false)
const noteAttachmentPreview = ref(null)
const canAddNote = computed(() => newNote.value.trim() || newNoteFiles.value.length > 0)

// Activities state
const custActivities    = ref([])
const custActTotal      = ref(0)
const loadingActivities = ref(false)
const actStatusFilter   = ref('all')
const actSearchQuery    = ref('')
const actLimit          = ref(10)
const followupSummary   = ref(null)
const savingFollowup    = ref(false)
const followupForm = reactive({
  followup_enabled: false,
  followup_pause_until: '',
  followup_pause_reason: '',
  next_followup: '',
  followup_interval_days: '',
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

// Purchase history state
const purchaseHistory = ref([])
const purchasePag     = reactive({ total: 0, page: 1, pages: 1, limit: 10 })
const loadingPurchase = ref(false)
const purchaseFilter  = reactive({ doc_no: '', sale_code: '', date_from: '', date_to: '' })
const expandedDoc     = ref(null)
const expandedLines   = ref([])
const loadingLines    = ref(false)

// Credit detail state
const creditDetail        = ref(null)
const loadingCreditDetail = ref(false)
const creditActiveTab     = ref('credit_docs')

const tabs = [
  { key: 'main',       label: 'ข้อมูลหลัก' },
  { key: 'contactors', label: 'ผู้ติดต่อ' },
  { key: 'transport',  label: 'ที่อยู่จัดส่ง' },
  { key: 'crm',        label: 'CRM Info' },
  { key: 'notes',      label: 'บันทึก' },
  { key: 'activities',       label: 'กิจกรรม' },
  { key: 'purchase_history', label: 'ประวัติการซื้อ' },
  { key: 'credit_detail',    label: 'หนี้คงค้าง' }
]

const defaultForm = () => ({
  code: '', name_1: '', country: '', address: '',
  province: '', amper: '', tambon: '', zip_code: '',
  remark: '', sale_code: '', latitude: 0, longitude: 0,
  contactors: [],
  transport_labels: [],
  crm: {
    customer_type: 'B2C',
    status: 'active',
    priority: 'normal',
    source: '',
    owner_user_id: '',
    owners: [],
    next_followup: '',
    crm_remark: ''
  }
})

const form = reactive(defaultForm())

// ── Init ──────────────────────────────────
onMounted(async () => {
  await Promise.all([loadEmployees(), loadCrmUsers(), loadProvinces()])
  if (isEdit.value) {
    await loadCustomer()
    await Promise.all([loadNotes(), loadExistingGeo(), loadActivities()])
  }
})

// ── Purchase history ──────────────────────
async function loadPurchaseHistory(page = 1) {
  if (!isEdit.value) return
  loadingPurchase.value = true
  const p = {
    date_from:  purchaseFilter.date_from  || undefined,
    date_to:    purchaseFilter.date_to    || undefined,
    doc_no:     purchaseFilter.doc_no     || undefined,
    sale_code:  purchaseFilter.sale_code  || undefined,
    page, limit: purchasePag.limit,
  }
  const res = await api.get(`/sales/customer/${props.code}`, { params: p })
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

function phFmtAmount(v) {
  return parseFloat(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function phVatLabel(v) {
  return { 0: 'แยก VAT', 1: 'รวม VAT', 2: 'อัตราศูนย์', 4: 'ไม่กระทบ' }[parseInt(v)] || String(v)
}

async function loadCreditDetail() {
  if (!isEdit.value) return
  loadingCreditDetail.value = true
  const res = await api.get(`/customers/${props.code}/credit-detail`)
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

watch(activeTab, t => {
  if (t === 'purchase_history' && isEdit.value && !purchaseHistory.value.length) {
    loadPurchaseHistory(1)
  }
  if (t === 'credit_detail' && isEdit.value && !creditDetail.value) {
    loadCreditDetail()
  }
})

async function loadEmployees() {
  try {
    const { data } = await api.get('/employees')
    employees.value = data
  } catch {}
}

async function loadCrmUsers() {
  try {
    const { data } = await api.get('/employees/crm-users')
    crmUsers.value = data
  } catch {}
}

async function loadCustomer() {
  loadingInit.value = true
  try {
    const { data } = await api.get(`/customers/${props.code}`)
    const c = data.customer
    const d = data.detail

    form.name_1    = c.name_1    || ''
    form.country   = c.country   || ''
    form.address   = c.address   || ''
    form.province  = c.province  || ''
    form.amper     = c.amper     || ''
    form.tambon    = c.tambon    || ''
    form.zip_code  = c.zip_code  || ''
    form.latitude  = c.latitude  || 0
    form.longitude = c.longitude || 0
    form.remark    = c.remark    || ''
    form.sale_code = d?.sale_code || ''
    if (d?.sale_code) {
      const emp = employees.value.find(e => e.code === d.sale_code)
      empSearch.value = emp ? `${emp.name_1} (${emp.code})` : d.sale_code
    }

    form.contactors = data.contactors.map(ct => ({
      name: ct.name || '', email: ct.email || '',
      telephone: ct.telephone || '', birthday: ct.birthday ? ct.birthday.split('T')[0] : '',
      work_title: ct.work_title || ''
    }))

    form.transport_labels = data.transport_labels.map(t => ({
      country: t.country || '', address: t.address || '',
      province: t.province || '', amper: t.amper || '',
      tambon: t.tambon || '', zip_code: t.zip_code || '',
      latitude: t.latitude || 0.0, longitude: t.longitude || 0.0
    }))

    if (data.crm) {
      form.crm.customer_type  = data.crm.customer_type || 'B2C'
      form.crm.status         = data.crm.crm_status || data.crm.status || 'active'
      form.crm.priority       = data.crm.priority      || 'normal'
      form.crm.source         = data.crm.source        || ''
      form.crm.owner_user_id  = data.crm.owner_user_id || ''
      form.crm.owners         = Array.isArray(data.crm.owners)
        ? data.crm.owners.map(o => ({ user_id: Number(o.user_id), is_primary: !!o.is_primary }))
        : (data.crm.owner_user_id ? [{ user_id: Number(data.crm.owner_user_id), is_primary: true }] : [])
      form.crm.next_followup  = dateOnly(data.crm.next_followup)
      form.crm.crm_remark     = data.crm.crm_remark    || ''
    }

    followupSummary.value = data.followup_summary || null
    followupForm.followup_enabled = data.crm?.followup_enabled === true
    followupForm.followup_pause_until = dateOnly(data.crm?.followup_pause_until)
    followupForm.followup_pause_reason = data.crm?.followup_pause_reason || ''
    followupForm.next_followup = dateOnly(data.crm?.next_followup) || form.crm.next_followup
    followupForm.followup_interval_days = data.crm?.followup_interval_days || ''
  } catch (e) {
    showToast('error', e.message)
  } finally {
    loadingInit.value = false
  }
}

// ── Contactor helpers ─────────────────────
function addContactor() {
  form.contactors.push({ name: '', email: '', telephone: '', birthday: '', work_title: '' })
}
function removeContactor(i) { form.contactors.splice(i, 1) }

// ── Transport helpers ─────────────────────
function addTransport() {
  form.transport_labels.push({ country: 'ไทย', address: '', province: '', amper: '', tambon: '', zip_code: '', latitude: 0.0, longitude: 0.0 })
}
function removeTransport(i) { form.transport_labels.splice(i, 1) }

function isCrmOwnerSelected(id) {
  return form.crm.owners.some(o => Number(o.user_id) === Number(id))
}

function isPrimaryCrmOwner(id) {
  return form.crm.owners.some(o => Number(o.user_id) === Number(id) && o.is_primary)
}

function toggleCrmOwner(id) {
  const userId = Number(id)
  const idx = form.crm.owners.findIndex(o => Number(o.user_id) === userId)
  if (idx >= 0) {
    removeCrmOwner(userId)
  } else {
    addCrmOwner(userId)
  }
}

function syncPrimaryCrmOwner() {
  const primary = form.crm.owners.find(o => o.is_primary) || form.crm.owners[0]
  form.crm.owners.forEach(o => { o.is_primary = Number(o.user_id) === Number(primary?.user_id) })
  form.crm.owner_user_id = primary?.user_id || ''
}

function addCrmOwner(id) {
  const userId = Number(id)
  if (!userId || isCrmOwnerSelected(userId)) return
  form.crm.owners.push({ user_id: userId, is_primary: form.crm.owners.length === 0 })
  crmOwnerSearch.value = ''
  crmOwnerOpen.value = true
  syncPrimaryCrmOwner()
}

function removeCrmOwner(id) {
  const userId = Number(id)
  const idx = form.crm.owners.findIndex(o => Number(o.user_id) === userId)
  if (idx < 0) return
  form.crm.owners.splice(idx, 1)
  syncPrimaryCrmOwner()
}

function setPrimaryCrmOwner(id) {
  const userId = Number(id)
  if (!isCrmOwnerSelected(userId)) return
  form.crm.owners.forEach(o => { o.is_primary = Number(o.user_id) === userId })
  form.crm.owner_user_id = userId
}

// ── Notes ─────────────────────────────────
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
  if (!props.code) return
  loadingNotes.value = true
  try {
    const { data } = await api.get('/notes', { params: { ar_code: props.code } })
    notes.value = data
  } catch {}
  loadingNotes.value = false
}

async function addNote() {
  if (!canAddNote.value) return
  savingNote.value = true
  try {
    const fd = new FormData()
    fd.append('ar_code', props.code)
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
  }
  savingNote.value = false
}

async function togglePin(note) {
  try {
    const { data } = await api.patch(`/notes/${note.id}/pin`)
    note.is_pinned = data.is_pinned
    notes.value.sort((a, b) => b.is_pinned - a.is_pinned)
  } catch {}
}

function deleteNote(note) {
  openConfirm({
    title: 'ลบบันทึก',
    message: 'ต้องการลบบันทึกนี้? ไม่สามารถกู้คืนได้',
    danger: true,
    confirmLabel: 'ลบ',
    onConfirm: async () => {
      try {
        await api.delete(`/notes/${note.id}`)
        notes.value = notes.value.filter(n => n.id !== note.id)
      } catch (e) {
        showToast('error', e.message)
      }
    }
  })
}

function formatNoteDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function noteAttachmentUrl(att) {
  return `/uploads/${att.file_path}`
}

function noteAttachmentThumbUrl(att) {
  return att.thumb_path ? `/uploads/${att.thumb_path}` : noteAttachmentUrl(att)
}

function isNoteImage(att) {
  return att.mime_type?.startsWith('image/')
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

// ── Activities ────────────────────────────
async function loadActivities(reset = false) {
  if (!props.code) return
  if (reset) { custActivities.value = []; actLimit.value = 10 }
  loadingActivities.value = true
  try {
    const params = {
      status: actStatusFilter.value,
      limit: actLimit.value,
      offset: 0
    }
    if (actSearchQuery.value.trim()) params.search = actSearchQuery.value.trim()
    const { data } = await api.get(`/activities/by-customer/${props.code}`, { params })
    custActivities.value = data.activities
    custActTotal.value = data.total
  } catch (e) {
    showToast('error', 'โหลดกิจกรรมไม่สำเร็จ')
  }
  loadingActivities.value = false
}

function applyFollowupOverride(data = {}) {
  followupForm.followup_enabled = data.followup_enabled === true
  followupForm.followup_pause_until = dateOnly(data.followup_pause_until)
  followupForm.followup_pause_reason = data.followup_pause_reason || ''
  followupForm.next_followup = dateOnly(data.next_followup)
  followupForm.followup_interval_days = data.followup_interval_days || ''
  form.crm.next_followup = followupForm.next_followup
  if (followupSummary.value) {
    followupSummary.value = { ...followupSummary.value }
  }
}

async function saveFollowupOverride(patch) {
  if (!props.code || savingFollowup.value) return
  savingFollowup.value = true
  try {
    const { data } = await api.patch(`/customers/${props.code}/followup`, patch)
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

function loadMoreActivities() {
  actLimit.value += 10
  loadActivities()
}

function actTypeLabel(t) {
  if (t === 'task') return 'งาน'
  if (t === 'call') return 'โทร'
  return 'นัดประชุม'
}

function actTypeIcon(t) {
  if (t === 'task') return '📋'
  if (t === 'call') return '📞'
  return '📅'
}

function callResultLabel(r) {
  if (r === 'answered') return 'รับสาย'
  if (r === 'no_answer') return 'ไม่รับสาย'
  if (r === 'busy') return 'สายไม่ว่าง'
  if (r === 'left_voicemail') return 'ฝากข้อความ'
  return r
}

function actStatusBadge(status, a) {
  if (status === 'deleted') return { label: 'ถูกลบ', cls: 'bg-slate-100 text-slate-500' }
  if (status === 'done') return { label: 'ปิดแล้ว', cls: 'bg-green-100 text-green-700' }
  if (status === 'cancelled') return { label: 'ยกเลิก', cls: 'bg-slate-100 text-slate-500' }
  // check overdue
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

// ── Submit ────────────────────────────────
function dateOnly(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw.split('T')[0] || ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

function submit() {
  if (!isEdit.value && !form.code) {
    showToast('error', 'กรุณากรอกรหัสลูกค้า')
    activeTab.value = 'main'
    return
  }
  if (!form.name_1) {
    showToast('error', 'กรุณากรอกชื่อลูกค้า')
    activeTab.value = 'main'
    return
  }

  openConfirm({
    title: isEdit.value ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้าใหม่',
    message: isEdit.value
      ? `ยืนยันการแก้ไขข้อมูลลูกค้า "${form.name_1}"?`
      : `ยืนยันการเพิ่มลูกค้าใหม่ "${form.name_1}" (รหัส: ${form.code})?`,
    danger: false,
    confirmLabel: isEdit.value ? 'บันทึก' : 'เพิ่มลูกค้า',
    onConfirm: doSubmit
  })
}

async function doSubmit() {
  saving.value = true
  try {
    const primaryOwner = form.crm.owners.find(o => o.is_primary) || form.crm.owners[0]
    form.crm.owner_user_id = primaryOwner?.user_id || ''
    const payload = { ...form }
    if (isEdit.value) {
      await api.put(`/customers/${props.code}`, payload)
      showToast('success', 'บันทึกข้อมูลเรียบร้อย')
    } else {
      await api.post('/customers', payload)
      showToast('success', 'เพิ่มลูกค้าเรียบร้อย')
      setTimeout(() => router.push('/customers'), 1200)
    }
  } catch (e) {
    showToast('error', e.message)
  } finally {
    saving.value = false
  }
}

function showToast(type, message) {
  toast.type = type
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, 3500)
}
</script>
