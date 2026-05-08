<template>
  <div class="fleet-report">

    <!-- MASTHEAD -->
    <header class="masthead">
      <div class="container">
        <div class="masthead-top">
          <span><span class="dot"></span>ข้อมูลสด · APPSHEET</span>
          <span>{{ filterLabel }}</span>
          <span>{{ todayStr }}</span>
        </div>
        <h1 class="title">สรุป<span class="accent">ขนส่ง</span></h1>
        <p class="subtitle" v-if="summary.total_revenue">
          รายงานผลการดำเนินงานขนส่งสินค้า —
          {{ fmt(summary.total_drivers) }} คนขับ สร้างรายได้ {{ fmtB(summary.total_revenue) }}
          จาก {{ fmt(summary.total_stores_visited) }} ร้านค้า
        </p>
        <p class="subtitle" v-else>กำลังโหลดข้อมูล...</p>
        <div class="byline">
          <span>◉ ข้อมูล : {{ filter.from || '–' }} — {{ filter.to || 'ปัจจุบัน' }}</span>
          <span>◉ แหล่งข้อมูล : APPSHEET · POSTGRESQL</span>
          <span>◉ ออกรายงาน : {{ reportGeneratedAt }}</span>
          <span v-if="lastSyncedAt">◉ ซิงค์ล่าสุด : {{ lastSyncedAt }}</span>
        </div>
      </div>
    </header>

    <!-- FILTER BAR -->
    <div class="filter-bar">
      <div class="container filter-inner">
        <div class="preset-group">
          <button v-for="p in presets" :key="p.key" @click="applyPreset(p.key)"
            :disabled="loading"
            :class="['preset-btn', activePreset === p.key ? 'active' : '']">
            {{ p.label }}
          </button>
        </div>
        <div class="date-group">
          <span class="date-label">จาก</span>
          <DateInput v-model="filter.from" @change="onFilterChange" class="date-input" :disabled="loading" />
          <span class="date-label">ถึง</span>
          <DateInput v-model="filter.to" @change="onFilterChange" class="date-input" :disabled="loading" />
          <button @click="loadAll" :disabled="loading || !!dateRangeError" class="load-btn">
            {{ loading ? 'กำลังโหลด' : 'โหลดข้อมูล' }}
          </button>
        </div>
        <div class="report-actions">
          <button type="button" class="report-action-btn" :disabled="loading || !hasLoaded || filterDirty" @click="copyShareLink">
            คัดลอกลิงก์
          </button>
          <button type="button" class="report-action-btn" :disabled="loading || filterDirty || !trips.length" @click="exportTripsCsv">
            CSV หน้านี้
          </button>
          <button type="button" class="report-action-btn primary" :disabled="loading || !hasLoaded || filterDirty" @click="printReport">
            พิมพ์รายงาน
          </button>
        </div>
        <div v-if="dateRangeError" class="filter-dirty error">{{ dateRangeError }}</div>
        <div v-else-if="filterDirty" class="filter-dirty">เปลี่ยนช่วงวันที่แล้ว กดโหลดข้อมูลเพื่ออัปเดต</div>
        <div v-if="shareStatus" class="share-status" aria-live="polite">{{ shareStatus }}</div>
      </div>
    </div>

    <div class="container">

      <!-- LOADING -->
      <div v-if="initialLoading" class="loading-state">
        <div class="loading-bar"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>

      <!-- ERROR -->
      <div v-else-if="error" class="error-state">
        <p>ข้อผิดพลาด · {{ error }}</p>
      </div>

      <template v-else>
        <div v-if="refreshing" class="refreshing-banner">
          <div class="loading-bar compact"></div>
          <span>กำลังอัปเดตข้อมูลตามช่วงวันที่ล่าสุด</span>
        </div>

        <div v-if="widgetErrors.length" class="partial-warning">
          <strong>โหลดข้อมูลบางส่วนไม่สำเร็จ</strong>
          <span>{{ widgetErrors.join(' / ') }}</span>
        </div>

        <!-- EXECUTIVE SNAPSHOT -->
        <section class="section" style="border-top: none; padding-top: 40px;">
          <div class="section-label">ภาพรวมผู้บริหาร</div>
          <h2 class="section-title">จุดที่ควรดูทันที</h2>
          <p class="section-desc">สรุปตัวเลขสำคัญของช่วงวันที่เลือก พร้อมเทียบกับช่วงก่อนหน้าเมื่อมีช่วงวันที่ชัดเจน</p>

          <div class="attention-strip">
            <div v-for="item in attentionItems" :key="item.label" :class="['attention-item', item.tone]">
              <span class="attention-label">{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <span>{{ item.note }}</span>
            </div>
          </div>

          <div class="insight-grid">
            <div v-for="card in executiveCards" :key="card.key" :class="['insight-card', card.tone]">
              <div class="insight-top">
                <span class="insight-label">{{ card.label }}</span>
                <span v-if="card.badge" class="insight-badge">{{ card.badge }}</span>
              </div>
              <div class="insight-value">{{ card.value }}</div>
              <div class="insight-foot">
                <span v-if="card.delta" :class="['delta', card.deltaTone]">{{ card.delta }}</span>
                <span>{{ card.note }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- KPI HERO -->
        <section class="section" style="border-top: none; padding-top: 40px;">
          <div class="kpi-hero">
            <div class="kpi-cell headline">
              <div class="kpi-label">รายได้รวม · ช่วงที่เลือก</div>
              <div class="kpi-value">{{ fmtBig(summary.total_revenue) }}</div>
              <div class="kpi-sub">
                เฉลี่ย {{ fmtB(avgPerCheckout) }} / บิล ·
                {{ fmt(summary.total_checkouts) }} check-outs
              </div>
            </div>
            <div class="kpi-cell accent-bg">
              <div class="kpi-label">เที่ยวขนส่ง</div>
              <div class="kpi-value mid">{{ fmt(summary.total_trips) }}</div>
              <div class="kpi-sub">รอบส่งของทั้งหมด</div>
            </div>
            <div class="kpi-cell dark-bg">
              <div class="kpi-label">ร้านค้าที่เข้าถึง</div>
              <div class="kpi-value mid">{{ fmt(summary.total_stores_visited) }}</div>
              <div class="kpi-sub">ร้านค้าในช่วงที่เลือก</div>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <div class="kpi-label">จำนวน Check-out</div>
              <div class="kpi-value strip">{{ fmtK(summary.total_checkouts) }}</div>
            </div>
            <div class="kpi-cell">
              <div class="kpi-label">คนขับที่ใช้งาน</div>
              <div class="kpi-value strip">{{ fmt(summary.total_drivers) }}</div>
            </div>
            <div class="kpi-cell">
              <div class="kpi-label">จำนวนรถ</div>
              <div class="kpi-value strip">{{ fmt(summary.total_cars) }}</div>
            </div>
            <div class="kpi-cell">
              <div class="kpi-label">ยอดเฉลี่ย / Check-out</div>
              <div class="kpi-value strip">{{ fmtB(avgPerCheckout) }}</div>
            </div>
          </div>
        </section>

        <!-- PART 01 MONTHLY -->
        <section class="section">
          <div class="section-label">แนวโน้มรายเดือน</div>
          <h2 class="section-title">รายได้และจำนวนบิลรายเดือน</h2>
          <p class="section-desc">รายได้รายเดือนและจำนวนบิล เพื่อดูจังหวะการกระจายสินค้าในช่วงเวลาที่เลือก</p>
          <div class="panel">
            <div class="panel-header">
              <div>
                <div class="panel-title">รายได้เทียบจำนวนบิล</div>
                <div class="panel-sub">รายได้ (฿M) และจำนวน Check-out</div>
              </div>
              <div class="panel-meta">{{ monthly.length }} เดือน</div>
            </div>
            <div class="chart-wrap tall">
              <Bar v-if="monthly.length" :data="monthlyChartData" :options="monthlyChartOptions" />
              <div v-else class="chart-empty">ไม่มีข้อมูลในช่วงวันที่เลือก</div>
            </div>
          </div>
        </section>

        <!-- PART 02 PEOPLE -->
        <section class="section">
          <div class="section-label">คนขับและรถ</div>
          <h2 class="section-title">อันดับผลงานขนส่ง</h2>
          <p class="section-desc">จัดอันดับพนักงานขับรถและรถตามรายได้และจำนวนเที่ยวขนส่ง</p>
          <div class="grid-2">
            <div class="panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">คนขับรายได้สูงสุด</div>
                  <div class="panel-sub">{{ topDrivers.length }} คนขับ · จัดอันดับตามรายได้ในช่วงที่เลือก</div>
                </div>
                <div class="panel-meta">อันดับ</div>
              </div>
              <ol class="rank-list">
                <li v-for="(d, i) in topDrivers.slice(0, 10)" :key="d.user_id" class="rank-item">
                  <span class="rank-num" :class="rankNumClass(i)">{{ String(i+1).padStart(2,'0') }}</span>
                  <div class="rank-main">
                    <span class="rank-name">{{ d.driver_name || d.user_id }}</span>
                    <span class="rank-meta-txt">{{ d.trips }} เที่ยว · {{ fmt(d.checkouts) }} Check-out</span>
                    <div class="rank-bar-track">
                      <div class="rank-bar-fill" :style="{ width: pct(d.revenue, topDrivers[0]?.revenue) + '%', animationDelay: (i*80) + 'ms' }"></div>
                    </div>
                  </div>
                  <div class="rank-stat">{{ fmtB(d.revenue) }}<span class="rank-stat-unit">รายได้</span></div>
                </li>
                <li v-if="!topDrivers.length" class="rank-empty">ไม่มีข้อมูล</li>
              </ol>
            </div>

            <div class="panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">รถที่สร้างรายได้สูงสุด</div>
                  <div class="panel-sub">รถแต่ละคันวิ่งกี่เที่ยว · รายได้ในช่วงที่เลือก</div>
                </div>
                <div class="panel-meta">อันดับ</div>
              </div>
              <ol class="rank-list">
                <li v-for="(c, i) in topCars.slice(0, 10)" :key="c.car_id" class="rank-item">
                  <span class="rank-num" :class="rankNumClass(i)">{{ String(i+1).padStart(2,'0') }}</span>
                  <div class="rank-main">
                    <span class="rank-name">{{ c.car_name || c.license_plate || c.car_id }}</span>
                    <span class="rank-meta-txt">{{ c.trips }} เที่ยว</span>
                    <div class="rank-bar-track">
                      <div class="rank-bar-fill car" :style="{ width: pct(c.revenue, topCars[0]?.revenue) + '%', animationDelay: (i*80) + 'ms' }"></div>
                    </div>
                  </div>
                  <div class="rank-stat">{{ fmtB(c.revenue) }}<span class="rank-stat-unit">รายได้</span></div>
                </li>
                <li v-if="!topCars.length" class="rank-empty">ไม่มีข้อมูล</li>
              </ol>
            </div>
          </div>
        </section>

        <!-- PART 03 STORES -->
        <section class="section">
          <div class="section-label">ร้านค้า</div>
          <h2 class="section-title">ร้านค้าที่เข้าถึงบ่อยและมียอดสูง</h2>
          <p class="section-desc">ร้านค้าที่เข้าเยี่ยมบ่อยสุดและสร้างรายได้สูงสุด</p>
          <div class="grid-stores">
            <div class="panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">ร้านที่ไปบ่อยสุด</div>
                  <div class="panel-sub">Top 15 ร้านที่ไปบ่อยสุดในช่วงที่เลือก</div>
                </div>
                <div class="panel-meta">TOP 15 / {{ fmt(summary.total_stores_visited) }}</div>
              </div>
              <div class="table-scroll-wrap">
                <table class="store-table">
                  <thead>
                    <tr>
                      <th style="width:36px">#</th>
                      <th>ร้านค้า</th>
                      <th class="num">ครั้ง</th>
                      <th class="num">รายได้</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(s, i) in topStoresVisits.slice(0,15)" :key="s.store_id">
                      <td class="store-rank">{{ String(i+1).padStart(2,'0') }}</td>
                      <td class="store-name">{{ s.store_name || s.store_id }}</td>
                      <td class="num">{{ fmt(s.visits) }}</td>
                      <td class="num">{{ fmtB(s.revenue) }}</td>
                    </tr>
                    <tr v-if="!topStoresVisits.length">
                      <td colspan="4" class="table-empty">ไม่มีข้อมูล</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">ร้านรายได้สูงสุด</div>
                  <div class="panel-sub">ร้านที่ทำยอดสูงสุดในช่วงที่เลือก</div>
                </div>
                <div class="panel-meta">BY ฿</div>
              </div>
              <ol class="rank-list">
                <li v-for="(s, i) in topStoresRevenue.slice(0,10)" :key="s.store_id" class="rank-item">
                  <span class="rank-num" :class="rankNumClass(i)">{{ String(i+1).padStart(2,'0') }}</span>
                  <div class="rank-main">
                    <span class="rank-name" style="font-size:14px">{{ truncate(s.store_name || s.store_id, 28) }}</span>
                    <span class="rank-meta-txt">{{ fmt(s.visits) }} ครั้ง</span>
                    <div class="rank-bar-track">
                      <div class="rank-bar-fill store" :style="{ width: pct(s.revenue, topStoresRevenue[0]?.revenue) + '%', animationDelay: (i*80) + 'ms' }"></div>
                    </div>
                  </div>
                  <div class="rank-stat" style="font-size:18px">{{ fmtB(s.revenue) }}</div>
                </li>
                <li v-if="!topStoresRevenue.length" class="rank-empty">ไม่มีข้อมูล</li>
              </ol>
            </div>
          </div>
        </section>

        <!-- PART 04 PATTERNS + CASH FLOW -->
        <section class="section">
          <div class="section-label">รูปแบบการส่งและการชำระเงิน</div>
          <h2 class="section-title">วันทำงานและเงินสด/โอน</h2>
          <p class="section-desc">ปริมาณการส่งของตามวันในสัปดาห์และโครงสร้างการชำระเงิน</p>
          <div class="grid-2">
            <div class="panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">Check-out ตามวันในสัปดาห์</div>
                  <div class="panel-sub">กระจายตัวของการส่งแต่ละวัน</div>
                </div>
                <div class="panel-meta">7 วัน</div>
              </div>
              <div class="chart-wrap">
                <Bar v-if="dayOfWeek.length" :data="dowChartData" :options="dowChartOptions" />
                <div v-else class="chart-empty">ไม่มีข้อมูล</div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-header">
                <div>
                  <div class="panel-title">การชำระเงิน</div>
                  <div class="panel-sub">เงินสด vs โอนเงิน</div>
                </div>
                <div class="panel-meta">ชำระเงิน</div>
              </div>
              <div class="pay-split">
                <div class="pay-card cash">
                  <div class="pay-label">◉ เงินสด</div>
                  <div class="pay-amount">{{ fmtB(summary.total_cash) }}</div>
                  <div class="pay-pct">{{ cashPct }}% ของรายได้รวม</div>
                </div>
                <div class="pay-card transfer">
                  <div class="pay-label">◉ โอนเงิน</div>
                  <div class="pay-amount">{{ fmtB(summary.total_transfer) }}</div>
                  <div class="pay-pct">{{ transferPct }}% ของรายได้รวม</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- PART 05 TRIPS -->
        <section class="section">
          <div class="section-label">รายการเที่ยวขนส่ง</div>
          <h2 class="section-title">รายการเที่ยวขนส่ง</h2>
          <p class="section-desc">กดที่แถวเพื่อดูรายละเอียดจุดส่ง, ยอดเงิน และสถานะแต่ละร้าน</p>

          <div class="panel" style="padding:0; overflow:hidden;">
            <div v-if="tripsLoading" style="padding:32px; text-align:center; color:#64748b;">กำลังโหลด…</div>
            <div v-else-if="tripsError" class="table-error">
              <p>{{ tripsError }}</p>
              <button type="button" @click="loadTrips(0)">ลองโหลดอีกครั้ง</button>
            </div>
            <div v-else class="table-scroll-wrap">
              <table class="trips-table">
                <thead>
                  <tr>
                    <th>รหัสเที่ยว</th>
                    <th>วันที่</th>
                    <th>คนขับ</th>
                    <th>รถ</th>
                    <th style="text-align:right">รายได้ (฿)</th>
                    <th style="text-align:center">บิล</th>
                    <th style="text-align:center">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in trips" :key="t.car_release_id" @click="openTrip(t.car_release_id)"
                    @keydown.enter.prevent="openTrip(t.car_release_id)"
                    @keydown.space.prevent="openTrip(t.car_release_id)"
                    class="trip-row" tabindex="0" role="button"
                    :aria-label="`ดูรายละเอียดเที่ยว ${t.car_release_code || t.car_release_id}`">
                    <td class="trip-code">{{ t.car_release_code || t.car_release_id.slice(0,8) }}</td>
                    <td>{{ fmtDate(t.trip_date) }}</td>
                    <td>{{ t.driver_name || '–' }}</td>
                    <td class="trip-car">{{ t.license_plate || t.car_name || '–' }}</td>
                    <td style="text-align:right">{{ fmt(t.total_amount) }}</td>
                    <td style="text-align:center">{{ t.total_number_of_bills || '–' }}</td>
                    <td style="text-align:center">
                      <span class="status-badge" :class="t.accounting_status ? 'done' : 'pending'">
                        {{ t.accounting_status ? 'ตรวจแล้ว' : 'รอตรวจ' }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!trips.length">
                    <td colspan="7" class="table-empty">ไม่มีเที่ยวขนส่งในช่วงวันที่เลือก</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="trips-pagination" v-if="tripsMeta.total > tripsMeta.limit">
              <button :disabled="tripsMeta.offset === 0" @click="loadTrips(tripsMeta.offset - tripsMeta.limit)">← ก่อนหน้า</button>
              <span>{{ tripsMeta.offset + 1 }}–{{ Math.min(tripsMeta.offset + tripsMeta.limit, tripsMeta.total) }} จาก {{ fmt(tripsMeta.total) }}</span>
              <button :disabled="tripsMeta.offset + tripsMeta.limit >= tripsMeta.total" @click="loadTrips(tripsMeta.offset + tripsMeta.limit)">ถัดไป →</button>
            </div>
            <div class="table-note">CSV และหน้าพิมพ์จะแสดงรายการเที่ยวรถเฉพาะหน้าปัจจุบัน</div>
          </div>
        </section>

        <!-- PART 06 PROBLEMS -->
        <section class="section" v-if="problems.length">
          <div class="section-label">ปัญหาหน้างาน</div>
          <h2 class="section-title">พบปัญหา {{ fmt(totalProblems) }} รายการ</h2>
          <p class="section-desc">ประเภทปัญหาที่บันทึกจากหน้างาน · กดที่การ์ดเพื่อดูรายการย่อย</p>
          <div class="problem-grid">
            <div v-for="(p, i) in problems" :key="p.problem_type" class="prob-card clickable"
              :style="{ '--prob-color': probColors[i % probColors.length], '--pct': pct(p.count, problems[0]?.count) + '%' }"
              @click="openProblemModal(p.problem_type)"
              @keydown.enter.prevent="openProblemModal(p.problem_type)"
              @keydown.space.prevent="openProblemModal(p.problem_type)"
              role="button" tabindex="0"
              :aria-label="`ดูรายละเอียดปัญหา ${p.problem_type} ${fmt(p.count)} รายการ`">
              <div class="prob-bar"></div>
              <div class="prob-name">{{ p.problem_type }}</div>
              <div class="prob-value">{{ fmt(p.count) }}</div>
              <div class="prob-pct">{{ pctOf(p.count, totalProblems) }}% · กดดูรายละเอียด</div>
            </div>
          </div>
        </section>
        <section class="section" v-else>
          <div class="section-label">ปัญหาหน้างาน</div>
          <h2 class="section-title">ไม่พบปัญหาหน้างาน</h2>
          <p class="section-desc">ไม่มีปัญหาขนส่งในช่วงวันที่เลือก หรือข้อมูลส่วนนี้ยังไม่ถูกบันทึกจากหน้างาน</p>
        </section>

      </template>
    </div>

    <!-- TRIP DETAIL MODAL -->
    <Teleport to="body">
      <div v-if="modal !== null" class="modal-overlay" @click.self="closeModal">
        <div ref="tripModalRef" class="modal-box" role="dialog" aria-modal="true" aria-label="รายละเอียดเที่ยวขนส่ง"
          tabindex="-1" @keydown.tab="trapFocus($event, tripModalRef)" @keydown.esc.prevent.stop="closeModal">

          <!-- Loading -->
          <div v-if="modalLoading" class="modal-loading">กำลังโหลด…</div>
          <div v-else-if="modalError" class="modal-error">
            <p>{{ modalError }}</p>
            <div class="modal-error-actions">
              <button type="button" @click="openTrip(modalTripId)">ลองโหลดอีกครั้ง</button>
              <button type="button" @click="closeModal">ปิด</button>
            </div>
          </div>

          <template v-else-if="modal && modal.car_release_id">
            <!-- Header -->
            <div class="modal-header">
              <div>
                <div class="modal-code">{{ modal.car_release_code || modal.car_release_id }}</div>
                <div class="modal-title">{{ modal.driver_name || '–' }} · {{ modal.license_plate || modal.car_name || '–' }}</div>
                <div class="modal-sub">{{ fmtDate(modal.trip_date) }}</div>
              </div>
              <button class="modal-close" @click="closeModal" aria-label="ปิดรายละเอียดเที่ยวขนส่ง">✕</button>
            </div>

            <!-- KPI strip -->
            <div class="modal-kpi">
              <div class="modal-kpi-cell">
                <div class="modal-kpi-label">รายได้รวม</div>
                <div class="modal-kpi-val">{{ fmt(modal.total_amount) }}</div>
              </div>
              <div class="modal-kpi-cell">
                <div class="modal-kpi-label">จำนวนบิล</div>
                <div class="modal-kpi-val">{{ fmt(modal.total_number_of_bills) }}</div>
              </div>
              <div class="modal-kpi-cell">
                <div class="modal-kpi-label">จำนวน Stops</div>
                <div class="modal-kpi-val">{{ fmt(modal.stops?.length) }}</div>
              </div>
              <div class="modal-kpi-cell">
                <div class="modal-kpi-label">ระยะทาง</div>
                <div class="modal-kpi-val">{{ modal.mileage ? fmt(modal.mileage) + ' km' : '–' }}</div>
              </div>
            </div>

            <!-- Stops table -->
            <div class="modal-stops-wrap">
              <table class="modal-stops-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ร้านค้า</th>
                    <th>เลขออเดอร์</th>
                    <th>เข้า</th>
                    <th>ออก</th>
                    <th style="text-align:right">ยอด (฿)</th>
                    <th style="text-align:center">Visit</th>
                    <th style="text-align:center">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in modal.stops" :key="s.list_id"
                    :class="{ 'stop-bypass': s.bypass, 'stop-offsite': s.off_site }">
                    <td class="stop-seq">{{ s.sequence_no }}</td>
                    <td>
                      <div class="stop-name">{{ s.store_name_result || s.store_name || s.store_id || '–' }}</div>
                      <div class="stop-zone" v-if="s.zone">{{ s.zone }}</div>
                    </td>
                    <td class="stop-order">{{ s.data_store_no || '–' }}</td>
                    <td class="stop-time">{{ s.date_time_check_in ? fmtTime(s.date_time_check_in) : '–' }}</td>
                    <td class="stop-time">{{ s.date_time_check_out ? fmtTime(s.date_time_check_out) : '–' }}</td>
                    <td style="text-align:right; font-weight:600;">{{ s.amount ? fmt(s.amount) : '–' }}</td>
                    <td style="text-align:center">
                      <span v-if="s.visit === 'TRUE'" class="visit-yes">✓</span>
                      <span v-else-if="s.visit === 'FALSE'" class="visit-no">✗</span>
                      <span v-else class="visit-na">–</span>
                    </td>
                    <td style="text-align:center">
                      <span v-if="s.bypass" class="stop-tag bypass">ข้าม</span>
                      <span v-else-if="s.off_site" class="stop-tag offsite">นอกสถานที่</span>
                      <span v-else class="stop-tag ok">ปกติ</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

        </div>
      </div>
    </Teleport>

    <!-- PROBLEM DETAIL MODAL -->
    <Teleport to="body">
      <div v-if="problemModal !== null" class="modal-overlay" @click.self="closeProblemModal">
        <div ref="problemModalRef" class="modal-box" role="dialog" aria-modal="true" aria-label="รายละเอียดปัญหาขนส่ง"
          tabindex="-1" @keydown.tab="trapFocus($event, problemModalRef)" @keydown.esc.prevent.stop="closeProblemModal">

          <div v-if="problemModalLoading" class="modal-loading">กำลังโหลด…</div>
          <div v-else-if="problemModalError" class="modal-error">
            <p>{{ problemModalError }}</p>
            <div class="modal-error-actions">
              <button type="button" @click="loadProblemDetail(problemModalType, problemModalMeta.offset || 0)">ลองโหลดอีกครั้ง</button>
              <button type="button" @click="closeProblemModal">ปิด</button>
            </div>
          </div>

          <template v-else>
            <div class="modal-header">
              <div>
                <div class="modal-code">PART 06 · ANOMALIES</div>
                <div class="modal-title">{{ problemModalType }}</div>
                <div class="modal-sub">{{ fmt(problemModalMeta.total) }} รายการ</div>
              </div>
              <button class="modal-close" @click="closeProblemModal" aria-label="ปิดรายละเอียดปัญหาขนส่ง">✕</button>
            </div>

            <div class="modal-stops-wrap">
              <table class="modal-stops-table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>ร้านค้า</th>
                    <th>โซน</th>
                    <th>รายละเอียด</th>
                    <th>คนขับ</th>
                    <th style="text-align:center">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in problemModalRows" :key="p.problem_id">
                    <td class="stop-time" style="white-space:nowrap">{{ fmtDate(p.created_at) }}</td>
                    <td>
                      <div class="stop-name">{{ p.store_name || '–' }}</div>
                      <div class="stop-zone" v-if="p.car_release_code">{{ p.car_release_code }}</div>
                    </td>
                    <td class="stop-zone">{{ p.zone || '–' }}</td>
                    <td style="max-width:240px; font-size:12px; color:#475569;">{{ p.description || '–' }}</td>
                    <td style="font-size:12px;">{{ p.driver_name || '–' }}</td>
                    <td style="text-align:center">
                      <span v-if="p.is_resolved" class="stop-tag ok">แก้แล้ว</span>
                      <span v-else class="stop-tag bypass">ค้างอยู่</span>
                    </td>
                  </tr>
                  <tr v-if="!problemModalRows.length">
                    <td colspan="6" class="table-empty">ไม่มีรายการปัญหาในช่วงวันที่เลือก</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="trips-pagination" v-if="problemModalMeta.total > problemModalMeta.limit">
              <button :disabled="problemModalMeta.offset === 0"
                @click="loadProblemDetail(problemModalType, problemModalMeta.offset - problemModalMeta.limit)">← ก่อนหน้า</button>
              <span>{{ problemModalMeta.offset + 1 }}–{{ Math.min(problemModalMeta.offset + problemModalMeta.limit, problemModalMeta.total) }} จาก {{ fmt(problemModalMeta.total) }}</span>
              <button :disabled="problemModalMeta.offset + problemModalMeta.limit >= problemModalMeta.total"
                @click="loadProblemDetail(problemModalType, problemModalMeta.offset + problemModalMeta.limit)">ถัดไป →</button>
            </div>
          </template>

        </div>
      </div>
    </Teleport>

    <!-- FOOTER -->
    <footer class="fleet-footer">
      <div class="container footer-inner">
        <span class="logo-mark">สรุปขนส่ง</span>
        <span>ข้อมูลจาก APPSHEET · POSTGRESQL</span>
        <span>รายงานขนส่ง</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bar } from 'vue-chartjs'
import { Chart, registerables } from 'chart.js'
import { useAuthStore } from '../stores/auth.js'
import apiBase from '../composables/useApi.js'
import DateInput from '../components/DateInput.vue'

Chart.register(...registerables)

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const FILTER_STORAGE_KEY = 'fleet_summary_filter'
const SYNC_STATUS_STORAGE_KEY = 'fleet_summary_sync_status'
const SYNC_STATUS_TTL_MS = 5 * 60 * 1000

// ── Filter ───────────────────────────────────────────────────────────────────
const presets = [
  { key: '7d',  label: '7 วัน'  },
  { key: '30d', label: '30 วัน' },
  { key: '3m',  label: '3 เดือน'  },
  { key: '6m',  label: '6 เดือน'  },
  { key: '1y',  label: '1 ปี'  },
  { key: 'all', label: 'ทั้งหมด' },
]
const activePreset = ref('1y')
const filter       = ref({ from: '', to: '' })
const filterDirty  = ref(false)

const filterLabel = computed(() => {
  if (activePreset.value === 'all') return 'ทั้งหมด'
  const p = presets.find(p => p.key === activePreset.value)
  return p ? p.label : 'ช่วงกำหนดเอง'
})
// คืนค่า YYYY-MM-DD ตามเวลา Bangkok (GMT+7) ไม่ขึ้นกับ TZ ของ browser
function bkkDateStr(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}
const todayStr = computed(() => bkkDateStr().replace(/-/g, '.'))
const dateRangeError = computed(() => {
  if (filter.value.from && filter.value.to && filter.value.from > filter.value.to) {
    return 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด'
  }
  return ''
})

function presetRange(key) {
  const now  = new Date()
  const to   = bkkDateStr(now)
  const from = new Date(now)
  if (key === '7d')  from.setDate(from.getDate() - 7)
  if (key === '30d') from.setDate(from.getDate() - 30)
  if (key === '3m')  from.setMonth(from.getMonth() - 3)
  if (key === '6m')  from.setMonth(from.getMonth() - 6)
  if (key === '1y')  from.setFullYear(from.getFullYear() - 1)
  if (key === 'all') return { from: '', to: '' }
  return { from: bkkDateStr(from), to }
}

function applyPreset(key) {
  activePreset.value = key
  filterDirty.value = false
  filter.value = presetRange(key)
  loadAll()
}
function onFilterChange() {
  activePreset.value = ''
  filterDirty.value = true
  widgetErrors.value = []
}

// ── State ────────────────────────────────────────────────────────────────────
const loading           = ref(false)
const hasLoaded         = ref(false)
const error             = ref('')
const widgetErrors      = ref([])
const shareStatus       = ref('')
const summary           = ref({})
const previousSummary   = ref({})
const monthly           = ref([])
const lastSyncedAt      = ref('')
const syncRows          = ref([])
const topDrivers        = ref([])
const topCars           = ref([])
const topStoresVisits   = ref([])
const topStoresRevenue  = ref([])
const dayOfWeek         = ref([])
const problems          = ref([])
const previousProblems  = ref([])

// ── Trips ─────────────────────────────────────────────────────────────────────
const trips             = ref([])
const tripsMeta         = ref({ total: 0, limit: 20, offset: 0 })
const tripsLoading      = ref(false)
const tripsError        = ref('')
const modal             = ref(null)
const modalLoading      = ref(false)
const modalError        = ref('')
const modalTripId       = ref('')
const tripModalRef      = ref(null)

// ── Problems modal ────────────────────────────────────────────────────────────
const problemModal      = ref(null)   // null = closed, anything = open
const problemModalLoading = ref(false)
const problemModalError = ref('')
const problemModalType  = ref('')
const problemModalRows  = ref([])
const problemModalMeta  = ref({ total: 0, limit: 30, offset: 0 })
const problemModalRef   = ref(null)

const initialLoading = computed(() => loading.value && !hasLoaded.value)
const refreshing = computed(() => loading.value && hasLoaded.value)

let dashboardLoadSeq = 0
let tripsLoadSeq = 0
let tripDetailSeq = 0
let problemDetailSeq = 0
let shareStatusTimer = null

async function loadProblemDetail(type, offset = 0) {
  const seq = ++problemDetailSeq
  problemModalLoading.value = true
  problemModalError.value = ''
  try {
    const p = new URLSearchParams({ type, limit: 30, offset })
    if (filter.value.from) p.set('from', filter.value.from)
    if (filter.value.to)   p.set('to',   filter.value.to)
    const r = await api.get(`/problems?${p}`)
    if (seq !== problemDetailSeq) return
    problemModalRows.value = r.data.data || []
    problemModalMeta.value = r.data.meta || { total: 0, limit: 30, offset }
  } catch (e) {
    if (seq !== problemDetailSeq) return
    problemModalError.value = e.response?.data?.error || e.message || 'โหลดรายละเอียดปัญหาไม่สำเร็จ'
    console.warn('[fleet/problems]', e.message)
  }
  finally {
    if (seq === problemDetailSeq) problemModalLoading.value = false
  }
}

async function openProblemModal(type) {
  problemModalType.value = type
  problemModal.value = true
  focusModal(problemModalRef)
  await loadProblemDetail(type, 0)
}

function closeProblemModal() {
  problemDetailSeq++
  problemModal.value = null
  problemModalError.value = ''
  problemModalRows.value = []
}

async function loadTrips(offset = 0) {
  const seq = ++tripsLoadSeq
  tripsLoading.value = true
  tripsError.value = ''
  try {
    const q = qs({ limit: 20, offset })
    const r = await api.get(`/trips${q}`)
    if (seq !== tripsLoadSeq) return
    trips.value    = r.data.data || []
    tripsMeta.value = r.data.meta || { total: 0, limit: 20, offset }
  } catch (e) {
    if (seq !== tripsLoadSeq) return
    trips.value = []
    tripsError.value = e.response?.data?.error || e.message || 'โหลดรายการเที่ยวขนส่งไม่สำเร็จ'
    console.warn('[fleet/trips]', e.message)
  }
  finally {
    if (seq === tripsLoadSeq) tripsLoading.value = false
  }
}

async function openTrip(id) {
  const seq = ++tripDetailSeq
  modalLoading.value = true
  modalError.value = ''
  modalTripId.value = id
  modal.value = {}
  focusModal(tripModalRef)
  try {
    const r = await api.get(`/trips/${id}`)
    if (seq !== tripDetailSeq) return
    modal.value = r.data.data
  } catch (e) {
    if (seq !== tripDetailSeq) return
    modal.value = {}
    modalError.value = e.response?.data?.error || e.message || 'โหลดรายละเอียดเที่ยวขนส่งไม่สำเร็จ'
    console.warn('[fleet/trips/:id]', e.message)
  }
  finally {
    if (seq === tripDetailSeq) modalLoading.value = false
  }
}

function closeModal() {
  tripDetailSeq++
  modal.value = null
  modalError.value = ''
  modalTripId.value = ''
}

function focusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
}

async function focusModal(modalRef) {
  await nextTick()
  const container = modalRef?.value || modalRef
  const first = focusableElements(container)[0]
  ;(first || container)?.focus()
}

function trapFocus(event, modalRef) {
  const container = modalRef?.value || modalRef
  const focusable = focusableElements(container)
  if (!focusable.length) {
    event.preventDefault()
    container?.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function onGlobalKeydown(event) {
  if (event.key !== 'Escape') return
  if (problemModal.value !== null) closeProblemModal()
  else if (modal.value !== null) closeModal()
}

// ── Computed ──────────────────────────────────────────────────────────────────
const avgPerCheckout = computed(() => {
  const rev = parseFloat(summary.value.total_revenue || 0)
  const co  = parseInt(summary.value.total_checkouts  || 0)
  return co ? rev / co : 0
})
const avgBillsPerTrip = computed(() => {
  const co = parseInt(summary.value.total_checkouts || 0)
  const tr = parseInt(summary.value.total_trips     || 0)
  return tr ? (co / tr).toFixed(1) : '0'
})
const avgRevenuePerTrip = computed(() => {
  const rev = parseFloat(summary.value.total_revenue || 0)
  const tr = parseInt(summary.value.total_trips || 0)
  return tr ? rev / tr : 0
})
const cashPct = computed(() => {
  const rev = parseFloat(summary.value.total_revenue || 0)
  if (!rev) return 0
  return Math.round((parseFloat(summary.value.total_cash || 0) / rev) * 100)
})
const transferPct = computed(() => {
  const rev = parseFloat(summary.value.total_revenue || 0)
  if (!rev) return 0
  return Math.round((parseFloat(summary.value.total_transfer || 0) / rev) * 100)
})
const totalProblems = computed(() => problems.value.reduce((s, p) => s + parseInt(p.count || 0), 0))
const totalResolvedProblems = computed(() => problems.value.reduce((s, p) => s + parseInt(p.resolved_count || 0), 0))
const unresolvedProblems = computed(() => Math.max(0, totalProblems.value - totalResolvedProblems.value))
const previousTotalProblems = computed(() => previousProblems.value.reduce((s, p) => s + parseInt(p.count || 0), 0))
const problemRate = computed(() => {
  const tripsCount = parseInt(summary.value.total_trips || 0)
  return tripsCount ? (totalProblems.value / tripsCount) * 100 : 0
})
const previousProblemRate = computed(() => {
  const tripsCount = parseInt(previousSummary.value.total_trips || 0)
  return tripsCount ? (previousTotalProblems.value / tripsCount) * 100 : 0
})
const comparisonReady = computed(() => !!previousSummary.value && Object.keys(previousSummary.value).length > 0)
const reportGeneratedAt = computed(() => {
  const d = new Date()
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
})
const syncHealth = computed(() => {
  if (!syncRows.value.length) return { label: 'รอข้อมูลซิงค์', tone: 'neutral' }
  const running = syncRows.value.filter(r => r.status === 'running').length
  const failed = syncRows.value.filter(r => r.status === 'failed').length
  if (running) return { label: `กำลังซิงค์ ${running} ชุด`, tone: 'info' }
  if (failed) return { label: `ซิงค์มีปัญหา ${failed} ชุด`, tone: 'warn' }
  return { label: 'ซิงค์ปกติ', tone: 'good' }
})
const executiveCards = computed(() => [
  {
    key: 'revenue',
    label: 'รายได้รวม',
    value: fmtB(summary.value.total_revenue),
    delta: deltaText(summary.value.total_revenue, previousSummary.value.total_revenue, 'money'),
    deltaTone: deltaTone(summary.value.total_revenue, previousSummary.value.total_revenue),
    note: comparisonReady.value ? 'เทียบช่วงก่อนหน้า' : 'ไม่มีช่วงก่อนหน้าให้เทียบ',
    tone: 'primary',
  },
  {
    key: 'trips',
    label: 'เที่ยวขนส่ง',
    value: fmt(summary.value.total_trips),
    delta: deltaText(summary.value.total_trips, previousSummary.value.total_trips, 'number'),
    deltaTone: deltaTone(summary.value.total_trips, previousSummary.value.total_trips),
    note: 'จำนวนรอบส่งของ',
    tone: 'neutral',
  },
  {
    key: 'problem-rate',
    label: 'ปัญหาที่บันทึกต่อเที่ยว',
    value: `${problemRate.value.toFixed(1)}%`,
    delta: deltaPointText(problemRate.value, previousProblemRate.value, true),
    deltaTone: deltaTone(previousProblemRate.value, problemRate.value),
    note: `${fmt(totalProblems.value)} ปัญหาที่บันทึก / ${fmt(summary.value.total_trips)} เที่ยว`,
    tone: problemRate.value >= 10 ? 'warn' : 'neutral',
    badge: problemRate.value >= 10 ? 'ต้องดู' : '',
  },
  {
    key: 'unresolved',
    label: 'ปัญหายังค้าง',
    value: fmt(unresolvedProblems.value),
    note: `${fmt(totalResolvedProblems.value)} รายการถูกแก้แล้ว`,
    tone: unresolvedProblems.value ? 'warn' : 'good',
    badge: unresolvedProblems.value ? 'ติดตาม' : 'ปกติ',
  },
  {
    key: 'cash',
    label: 'เงินสด',
    value: `${cashPct.value}%`,
    delta: deltaPointText(cashPct.value, previousCashPct(), false),
    deltaTone: deltaTone(cashPct.value, previousCashPct()),
    note: `${fmtB(summary.value.total_cash)} จากรายได้รวม`,
    tone: cashPct.value >= 50 ? 'warn' : 'neutral',
  },
  {
    key: 'avg-trip',
    label: 'ยอดเฉลี่ย / Check-out',
    value: fmtB(avgPerCheckout.value),
    delta: deltaText(avgPerCheckout.value, previousAvgPerCheckout(), 'money'),
    deltaTone: deltaTone(avgPerCheckout.value, previousAvgPerCheckout()),
    note: syncHealth.value.label,
    tone: syncHealth.value.tone,
  },
])
const attentionItems = computed(() => [
  {
    label: 'สิ่งที่ต้องติดตาม',
    value: unresolvedProblems.value ? `${fmt(unresolvedProblems.value)} ปัญหาค้าง` : 'ไม่มีปัญหาค้าง',
    note: unresolvedProblems.value ? 'ควรไล่ปิดรายการที่ยังไม่แก้' : 'สถานะปัญหาปกติ',
    tone: unresolvedProblems.value ? 'warn' : 'good',
  },
  {
    label: 'ความน่าเชื่อถือข้อมูล',
    value: syncHealth.value.label,
    note: lastSyncedAt.value ? `ซิงค์ล่าสุด ${lastSyncedAt.value}` : 'ยังไม่มีเวลาซิงค์ล่าสุด',
    tone: syncHealth.value.tone,
  },
  {
    label: 'การเปลี่ยนแปลง',
    value: executiveCards.value[0]?.delta || 'ไม่มีฐานเทียบ',
    note: comparisonReady.value ? 'รายได้เทียบช่วงก่อนหน้า' : 'เลือกช่วงวันที่เพื่อเทียบช่วงก่อนหน้า',
    tone: executiveCards.value[0]?.deltaTone === 'up'
      ? 'good'
      : executiveCards.value[0]?.deltaTone === 'down'
        ? 'warn'
        : 'neutral',
  },
])
const probColors = ['#3b82f6', '#f97316', '#10b981', '#f59e0b', '#8b5cf6']

// ── API ───────────────────────────────────────────────────────────────────────
const api = { get: (url) => apiBase.get('/fleet' + url) }
function qs(extra = {}) {
  const p = new URLSearchParams()
  if (filter.value.from) p.set('from', filter.value.from)
  if (filter.value.to)   p.set('to',   filter.value.to)
  Object.entries(extra).forEach(([k, v]) => p.set(k, v))
  return p.toString() ? '?' + p.toString() : ''
}

function qsFromRange(range, extra = {}) {
  const p = new URLSearchParams()
  if (range?.from) p.set('from', range.from)
  if (range?.to)   p.set('to',   range.to)
  Object.entries(extra).forEach(([k, v]) => p.set(k, v))
  return p.toString() ? '?' + p.toString() : ''
}

function parseDateOnly(value) {
  const [y, m, d] = String(value || '').split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function dateOnlyString(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(value, days) {
  const date = parseDateOnly(value)
  if (!date) return ''
  date.setUTCDate(date.getUTCDate() + days)
  return dateOnlyString(date)
}

function dayDiff(from, to) {
  const start = parseDateOnly(from)
  const end = parseDateOnly(to)
  if (!start || !end) return 0
  return Math.floor((end - start) / 86400000)
}

function previousRange() {
  if (!filter.value.from || !filter.value.to || activePreset.value === 'all') return null
  const span = dayDiff(filter.value.from, filter.value.to)
  if (span < 0) return null
  const to = addDays(filter.value.from, -1)
  const from = addDays(to, -span)
  return { from, to }
}

function scalarQuery(v) {
  return Array.isArray(v) ? v[0] : v
}

function validPreset(key) {
  return presets.some(p => p.key === key)
}

function dateLike(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const parsed = parseDateOnly(v)
  return !!parsed && dateOnlyString(parsed) === v
}

function currentFilterQuery() {
  const query = {}
  if (activePreset.value && validPreset(activePreset.value)) query.preset = activePreset.value
  if (filter.value.from) query.from = filter.value.from
  if (filter.value.to) query.to = filter.value.to
  return query
}

function syncQueryState() {
  const next = {
    ...route.query,
    preset: undefined,
    from: undefined,
    to: undefined,
    ...currentFilterQuery(),
  }
  const same = ['preset', 'from', 'to'].every(k => scalarQuery(route.query[k]) === next[k])
  if (same) return
  router.replace({ query: next }).catch(() => {})
}

function saveFilterState() {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({
      preset: activePreset.value,
      from: filter.value.from || '',
      to: filter.value.to || '',
    }))
  } catch {}
  syncQueryState()
}

function restoreQueryState() {
  const preset = scalarQuery(route.query.preset)
  const from = scalarQuery(route.query.from)
  const to = scalarQuery(route.query.to)
  if (!preset && !from && !to) return false

  activePreset.value = preset && validPreset(preset) ? preset : ''
  filter.value = {
    from: dateLike(from) ? from : '',
    to: dateLike(to) ? to : '',
  }
  if (activePreset.value === 'all') filter.value = { from: '', to: '' }
  else if (activePreset.value && !filter.value.from && !filter.value.to) filter.value = presetRange(activePreset.value)
  filterDirty.value = false
  return true
}

function restoreFilterState() {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return false
    const saved = JSON.parse(raw)
    activePreset.value = saved.preset || ''
    filter.value = {
      from: saved.from || '',
      to: saved.to || '',
    }
    filterDirty.value = false
    return true
  } catch {
    return false
  }
}

function applyCachedSyncStatus() {
  try {
    const raw = localStorage.getItem(SYNC_STATUS_STORAGE_KEY)
    if (!raw) return false
    const cached = JSON.parse(raw)
    if (!cached.value || Date.now() - Number(cached.cached_at || 0) > SYNC_STATUS_TTL_MS) return false
    lastSyncedAt.value = cached.value
    return true
  } catch {
    return false
  }
}

async function loadSyncStatus() {
  if (applyCachedSyncStatus() && syncRows.value.length) return
  try {
    const r = await api.get('/sync/status')
    const rows = r.data.data || []
    syncRows.value = rows
    const latest = rows.reduce((max, row) => {
      const t = row.finished_at ? new Date(row.finished_at).getTime() : 0
      return t > max ? t : max
    }, 0)
    if (!latest) return
    const d = new Date(latest)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {})
    lastSyncedAt.value = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
    localStorage.setItem(SYNC_STATUS_STORAGE_KEY, JSON.stringify({
      value: lastSyncedAt.value,
      cached_at: Date.now(),
    }))
  } catch {}
}

function buildShareUrl() {
  const url = new URL(window.location.href)
  const query = currentFilterQuery()
  url.pathname = route.path
  url.search = ''
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value))
  return url.toString()
}

function setShareStatus(message) {
  shareStatus.value = message
  clearTimeout(shareStatusTimer)
  shareStatusTimer = setTimeout(() => {
    shareStatus.value = ''
  }, 2500)
}

async function copyShareLink() {
  const url = buildShareUrl()
  try {
    await navigator.clipboard.writeText(url)
    setShareStatus('คัดลอกลิงก์รายงานแล้ว')
  } catch {
    setShareStatus(url)
  }
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportTripsCsv() {
  if (!trips.value.length) return
  const rows = [
    ['รายงานนี้เป็นเฉพาะหน้าปัจจุบัน', '', '', '', '', '', ''],
    [`ช่วงวันที่ ${filter.value.from || 'ทั้งหมด'} ถึง ${filter.value.to || 'ปัจจุบัน'}`, '', '', '', '', '', ''],
    [`ช่วงตัวกรอง ${filterLabel.value}`, '', '', '', '', '', ''],
    [`ออกรายงาน ${reportGeneratedAt.value}`, '', '', '', '', '', ''],
    [`ซิงค์ล่าสุด ${lastSyncedAt.value || 'ไม่พบข้อมูล'}`, '', '', '', '', '', ''],
    ['แหล่งข้อมูล APPSHEET / POSTGRESQL', '', '', '', '', '', ''],
    [`แถวที่ ${tripsMeta.value.offset + 1}-${Math.min(tripsMeta.value.offset + tripsMeta.value.limit, tripsMeta.value.total)} จาก ${tripsMeta.value.total}`, '', '', '', '', '', ''],
    [],
    ['รหัสเที่ยว', 'วันที่', 'คนขับ', 'รถ', 'รายได้', 'จำนวนบิล', 'สถานะ'],
    ...trips.value.map(t => [
      t.car_release_code || t.car_release_id || '',
      fmtDate(t.trip_date),
      t.driver_name || '',
      t.license_plate || t.car_name || '',
      t.total_amount || 0,
      t.total_number_of_bills || 0,
      t.accounting_status ? 'ตรวจแล้ว' : 'รอตรวจ',
    ]),
  ]
  const range = `${filter.value.from || 'all'}_${filter.value.to || 'now'}`
  downloadCsv(`fleet-summary-trips-current-page-${range}.csv`, rows)
}

function printReport() {
  window.print()
}

function previousCashPct() {
  const rev = parseFloat(previousSummary.value.total_revenue || 0)
  if (!rev) return 0
  return Math.round((parseFloat(previousSummary.value.total_cash || 0) / rev) * 100)
}

function previousAvgRevenuePerTrip() {
  const rev = parseFloat(previousSummary.value.total_revenue || 0)
  const tr = parseInt(previousSummary.value.total_trips || 0)
  return tr ? rev / tr : 0
}

function previousAvgPerCheckout() {
  const rev = parseFloat(previousSummary.value.total_revenue || 0)
  const co = parseInt(previousSummary.value.total_checkouts || 0)
  return co ? rev / co : 0
}

function deltaTone(current, previous, invert = false) {
  const c = parseFloat(current || 0)
  const p = parseFloat(previous || 0)
  if (!comparisonReady.value || !p || c === p) return 'flat'
  const up = c > p
  return invert ? (up ? 'down' : 'up') : (up ? 'up' : 'down')
}

function deltaText(current, previous, type = 'number') {
  if (!comparisonReady.value) return ''
  const c = parseFloat(current || 0)
  const p = parseFloat(previous || 0)
  if (!p) return 'ไม่มีฐานเทียบ'
  const diff = c - p
  const pctValue = Math.abs((diff / p) * 100)
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : ''
  const diffText = type === 'money' ? fmtB(Math.abs(diff)) : fmt(Math.abs(diff))
  return `${sign}${diffText} (${sign}${pctValue.toFixed(1)}%)`
}

function deltaPointText(current, previous, invert = false) {
  if (!comparisonReady.value) return ''
  const c = parseFloat(current || 0)
  const p = parseFloat(previous || 0)
  if (!p && !c) return 'เท่าเดิม'
  const diff = c - p
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : ''
  const tone = deltaTone(current, previous, invert)
  return tone === 'flat' ? 'เท่าเดิม' : `${sign}${Math.abs(diff).toFixed(1)} จุด`
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  if (dateRangeError.value) {
    filterDirty.value = true
    return
  }
  const seq = ++dashboardLoadSeq
  loading.value = true
  error.value   = ''
  widgetErrors.value = []
  try {
    const q = qs()
    const prevRange = previousRange()
    const requests = [
      { key: 'summary', label: 'KPI รวม', fallback: {}, request: api.get(`/dashboard/summary${q}`) },
      { key: 'monthly', label: 'กราฟรายเดือน', fallback: [], request: api.get(`/dashboard/monthly${q}`) },
      { key: 'topDrivers', label: 'อันดับคนขับ', fallback: [], request: api.get(`/dashboard/top-drivers${qs({ limit: 15 })}`) },
      { key: 'topCars', label: 'อันดับรถ', fallback: [], request: api.get(`/dashboard/top-cars${qs({ limit: 15 })}`) },
      { key: 'topStoresVisits', label: 'ร้านที่ไปบ่อย', fallback: [], request: api.get(`/dashboard/top-stores${qs({ limit: 15, by: 'visits' })}`) },
      { key: 'topStoresRevenue', label: 'ร้านยอดขายสูง', fallback: [], request: api.get(`/dashboard/top-stores${qs({ limit: 15, by: 'revenue' })}`) },
      { key: 'dayOfWeek', label: 'กราฟรายวัน', fallback: [], request: api.get(`/dashboard/day-of-week${q}`) },
      { key: 'problems', label: 'ปัญหาขนส่ง', fallback: [], request: api.get(`/dashboard/problems${q}`) },
    ]
    const results = await Promise.allSettled(requests.map(r => r.request))
    if (seq !== dashboardLoadSeq) return
    const val = (i) => {
      if (results[i].status === 'fulfilled') return results[i].value.data.data ?? requests[i].fallback
      widgetErrors.value.push(requests[i].label)
      return requests[i].fallback
    }

    summary.value          = val(0)
    monthly.value          = val(1)
    topDrivers.value       = val(2)
    topCars.value          = val(3)
    topStoresVisits.value  = val(4)
    topStoresRevenue.value = val(5)
    dayOfWeek.value        = val(6)
    problems.value         = val(7)

    if (prevRange) {
      const prevQ = qsFromRange(prevRange)
      const [prevSummaryResult, prevProblemsResult] = await Promise.allSettled([
        api.get(`/dashboard/summary${prevQ}`),
        api.get(`/dashboard/problems${prevQ}`),
      ])
      if (seq !== dashboardLoadSeq) return
      if (prevSummaryResult.status === 'fulfilled') previousSummary.value = prevSummaryResult.value.data.data || {}
      else {
        previousSummary.value = {}
        widgetErrors.value.push('ข้อมูลเปรียบเทียบ')
      }
      if (prevProblemsResult.status === 'fulfilled') previousProblems.value = prevProblemsResult.value.data.data || []
      else previousProblems.value = []
    } else {
      previousSummary.value = {}
      previousProblems.value = []
    }

    filterDirty.value = false
    hasLoaded.value = true
    saveFilterState()
    loadTrips(0)
    loadSyncStatus()

  } catch (e) {
    if (seq !== dashboardLoadSeq) return
    error.value = e.response?.data?.error || e.message
  } finally {
    if (seq === dashboardLoadSeq) loading.value = false
  }
}

// ── Charts ────────────────────────────────────────────────────────────────────
const C = {
  blue:    '#2563eb',
  orange:  '#f97316',
  amber:   '#f59e0b',
  slate:   '#64748b',
  slate100:'#f1f5f9',
  slate200:'#e2e8f0',
  slate700:'#334155',
  slate800:'#1e293b',
}

const MONTH_NAMES = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const monthlyChartData = computed(() => {
  const labels = monthly.value.map(r => {
    const [y, mo] = r.month.split('-')
    return MONTH_NAMES[parseInt(mo)] + ' ' + (parseInt(y) + 543).toString().slice(-2)
  })
  return {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'รายได้ (฿M)',
        data: monthly.value.map(r => +(parseFloat(r.revenue || 0) / 1e6).toFixed(3)),
        backgroundColor: 'rgba(37,99,235,0.8)',
        hoverBackgroundColor: C.blue,
        borderRadius: 4,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'จำนวน Check-out',
        data: monthly.value.map(r => parseInt(r.checkouts || 0)),
        borderColor: C.orange,
        backgroundColor: 'rgba(249,115,22,0.08)',
        pointBackgroundColor: C.orange,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.35,
        fill: false,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  }
})

const monthlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: { color: C.slate, font: { size: 11, family: 'system-ui' }, boxWidth: 12, usePointStyle: true },
      position: 'top', align: 'end',
    },
    tooltip: {
      backgroundColor: C.slate800,
      titleColor: '#94a3b8',
      bodyColor: '#f1f5f9',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (c) => c.dataset.label.includes('รายได้')
          ? ` รายได้: ${c.parsed.y.toFixed(2)}M`
          : ` จำนวน Check-out: ${c.parsed.y.toLocaleString()}`,
      },
    },
  },
  scales: {
    x: { grid: { color: C.slate200 }, ticks: { color: C.slate } },
    y: {
      position: 'left', grid: { color: C.slate200 },
      ticks: { color: C.slate, callback: v => v + 'M' },
      title: { display: true, text: 'รายได้ (M)', color: C.blue, font: { size: 10, weight: 700 } },
    },
    y1: {
      position: 'right', grid: { display: false },
      ticks: { color: C.slate },
      title: { display: true, text: 'จำนวน Check-out', color: C.orange, font: { size: 10, weight: 700 } },
    },
  },
}

const dowChartData = computed(() => {
  const data = [...dayOfWeek.value].sort((a, b) => a.dow - b.dow)
  const maxVal = Math.max(...data.map(d => parseInt(d.checkouts || 0)))
  return {
    labels: data.map(d => d.day_name || String(d.dow)),
    datasets: [{
      label: 'จำนวน Check-out',
      data: data.map(d => parseInt(d.checkouts || 0)),
      backgroundColor: data.map(d => parseInt(d.checkouts) === maxVal ? C.blue : 'rgba(37,99,235,0.35)'),
      borderRadius: 4,
    }],
  }
})

const dowChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: C.slate800,
      titleColor: '#94a3b8',
      bodyColor: '#f1f5f9',
      padding: 10,
      cornerRadius: 8,
      callbacks: { label: (c) => ` ${c.parsed.y.toLocaleString()} Check-out` },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: C.slate700, font: { weight: 600 } } },
    y: { grid: { color: C.slate200 }, ticks: { color: C.slate } },
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v) { return Number(v || 0).toLocaleString('th-TH') }
function fmtTime(v) {
  if (!v) return '–'
  const d = new Date(v)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
}
function fmtDate(v) {
  if (!v) return '–'
  return bkkDateStr(new Date(v))
}
function fmtK(v) {
  const n = parseFloat(v || 0)
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return fmt(n)
}
function fmtB(v) {
  const n = parseFloat(v || 0)
  if (n >= 1e6) return '฿' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '฿' + (n / 1e3).toFixed(0) + 'K'
  return '฿' + n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}
function fmtBig(v) {
  const n = parseFloat(v || 0)
  return n >= 1e6 ? '฿' + (n / 1e6).toFixed(2) + 'M' : '฿' + fmt(n)
}
function pct(val, max) {
  const v = parseFloat(val || 0), m = parseFloat(max || 1)
  return m === 0 ? 0 : Math.min(100, Math.round((v / m) * 100))
}
function pctOf(val, total) {
  return total ? ((parseInt(val || 0) / total) * 100).toFixed(1) : '0'
}
function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || '') }
function rankNumClass(i) {
  if (i === 0) return 'gold'
  if (i === 1) return 'silver'
  if (i === 2) return 'bronze'
  return ''
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(() => {
  const token = localStorage.getItem('crm_token')
  if (token) apiBase.defaults.headers.common['Authorization'] = `Bearer ${token}`
  window.addEventListener('keydown', onGlobalKeydown)
  applyCachedSyncStatus()
  if (restoreQueryState()) loadAll()
  else if (restoreFilterState()) loadAll()
  else applyPreset('1y')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  clearTimeout(shareStatusTimer)
})
</script>

<style scoped>
/* ── TOKENS ───────────────────────────────────────────────────────────────── */
.fleet-report {
  --accent:   #2563eb;
  --accent-o: #f97316;
  --accent-g: #10b981;
  --accent-a: #f59e0b;
  --accent-v: #8b5cf6;
  --ink:      #0f172a;
  --ink-mid:  #334155;
  --ink-dim:  #64748b;
  --ink-faint:#94a3b8;
  --border:   #e2e8f0;
  --border-md:#cbd5e1;
  --bg:       #f8fafc;
  --panel:    #ffffff;
  --panel-alt:#f1f5f9;

  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Sarabun', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

/* ── LAYOUT ──────────────────────────────────────────────────────────────── */
.container { max-width: 1400px; margin: 0 auto; padding: 0 32px; }

/* ── MASTHEAD ────────────────────────────────────────────────────────────── */
.masthead {
  background: var(--panel);
  border-bottom: 2px solid var(--ink);
  padding: 32px 0 20px;
}
.masthead-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--ink-dim);
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}
.dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-g); box-shadow: 0 0 6px var(--accent-g);
  animation: pulse 2s ease-in-out infinite;
  margin-right: 6px;
}
@keyframes pulse { 50% { opacity: 0.3; } }

.title {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: clamp(48px, 9vw, 112px);
  line-height: 0.92;
  letter-spacing: 0;
  color: var(--ink);
  margin-bottom: 8px;
}
.title .accent { color: var(--accent); }
.subtitle {
  font-size: 17px;
  color: var(--ink-dim);
  max-width: 680px;
  line-height: 1.5;
}
.byline {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

/* ── FILTER BAR ──────────────────────────────────────────────────────────── */
.filter-bar {
  background: var(--panel);
  border-bottom: 1px solid var(--border-md);
  padding: 10px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 8px rgba(0,0,0,0.06);
}
.filter-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.preset-group { display: flex; gap: 4px; }
.preset-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  padding: 5px 14px;
  border: 1px solid var(--border-md);
  background: transparent;
  color: var(--ink-dim);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}
.preset-btn:hover { border-color: var(--accent); color: var(--accent); }
.preset-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.preset-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.date-group { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.date-input {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: var(--bg);
  border: 1px solid var(--border-md);
  color: var(--ink);
  padding: 5px 10px;
  border-radius: 4px;
}
.date-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
.date-input:disabled { opacity: 0.65; cursor: not-allowed; }
.date-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-dim);
}
.date-sep { color: var(--ink-faint); }
.load-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  padding: 6px 16px;
  background: var(--accent);
  border: none;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  border-radius: 4px;
  transition: background 0.15s;
}
.load-btn:hover { background: #1d4ed8; }
.load-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.report-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.report-action-btn {
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border: 1px solid var(--border-md);
  background: var(--panel);
  color: var(--ink-mid);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.report-action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: #eff6ff;
}
.report-action-btn.primary {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}
.report-action-btn.primary:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.report-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.filter-dirty {
  width: 100%;
  margin-left: auto;
  font-size: 12px;
  color: #b45309;
  text-align: right;
}
.filter-dirty.error { color: #dc2626; }
.share-status {
  width: 100%;
  font-size: 12px;
  color: var(--accent);
  text-align: right;
  overflow-wrap: anywhere;
}

/* ── LOADING / ERROR ─────────────────────────────────────────────────────── */
.loading-state, .error-state {
  padding: 80px 0;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-dim);
}
.loading-bar {
  width: 200px; height: 2px;
  background: var(--border);
  margin: 0 auto 24px;
  position: relative;
  overflow: hidden;
  border-radius: 2px;
}
.loading-bar.compact {
  width: 120px;
  margin: 0;
}
.loading-bar::after {
  content: '';
  position: absolute;
  left: -50%; width: 50%; height: 100%;
  background: var(--accent);
  animation: slide 1.2s ease-in-out infinite;
}
@keyframes slide { to { left: 150%; } }

.refreshing-banner {
  margin-top: 24px;
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ink-dim);
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
}

.partial-warning {
  margin-top: 24px;
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #92400e;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 13px;
}
.partial-warning strong { font-weight: 700; }
.partial-warning span { color: #b45309; }

/* ── SECTIONS ────────────────────────────────────────────────────────────── */
.section { padding: 56px 0 32px; border-top: 1px solid var(--border); }
.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-label::before { content: ''; width: 24px; height: 2px; background: var(--accent); }
.section-title {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: clamp(32px, 4vw, 56px);
  line-height: 1;
  margin-bottom: 10px;
  letter-spacing: 0;
  color: var(--ink);
}
.section-desc {
  font-size: 16px;
  color: var(--ink-dim);
  max-width: 600px;
  margin-bottom: 32px;
  line-height: 1.6;
}

/* ── KPI HERO ────────────────────────────────────────────────────────────── */
.kpi-hero {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  border: 2px solid var(--ink);
  margin-bottom: 0;
}
.kpi-cell {
  padding: 36px 28px;
  border-right: 1px solid var(--border-md);
  background: var(--panel);
  min-width: 0;
}
.kpi-cell:last-child { border-right: none; }
.kpi-cell.headline {
  grid-row: span 2;
  background: linear-gradient(135deg, rgba(37,99,235,0.04), #fff);
}
.kpi-cell.accent-bg { background: var(--accent); color: #fff; }
.kpi-cell.dark-bg   { background: var(--ink); color: #fff; }
.kpi-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.65;
  margin-bottom: 10px;
}
.kpi-value {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: 100px;
  line-height: 0.9;
  letter-spacing: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.kpi-value.mid   { font-size: 64px; }
.kpi-value.strip { font-size: 40px !important; }
.kpi-sub { font-size: 14px; margin-top: 12px; opacity: 0.7; line-height: 1.4; }
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 2px solid var(--ink);
  border-top: none;
  margin-bottom: 40px;
  background: var(--panel);
}
.kpi-strip .kpi-cell { padding: 24px 20px; border-right: 1px solid var(--border-md); }
.kpi-strip .kpi-cell:last-child { border-right: none; }

/* ── EXECUTIVE SNAPSHOT ─────────────────────────────────────────────────── */
.attention-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.attention-item {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 4px;
  padding: 12px 14px;
  min-width: 0;
}
.attention-item.good { background: #f0fdf4; border-color: #bbf7d0; }
.attention-item.warn { background: #fff7ed; border-color: #fed7aa; }
.attention-item.info { background: #eff6ff; border-color: #bfdbfe; }
.attention-label {
  display: block;
  font-size: 12px;
  color: var(--ink-dim);
  margin-bottom: 4px;
}
.attention-item strong {
  display: block;
  font-size: 17px;
  color: var(--ink);
  margin-bottom: 2px;
}
.attention-item span:last-child {
  font-size: 12px;
  color: var(--ink-dim);
}
.insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 8px;
}
.insight-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-left: 4px solid var(--border-md);
  border-radius: 4px;
  padding: 16px 18px;
  min-width: 0;
}
.insight-card.primary { border-left-color: var(--accent); }
.insight-card.good { border-left-color: var(--accent-g); background: #f0fdf4; }
.insight-card.warn { border-left-color: var(--accent-o); background: #fff7ed; }
.insight-card.info { border-left-color: var(--accent); background: #eff6ff; }
.insight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.insight-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-mid);
}
.insight-badge {
  font-size: 11px;
  font-weight: 700;
  color: #92400e;
  background: #ffedd5;
  border-radius: 99px;
  padding: 2px 8px;
  white-space: nowrap;
}
.insight-value {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: 38px;
  line-height: 1;
  letter-spacing: 0;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.insight-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-dim);
}
.delta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
}
.delta.up { color: #15803d; }
.delta.down { color: #b91c1c; }
.delta.flat { color: var(--ink-dim); }

/* ── PANELS ──────────────────────────────────────────────────────────────── */
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  padding: 28px;
  border-radius: 2px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.panel-title {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: 26px;
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--ink);
}
.panel-sub { font-size: 13px; color: var(--ink-dim); margin-top: 4px; }
.panel-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--ink-faint);
  text-transform: uppercase;
  white-space: nowrap;
}

/* ── GRIDS ───────────────────────────────────────────────────────────────── */
.grid-2      { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.grid-stores { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }

/* ── CHARTS ──────────────────────────────────────────────────────────────── */
.chart-wrap { position: relative; height: 300px; }
.chart-wrap.tall { height: 360px; }

@media (max-width: 640px) {
  .chart-wrap { height: 200px; }
  .chart-wrap.tall { height: 240px; }
}
.chart-empty {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; letter-spacing: 0.1em;
  color: var(--ink-faint); text-transform: uppercase;
}

/* ── RANK LIST ───────────────────────────────────────────────────────────── */
.rank-list { list-style: none; }
.rank-item {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  gap: 14px;
  transition: background 0.15s, padding-left 0.15s;
}
.rank-item:hover { background: var(--panel-alt); padding-left: 6px; }
.rank-item:last-child { border-bottom: none; }
.rank-num {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: 28px;
  color: var(--ink-faint);
  line-height: 1;
}
.rank-num.gold   { color: #f59e0b; font-size: 34px; }
.rank-num.silver { color: #94a3b8; }
.rank-num.bronze { color: #b45309; }
.rank-main { display: flex; flex-direction: column; gap: 3px; }
.rank-name { font-weight: 700; font-size: 15px; color: var(--ink); }
.rank-meta-txt {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--ink-dim);
}
.rank-bar-track {
  height: 2px; background: var(--border);
  position: relative; margin-top: 5px; overflow: hidden;
}
.rank-bar-fill {
  height: 100%; background: var(--accent);
  transform-origin: left;
  animation: grow 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.rank-bar-fill.car   { background: var(--accent-g); }
.rank-bar-fill.store { background: var(--accent-a); }
@keyframes grow { from { transform: scaleX(0); } }
.rank-stat {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: 22px; color: var(--ink);
  line-height: 1; text-align: right;
}
.rank-stat-unit {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; color: var(--ink-faint);
  letter-spacing: 0.15em; text-transform: uppercase;
  margin-top: 3px;
}
.rank-empty {
  padding: 20px 0; text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--ink-faint); letter-spacing: 0.2em;
}

/* ── STORE TABLE ─────────────────────────────────────────────────────────── */
.store-table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 13px; }
.store-table th {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-dim); text-align: left;
  padding: 10px 14px; border-bottom: 2px solid var(--ink); font-weight: 400;
}
.store-table th.num { text-align: right; }
.store-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); }
.store-table td.num {
  text-align: right; font-family: 'JetBrains Mono', monospace; color: var(--ink-mid);
}
.store-table tbody tr:hover { background: var(--panel-alt); }
.store-rank {
  font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: var(--ink-faint);
}
.store-name { color: var(--ink-mid); font-weight: 500; }
.table-empty {
  text-align: center; padding: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--ink-faint); letter-spacing: 0.2em;
}

/* ── PAYMENT ─────────────────────────────────────────────────────────────── */
.pay-split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 4px; }
.pay-card { padding: 24px 20px; border: 1px solid var(--border); border-radius: 4px; }
.pay-card.cash {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff; border-color: transparent;
}
.pay-card.transfer { background: var(--panel-alt); }
.pay-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.8;
}
.pay-amount {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: 44px; line-height: 1; margin: 8px 0;
}
.pay-pct { font-size: 15px; opacity: 0.8; }

/* ── PROBLEMS ────────────────────────────────────────────────────────────── */
.problem-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.prob-card {
  padding: 20px 18px; border: 1px solid var(--border);
  background: var(--panel); border-radius: 4px;
  position: relative; overflow: hidden;
}
.prob-card.clickable { cursor: pointer; transition: box-shadow .15s, border-color .15s; }
.prob-card.clickable:hover { border-color: var(--prob-color, var(--accent)); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.prob-card.clickable:focus-visible {
  outline: 3px solid rgba(37,99,235,0.28);
  outline-offset: 3px;
  border-color: var(--prob-color, var(--accent));
}
.prob-card::before {
  content: ''; position: absolute; top: 0; left: 0;
  height: 3px; width: var(--pct, 0%);
  background: var(--prob-color, var(--accent));
  animation: growW 1.5s ease-out both;
}
@keyframes growW { from { width: 0; } }
.prob-name { font-size: 13px; font-weight: 600; color: var(--ink-mid); margin-bottom: 6px; }
.prob-value {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: 44px; line-height: 1;
  color: var(--prob-color, var(--accent));
}
.prob-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--ink-dim); margin-top: 4px;
}

/* ── FOOTER ──────────────────────────────────────────────────────────────── */
.fleet-footer {
  border-top: 2px solid var(--ink);
  margin-top: 64px;
  padding: 24px 0 40px;
  background: var(--panel);
}
.footer-inner {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--ink-faint);
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px;
}
.logo-mark {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: 22px; color: var(--ink); letter-spacing: 0.02em;
}

/* ── RESPONSIVE ──────────────────────────────────────────────────────────── */

/* tablet 768–1024 */
@media (max-width: 1024px) {
  .container { padding: 0 20px; }
  .kpi-hero  { grid-template-columns: 1fr 1fr; }
  .kpi-cell.headline { grid-row: auto; grid-column: span 2; }
  .kpi-value { font-size: 72px !important; }
  .grid-2, .grid-stores { grid-template-columns: 1fr; }
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .kpi-strip .kpi-cell:nth-child(2) { border-right: none; }
  .attention-strip { grid-template-columns: 1fr; }
  .insight-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .problem-grid { grid-template-columns: repeat(3, 1fr); }
  .pay-split { grid-template-columns: 1fr 1fr; }
  .section { padding: 40px 0 24px; }
}

/* mobile ≤ 640px */
@media (max-width: 640px) {
  .container { padding: 0 14px; }

  /* masthead */
  .masthead { padding: 20px 0 14px; }
  .masthead-top { font-size: 10px; gap: 6px; }
  .title { font-size: clamp(40px, 13vw, 72px); }
  .subtitle { font-size: 14px; }
  .byline { font-size: 9px; gap: 6px; flex-direction: column; }

  /* filter bar */
  .filter-bar { padding: 8px 0; position: static; }
  .filter-inner { flex-direction: column; align-items: stretch; gap: 8px; }
  .preset-group { flex-wrap: wrap; }
  .preset-btn { padding: 5px 10px; font-size: 10px; }
  .date-group { margin-left: 0; flex-wrap: wrap; }
  .date-input { font-size: 12px; width: 100%; flex: 1; }
  .load-btn { width: 100%; text-align: center; }
  .report-actions { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; }
  .report-action-btn { flex: 0 0 auto; padding: 7px 10px; font-size: 11px; }
  .filter-dirty, .share-status { text-align: left; }

  /* sections */
  .section { padding: 28px 0 16px; }
  .section-title { font-size: clamp(26px, 8vw, 40px); }
  .section-desc { font-size: 13px; margin-bottom: 20px; }

  /* KPI */
  .insight-grid { grid-template-columns: 1fr; }
  .insight-card { padding: 14px; }
  .insight-value { font-size: 32px; }
  .kpi-hero  { grid-template-columns: 1fr; border-width: 1px; }
  .kpi-cell.headline { grid-column: auto; }
  .kpi-cell  { padding: 20px 16px; border-right: none; border-bottom: 1px solid var(--border-md); }
  .kpi-value { font-size: 64px !important; }
  .kpi-value.mid { font-size: 48px !important; }
  .kpi-strip { grid-template-columns: repeat(2, 1fr); border-width: 1px; }
  .kpi-strip .kpi-cell { padding: 16px 14px; }
  .kpi-value.strip { font-size: 32px !important; }

  /* panels */
  .panel { padding: 16px 14px; }
  .panel-title { font-size: 20px; }

  /* grids */
  .grid-2, .grid-stores { grid-template-columns: 1fr; }
  .pay-split { grid-template-columns: 1fr; }
  .pay-amount { font-size: 32px; }
  .problem-grid { grid-template-columns: repeat(2, 1fr); }

  /* tables — horizontal scroll */
  .trips-table, .store-table { font-size: 12px; }
  .trips-table th, .trips-table td { padding: 8px 10px; }
  .store-table th, .store-table td { padding: 8px 10px; }

  /* modal */
  .modal-overlay { padding: 0; align-items: flex-end; }
  .modal-box {
    border-radius: 16px 16px 0 0;
    max-height: 92vh;
    max-width: 100%;
  }
  .modal-header { padding: 16px 16px 12px; }
  .modal-title  { font-size: 16px; }
  .modal-kpi    { grid-template-columns: repeat(2, 1fr); }
  .modal-kpi-cell { padding: 12px 14px; }
  .modal-kpi-cell:nth-child(2) { border-right: none; }
  .modal-kpi-val { font-size: 17px; }
  .modal-stops-table { font-size: 12px; }
  .modal-stops-table th,
  .modal-stops-table td { padding: 8px 10px; }

  /* rank list */
  .rank-item  { grid-template-columns: 32px 1fr auto; gap: 10px; padding: 12px 0; }
  .rank-num   { font-size: 22px; }
  .rank-name  { font-size: 13px; }
  .rank-stat  { font-size: 16px; }

  /* footer */
  .fleet-footer { padding: 16px 0 24px; margin-top: 40px; }
  .footer-inner { flex-direction: column; gap: 6px; }
}

/* ── TABLE SCROLL WRAPPER ─────────────────────────────────────────────────── */
.table-scroll-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

/* ── TRIPS TABLE ──────────────────────────────────────────────────────────── */
.trips-table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 13px; }
.trips-table thead tr { background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
.trips-table th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .05em; color: #64748b; text-transform: uppercase; }
.trips-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
.trip-row { cursor: pointer; transition: background .15s; }
.trip-row:hover { background: #f0f7ff; }
.trip-row:focus-visible {
  outline: 3px solid rgba(37,99,235,0.25);
  outline-offset: -3px;
  background: #eff6ff;
}
.trip-code { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: var(--accent); }
.trip-car  { font-size: 12px; color: #475569; }
.trip-route { max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
.status-badge.done    { background: #dcfce7; color: #166534; }
.status-badge.pending { background: #fef9c3; color: #854d0e; }
.trips-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 14px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
.trips-pagination button { padding: 4px 14px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; cursor: pointer; font-size: 12px; }
.trips-pagination button:disabled { opacity: .4; cursor: not-allowed; }
.trips-pagination button:not(:disabled):hover { background: #f0f7ff; border-color: var(--accent); }
.table-note {
  padding: 10px 14px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
  color: #64748b;
  background: #f8fafc;
}
.table-error {
  padding: 32px;
  text-align: center;
  color: #b45309;
  background: #fffbeb;
  border-top: 1px solid #fde68a;
}
.table-error p { margin-bottom: 12px; }
.table-error button {
  padding: 6px 14px;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  background: #fff;
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.table-error button:hover { background: #fef3c7; }

/* ── MODAL ────────────────────────────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-box { background: #fff; border-radius: 16px; width: 100%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,.2); }
.modal-box:focus { outline: none; }
.modal-loading { padding: 60px; text-align: center; color: #64748b; font-size: 14px; }
.modal-error {
  padding: 48px 28px;
  text-align: center;
  color: #b45309;
  background: #fffbeb;
}
.modal-error p { margin-bottom: 16px; font-weight: 600; }
.modal-error-actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
.modal-error-actions button {
  padding: 7px 14px;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  background: #fff;
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.modal-error-actions button:hover { background: #fef3c7; }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 24px 28px 16px; border-bottom: 1px solid #f1f5f9; }
.modal-code  { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: var(--accent); letter-spacing: .05em; margin-bottom: 4px; }
.modal-title { font-size: 18px; font-weight: 700; color: #0f172a; }
.modal-sub   { font-size: 13px; color: #64748b; margin-top: 2px; }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #94a3b8; padding: 4px 8px; line-height: 1; }
.modal-close:hover { color: #0f172a; }
.modal-kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #f1f5f9; }
.modal-kpi-cell { padding: 16px 24px; border-right: 1px solid #f1f5f9; }
.modal-kpi-cell:last-child { border-right: none; }
.modal-kpi-label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
.modal-kpi-val   { font-size: 20px; font-weight: 700; color: #0f172a; }
.modal-stops-wrap { overflow: auto; flex: 1; }
.modal-stops-table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 13px; }
.modal-stops-table thead tr { background: #f8fafc; position: sticky; top: 0; z-index: 1; }
.modal-stops-table th { padding: 9px 14px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .05em; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
.modal-stops-table td { padding: 10px 14px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
.stop-seq  { font-weight: 700; color: #94a3b8; width: 32px; }
.stop-name { font-weight: 600; color: #1e293b; font-size: 13px; }
.stop-zone { font-size: 11px; color: #94a3b8; margin-top: 1px; }
.stop-order { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #64748b; }
.stop-time { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #475569; }
.stop-bypass  td, tr.stop-bypass td { background: #fefce8; }
.stop-offsite td, tr.stop-offsite td { background: #fff7ed; }
.stop-tag { display: inline-block; padding: 2px 7px; border-radius: 99px; font-size: 11px; font-weight: 600; }
.stop-tag.ok      { background: #f0fdf4; color: #166534; }
.stop-tag.bypass  { background: #fef9c3; color: #854d0e; }
.stop-tag.offsite { background: #fff7ed; color: #9a3412; }
.visit-yes { color: #16a34a; font-weight: 700; }
.visit-no  { color: #dc2626; font-weight: 700; }
.visit-na  { color: #cbd5e1; }

@media print {
  .fleet-report {
    background: #fff;
    color: #000;
  }
  .filter-bar,
  .refreshing-banner,
  .partial-warning,
  .fleet-footer,
  .trips-pagination {
    display: none !important;
  }
  .container {
    max-width: none;
    padding: 0 16px;
  }
  .masthead {
    padding: 16px 0 10px;
    border-bottom-width: 1px;
  }
  .title {
    font-size: 54px;
  }
  .subtitle,
  .section-desc,
  .byline {
    color: #334155;
  }
  .section {
    padding: 24px 0 14px;
    break-inside: avoid;
  }
  .panel,
  .kpi-hero,
  .kpi-strip {
    break-inside: avoid;
    box-shadow: none;
  }
  .chart-wrap {
    height: 220px;
  }
  .chart-wrap.tall {
    height: 260px;
  }
  .store-table,
  .trips-table,
  .modal-stops-table {
    min-width: 0;
  }
  .trip-row:hover,
  .rank-item:hover {
    background: transparent;
    padding-left: 0;
  }
}
</style>
