// API Base URL
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', ''];
const isFileProtocol = window.location.protocol === 'file:';
const isLocalEnv = LOCAL_HOSTS.includes(window.location.hostname) || isFileProtocol;
const apiBase = isLocalEnv ? 'http://localhost:3000' : window.location.origin;
const API_URL = `${apiBase.replace(/\/$/, '')}/api`;

const NUMBER_TYPE_CONFIG = {
  twoDigitBack: {
    label: 'เลขท้าย 2 ตัว',
    length: 2,
    price: 1,
    hint: 'ตัวอย่าง: 25, 78'
  },
  threeDigitFront: {
    label: 'เลขหน้า 3 ตัว',
    length: 3,
    price: 1,
    hint: 'ตัวอย่าง: 123, 456'
  },
  threeDigitBack: {
    label: 'เลขท้าย 3 ตัว',
    length: 3,
    price: 1,
    hint: 'ตัวอย่าง: 789, 012'
  }
};

let purchaseHistory = [];
let currentDraw = null;
let entryCounter = 0;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  setupForm();
  loadPurchaseHistory();
  loadResults();
});

function setupForm() {
  initializeNumberEntries();
  updateTotalPrice();
  updateCurrentDrawDisplay();

  const chaosSlider = document.getElementById('chaos-level');
  if (chaosSlider) {
    updateChaosDisplay(chaosSlider.value);
  }
}

function updateChaosDisplay(value) {
  const chaosValue = Math.min(Math.max(parseInt(value, 10) || 0, 0), 100);
  const display = document.getElementById('chaos-level-display');
  if (display) {
    display.textContent = `${chaosValue}%`;
  }
}

function initializeNumberEntries() {
  const container = document.getElementById('number-entries-container');
  if (!container) {
    return;
  }

  container.innerHTML = '';
  entryCounter = 0;
  addNumberEntry();
}

function addNumberEntry(preset = {}) {
  const container = document.getElementById('number-entries-container');
  if (!container) {
    return;
  }

  entryCounter += 1;
  const entryId = `entry-${Date.now()}-${entryCounter}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'number-entry';
  wrapper.dataset.entryId = entryId;

  const options = [
    '<option value="">-- เลือกประเภท --</option>',
    ...Object.entries(NUMBER_TYPE_CONFIG).map(
      ([value, config]) => `<option value="${value}">${config.label} (${config.price} บาท/ใบ)</option>`
    )
  ].join('');

  wrapper.innerHTML = `
    <div class="entry-field type">
      <select class="entry-number-type">
        ${options}
      </select>
    </div>
    <div class="entry-field number">
      <input type="text" class="entry-number" inputmode="numeric" placeholder="กรอกเลข" maxlength="3">
      <small class="hint-text entry-hint"></small>
    </div>
    <div class="entry-field quantity">
      <div class="quantity-control">
        <button type="button" class="qty-btn qty-minus" title="ลดจำนวน">−</button>
        <input type="number" class="entry-amount" min="1" value="${preset.amount || 1}" readonly>
        <button type="button" class="qty-btn qty-plus" title="เพิ่มจำนวน">+</button>
      </div>
      <small class="qty-label">ใบ</small>
    </div>
    <button type="button" class="entry-remove" title="ลบรายการ">✖</button>
  `;

  container.appendChild(wrapper);

  const numberTypeSelect = wrapper.querySelector('.entry-number-type');
  const numberInput = wrapper.querySelector('.entry-number');
  const amountInput = wrapper.querySelector('.entry-amount');
  const removeBtn = wrapper.querySelector('.entry-remove');
  const qtyMinus = wrapper.querySelector('.qty-minus');
  const qtyPlus = wrapper.querySelector('.qty-plus');

  numberTypeSelect.addEventListener('change', () => handleEntryTypeChange(wrapper));
  numberInput.addEventListener('input', () => handleEntryNumberInput(wrapper));
  amountInput.addEventListener('input', updateTotalPrice);
  
  // Quantity controls
  qtyMinus.addEventListener('click', () => {
    const current = parseInt(amountInput.value) || 1;
    if (current > 1) {
      amountInput.value = current - 1;
      updateTotalPrice();
    }
  });
  
  qtyPlus.addEventListener('click', () => {
    const current = parseInt(amountInput.value) || 1;
    if (current < 999) {
      amountInput.value = current + 1;
      updateTotalPrice();
    }
  });
  removeBtn.addEventListener('click', () => removeNumberEntry(entryId));

  if (preset.numberType && NUMBER_TYPE_CONFIG[preset.numberType]) {
    numberTypeSelect.value = preset.numberType;
    handleEntryTypeChange(wrapper);
  } else {
    handleEntryTypeChange(wrapper);
  }

  if (preset.number) {
    numberInput.value = preset.number;
  }

  if (preset.amount) {
    amountInput.value = preset.amount;
  }

  updateTotalPrice();
}

function removeNumberEntry(entryId) {
  const container = document.getElementById('number-entries-container');
  if (!container) {
    return;
  }

  const entryElement = container.querySelector(`.number-entry[data-entry-id="${entryId}"]`);
  if (entryElement) {
    entryElement.remove();
  }

  if (container.querySelectorAll('.number-entry').length === 0) {
    addNumberEntry();
  }

  updateTotalPrice();
}

function handleEntryTypeChange(wrapper) {
  const select = wrapper.querySelector('.entry-number-type');
  const numberInputContainer = wrapper.querySelector('.entry-field.number');
  const config = NUMBER_TYPE_CONFIG[select.value];

  if (!config) {
    numberInputContainer.innerHTML = `
      <div class="number-placeholder">เลือกประเภทก่อน</div>
      <input type="hidden" class="entry-number-value" value="">
      <small class="hint-text entry-hint">กรุณาเลือกประเภทก่อนจึงจะเลือกเลขได้</small>
    `;
    updateTotalPrice();
    return;
  }

  // สร้าง UI สำหรับเลือกเลข
  if (config.length === 2) {
    // เลขท้าย 2 ตัว: แสดงตัวเลือก 00-99
    createTwoDigitSelector(numberInputContainer);
  } else {
    // เลข 3 ตัว: เลือกหลักแรกก่อน (0-9) แล้วเลือก 2 หลักหลัง (00-99)
    createThreeDigitSelector(numberInputContainer);
  }

  updateTotalPrice();
}

function createTwoDigitSelector(container) {
  const buttons = [];
  for (let i = 0; i <= 99; i++) {
    const num = i.toString().padStart(2, '0');
    buttons.push(`<button type="button" class="number-btn" data-number="${num}">${num}</button>`);
  }
  
  container.innerHTML = `
    <div class="selected-number-display">
      <span class="selected-label">เลขที่เลือก:</span>
      <span class="selected-value">--</span>
    </div>
    <div class="number-grid two-digit-grid">
      ${buttons.join('')}
    </div>
    <input type="hidden" class="entry-number-value" value="">
    <small class="hint-text">คลิกเพื่อเลือกเลข 00-99</small>
  `;

  const numberBtns = container.querySelectorAll('.number-btn');
  const hiddenInput = container.querySelector('.entry-number-value');
  const selectedDisplay = container.querySelector('.selected-value');

  numberBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      numberBtns.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      btn.classList.add('active');
      // Update hidden input and display
      const number = btn.dataset.number;
      hiddenInput.value = number;
      selectedDisplay.textContent = number;
      selectedDisplay.classList.add('has-value');
      updateTotalPrice();
    });
  });
}

function createThreeDigitSelector(container) {
  container.innerHTML = `
    <div class="selected-number-display">
      <span class="selected-label">เลขที่เลือก:</span>
      <span class="selected-value">---</span>
    </div>
    <div class="three-digit-step-container">
      <div class="step-1" style="display: block;">
        <p class="step-title">ขั้นที่ 1: เลือกหลักแรก (0-9)</p>
        <div class="number-grid first-digit-grid">
          ${[0,1,2,3,4,5,6,7,8,9].map(d => 
            `<button type="button" class="number-btn first-digit-btn" data-digit="${d}">${d}</button>`
          ).join('')}
        </div>
      </div>
      <div class="step-2" style="display: none;">
        <p class="step-title">ขั้นที่ 2: เลือก 2 หลักหลัง (00-99)</p>
        <button type="button" class="back-btn">← ย้อนกลับ</button>
        <div class="number-grid last-two-digit-grid">
          ${Array.from({length: 100}, (_, i) => {
            const num = i.toString().padStart(2, '0');
            return `<button type="button" class="number-btn last-digit-btn" data-digit="${num}">${num}</button>`;
          }).join('')}
        </div>
      </div>
    </div>
    <input type="hidden" class="entry-number-value" value="">
    <small class="hint-text">เลือกตัวเลข 2 ขั้นตอน</small>
  `;

  const step1Div = container.querySelector('.step-1');
  const step2Div = container.querySelector('.step-2');
  const firstDigitBtns = container.querySelectorAll('.first-digit-btn');
  const lastDigitBtns = container.querySelectorAll('.last-digit-btn');
  const backBtn = container.querySelector('.back-btn');
  const hiddenInput = container.querySelector('.entry-number-value');
  const selectedDisplay = container.querySelector('.selected-value');
  
  let selectedFirst = '';

  firstDigitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFirst = btn.dataset.digit;
      // Update display
      selectedDisplay.textContent = selectedFirst + '--';
      selectedDisplay.classList.add('has-value');
      // Show step 2
      step1Div.style.display = 'none';
      step2Div.style.display = 'block';
    });
  });

  lastDigitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lastTwo = btn.dataset.digit;
      const fullNumber = selectedFirst + lastTwo;
      // Update hidden input and display
      hiddenInput.value = fullNumber;
      selectedDisplay.textContent = fullNumber;
      selectedDisplay.classList.add('has-value');
      // Highlight selected
      lastDigitBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateTotalPrice();
    });
  });

  backBtn.addEventListener('click', () => {
    step1Div.style.display = 'block';
    step2Div.style.display = 'none';
    selectedDisplay.textContent = '---';
    selectedDisplay.classList.remove('has-value');
    hiddenInput.value = '';
    updateTotalPrice();
  });
}

function getEntryNumber(wrapper) {
  const typeSelect = wrapper.querySelector('.entry-number-type');
  const config = NUMBER_TYPE_CONFIG[typeSelect.value];
  
  if (!config) return '';

  // ใช้ hidden input ที่เก็บค่าจากการคลิกปุ่ม
  const hiddenInput = wrapper.querySelector('.entry-number-value');
  return hiddenInput ? hiddenInput.value : '';
}

function handleEntryNumberInput(wrapper) {
  // ไม่ต้องใช้แล้วเพราะเปลี่ยนเป็นระบบเลือก
  updateTotalPrice();
}

function updateTotalPrice() {
  const container = document.getElementById('number-entries-container');
  const totalDisplay = document.getElementById('total-price');
  if (!container || !totalDisplay) {
    return;
  }

  let total = 0;
  container.querySelectorAll('.number-entry').forEach((wrapper) => {
    const typeSelect = wrapper.querySelector('.entry-number-type');
    const amountInput = wrapper.querySelector('.entry-amount');
    const config = NUMBER_TYPE_CONFIG[typeSelect.value];
    const amount = parseInt(amountInput.value, 10) || 0;
    if (config && amount > 0) {
      total += config.price * amount;
    }
  });

  totalDisplay.textContent = total;
}

function collectEntriesFromForm() {
  const container = document.getElementById('number-entries-container');
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll('.number-entry')).map((wrapper) => {
    const numberType = wrapper.querySelector('.entry-number-type').value;
    const number = getEntryNumber(wrapper); // ใช้ฟังก์ชันใหม่ที่รองรับทั้ง select และ input
    const amount = parseInt(wrapper.querySelector('.entry-amount').value, 10);
    return { numberType, number, amount };
  });
}

function validateEntries(entries) {
  if (!entries.length) {
    alert('กรุณาเพิ่มเลขที่ต้องการซื้ออย่างน้อย 1 รายการ');
    return false;
  }

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const config = NUMBER_TYPE_CONFIG[entry.numberType];
    if (!config) {
      alert(`รายการที่ ${i + 1}: กรุณาเลือกประเภทเลขให้ถูกต้อง`);
      return false;
    }
    if (!entry.number || entry.number.length !== config.length) {
      alert(`รายการที่ ${i + 1}: กรุณากรอกเลข ${config.length} หลัก`);
      return false;
    }
    if (!/^\d+$/.test(entry.number)) {
      alert(`รายการที่ ${i + 1}: กรุณากรอกเฉพาะตัวเลข`);
      return false;
    }
    if (!entry.amount || entry.amount < 1) {
      alert(`รายการที่ ${i + 1}: กรุณากรอกจำนวนใบตั้งแต่ 1 ใบขึ้นไป`);
      return false;
    }
  }

  return true;
}

function getStatusIcon(status) {
  if (status === 'win') {
    return '<img src="/src/nice.png" alt="">';
  }
  if (status === 'lose') {
    return '<img src="/src/incorrect.png" alt="">';
  }
  return '<img src="/src/hourglass.png" alt="">';
}

function getStatusLabel(status) {
  if (status === 'win') {
    return 'ถูกรางวัล';
  }
  if (status === 'lose') {
    return 'ไม่ถูกรางวัล';
  }
  return 'รอผล';
}

function formatThaiDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return date.toLocaleString('th-TH');
}

function updateCurrentDrawDisplay() {
  const drawBox = document.getElementById('current-draw-info');
  if (!drawBox) {
    return;
  }

  if (currentDraw && currentDraw.label) {
    drawBox.textContent = currentDraw.label;
  } else {
    drawBox.textContent = 'ยังไม่มีข้อมูลงวดปัจจุบัน';
  }
}

function setCurrentDraw(drawInfo) {
  currentDraw = drawInfo ? { ...drawInfo } : null;
  updateCurrentDrawDisplay();
}

// Tab switching
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  const tabButtons = document.querySelectorAll('.tab-btn');
  if (tabName === 'buy') {
    document.getElementById('buy-section').classList.add('active');
    tabButtons[0].classList.add('active');
  } else if (tabName === 'results') {
    document.getElementById('results-section').classList.add('active');
    tabButtons[1].classList.add('active');
    loadResults();
  } else if (tabName === 'prediction') {
    document.getElementById('prediction-section').classList.add('active');
    tabButtons[2].classList.add('active');
  } else if (tabName === 'admin') {
    document.getElementById('admin-section').classList.add('active');
    tabButtons[3].classList.add('active');
  }
}

// Submit purchase
async function submitPurchase(event) {
  event.preventDefault();

  const customerNameInput = document.getElementById('customer-name-buy');
  const customerName = customerNameInput ? customerNameInput.value.trim() : '';
  const entries = collectEntriesFromForm();

  if (!customerName) {
    alert('กรุณากรอกชื่อ-นามสกุล');
    return;
  }

  if (!validateEntries(entries)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerName,
        entries
      })
    });

    const result = await response.json();

    if (result.success) {
      if (result.data && result.data.drawId) {
        setCurrentDraw({
          id: result.data.drawId,
          label: result.data.drawLabel,
          sequence: result.data.drawSequence,
          date: result.data.drawDate
        });
      }
      purchaseHistory.unshift(result.data);
      displayPurchaseHistory();
      showSuccessMessage(result.data);
      document.getElementById('buy-form').reset();
      initializeNumberEntries();
      updateTotalPrice();
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('เกิดข้อผิดพลาดในการซื้อ');
  }
}

// Display purchase history
function displayPurchaseHistory() {
  const listElement = document.getElementById('purchase-list');

  if (!listElement) {
    return;
  }

  if (!purchaseHistory || purchaseHistory.length === 0) {
    listElement.innerHTML = '<p class="empty-message">ยังไม่มีรายการซื้อ</p>';
    return;
  }

  const sortedPurchases = [...purchaseHistory].sort(
    (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );

  listElement.innerHTML = sortedPurchases
    .map((purchase) => {
      const statusClass = purchase.status === 'win' ? 'win' : purchase.status === 'lose' ? 'lose' : '';
      const statusIcon = getStatusIcon(purchase.status);
      const statusLabel = getStatusLabel(purchase.status);

      const entriesHtml = (purchase.entries || [])
        .map((entry) => {
          const entryStatusClass = entry.status === 'win' ? 'win' : entry.status === 'lose' ? 'lose' : '';
          return `
            <div class="purchase-entry ${entryStatusClass}">
              <div class="entry-main">
                <span class="entry-type">${entry.label || NUMBER_TYPE_CONFIG[entry.numberType]?.label || ''}</span>
                <span class="entry-number">${entry.number}</span>
              </div>
              <div class="entry-meta">
                <span>จำนวน ${entry.amount} ใบ</span>
                <span>${entry.totalPrice} บาท</span>
                <span class="entry-status-icon">${getStatusIcon(entry.status)}</span>
              </div>
            </div>
          `;
        })
        .join('');

      const purchaseId = String(purchase.id || purchase._id || '').replace(/'/g, "\\'");

      return `
        <div class="purchase-item ${statusClass}" onclick="checkWinning('${purchaseId}')">
          <div class="purchase-item-header">
            <div class="type-badge">${purchase.drawLabel || 'งวดปัจจุบัน'}</div>
            <div class="purchase-status">${statusIcon} ${statusLabel}</div>
          </div>
          <div class="purchase-entry-list">
            ${entriesHtml}
          </div>
          <p><strong>รวม:</strong> ${purchase.totalPrice} บาท</p>
          <small>${purchase.customerName} • ${formatThaiDateTime(purchase.purchaseDate)}</small>
        </div>
      `;
    })
    .join('');
}

// Load purchase history
async function loadPurchaseHistory() {
  try {
    const response = await fetch(`${API_URL}/purchases`);
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      purchaseHistory = result.data;
    }
  } catch (error) {
    console.error('Error loading purchases:', error);
  }

  displayPurchaseHistory();
}

// Load lottery results
async function loadResults() {
  try {
    const response = await fetch(`${API_URL}/results`);
    const result = await response.json();

    if (result.currentDraw) {
      setCurrentDraw(result.currentDraw);
    }

    if (result.success && result.data && result.data.firstPrize) {
      displayResults(result.data);
    } else {
      document.getElementById('results-display').innerHTML = `
        <div class="no-results">
          <img src="/src/hourglass.png" alt=""> <p>ยังไม่มีการประกาศผลรางวัล ใจเย็น ๆ น้า</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading results:', error);
  }
}

// Display results
function displayResults(results) {
  const displayElement = document.getElementById('results-display');

  if (!displayElement) {
    return;
  }

  displayElement.innerHTML = `
    <div class="results-display-content">
      ${results.drawLabel ? `<div class="draw-label">${results.drawLabel}</div>` : ''}
      ${results.algorithm ? `<div class="algorithm-badge">${results.algorithm}</div>` : ''}
      <div class="prize-section">
        <h3>รางวัลที่ 1</h3>
        <div class="prize-number">${results.firstPrize}</div>
      </div>

      <div class="prize-section">
        <h3>เลขหน้า 3 ตัว</h3>
        <div class="prize-numbers">
          ${results.threeDigitFront
            .map(
              (num) => `
            <div class="number-box">${num}</div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="prize-section">
        <h3>เลขท้าย 3 ตัว</h3>
        <div class="prize-numbers">
          ${results.threeDigitBack
            .map(
              (num) => `
            <div class="number-box">${num}</div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="prize-section">
        <h3>เลขท้าย 2 ตัว</h3>
        <div class="prize-number" style="font-size: 2.5em;">${results.twoDigitBack}</div>
      </div>

      <div class="draw-date">
        ประกาศเมื่อ: ${new Date(results.lastUpdate).toLocaleString('th-TH')}
      </div>

      ${
        results.story || results.inspiration || typeof results.chaosLevel === 'number'
          ? `
        <div class="result-story">
          ${results.inspiration ? `<p><strong>แรงบันดาลใจ:</strong> ${results.inspiration}</p>` : ''}
          ${results.story ? `<p>${results.story}</p>` : ''}
          ${
            typeof results.chaosLevel === 'number'
              ? `<p><strong>ระดับความคาดเดาไม่ได้:</strong> ${Math.round(results.chaosLevel * 100)}%</p>`
              : ''
          }
        </div>
      `
          : ''
      }
    </div>
  `;
}

// Check winning numbers
async function checkWinning(purchaseId) {
  const purchase = purchaseHistory.find((p) => p.id === purchaseId);

  if (!purchase) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/check-winning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purchaseId })
    });

    const result = await response.json();

    if (result.success) {
      const index = purchaseHistory.findIndex((p) => p.id === purchaseId);
      if (index !== -1) {
        purchaseHistory[index] = result.data.purchase;
      }
      displayPurchaseHistory();

      const winMessage = result.data.isWin
        ? `ยินดีด้วย! คุณถูกรางวัล: ${result.data.winningEntries
            .map((entry) => `${entry.prize} (${entry.number})`)
            .join(', ')}`
        : 'ยังไม่ถูกรางวัลในงวดนี้';

      showPurchaseDetail(result.data.purchase, winMessage);
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showPurchaseDetail(purchase, 'ยังไม่สามารถตรวจสอบรางวัลได้');
  }
}

// Show purchase detail
function showPurchaseDetail(purchase, message) {
  const detailElement = document.getElementById('purchase-detail');
  if (!detailElement) {
    return;
  }

  const entriesHtml = (purchase.entries || [])
    .map((entry) => {
      const statusIcon = getStatusIcon(entry.status);
      const statusLabel = getStatusLabel(entry.status);
      return `
        <div class="purchase-entry ${entry.status}">
          <div class="entry-main">
            <span class="entry-type">${entry.label || NUMBER_TYPE_CONFIG[entry.numberType]?.label || ''}</span>
            <span class="entry-number">${entry.number}</span>
          </div>
          <div class="entry-meta">
            <span>จำนวน ${entry.amount} ใบ</span>
            <span>${entry.totalPrice} บาท</span>
            <span class="entry-status-icon">${statusIcon} ${statusLabel}</span>
          </div>
        </div>
      `;
    })
    .join('');

  detailElement.innerHTML = `
    <div class="purchase-detail-header">
      <h3>${purchase.drawLabel || 'งวดปัจจุบัน'}</h3>
      <p><strong>ชื่อผู้ซื้อ:</strong> ${purchase.customerName}</p>
      <p><strong>ซื้อเมื่อ:</strong> ${formatThaiDateTime(purchase.purchaseDate)}</p>
      <p><strong>ยอดรวม:</strong> ${purchase.totalPrice} บาท</p>
    </div>
    <div class="purchase-entry-list detail">
      ${entriesHtml}
    </div>
    <p class="purchase-message">${message}</p>
  `;

  document.getElementById('purchase-modal').style.display = 'block';
}

// Show success message
function showSuccessMessage(purchase) {
  const messageElement = document.getElementById('success-message');
  if (!messageElement) {
    return;
  }

  const entriesHtml = (purchase.entries || [])
    .map(
      (entry) => `
      <div class="purchase-entry">
        <div class="entry-main">
          <span class="entry-type">${entry.label || NUMBER_TYPE_CONFIG[entry.numberType]?.label || ''}</span>
          <span class="entry-number">${entry.number}</span>
        </div>
        <div class="entry-meta">
          <span>จำนวน ${entry.amount} ใบ</span>
          <span>${entry.totalPrice} บาท</span>
        </div>
      </div>
    `
    )
    .join('');

  messageElement.innerHTML = `
    <h3>ซื้อสำเร็จ!</h3>
    <p><strong>งวด:</strong> ${purchase.drawLabel || 'งวดปัจจุบัน'}</p>
    <p><strong>ชื่อ:</strong> ${purchase.customerName}</p>
    <div class="purchase-entry-list">
      ${entriesHtml}
    </div>
    <p><strong>ยอดรวม:</strong> ${purchase.totalPrice} บาท</p>
    <p style="margin-top: 20px; color: #28a745;">ขอให้ไม่ถูกหวยกิน! 😘</p>
  `;

  document.getElementById('success-modal').style.display = 'block';
}

// Close purchase modal
function closePurchaseModal() {
  document.getElementById('purchase-modal').style.display = 'none';
}

// Close success modal
function closeSuccessModal() {
  document.getElementById('success-modal').style.display = 'none';
}

// Predict numbers using AI
async function predictNumbers() {
  const userInput = document.getElementById('user-input').value;
  const predictBtn = document.getElementById('predict-btn');
  const resultDiv = document.getElementById('prediction-result');
  const errorDiv = document.getElementById('prediction-error');

  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';

  predictBtn.disabled = true;
  predictBtn.innerHTML = '<span class="loading"></span> กำลังทำนาย...';

  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userInput })
    });

    const result = await response.json();

    if (result.success) {
      displayPrediction(result.data);
    } else {
      errorDiv.style.display = 'block';
      errorDiv.textContent = result.message || 'เกิดข้อผิดพลาดในการทำนาย';
    }
  } catch (error) {
    console.error('Error:', error);
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'เกิดข้อผิดพลาดในการทำนาย';
  } finally {
    predictBtn.disabled = false;
    predictBtn.innerHTML = 'ขอเลข';
  }
}

function displayPrediction(data) {
  const resultDiv = document.getElementById('prediction-result');
  const twoDigitContainer = document.getElementById('suggested-two-digit');
  const threeDigitContainer = document.getElementById('suggested-three-digit');
  const analysisDiv = document.getElementById('ai-analysis');

  twoDigitContainer.innerHTML = (data.suggestedTwoDigit || []).map((num) => `<div class="suggested-number">${num}</div>`).join('');
  threeDigitContainer.innerHTML = (data.suggestedThreeDigit || [])
    .map((num) => `<div class="suggested-number">${num}</div>`)
    .join('');

  analysisDiv.textContent = data.prediction || 'AI ไม่สามารถวิเคราะห์ได้ในขณะนี้';
  resultDiv.style.display = 'block';
}

// Announce results (Admin)
async function announceResults(event) {
  event.preventDefault();

  const resultMode = document.querySelector('input[name="result-mode"]:checked')?.value || 'random';
  const inspirationInput = document.getElementById('inspiration');
  const chaosSlider = document.getElementById('chaos-level');
  const storyBlock = document.getElementById('admin-story');
  const submitBtn = event.target.querySelector('button[type="submit"]');

  let requestBody = {};

  // ตรวจสอบโหมด
  if (resultMode === 'manual') {
    // โหมดกำหนดผลเอง
    const firstPrize = document.getElementById('manual-first-prize')?.value.trim();
    const threeFront = document.getElementById('manual-three-front')?.value.trim();
    const threeBack = document.getElementById('manual-three-back')?.value.trim();
    const twoBack = document.getElementById('manual-two-back')?.value.trim();

    // Validate
    if (!firstPrize || !/^\d{6}$/.test(firstPrize)) {
      alert('กรุณากรอกรางวัลที่ 1 ให้ถูกต้อง (6 หลัก)');
      return;
    }
    if (!twoBack || !/^\d{2}$/.test(twoBack)) {
      alert('กรุณากรอกเลขท้าย 2 ตัวให้ถูกต้อง');
      return;
    }

    const threeFrontArray = threeFront.split(',').map(s => s.trim()).filter(s => s);
    const threeBackArray = threeBack.split(',').map(s => s.trim()).filter(s => s);

    if (threeFrontArray.length === 0) {
      alert('กรุณากรอกเลขหน้า 3 ตัวอย่างน้อย 1 ชุด');
      return;
    }
    if (threeBackArray.length === 0) {
      alert('กรุณากรอกเลขท้าย 3 ตัวอย่างน้อย 1 ชุด');
      return;
    }

    // ตรวจสอบว่าเป็นเลข 3 หลักทุกตัว
    for (const num of threeFrontArray) {
      if (!/^\d{3}$/.test(num)) {
        alert(`เลขหน้า 3 ตัว "${num}" ไม่ถูกต้อง`);
        return;
      }
    }
    for (const num of threeBackArray) {
      if (!/^\d{3}$/.test(num)) {
        alert(`เลขท้าย 3 ตัว "${num}" ไม่ถูกต้อง`);
        return;
      }
    }

    requestBody = {
      isLocked: true,
      manualResults: {
        firstPrize,
        threeDigitFront: threeFrontArray,
        threeDigitBack: threeBackArray,
        twoDigitBack: twoBack
      },
      inspiration: inspirationInput ? inspirationInput.value.trim() : ''
    };
  } else {
    // โหมดสุ่ม
    const inspiration = inspirationInput ? inspirationInput.value.trim() : '';
    const chaosRaw = chaosSlider ? parseInt(chaosSlider.value, 10) : 50;
    const chaosLevel = Math.min(Math.max(chaosRaw, 0), 100) / 100;

    requestBody = {
      inspiration,
      chaosLevel,
      isLocked: false
    };
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    if (!submitBtn.dataset.originalText) {
      submitBtn.dataset.originalText = submitBtn.innerHTML;
    }
    submitBtn.innerHTML = resultMode === 'manual' 
      ? '<span class="loading"></span> กำลังบันทึกผล...'
      : '<span class="loading"></span> กำลังปล่อยพลังสุ่ม...';
  }

  try {
    const response = await fetch(`${API_URL}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (result.success) {
      if (storyBlock) {
        storyBlock.classList.add('visible');
        const modeText = result.data.isLocked ? 'ล็อคผลแล้ว' : 'สุ่มอัตโนมัติ';
        storyBlock.innerHTML = `
          ${result.data.algorithm ? `<div class="algorithm-badge">${result.data.algorithm} (${modeText})</div>` : ''}
          <p><strong>ประกาศผล:</strong> ${result.announcedDraw?.label || 'ไม่ทราบงวด'}</p>
          <p>${result.data.story || 'ประกาศผลสำเร็จแล้ว!'}</p>
          ${
            result.nextDraw && result.nextDraw.label
              ? `<p><strong>งวดถัดไปที่เปิดให้ซื้อ:</strong> ${result.nextDraw.label}</p>`
              : ''
          }
        `;
      }
      alert(resultMode === 'manual' ? 'บันทึกผลรางวัลสำเร็จ!' : 'สุ่มประกาศผลสำเร็จ!');
      const form = document.getElementById('admin-form');
      if (form) {
        form.reset();
      }
      if (chaosSlider) {
        updateChaosDisplay(chaosSlider.value);
      } else {
        updateChaosDisplay(50);
      }
      loadResults();
      if (result.nextDraw) {
        setCurrentDraw(result.nextDraw);
      }
    } else {
      alert(`เกิดข้อผิดพลาด: ${result.message}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('เกิดข้อผิดพลาดในการประกาศผล');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      const defaultText = document.querySelector('input[name="result-mode"]:checked')?.value === 'manual'
        ? 'บันทึกผลรางวัล'
        : 'สุ่มประกาศผล';
      submitBtn.innerHTML = submitBtn.dataset.originalText || defaultText;
    }
  }
}

// Toggle result mode in admin panel
function toggleResultMode(mode) {
  const randomSection = document.getElementById('random-mode-section');
  const manualSection = document.getElementById('manual-mode-section');
  const announceBtn = document.getElementById('announce-btn');

  if (mode === 'random') {
    if (randomSection) randomSection.style.display = 'block';
    if (manualSection) manualSection.style.display = 'none';
    if (announceBtn) announceBtn.innerHTML = 'สุ่มประกาศผล';
  } else {
    if (randomSection) randomSection.style.display = 'none';
    if (manualSection) manualSection.style.display = 'block';
    if (announceBtn) announceBtn.innerHTML = 'บันทึกผลรางวัล';
  }
}

// Load winners list
async function loadWinners() {
  const winnersList = document.getElementById('winners-list');
  if (!winnersList) return;

  winnersList.innerHTML = '<div class="loading">กำลังโหลด...</div>';

  try {
    const response = await fetch(`${API_URL}/winners`);
    const result = await response.json();

    if (!result.success) {
      winnersList.innerHTML = `<div class="no-data">${result.message}</div>`;
      return;
    }

    const { draw, winners, totalWinners } = result.data;

    if (totalWinners === 0) {
      winnersList.innerHTML = `
        <div class="no-data">
          <h4>${draw.label}</h4>
          <p>ยังไม่มีผู้ถูกรางวัลในงวดนี้</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="winners-header">
        <h4>${draw.label}</h4>
        <p>มีผู้ถูกรางวัลทั้งหมด ${totalWinners} คน</p>
      </div>
      <div class="winners-table">
    `;

    winners.forEach((winner, index) => {
      const winningsHtml = winner.winningEntries.map(entry => `
        <div class="winning-entry">
          <span class="win-number">${entry.number}</span>
          <span class="win-prize">${entry.prize}</span>
          <span class="win-amount">${entry.amount} ใบ</span>
        </div>
      `).join('');

      html += `
        <div class="winner-card">
          <div class="winner-header">
            <span class="winner-index">#${index + 1}</span>
            <span class="winner-name">${winner.customerName}</span>
            <span class="winner-date">${new Date(winner.purchaseDate).toLocaleString('th-TH')}</span>
          </div>
          <div class="winner-prizes">
            ${winningsHtml}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    winnersList.innerHTML = html;

  } catch (error) {
    console.error('Error loading winners:', error);
    winnersList.innerHTML = '<div class="error-message">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
}
