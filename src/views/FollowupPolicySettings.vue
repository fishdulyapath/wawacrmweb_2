<template>
  <div class="mx-auto max-w-7xl p-4 sm:p-6 space-y-5">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-xl font-bold text-slate-800">ตั้งค่า Follow-up Policy</h1>
          <span
            v-if="!loading && !loadError"
            class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="form.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'"
          >
            {{ form.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
          </span>
        </div>
        <p class="mt-1 max-w-3xl text-sm text-slate-500">
          กำหนดรอบติดตามลูกค้าและการสร้างงานอัตโนมัติของระบบ
        </p>
      </div>

      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="button"
          @click="runNow"
          :disabled="manualRunning || manualVisitRunning || saving || loading || loadError || isDirty"
          class="btn-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {{ manualRunning ? 'กำลังสร้าง...' : isDirty ? 'บันทึกก่อน' : 'สร้าง Follow-up โทร' }}
        </button>
        <button
          type="button"
          @click="runNowVisit"
          :disabled="manualRunning || manualVisitRunning || saving || loading || loadError || isDirty"
          class="btn-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {{ manualVisitRunning ? 'กำลังสร้าง...' : isDirty ? 'บันทึกก่อน' : 'สร้างงานเยี่ยม' }}
        </button>
        <button
          type="button"
          @click="save"
          :disabled="saving || loading || loadError || !isDirty"
          class="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {{ saving ? 'กำลังบันทึก...' : isDirty ? 'บันทึกการตั้งค่า' : 'บันทึกแล้ว' }}
        </button>
      </div>
    </header>

    <div
      v-if="message && !loadError"
      class="rounded-lg border px-4 py-3 text-sm"
      :class="messageType === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'"
    >
      {{ message }}
    </div>

    <div v-if="loading" class="card p-8 text-center text-sm text-slate-500">
      กำลังโหลดการตั้งค่า...
    </div>

    <section v-else-if="loadError" class="card max-w-3xl p-6">
      <h2 class="text-base font-semibold text-slate-800">โหลดการตั้งค่าไม่สำเร็จ</h2>
      <p class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ message || 'ไม่สามารถเชื่อมต่อข้อมูล Follow-up Policy ได้' }}
      </p>
      <button type="button" class="btn-secondary mt-4" @click="load">โหลดใหม่</button>
    </section>

    <template v-else>
      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">รอบสร้างงานถัดไป</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">{{ formatDateTime(meta.next_auto_create_at) }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">สร้างงานล่าสุด</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">{{ formatDateTime(meta.last_auto_create_at) }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">ตรวจล่าสุด</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">{{ formatDateTime(meta.last_auto_create_checked_at) }}</p>
          <p v-if="meta.last_auto_create_checked_at" class="mt-1 text-xs text-slate-500">
            สร้าง {{ meta.last_auto_create_created_count || 0 }} / รอระบุ {{ meta.last_auto_create_unassigned_count || 0 }}
          </p>
        </div>
        <RouterLink
          to="/activities?queue=unassigned"
          class="rounded-lg border bg-white p-4 shadow-sm transition-colors hover:border-amber-300"
          :class="meta.unassigned_followup_count ? 'border-amber-200' : 'border-slate-200'"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">รอระบุผู้รับผิดชอบ</p>
          <p class="mt-1 text-sm font-semibold" :class="meta.unassigned_followup_count ? 'text-amber-700' : 'text-slate-800'">
            {{ meta.unassigned_followup_count || 0 }} งาน
          </p>
        </RouterLink>
      </section>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="space-y-5">
          <section class="card overflow-hidden">
            <div class="border-b border-slate-200 px-5 py-4">
              <h2 class="font-semibold text-slate-800">งานโทร</h2>
              <p class="mt-1 text-sm text-slate-500">กติกาการติดตามลูกค้าด้วยงานโทรอัตโนมัติ</p>
            </div>

            <div class="divide-y divide-slate-100">
              <div class="grid gap-4 px-5 py-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">สถานะนโยบาย</h3>
                  <p class="mt-1 text-sm text-slate-500">ปิดส่วนนี้เมื่อไม่ต้องการให้ระบบช่วยจัดคิวติดตาม</p>
                </div>
                <ToggleRow
                  :active="form.enabled"
                  active-text="ระบบติดตามลูกค้ากำลังทำงาน"
                  inactive-text="ระบบติดตามลูกค้าถูกปิดอยู่"
                  @toggle="form.enabled = !form.enabled"
                />
              </div>

              <div class="grid gap-4 px-5 py-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">การสร้างงานอัตโนมัติ</h3>
                  <p class="mt-1 text-sm text-slate-500">สร้างงานเมื่อถึงรอบติดตามและยังไม่มีงานเปิดอยู่</p>
                </div>
                <div class="space-y-4">
                  <ToggleRow
                    :active="form.auto_create_enabled"
                    active-text="สร้างงานตามเวลาที่กำหนด"
                    inactive-text="ไม่สร้างงานใหม่อัตโนมัติ"
                    @toggle="form.auto_create_enabled = !form.auto_create_enabled"
                  />
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2" :class="!form.auto_create_enabled ? 'opacity-60' : ''">
                    <div>
                      <label class="label-text">โทรติดตามทุกกี่วัน</label>
                      <div class="flex items-center gap-2">
                        <input v-model.number="form.default_call_interval_days" type="number" min="1" max="365" class="input-field" :disabled="!form.auto_create_enabled" />
                        <span class="w-12 text-sm text-slate-500">วัน</span>
                      </div>
                    </div>
                    <div>
                      <label class="label-text">เวลาสร้างงาน</label>
                      <input v-model="form.auto_create_time" type="text" inputmode="numeric" maxlength="5" placeholder="HH:mm" class="input-field" :disabled="!form.auto_create_enabled" @blur="normalizeFormTime('auto_create_time', '08:00')" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid gap-4 px-5 py-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">ผู้รับผิดชอบ</h3>
                  <p class="mt-1 text-sm text-slate-500">กำหนดว่างานโทรที่ระบบสร้างจะมอบหมายให้ใคร</p>
                </div>
                <div class="space-y-3">
                  <RadioCard v-model="form.assignment_mode" value="primary" title="มอบหมายให้ Primary CRM owner" description="เหมาะกับงานประจำ เพราะมีเจ้าของหลักชัดเจนและไม่เกิดงานซ้ำหลายคน" color="blue" />
                  <RadioCard v-model="form.assignment_mode" value="all" title="ให้ทีม CRM owner ทุกคนเห็นงานร่วมกัน" description="เหมาะกับทีมที่ช่วยกันรับผิดชอบลูกค้ารายเดียวกัน" color="blue" />
                  <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    ถ้าลูกค้ายังไม่มีทีมผู้ดูแล CRM ระบบจะสร้างงานไว้ในคิวรอระบุผู้รับผิดชอบ
                  </div>
                </div>
              </div>

              <div class="grid gap-4 px-5 py-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">โทรซ้ำเมื่อยังติดต่อไม่ได้</h3>
                  <p class="mt-1 text-sm text-slate-500">ใช้กับงานโทรที่ผลลัพธ์ยังไม่รับสาย สายไม่ว่าง หรือฝากข้อความ</p>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label class="label-text">โทรซ้ำสูงสุดต่อวัน</label>
                    <div class="flex items-center gap-2">
                      <input v-model.number="form.no_answer_max_attempts_per_day" type="number" min="1" max="10" class="input-field" />
                      <span class="w-12 text-sm text-slate-500">ครั้ง</span>
                    </div>
                  </div>
                  <div>
                    <label class="label-text">ระยะห่างการโทรซ้ำ</label>
                    <div class="flex items-center gap-2">
                      <input v-model.number="form.no_answer_retry_minutes" type="number" min="5" max="480" class="input-field" />
                      <span class="w-12 text-sm text-slate-500">นาที</span>
                    </div>
                  </div>
                  <div>
                    <label class="label-text">เริ่มเวลาทำงาน</label>
                    <input v-model="form.business_start_time" type="text" inputmode="numeric" maxlength="5" placeholder="HH:mm" class="input-field" @blur="normalizeFormTime('business_start_time', '08:30')" />
                  </div>
                  <div>
                    <label class="label-text">สิ้นสุดเวลาทำงาน</label>
                    <input v-model="form.business_end_time" type="text" inputmode="numeric" maxlength="5" placeholder="HH:mm" class="input-field" @blur="normalizeFormTime('business_end_time', '17:30')" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="card overflow-hidden">
            <div class="border-b border-slate-200 px-5 py-4">
              <h2 class="font-semibold text-slate-800">งานเยี่ยม</h2>
              <p class="mt-1 text-sm text-slate-500">กติกาการสร้างงานเยี่ยมอัตโนมัติ ผู้รับผิดชอบงานเยี่ยมกำหนดในหน้าแก้ไขลูกค้า</p>
            </div>

            <div class="divide-y divide-slate-100">
              <div class="grid gap-4 px-5 py-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">สถานะงานเยี่ยม</h3>
                  <p class="mt-1 text-sm text-slate-500">เปิดเมื่อต้องการให้ระบบสร้างงานเยี่ยมตามรอบ</p>
                </div>
                <ToggleRow
                  :active="form.visit_enabled"
                  active-text="ระบบสร้างงานเยี่ยมกำลังทำงาน"
                  inactive-text="ระบบสร้างงานเยี่ยมถูกปิดอยู่"
                  color="green"
                  @toggle="form.visit_enabled = !form.visit_enabled"
                />
              </div>

              <div class="grid gap-4 px-5 py-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div>
                  <h3 class="text-sm font-semibold text-slate-800">การสร้างงานอัตโนมัติ</h3>
                  <p class="mt-1 text-sm text-slate-500">สร้างงานเยี่ยมเมื่อถึงรอบและยังไม่มีงานเปิดอยู่</p>
                </div>
                <div class="space-y-4">
                  <ToggleRow
                    :active="form.visit_auto_create_enabled"
                    active-text="สร้างงานเยี่ยมตามเวลาที่กำหนด"
                    inactive-text="ไม่สร้างงานเยี่ยมใหม่อัตโนมัติ"
                    color="green"
                    @toggle="form.visit_auto_create_enabled = !form.visit_auto_create_enabled"
                  />
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2" :class="!form.visit_auto_create_enabled ? 'opacity-60' : ''">
                    <div>
                      <label class="label-text">เยี่ยมทุกกี่วัน</label>
                      <div class="flex items-center gap-2">
                        <input v-model.number="form.default_visit_interval_days" type="number" min="1" max="365" class="input-field" :disabled="!form.visit_auto_create_enabled" />
                        <span class="w-12 text-sm text-slate-500">วัน</span>
                      </div>
                    </div>
                    <div>
                      <label class="label-text">เวลาสร้างงานเยี่ยม</label>
                      <input v-model="form.visit_auto_create_time" type="text" inputmode="numeric" maxlength="5" placeholder="HH:mm" class="input-field" :disabled="!form.visit_auto_create_enabled" @blur="normalizeFormTime('visit_auto_create_time', '08:00')" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside class="space-y-4">
          <section class="card p-5">
            <h2 class="font-semibold text-slate-800">ผลลัพธ์ตามค่านี้</h2>
            <p class="mt-3 text-sm leading-6 text-slate-600">
              <template v-if="form.enabled && form.auto_create_enabled">
                งานโทรจะถูกสร้างเวลา <span class="font-semibold text-slate-800">{{ form.auto_create_time }}</span>
                และเลื่อนรอบถัดไปอีก <span class="font-semibold text-slate-800">{{ form.default_call_interval_days }}</span> วัน
              </template>
              <template v-else-if="!form.enabled">Policy งานโทรยังปิดอยู่</template>
              <template v-else>เปิด policy งานโทรแล้ว แต่การสร้างงานอัตโนมัติถูกปิดไว้</template>
            </p>
            <p class="mt-3 text-sm leading-6 text-slate-600">
              <template v-if="form.visit_enabled && form.visit_auto_create_enabled">
                งานเยี่ยมจะถูกสร้างเวลา <span class="font-semibold text-slate-800">{{ form.visit_auto_create_time }}</span>
                และใช้ผู้รับผิดชอบจากหน้าลูกค้าแต่ละราย
              </template>
              <template v-else-if="!form.visit_enabled">Policy งานเยี่ยมยังปิดอยู่</template>
              <template v-else>เปิด policy งานเยี่ยมแล้ว แต่การสร้างงานอัตโนมัติถูกปิดไว้</template>
            </p>
          </section>

          <RouterLink
            to="/activities?queue=unassigned"
            class="block rounded-lg border border-amber-200 bg-amber-50 p-5 transition-colors hover:border-amber-300"
          >
            <p class="text-sm font-semibold text-amber-900">คิวรอระบุผู้รับผิดชอบ</p>
            <p class="mt-1 text-2xl font-bold text-amber-800">{{ meta.unassigned_followup_count || 0 }}</p>
            <p class="mt-1 text-sm text-amber-800">เปิดรายการงานที่ยังไม่มี owner</p>
          </RouterLink>

          <section v-if="meta.last_auto_create_error" class="rounded-lg border border-red-200 bg-red-50 p-5">
            <h2 class="font-semibold text-red-800">พบปัญหารอบล่าสุด</h2>
            <p class="mt-2 break-words text-sm text-red-700">{{ meta.last_auto_create_error }}</p>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, defineComponent, h } from 'vue'
import api from '../composables/useApi.js'

const ToggleRow = defineComponent({
  props: {
    active: Boolean,
    activeText: { type: String, default: '' },
    inactiveText: { type: String, default: '' },
    color: { type: String, default: 'blue' },
  },
  emits: ['toggle'],
  setup(props, { emit }) {
    return () => h('div', { class: 'flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3' }, [
      h('p', { class: 'text-sm font-semibold text-slate-800' }, props.active ? props.activeText : props.inactiveText),
      h('button', {
        type: 'button',
        class: `inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${props.active ? (props.color === 'green' ? 'bg-green-600 focus:ring-green-500' : 'bg-blue-600 focus:ring-blue-500') : 'bg-slate-300 focus:ring-slate-400'}`,
        'aria-pressed': props.active,
        onClick: () => emit('toggle'),
      }, [
        h('span', { class: `block h-5 w-5 rounded-full bg-white shadow transition-transform ${props.active ? 'translate-x-5' : 'translate-x-0'}` }),
      ]),
    ])
  },
})

const RadioCard = defineComponent({
  props: {
    modelValue: String,
    value: String,
    title: String,
    description: String,
    color: { type: String, default: 'blue' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => {
      const active = props.modelValue === props.value
      const activeClass = props.color === 'green' ? 'border-green-300 bg-green-50' : 'border-blue-300 bg-blue-50'
      return h('label', {
        class: `flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${active ? activeClass : 'border-slate-200 bg-white hover:border-slate-300'}`,
      }, [
        h('input', {
          type: 'radio',
          class: 'mt-1',
          value: props.value,
          checked: active,
          onChange: () => emit('update:modelValue', props.value),
        }),
        h('span', [
          h('span', { class: 'block text-sm font-semibold text-slate-800' }, props.title),
          h('span', { class: 'mt-0.5 block text-xs text-slate-500' }, props.description),
        ]),
      ])
    }
  },
})

const loading = ref(false)
const saving = ref(false)
const manualRunning = ref(false)
const manualVisitRunning = ref(false)
const loadError = ref(false)
const message = ref('')
const messageType = ref('success')
const originalSnapshot = ref('')

const meta = reactive({
  next_auto_create_at: null,
  last_auto_create_at: null,
  last_auto_create_checked_at: null,
  last_auto_create_created_count: 0,
  last_auto_create_unassigned_count: 0,
  last_auto_create_error: null,
  unassigned_followup_count: 0,
})

const form = reactive({
  enabled: false,
  auto_create_enabled: true,
  default_call_interval_days: 30,
  auto_create_time: '08:00',
  assignment_mode: 'primary',
  no_owner_action: 'queue',
  no_answer_max_attempts_per_day: 3,
  no_answer_retry_minutes: 30,
  business_start_time: '08:30',
  business_end_time: '17:30',
  visit_enabled: false,
  visit_auto_create_enabled: true,
  default_visit_interval_days: 30,
  visit_auto_create_time: '08:00',
})

const isDirty = computed(() => !!originalSnapshot.value && originalSnapshot.value !== JSON.stringify(buildPayload()))

function buildPayload() {
  return {
    enabled: !!form.enabled,
    auto_create_enabled: !!form.auto_create_enabled,
    default_call_interval_days: Number(form.default_call_interval_days || 30),
    auto_create_time: toHHMM(form.auto_create_time, '08:00'),
    assignment_mode: form.assignment_mode,
    no_owner_action: form.no_owner_action,
    no_answer_max_attempts_per_day: Number(form.no_answer_max_attempts_per_day || 3),
    no_answer_retry_minutes: Number(form.no_answer_retry_minutes || 30),
    business_start_time: toHHMM(form.business_start_time, '08:30'),
    business_end_time: toHHMM(form.business_end_time, '17:30'),
    visit_enabled: !!form.visit_enabled,
    visit_auto_create_enabled: !!form.visit_auto_create_enabled,
    default_visit_interval_days: Number(form.default_visit_interval_days || 30),
    visit_auto_create_time: toHHMM(form.visit_auto_create_time, '08:00'),
  }
}

function applySettings(data) {
  form.enabled = !!data.enabled
  form.auto_create_enabled = !!data.auto_create_enabled
  form.default_call_interval_days = Number(data.default_call_interval_days || 30)
  form.auto_create_time = toHHMM(data.auto_create_time, '08:00')
  form.assignment_mode = data.assignment_mode || 'primary'
  form.no_owner_action = data.no_owner_action || 'queue'
  form.no_answer_max_attempts_per_day = Number(data.no_answer_max_attempts_per_day || 3)
  form.no_answer_retry_minutes = Number(data.no_answer_retry_minutes || 30)
  form.business_start_time = toHHMM(data.business_start_time, '08:30')
  form.business_end_time = toHHMM(data.business_end_time, '17:30')
  form.visit_enabled = !!data.visit_enabled
  form.visit_auto_create_enabled = !!data.visit_auto_create_enabled
  form.default_visit_interval_days = Number(data.default_visit_interval_days || 30)
  form.visit_auto_create_time = toHHMM(data.visit_auto_create_time, '08:00')
  meta.next_auto_create_at = data.next_auto_create_at || null
  meta.last_auto_create_at = data.last_auto_create_at || null
  meta.last_auto_create_checked_at = data.last_auto_create_checked_at || null
  meta.last_auto_create_created_count = Number(data.last_auto_create_created_count || 0)
  meta.last_auto_create_unassigned_count = Number(data.last_auto_create_unassigned_count || 0)
  meta.last_auto_create_error = data.last_auto_create_error || null
  meta.unassigned_followup_count = Number(data.unassigned_followup_count || 0)
  originalSnapshot.value = JSON.stringify(buildPayload())
}

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  const date = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', timeZone: 'Asia/Bangkok' })
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' })
  return `${date} ${time}`
}

function toHHMM(value, fallback = '08:00') {
  const raw = String(value || '').trim()
  const compact = raw.replace(/[^\d]/g, '')
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) return raw
  if (compact.length === 3) {
    const time = `${compact.slice(0, 1).padStart(2, '0')}:${compact.slice(1, 3)}`
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return time
  }
  if (compact.length >= 4) {
    const time = `${compact.slice(0, 2)}:${compact.slice(2, 4)}`
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return time
  }
  return fallback
}

function isHHMM(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '').trim())
}

function normalizeFormTime(field, fallback) {
  form[field] = toHHMM(form[field], fallback)
}

function validateForm() {
  const errors = []
  if (!Number.isInteger(Number(form.default_call_interval_days)) || form.default_call_interval_days < 1 || form.default_call_interval_days > 365) {
    errors.push('รอบโทรติดตามต้องอยู่ระหว่าง 1-365 วัน')
  }
  if (!Number.isInteger(Number(form.no_answer_max_attempts_per_day)) || form.no_answer_max_attempts_per_day < 1 || form.no_answer_max_attempts_per_day > 10) {
    errors.push('จำนวนโทรซ้ำต่อวันต้องอยู่ระหว่าง 1-10 ครั้ง')
  }
  if (!Number.isInteger(Number(form.no_answer_retry_minutes)) || form.no_answer_retry_minutes < 5 || form.no_answer_retry_minutes > 480) {
    errors.push('ระยะห่างโทรซ้ำต้องอยู่ระหว่าง 5-480 นาที')
  }
  if (!isHHMM(form.auto_create_time)) errors.push('เวลาสร้างงานต้องเป็นรูปแบบ HH:mm')
  if (!isHHMM(form.business_start_time) || !isHHMM(form.business_end_time)) errors.push('เวลาทำงานต้องเป็นรูปแบบ HH:mm')
  if (!form.business_start_time || !form.business_end_time || form.business_start_time >= form.business_end_time) {
    errors.push('เวลาเริ่มทำงานต้องน้อยกว่าเวลาสิ้นสุดทำงาน')
  }
  if (!Number.isInteger(Number(form.default_visit_interval_days)) || form.default_visit_interval_days < 1 || form.default_visit_interval_days > 365) {
    errors.push('รอบเยี่ยมต้องอยู่ระหว่าง 1-365 วัน')
  }
  if (!isHHMM(form.visit_auto_create_time)) errors.push('เวลาสร้างงานเยี่ยมต้องเป็นรูปแบบ HH:mm')
  return errors
}

async function load() {
  loading.value = true
  loadError.value = false
  message.value = ''
  try {
    const { data } = await api.get('/followup-settings')
    applySettings(data)
  } catch (err) {
    loadError.value = true
    messageType.value = 'error'
    message.value = err.response?.data?.error || err.message
  } finally {
    loading.value = false
  }
}

async function save() {
  const errors = validateForm()
  if (errors.length) {
    messageType.value = 'error'
    message.value = errors.join(' / ')
    return
  }

  saving.value = true
  message.value = ''
  try {
    const { data } = await api.put('/followup-settings', buildPayload())
    applySettings(data)
    messageType.value = 'success'
    message.value = 'บันทึก Follow-up Policy แล้ว'
  } catch (err) {
    messageType.value = 'error'
    message.value = err.response?.data?.error || err.message
  } finally {
    saving.value = false
  }
}

async function runNow() {
  if (isDirty.value) {
    messageType.value = 'error'
    message.value = 'กรุณาบันทึกการตั้งค่าก่อนสร้าง Follow-up'
    return
  }
  manualRunning.value = true
  message.value = ''
  try {
    const { data } = await api.post('/followup-settings/run-now')
    if (data.settings) applySettings(data.settings)
    messageType.value = data.error ? 'error' : 'success'
    message.value = data.error
      ? `สร้าง ${data.created_count || 0} งาน แต่พบปัญหา: ${data.error}`
      : `สร้าง Follow-up โทร ${data.created_count || 0} งาน จากรายการครบกำหนด ${data.eligible_count || 0} รายการ`
  } catch (err) {
    messageType.value = 'error'
    message.value = err.response?.data?.error || err.message
  } finally {
    manualRunning.value = false
  }
}

async function runNowVisit() {
  if (isDirty.value) {
    messageType.value = 'error'
    message.value = 'กรุณาบันทึกการตั้งค่าก่อนสร้างงานเยี่ยม'
    return
  }
  manualVisitRunning.value = true
  message.value = ''
  try {
    const { data } = await api.post('/followup-settings/run-now-visit')
    if (data.settings) applySettings(data.settings)
    messageType.value = data.error ? 'error' : 'success'
    message.value = data.error
      ? `สร้าง ${data.created_count || 0} งาน แต่พบปัญหา: ${data.error}`
      : `สร้างงานเยี่ยม ${data.created_count || 0} งาน จากรายการครบกำหนด ${data.eligible_count || 0} รายการ`
  } catch (err) {
    messageType.value = 'error'
    message.value = err.response?.data?.error || err.message
  } finally {
    manualVisitRunning.value = false
  }
}

load()
</script>
