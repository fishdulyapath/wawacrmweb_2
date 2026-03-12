import axios from 'axios'

// ใช้ VITE_API_URL สำหรับ LIFF ที่เปิดผ่าน external URL (เช่น ngrok)
// ถ้าไม่ตั้ง จะใช้ relative path ปกติ (ทำงานกับ Vite proxy / nginx proxy)
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const liffApi = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'ngrok-skip-browser-warning': '1'   // ข้าม ngrok interstitial page (free plan)
  }
})

// สถานะ LIFF auth
let liffAuthPromise = null
let liffAuthDone = false

/**
 * ดึง CRM token — ถ้ายังไม่มีจะพยายาม auto-auth ผ่าน LIFF
 */
function getToken() {
  // 1. จาก URL query ?token=xxx (ส่งมาตอน push message)
  const urlToken = new URLSearchParams(window.location.search).get('token')
  if (urlToken) {
    localStorage.setItem('crm_liff_token', urlToken)
    // ลบ query param ออกจาก URL ให้สะอาด
    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    window.history.replaceState({}, '', url.toString())
    return urlToken
  }
  // 2. จาก localStorage (ทั้ง web login และ LIFF auto-auth)
  return localStorage.getItem('crm_liff_token') || localStorage.getItem('crm_token')
}

/**
 * Auto-auth ด้วย LIFF Access Token
 * เรียก POST /api/auth/liff → ได้ CRM JWT → เก็บใน localStorage
 */
async function liffAutoAuth() {
  // ถ้าทำไปแล้ว ไม่ต้องทำซ้ำ
  if (liffAuthDone) return true

  // ถ้ามี token อยู่แล้วและยังใช้ได้ ไม่ต้อง auth ใหม่
  const existing = getToken()
  if (existing) {
    try {
      await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${existing}` },
        timeout: 5000
      })
      liffAuthDone = true
      return true
    } catch {
      // token หมดอายุ → ลบแล้วทำ LIFF auth ใหม่
      localStorage.removeItem('crm_liff_token')
    }
  }

  // ดึง LIFF Access Token
  try {
    if (!window.liff) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }

    const liffId = import.meta.env.VITE_LIFF_ID || ''
    if (!liffId) {
      console.warn('[LIFF Auth] ไม่มี VITE_LIFF_ID')
      return false
    }

    await window.liff.init({ liffId })

    if (!window.liff.isLoggedIn()) {
      // redirect ไปหน้า LINE login แล้วกลับมา
      window.liff.login({ redirectUri: window.location.href })
      return false // จะไม่ถึงบรรทัดนี้เพราะ redirect แล้ว
    }

    const liffAccessToken = window.liff.getAccessToken()
    if (!liffAccessToken) {
      console.warn('[LIFF Auth] ไม่ได้ LIFF Access Token')
      return false
    }

    // แลก LIFF token → CRM JWT
    const { data } = await axios.post(`${API_BASE}/auth/liff`, { liffAccessToken })
    localStorage.setItem('crm_liff_token', data.token)
    if (data.refresh_token) {
      localStorage.setItem('crm_liff_refresh', data.refresh_token)
    }
    liffAuthDone = true
    return true

  } catch (err) {
    console.error('[LIFF Auth Error]', err?.response?.data || err.message)
    return false
  }
}

/**
 * เรียก liffAutoAuth แบบ singleton (ป้องกันเรียกซ้อนกัน)
 */
function ensureLiffAuth() {
  if (!liffAuthPromise) {
    liffAuthPromise = liffAutoAuth().finally(() => {
      liffAuthPromise = null
    })
  }
  return liffAuthPromise
}

// ── Request Interceptor: ใส่ token + auto-auth ──
liffApi.interceptors.request.use(async config => {
  // ถ้ายังไม่มี token → พยายาม LIFF auto-auth ก่อน
  let token = getToken()
  if (!token) {
    await ensureLiffAuth()
    token = getToken()
  }
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// ── Response Interceptor: ถ้า 401 ลอง re-auth แล้ว retry ──
liffApi.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config
    if (err.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true
      // ลบ token เก่า
      localStorage.removeItem('crm_liff_token')
      liffAuthDone = false

      // ลอง auth ใหม่
      const ok = await ensureLiffAuth()
      if (ok) {
        const newToken = getToken()
        if (newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          return liffApi(originalRequest)
        }
      }
    }
    const msg = err.response?.data?.error || err.message || 'เกิดข้อผิดพลาด'
    return Promise.reject(new Error(msg))
  }
)

export { ensureLiffAuth }
export default liffApi
