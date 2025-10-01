const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const type = document.getElementById('type');
const category = document.getElementById('category');
const dateInput = document.getElementById('date');
const searchInput = document.getElementById('search');
const filterButtons = document.querySelectorAll('.filter-btn');
const exportBtn = document.getElementById('export-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const totalTransactionsEl = document.getElementById('total-transactions');
const avgTransactionEl = document.getElementById('avg-transaction');
const noTransactionsEl = document.getElementById('no-transactions');
const userNameEl = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const loadingOverlay = document.getElementById('loading-overlay');

let transactions = [];
let currentFilter = 'all';
let searchQuery = '';
let currentUser = null;
let unsubscribeTransactions = null;
let showAllTransactions = false;

dateInput.valueAsDate = new Date();

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    userNameEl.textContent = user.displayName || user.email;
    loadUserTransactions();
  } else {
    window.location.href = 'auth.html';
  }
});

logoutBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to logout?')) {
    try {
      if (unsubscribeTransactions) {
        unsubscribeTransactions();
      }
      await auth.signOut();
    } catch (error) {
      alert('Error logging out. Please try again.');
    }
  }
});

function loadUserTransactions() {
  loadingOverlay.classList.remove('hidden');
  
  unsubscribeTransactions = db.collection('transactions')
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
      init();
    }, (error) => {
      console.error('Error loading transactions:', error);
      loadingOverlay.classList.add('hidden');
      
      if (error.code === 'permission-denied') {
        alert('Permission denied. Please make sure Firestore security rules are set up correctly.');
      } else if (error.code === 'failed-precondition') {
        alert('Database index required. The app will still work but may be slower.');
      } else {
        alert('Error loading transactions: ' + error.message);
      }
    });
}

async function addTransaction(e) {
  e.preventDefault();
  
  console.log('Add transaction called');
  console.log('Current user:', currentUser);

  if (text.value.trim() === '' || amount.value.trim() === '') {
    alert('Please add a description and amount');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

  try {
    const amountValue = type.value === 'expense' ? -Math.abs(+amount.value) : Math.abs(+amount.value);
    
    const transaction = {
      userId: currentUser.uid,
      text: text.value,
      amount: amountValue,
      category: category.value,
      date: dateInput.value,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('Attempting to add transaction:', transaction);

    await db.collection('transactions').add(transaction);
    
    console.log('Transaction added successfully!');

    // Reset form
    text.value = '';
    amount.value = '';
    dateInput.valueAsDate = new Date();
    type.value = 'expense';
    category.value = 'Food';
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add transaction';
  } catch (error) {
    console.error('Error adding transaction:', error);
    
    let errorMsg = 'Error adding transaction: ';
    if (error.code === 'permission-denied') {
      errorMsg += 'Permission denied. Please check Firestore security rules.';
    } else if (error.code === 'unauthenticated') {
      errorMsg += 'You are not logged in. Please refresh and login again.';
    } else {
      errorMsg += error.message;
    }
    
    alert(errorMsg);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add transaction';
  }
}

function generateID() {
  return Math.floor(Math.random() * 100000000);
}

function addTransactionDOM(transaction) {
  const sign = transaction.amount < 0 ? '-' : '+';

  const item = document.createElement('li');

  item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');
  
  const formattedDate = transaction.date ? new Date(transaction.date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) : 'No date';

  item.innerHTML = `
    <div class="transaction-details">
      <div class="transaction-main">
        <span class="transaction-category">${transaction.category || 'Other'}</span>
        <span class="transaction-text">${transaction.text}</span>
      </div>
      <span class="transaction-date">${formattedDate}</span>
    </div>
    <div class="transaction-amount">
      <span class="amount-value">${sign}₹${Math.abs(transaction.amount).toFixed(2)}</span>
      <button class="delete-btn" onclick="removeTransaction('${transaction.id}')" title="Delete">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  list.appendChild(item);
}

function updateValues() {
  const filteredTransactions = getFilteredTransactions();
  const amounts = filteredTransactions.map(transaction => transaction.amount);

  const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);

  const income = amounts
    .filter(item => item > 0)
    .reduce((acc, item) => (acc += item), 0)
    .toFixed(2);

  const expense = (
    amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) *
    -1
  ).toFixed(2);

  balance.innerText = `₹${total}`;
  money_plus.innerText = `+₹${income}`;
  money_minus.innerText = `-₹${expense}`;
  
  totalTransactionsEl.innerText = filteredTransactions.length;
  const avgAmount = filteredTransactions.length > 0 
    ? (Math.abs(amounts.reduce((acc, item) => acc + item, 0)) / filteredTransactions.length).toFixed(2)
    : '0.00';
  avgTransactionEl.innerText = `₹${avgAmount}`;
}

async function removeTransaction(id) {
  console.log('Delete button clicked for transaction ID:', id);
  
  if (!confirm('Are you sure you want to delete this transaction?')) {
    return;
  }

  try {
    console.log('Attempting to delete transaction:', id);
    await db.collection('transactions').doc(id).delete();
    console.log('Transaction deleted successfully!');
  } catch (error) {
    console.error('Error removing transaction:', error);
    
    let errorMsg = 'Error deleting transaction: ';
    if (error.code === 'permission-denied') {
      errorMsg += 'Permission denied. Check Firestore security rules.';
    } else if (error.code === 'not-found') {
      errorMsg += 'Transaction not found.';
    } else {
      errorMsg += error.message;
    }
    
    alert(errorMsg);
  }
}

function getFilteredTransactions() {
  let filtered = transactions;
  
  if (currentFilter === 'income') {
    filtered = filtered.filter(t => t.amount > 0);
  } else if (currentFilter === 'expense') {
    filtered = filtered.filter(t => t.amount < 0);
  }
  
  if (searchQuery) {
    filtered = filtered.filter(t => 
      t.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }
  
  return filtered;
}

function init() {
  list.innerHTML = '';
  
  const filteredTransactions = getFilteredTransactions();
  
  if (filteredTransactions.length === 0) {
    noTransactionsEl.style.display = 'block';
    list.style.display = 'none';
    hideViewMoreButton();
  } else {
    noTransactionsEl.style.display = 'none';
    list.style.display = 'block';
    
    const transactionsToShow = showAllTransactions ? filteredTransactions : filteredTransactions.slice(0, 3);
    transactionsToShow.forEach(addTransactionDOM);
    
    if (filteredTransactions.length > 3 && !showAllTransactions) {
      showViewMoreButton(filteredTransactions.length);
    } else {
      hideViewMoreButton();
    }
  }
  
  updateValues();
}

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  init();
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    init();
  });
});

exportBtn.addEventListener('click', () => {
  if (transactions.length === 0) {
    alert('No transactions to export!');
    return;
  }
  
  let csv = 'Date,Description,Category,Amount,Type\n';
  
  transactions.forEach(transaction => {
    const type = transaction.amount > 0 ? 'Income' : 'Expense';
    csv += `${transaction.date || 'N/A'},"${transaction.text}","${transaction.category || 'Other'}",${Math.abs(transaction.amount).toFixed(2)},${type}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense-tracker-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
});

clearAllBtn.addEventListener('click', async () => {
  if (transactions.length === 0) {
    alert('No transactions to clear!');
    return;
  }
  
  if (confirm('Are you sure you want to delete all transactions? This action cannot be undone.')) {
    try {
      const batch = db.batch();
      transactions.forEach((transaction) => {
        const docRef = db.collection('transactions').doc(transaction.id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error clearing transactions:', error);
      alert('Error clearing transactions. Please try again.');
    }
  }
});

function showViewMoreButton(totalCount) {
  let viewMoreBtn = document.getElementById('view-more-btn');
  
  if (!viewMoreBtn) {
    viewMoreBtn = document.createElement('button');
    viewMoreBtn.id = 'view-more-btn';
    viewMoreBtn.className = 'view-more-btn';
    viewMoreBtn.innerHTML = `<i class="fas fa-chevron-down"></i> View More (${totalCount - 3} more)`;
    
    list.parentNode.insertBefore(viewMoreBtn, list.nextSibling);
    
    viewMoreBtn.addEventListener('click', () => {
      showAllTransactions = true;
      init();
    });
  } else {
    viewMoreBtn.innerHTML = `<i class="fas fa-chevron-down"></i> View More (${totalCount - 3} more)`;
    viewMoreBtn.style.display = 'block';
  }
}

function hideViewMoreButton() {
  const viewMoreBtn = document.getElementById('view-more-btn');
  if (viewMoreBtn) {
    viewMoreBtn.style.display = 'none';
  }
}

searchInput.addEventListener('input', () => {
  showAllTransactions = false;
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    showAllTransactions = false;
  });
});

form.addEventListener('submit', addTransaction);

window.removeTransaction = removeTransaction;

