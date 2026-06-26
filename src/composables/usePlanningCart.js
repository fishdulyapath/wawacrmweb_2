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

function addToCart(item) {
  const icCode = String(item.ic_code || '').trim()
  const apCode = String(item.ap_code || '').trim()
  if (!icCode || !apCode) return
  const key = cartKey(icCode, apCode)
  const existing = cart.find((c) => cartKey(c.ic_code, c.ap_code) === key)
  if (existing) {
    // มีอยู่แล้ว → บวก qty (เก็บจำนวนสูงสุดระหว่างเดิมกับใหม่ เพื่อไม่ให้ทับ)
    existing.qty = Number(existing.qty || 0) + Number(item.qty || 0)
    // อัปเดตราคาถ้าใหม่มีค่า
    if (item.price !== undefined && item.price !== null) existing.price = Number(item.price)
  } else {
    cart.push({
      ic_code: icCode,
      ic_name: String(item.ic_name || '').trim(),
      unit_code: String(item.unit_code || '').trim(),
      ap_code: apCode,
      ap_name: String(item.ap_name || '').trim(),
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
      suggest_qty: Number(item.suggest_qty || item.qty || 0),
      // หน่วยนับที่รองรับ + หน่วยที่เลือก + ratio (จะถูก set ทีหลังผ่าน setUnits)
      units: Array.isArray(item.units) ? item.units : [{ unit_code: String(item.unit_code || ''), ratio: 1, is_base: true }],
      selected_unit: String(item.unit_code || ''),
      unit_ratio: 1,
      added_at: Date.now(),
    })
  }
}

// ตั้งค่าหน่วยนับที่รองรับทั้งหมดของรายการ (เรียกหลังดึง units จาก backend)
function setUnits(ic_code, ap_code, units) {
  const key = cartKey(ic_code, ap_code)
  const item = cart.find((c) => cartKey(c.ic_code, c.ap_code) === key)
  if (!item) return
  item.units = units.length ? units : [{ unit_code: item.unit_code, ratio: 1, is_base: true }]
  // ถ้ายังไม่ได้เลือกหน่วย หรือเลือกไว้ไม่มีใน list → ใช้หน่วยหลัก
  const hasSelected = item.units.some((u) => u.unit_code === item.selected_unit)
  if (!hasSelected) {
    const base = item.units.find((u) => u.is_base) || item.units[0]
    item.selected_unit = base.unit_code
    item.unit_ratio = Number(base.ratio) || 1
  }
}

// เปลี่ยนหน่วยนับของรายการ → แปลง qty/price ให้ตรงกับหน่วยใหม่
function updateUnit(ic_code, ap_code, newUnitCode) {
  const key = cartKey(ic_code, ap_code)
  const item = cart.find((c) => cartKey(c.ic_code, c.ap_code) === key)
  if (!item) return
  const oldRatio = Number(item.unit_ratio) || 1
  const newUnit = (item.units || []).find((u) => u.unit_code === newUnitCode)
  if (!newUnit) return
  const newRatio = Number(newUnit.ratio) || 1
  // แปลง qty + price จากหน่วยเดิม → หน่วยใหม่ (ผ่านหน่วยหลัก)
  // qty_new = qty_old * oldRatio / newRatio, price_new = price_old * newRatio / oldRatio
  const baseQty = Number(item.qty || 0) * oldRatio
  const basePrice = Number(item.price || 0) / oldRatio
  item.qty = Math.round((baseQty / newRatio) * 100) / 100
  item.price = Math.round((basePrice * newRatio) * 100) / 100
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
  if (item) item.qty = Number(qty) || 0
}

function updatePrice(ic_code, ap_code, price) {
  const key = cartKey(ic_code, ap_code)
  const item = cart.find((c) => cartKey(c.ic_code, c.ap_code) === key)
  if (item) item.price = Number(price) || 0
}

function clearCart() {
  cart.splice(0, cart.length)
}

const cartCount = computed(() => cart.length)

// จัดกลุ่มตามเจ้าหนี้ → { ap_code, ap_name, items: [...], subtotal }
const cartGroups = computed(() => {
  const map = new Map()
  for (const item of cart) {
    const key = item.ap_code
    if (!map.has(key)) {
      map.set(key, {
        ap_code: item.ap_code,
        ap_name: item.ap_name,
        items: [],
        subtotal: 0,
      })
    }
    const g = map.get(key)
    g.items.push(item)
    g.subtotal += Number(item.qty || 0) * Number(item.price || 0)
  }
  // ปัด subtotal 2 ทศนิยม
  for (const g of map.values()) g.subtotal = Math.round(g.subtotal * 100) / 100
  return Array.from(map.values())
})

// ยอดรวมทั้งตะกร้า
const cartTotal = computed(() =>
  Math.round(cartGroups.value.reduce((sum, g) => sum + g.subtotal, 0) * 100) / 100,
)

export function usePlanningCart() {
  return {
    cart,
    cartCount,
    cartGroups,
    cartTotal,
    addToCart,
    setUnits,
    updateUnit,
    removeFromCart,
    updateQty,
    updatePrice,
    clearCart,
  }
}
