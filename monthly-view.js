const userNameEl = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const monthlyList = document.getElementById('monthly-list');
const noDataEl = document.getElementById('no-data');
const currentIncomeEl = document.getElementById('current-income');
const currentExpenseEl = document.getElementById('current-expense');
const currentBalanceEl = document.getElementById('current-balance');
const periodRangeEl = document.getElementById('period-range');
const currentCycleEl = document.getElementById('current-cycle');
const changeCycleBtn = document.getElementById('change-cycle-btn');
const cycleSettingsDiv = document.getElementById('cycle-settings');
const cycleStartDateSelect = document.getElementById('cycle-start-date');
const saveCycleBtn = document.getElementById('save-cycle-btn');
const cancelCycleBtn = document.getElementById('cancel-cycle-btn');

let currentUser = null;
let transactions = [];
let billingCycleStart = 1;

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    userNameEl.textContent = user.displayName || user.email;
    loadUserSettings();
    loadTransactions();
  } else {
    window.location.href = 'auth.html';
  }
});

logoutBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to logout?')) {
    await auth.signOut();
  }
});

async function loadUserSettings() {
  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists && userDoc.data().billingCycleStart) {
      billingCycleStart = userDoc.data().billingCycleStart;
      cycleStartDateSelect.value = billingCycleStart;
      updateCycleDisplay();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function updateCycleDisplay() {
  const suffix = billingCycleStart === 1 ? 'st' : 
                 billingCycleStart === 2 ? 'nd' : 
                 billingCycleStart === 3 ? 'rd' : 'th';
  currentCycleEl.textContent = `${billingCycleStart}${suffix} to ${billingCycleStart}${suffix} of every month`;
}

changeCycleBtn.addEventListener('click', () => {
  cycleSettingsDiv.style.display = 'block';
  changeCycleBtn.style.display = 'none';
});

cancelCycleBtn.addEventListener('click', () => {
  cycleSettingsDiv.style.display = 'none';
  changeCycleBtn.style.display = 'inline-flex';
  cycleStartDateSelect.value = billingCycleStart;
});

saveCycleBtn.addEventListener('click', async () => {
  const newCycle = parseInt(cycleStartDateSelect.value);
  
  try {
    await db.collection('users').doc(currentUser.uid).set({
      billingCycleStart: newCycle,
      email: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    billingCycleStart = newCycle;
    updateCycleDisplay();
    cycleSettingsDiv.style.display = 'none';
    changeCycleBtn.style.display = 'inline-flex';
    
    organizeByMonth();
    
    alert('Billing cycle updated successfully!');
  } catch (error) {
    console.error('Error saving cycle:', error);
    alert('Error saving billing cycle. Please try again.');
  }
});

function loadTransactions() {
  loadingOverlay.classList.remove('hidden');
  
  db.collection('transactions')
    .where('userId', '==', currentUser.uid)
    .onSnapshot((snapshot) => {
      transactions = [];
      snapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      transactions.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      
      loadingOverlay.classList.add('hidden');
      organizeByMonth();
    }, (error) => {
      console.error('Error loading transactions:', error);
      loadingOverlay.classList.add('hidden');
      alert('Error loading data: ' + error.message);
    });
}

function getBillingPeriod(date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  
  let periodStart, periodEnd;
  
  if (day >= billingCycleStart) {
    periodStart = new Date(year, month, billingCycleStart);
    periodEnd = new Date(year, month + 1, billingCycleStart - 1);
  } else {
    periodStart = new Date(year, month - 1, billingCycleStart);
    periodEnd = new Date(year, month, billingCycleStart - 1);
  }
  
  return { periodStart, periodEnd };
}

function getPeriodKey(periodStart) {
  const year = periodStart.getFullYear();
  const month = periodStart.getMonth() + 1;
  return `${year}-${month.toString().padStart(2, '0')}`;
}

function organizeByMonth() {
  if (transactions.length === 0) {
    monthlyList.innerHTML = '';
    noDataEl.style.display = 'block';
    return;
  }
  
  noDataEl.style.display = 'none';
  
  const monthlyData = {};
  
  transactions.forEach(transaction => {
    const { periodStart, periodEnd } = getBillingPeriod(transaction.date);
    const key = getPeriodKey(periodStart);
    
    if (!monthlyData[key]) {
      monthlyData[key] = {
        periodStart,
        periodEnd,
        transactions: [],
        income: 0,
        expense: 0,
        balance: 0
      };
    }
    
    monthlyData[key].transactions.push(transaction);
    
    if (transaction.amount > 0) {
      monthlyData[key].income += transaction.amount;
    } else {
      monthlyData[key].expense += Math.abs(transaction.amount);
    }
    
    monthlyData[key].balance = monthlyData[key].income - monthlyData[key].expense;
  });
  
  displayCurrentPeriod(monthlyData);
  
  displayMonthlyList(monthlyData);
}

function displayCurrentPeriod(monthlyData) {
  const now = new Date();
  const { periodStart } = getBillingPeriod(now);
  const key = getPeriodKey(periodStart);
  
  const currentData = monthlyData[key] || { income: 0, expense: 0, balance: 0, periodStart, periodEnd: new Date() };
  
  currentIncomeEl.textContent = `+₹${currentData.income.toFixed(2)}`;
  currentExpenseEl.textContent = `-₹${currentData.expense.toFixed(2)}`;
  currentBalanceEl.textContent = `₹${currentData.balance.toFixed(2)}`;
  
  const startStr = currentData.periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endStr = currentData.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  periodRangeEl.textContent = `${startStr} - ${endStr}`;
}

function displayMonthlyList(monthlyData) {
  monthlyList.innerHTML = '';
  
  const sortedKeys = Object.keys(monthlyData).sort((a, b) => {
    return new Date(monthlyData[b].periodStart) - new Date(monthlyData[a].periodStart);
  });
  
  sortedKeys.forEach(key => {
    const data = monthlyData[key];
    const card = createMonthCard(data);
    monthlyList.appendChild(card);
  });
}

function createMonthCard(data) {
  const card = document.createElement('div');
  card.className = 'month-card';
  
  const monthName = data.periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const startStr = data.periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = data.periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  card.innerHTML = `
    <div class="transaction-count">${data.transactions.length} transactions</div>
    <div class="month-header">
      <div>
        <h3 class="month-title">${monthName}</h3>
        <p class="month-period">${startStr} - ${endStr}</p>
      </div>
      <i class="fas fa-chevron-right month-arrow"></i>
    </div>
    <div class="month-stats">
      <div class="month-stat">
        <div class="month-stat-label">Income</div>
        <div class="month-stat-value income">₹${data.income.toFixed(2)}</div>
      </div>
      <div class="month-stat">
        <div class="month-stat-label">Expense</div>
        <div class="month-stat-value expense">₹${data.expense.toFixed(2)}</div>
      </div>
      <div class="month-stat">
        <div class="month-stat-label">Balance</div>
        <div class="month-stat-value balance">₹${data.balance.toFixed(2)}</div>
      </div>
    </div>
  `;
  
  card.addEventListener('click', () => {
    viewMonthDetails(data);
  });
  
  return card;
}

function viewMonthDetails(data) {
  const startDate = data.periodStart.toISOString().split('T')[0];
  const endDate = data.periodEnd.toISOString().split('T')[0];
  
  sessionStorage.setItem('filterStartDate', startDate);
  sessionStorage.setItem('filterEndDate', endDate);
  
  window.location.href = 'index.html';
}
