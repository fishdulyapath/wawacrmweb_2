import { computed } from 'vue'
import { useAuthStore } from '../stores/auth.js'

/**
 * สิทธิ์การใช้งาน CRM Activities
 *
 * ผู้ดูแล (admin, manager, supervisor) — สร้าง + แก้ไขได้
 * พนักงาน (sales_rep, อื่นๆ)          — ดู + ปิดงานได้
 * superadmin (code = SUPERADMIN)       — ทะลุทุกสิทธิ์
 */
export function usePermissions() {
  const auth = useAuthStore()

  const isSuperAdmin = computed(() =>
    auth.user?.code?.toUpperCase() === 'SUPERADMIN'
  )

  const isManager = computed(() =>
    isSuperAdmin.value ||
    ['admin', 'manager', 'supervisor'].includes(auth.user?.role)
  )

  // สร้างกิจกรรมใหม่ได้
  const canCreate = computed(() => isManager.value)

  // แก้ไขกิจกรรมได้
  const canEdit = computed(() => isManager.value)

  // ปิดงาน / เลื่อนได้ (ทุกคน)
  const canClose = computed(() => true)

  return { isSuperAdmin, isManager, canCreate, canEdit, canClose }
}
