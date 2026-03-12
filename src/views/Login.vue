<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">

    <!-- Background pattern -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-sm">

      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
          <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">WAWA CRM</h1>
        <p class="text-slate-400 text-sm mt-1">ระบบ CRM</p>
      </div>

      <!-- Card -->
      <div class="bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
        <h2 class="text-lg font-semibold text-white mb-6">เข้าสู่ระบบ</h2>

        <!-- Error Alert -->
        <div v-if="errorMsg"
             class="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
          <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <p class="text-red-400 text-sm">{{ errorMsg }}</p>
        </div>

        <div class="space-y-4">
          <!-- Employee Code -->
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              รหัสพนักงาน
            </label>
            <input
              v-model="form.code"
              @keyup.enter="submit"
              type="text"
              autocomplete="username"
              placeholder="รหัสพนักงาน เช่น EMP001"
              :disabled="loading"
              class="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-xl text-white
                     placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              รหัสผ่าน
            </label>
            <div class="relative">
              <input
                v-model="form.password"
                @keyup.enter="submit"
                :type="showPass ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="รหัสผ่าน"
                :disabled="loading"
                class="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-xl text-white
                       placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:border-transparent transition-all pr-11 disabled:opacity-50"
              />
              <button type="button" @click="showPass = !showPass"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors">
                <svg v-if="!showPass" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Submit -->
          <button @click="submit" :disabled="loading || !form.code || !form.password"
                  class="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-semibold text-sm rounded-xl transition-all duration-150
                         flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-600/20">
            <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
          </button>
        </div>
      </div>

      <p class="text-center text-slate-600 text-xs mt-6">
        ใช้รหัสพนักงานจากระบบ POS
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router  = useRouter()
const auth    = useAuthStore()
const loading = ref(false)
const errorMsg = ref('')
const showPass = ref(false)

const form = reactive({ code: '', password: '' })

async function submit() {
  if (!form.code || !form.password || loading.value) return
  loading.value = true
  errorMsg.value = ''
  const result = await auth.login(form.code, form.password)
  loading.value = false
  if (result.success) {
    router.push('/notifications')
  } else {
    errorMsg.value = result.error
    form.password  = ''
  }
}
</script>
