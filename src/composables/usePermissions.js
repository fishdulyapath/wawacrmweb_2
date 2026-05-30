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

  // รายงาน KPI / audit — admin, manager เท่านั้น
  const canViewDashboards = computed(() =>
    isSuperAdmin.value ||
    ['admin', 'manager'].includes(auth.user?.role)
  )

  // รายงานยอดขาย + fleet — supervisor ขึ้นไป (ฝ่ายขาย + ผู้จัดการ + ผู้ดูแล)
  const canViewSalesFleet = computed(() =>
    isSuperAdmin.value ||
    ['admin', 'manager', 'supervisor'].includes(auth.user?.role)
  )

  const canManageFollowupPolicy = computed(() =>
    isSuperAdmin.value ||
    ['admin', 'manager'].includes(auth.user?.role)
  )

  // สร้างกิจกรรมใหม่ได้
  const canCreate = computed(() => isManager.value)

  // แก้ไขกิจกรรมได้
  const canEdit = computed(() => isManager.value)

  // ปิดงาน / เลื่อนได้ (ทุกคน)
  const canClose = computed(() => true)

  return { isSuperAdmin, isManager, canViewDashboards, canViewSalesFleet, canManageFollowupPolicy, canCreate, canEdit, canClose }
}
