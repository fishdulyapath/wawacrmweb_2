import { computed, reactive, ref } from 'vue'
import api from './useApi.js'

const cart = reactive([])
const createdPrItems = reactive([])
const currentUserId = ref(null)
const currentUserCode = ref('')
const cartLoading = ref(false)
const cartError = ref('')

function cartKey(icCode, apCode) {
  return `${String(icCode || '').trim()}::${String(apCode || '').trim()}`
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

function normalizeUnit(unit, fallbackUnitCode = '') {
  if (!unit || typeof unit !== 'object') {
    return { unit_code: String(fallbackUnitCode || ''), ratio: 1, stand_value: 1, divide_value: 1, is_base: true }
  }
  const stand = Number(unit.stand_value ?? unit.ratio ?? 1) || 1
  const divide = Number(unit.divide_value ?? 1) || 1
  return {
    ...unit,
    unit_code: String(unit.unit_code || fallbackUnitCode || '').trim(),
    ratio: Number(unit.ratio ?? (stand / divide) ?? 1) || 1,
    stand_value: stand,
    divide_value: divide,
    is_base: Boolean(unit.is_base),
  }
}

function normalizeCartItem(row) {
  const icCode = String(row.item_code ?? row.ic_code ?? '').trim()
  const apCode = String(row.ap_code ?? '').trim()
  const unitCode = String(row.unit_code ?? '').trim()
  const selectedUnit = String(row.selected_unit ?? row.selected_unit_code ?? unitCode).trim()
  const unitRatio = Number(row.unit_ratio ?? 1) || 1
  const units = Array.isArray(row.units) && row.units.length
    ? row.units.map((unit) => normalizeUnit(unit, unitCode))
    : [normalizeUnit({ unit_code: selectedUnit || unitCode, ratio: unitRatio, is_base: true }, unitCode)]

  return {
    id: row.id ?? null,
    ic_code: icCode,
    ic_name: String(row.item_name ?? row.ic_name ?? '').trim(),
    unit_code: unitCode,
    ap_code: apCode,
    ap_name: String(row.ap_name ?? '').trim(),
    qty: Number(row.qty ?? 0) || 0,
    base_qty: Number(row.base_qty ?? row.qty ?? 0) || 0,
    price: Number(row.price ?? 0) || 0,
    reference_unit_code: String(row.reference_unit_code ?? '').trim(),
    reference_price: Number(row.reference_price ?? 0) || 0,
    tax_type: Number(row.tax_type ?? row.item_tax_type ?? 0) || 0,
    suggest_qty: Number(row.suggest_qty ?? 0) || 0,
    units,
    selected_unit: selectedUnit || unitCode,
    unit_ratio: unitRatio,
    user_id: row.user_id ?? null,
    user_code: String(row.user_code ?? '').trim(),
    user_name: String(row.user_name ?? '').trim(),
    cart_color: String(row.cart_color ?? '#dc2626').trim() || '#dc2626',
    is_owner: Boolean(row.is_owner),
    status: String(row.status ?? 'active'),
    pr_doc_no: String(row.pr_doc_no ?? '').trim(),
    added_at: row.created_at || Date.now(),
    updated_at: row.updated_at || null,
  }
}

function replaceCart(rows) {
  cart.splice(0, cart.length, ...(Array.isArray(rows) ? rows.map(normalizeCartItem) : []))
}

function replaceCreatedPrItems(rows) {
  createdPrItems.splice(0, createdPrItems.length, ...(Array.isArray(rows) ? rows.map(normalizeCartItem) : []))
}

function findCartItem(icCode, apCode) {
  const key = cartKey(icCode, apCode)
  return cart.find((item) => cartKey(item.ic_code, item.ap_code) === key)
}

function itemRatio(item) {
  const selectedUnit = (item.units || []).find((unit) => unit.unit_code === (item.selected_unit || item.unit_code))
  return Number(item.unit_ratio || selectedUnit?.ratio || 1) || 1
}

function ensureBaseQty(item) {
  const existing = Number(item.base_qty)
  if (Number.isFinite(existing) && existing >= 0) return existing
  item.base_qty = roundQuantity(Number(item.qty || 0) * itemRatio(item))
  return Number(item.base_qty || 0)
}

async function loadCart() {
  cartLoading.value = true
  cartError.value = ''
  try {
    const { data } = await api.get('/purchase-planning/cart')
    currentUserId.value = data.current_user_id ?? null
    currentUserCode.value = String(data.current_user_code ?? '')
    replaceCart(data.data || [])
    replaceCreatedPrItems(data.created_pr || [])
    return data
  } catch (err) {
    cartError.value = err.response?.data?.error || err.message || 'load cart failed'
    throw err
  } finally {
    cartLoading.value = false
  }
}

async function addToCart(item) {
  const icCode = String(item.ic_code || item.item_code || '').trim()
  const apCode = String(item.ap_code || '').trim()
  if (!icCode || !apCode) return null
  const initialRatio = Number(item.unit_ratio || 1) || 1
  const baseQty = roundQuantity(
    item.base_qty !== undefined && item.base_qty !== null
      ? Number(item.base_qty || 0)
      : Number(item.qty || 0) * initialRatio,
  )
  const payload = {
    item_code: icCode,
    item_name: String(item.ic_name || item.item_name || '').trim(),
    unit_code: String(item.unit_code || '').trim(),
    ap_code: apCode,
    ap_name: String(item.ap_name || '').trim(),
    qty: ceilQuantity(baseQty / initialRatio),
    base_qty: baseQty,
    price: Number(item.price || 0),
    suggest_qty: Number(item.suggest_qty || item.qty || 0),
    reference_unit_code: String(item.reference_unit_code || '').trim(),
    reference_price: Number(item.reference_price || 0),
    tax_type: Number(item.tax_type ?? item.item_tax_type ?? 0) || 0,
    selected_unit: String(item.selected_unit || item.unit_code || '').trim(),
    unit_ratio: initialRatio,
  }
  const { data } = await api.post('/purchase-planning/cart/items', payload)
  if (data.cart) replaceCart(data.cart)
  if (data.created_pr) replaceCreatedPrItems(data.created_pr)
  else await loadCart()
  return data
}

async function patchCartItem(item, patch) {
  if (!item?.id || !item.is_owner) return null
  const { data } = await api.patch(`/purchase-planning/cart/items/${encodeURIComponent(item.id)}`, patch)
  if (data.cart) replaceCart(data.cart)
  return data
}

function setUnits(icCode, apCode, units) {
  const item = findCartItem(icCode, apCode)
  if (!item) return
  ensureBaseQty(item)
  const normalized = (Array.isArray(units) && units.length ? units : [{ unit_code: item.unit_code, ratio: 1, is_base: true }])
    .map((unit) => normalizeUnit(unit, item.unit_code))
  item.units = normalized
  const hasSelected = item.units.some((unit) => unit.unit_code === item.selected_unit)
  if (!hasSelected) {
    const base = item.units.find((unit) => unit.is_base) || item.units[0]
    item.selected_unit = base.unit_code
  }
  const selectedUnit = item.units.find((unit) => unit.unit_code === item.selected_unit) || item.units[0]
  item.unit_ratio = Number(selectedUnit?.ratio) || 1
  item.qty = ceilQuantity(Number(item.base_qty || 0) / item.unit_ratio)
}

async function updateUnit(icCode, apCode, newUnitCode) {
  const item = findCartItem(icCode, apCode)
  if (!item || !item.is_owner) return
  const newUnit = (item.units || []).find((unit) => unit.unit_code === newUnitCode)
  if (!newUnit) return
  const newRatio = Number(newUnit.ratio) || 1
  const baseQty = ensureBaseQty(item)
  item.qty = ceilQuantity(baseQty / newRatio)
  item.selected_unit = newUnitCode
  item.unit_ratio = newRatio
  await patchCartItem(item, {
    qty: item.qty,
    base_qty: item.base_qty,
    selected_unit: item.selected_unit,
    unit_ratio: item.unit_ratio,
    unit_stand_value: Number(newUnit.stand_value || newRatio || 1),
    unit_divide_value: Number(newUnit.divide_value || 1),
  })
}

async function removeFromCart(icCode, apCode) {
  const item = findCartItem(icCode, apCode)
  if (!item || !item.is_owner) return false
  if (item.id) {
    const { data } = await api.delete(`/purchase-planning/cart/items/${encodeURIComponent(item.id)}`)
    if (data.cart) replaceCart(data.cart)
    else {
      const idx = cart.indexOf(item)
      if (idx >= 0) cart.splice(idx, 1)
    }
    return true
  }
  const { data } = await api.delete(`/purchase-planning/cart/items/by-key/${encodeURIComponent(icCode)}/${encodeURIComponent(apCode)}`)
  if (data.cart) replaceCart(data.cart)
  return true
}

async function updateQty(icCode, apCode, qty) {
  const item = findCartItem(icCode, apCode)
  if (!item || !item.is_owner) return
  item.qty = Number(qty) || 0
  item.base_qty = roundQuantity(Number(item.qty || 0) * itemRatio(item))
  await patchCartItem(item, { qty: item.qty, base_qty: item.base_qty })
}

async function updatePrice(icCode, apCode, price) {
  const item = findCartItem(icCode, apCode)
  if (!item || !item.is_owner) return
  item.price = Number(price) || 0
  await patchCartItem(item, { price: item.price })
}

async function clearCart() {
  const owned = cart.filter((item) => item.is_owner)
  for (const item of owned) {
    await removeFromCart(item.ic_code, item.ap_code)
  }
}

const cartCount = computed(() => cart.filter((item) => item.is_owner).length)
const allCartCount = computed(() => cart.length)

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
        owner_count: 0,
      })
    }
    const group = map.get(key)
    group.items.push(item)
    group.subtotal += Number(item.qty || 0) * Number(item.price || 0)
    if (item.is_owner) group.owner_count += 1
  }
  return Array.from(map.values()).map((group) => ({
    ...group,
    subtotal: Math.round(group.subtotal * 100) / 100,
  }))
})

const cartTotal = computed(() => (
  Math.round(cart.filter((item) => item.is_owner).reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0) * 100) / 100
))

export function usePlanningCart() {
  return {
    cart,
    createdPrItems,
    cartCount,
    allCartCount,
    cartGroups,
    cartTotal,
    currentUserId,
    currentUserCode,
    cartLoading,
    cartError,
    loadCart,
    addToCart,
    setUnits,
    updateUnit,
    removeFromCart,
    updateQty,
    updatePrice,
    clearCart,
  }
}
