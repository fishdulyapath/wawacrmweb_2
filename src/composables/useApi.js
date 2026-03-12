import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000
})

// Response interceptor — handle 401 auto logout
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token')
      localStorage.removeItem('crm_user')
      delete api.defaults.headers.common['Authorization']
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    const msg = err.response?.data?.error || err.message || 'เกิดข้อผิดพลาด'
    return Promise.reject(new Error(msg))
  }
)

export default api
