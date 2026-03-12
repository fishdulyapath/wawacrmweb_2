import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../composables/useApi.js'

export const useAuthStore = defineStore('auth', () => {
  const token   = ref(localStorage.getItem('crm_token') || null)
  const user    = ref(JSON.parse(localStorage.getItem('crm_user') || 'null'))
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  // ตั้ง token ใน axios headers
  if (token.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  async function login(code, password) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', { code, password })
      token.value = data.token
      user.value  = data.user
      localStorage.setItem('crm_token',         data.token)
      localStorage.setItem('crm_user',           JSON.stringify(data.user))
      localStorage.setItem('crm_refresh_token',  data.refresh_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {}
    token.value = null
    user.value  = null
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    delete api.defaults.headers.common['Authorization']
  }

  async function refreshToken() {
    const refresh = localStorage.getItem('crm_refresh_token')
    if (!refresh) return false
    try {
      const { data } = await api.post('/auth/refresh', { refresh_token: refresh })
      token.value = data.token
      localStorage.setItem('crm_token', data.token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      return true
    } catch {
      await logout()
      return false
    }
  }

  return { token, user, loading, isLoggedIn, login, logout, refreshToken }
})
