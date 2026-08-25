<template>
  <main class="channel-report">
    <section class="report-shell">
      <header class="hero">
        <div>
          <p class="eyebrow">SALES &amp; RECEIPTS</p>
          <h1>รายงานช่องทางการขาย <span>[รับเงิน]</span></h1>
          <p class="hero-copy">เทียบยอดสุทธิของบิลกับยอดรับเงินจริง พร้อมข้อมูลขนส่งจากหน้า Fleet Delivery</p>
        </div>
        <div class="period-stamp">
          <span>ช่วงข้อมูล</span>
          <strong>{{ periodLabel }}</strong>
        </div>
      </header>

      <section class="filter-card">
        <label>
          <span>จากวันที่</span>
          <input v-model="draft.date_from" type="date" :max="draft.date_to || undefined" @keyup.enter="applyFilters" />
        </label>
        <label>
          <span>ถึงวันที่</span>
          <input v-model="draft.date_to" type="date" :min="draft.date_from || undefined" @keyup.enter="applyFilters" />
        </label>
        <label class="wide-filter">
          <span>ลูกค้า</span>
          <input v-model.trim="draft.customer" type="search" placeholder="รหัสลูกค้า หรือชื่อร้าน" @keyup.enter="applyFilters" />
        </label>
        <label class="wide-filter">
          <span>พนักงานขาย <em>เฉพาะ POS DB</em></span>
          <input v-model.trim="draft.sale" type="search" placeholder="รหัส หรือชื่อพนักงานขาย" @keyup.enter="applyFilters" />
        </label>
        <label class="wide-filter">
          <span>รถ <em>เฉพาะ WSA02</em></span>
          <input v-model.trim="draft.vehicle" type="search" placeholder="รหัสรถ หรือชื่อรถ" @keyup.enter="applyFilters" />
        </label>
        <label class="wide-filter">
          <span>คนขับ <em>เฉพาะขนส่ง</em></span>
          <input v-model.trim="draft.driver" type="search" placeholder="รหัส หรือชื่อคนขับ" @keyup.enter="applyFilters" />
        </label>
        <div class="filter-actions">
          <button class="primary-btn" :disabled="isAnyLoading || !!dateError" @click="applyFilters">
            {{ isAnyLoading ? 'กำลังโหลด' : 'แสดงรายงาน' }}
          </button>
          <button class="ghost-btn" :disabled="isAnyLoading" @click="resetFilters">ล้างตัวกรอง</button>
        </div>
        <p v-if="dateError" class="filter-error">{{ dateError }}</p>
      </section>

      <div v-if="errors.length" class="partial-warning">
        <strong>บางส่วนยังโหลดไม่สำเร็จ</strong>
        <span>{{ errors.join(' · ') }}</span>
        <button @click="applyFilters">ลองใหม่</button>
      </div>

      <section class="channel-overview-tabs panel" aria-label="เลือกภาพรวมตามประเภทช่องทางการขาย">
        <div class="channel-tabs-heading">
          <div>
            <p class="section-no">REPORT SCOPE</p>
            <h2>เลือกภาพรวมทั้งหมด หรือแยกตามช่องทางการขาย</h2>
            <p>ทุก KPI กราฟ และรายการด้านล่างจะเปลี่ยนตามตัวเลือกนี้</p>
          </div>
          <span class="source-chip">{{ activeChannelTab.label }}</span>
        </div>
        <nav class="channel-tabs" aria-label="เลือกประเภทช่องทางการขาย">
          <button v-for="tab in channelTabs" :key="tab.code" type="button"
            :class="{ active: activeChannelCode === tab.code }"
            :aria-selected="activeChannelCode === tab.code" role="tab"
            :disabled="isAnyLoading" @click="selectChannel(tab.code)">
            <span>{{ tab.code === 'ALL' ? 'ALL' : String(tab.order).padStart(2, '0') }}</span>
            <strong>{{ tab.label }}</strong>
            <small>{{ money(tab.amount) }} · {{ integer(tab.bill_count) }} บิล</small>
          </button>
        </nav>
      </section>

      <div class="scope-banner">
        <span>กำลังแสดง</span><strong>{{ activeChannelTab.label }}</strong>
        <small v-if="activeChannelCode === 'FLEET'">ข้อมูลจาก Fleet Check-out · ไม่ใช้ตัวกรองพนักงานขายของ POS DB</small>
        <small v-else-if="applied.sale || applied.vehicle">กรอง {{ applied.sale ? `พนักงานขาย ${applied.sale}` : '' }}{{ applied.sale && applied.vehicle ? ' · ' : '' }}{{ applied.vehicle ? `รถ ${applied.vehicle}` : '' }} · ไม่รวมยอดรับชำระหนี้ 239 เพราะจัดสรรย้อนกลับไม่ได้</small>
        <small v-else-if="activePosChannel">ยอดรับชำระหนี้ 239 ไม่รวมในช่องทางนี้ เพราะไม่สามารถจัดสรรย้อนกลับได้อย่างถูกต้อง</small>
        <small v-else>รวมทุกช่องทางของร้าน และยอดรับชำระหนี้ 239</small>
      </div>

      <section class="kpi-grid" aria-label="ยอดรวม">
        <article class="kpi-card ink">
          <span>ยอดขายสุทธิรวม</span>
          <strong>{{ money(totals.sales_amount) }}</strong>
          <small>{{ integer(totals.bill_count) }} เอกสาร</small>
        </article>
        <article class="kpi-card cash-sales">
          <span>{{ activeChannelCode === 'FLEET' ? 'รับเงินสด' : 'ยอดขายสด' }}</span>
          <strong>{{ money(activeChannelCode === 'FLEET' ? fleet.summary.cash_amount : totals.cash_sales_amount) }}</strong>
          <small>{{ activeChannelCode === 'FLEET' ? 'จาก Fleet Check-out' : `${integer(totals.cash_sale_bill_count)} เอกสาร · ${decimal(totals.cash_sales_ratio)}%` }}</small>
        </article>
        <article class="kpi-card credit-sales">
          <span>{{ activeChannelCode === 'FLEET' ? 'รับเงินโอน' : 'ยอดขายเชื่อ' }}</span>
          <strong>{{ money(activeChannelCode === 'FLEET' ? fleet.summary.transfer_amount : totals.credit_sales_amount) }}</strong>
          <small>{{ activeChannelCode === 'FLEET' ? 'จาก Fleet Check-out' : `${integer(totals.credit_sale_bill_count)} เอกสาร · ${decimal(totals.credit_sales_ratio)}%` }}</small>
        </article>
        <article class="kpi-card">
          <span>ยอดรับรวม</span>
          <strong>{{ money(totals.total_payment) }}</strong>
          <small>{{ activeChannelCode === 'ALL' ? 'รับทันที 44 + รับชำระหนี้ 239' : activeChannelCode === 'FLEET' ? 'เงินสด + เงินโอนจาก Check-out' : 'รับทันที 44 ของช่องทางนี้' }}</small>
        </article>
        <article class="kpi-card real-cash">
          <span>เงินเข้าจริง</span>
          <strong>{{ money(totals.real_money) }}</strong>
          <small>ไม่รวมคูปอง แต้ม มัดจำ และเงินล่วงหน้า</small>
        </article>
        <article class="kpi-card" :class="differenceTone(totals.payment_difference)">
          <span>กระแสรับเงิน − ยอดขายตามวัน</span>
          <strong>{{ signedMoney(totals.payment_difference) }}</strong>
          <small>{{ differenceText(totals.payment_difference) }} · ไม่ใช่ยอดหนี้คงเหลือ</small>
        </article>
      </section>
      <p v-if="activeChannelCode !== 'FLEET'" class="calculation-note">
        สูตรตรวจสอบ: ยอดขายก่อนส่วนลด {{ money(totals.gross_sales_amount) }} − ส่วนลด {{ money(totals.discount_amount) }}
        = ยอดขายสุทธิ {{ money(totals.sales_amount) }} · สด {{ money(totals.cash_sales_amount) }} + เชื่อ {{ money(totals.credit_sales_amount) }}
      </p>
      <p v-if="activeChannelCode !== 'FLEET' && Number(totals.unknown_sale_bill_count || 0) > 0" class="classification-warning">
        พบ {{ integer(totals.unknown_sale_bill_count) }} เอกสาร มูลค่า {{ money(totals.unknown_sales_amount) }} ที่ inquiry_type ไม่อยู่ใน 0–3 กรุณาตรวจสอบข้อมูลต้นทาง
      </p>

      <section class="panel receipt-sources-panel">
        <div class="panel-head">
          <div><p class="section-no">01 / RECEIPT SOURCES</p><h2>แหล่งที่มาของยอดรับเงิน</h2></div>
          <span class="source-chip green">{{ activeChannelCode === 'ALL' ? '44 + 239' : activeChannelCode === 'FLEET' ? 'CRM FLEET' : '44' }}</span>
        </div>
        <div v-if="loading.overview" class="panel-state"><span class="spinner"></span>กำลังแยกแหล่งรับเงิน</div>
        <div v-else class="receipt-source-grid">
          <article v-for="source in receiptSources" :key="source.receipt_source" :class="source.receipt_source === 'CREDIT_COLLECTION' ? 'credit' : 'cash'">
            <span>{{ source.receipt_label }}</span>
            <strong>{{ money(source.total_payment) }}</strong>
            <small>{{ integer(source.doc_count) }} เอกสาร · เงินเข้าจริง {{ money(source.real_money) }}</small>
          </article>
          <article class="ratio">
            <span>{{ activeChannelCode === 'ALL' ? 'สัดส่วนรับชำระขายเชื่อ' : 'ยอดรับ 239 ที่จัดสรรไม่ได้' }}</span>
            <strong>{{ activeChannelCode === 'ALL' ? `${decimal(totals.credit_collection_ratio)}%` : '—' }}</strong>
            <small>{{ activeChannelCode === 'ALL' ? 'ยอด 239 ÷ ยอดรับรวม' : 'ไม่คาดเดาช่องทางจากเอกสารรับชำระ' }}</small>
          </article>
          <article class="real-money">
            <span>เงินเข้าจริง</span>
            <strong>{{ money(totals.real_money) }}</strong>
            <small>ช่องทางอื่น {{ money(totals.non_real_money) }}</small>
          </article>
        </div>
        <p class="data-note">เงินเข้าจริงรวมเฉพาะ เงินสด เงินโอน เช็ค บัตรเครดิต เงินสกุลอื่น และ e-Wallet</p>
      </section>

      <section class="report-grid channel-overview-grid">
        <article class="panel channels-panel">
          <div class="panel-head">
            <div>
              <p class="section-no">SALES SUMMARY</p>
              <h2>ยอดขาย · {{ activeChannelTab.label }}</h2>
            </div>
            <span class="source-chip">{{ activeChannelCode === 'FLEET' ? 'CRM FLEET' : 'POS DB' }}</span>
          </div>
          <div v-if="activeChannelCode === 'FLEET'">
            <div v-if="loading.fleet" class="panel-state"><span class="spinner"></span>กำลังคำนวณยอด Fleet Delivery</div>
            <div v-else class="fleet-tab-content">
              <div class="fleet-tab-kpis">
                <article><span>ยอดส่งสำเร็จ</span><strong>{{ money(fleet.summary.sales_amount) }}</strong><small>{{ integer(fleet.summary.bill_count) }} บิล</small></article>
                <article><span>รับเงินสด</span><strong>{{ money(fleet.summary.cash_amount) }}</strong><small>จาก Check-out</small></article>
                <article><span>รับเงินโอน</span><strong>{{ money(fleet.summary.transfer_amount) }}</strong><small>จาก Check-out</small></article>
                <article><span>การปฏิบัติงาน</span><strong>{{ integer(fleet.summary.trip_count) }} เที่ยว</strong><small>{{ integer(fleet.summary.driver_count) }} คนขับ · {{ integer(fleet.summary.customer_count) }} ลูกค้า</small></article>
              </div>
              <div class="fleet-tab-footer">
                <span>ข้อมูลเดียวกับหน้า Fleet Delivery และกรองจากเวลา Check-out</span>
                <RouterLink to="/fleet-delivery">เปิดรายละเอียดขนส่ง</RouterLink>
              </div>
            </div>
          </div>
          <div v-else-if="loading.overview" class="panel-state"><span class="spinner"></span>กำลังคำนวณยอดตามช่องทาง</div>
          <div v-else-if="activeChannelCode !== 'ALL' && !activeChannelRow" class="panel-state">ไม่พบเอกสาร {{ activeChannelTab.label }} ในช่วงที่เลือก</div>
          <div v-else class="channel-list selected-channel-list">
            <article v-for="row in (activeChannelCode === 'ALL' ? channels : [activeChannelRow])" :key="row.channel_code" class="channel-row selected-channel-row">
              <div class="channel-rank">{{ String(row.channel_order).padStart(2, '0') }}</div>
              <div class="channel-main">
                <div class="channel-title">
                  <strong>{{ row.channel_label }}</strong>
                  <span>{{ integer(row.bill_count) }} บิล · ขายเชื่อ {{ decimal(row.credit_sales_ratio) }}%</span>
                </div>
                <div class="format-codes" aria-label="เงื่อนไขการจัดช่องทาง">
                  <span class="format-caption">เงื่อนไข</span>
                  <code v-for="rule in row.filter_rules" :key="rule">{{ rule }}</code>
                </div>
                <div class="amount-line">
                  <span>ก่อนลด {{ money(row.gross_sales_amount) }}</span>
                  <span class="discount-text">ลด {{ money(row.discount_amount) }}</span>
                  <span>ขายสุทธิ {{ money(row.sales_amount) }}</span>
                </div>
                <div class="channel-sale-split">
                  <div class="cash"><span>ขายสด · {{ integer(row.cash_sale_bill_count) }} บิล</span><strong>{{ money(row.cash_sales_amount) }}</strong></div>
                  <div class="credit"><span>ขายเชื่อ · {{ integer(row.credit_sale_bill_count) }} บิล</span><strong>{{ money(row.credit_sales_amount) }}</strong></div>
                  <div class="received"><span>รับทันทีจากขายสด</span><strong>{{ money(row.immediate_payment) }}</strong><small :class="differenceTone(row.cash_sale_payment_difference)">ต่างจากขายสด {{ signedMoney(row.cash_sale_payment_difference) }}</small></div>
                </div>
                <div class="sales-mix-track" aria-label="สัดส่วนยอดขายสดและขายเชื่อ">
                  <span class="cash" :style="{ width: mixWidth(row.cash_sales_amount, row.sales_amount) }"></span>
                  <span class="credit" :style="{ width: mixWidth(row.credit_sales_amount, row.sales_amount) }"></span>
                  <span v-if="Number(row.unknown_sales_amount || 0)" class="unknown" :style="{ width: mixWidth(row.unknown_sales_amount, row.sales_amount) }"></span>
                </div>
              </div>
            </article>
          </div>
          <p class="data-note">แท็บ 1–5 ใช้ข้อมูล POS DB · แท็บ 6 ใช้ CRM Fleet · ขายสด: inquiry_type 1, 3 · ขายเชื่อ: inquiry_type 0, 2</p>
        </article>

        <article class="panel payments-panel">
          <div class="panel-head">
            <div>
              <p class="section-no">PAYMENT MIX</p>
              <h2>สัดส่วนการรับเงิน · {{ activeChannelTab.label }}</h2>
            </div>
            <span class="source-chip green">{{ activeChannelCode === 'FLEET' ? 'CRM FLEET' : activeChannelCode === 'ALL' ? 'CB TRANS 44 + 239' : 'CB TRANS 44' }}</span>
          </div>
          <div v-if="paymentMixLoading" class="panel-state"><span class="spinner"></span>กำลังรวมรายการรับเงิน</div>
          <div v-else class="payment-grid">
            <article v-for="payment in paymentMethods" :key="payment.key" class="payment-card">
              <div class="payment-icon" :style="{ '--method-color': payment.color }">{{ payment.short }}</div>
              <div>
                <span>{{ payment.label }}</span>
                <strong>{{ money(activePaymentMix[payment.key]) }}</strong>
                <small>{{ percent(activePaymentMix[payment.key], activePaymentMix.payment_components) }}</small>
              </div>
            </article>
          </div>
          <div class="payment-check">
            <span>รวมวิธีรับเงิน {{ activeChannelTab.label }} <b>{{ money(activePaymentMix.payment_components) }}</b><template v-if="activeChannelCode !== 'FLEET'"> · ผลต่างกับ total_payment</template></span>
            <strong v-if="activeChannelCode !== 'FLEET'" :class="differenceTone(activePaymentMix.allocation_difference)">{{ signedMoney(activePaymentMix.allocation_difference) }}</strong>
          </div>
          <p class="payment-note">{{ paymentMixNote }}</p>
        </article>
      </section>

      <section class="panel trend-panel">
        <div class="panel-head">
          <div>
            <p class="section-no">04 / DAILY MOVEMENT</p>
            <h2>แนวโน้มยอดขายและยอดรับรายวัน</h2>
          </div>
          <div class="legend"><span class="sale-dot cash-sale-dot"></span>{{ activeChannelCode === 'FLEET' ? 'ยอดส่ง' : 'ขายสด' }} <template v-if="activeChannelCode !== 'FLEET'"><span class="sale-dot credit-sale-dot"></span>ขายเชื่อ</template> <span class="pay-dot immediate-dot"></span>{{ activeChannelCode === 'FLEET' ? 'รับจาก Check-out' : 'รับทันที' }} <template v-if="activeChannelCode === 'ALL'"><span class="pay-dot collection-dot"></span>รับชำระหนี้</template> <em>คลิกแท่งเพื่อดูยอด</em></div>
        </div>
        <div v-if="loading.trend" class="panel-state tall"><span class="spinner"></span>กำลังโหลดแนวโน้มรายวัน</div>
        <div v-else-if="!displayTrend.length" class="panel-state tall">ไม่มีข้อมูลแนวโน้ม</div>
        <div v-else class="trend-scroll">
          <div class="trend-chart" :style="{ minWidth: `${Math.max(720, displayTrend.length * 54)}px` }">
            <button v-for="point in displayTrend" :key="point.doc_date" type="button" class="trend-column"
              :class="{ active: selectedTrend?.doc_date === point.doc_date }"
              :title="trendTitle(point)" :aria-pressed="selectedTrend?.doc_date === point.doc_date"
              @click="selectedTrend = point">
              <div class="bar-space">
                <span class="bar-stack receipt" :style="{ height: trendHeight(point.total_payment) }">
                  <i class="immediate" :style="{ height: mixWidth(point.cash_sale_payment, point.total_payment) }"></i>
                  <i class="collection" :style="{ height: mixWidth(point.credit_collection_payment, point.total_payment) }"></i>
                </span>
                <span class="bar-stack sales" :style="{ height: trendHeight(point.sales_amount) }">
                  <i class="cash" :style="{ height: mixWidth(point.cash_sales_amount, point.sales_amount) }"></i>
                  <i class="credit" :style="{ height: mixWidth(point.credit_sales_amount, point.sales_amount) }"></i>
                  <i v-if="Number(point.unknown_sales_amount || 0)" class="unknown" :style="{ height: mixWidth(point.unknown_sales_amount, point.sales_amount) }"></i>
                </span>
              </div>
              <strong>{{ shortDate(point.doc_date) }}</strong>
              <small>{{ integer(point.bill_count) }} ขาย · {{ integer(point.receipt_count) }} รับ</small>
            </button>
          </div>
        </div>
        <div v-if="selectedTrend" class="trend-detail" aria-live="polite">
          <div class="trend-detail-head">
            <div><span>วันที่เลือก</span><strong>{{ fullDate(selectedTrend.doc_date) }}</strong></div>
            <button type="button" aria-label="ปิดรายละเอียด" @click="selectedTrend = null">×</button>
          </div>
          <dl>
            <div><dt>{{ activeChannelCode === 'FLEET' ? 'ยอดส่ง' : 'ขายสด' }}</dt><dd>{{ money(selectedTrend.cash_sales_amount) }}</dd><small>{{ integer(selectedTrend.cash_sale_bill_count) }} เอกสาร</small></div>
            <div><dt>ขายเชื่อ</dt><dd>{{ money(selectedTrend.credit_sales_amount) }}</dd><small>{{ integer(selectedTrend.credit_sale_bill_count) }} เอกสาร</small></div>
            <div><dt>เอกสารรับเงิน</dt><dd>{{ integer(selectedTrend.receipt_count) }}</dd></div>
            <div><dt>ยอดก่อนส่วนลด</dt><dd>{{ money(selectedTrend.gross_sales_amount) }}</dd></div>
            <div><dt>ส่วนลด</dt><dd class="discount-text">−{{ money(selectedTrend.discount_amount) }}</dd></div>
            <div><dt>ยอดขายสุทธิ</dt><dd>{{ money(selectedTrend.sales_amount) }}</dd></div>
            <div><dt>รับทันที 44</dt><dd>{{ money(selectedTrend.cash_sale_payment) }}</dd></div>
            <div><dt>รับชำระหนี้ 239</dt><dd>{{ money(selectedTrend.credit_collection_payment) }}</dd></div>
            <div><dt>ยอดรับรวม</dt><dd>{{ money(selectedTrend.total_payment) }}</dd></div>
            <div><dt>เงินเข้าจริง</dt><dd>{{ money(selectedTrend.real_money) }}</dd></div>
            <div><dt>รับทันที − ขายสด</dt><dd :class="differenceTone(selectedTrend.cash_sale_payment_difference)">{{ signedMoney(selectedTrend.cash_sale_payment_difference) }}</dd></div>
            <div><dt>กระแสรับรวม − ขายรวม</dt><dd :class="differenceTone(selectedTrend.payment_difference)">{{ signedMoney(selectedTrend.payment_difference) }}</dd></div>
          </dl>
        </div>
      </section>

      <section v-if="activeChannelCode === 'FLEET'" class="panel fleet-section">
        <div class="panel-head">
          <div>
            <p class="section-no">FLEET OPERATIONS</p>
            <h2>ยอดส่งและรับเงินแยกตามคนขับ</h2>
          </div>
          <RouterLink class="fleet-detail-link" to="/fleet-delivery">เปิด Fleet Delivery</RouterLink>
        </div>
        <div v-if="loading.fleet" class="panel-state tall"><span class="spinner"></span>กำลังโหลดข้อมูลคนขับ</div>
        <div v-else-if="!fleet.drivers.length" class="panel-state tall">ไม่พบข้อมูลขนส่งในช่วงที่เลือก</div>
        <div v-else class="driver-grid">
          <article v-for="(driver, index) in fleet.drivers" :key="driver.user_id || index">
            <span class="driver-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <div><strong>{{ driver.driver_name }}</strong><small>{{ integer(driver.trip_count) }} เที่ยว · {{ integer(driver.bill_count) }} บิล · {{ integer(driver.customer_count) }} ลูกค้า</small></div>
            <em>{{ money(driver.sales_amount) }}</em>
          </article>
        </div>
      </section>

      <section v-if="activeChannelCode !== 'FLEET'" class="ar-section">
        <div class="section-banner ar-banner">
          <div>
            <p class="section-no">05 / AR OUTSTANDING</p>
            <h2>ลูกหนี้คงเหลือจากการขายเชื่อ</h2>
            <p>ยอดคงเหลือสะสมถึง {{ fullDate(arSummary.as_of_date || applied.date_to) }} · รวมใบขายเก่าที่ยังค้างทั้งหมด ไม่จำกัดด้วย “จากวันที่”</p>
          </div>
          <span class="source-chip ar-chip">SML AR</span>
        </div>
        <div v-if="loading.arOutstanding" class="panel ar-loading"><span class="spinner"></span>กำลังคำนวณลูกหนี้ ณ วันตัดยอด</div>
        <template v-else>
          <div class="ar-kpis">
            <article class="outstanding"><span>ลูกหนี้คงเหลือ</span><strong>{{ money(arSummary.outstanding_amount) }}</strong><small>{{ integer(arSummary.open_invoice_count) }} ใบ · {{ integer(arSummary.open_customer_count) }} ลูกค้า</small></article>
            <article class="overdue"><span>เกินกำหนดชำระ</span><strong>{{ money(arSummary.overdue_amount) }}</strong><small>{{ decimal(arSummary.overdue_ratio) }}% ของลูกหนี้ · สูงสุด {{ integer(arSummary.max_days_overdue) }} วัน</small></article>
            <article class="not-due"><span>ยังไม่ถึงกำหนด</span><strong>{{ money(arSummary.not_due_amount) }}</strong><small>ไม่ระบุวันครบกำหนด {{ money(arSummary.no_due_date_amount) }}</small></article>
            <article class="credit-balance"><span>ยอดเกินชำระ / เครดิตคงเหลือ</span><strong>{{ money(arSummary.credit_balance_amount) }}</strong><small>แยกออก ไม่ใช้หักยอดลูกหนี้คงเหลือ</small></article>
          </div>

          <article class="panel aging-panel">
            <div class="panel-head">
              <div><p class="section-no">AGING</p><h2>อายุลูกหนี้ตามวันครบกำหนด</h2></div>
              <span class="document-count">ณ {{ fullDate(arSummary.as_of_date || applied.date_to) }}</span>
            </div>
            <div class="aging-grid">
              <article v-for="bucket in arAging" :key="bucket.code" :class="bucket.code.toLowerCase().replaceAll('_', '-')">
                <span>{{ bucket.label }}</span>
                <strong>{{ money(bucket.amount) }}</strong>
                <small>{{ percentOf(bucket.amount, arSummary.outstanding_amount) }}</small>
                <div class="aging-track"><i :style="{ width: agingWidth(bucket.amount) }"></i></div>
              </article>
            </div>
            <p class="data-note">วันครบกำหนดใช้ ic_trans.credit_date ตาม SML ERP · รายการที่ไม่มี credit_date รวมใน “ยังไม่ถึงกำหนด” และแสดงแยกใน KPI</p>
          </article>

          <article class="panel ar-customers-panel">
            <div class="panel-head">
              <div><p class="section-no">AR CUSTOMER RANKING</p><h2>ลูกหนี้คงเหลือแยกตามลูกค้า</h2></div>
              <span class="document-count">{{ integer(arCustomers.meta.total) }} ลูกค้า</span>
            </div>
            <div v-if="loading.arCustomers" class="panel-state tall"><span class="spinner"></span>กำลังโหลดลูกหนี้รายใหญ่</div>
            <div v-else-if="!arCustomers.rows.length" class="panel-state tall">ไม่พบลูกหนี้คงเหลือตามตัวกรอง</div>
            <div v-else class="table-wrap">
              <table class="ar-table">
                <thead><tr><th>ลูกค้า</th><th class="num">ใบค้าง</th><th class="num">ยอดใบขาย</th><th class="num">ตัดชำระแล้ว</th><th class="num">คงเหลือ</th><th class="num">เกินกำหนด</th><th>ครบกำหนดเก่าสุด</th><th class="num">เกินสูงสุด</th></tr></thead>
                <tbody>
                  <tr v-for="row in arCustomers.rows" :key="row.cust_code">
                    <td><strong>{{ row.cust_code || '-' }}</strong><small>{{ row.cust_name || '-' }}</small></td>
                    <td class="num">{{ integer(row.open_invoice_count) }}</td>
                    <td class="num">{{ money(row.original_amount) }}</td>
                    <td class="num positive">{{ money(row.paid_amount) }}</td>
                    <td class="num"><strong>{{ money(row.outstanding_amount) }}</strong></td>
                    <td class="num"><span :class="Number(row.overdue_amount || 0) > 0 ? 'negative' : 'balanced'">{{ money(row.overdue_amount) }}</span></td>
                    <td>{{ fullDate(row.oldest_due_date) }}</td>
                    <td class="num">{{ integer(row.max_days_overdue) }} วัน</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="arCustomers.meta.total > arCustomers.meta.limit" class="pager">
              <button :disabled="arCustomers.meta.offset === 0 || loading.arCustomers" @click="loadArCustomers(Math.max(0, arCustomers.meta.offset - arCustomers.meta.limit))">ก่อนหน้า</button>
              <span>{{ arCustomers.meta.offset + 1 }}–{{ Math.min(arCustomers.meta.offset + arCustomers.meta.limit, arCustomers.meta.total) }} จาก {{ integer(arCustomers.meta.total) }}</span>
              <button :disabled="arCustomers.meta.offset + arCustomers.meta.limit >= arCustomers.meta.total || loading.arCustomers" @click="loadArCustomers(arCustomers.meta.offset + arCustomers.meta.limit)">ถัดไป</button>
            </div>
          </article>
        </template>
      </section>

      <section v-if="activeChannelCode !== 'FLEET'" class="panel documents-panel">
        <div class="panel-head">
          <div>
            <p class="section-no">06 / SALES DOCUMENT AUDIT</p>
            <h2>รายการเอกสารขายล่าสุด</h2>
          </div>
          <div class="document-head-actions">
            <label class="vehicle-search">
              <span>ค้นหาทะเบียนรถ VanSale</span>
              <input v-model.trim="documentVehicleDraft" type="search" placeholder="รหัสรถ หรือชื่อรถ" @keyup.enter="applyDocumentVehicleFilter" />
            </label>
            <button type="button" :disabled="loading.documents" @click="applyDocumentVehicleFilter">ค้นหา</button>
            <button v-if="documentVehicleApplied" type="button" class="clear" :disabled="loading.documents" @click="clearDocumentVehicleFilter">ล้าง</button>
            <span class="document-count">{{ integer(documents.meta.total) }} เอกสาร</span>
          </div>
        </div>
        <div v-if="loading.documents" class="panel-state tall"><span class="spinner"></span>กำลังโหลดรายการเอกสาร</div>
        <div v-else-if="!documents.rows.length" class="panel-state tall">ไม่พบเอกสาร</div>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>วันที่ / เอกสาร</th><th>ช่องทาง</th><th>ประเภทขาย</th><th>ลูกค้า</th><th>พนักงานขาย</th><th>ทะเบียนรถ</th><th class="num">ก่อนส่วนลด</th><th class="num">ส่วนลด</th><th class="num">ยอดขายสุทธิ</th><th class="num">ยอดรับทันที</th><th class="num">รับทันที − ขายสด</th></tr></thead>
            <tbody>
              <tr v-for="row in documents.rows" :key="`${row.doc_no}-${row.trans_flag}`">
                <td><strong>{{ row.doc_no }}</strong><small>{{ fullDate(row.doc_date) }} {{ row.doc_time || '' }}</small></td>
                <td><span class="format-badge">{{ row.channel_label }}</span><small>{{ documentRule(row) }}</small></td>
                <td><span class="sale-type-badge" :class="String(row.sale_type || '').toLowerCase()">{{ saleTypeLabel(row.sale_type) }}</span><small>inquiry_type {{ row.inquiry_type ?? '-' }}</small></td>
                <td><strong>{{ row.cust_code || '-' }}</strong><small>{{ row.cust_name || '-' }}</small></td>
                <td><strong>{{ row.sale_code || '-' }}</strong><small>{{ row.sale_name || 'ไม่พบชื่อพนักงาน' }}</small></td>
                <td><strong>{{ row.vehicle_name || row.vehicle_code || '—' }}</strong><small v-if="row.vehicle_code && row.vehicle_name">รหัส {{ row.vehicle_code }}</small></td>
                <td class="num">{{ money(row.gross_sales_amount) }}</td>
                <td class="num discount-text">−{{ money(row.discount_amount) }}</td>
                <td class="num">{{ money(row.sales_amount) }}</td>
                <td class="num">{{ row.sale_type === 'CASH' ? money(row.immediate_payment) : '—' }}</td>
                <td class="num"><span v-if="row.sale_type === 'CASH'" :class="differenceTone(row.payment_difference)">{{ signedMoney(row.payment_difference) }}</span><span v-else>—</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="documents.meta.total > documents.meta.limit" class="pager">
          <button :disabled="documents.meta.offset === 0 || loading.documents" @click="loadDocuments(Math.max(0, documents.meta.offset - documents.meta.limit))">ก่อนหน้า</button>
          <span>{{ documents.meta.offset + 1 }}–{{ Math.min(documents.meta.offset + documents.meta.limit, documents.meta.total) }} จาก {{ integer(documents.meta.total) }}</span>
          <button :disabled="documents.meta.offset + documents.meta.limit >= documents.meta.total || loading.documents" @click="loadDocuments(documents.meta.offset + documents.meta.limit)">ถัดไป</button>
        </div>
      </section>

      <section v-if="activeChannelCode === 'ALL'" class="panel documents-panel credit-documents-panel">
        <div class="panel-head">
          <div>
            <p class="section-no">07 / CREDIT COLLECTION AUDIT</p>
            <h2>รายการรับชำระขายเชื่อ</h2>
          </div>
          <span class="document-count">{{ integer(creditCollections.meta.total) }} เอกสาร</span>
        </div>
        <div v-if="loading.creditCollections" class="panel-state tall"><span class="spinner"></span>กำลังโหลดเอกสารรับชำระหนี้</div>
        <div v-else-if="!creditCollections.rows.length" class="panel-state tall">ไม่พบเอกสารรับชำระหนี้</div>
        <div v-else class="table-wrap">
          <table class="credit-table">
            <thead><tr><th>วันที่รับ / เอกสาร</th><th>ลูกค้า</th><th class="num">ใบขายที่ชำระ</th><th>วิธีรับเงิน</th><th class="num">ยอดรับรวม</th><th class="num">เงินเข้าจริง</th><th class="num">ช่องทางอื่น</th></tr></thead>
            <tbody>
              <tr v-for="row in creditCollections.rows" :key="`${row.doc_no}-${row.trans_flag}`">
                <td><strong>{{ row.doc_no }}</strong><small>{{ fullDate(row.doc_date) }} {{ row.doc_time || '' }}</small></td>
                <td><strong>{{ row.cust_code || '-' }}</strong><small>{{ row.cust_name || '-' }}</small></td>
                <td class="num">{{ integer(row.invoice_count) }}</td>
                <td><small class="method-summary">{{ receiptMethodSummary(row) }}</small></td>
                <td class="num"><strong>{{ money(row.total_payment) }}</strong></td>
                <td class="num positive">{{ money(row.real_money) }}</td>
                <td class="num">{{ money(row.non_real_money) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="creditCollections.meta.total > creditCollections.meta.limit" class="pager">
          <button :disabled="creditCollections.meta.offset === 0 || loading.creditCollections" @click="loadCreditCollections(Math.max(0, creditCollections.meta.offset - creditCollections.meta.limit))">ก่อนหน้า</button>
          <span>{{ creditCollections.meta.offset + 1 }}–{{ Math.min(creditCollections.meta.offset + creditCollections.meta.limit, creditCollections.meta.total) }} จาก {{ integer(creditCollections.meta.total) }}</span>
          <button :disabled="creditCollections.meta.offset + creditCollections.meta.limit >= creditCollections.meta.total || loading.creditCollections" @click="loadCreditCollections(creditCollections.meta.offset + creditCollections.meta.limit)">ถัดไป</button>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '../composables/useApi.js'

const STORAGE_KEY = 'sales_channel_payment_report_filters_v5'

function bkkDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function defaultRange() {
  const dateTo = bkkDate()
  return { date_from: `${dateTo.slice(0, 7)}-01`, date_to: dateTo, customer: '', sale: '', vehicle: '', driver: '' }
}

function restoredFilters() {
  const defaults = defaultRange()
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    // วันที่เริ่มต้นของรายงานต้องเปิดด้วยเดือนปัจจุบันเสมอ
    // ส่วนข้อความค้นหายังคงจำไว้เพื่อไม่ต้องกรอกลูกค้า/คนขับซ้ำ
    return saved && typeof saved === 'object'
      ? { ...defaults, customer: String(saved.customer || ''), sale: String(saved.sale || ''), vehicle: String(saved.vehicle || ''), driver: String(saved.driver || '') }
      : defaults
  } catch {
    return defaults
  }
}

const initial = restoredFilters()
const draft = reactive({ ...initial })
const applied = reactive({ ...initial })
const errors = ref([])
const requestSequence = ref(0)
const loading = reactive({ overview: false, trend: false, fleet: false, documents: false, creditCollections: false, arOutstanding: false, arCustomers: false })
const overview = ref({ totals: {}, channels: [], receipt_sources: [] })
const trend = ref([])
const selectedTrend = ref(null)
const activeChannelCode = ref('ALL')
const fleet = ref({ summary: {}, drivers: [], trend: [] })
const documents = ref({ rows: [], meta: { total: 0, limit: 30, offset: 0 } })
const documentVehicleDraft = ref('')
const documentVehicleApplied = ref('')
const creditCollections = ref({ rows: [], meta: { total: 0, limit: 30, offset: 0 } })
const arOutstanding = ref({ summary: {}, aging: [] })
const arCustomers = ref({ rows: [], meta: { total: 0, limit: 20, offset: 0 } })

const paymentMethods = [
  { key: 'cash_amount', label: 'เงินสดสุทธิ (หลังหักเงินทอน)', short: 'สด', color: '#0f766e' },
  { key: 'transfer_amount', label: 'เงินโอน', short: 'โอน', color: '#2563eb' },
  { key: 'cheque_amount', label: 'เช็ค', short: 'เช็ค', color: '#7c3aed' },
  { key: 'credit_card_amount', label: 'บัตรเครดิต', short: 'บัตร', color: '#db2777' },
  { key: 'petty_cash_amount', label: 'เงินสดย่อย', short: 'ย่อย', color: '#d97706' },
  { key: 'advance_amount', label: 'เงินล่วงหน้า', short: 'ล่วง', color: '#0891b2' },
  { key: 'deposit_amount', label: 'เงินมัดจำ', short: 'มัด', color: '#4f46e5' },
  { key: 'coupon_amount', label: 'คูปอง', short: 'คูป', color: '#ea580c' },
  { key: 'receive_other_amount', label: 'รับอื่น / รายได้อื่น', short: 'อื่น', color: '#475569' },
  { key: 'other_currency_amount', label: 'เงินสกุลอื่น', short: 'FX', color: '#059669' },
  { key: 'wallet_amount', label: 'e-Wallet', short: 'Wallet', color: '#0284c7' },
  { key: 'point_amount', label: 'แต้ม', short: 'Point', color: '#9333ea' },
]

const channelTabDefinitions = [
  { order: 0, code: 'ALL', label: 'ภาพรวมทั้งหมด' },
  { order: 1, code: 'POS', label: 'POS' },
  { order: 2, code: 'INV_NO_VAT', label: 'INV No Vat' },
  { order: 3, code: 'INV_VAT', label: 'INV Vat' },
  { order: 4, code: 'VAN_SALE', label: 'VanSale' },
  { order: 5, code: 'VAN_PREORDER', label: 'Preorder VanSale' },
  { order: 6, code: 'FLEET', label: 'Fleet Delivery' },
]

const storeTotals = computed(() => overview.value.totals || {})
const channels = computed(() => overview.value.channels || [])
const channelTabs = computed(() => channelTabDefinitions.map(definition => {
  if (definition.code === 'ALL') {
    return { ...definition, amount: Number(storeTotals.value.sales_amount || 0), bill_count: Number(storeTotals.value.bill_count || 0) }
  }
  if (definition.code === 'FLEET') {
    return {
      ...definition,
      amount: Number(fleet.value.summary?.sales_amount || 0),
      bill_count: Number(fleet.value.summary?.bill_count || 0),
    }
  }
  const row = channels.value.find(channel => channel.channel_code === definition.code)
  return { ...definition, amount: Number(row?.sales_amount || 0), bill_count: Number(row?.bill_count || 0) }
}))
const activeChannelTab = computed(() => channelTabs.value.find(tab => tab.code === activeChannelCode.value) || channelTabs.value[0])
const activeChannelRow = computed(() => channels.value.find(channel => channel.channel_code === activeChannelCode.value) || null)
const activePosChannel = computed(() => !['ALL', 'FLEET'].includes(activeChannelCode.value))

function sumKeys(row, keys) {
  return Math.round((keys.reduce((sum, key) => sum + Number(row?.[key] || 0), 0) + Number.EPSILON) * 100) / 100
}

const totals = computed(() => {
  if (activeChannelCode.value === 'ALL') return storeTotals.value
  if (activeChannelCode.value === 'FLEET') {
    const summary = fleet.value.summary || {}
    const sales = Number(summary.sales_amount || 0)
    const payment = Number(summary.cash_amount || 0) + Number(summary.transfer_amount || 0)
    return {
      bill_count: Number(summary.bill_count || 0), gross_sales_amount: sales, discount_amount: 0, sales_amount: sales,
      cash_sale_bill_count: 0, credit_sale_bill_count: 0, unknown_sale_bill_count: Number(summary.bill_count || 0),
      cash_sales_amount: 0, credit_sales_amount: 0, unknown_sales_amount: sales, cash_sales_ratio: 0, credit_sales_ratio: 0,
      cash_sale_payment: payment, credit_collection_payment: 0, total_payment: payment, real_money: payment,
      non_real_money: 0, credit_collection_ratio: 0, payment_difference: payment - sales,
    }
  }
  const row = activeChannelRow.value || {}
  const realMoney = sumKeys(row, ['cash_amount', 'transfer_amount', 'cheque_amount', 'credit_card_amount', 'other_currency_amount', 'wallet_amount'])
  return {
    ...row,
    cash_sale_payment: Number(row.total_payment || 0), credit_collection_payment: 0,
    real_money: realMoney, non_real_money: Number(row.total_payment || 0) - realMoney,
    credit_collection_ratio: 0, payment_difference: Number(row.total_payment || 0) - Number(row.sales_amount || 0),
  }
})

const receiptSources = computed(() => {
  if (activeChannelCode.value === 'ALL') return overview.value.receipt_sources || []
  if (activeChannelCode.value === 'FLEET') {
    const summary = fleet.value.summary || {}
    const total = Number(summary.cash_amount || 0) + Number(summary.transfer_amount || 0)
    return [
      { receipt_source: 'CASH_SALE', receipt_label: 'รับเงินจาก Fleet Check-out', total_payment: total, doc_count: summary.bill_count, real_money: total },
      { receipt_source: 'CREDIT_COLLECTION', receipt_label: 'รับชำระขายเชื่อ (ไม่พบการเชื่อมโยง)', total_payment: 0, doc_count: 0, real_money: 0 },
    ]
  }
  const row = activeChannelRow.value || {}
  return [
    { receipt_source: 'CASH_SALE', receipt_label: 'รับทันทีจากการขาย', total_payment: row.total_payment, doc_count: row.cash_sale_bill_count, real_money: totals.value.real_money },
    { receipt_source: 'CREDIT_COLLECTION', receipt_label: 'รับชำระขายเชื่อ (ไม่จัดสรรย้อนกลับ)', total_payment: 0, doc_count: 0, real_money: 0 },
  ]
})
const activePaymentMix = computed(() => {
  const row = activeChannelCode.value === 'ALL' ? storeTotals.value : activeChannelCode.value === 'FLEET'
    ? { cash_amount: fleet.value.summary?.cash_amount, transfer_amount: fleet.value.summary?.transfer_amount }
    : activeChannelRow.value || {}
  const mix = Object.fromEntries(paymentMethods.map(method => [method.key, Number(row?.[method.key] || 0)]))
  mix.payment_components = sumKeys(mix, paymentMethods.map(method => method.key))
  mix.total_payment = Number(row?.total_payment ?? mix.payment_components)
  mix.allocation_difference = Math.round(((mix.payment_components - mix.total_payment) + Number.EPSILON) * 100) / 100
  return mix
})
const paymentMixLoading = computed(() => activeChannelCode.value === 'FLEET' ? loading.fleet : loading.overview)
const paymentMixNote = computed(() => activeChannelCode.value === 'ALL'
  ? 'รวมวิธีรับเงินจากรับทันที 44 และรับชำระหนี้ 239 · เงินสดใช้ cash_amount สุทธิหลังหักเงินทอน'
  : activeChannelCode.value === 'FLEET'
    ? 'ข้อมูลรับเงินสดและเงินโอนจาก Fleet Check-out'
    : `แสดงเฉพาะยอดรับทันที 44 ของ ${activeChannelTab.value.label} · ยอดรับชำระหนี้ 239 ไม่ถูกจัดสรรย้อนกลับเข้าช่องทางขาย`)
const arSummary = computed(() => arOutstanding.value.summary || {})
const arAging = computed(() => arOutstanding.value.aging || [])
const displayTrend = computed(() => activeChannelCode.value === 'FLEET' ? (fleet.value.trend || []) : trend.value)
const maxTrend = computed(() => Math.max(0, ...displayTrend.value.flatMap(row => [Number(row.sales_amount || 0), Number(row.total_payment || 0)])))
const isAnyLoading = computed(() => Object.values(loading).some(Boolean))
const dateError = computed(() => draft.date_from && draft.date_to && draft.date_from > draft.date_to ? 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด' : '')
const periodLabel = computed(() => `${fullDate(applied.date_from)} — ${fullDate(applied.date_to)}`)

function params(extra = {}, includeChannel = true) {
  const result = { ...applied, ...extra }
  if (includeChannel && activePosChannel.value) result.channel = activeChannelCode.value
  return result
}

function recordError(label, error) {
  if (!errors.value.some(item => item.startsWith(label))) {
    errors.value.push(`${label}: ${error.response?.data?.error || error.message || 'โหลดไม่สำเร็จ'}`)
  }
}

async function loadOverview(seq) {
  loading.overview = true
  try {
    const { data } = await api.get('/sales-channel-payments/overview', { params: params({}, false) })
    if (seq === requestSequence.value) overview.value = data.data || { totals: {}, channels: [], receipt_sources: [] }
  } catch (error) {
    if (seq === requestSequence.value) recordError('ภาพรวม', error)
  } finally {
    if (seq === requestSequence.value) loading.overview = false
  }
}

async function loadTrend(seq) {
  loading.trend = true
  try {
    const { data } = await api.get('/sales-channel-payments/trend', { params: params() })
    if (seq === requestSequence.value) {
      trend.value = data.data || []
      selectedTrend.value = null
    }
  } catch (error) {
    if (seq === requestSequence.value) recordError('แนวโน้ม', error)
  } finally {
    if (seq === requestSequence.value) loading.trend = false
  }
}

async function loadFleet(seq) {
  loading.fleet = true
  try {
    const { data } = await api.get('/sales-channel-payments/fleet', { params: params({}, false) })
    if (seq === requestSequence.value) fleet.value = data.data || { summary: {}, drivers: [], trend: [] }
  } catch (error) {
    if (seq === requestSequence.value) recordError('ขนส่ง', error)
  } finally {
    if (seq === requestSequence.value) loading.fleet = false
  }
}

async function loadDocuments(offset = 0, seq = requestSequence.value) {
  loading.documents = true
  try {
    const { data } = await api.get('/sales-channel-payments/documents', {
      params: params({ limit: 30, offset, vehicle: documentVehicleApplied.value || applied.vehicle || undefined })
    })
    if (seq === requestSequence.value) documents.value = { rows: data.data || [], meta: data.meta || { total: 0, limit: 30, offset } }
  } catch (error) {
    if (seq === requestSequence.value) recordError('เอกสาร', error)
  } finally {
    if (seq === requestSequence.value) loading.documents = false
  }
}

async function loadCreditCollections(offset = 0, seq = requestSequence.value) {
  loading.creditCollections = true
  try {
    const { data } = await api.get('/sales-channel-payments/credit-collections', { params: params({ limit: 30, offset }) })
    if (seq === requestSequence.value) creditCollections.value = { rows: data.data || [], meta: data.meta || { total: 0, limit: 30, offset } }
  } catch (error) {
    if (seq === requestSequence.value) recordError('รับชำระขายเชื่อ', error)
  } finally {
    if (seq === requestSequence.value) loading.creditCollections = false
  }
}

async function loadArOutstanding(seq) {
  loading.arOutstanding = true
  try {
    const { data } = await api.get('/sales-channel-payments/ar-outstanding', { params: params() })
    if (seq === requestSequence.value) arOutstanding.value = data.data || { summary: {}, aging: [] }
  } catch (error) {
    if (seq === requestSequence.value) recordError('ลูกหนี้คงเหลือ', error)
  } finally {
    if (seq === requestSequence.value) loading.arOutstanding = false
  }
}

async function loadArCustomers(offset = 0, seq = requestSequence.value) {
  loading.arCustomers = true
  try {
    const { data } = await api.get('/sales-channel-payments/ar-outstanding-customers', { params: params({ limit: 20, offset }) })
    if (seq === requestSequence.value) arCustomers.value = { rows: data.data || [], meta: data.meta || { total: 0, limit: 20, offset } }
  } catch (error) {
    if (seq === requestSequence.value) recordError('ลูกหนี้รายลูกค้า', error)
  } finally {
    if (seq === requestSequence.value) loading.arCustomers = false
  }
}

async function loadAll() {
  const seq = ++requestSequence.value
  errors.value = []
  await Promise.allSettled([loadOverview(seq), loadTrend(seq), loadFleet(seq), loadDocuments(0, seq), loadArOutstanding(seq)])
  if (seq === requestSequence.value) await Promise.allSettled([loadCreditCollections(0, seq), loadArCustomers(0, seq)])
}

async function selectChannel(code) {
  if (code === activeChannelCode.value || isAnyLoading.value) return
  activeChannelCode.value = code
  selectedTrend.value = null
  errors.value = []
  if (code === 'FLEET') return

  const seq = ++requestSequence.value
  await Promise.allSettled([loadTrend(seq), loadDocuments(0, seq), loadArOutstanding(seq), loadArCustomers(0, seq)])
  if (code === 'ALL' && seq === requestSequence.value) await loadCreditCollections(0, seq)
}

function applyDocumentVehicleFilter() {
  documentVehicleApplied.value = documentVehicleDraft.value.trim()
  loadDocuments(0)
}

function clearDocumentVehicleFilter() {
  documentVehicleDraft.value = ''
  documentVehicleApplied.value = ''
  loadDocuments(0)
}

function applyFilters() {
  if (dateError.value) return
  Object.assign(applied, draft)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applied))
  loadAll()
}

function resetFilters() {
  Object.assign(draft, defaultRange())
  documentVehicleDraft.value = ''
  documentVehicleApplied.value = ''
  applyFilters()
}

function money(value) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))
}

function integer(value) {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function decimal(value) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value || 0))
}

function signedMoney(value) {
  const numberValue = Number(value || 0)
  const prefix = numberValue > 0 ? '+' : numberValue < 0 ? '−' : ''
  return `${prefix}${money(Math.abs(numberValue))}`
}

function percent(value, total) {
  const denominator = Number(total || 0)
  return denominator ? `${((Number(value || 0) / denominator) * 100).toFixed(1)}% ของช่องทางรับเงิน` : '0.0% ของช่องทางรับเงิน'
}

function percentOf(value, total) {
  const denominator = Number(total || 0)
  return denominator ? `${decimal((Number(value || 0) / denominator) * 100)}% ของลูกหนี้` : '0.0% ของลูกหนี้'
}

function agingWidth(value) {
  const denominator = Number(arSummary.value.outstanding_amount || 0)
  if (!denominator) return '0%'
  return `${Math.max(0, Math.min(100, (Number(value || 0) / denominator) * 100))}%`
}

function differenceTone(value) {
  const amount = Number(value || 0)
  if (Math.abs(amount) < 0.01) return 'balanced'
  return amount > 0 ? 'positive' : 'negative'
}

function differenceText(value) {
  const amount = Number(value || 0)
  if (Math.abs(amount) < 0.01) return 'ยอดขายและยอดรับตรงกัน'
  return amount > 0 ? 'ยอดรับสูงกว่ายอดขาย' : 'ยอดรับต่ำกว่ายอดขาย'
}

function mixWidth(value, total) {
  const denominator = Number(total || 0)
  if (!denominator) return '0%'
  return `${Math.max(0, Math.min(100, (Number(value || 0) / denominator) * 100))}%`
}

function trendHeight(value) {
  return maxTrend.value ? `${Math.max(2, (Number(value || 0) / maxTrend.value) * 100)}%` : '0%'
}

function toDate(value) {
  if (!value) return null
  const plain = String(value).slice(0, 10)
  const [year, month, day] = plain.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day) : null
}

function fullDate(value) {
  const date = toDate(value)
  return date ? new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : '-'
}

function shortDate(value) {
  const date = toDate(value)
  return date ? new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short' }).format(date) : '-'
}

function trendTitle(point) {
  return `${fullDate(point.doc_date)} · ขายสด ${money(point.cash_sales_amount)} · ขายเชื่อ ${money(point.credit_sales_amount)} · รับทันที ${money(point.cash_sale_payment)} · รับชำระหนี้ ${money(point.credit_collection_payment)}`
}

function saleTypeLabel(value) {
  if (value === 'CASH') return 'ขายสด'
  if (value === 'CREDIT') return 'ขายเชื่อ'
  return 'ไม่ระบุ'
}

function receiptMethodSummary(row) {
  const methods = paymentMethods
    .filter(method => Math.abs(Number(row[method.key] || 0)) >= 0.01)
    .map(method => `${method.label} ${money(row[method.key])}`)
  return methods.length ? methods.join(' · ') : 'ไม่ระบุวิธีรับเงิน'
}

function documentRule(row) {
  if (row.channel_label === 'POS') return 'is_pos = 1'
  const docNo = String(row.doc_no || '').trim().toUpperCase()
  const prefix = ['MINVWSA', 'MINV', 'INVW', 'INV'].find(value => docNo.startsWith(value))
  return prefix ? `is_pos = 0 · Prefix ${prefix}` : 'is_pos = 0'
}

onMounted(loadAll)
</script>

<style scoped>
.channel-report { --ink:#172033; --muted:#6c778d; --line:#e2e7ef; --paper:#fff; --wash:#f4f6f9; --blue:#1e5eff; --green:#0f9f78; min-height:100vh; background:radial-gradient(circle at 8% 0%,#e8efff 0,transparent 30%),var(--wash); color:var(--ink); padding:28px 24px 64px; }
.report-shell { max-width:1500px; margin:0 auto; }
.hero { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; padding:26px 2px 28px; border-bottom:3px solid var(--ink); }
.eyebrow,.section-no { margin:0 0 7px; color:var(--blue); font-size:11px; font-weight:800; letter-spacing:.18em; }
.hero h1 { margin:0; font-size:clamp(32px,4.4vw,68px); line-height:1; letter-spacing:-.045em; }
.hero h1 span { color:var(--blue); }
.hero-copy { margin:13px 0 0; color:var(--muted); font-size:14px; }
.period-stamp { min-width:240px; padding-left:22px; border-left:1px solid #b8c2d2; }
.period-stamp span,.period-stamp strong { display:block; }
.period-stamp span { color:var(--muted); font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }
.period-stamp strong { margin-top:5px; font-size:16px; }
.filter-card { position:sticky; top:0; z-index:20; display:grid; grid-template-columns:130px 130px repeat(4,minmax(150px,1fr)) auto; gap:10px; align-items:end; margin:18px 0; padding:16px; background:rgba(255,255,255,.96); border:1px solid var(--line); border-radius:15px; box-shadow:0 8px 30px rgba(31,45,72,.08); backdrop-filter:blur(12px); }
.filter-card label span { display:block; margin-bottom:6px; font-size:12px; font-weight:750; }
.filter-card label em { color:var(--muted); font-size:10px; font-style:normal; font-weight:500; }
.filter-card input { width:100%; height:42px; border:1px solid #cad2df; border-radius:9px; padding:0 11px; background:#fff; color:var(--ink); font:inherit; font-size:13px; outline:none; }
.filter-card input:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(30,94,255,.12); }
.filter-actions { display:flex; gap:8px; }
.primary-btn,.ghost-btn,.pager button,.partial-warning button { height:42px; border-radius:9px; padding:0 16px; border:1px solid transparent; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
.primary-btn { background:var(--blue); color:#fff; box-shadow:0 7px 16px rgba(30,94,255,.22); }
.ghost-btn,.pager button { background:#fff; border-color:#cad2df; color:var(--ink); }
button:disabled { opacity:.5; cursor:not-allowed; }
.filter-error { grid-column:1/-1; margin:0; color:#b42318; font-size:12px; }
.partial-warning { display:flex; align-items:center; gap:10px; padding:12px 15px; margin-bottom:16px; border:1px solid #fed7aa; background:#fff7ed; border-radius:10px; color:#9a3412; font-size:12px; }
.partial-warning span { flex:1; }.partial-warning button { height:32px; background:#fff; border:1px solid #fdba74; color:#9a3412; }
.kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; border:1px solid var(--line); border-radius:16px; overflow:hidden; background:var(--line); }
.kpi-card { min-width:0; padding:24px; background:#fff; }
.kpi-card span,.kpi-card small,.kpi-card strong { display:block; }
.kpi-card span { color:var(--muted); font-size:12px; font-weight:700; }
.kpi-card strong { margin:12px 0 8px; font-size:clamp(25px,2.3vw,38px); line-height:1; letter-spacing:-.035em; }
.kpi-card small { color:var(--muted); font-size:11px; }.kpi-card.ink{background:var(--ink);color:#fff}.kpi-card.ink span,.kpi-card.ink small{color:#b9c3d4}.kpi-card.cash-sales{background:#eef6ff}.kpi-card.cash-sales strong{color:#1769d2}.kpi-card.credit-sales{background:#f6f1ff}.kpi-card.credit-sales strong{color:#7651c8}.kpi-card.real-cash{background:#effbf6}.kpi-card.real-cash strong{color:#08775b}.discount-text{color:#b76b00}.kpi-card.positive strong,.positive{color:#0f8a66}.kpi-card.negative strong,.negative{color:#d13f35}.kpi-card.balanced strong,.balanced{color:#31506f}
.calculation-note{margin:0;padding:10px 14px;border:1px solid #f1d69c;border-top:0;border-radius:0 0 12px 12px;background:#fffaf0;color:#76541b;font-size:11px;text-align:right}
.classification-warning{margin:10px 0 0;padding:10px 14px;border:1px solid #fecaca;border-radius:10px;background:#fff1f2;color:#a01824;font-size:11px}
.receipt-sources-panel{margin-top:18px}.receipt-source-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line)}.receipt-source-grid article{min-width:0;padding:20px 22px;background:#fff}.receipt-source-grid article.cash{background:#f0fdf8}.receipt-source-grid article.credit{background:#eff6ff}.receipt-source-grid article.ratio{background:#f7f3ff}.receipt-source-grid article.real-money{background:#fff9ea}.receipt-source-grid span,.receipt-source-grid strong,.receipt-source-grid small{display:block}.receipt-source-grid span{color:var(--muted);font-size:10px;font-weight:750}.receipt-source-grid strong{margin:8px 0 6px;font-size:24px;letter-spacing:-.025em}.receipt-source-grid small{color:#7b8799;font-size:9px}
.report-grid { display:grid; grid-template-columns:minmax(0,1.18fr) minmax(380px,.82fr); gap:18px; margin-top:18px; }
.panel { background:var(--paper); border:1px solid var(--line); border-radius:16px; overflow:hidden; }
.panel-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:22px 24px 18px; border-bottom:1px solid var(--line); }
.panel-head h2,.section-banner h2 { margin:0; font-size:22px; letter-spacing:-.02em; }.panel-head .section-no,.section-banner .section-no{margin-bottom:4px}
.source-chip,.document-count { padding:6px 9px; border-radius:99px; background:#eaf0ff; color:var(--blue); font-size:10px; font-weight:850; letter-spacing:.08em; white-space:nowrap; }.source-chip.green{background:#e6f8f1;color:#08775b}.source-chip.dark{background:#253149;color:#fff}
.panel-state { min-height:180px; display:flex; align-items:center; justify-content:center; gap:10px; color:var(--muted); font-size:13px; }.panel-state.tall{min-height:260px}.spinner{width:18px;height:18px;border:2px solid #d6dce6;border-top-color:var(--blue);border-radius:50%;animation:spin .75s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.channel-overview-tabs{margin:0 0 12px}.channel-tabs-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 24px 17px;border-bottom:1px solid var(--line)}.channel-tabs-heading h2{margin:0;font-size:22px;letter-spacing:-.02em}.channel-tabs-heading p:last-child{margin:7px 0 0;color:var(--muted);font-size:13px}.scope-banner{display:flex;align-items:center;gap:9px;margin:0 0 12px;padding:10px 14px;border:1px solid #cad8f5;border-radius:10px;background:#edf3ff;color:#33445f}.scope-banner span{color:var(--muted)}.scope-banner strong{color:var(--blue)}.scope-banner small{margin-left:auto;color:var(--muted);font-size:13px}.channel-tabs{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;padding:1px;background:var(--line);border-bottom:1px solid var(--line)}.channel-tabs button{min-width:0;display:grid;grid-template-columns:auto 1fr;column-gap:8px;row-gap:3px;padding:13px 14px;border:0;background:#fff;color:var(--ink);font:inherit;text-align:left;cursor:pointer}.channel-tabs button:hover{background:#f5f8ff}.channel-tabs button.active{position:relative;background:#edf3ff;box-shadow:inset 0 -3px 0 var(--blue)}.channel-tabs button>span{grid-row:1/3;color:#9aa6b8;font-size:11px;font-weight:900}.channel-tabs button>strong{overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.channel-tabs button>small{overflow:hidden;color:var(--muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.channel-list { padding:8px 24px 14px; }.selected-channel-list{min-height:255px}.channel-row{display:grid;grid-template-columns:42px 1fr;gap:12px;padding:18px 0;border-bottom:1px solid #edf0f4}.channel-row:last-child{border-bottom:0}.selected-channel-row{padding-top:22px}.channel-rank{font-size:12px;font-weight:850;color:#a3adbd;padding-top:2px}.channel-title,.amount-line{display:flex;align-items:center;gap:10px}.channel-title{justify-content:space-between}.channel-title strong{font-size:15px}.channel-title span{color:var(--muted);font-size:11px}.format-codes{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:8px}.format-caption{margin-right:3px;color:#98a2b3;font-size:8px;font-weight:850;letter-spacing:.12em}.format-codes code{padding:2px 6px;border:1px solid #dce4f0;border-radius:5px;background:#f7f9fc;color:#53647c;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:9px}.amount-line{margin-top:8px;color:var(--muted);font-size:10px;flex-wrap:wrap}.channel-sale-split{display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:7px;margin-top:10px}.channel-sale-split>div{padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#f8fafc}.channel-sale-split>div.cash{background:#eef6ff;border-color:#d6e6fb}.channel-sale-split>div.credit{background:#f7f3ff;border-color:#e6dcfb}.channel-sale-split>div.received{background:#effbf6;border-color:#d4f0e4}.channel-sale-split span,.channel-sale-split strong,.channel-sale-split small{display:block}.channel-sale-split span{color:var(--muted);font-size:8px}.channel-sale-split strong{margin-top:3px;font-size:13px}.channel-sale-split small{margin-top:3px;font-size:8px}.sales-mix-track{display:flex;height:6px;margin-top:9px;background:#edf1f6;border-radius:99px;overflow:hidden}.sales-mix-track span{height:100%}.sales-mix-track .cash{background:#2f80ed}.sales-mix-track .credit{background:#8b5bd6}.sales-mix-track .unknown{background:#ef9f32}.fleet-tab-content{min-height:255px;padding:20px 22px}.fleet-tab-kpis{display:grid;grid-template-columns:1fr 1fr;gap:9px}.fleet-tab-kpis article{padding:14px;border:1px solid var(--line);border-radius:10px;background:#f8fafc}.fleet-tab-kpis article:first-child{background:#edf3ff;border-color:#d8e4fb}.fleet-tab-kpis span,.fleet-tab-kpis strong,.fleet-tab-kpis small{display:block}.fleet-tab-kpis span{color:var(--muted)}.fleet-tab-kpis strong{margin:6px 0;font-size:20px}.fleet-tab-kpis small{color:var(--muted)}.fleet-tab-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;color:var(--muted)}.fleet-tab-footer a{color:var(--blue);font-weight:800;text-decoration:none}.data-note{margin:0;padding:12px 24px 16px;color:var(--muted);font-size:11px;border-top:1px solid var(--line);background:#fafbfc}
.payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line)}.payment-card{display:grid;grid-template-columns:40px 1fr;gap:10px;align-items:center;min-height:86px;padding:14px;background:#fff}.payment-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:color-mix(in srgb,var(--method-color) 12%,white);color:var(--method-color);font-size:9px;font-weight:900}.payment-card span,.payment-card strong,.payment-card small{display:block}.payment-card span{color:var(--muted);font-size:10px}.payment-card strong{margin-top:3px;font-size:16px}.payment-card small{margin-top:2px;color:#98a2b3;font-size:9px}.payment-check{display:flex;justify-content:space-between;gap:12px;padding:15px 20px;background:#f8fafc;border-top:1px solid var(--line);font-size:11px}.payment-check strong{font-size:13px}.payment-note{margin:0;padding:10px 20px 13px;background:#f8fafc;color:var(--muted);font-size:10px;line-height:1.5}
.trend-panel{margin-top:18px}.legend{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--muted);font-size:10px}.legend em{margin-left:10px;color:#8792a5;font-size:9px;font-style:normal}.sale-dot,.pay-dot{width:9px;height:9px;border-radius:2px;display:inline-block}.cash-sale-dot{background:#2f80ed}.credit-sale-dot{margin-left:6px;background:#8b5bd6}.immediate-dot{margin-left:8px;background:#26a77a}.collection-dot{margin-left:6px;background:#f59e42}.trend-scroll{overflow-x:auto;padding:24px 22px 14px}.trend-chart{height:280px;display:flex;align-items:stretch;gap:8px;border-bottom:1px solid #ccd4e0;background:repeating-linear-gradient(to bottom,#fff 0,#fff 69px,#eef1f5 70px)}.trend-column{flex:1;min-width:42px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:0 3px 3px;border:0;border-radius:7px 7px 0 0;background:transparent;color:inherit;font:inherit;cursor:pointer}.trend-column:hover,.trend-column:focus-visible{background:#f1f5ff;outline:none}.trend-column.active{background:#e8efff;box-shadow:inset 0 -3px 0 var(--blue)}.bar-space{width:100%;height:226px;display:flex;align-items:flex-end;justify-content:center;gap:4px}.bar-stack{width:12px;min-height:2px;display:flex;flex-direction:column-reverse;overflow:hidden;border-radius:4px 4px 0 0;background:#e8edf3;transition:filter .15s,transform .15s}.bar-stack i{display:block;width:100%;min-height:0}.bar-stack.receipt .immediate{background:#26a77a}.bar-stack.receipt .collection{background:#f59e42}.bar-stack.sales .cash{background:#2f80ed}.bar-stack.sales .credit{background:#8b5bd6}.bar-stack.sales .unknown{background:#ef9f32}.trend-column:hover .bar-stack,.trend-column.active .bar-stack{filter:saturate(1.2);transform:scaleX(1.18)}.trend-column strong{font-size:9px;margin-top:7px;white-space:nowrap}.trend-column small{font-size:8px;color:var(--muted)}.trend-detail{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:stretch;padding:16px 22px;border-top:1px solid var(--line);background:#f8fafc}.trend-detail-head{display:flex;align-items:flex-start;gap:20px;padding-right:20px;border-right:1px solid var(--line)}.trend-detail-head span,.trend-detail-head strong{display:block}.trend-detail-head span{color:var(--muted);font-size:9px;font-weight:750;letter-spacing:.08em}.trend-detail-head strong{margin-top:4px;font-size:15px;white-space:nowrap}.trend-detail-head button{width:27px;height:27px;border:1px solid #cdd5e1;border-radius:7px;background:#fff;color:#64748b;font-size:18px;line-height:1;cursor:pointer}.trend-detail dl{display:grid;grid-template-columns:repeat(5,minmax(90px,1fr));gap:12px;margin:0}.trend-detail dl div{min-width:0}.trend-detail dt{color:var(--muted);font-size:9px}.trend-detail dd{margin:4px 0 0;font-size:14px;font-weight:850;font-variant-numeric:tabular-nums}.trend-detail dl small{display:block;margin-top:2px;color:var(--muted);font-size:8px}
.ar-section{margin-top:36px}.ar-banner{border-bottom-color:#5b3fa3}.ar-chip{background:#eee8ff;color:#6742b5}.ar-loading{min-height:170px;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--muted)}.ar-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.ar-kpis article{min-width:0;padding:20px;border:1px solid var(--line);border-radius:14px;background:#fff}.ar-kpis article.outstanding{background:#f5f1ff;border-color:#e1d7f8}.ar-kpis article.overdue{background:#fff1f1;border-color:#f5d1d1}.ar-kpis article.not-due{background:#eef8ff;border-color:#d7e9f7}.ar-kpis article.credit-balance{background:#f7f8fa}.ar-kpis span,.ar-kpis strong,.ar-kpis small{display:block}.ar-kpis span{color:var(--muted);font-size:10px;font-weight:750}.ar-kpis strong{margin:8px 0 6px;font-size:25px;letter-spacing:-.025em}.ar-kpis .outstanding strong{color:#6742b5}.ar-kpis .overdue strong{color:#c83d45}.ar-kpis .not-due strong{color:#1769a8}.ar-kpis small{color:#7f8a9b;font-size:9px}.aging-panel{margin-bottom:14px}.aging-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:var(--line)}.aging-grid article{min-width:0;padding:17px 18px;background:#fff}.aging-grid article.not-due{background:#f2f9ff}.aging-grid article.due-1-30{background:#fff9eb}.aging-grid article.due-31-60{background:#fff5e8}.aging-grid article.due-61-90{background:#fff0eb}.aging-grid article.due-over-90{background:#fff0f1}.aging-grid span,.aging-grid strong,.aging-grid small{display:block}.aging-grid span{min-height:28px;color:var(--muted);font-size:9px}.aging-grid strong{margin:4px 0;font-size:18px}.aging-grid small{color:#8b95a5;font-size:8px}.aging-track{height:4px;margin-top:10px;border-radius:99px;background:rgba(96,107,128,.13);overflow:hidden}.aging-track i{display:block;height:100%;border-radius:inherit;background:#5c77a7}.due-1-30 .aging-track i{background:#e2a028}.due-31-60 .aging-track i{background:#e88430}.due-61-90 .aging-track i{background:#dc633d}.due-over-90 .aging-track i{background:#c83d45}.ar-customers-panel{border-color:#ddd6ee}.ar-table{min-width:1180px}
.fleet-section{margin-top:36px}.section-banner{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:14px;padding:0 2px 14px;border-bottom:3px solid var(--ink)}.section-banner p{margin:5px 0 0;color:var(--muted);font-size:12px}.section-banner a{color:var(--blue);font-weight:800}.fleet-loading{min-height:160px;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--muted)}.fleet-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.fleet-kpis article{padding:20px;background:#fff;border:1px solid var(--line);border-radius:14px}.fleet-kpis span,.fleet-kpis strong,.fleet-kpis small{display:block}.fleet-kpis span{color:var(--muted);font-size:11px}.fleet-kpis strong{margin:9px 0 6px;font-size:24px}.fleet-kpis small{color:#8b96a8;font-size:10px}.driver-grid{display:grid;grid-template-columns:1fr 1fr}.driver-grid article{display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;padding:15px 20px;border-bottom:1px solid var(--line)}.driver-grid article:nth-child(odd){border-right:1px solid var(--line)}.driver-number{color:#a6b0c0;font-size:10px;font-weight:900}.driver-grid strong,.driver-grid small{display:block}.driver-grid strong{font-size:13px}.driver-grid small{margin-top:3px;color:var(--muted);font-size:9px}.driver-grid em{font-style:normal;font-size:13px;font-weight:850}
.documents-panel{margin-top:18px}.credit-documents-panel{border-color:#d9e5f8}.table-wrap{overflow:auto}table{width:100%;min-width:1280px;border-collapse:collapse}.credit-table{min-width:1080px}th{padding:11px 16px;background:#f8fafc;color:var(--muted);font-size:10px;text-align:left;letter-spacing:.06em}td{padding:12px 16px;border-top:1px solid var(--line);font-size:12px;vertical-align:middle}td strong,td small{display:block}td small{margin-top:3px;color:var(--muted);font-size:9px}.method-summary{max-width:360px;line-height:1.55}.num{text-align:right;font-variant-numeric:tabular-nums}.format-badge,.sale-type-badge{display:inline-block;padding:3px 7px;border-radius:99px;font-size:9px;font-weight:800}.format-badge{background:#edf2ff;color:#315bd8}.sale-type-badge.cash{background:#e8f3ff;color:#1769d2}.sale-type-badge.credit{background:#f1eaff;color:#7043bd}.sale-type-badge.unknown{background:#fff2dc;color:#9a5a00}.pager{display:flex;align-items:center;justify-content:center;gap:14px;padding:14px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}.pager button{height:34px}

/* Accessibility: ข้อมูลประกอบและข้อความสีเทาต้องอ่านได้ชัดอย่างน้อย 13px */
.channel-report .filter-card label span,.channel-report .filter-card label em,.channel-report .filter-card input,
.channel-report .hero-copy,.channel-report .period-stamp span,.channel-report .period-stamp strong,
.channel-report .kpi-card span,.channel-report .kpi-card small,.channel-report .calculation-note,.channel-report .classification-warning,
.channel-report .receipt-source-grid span,.channel-report .receipt-source-grid small,.channel-report .data-note,
.channel-report .channel-tabs button>span,.channel-report .channel-tabs button>small,
.channel-report .channel-title span,.channel-report .format-caption,.channel-report .format-codes code,.channel-report .amount-line,
.channel-report .channel-sale-split span,.channel-report .channel-sale-split small,
.channel-report .fleet-tab-kpis span,.channel-report .fleet-tab-kpis small,.channel-report .fleet-tab-footer,
.channel-report .payment-card span,.channel-report .payment-card small,.channel-report .payment-check,.channel-report .payment-note,
.channel-report .legend,.channel-report .legend em,.channel-report .trend-column small,.channel-report .trend-detail-head span,
.channel-report .trend-detail dt,.channel-report .trend-detail dl small,
.channel-report .section-banner p,.channel-report .ar-kpis span,.channel-report .ar-kpis small,
.channel-report .aging-grid span,.channel-report .aging-grid small,
.channel-report .fleet-kpis span,.channel-report .fleet-kpis small,.channel-report .driver-grid small,
.channel-report th,.channel-report td,.channel-report td small,.channel-report .method-summary,.channel-report .pager,
.channel-report .source-chip,.channel-report .document-count,.channel-report .format-badge,.channel-report .sale-type-badge {
  font-size:13px;
  line-height:1.45;
}
@media(max-width:1100px){.filter-card{grid-template-columns:1fr 1fr}.filter-actions{grid-column:1/-1}.kpi-grid,.fleet-kpis,.receipt-source-grid,.ar-kpis{grid-template-columns:1fr 1fr}.aging-grid{grid-template-columns:repeat(3,1fr)}.channel-tabs{grid-template-columns:repeat(4,1fr)}.report-grid{grid-template-columns:1fr}.payments-panel{order:2}.trend-detail{grid-template-columns:1fr}.trend-detail-head{padding:0 0 12px;border-right:0;border-bottom:1px solid var(--line);justify-content:space-between}.trend-detail dl{grid-template-columns:repeat(3,1fr)}}
@media(max-width:680px){.channel-report{padding:14px 12px 42px}.hero{align-items:flex-start;flex-direction:column}.period-stamp{min-width:0;padding-left:0;border-left:0}.filter-card{position:static;grid-template-columns:1fr}.filter-actions{grid-column:auto}.filter-actions button{flex:1}.kpi-grid,.fleet-kpis,.receipt-source-grid,.ar-kpis,.aging-grid{grid-template-columns:1fr}.panel-head{padding:18px 16px}.legend em{display:none}.channel-tabs{grid-template-columns:1fr 1fr}.channel-list{padding-left:16px;padding-right:16px}.channel-sale-split,.fleet-tab-kpis{grid-template-columns:1fr}.fleet-tab-footer{align-items:flex-start;flex-direction:column}.payment-grid,.driver-grid{grid-template-columns:1fr}.trend-detail dl{grid-template-columns:repeat(2,1fr)}.driver-grid article:nth-child(odd){border-right:0}.section-banner{align-items:flex-start}.partial-warning{align-items:flex-start;flex-wrap:wrap}}
.document-head-actions{display:flex;align-items:flex-end;justify-content:flex-end;gap:7px;flex-wrap:wrap}.vehicle-search span{display:block;margin-bottom:4px;color:var(--muted);font-size:13px;font-weight:750}.vehicle-search input{width:220px;height:36px;padding:0 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:var(--ink);font:inherit;font-size:13px}.document-head-actions>button{height:36px;padding:0 12px;border:1px solid var(--blue);border-radius:8px;background:var(--blue);color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.document-head-actions>button.clear{border-color:#cbd5e1;background:#fff;color:var(--ink)}.documents-panel:not(.credit-documents-panel) table{min-width:1520px}.fleet-detail-link{color:var(--blue);font-size:13px;font-weight:800;text-decoration:none}
@media(max-width:680px){.documents-panel .panel-head{flex-direction:column}.document-head-actions{width:100%;justify-content:flex-start}.vehicle-search{flex:1;min-width:190px}.vehicle-search input{width:100%}}
@media print{.channel-report{padding:0;background:#fff}.filter-card,.partial-warning,.pager{display:none}.panel,.kpi-grid,.fleet-kpis article{break-inside:avoid;box-shadow:none}.hero{padding-top:0}}
</style>
