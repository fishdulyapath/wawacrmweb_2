import { ref } from 'vue'

const liffId = import.meta.env.VITE_LIFF_ID || ''
const isLiffReady = ref(false)
const liffProfile = ref(null)
const liffError = ref(null)

export function useLiff() {
  async function initLiff() {
    if (isLiffReady.value) return true
    try {
      // โหลด LIFF SDK
      if (!window.liff) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
          s.onload = resolve
          s.onerror = reject
          document.head.appendChild(s)
        })
      }
      await window.liff.init({ liffId })
      if (!window.liff.isLoggedIn()) {
        window.liff.login()
        return false
      }
      liffProfile.value = await window.liff.getProfile()
      isLiffReady.value = true
      return true
    } catch (e) {
      liffError.value = e.message
      console.error('[LIFF Error]', e)
      // Development mode — ไม่มี LIFF ก็ทำงานได้
      isLiffReady.value = true
      return true
    }
  }

  function getLiffToken() {
    try {
      return window.liff?.getAccessToken?.() || null
    } catch {
      return null
    }
  }

  function closeLiff() {
    try { window.liff?.closeWindow?.() } catch {}
  }

  function isInLiff() {
    try { return window.liff?.isInClient?.() || false } catch { return false }
  }

  return { initLiff, getLiffToken, closeLiff, isInLiff, isLiffReady, liffProfile, liffError }
}
