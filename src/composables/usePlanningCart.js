import { computed, reactive, watch } from 'vue'

// ─────────────────────────────────────────────────────────────────────────────
// usePlanningCart — shared cart state สำหรับระบบวางแผนสั่งซื้อ
// เก็บใน localStorage (crm_pr_cart) เพื่อให้รีเฟรช/เปลี่ยนหน้าแล้วของไม่หาย
// key ของแต่ละ item = (ic_code + ap_code) → รองรับสินค้าเดียวหลายเจ้าหนี้
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'crm_pr_cart'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// shared state (singleton ทั้ง app)
const cart = reactive(loadFromStorage())

// persist ลง localStorage ทุกครั้งที่ cart เปลี่ยน
watch(
  () => JSON.parse(JSON.stringify(cart)),
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch {
      // ignore quota/serialization errors
    }
  },
  { deep: true },
)

function cartKey(ic_code, ap_code) {
  return `${ic_code}::${ap_code}`
}

function roundQuantity(value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 1000000) / 1000000
}

function ceilQuantity(value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num) || num <= 0) return 0
  const nearestInt = Math.round(num)
  if (Math.abs(num - nearestInt) < 0.000001) return nearestInt
  return Math.ceil(num)
}

function itemRatio(item) {
  const selectedUnit = (item.units || []).find((u) => u.unit_code === (item.selected_unit || item.unit_code))
  return Number(item.unit_ratio || selectedUnit?.ratio || 1) || 1
}

function ensureBaseQty(item) {
  const existing = Number(item.base_qty)
  if (Number.isFinite(existing) && existing >= 0) return existing
  const selectedUnitCode = String(item.selected_unit || '')
  const baseUnitCode = String(item.unit_code || '')
  const suggestedQty = Number(item.suggest_qty)
  if (selectedUnitCode && baseUnitCode && selectedUnitCode !== baseUnitCode && Number.isFinite(suggestedQty) && suggestedQty > 0) {
    item.base_qty = roundQuantity(suggestedQty)
    return Number(item.base_qty || 0)
  }
  item.base_qty = roundQuantity(Number(item.qty || 0) * itemRatio(item))
  return Number(item.base_qty || 0)
}

function addToCart(item) {
  const icCode = String(item.ic_code || '').trim()
  const apCode = String(item.ap_code || '').trim()
  if (!icCode || !apCode) return
  const key = cartKey(icCode, apCode)
  const existing = cart.find((c) => cartKey(c.ic_code, c.ap_code) === key)
  if (existing) {
    // มีอยู่แล้ว → บวก qty (เก็บจำนวนสูงสุดระหว่างเดิมกับใหม่ เพื่อไม่ให้ทับ)
    const existingRatio = itemRatio(existing)
    const addRatio = Number(item.unit_ratio || 1) || 1
    const addBaseQty = item.base_qty !== undefined && item.base_qty !== null
      ? Number(item.base_qty || 0)
      : Number(item.qty || 0) * addRatio
    existing.base_qty = roundQuantity(ensureBaseQty(existing) + addBaseQty)
    existing.qty = ceilQuantity(Number(existing.base_qty || 0) / existingRatio)
    existing.price = 0
  } else {
    const initialRatio = Number(item.unit_ratio || 1) || 1
    const baseQty = roundQuantity(
      item.base_qty !== undefined && item.base_qty !== null
        ? Number(item.base_qty || 0)
        : Number(item.qty || 0) * initialRatio,
    )
    cart.push({
      ic_code: icCode,
      ic_name: String(item.ic_name || '').trim(),
      unit_code: String(item.unit_code || '').trim(),
      ap_code: apCode,
      ap_name: String(item.ap_name || '').trim(),
      qty: ceilQuantity(baseQty / initialRatio),
      base_qty: baseQty,
      price: 0,
      suggest_qty: Number(item.suggest_qty || item.qty || 0),
      // หน่วยนับที่รองรับ + หน่วยที่เลือก + ratio (จะถูก set ทีหลังผ่าน setUnits)
      units: Array.isArray(item.units) ? item.units : [{ unit_code: String(item.unit_code || ''), ratio: 1, is_base: true }],
      selected_unit: String(item.unit_code || ''),
      unit_ratio: initialRatio,
      added_at: Date.now(),
    })
  }
}

// ตั้งค่าหน่วยนับที่รองรับทั้งหมดของรายการ (เรียกหลังดึง units จาก backend)
function setUnits(ic_code, ap_code, units) {
  const key = cartKey(ic_code, ap_code)
  const item = cart.find((c) => cartKey(c.ic_code, c.ap_code) === key)
  if (!item) return
  ensureBaseQty(item)
  item.units = units.length ? units : [{ unit_code: item.unit_code, ratio: 1, is_base: true }]
  // ถ้ายังไม่ได้เลือกหน่วย หรือเลือกไว้ไม่มีใน list → ใช้หน่วยหลัก
  const hasSelected = item.units.some((u) => u.unit_code === item.selected_unit)
  if (!hasSelected) {
    const base = item.units.find((u) => u.is_base) || item.units[0]
    item.selected_unit = base.unit_code
  }
  const selectedUnit = item.units.find((u) => u.unit_code === item.selected_unit) || item.units[0]
  item.unit_ratio = Number(selectedUnit?.ratio) || 1
  item.qty = ceilQuantity(Number(item.base_qty || 0) / item.unit_ratio)
  item.price = 0
}

// เปลี่ยนหน่วยนับของรายการ โดยใช้ base_qty เดิมและปัดจำนวนขึ้นเมื่อมีเศษ
function updateUnit(ic_code, ap_code, newUnitCode) {
  const key = cartKey(ic_code, ap_code)
  const item = cart.find((c) => cartKey(c.ic_code, c.ap_code) === key)
  if (!item) return
  const newUnit = (item.units || []).find((u) => u.unit_code === newUnitCode)
  if (!newUnit) return
  const newRatio = Number(newUnit.ratio) || 1
  const baseQty = ensureBaseQty(item)
  item.qty = ceilQuantity(baseQty / newRatio)
  item.price = 0
  item.selected_unit = newUnitCode
  item.unit_ratio = newRatio
}

function removeFromCart(ic_code, ap_code) {
  const key = cartKey(ic_code, ap_code)
  for (let i = cart.length - 1; i >= 0; i--) {
    if (cartKey(cart[i].ic_code, cart[i].ap_code) === key) {
      cart.splice(i, 1)
      break
    }
  }
}

function updateQty(ic_code, ap_code, qty) {
  const key = cartKey(ic_code, ap_code)
  const item = cart.find((c) => cartKey(c.ic_code, c.ap_code) === key)
  if (item) {
    item.qty = Number(qty) || 0
    item.base_qty = roundQuantity(Number(item.qty || 0) * itemRatio(item))
  }
}

function clearCart() {
  cart.splice(0, cart.length)
}

const cartCount = computed(() => cart.length)

// จัดกลุ่มตามเจ้าหนี้ → { ap_code, ap_name, items: [...] }
const cartGroups = computed(() => {
  const map = new Map()
  for (const item of cart) {
    const key = item.ap_code
    if (!map.has(key)) {
      map.set(key, {
        ap_code: item.ap_code,
        ap_name: item.ap_name,
        items: [],
      })
    }
    const g = map.get(key)
    g.items.push(item)
  }
  return Array.from(map.values())
})

export function usePlanningCart() {
  return {
    cart,
    cartCount,
    cartGroups,
    addToCart,
    setUnits,
    updateUnit,
    removeFromCart,
    updateQty,
    clearCart,
  }
}
