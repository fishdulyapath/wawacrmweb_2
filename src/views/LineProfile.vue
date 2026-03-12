<template>
  <div class="p-6 max-w-xl mx-auto">

    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-800">LINE Profile</h1>
      <p class="text-sm text-slate-500 mt-0.5">เชื่อมต่อ LINE กับบัญชีพนักงาน</p>
    </div>

    <div v-if="loading" class="py-12 text-center text-slate-400">กำลังโหลด...</div>

    <template v-else>

      <!-- สถานะ LINE -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 class="text-sm font-semibold text-slate-700 mb-4">สถานะการเชื่อมต่อ LINE</h2>

        <!-- เชื่อมแล้ว -->
        <div v-if="lineStatus.linked" class="flex items-center gap-4">
          <img v-if="lineStatus.picture_url" :src="lineStatus.picture_url"
            class="w-14 h-14 rounded-full object-cover border-2 border-green-300" />
          <div v-else class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">👤</div>
          <div class="flex-1">
            <p class="font-semibold text-slate-800">{{ lineStatus.display_name || '—' }}</p>
            <p class="text-xs text-slate-500 mt-0.5">เชื่อมต่อเมื่อ {{ formatDate(lineStatus.linked_at) }}</p>
            <span class="inline-flex items-center gap-1 mt-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
              <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> เชื่อมต่อแล้ว
            </span>
          </div>
          <button @click="unlinkLine"
            class="text-sm text-red-500 hover:text-red-700 font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            ยกเลิก
          </button>
        </div>

        <!-- ยังไม่เชื่อม -->
        <div v-else class="text-center py-4">
          <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-3">💬</div>
          <p class="text-slate-600 font-medium mb-1">ยังไม่ได้เชื่อมต่อ LINE</p>
          <p class="text-sm text-slate-400 mb-4">เชื่อมต่อเพื่อรับการแจ้งเตือนผ่าน LINE</p>
          <button @click="generateOtp"
            :disabled="generating"
            class="bg-[#06C755] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#05b54c] disabled:opacity-50 transition-colors">
            {{ generating ? 'กำลังสร้าง OTP...' : 'เชื่อมต่อ LINE' }}
          </button>
        </div>
      </div>

      <!-- OTP Box -->
      <div v-if="otp" class="bg-white rounded-xl border-2 border-[#06C755] p-5 mb-4">
        <h2 class="text-sm font-semibold text-slate-700 mb-3">รหัส OTP สำหรับผูก LINE</h2>
        <div class="text-center">
          <p class="text-5xl font-bold tracking-widest text-slate-800 font-mono mb-2">{{ otp }}</p>
          <p class="text-sm text-slate-500 mb-4">
            หมดอายุใน <span class="font-semibold text-orange-500">{{ otpCountdown }}</span> วินาที
          </p>
          <div class="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 text-left space-y-1">
            <p>1. เพิ่ม LINE Bot <strong>{{ botId }}</strong> เป็นเพื่อน</p>
            <p>2. ส่งข้อความ OTP นี้ไปใน LINE Chat</p>
            <p>3. รอรับข้อความยืนยัน</p>
          </div>
          <div class="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span class="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            กำลังรอการเชื่อมต่อ...
          </div>
        </div>
      </div>

      <!-- การตั้งค่าแจ้งเตือน -->
      <div v-if="lineStatus.linked" class="bg-white rounded-xl border border-slate-200 p-5">
        <h2 class="text-sm font-semibold text-slate-700 mb-4">ตั้งค่าการแจ้งเตือน</h2>

        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm font-medium text-slate-700">รับแจ้งเตือนสรุปงานประจำวัน</p>
            <p class="text-xs text-slate-400">LINE จะส่งสรุปงานตามเวลาที่ตั้ง</p>
          </div>
          <button @click="settings.notify_enabled = !settings.notify_enabled"
            :class="settings.notify_enabled ? 'bg-blue-600' : 'bg-slate-200'"
            class="relative inline-flex w-11 h-6 rounded-full transition-colors">
            <span :class="settings.notify_enabled ? 'translate-x-5' : 'translate-x-0.5'"
              class="inline-block w-5 h-5 mt-0.5 bg-white rounded-full shadow transition-transform"></span>
          </button>
        </div>

        <div v-if="settings.notify_enabled">
          <label class="block text-sm font-medium text-slate-700 mb-1">เวลาที่ต้องการรับ</label>
          <input v-model="settings.notify_time" type="time"
            class="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <button @click="saveSettings" :disabled="savingSettings"
          class="mt-4 w-full bg-slate-800 text-white py-2 rounded-xl text-sm font-medium hover:bg-slate-900 disabled:opacity-50 transition-colors">
          {{ savingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
        </button>

        <p v-if="saveMsg" class="text-sm text-green-600 text-center mt-2">{{ saveMsg }}</p>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import api from '../composables/useApi.js'

const loading = ref(true)
const generating = ref(false)
const savingSettings = ref(false)
const saveMsg = ref('')

const lineStatus = reactive({
  linked: false,
  display_name: '',
  picture_url: '',
  linked_at: null,
  notify_enabled: false,
  notify_time: '08:00',
})
const settings = reactive({ notify_enabled: false, notify_time: '08:00' })
const otp = ref('')
const otpCountdown = ref(600)
const botId = import.meta.env.VITE_LINE_BOT_ID || '@WAWACRM'
let countdownTimer = null
let pollTimer = null

async function loadStatus() {
  try {
    const { data } = await api.get('/line/status')
    Object.assign(lineStatus, {
      linked: data.linked,
      display_name: data.line_display_name,
      picture_url: data.line_picture_url,
      linked_at: data.line_linked_at,
      notify_enabled: data.notify_enabled,
      notify_time: data.notify_time || '08:00',
    })
    settings.notify_enabled = lineStatus.notify_enabled
    settings.notify_time = lineStatus.notify_time
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function generateOtp() {
  generating.value = true
  try {
    const { data } = await api.post('/line/generate-otp')
    otp.value = data.otp
    otpCountdown.value = 600
    startCountdown()
    startPolling()
  } catch (err) {
    alert(err.response?.data?.error || 'เกิดข้อผิดพลาด')
  } finally {
    generating.value = false
  }
}

function startCountdown() {
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    otpCountdown.value--
    if (otpCountdown.value <= 0) {
      clearInterval(countdownTimer)
      otp.value = ''
      stopPolling()
    }
  }, 1000)
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const { data } = await api.get('/line/status')
      if (data.linked) {
        otp.value = ''
        clearInterval(countdownTimer)
        stopPolling()
        Object.assign(lineStatus, {
          linked: true,
          display_name: data.line_display_name,
          picture_url: data.line_picture_url,
          linked_at: data.line_linked_at,
          notify_enabled: data.notify_enabled,
          notify_time: data.notify_time || '08:00',
        })
        settings.notify_enabled = data.notify_enabled
        settings.notify_time = data.notify_time || '08:00'
      }
    } catch {}
  }, 3000)
}

function stopPolling() {
  clearInterval(pollTimer)
  pollTimer = null
}

async function unlinkLine() {
  if (!confirm('ยืนยันการยกเลิกเชื่อมต่อ LINE ?')) return
  await api.post('/line/unlink')
  lineStatus.linked = false
  otp.value = ''
}

async function saveSettings() {
  savingSettings.value = true
  saveMsg.value = ''
  try {
    await api.put('/line/settings', {
      notify_enabled: settings.notify_enabled,
      notify_time: settings.notify_time,
    })
    saveMsg.value = 'บันทึกเรียบร้อย'
    setTimeout(() => saveMsg.value = '', 3000)
  } catch (err) {
    alert(err.response?.data?.error || 'เกิดข้อผิดพลาด')
  } finally {
    savingSettings.value = false
  }
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(loadStatus)
onUnmounted(() => {
  clearInterval(countdownTimer)
  stopPolling()
})
</script>
