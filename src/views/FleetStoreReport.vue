<template>
  <main class="store-report">
    <header class="page-head">
      <div>
        <p class="eyebrow">FLEET STORE HISTORY</p>
        <h1>รายงานร้านค้า</h1>
        <p>ค้นหาร้านแล้วดูประวัติส่งของ คืนของ ร้านปิด ปัญหา และรูปภาพประกอบรายร้าน</p>
      </div>
      <div class="report-actions">
        <label>
          <span>จาก</span>
          <input v-model="filters.from" type="date" />
        </label>
        <label>
          <span>ถึง</span>
          <input v-model="filters.to" type="date" />
        </label>
        <button :disabled="!selectedStore || reportLoading" @click="loadReport(selectedStore.store_id)">
          โหลดข้อมูล
        </button>
        <button class="ghost-action" :disabled="!selectedStore || reportLoading" @click="copyShareLink">
          คัดลอกลิงก์
        </button>
        <button class="ghost-action" :disabled="!timeline.length" @click="exportCsv">
          CSV
        </button>
        <button class="ghost-action" :disabled="!selectedStore || reportLoading" @click="printReport">
          พิมพ์
        </button>
      </div>
    </header>

    <section class="search-band">
      <div class="search-box">
        <label for="store-search">ค้นหาร้านค้า</label>
        <div class="search-row">
          <input
            id="store-search"
            v-model.trim="query"
            type="search"
            placeholder="ชื่อร้าน, รหัสร้าน, เบอร์โทร, เลข SO, เลขบิล"
            @keyup.enter="searchStores"
          />
          <button :disabled="searchLoading" @click="searchStores">
            {{ searchLoading ? 'กำลังค้นหา' : 'ค้นหา' }}
          </button>
        </div>
      </div>

      <div class="store-results">
        <button
          v-for="store in stores"
          :key="store.store_id"
          type="button"
          class="store-row"
          :class="{ active: selectedStore?.store_id === store.store_id }"
          @click="selectStore(store)"
        >
          <span>
            <strong>{{ store.store_name || store.store_id }}</strong>
            <small>{{ store.store_id }} · {{ store.zone || '-' }}</small>
          </span>
          <span class="row-stats">
            <b>{{ fmt(store.deliveries) }}</b>
            <small>ครั้งส่ง</small>
          </span>
          <span class="row-stats">
            <b>{{ fmtMoney(store.revenue) }}</b>
            <small>ยอดรวม</small>
          </span>
          <span v-if="Number(store.problem_count)" class="badge warn">{{ fmt(store.problem_count) }} ปัญหา</span>
          <span v-if="Number(store.return_count)" class="badge danger">{{ fmt(store.return_count) }} คืน</span>
        </button>
      </div>
      <p v-if="searchError" class="state error">{{ searchError }}</p>
      <p v-if="actionStatus" class="action-status">{{ actionStatus }}</p>
    </section>

    <section v-if="!selectedStore" class="empty-state">
      <h2>เริ่มจากค้นหาร้าน</h2>
      <p>ระบบจะแสดงร้านที่พบพร้อมยอดรวมล่าสุด จากนั้นเลือกหนึ่งร้านเพื่อดูประวัติแบบละเอียด</p>
    </section>

    <section v-else class="report-body">
      <div v-if="reportLoading" class="state">กำลังโหลดรายงานร้านค้า</div>
      <div v-else-if="reportError" class="state error">{{ reportError }}</div>

      <template v-else>
        <div class="store-profile">
          <div>
            <p class="eyebrow">STORE PROFILE</p>
            <h2>{{ report.store?.store_name || selectedStore.store_name || selectedStore.store_id }}</h2>
            <p>{{ report.store?.store_id }} · {{ report.store?.zone || 'ไม่ระบุโซน' }}</p>
            <p class="muted">{{ report.store?.address || 'ไม่มีที่อยู่' }}</p>
            <p class="muted">ข้อมูล: {{ filters.from || '-' }} ถึง {{ filters.to || 'ปัจจุบัน' }}</p>
            <p class="muted all-data-label">ข้อมูลทั้งหมดของร้าน</p>
          </div>
          <div class="profile-side">
            <span>{{ report.store?.phone || 'ไม่มีเบอร์โทร' }}</span>
            <span>{{ report.store?.location || 'ไม่มีพิกัด' }}</span>
            <strong>{{ storeRiskLabel }}</strong>
          </div>
        </div>

        <div class="kpi-grid">
          <div v-for="card in kpiCards" :key="card.label" class="kpi-card" :class="card.tone">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.note }}</small>
          </div>
        </div>

        <div class="analysis-panel">
          <div>
            <span>ส่งสำเร็จ</span>
            <strong>{{ successRate }}%</strong>
            <small>{{ fmt(summary.checkouts) }} checkout จาก {{ fmt(summary.total_visits) }} รายการ</small>
          </div>
          <div>
            <span>คืนของ / ยอดขาย</span>
            <strong>{{ returnRate }}%</strong>
            <small>{{ fmtMoney(summary.return_total) }} จาก {{ fmtMoney(summary.revenue) }}</small>
          </div>
          <div>
            <span>ปัญหาหลัก</span>
            <strong>{{ topProblemType }}</strong>
            <small>{{ fmt(summary.problem_count) }} รายการในช่วงที่เลือก</small>
          </div>
        </div>

        <div class="warning-strip" v-if="insightWarnings.length">
          <div v-for="item in insightWarnings" :key="item.title" :class="['warning-card', item.tone]">
            <span>{{ item.title }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.note }}</small>
          </div>
        </div>

        <section class="insight-section">
          <div class="insight-list">
            <article>
              <span>แนวโน้มล่าสุด</span>
              <strong>{{ trendLabel }}</strong>
              <small>{{ trendNote }}</small>
            </article>
            <article>
              <span>คนขับที่ไปบ่อยสุด</span>
              <strong>{{ topDriverLabel }}</strong>
              <small>{{ topDriverNote }}</small>
            </article>
            <article>
              <span>สินค้าคืนบ่อยสุด</span>
              <strong>{{ topReturnProductLabel }}</strong>
              <small>{{ topReturnProductNote }}</small>
            </article>
            <article>
              <span>วิธีชำระเงินหลัก</span>
              <strong>{{ topPaymentLabel }}</strong>
              <small>{{ topPaymentNote }}</small>
            </article>
          </div>

          <div class="breakdown-grid">
            <div class="breakdown-card">
              <h3>ปัญหาที่พบ</h3>
              <div v-for="item in problemBreakdown" :key="item.problem_type" class="bar-row">
                <span>{{ item.problem_type }}</span>
                <b>{{ fmt(item.count) }}</b>
                <i :style="{ width: pctOf(item.count, maxProblemCount) + '%' }"></i>
              </div>
              <p v-if="!problemBreakdown.length" class="muted">ไม่มีปัญหาในช่วงนี้</p>
            </div>
            <div class="breakdown-card">
              <h3>ยอดรายเดือน</h3>
              <div v-for="item in monthlyTrend.slice(-6)" :key="item.month" class="bar-row">
                <span>{{ item.month }}</span>
                <b>{{ fmtMoney(item.revenue) }}</b>
                <i :style="{ width: pctOf(item.revenue, maxMonthlyRevenue) + '%' }"></i>
              </div>
              <p v-if="!monthlyTrend.length" class="muted">ไม่มีข้อมูลรายเดือน</p>
            </div>
          </div>
        </section>

        <nav class="tabs">
          <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
            {{ tab.label }}
            <span>{{ tab.count }}</span>
          </button>
        </nav>

        <section v-if="activeTab === 'history'" class="history-compact">
          <div class="history-toolbar">
            <input
              v-model.trim="historyFilter.bill"
              type="search"
              placeholder="ค้นหาเลขบิล / SO"
              @keyup.enter="applyHistorySearch"
            />
            <button type="button" :disabled="reportLoading" @click="applyHistorySearch">ค้นหา</button>
            <button v-if="historyFilter.bill" type="button" class="ghost-action" :disabled="reportLoading" @click="clearHistorySearch">ล้าง</button>
          </div>

          <div class="history-table">
            <button
              v-for="item in timeline"
              :key="item.list_id"
              type="button"
              class="history-row"
              :class="{ expanded: expandedHistoryId === item.list_id }"
              @click="toggleHistory(item)"
            >
              <span>{{ fmtDateTime(item.date_time_check_out || item.date_time_check_in || item.trip_date) }}</span>
              <strong>{{ item.data_store_no || item.check_out_id || item.list_id }}</strong>
              <span>{{ item.store_name_result || report.store?.store_name || selectedStore.store_name || selectedStore.store_id }}</span>
            </button>
          </div>

          <article v-if="expandedHistoryItem" class="history-card expanded-card">
            <div class="history-main">
              <div>
                <span class="date">{{ fmtDateTime(expandedHistoryItem.date_time_check_out || expandedHistoryItem.date_time_check_in || expandedHistoryItem.trip_date) }}</span>
                <h3>{{ expandedHistoryItem.data_store_no || expandedHistoryItem.check_out_id || expandedHistoryItem.list_id }}</h3>
                <p>{{ expandedHistoryItem.car_release_code || expandedHistoryItem.car_release_id || '-' }} · {{ expandedHistoryItem.driver_name || '-' }} · {{ expandedHistoryItem.license_plate || expandedHistoryItem.car_name || '-' }}</p>
              </div>
              <div class="amount-box">
                <strong>{{ fmtMoney(expandedHistoryItem.amount) }}</strong>
                <span>{{ expandedHistoryItem.payment_name || displayVisit(expandedHistoryItem.visit_name) }}</span>
              </div>
            </div>

            <div class="mini-grid">
              <span>Check-in <b>{{ fmtDateTime(expandedHistoryItem.date_time_check_in) }}</b></span>
              <span>Check-out <b>{{ fmtDateTime(expandedHistoryItem.date_time_check_out) }}</b></span>
              <span>คืนของ <b>{{ fmtMoney(expandedHistoryItem.return_total) }}</b></span>
              <span>ปัญหา <b>{{ fmt(expandedHistoryItem.problem_count) }}</b></span>
            </div>

            <p v-if="expandedHistoryItem.visit_note" class="note">{{ expandedHistoryItem.visit_note }}</p>
            <div class="tags">
              <span v-if="expandedHistoryItem.bypass" class="tag warn">ข้ามร้าน</span>
              <span v-if="expandedHistoryItem.off_site" class="tag warn">นอกสถานที่</span>
              <span v-if="expandedHistoryItem.problem_types" class="tag danger">{{ expandedHistoryItem.problem_types }}</span>
              <span v-if="expandedHistoryItem.return_count" class="tag danger">มีคืนของ {{ fmt(expandedHistoryItem.return_count) }} รายการ</span>
            </div>

            <div v-if="itemImages(expandedHistoryItem).length" class="thumb-row">
              <button v-for="image in itemImages(expandedHistoryItem)" :key="image.key" type="button" @click.stop="openImage(image.path, image.label)">
                <img v-if="imageSrc(image.path)" :src="imageSrc(image.path)" :alt="image.label" />
                <span v-else>{{ imageLoading[image.path] ? 'โหลดรูป' : image.label }}</span>
              </button>
            </div>
          </article>

          <div v-if="timelineMeta.total > historyFilter.limit" class="pagination">
            <button type="button" :disabled="historyPage <= 1 || reportLoading" @click="goHistoryPage(historyPage - 1)">ก่อนหน้า</button>
            <span>หน้า {{ historyPage }} / {{ historyTotalPages }} · {{ fmt(timelineMeta.total) }} รายการ</span>
            <button type="button" :disabled="historyPage >= historyTotalPages || reportLoading" @click="goHistoryPage(historyPage + 1)">ถัดไป</button>
          </div>

          <p v-if="!timeline.length" class="state">ไม่พบประวัติส่งของของร้านนี้</p>
        </section>

        <section v-else-if="false && activeTab === 'history'" class="timeline-list">
          <article v-for="item in timeline" :key="item.list_id" class="history-card">
            <div class="history-main">
              <div>
                <span class="date">{{ fmtDateTime(item.date_time_check_out || item.date_time_check_in || item.trip_date) }}</span>
                <h3>{{ item.data_store_no || item.check_out_id || item.list_id }}</h3>
                <p>{{ item.car_release_code || item.car_release_id || '-' }} · {{ item.driver_name || '-' }} · {{ item.license_plate || item.car_name || '-' }}</p>
              </div>
              <div class="amount-box">
                <strong>{{ fmtMoney(item.amount) }}</strong>
                <span>{{ item.payment_name || displayVisit(item.visit_name) }}</span>
              </div>
            </div>

            <div class="mini-grid">
              <span>Check-in <b>{{ fmtDateTime(item.date_time_check_in) }}</b></span>
              <span>Check-out <b>{{ fmtDateTime(item.date_time_check_out) }}</b></span>
              <span>คืนของ <b>{{ fmtMoney(item.return_total) }}</b></span>
              <span>ปัญหา <b>{{ fmt(item.problem_count) }}</b></span>
            </div>

            <p v-if="item.visit_note" class="note">{{ item.visit_note }}</p>
            <div class="tags">
              <span v-if="item.bypass" class="tag warn">ข้ามร้าน</span>
              <span v-if="item.off_site" class="tag warn">นอกสถานที่</span>
              <span v-if="item.problem_types" class="tag danger">{{ item.problem_types }}</span>
              <span v-if="item.return_count" class="tag danger">มีคืนของ {{ fmt(item.return_count) }} รายการ</span>
            </div>

            <div v-if="itemImages(item).length" class="thumb-row">
              <button v-for="image in itemImages(item)" :key="image.key" type="button" @click="openImage(image.path, image.label)">
                <img v-if="imageSrc(image.path)" :src="imageSrc(image.path)" :alt="image.label" />
                <span v-else>{{ imageLoading[image.path] ? 'โหลดรูป' : image.label }}</span>
              </button>
            </div>
          </article>
          <p v-if="!timeline.length" class="state">ไม่พบประวัติในช่วงวันที่เลือก</p>
        </section>

        <section v-else-if="activeTab === 'returns'" class="data-panel">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>บิล/SO</th>
                <th>เที่ยวรถ</th>
                <th>สินค้า</th>
                <th class="num">จำนวน</th>
                <th class="num">มูลค่า</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in returns" :key="item.return_product_id">
                <td>{{ fmtDate(item.date_time_check_out || item.trip_date) }}</td>
                <td>{{ item.data_store_no || item.check_out_id }}</td>
                <td>{{ item.car_release_code || item.car_release_id || '-' }}</td>
                <td>{{ item.product_name || '-' }}</td>
                <td class="num">{{ fmt(item.quantity) }}</td>
                <td class="num">{{ fmtMoney(item.total) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="returns.length" class="table-actions">
            <button class="ghost-action" @click="exportReturnsCsv">Export คืนของ CSV</button>
          </div>
          <p v-if="!returns.length" class="state">ยังไม่มีข้อมูลคืนของของร้านนี้</p>
        </section>

        <section v-else-if="activeTab === 'closed'" class="timeline-list">
          <article v-for="item in issueEvents" :key="item.list_id" class="history-card">
            <div class="history-main">
              <div>
                <span class="date">{{ fmtDateTime(item.date_time_check_out || item.date_time_check_in || item.trip_date) }}</span>
                <h3>{{ closedStatus(item) }}</h3>
                <p>{{ item.data_store_no || item.list_id }} · {{ item.car_release_code || '-' }} · {{ item.driver_name || '-' }}</p>
              </div>
              <div class="amount-box">
                <strong>{{ fmtMoney(item.amount) }}</strong>
                <span>{{ item.check_out_id ? 'มี checkout' : 'ยังไม่ checkout' }}</span>
              </div>
            </div>
            <div class="tags">
              <span v-if="item.bypass" class="tag warn">ข้ามร้าน</span>
              <span v-if="item.off_site" class="tag warn">นอกสถานที่</span>
              <span v-if="!item.check_out_id" class="tag danger">ไม่ได้ส่ง/ไม่มี checkout</span>
              <span v-if="item.problem_types" class="tag danger">{{ item.problem_types }}</span>
            </div>
          </article>
          <p v-if="!issueEvents.length" class="state">ไม่พบรายการร้านปิดหรือไม่ได้ส่งในช่วงนี้</p>
        </section>

        <section v-else-if="activeTab === 'issues'" class="issue-grid">
          <article v-for="problem in problems" :key="problem.problem_id" class="issue-card">
            <div>
              <span>{{ fmtDateTime(problem.created_at) }}</span>
              <h3>{{ problem.problem_type || 'ไม่ระบุปัญหา' }}</h3>
              <p>{{ problem.description || problem.normal_bill_note || problem.edit_bill_note || problem.product_swap_note || problem.out_of_stock_note || problem.overstock_note || '-' }}</p>
            </div>
            <div class="tags">
              <span v-if="problem.normal_bill" class="tag">บิลปกติ</span>
              <span v-if="problem.edit_bill" class="tag warn">แก้บิล</span>
              <span v-if="problem.product_swap" class="tag warn">สลับสินค้า</span>
              <span v-if="problem.out_of_stock" class="tag danger">ของขาด</span>
              <span v-if="problem.overstock" class="tag danger">ของเกิน</span>
            </div>
            <div v-if="problemImages(problem).length" class="thumb-row">
              <button v-for="image in problemImages(problem)" :key="image.key" type="button" @click="openImage(image.path, image.label)">
                <img v-if="imageSrc(image.path)" :src="imageSrc(image.path)" :alt="image.label" />
                <span v-else>{{ image.label }}</span>
              </button>
            </div>
          </article>
          <p v-if="!problems.length" class="state">ยังไม่มีปัญหาที่บันทึกไว้</p>
        </section>

        <section v-else class="gallery-grid">
          <button v-for="image in galleryImages" :key="image.path + image.type" type="button" @click="openImage(image.path, image.label)">
            <img v-if="imageSrc(image.path)" :src="imageSrc(image.path)" :alt="image.label" />
            <span v-else>{{ image.label }}</span>
            <small>{{ image.label }} · {{ fmtDate(image.date) }}</small>
          </button>
          <p v-if="!galleryImages.length" class="state">ยังไม่มีรูปภาพของร้านนี้</p>
        </section>
      </template>
    </section>

    <Teleport to="body">
      <div v-if="preview.open" class="preview-backdrop" @click.self="closePreview">
        <div class="preview">
          <button type="button" @click="closePreview">ปิด</button>
          <img :src="preview.src" :alt="preview.label" />
          <p>{{ preview.label }}</p>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import apiBase from '../composables/useApi.js'

const route = useRoute()
const router = useRouter()
const query = ref('')
const stores = ref([])
const selectedStore = ref(null)
const searchLoading = ref(false)
const reportLoading = ref(false)
const searchError = ref('')
const reportError = ref('')
const actionStatus = ref('')
const activeTab = ref('history')
const filters = reactive({ from: '', to: '' })
const historyFilter = reactive({ bill: '', limit: 20, offset: 0 })
const expandedHistoryId = ref(null)
const report = reactive({ store: null, summary: {}, analysis: {}, timeline: [], timeline_meta: { total: 0, limit: 20, offset: 0 }, returns: [], problems: [], images: [] })
const imageUrls = reactive({})
const imageLoading = reactive({})
const preview = reactive({ open: false, src: '', label: '' })
const syncingRoute = ref(false)
const datePresets = [
  { key: '7d', label: '7 วัน' },
  { key: '30d', label: '30 วัน' },
  { key: 'month', label: 'เดือนนี้' },
  { key: 'year', label: 'ปีนี้' },
  { key: 'all', label: 'ทั้งหมด' },
]

const summary = computed(() => report.summary || {})
const timeline = computed(() => report.timeline || [])
const timelineMeta = computed(() => report.timeline_meta || { total: 0, limit: historyFilter.limit, offset: 0 })
const historyPage = computed(() => Math.floor(Number(timelineMeta.value.offset || 0) / Number(timelineMeta.value.limit || historyFilter.limit)) + 1)
const historyTotalPages = computed(() => Math.max(1, Math.ceil(Number(timelineMeta.value.total || 0) / Number(timelineMeta.value.limit || historyFilter.limit))))
const expandedHistoryItem = computed(() => timeline.value.find(item => item.list_id === expandedHistoryId.value) || null)
const returns = computed(() => report.returns || [])
const problems = computed(() => report.problems || [])
const analysis = computed(() => report.analysis || {})
const monthlyTrend = computed(() => analysis.value.monthly || [])
const issueEvents = computed(() => analysis.value.issue_events || [])
const problemBreakdown = computed(() => analysis.value.problem_breakdown || [])
const topDrivers = computed(() => analysis.value.top_drivers || [])
const topReturnProducts = computed(() => analysis.value.top_return_products || [])
const paymentBreakdown = computed(() => analysis.value.payment_breakdown || [])
const galleryImages = computed(() => dedupeImages(report.images || []))
const tabs = computed(() => [
  { key: 'history', label: 'ประวัติส่งของ', count: timeline.value.length },
  { key: 'returns', label: 'คืนของ', count: returns.value.length },
  { key: 'closed', label: 'ร้านปิด/ไม่ได้ส่ง', count: issueEvents.value.length },
  { key: 'issues', label: 'ปัญหา', count: problems.value.length },
  { key: 'images', label: 'รูปภาพ', count: galleryImages.value.length },
])

const successRate = computed(() => pct(summary.value.checkouts, summary.value.total_visits))
const returnRate = computed(() => pct(summary.value.return_total, summary.value.revenue))
const activePreset = computed(() => detectPreset())
const topProblemType = computed(() => {
  return problemBreakdown.value[0]?.problem_type || 'ไม่มี'
})
const maxProblemCount = computed(() => Math.max(...problemBreakdown.value.map(item => Number(item.count || 0)), 0))
const maxMonthlyRevenue = computed(() => Math.max(...monthlyTrend.value.map(item => Number(item.revenue || 0)), 0))
const latestMonth = computed(() => monthlyTrend.value[monthlyTrend.value.length - 1] || null)
const previousMonth = computed(() => monthlyTrend.value[monthlyTrend.value.length - 2] || null)
const trendLabel = computed(() => {
  if (!latestMonth.value) return 'ไม่มีข้อมูล'
  if (!previousMonth.value) return `${latestMonth.value.month} ${fmtMoney(latestMonth.value.revenue)}`
  const diff = Number(latestMonth.value.revenue || 0) - Number(previousMonth.value.revenue || 0)
  if (Math.abs(diff) < 1) return 'ทรงตัว'
  return diff > 0 ? 'ยอดเพิ่มขึ้น' : 'ยอดลดลง'
})
const trendNote = computed(() => {
  if (!latestMonth.value) return 'ยังไม่มีรอบส่งในช่วงวันที่เลือก'
  if (!previousMonth.value) return `เดือนล่าสุด ${fmtMoney(latestMonth.value.revenue)}`
  const diff = Number(latestMonth.value.revenue || 0) - Number(previousMonth.value.revenue || 0)
  return `${latestMonth.value.month} เทียบ ${previousMonth.value.month}: ${diff >= 0 ? '+' : ''}${fmtMoney(diff)}`
})
const topDriverLabel = computed(() => topDrivers.value[0]?.driver_name || topDrivers.value[0]?.user_id || 'ไม่มี')
const topDriverNote = computed(() => {
  const driver = topDrivers.value[0]
  return driver ? `${fmt(driver.visits)} ครั้ง · ${fmtMoney(driver.revenue)}` : 'ยังไม่มีข้อมูลคนขับ'
})
const topReturnProductLabel = computed(() => topReturnProducts.value[0]?.product_name || 'ไม่มี')
const topReturnProductNote = computed(() => {
  const product = topReturnProducts.value[0]
  return product ? `${fmt(product.quantity)} ชิ้น · ${fmtMoney(product.total)}` : 'ยังไม่มีข้อมูลคืนของ'
})
const topPaymentLabel = computed(() => paymentBreakdown.value[0]?.payment_name || 'ไม่มี')
const topPaymentNote = computed(() => {
  const payment = paymentBreakdown.value[0]
  return payment ? `${fmt(payment.checkouts)} checkout · ${fmtMoney(payment.amount)}` : 'ยังไม่มีข้อมูลชำระเงิน'
})
const insightWarnings = computed(() => {
  const items = []
  if (Number(summary.value.store_closed_count || 0) > 0) {
    items.push({ title: 'ร้านปิด', value: fmt(summary.value.store_closed_count), note: 'ครั้งในช่วงวันที่เลือก', tone: 'warn' })
  }
  if (returnRate.value >= 5) {
    items.push({ title: 'คืนของสูง', value: `${returnRate.value}%`, note: 'ของยอดขายรวม', tone: 'danger' })
  }
  if (Number(summary.value.problem_count || 0) > 0) {
    items.push({ title: 'ปัญหาที่พบ', value: fmt(summary.value.problem_count), note: topProblemType.value, tone: 'danger' })
  }
  if (successRate.value && successRate.value < 80) {
    items.push({ title: 'ส่งสำเร็จต่ำ', value: `${successRate.value}%`, note: 'ควรตรวจรายการไม่ได้ส่ง', tone: 'warn' })
  }
  return items
})
const storeRiskLabel = computed(() => {
  if (Number(summary.value.store_closed_count || 0) >= 3) return 'ร้านปิดบ่อย'
  if (returnRate.value >= 10) return 'คืนของสูง'
  if (Number(summary.value.problem_count || 0) >= 5) return 'มีปัญหาซ้ำ'
  return 'สถานะปกติ'
})
const kpiCards = computed(() => [
  { label: 'ยอดขายรวม', value: fmtMoney(summary.value.revenue), note: `${fmt(summary.value.checkouts)} checkout`, tone: 'money' },
  { label: 'จำนวนครั้งส่ง', value: fmt(summary.value.total_visits), note: `${fmt(summary.value.trips)} เที่ยวรถ`, tone: '' },
  { label: 'คืนของ', value: fmtMoney(summary.value.return_total), note: `${fmt(summary.value.return_items)} รายการ`, tone: 'danger' },
  { label: 'ร้านปิด', value: fmt(summary.value.store_closed_count), note: `${fmt(summary.value.problem_count)} ปัญหารวม`, tone: 'warn' },
  { label: 'เงินสด', value: fmtMoney(summary.value.cash), note: 'รับเป็นเงินสด', tone: '' },
  { label: 'โอน', value: fmtMoney(summary.value.transfer), note: 'รับเป็นโอน', tone: '' },
])

onMounted(() => {
  applyRouteState(route.query)
})

watch(
  () => route.query,
  nextQuery => {
    if (!syncingRoute.value) applyRouteState(nextQuery)
  }
)

onUnmounted(() => {
  Object.values(imageUrls).forEach(url => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
  })
})

async function searchStores() {
  searchLoading.value = true
  searchError.value = ''
  try {
    const { data } = await apiBase.get('/fleet/stores/search', { params: { q: query.value, limit: 20 } })
    stores.value = data.data || []
  } catch (e) {
    searchError.value = e.message
  } finally {
    searchLoading.value = false
  }
}

async function selectStore(store) {
  selectedStore.value = store
  activeTab.value = 'history'
  historyFilter.bill = ''
  historyFilter.offset = 0
  expandedHistoryId.value = null
  await loadReport(store.store_id)
}

async function loadReport(storeId) {
  if (!storeId) return
  reportLoading.value = true
  reportError.value = ''
  try {
    const params = {
      limit: historyFilter.limit,
      offset: historyFilter.offset,
    }
    if (historyFilter.bill) params.bill = historyFilter.bill
    const { data } = await apiBase.get(`/fleet/stores/${encodeURIComponent(storeId)}/report`, { params })
    Object.assign(report, {
      store: data.data.store,
      summary: data.data.summary || {},
      analysis: data.data.analysis || {},
      timeline: data.data.timeline || [],
      timeline_meta: data.data.timeline_meta || { total: 0, limit: historyFilter.limit, offset: historyFilter.offset },
      returns: data.data.returns || [],
      problems: data.data.problems || [],
      images: data.data.images || [],
    })
    if (!timeline.value.some(item => item.list_id === expandedHistoryId.value)) {
      expandedHistoryId.value = null
    }
    await syncUrl()
    preloadImages(galleryImages.value.slice(0, 60).map(image => image.path))
  } catch (e) {
    reportError.value = e.message
  } finally {
    reportLoading.value = false
  }
}

function toggleHistory(item) {
  expandedHistoryId.value = expandedHistoryId.value === item.list_id ? null : item.list_id
}

function applyHistorySearch() {
  historyFilter.offset = 0
  expandedHistoryId.value = null
  if (selectedStore.value?.store_id) loadReport(selectedStore.value.store_id)
}

function clearHistorySearch() {
  historyFilter.bill = ''
  applyHistorySearch()
}

function goHistoryPage(page) {
  const nextPage = Math.max(1, Math.min(page, historyTotalPages.value))
  historyFilter.offset = (nextPage - 1) * historyFilter.limit
  expandedHistoryId.value = null
  if (selectedStore.value?.store_id) loadReport(selectedStore.value.store_id)
}

function applyPreset(key, reload = true) {
  const today = new Date()
  const from = new Date(today)
  if (key === '7d') from.setDate(today.getDate() - 6)
  if (key === '30d') from.setDate(today.getDate() - 29)
  if (key === 'month') from.setDate(1)
  if (key === 'year') {
    from.setMonth(0)
    from.setDate(1)
  }
  if (key === 'all') {
    filters.from = ''
    filters.to = ''
  } else {
    filters.from = isoDate(from)
    filters.to = isoDate(today)
  }
  if (reload && selectedStore.value?.store_id) loadReport(selectedStore.value.store_id)
}

function detectPreset() {
  if (!filters.from && !filters.to) return 'all'
  const today = new Date()
  const to = isoDate(today)
  const daysAgo = days => {
    const d = new Date(today)
    d.setDate(today.getDate() - days)
    return isoDate(d)
  }
  const monthStart = new Date(today)
  monthStart.setDate(1)
  const yearStart = new Date(today)
  yearStart.setMonth(0)
  yearStart.setDate(1)
  if (filters.to === to && filters.from === daysAgo(6)) return '7d'
  if (filters.to === to && filters.from === daysAgo(29)) return '30d'
  if (filters.to === to && filters.from === isoDate(monthStart)) return 'month'
  if (filters.to === to && filters.from === isoDate(yearStart)) return 'year'
  return ''
}

async function applyRouteState(routeQuery) {
  query.value = String(routeQuery.q || '')
  filters.from = ''
  filters.to = ''
  await searchStores()
  const storeId = String(routeQuery.store || '')
  if (!storeId) return
  const match = stores.value.find(store => store.store_id === storeId) || { store_id: storeId }
  await selectStore(match)
}

function buildReportQuery() {
  const nextQuery = {}
  if (query.value) nextQuery.q = query.value
  if (selectedStore.value?.store_id) nextQuery.store = selectedStore.value.store_id
  return nextQuery
}

function sameQuery(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])
  return [...keys].every(key => String(a?.[key] || '') === String(b?.[key] || ''))
}

async function syncUrl(nextQuery = buildReportQuery()) {
  if (sameQuery(route.query, nextQuery)) return
  syncingRoute.value = true
  try {
    await router.replace({ path: route.path, query: nextQuery })
  } catch {
    // Ignore duplicate navigation while keeping report actions usable.
  } finally {
    window.setTimeout(() => { syncingRoute.value = false }, 0)
  }
}

function reportUrl(nextQuery = buildReportQuery()) {
  const url = new URL(window.location.href)
  url.pathname = route.path
  url.search = new URLSearchParams(nextQuery).toString()
  return url.toString()
}

async function copyShareLink() {
  const nextQuery = buildReportQuery()
  await syncUrl(nextQuery)
  const url = reportUrl(nextQuery)
  try {
    await navigator.clipboard.writeText(url)
    setActionStatus('คัดลอกลิงก์รายงานแล้ว')
  } catch {
    setActionStatus(url)
  }
}

function printReport() {
  window.print()
}

function exportCsv() {
  const rows = timeline.value.map(item => ({
    date: fmtDateTime(item.date_time_check_out || item.date_time_check_in || item.trip_date),
    store_id: report.store?.store_id || selectedStore.value?.store_id || '',
    store_name: report.store?.store_name || selectedStore.value?.store_name || '',
    bill: item.data_store_no || '',
    trip: item.car_release_code || item.car_release_id || '',
    driver: item.driver_name || '',
    payment: item.payment_name || item.payment_id || '',
    amount: item.amount || 0,
    return_total: item.return_total || 0,
    problem_count: item.problem_count || 0,
    status: deliveryStatus(item),
  }))
  downloadCsv(`store-history-${selectedStore.value?.store_id || 'report'}.csv`, rows)
}

function exportReturnsCsv() {
  const rows = returns.value.map(item => ({
    date: fmtDate(item.date_time_check_out || item.trip_date),
    store_id: report.store?.store_id || selectedStore.value?.store_id || '',
    bill: item.data_store_no || item.check_out_id || '',
    trip: item.car_release_code || item.car_release_id || '',
    product_name: item.product_name || '',
    quantity: item.quantity || 0,
    total: item.total || 0,
  }))
  downloadCsv(`store-returns-${selectedStore.value?.store_id || 'report'}.csv`, rows)
}

function downloadCsv(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvCell(row[header])).join(',')),
  ].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  setActionStatus(`Export ${filename} แล้ว`)
}

function csvCell(value) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function setActionStatus(text) {
  actionStatus.value = text
  window.clearTimeout(setActionStatus.timer)
  setActionStatus.timer = window.setTimeout(() => { actionStatus.value = '' }, 3500)
}

function itemImages(item) {
  return dedupeImages([
    item.check_in_image && { key: `${item.list_id}-in`, label: 'Check-in', path: item.check_in_image },
    item.check_out_image && { key: `${item.list_id}-bill`, label: 'บิล', path: item.check_out_image },
    ...(item.check_out_images || []).map((image, index) => ({
      key: image.image_check_out_id || `${item.list_id}-out-${index}`,
      label: image.note || `ส่งของ ${index + 1}`,
      path: image.image_path,
    })),
    ...(item.return_documents || []).map((doc, index) => ({
      key: doc.return_document_id || `${item.list_id}-return-doc-${index}`,
      label: 'เอกสารคืนของ',
      path: doc.image_path,
    })),
    ...(item.problems || []).flatMap(problem => problemImages(problem)),
  ].filter(Boolean))
}

function problemImages(problem) {
  return dedupeImages([
    problem.problem_image && { key: `${problem.problem_id}-main`, label: problem.problem_type || 'ปัญหา', path: problem.problem_image },
    ...(problem.problem_images || []).map((image, index) => ({
      key: image.image_problem_id || `${problem.problem_id}-${index}`,
      label: image.note || problem.problem_type || 'ปัญหา',
      path: image.image_path,
    })),
  ].filter(Boolean))
}

function dedupeImages(images) {
  const seen = new Set()
  return images.filter(image => {
    const path = String(image?.path || '').trim()
    if (!path || seen.has(path)) return false
    seen.add(path)
    return true
  })
}

function preloadImages(paths) {
  paths.forEach(path => loadFleetImage(path))
}

async function loadFleetImage(path) {
  const value = String(path || '').trim()
  if (!value || imageUrls[value] || imageLoading[value]) return
  if (/^https?:\/\//i.test(value)) {
    imageUrls[value] = value
    return
  }
  imageLoading[value] = true
  try {
    const { data } = await apiBase.get('/fleet/image', { params: { path: value }, responseType: 'blob' })
    imageUrls[value] = URL.createObjectURL(data)
  } catch {
    imageUrls[value] = ''
  } finally {
    delete imageLoading[value]
  }
}

async function openImage(path, label) {
  await loadFleetImage(path)
  const src = imageSrc(path)
  if (!src) return
  preview.open = true
  preview.src = src
  preview.label = label || ''
}

function closePreview() {
  preview.open = false
  preview.src = ''
  preview.label = ''
}

function imageSrc(path) {
  return imageUrls[String(path || '').trim()] || ''
}

function displayVisit(value) {
  if (value === true || value === 'TRUE' || value === 'true') return 'สำเร็จ'
  if (value === false || value === 'FALSE' || value === 'false') return 'ไม่สำเร็จ'
  return value || '-'
}

function pct(value, base) {
  const b = Number(base || 0)
  if (!b) return 0
  return Math.round((Number(value || 0) / b) * 1000) / 10
}

function pctOf(value, max) {
  const m = Number(max || 0)
  if (!m) return 0
  return Math.max(4, Math.min(100, Math.round((Number(value || 0) / m) * 100)))
}

function closedStatus(item) {
  return deliveryStatus(item)
}

function deliveryStatus(item) {
  if (item.problem_types?.includes('ร้านปิด')) return 'ร้านปิด'
  if (item.bypass) return 'ข้ามร้าน'
  if (item.off_site) return 'นอกสถานที่'
  if (!item.check_out_id) return 'ไม่ได้ส่ง/ไม่มี checkout'
  if (item.problem_types) return item.problem_types
  return 'ส่งสำเร็จ'
}

function fmt(v) {
  return Number(v || 0).toLocaleString('th-TH')
}

function fmtMoney(v) {
  const n = Number(v || 0)
  return n ? n.toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }) : '-'
}

function fmtDate(v) {
  if (!v) return '-'
  return new Date(v).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(v) {
  if (!v) return '-'
  return new Date(v).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}
</script>

<style scoped>
.store-report {
  min-height: 100%;
  background: #f6f7f9;
  color: #18212f;
  padding: 24px;
}
.page-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 18px;
}
.eyebrow {
  color: #64748b;
  font-size: 11px;
  letter-spacing: .08em;
  font-weight: 700;
}
h1, h2, h3, p { margin: 0; }
h1 { font-size: 32px; line-height: 1.1; }
.page-head p:last-child, .muted { color: #64748b; margin-top: 6px; }
.date-tools, .report-actions, .search-row {
  display: flex;
  gap: 10px;
  align-items: end;
}
.date-tools, .report-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}
.report-actions label {
  display: none;
}
.store-profile > div:first-child .muted:nth-of-type(3) {
  display: none;
}
.preset-tools {
  display: flex;
  gap: 6px;
  align-items: center;
  min-height: 42px;
}
.preset-btn {
  height: 34px;
  padding: 0 10px;
  background: #eef2f7;
  color: #475569;
  border: 1px solid #d6dbe4;
}
.preset-btn.active {
  background: #18212f;
  color: white;
  border-color: #18212f;
}
.date-tools label, .search-box label {
  display: grid;
  gap: 5px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}
input {
  height: 42px;
  border: 1px solid #d6dbe4;
  border-radius: 8px;
  padding: 0 12px;
  background: white;
  min-width: 0;
}
button {
  border: 0;
  border-radius: 8px;
  background: #1f6feb;
  color: white;
  height: 42px;
  padding: 0 14px;
  font-weight: 700;
  cursor: pointer;
}
button:disabled { opacity: .55; cursor: not-allowed; }
.ghost-action {
  background: white;
  color: #1f6feb;
  border: 1px solid #c9d8f2;
}
.ghost-action:hover:not(:disabled) {
  background: #eef6ff;
}
.search-band, .report-body, .empty-state {
  background: white;
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.search-box input { width: min(680px, 70vw); }
.store-results {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.store-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 90px 120px auto auto;
  gap: 12px;
  align-items: center;
  min-height: 58px;
  background: #f8fafc;
  color: #18212f;
  text-align: left;
  border: 1px solid transparent;
}
.store-row.active {
  background: #eef6ff;
  border-color: #1f6feb;
}
.store-row small, .row-stats small { display: block; color: #64748b; font-weight: 500; }
.row-stats { text-align: right; }
.badge, .tag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 0 9px;
  background: #e8edf5;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}
.warn { background: #fff7ed; color: #9a3412; }
.danger { background: #fef2f2; color: #b91c1c; }
.state { padding: 18px; color: #64748b; }
.state.error { color: #b91c1c; }
.action-status {
  margin-top: 10px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
}
.store-profile {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e3e7ee;
}
.store-profile h2 { font-size: 26px; }
.profile-side {
  display: grid;
  gap: 6px;
  justify-items: end;
  color: #64748b;
}
.profile-side strong { color: #1f6feb; }
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(130px, 1fr));
  gap: 10px;
  margin: 16px 0;
}
.kpi-card {
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  padding: 14px;
  background: #fbfcfe;
}
.kpi-card span, .analysis-panel span { color: #64748b; font-size: 12px; font-weight: 700; }
.kpi-card strong { display: block; margin-top: 8px; font-size: 22px; }
.kpi-card small, .analysis-panel small { color: #64748b; }
.kpi-card.money { background: #ecfdf5; }
.analysis-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 14px;
}
.analysis-panel > div {
  padding: 14px;
  border-right: 1px solid #e3e7ee;
}
.analysis-panel > div:last-child { border-right: 0; }
.analysis-panel strong { display: block; font-size: 24px; margin: 4px 0; }
.warning-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.warning-card {
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e3e7ee;
}
.warning-card span,
.insight-list span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}
.warning-card strong {
  display: block;
  font-size: 22px;
  margin-top: 4px;
}
.warning-card small { color: #64748b; }
.insight-section {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}
.insight-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 10px;
}
.insight-list article,
.breakdown-card {
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  padding: 14px;
  background: #fbfcfe;
}
.insight-list strong {
  display: block;
  margin: 6px 0 3px;
  font-size: 18px;
}
.insight-list small { color: #64748b; }
.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.breakdown-card h3 {
  font-size: 15px;
  margin-bottom: 10px;
}
.bar-row {
  display: grid;
  grid-template-columns: minmax(100px, 1fr) auto;
  gap: 10px;
  align-items: center;
  position: relative;
  min-height: 30px;
  margin-top: 6px;
}
.bar-row span,
.bar-row b {
  position: relative;
  z-index: 1;
}
.bar-row b {
  font-size: 12px;
  color: #334155;
}
.bar-row i {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 5px;
  border-radius: 999px;
  background: #1f6feb;
}
.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e3e7ee;
  margin-bottom: 14px;
  overflow-x: auto;
}
.tabs button {
  background: transparent;
  color: #64748b;
  border-radius: 0;
  border-bottom: 3px solid transparent;
}
.tabs button.active {
  color: #1f6feb;
  border-bottom-color: #1f6feb;
}
.tabs span { margin-left: 6px; color: #94a3b8; }
.history-compact {
  display: grid;
  gap: 12px;
}
.history-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}
.history-toolbar input {
  width: min(320px, 100%);
}
.history-table {
  display: grid;
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  overflow: hidden;
}
.history-row {
  display: grid;
  grid-template-columns: 180px minmax(120px, 180px) minmax(180px, 1fr);
  gap: 12px;
  align-items: center;
  height: auto;
  min-height: 46px;
  padding: 10px 12px;
  border-bottom: 1px solid #e3e7ee;
  border-radius: 0;
  background: white;
  color: #18212f;
  text-align: left;
}
.history-row:last-child { border-bottom: 0; }
.history-row:hover,
.history-row.expanded {
  background: #eef6ff;
}
.history-row span {
  color: #64748b;
  font-weight: 600;
}
.history-row strong {
  color: #18212f;
}
.expanded-card {
  background: #fbfcfe;
}
.pagination {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}
.timeline-list, .issue-grid, .gallery-grid { display: grid; gap: 12px; }
.history-card, .issue-card, .data-panel {
  border: 1px solid #e3e7ee;
  border-radius: 8px;
  padding: 14px;
}
.history-main {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.date { color: #64748b; font-size: 12px; font-weight: 700; }
.amount-box { text-align: right; }
.amount-box strong { display: block; font-size: 22px; color: #0f766e; }
.amount-box span { color: #64748b; }
.mini-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 12px 0;
}
.mini-grid span {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px;
  color: #64748b;
}
.mini-grid b { display: block; color: #18212f; margin-top: 4px; }
.note {
  background: #fff7ed;
  border-radius: 8px;
  padding: 10px;
  color: #9a3412;
}
.tags, .thumb-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.thumb-row button, .gallery-grid button {
  width: 92px;
  height: 92px;
  padding: 0;
  background: #eef2f7;
  color: #64748b;
  overflow: hidden;
  border: 1px solid #d6dbe4;
}
.thumb-row img, .gallery-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.data-panel { overflow-x: auto; }
.table-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
table { width: 100%; border-collapse: collapse; }
th, td {
  padding: 10px;
  border-bottom: 1px solid #e3e7ee;
  text-align: left;
}
th { color: #64748b; font-size: 12px; }
.num { text-align: right; }
.issue-card { display: grid; gap: 10px; }
.gallery-grid {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}
.gallery-grid button {
  width: 100%;
  height: 150px;
  position: relative;
}
.gallery-grid small {
  position: absolute;
  inset: auto 6px 6px 6px;
  background: rgba(15, 23, 42, .72);
  color: white;
  border-radius: 6px;
  padding: 5px;
}
.preview-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, .82);
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 24px;
}
.preview {
  background: white;
  border-radius: 8px;
  padding: 12px;
  width: min(960px, 96vw);
}
.preview button { float: right; background: #0f172a; }
.preview img {
  width: 100%;
  max-height: 78vh;
  object-fit: contain;
  background: #0f172a;
  margin-top: 10px;
}
@media (max-width: 980px) {
  .store-report { padding: 14px; }
  .page-head, .store-profile, .history-main { flex-direction: column; }
  .date-tools {
    justify-content: flex-start;
  }
  .date-tools, .search-row, .preset-tools {
    flex-wrap: wrap;
  }
  .date-tools label {
    width: calc(50% - 5px);
  }
  .date-tools input {
    width: 100%;
  }
  .search-box input { width: 100%; }
  .store-row { grid-template-columns: 1fr 80px; }
  .history-toolbar { justify-content: stretch; flex-wrap: wrap; }
  .history-toolbar input { width: 100%; }
  .history-row { grid-template-columns: 1fr; gap: 4px; }
  .pagination { justify-content: center; flex-wrap: wrap; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .analysis-panel, .mini-grid, .warning-strip, .insight-list, .breakdown-grid { grid-template-columns: 1fr; }
  .profile-side { justify-items: start; }
}
@media print {
  :global(.sidebar),
  :global(.bottom-nav),
  :global(.main-header),
  :global(aside),
  :global(header),
  :global(nav.safe-bottom),
  .search-band,
  .date-tools,
  .report-actions,
  .tabs,
  .thumb-row,
  .preview-backdrop,
  .table-actions {
    display: none !important;
  }
  .store-report {
    background: white;
    color: #111827;
    padding: 0;
  }
  .page-head,
  .report-body {
    border: 0;
    box-shadow: none;
    margin: 0 0 12px;
    padding: 0;
  }
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .analysis-panel,
  .warning-strip,
  .insight-list,
  .breakdown-grid,
  .mini-grid {
    break-inside: avoid;
  }
  .history-card,
  .issue-card,
  .data-panel,
  .kpi-card,
  .warning-card,
  .insight-list article,
  .breakdown-card {
    break-inside: avoid;
    background: white;
  }
}
</style>
