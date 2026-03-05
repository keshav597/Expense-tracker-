/* ============================================================
   ExpenseFlow — Application Logic
   ============================================================ */

// -------- State --------
let transactions = JSON.parse(localStorage.getItem('expenseflow_transactions')) || [];
let monthlyChart = null;
let categoryChart = null;
let trendChart = null;

// -------- Category Config --------
const CATEGORIES = {
    food: { emoji: '🍔', label: 'Food & Dining', color: '#f97316' },
    transport: { emoji: '🚗', label: 'Transport', color: '#3b82f6' },
    shopping: { emoji: '🛍️', label: 'Shopping', color: '#ec4899' },
    entertainment: { emoji: '🎬', label: 'Entertainment', color: '#8b5cf6' },
    bills: { emoji: '📄', label: 'Bills & Utilities', color: '#06b6d4' },
    health: { emoji: '🏥', label: 'Health', color: '#10b981' },
    education: { emoji: '📚', label: 'Education', color: '#6366f1' },
    salary: { emoji: '💰', label: 'Salary', color: '#eab308' },
    freelance: { emoji: '💻', label: 'Freelance', color: '#14b8a6' },
    investment: { emoji: '📈', label: 'Investment', color: '#a855f7' },
    other: { emoji: '📦', label: 'Other', color: '#64748b' }
};

// -------- DOM Refs --------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
    sidebar: $('#sidebar'),
    menuBtn: $('#menuBtn'),
    overlay: $('#overlay'),
    dateDisplay: $('#dateDisplay'),
    totalBalance: $('#totalBalance'),
    totalIncome: $('#totalIncome'),
    totalExpenses: $('#totalExpenses'),
    transactionForm: $('#transactionForm'),
    submitBtn: $('#submitBtn'),
    recentList: $('#recentTransactionList'),
    allList: $('#allTransactionList'),
    searchInput: $('#searchInput'),
    filterType: $('#filterType'),
    filterCategory: $('#filterCategory'),
    filterSort: $('#filterSort'),
    editModal: $('#editModal'),
    editForm: $('#editForm'),
    editId: $('#editId'),
    editDescription: $('#editDescription'),
    editAmount: $('#editAmount'),
    editType: $('#editType'),
    editCategory: $('#editCategory'),
    editDate: $('#editDate'),
    modalClose: $('#modalClose'),
    modalCancel: $('#modalCancel'),
    topCategories: $('#topCategories'),
    summaryStats: $('#summaryStats'),
    toastContainer: $('#toastContainer'),
    viewAllBtn: $('#viewAllBtn')
};

// -------- Init --------
document.addEventListener('DOMContentLoaded', () => {
    setDateDisplay();
    setDefaultDate();
    bindEvents();
    render();
});

function setDateDisplay() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.dateDisplay.textContent = now.toLocaleDateString('en-IN', options);
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    $('#date').value = today;
}

// -------- Events --------
function bindEvents() {
    // Navigation
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    DOM.viewAllBtn.addEventListener('click', () => navigateTo('transactions'));

    // Mobile menu
    DOM.menuBtn.addEventListener('click', () => toggleSidebar());
    DOM.overlay.addEventListener('click', () => toggleSidebar(false));

    // Forms
    DOM.transactionForm.addEventListener('submit', handleAddTransaction);
    DOM.editForm.addEventListener('submit', handleEditSave);

    // Modal
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.modalCancel.addEventListener('click', closeModal);
    DOM.editModal.addEventListener('click', (e) => {
        if (e.target === DOM.editModal) closeModal();
    });

    // Filters
    DOM.searchInput.addEventListener('input', renderAllTransactions);
    DOM.filterType.addEventListener('change', renderAllTransactions);
    DOM.filterCategory.addEventListener('change', renderAllTransactions);
    DOM.filterSort.addEventListener('change', renderAllTransactions);
}

// -------- Navigation --------
function navigateTo(page) {
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $(`.nav-item[data-page="${page}"]`).classList.add('active');

    $$('.page').forEach(p => p.classList.remove('active'));
    $(`#${page}Page`).classList.add('active');

    if (page === 'analytics') renderAnalytics();
    if (page === 'transactions') renderAllTransactions();

    // Close mobile sidebar
    if (window.innerWidth <= 768) toggleSidebar(false);
}

function toggleSidebar(open) {
    const isOpen = open !== undefined ? open : !DOM.sidebar.classList.contains('open');
    DOM.sidebar.classList.toggle('open', isOpen);
    DOM.overlay.classList.toggle('active', isOpen);
}

// -------- CRUD --------
function handleAddTransaction(e) {
    e.preventDefault();

    const description = $('#description').value.trim();
    const amount = parseFloat($('#amount').value);
    const type = $('#type').value;
    const category = $('#category').value;
    const date = $('#date').value;

    if (!description || isNaN(amount) || amount <= 0) {
        showToast('Please fill in all fields correctly.', 'error');
        return;
    }

    const transaction = {
        id: Date.now().toString(),
        description,
        amount,
        type,
        category,
        date
    };

    transactions.unshift(transaction);
    save();
    render();

    DOM.transactionForm.reset();
    setDefaultDate();
    showToast(`${type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    save();
    render();
    showToast('Transaction deleted.', 'info');
}

function openEditModal(id) {
    const t = transactions.find(t => t.id === id);
    if (!t) return;

    DOM.editId.value = t.id;
    DOM.editDescription.value = t.description;
    DOM.editAmount.value = t.amount;
    DOM.editType.value = t.type;
    DOM.editCategory.value = t.category;
    DOM.editDate.value = t.date;
    DOM.editModal.classList.add('active');
}

function closeModal() {
    DOM.editModal.classList.remove('active');
}

function handleEditSave(e) {
    e.preventDefault();
    const id = DOM.editId.value;
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return;

    transactions[index] = {
        ...transactions[index],
        description: DOM.editDescription.value.trim(),
        amount: parseFloat(DOM.editAmount.value),
        type: DOM.editType.value,
        category: DOM.editCategory.value,
        date: DOM.editDate.value
    };

    save();
    render();
    closeModal();
    showToast('Transaction updated!', 'success');
}

// -------- Persistence --------
function save() {
    localStorage.setItem('expenseflow_transactions', JSON.stringify(transactions));
}

// -------- Render --------
function render() {
    updateSummary();
    renderRecentTransactions();
    renderMonthlyChart();

    // If analytics page is active, refresh it too
    if ($('#analyticsPage').classList.contains('active')) renderAnalytics();
    if ($('#transactionsPage').classList.contains('active')) renderAllTransactions();
}

// Summary cards
function updateSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    animateValue(DOM.totalBalance, balance);
    animateValue(DOM.totalIncome, income);
    animateValue(DOM.totalExpenses, expense);
}

function animateValue(el, target) {
    const format = (v) => '₹' + Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const prefix = target < 0 ? '-' : '';

    let start = 0;
    const duration = 600;
    const startTime = performance.now();

    function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = start + (target - start) * eased;
        el.textContent = prefix + format(current);
        if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

// Recent transactions (last 5)
function renderRecentTransactions() {
    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    DOM.recentList.innerHTML = recent.length === 0
        ? `<li class="empty-state"><i class="fas fa-receipt"></i><p>No transactions yet. Add your first one above!</p></li>`
        : recent.map(transactionHTML).join('');
}

// All transactions with filters
function renderAllTransactions() {
    let list = [...transactions];

    // Search
    const q = DOM.searchInput.value.toLowerCase();
    if (q) list = list.filter(t => t.description.toLowerCase().includes(q) || CATEGORIES[t.category].label.toLowerCase().includes(q));

    // Type filter
    const typeFilter = DOM.filterType.value;
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);

    // Category filter
    const catFilter = DOM.filterCategory.value;
    if (catFilter !== 'all') list = list.filter(t => t.category === catFilter);

    // Sort
    const sort = DOM.filterSort.value;
    switch (sort) {
        case 'newest': list.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
        case 'oldest': list.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
        case 'highest': list.sort((a, b) => b.amount - a.amount); break;
        case 'lowest': list.sort((a, b) => a.amount - b.amount); break;
    }

    DOM.allList.innerHTML = list.length === 0
        ? `<li class="empty-state"><i class="fas fa-search"></i><p>No transactions found.</p></li>`
        : list.map(transactionHTML).join('');
}

function transactionHTML(t) {
    const cat = CATEGORIES[t.category] || CATEGORIES.other;
    const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const sign = t.type === 'income' ? '+' : '-';

    return `
        <li class="transaction-item">
            <div class="transaction-left">
                <div class="transaction-icon ${t.type}-icon">${cat.emoji}</div>
                <div class="transaction-details">
                    <h4>${escapeHTML(t.description)}</h4>
                    <span>${cat.label} · ${dateStr}</span>
                </div>
            </div>
            <div class="transaction-right">
                <span class="transaction-amount ${t.type}">${sign}₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <div class="transaction-actions">
                    <button class="action-btn edit" onclick="openEditModal('${t.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="action-btn delete" onclick="deleteTransaction('${t.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </li>`;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// -------- Charts --------
function renderMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    const months = getLastNMonths(6);
    const incomeData = months.map(m => sumByMonth(m, 'income'));
    const expenseData = months.map(m => sumByMonth(m, 'expense'));

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderRadius: 6,
                    barPercentage: 0.5,
                    categoryPercentage: 0.6
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.75)',
                    borderRadius: 6,
                    barPercentage: 0.5,
                    categoryPercentage: 0.6
                }
            ]
        },
        options: chartOptions('₹')
    });
}

function renderAnalytics() {
    renderCategoryChart();
    renderTrendChart();
    renderTopCategories();
    renderSummaryStats();
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const expenses = transactions.filter(t => t.type === 'expense');
    const catTotals = {};
    expenses.forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(catTotals).map(k => CATEGORIES[k]?.label || k);
    const data = Object.values(catTotals);
    const colors = Object.keys(catTotals).map(k => CATEGORIES[k]?.color || '#64748b');

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { family: 'Inter', size: 12 } } },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return ` ₹${ctx.parsed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            }
        }
    });
}

function renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    const months = getLastNMonths(6);
    const incomeData = months.map(m => sumByMonth(m, 'income'));
    const expenseData = months.map(m => sumByMonth(m, 'expense'));

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: chartOptions('₹')
    });
}

function renderTopCategories() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const catTotals = {};
    expenses.forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });

    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxAmount = sorted.length > 0 ? sorted[0][1] : 1;

    if (sorted.length === 0) {
        DOM.topCategories.innerHTML = '<p class="empty-state" style="padding:20px"><i class="fas fa-chart-bar"></i><p>No expense data yet.</p></p>';
        return;
    }

    DOM.topCategories.innerHTML = sorted.map(([cat, amount], i) => {
        const c = CATEGORIES[cat] || CATEGORIES.other;
        const pct = (amount / maxAmount) * 100;
        return `
            <div class="cat-item">
                <span class="cat-rank">${i + 1}</span>
                <div class="cat-info">
                    <h4>${c.emoji} ${c.label}</h4>
                    <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
                </div>
                <span class="cat-amount">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>`;
    }).join('');
}

function renderSummaryStats() {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const total = transactions.length;
    const avgExpense = total > 0 ? expense / transactions.filter(t => t.type === 'expense').length : 0;
    const savingsRate = income > 0 ? ((income - expense) / income * 100) : 0;
    const largest = transactions.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];

    const stats = [
        { label: 'Total Transactions', value: total },
        { label: 'Avg. Expense', value: `₹${(avgExpense || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%` },
        { label: 'Largest Expense', value: largest ? `₹${largest.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—' }
    ];

    DOM.summaryStats.innerHTML = stats.map(s => `
        <div class="stat-item">
            <span class="stat-label">${s.label}</span>
            <span class="stat-value">${s.value}</span>
        </div>`).join('');
}

// -------- Chart Helpers --------
function getLastNMonths(n) {
    const months = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            year: d.getFullYear(),
            month: d.getMonth(),
            label: d.toLocaleDateString('en-IN', { month: 'short' })
        });
    }
    return months;
}

function sumByMonth(m, type) {
    return transactions
        .filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === m.year && d.getMonth() === m.month && t.type === type;
        })
        .reduce((s, t) => s + t.amount, 0);
}

function chartOptions(prefix) {
    return {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: {
                labels: { usePointStyle: true, font: { family: 'Inter', size: 12 }, padding: 16 }
            },
            tooltip: {
                callbacks: {
                    label: function (ctx) {
                        return ` ${ctx.dataset.label}: ${prefix}${ctx.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { family: 'Inter', size: 12 } }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(148,163,184,0.12)' },
                ticks: {
                    font: { family: 'Inter', size: 12 },
                    callback: (v) => prefix + v.toLocaleString('en-IN')
                }
            }
        }
    };
}

// -------- Toast --------
function showToast(message, type = 'info') {
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => toast.remove());
    }, 2800);
}
