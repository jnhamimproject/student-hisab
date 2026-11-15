// ==================== 2. UI NAVIGATION, ADVANCED FILTERS & SMOOTH TOUCH SWIPE ====================

let currentFilter = 'all';

function switchPage(pageName, btnElement) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageName).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (pageName === 'wallet') {
        setupLockScreenUI();
    } else if (typeof lockWallet === 'function') {
        lockWallet();
    }

    if (pageName === 'ledger') {
        populateLedgerFilters();
        renderTransactions();
    }
}

function goToWalletTab() {
    switchPage('wallet', document.getElementById('nav-wallet'));
}

function openSubPage(subPageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + subPageId).classList.add('active');
    if (subPageId === 'tuition' && typeof populateWalletSelect === 'function') {
        populateWalletSelect('tuitionWallet');
    }
    if (subPageId === 'debt' && typeof populateWalletSelect === 'function') {
        populateWalletSelect('debtWallet');
    }
    renderAll();
}

const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
});
document.addEventListener('click', () => dropdownMenu.classList.add('hidden'));

document.getElementById('openCustomizeBtn').addEventListener('click', () => {
    document.getElementById('customizeModal').classList.toggle('hidden');
});

function toggleCard(cardName, checkbox) {
    const card = document.querySelector(`[data-card="${cardName}"]`);
    if (card) card.classList.toggle('hidden', !checkbox.checked);
}

function filterTransactions(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTransactions();
}

function toggleCategoryBreakdown() {
    document.getElementById('categoryBreakdownBox').classList.toggle('hidden');
}

function deleteTx(id) {
    const tx = appData.transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.type === 'income') {
        const w = appData.wallets.find(x => x.name === tx.wallet);
        if (w) w.balance = +(w.balance - tx.amount).toFixed(2);
    } else if (tx.type === 'expense') {
        const w = appData.wallets.find(x => x.name === tx.wallet);
        if (w) w.balance = +(w.balance + tx.amount).toFixed(2);
    } else if (tx.type === 'transfer' && tx.wallet.includes(' ➔ ')) {
        const parts = tx.wallet.split(' ➔ ');
        const fromW = appData.wallets.find(x => x.name === parts[0]);
        const toW = appData.wallets.find(x => x.name === parts[1]);
        const fee = tx.fee || 0;
        if (fromW) fromW.balance = +(fromW.balance + tx.amount + fee).toFixed(2);
        if (toW) toW.balance = +(toW.balance - tx.amount).toFixed(2);
    }

    appData.transactions = appData.transactions.filter(t => t.id !== id);
    saveData();
    showPopup("Deleted & Adjusted", "Transaction removed and wallet balance updated.", "success");
}

function populateLedgerFilters() {
    const walletSel = document.getElementById('ledgerWalletFilter');
    const catSel = document.getElementById('ledgerCategoryFilter');
    if (!walletSel || !catSel) return;

    const prevW = walletSel.value || 'all';
    const prevC = catSel.value || 'all';

    walletSel.innerHTML = `<option value="all">All Wallets</option>` +
        appData.wallets.map(w => `<option value="${w.name}">${w.name}</option>`).join('');

    const allCats = [...new Set([
        ...appData.expenseCategories,
        ...appData.incomeCategories,
        ...appData.transactions.map(t => t.category)
    ])];

    catSel.innerHTML = `<option value="all">All Categories (সকল খাত)</option>` +
        allCats.map(c => `<option value="${c}">${c}</option>`).join('');

    walletSel.value = [...walletSel.options].some(o => o.value === prevW) ? prevW : 'all';
    catSel.value = [...catSel.options].some(o => o.value === prevC) ? prevC : 'all';
}

function renderAll() {
    const totalBalance = appData.wallets.reduce((sum, w) => sum + w.balance, 0);
    document.getElementById('homeTotalBalance').innerText = `৳ ${totalBalance.toLocaleString()}`;

    document.getElementById('homeWalletList').innerHTML = appData.wallets.map(w =>
        `<li><span>${w.name}:</span> <b>৳ ${w.balance.toLocaleString()}</b></li>`
    ).join('');

    document.getElementById('fullWalletList').innerHTML = appData.wallets.map(w =>
        `<li>
            <span>💳 ${w.name} <small style="color:#8ab4be;">(Fee: ${w.fee}%)</small></span>
            <div style="display:flex; align-items:center; gap:8px;">
                <b>৳ ${w.balance.toLocaleString()}</b>
                ${appData.wallets.length > 1 ? `<button class="del-btn" onclick="deleteWallet('${w.id}')" title="Delete Wallet"><i class="ri-delete-bin-line"></i></button>` : ''}
            </div>
        </li>`
    ).join('');

    const todayStr = new Date().toDateString();
    let monthlyInc = 0, monthlyExp = 0, todayExp = 0, todayCount = 0;

    appData.transactions.forEach(t => {
        if (t.type === 'income') monthlyInc += Number(t.amount) || 0;
        if (t.type === 'expense') {
            monthlyExp += Number(t.amount) || 0;
            if (new Date(t.date).toDateString() === todayStr) {
                todayExp += Number(t.amount) || 0;
                todayCount++;
            }
        }
        if (t.type === 'transfer' && t.fee) monthlyExp += Number(t.fee) || 0;
    });

    document.getElementById('homeMonthlyIncome').innerText = `+ ৳ ${monthlyInc.toLocaleString()}`;
    document.getElementById('homeMonthlyExpense').innerText = `- ৳ ${monthlyExp.toLocaleString()}`;
    document.getElementById('homeTodayExpense').innerText = `৳ ${todayExp.toLocaleString()}`;
    document.getElementById('homeTodayCount').innerText = `${todayCount} Transactions`;

    let totalLent = 0, totalBorrowed = 0;
    appData.debts.forEach(d => {
        if (d.type === 'lent') totalLent += Number(d.amount) || 0;
        else totalBorrowed += Number(d.amount) || 0;
    });
    document.getElementById('homeTotalLent').innerText = `৳ ${totalLent.toLocaleString()}`;
    document.getElementById('homeTotalBorrowed').innerText = `৳ ${totalBorrowed.toLocaleString()}`;

    const goalListEl = document.getElementById('savingsGoalList');
    if (appData.goals.length === 0) {
        goalListEl.innerHTML = `<p style="font-size:12px; color:#8ab4be;">No savings goals yet. Click "+ New Goal" to start saving!</p>`;
    } else {
        goalListEl.innerHTML = appData.goals.map(g => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
            return `
                <div class="goal-item">
                    <div class="flex-between">
                        <span>🎯 <b>${g.title}</b></span>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <button class="small-btn" onclick="addMoneyToGoal(${g.id})">+ Add ৳</button>
                            <button class="del-btn" onclick="deleteGoal(${g.id})"><i class="ri-delete-bin-line"></i></button>
                        </div>
                    </div>
                    <div class="flex-between" style="margin-top:4px; font-size:12px; color:#9ec5cf;">
                        <span>Saved: ৳ ${g.saved.toLocaleString()}</span>
                        <span>Target: ৳ ${g.target.toLocaleString()} (${pct}%)</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    populateLedgerFilters();
    if (typeof renderSubFeatures === 'function') renderSubFeatures();
    renderTransactions();
}

function renderTransactions() {
    const listEl = document.getElementById('transactionList');
    const walletSel = document.getElementById('ledgerWalletFilter');
    const catSel = document.getElementById('ledgerCategoryFilter');

    const walletFilter = (walletSel && walletSel.value) ? walletSel.value : 'all';
    const catFilter = (catSel && catSel.value) ? catSel.value : 'all';

    const filtered = appData.transactions.filter(t => {
        const matchType = currentFilter === 'all' ? true : t.type === currentFilter;
        const matchWallet = walletFilter === 'all' ? true : (t.wallet === walletFilter || t.wallet.includes(walletFilter));
        const matchCat = catFilter === 'all' ? true : t.category === catFilter;
        return matchType && matchWallet && matchCat;
    });

    document.getElementById('totalTxCount').innerText = `${filtered.length} items`;

    let filtInc = 0, filtExp = 0;
    const catMap = {};

    filtered.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') filtInc += amt;
        if (t.type === 'expense') filtExp += amt;
        if (t.type === 'transfer' && t.fee) filtExp += Number(t.fee) || 0;

        if (!catMap[t.category]) catMap[t.category] = { income: 0, expense: 0, count: 0 };
        catMap[t.category].count++;
        if (t.type === 'income') catMap[t.category].income += amt;
        else if (t.type === 'expense') catMap[t.category].expense += amt;
    });

    const incEl = document.getElementById('filteredIncomeSum');
    const expEl = document.getElementById('filteredExpenseSum');
    if (incEl) incEl.innerText = `+ ৳ ${filtInc.toLocaleString()}`;
    if (expEl) expEl.innerText = `- ৳ ${filtExp.toLocaleString()}`;

    const breakdownEl = document.getElementById('categoryBreakdownList');
    if (breakdownEl) {
        const entries = Object.entries(catMap);
        breakdownEl.innerHTML = entries.length === 0
            ? `<li style="color:#8ab4be;">No transactions yet for breakdown.</li>`
            : entries.map(([cat, val]) => `
                <li>
                    <span>📌 ${cat} <small style="color:#8ab4be;">(${val.count})</small></span>
                    <span>
                        ${val.income > 0 ? `<b class="text-success">+৳${val.income}</b> ` : ''}
                        ${val.expense > 0 ? `<b class="text-danger">-৳${val.expense}</b>` : ''}
                    </span>
                </li>
            `).join('');
    }

    if (filtered.length === 0) {
        listEl.innerHTML = `<p style="text-align:center; color:#7eaab5; padding:24px 12px; font-size:13px;">No transactions recorded yet. Tap "+ Income" or "- Expense" on Home to add your first entry!</p>`;
        return;
    }

    listEl.innerHTML = filtered.map(t => {
        const isInc = t.type === 'income';
        const isTr = t.type === 'transfer';
        const iconClass = isInc ? 'income-bg' : (isTr ? 'transfer-bg' : 'expense-bg');
        const icon = isInc ? 'ri-arrow-down-circle-line' : (isTr ? 'ri-arrow-left-right-line' : 'ri-shopping-bag-3-line');
        const colorClass = isInc ? 'text-success' : (isTr ? 'text-info' : 'text-danger');
        const sign = isInc ? '+' : (isTr ? '⇄' : '-');

        return `
            <div class="tx-item">
                <div class="tx-left">
                    <div class="tx-icon ${iconClass}"><i class="${icon}"></i></div>
                    <div>
                        <h4>${t.category}</h4>
                        <small>${t.wallet} • ${t.note}</small>
                    </div>
                </div>
                <div class="tx-right">
                    <span class="tx-amount ${colorClass}">${sign} ৳${t.amount}</span>
                    <button class="del-btn" onclick="deleteTx(${t.id})" title="Delete"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== RELIABLE TOUCH-SWIPE & MANUAL AD SLIDER ====================

const customAdsList = [
    {
        id: 1,
        title: "📢 বিজ্ঞাপন দিতে যোগাযোগ করুন (Click Here)",
        image: "https://placehold.co/600x160/0b3b49/00e6b8?text=Promote+Your+Brand+Here+%7C+Contact+Us",
        link: "https://docs.google.com/forms/u/0/"
    },
    {
        id: 2,
        title: "💡 আমাদের সহযোগিতা করতে আপনার আইডিয়া শেয়ার করুন",
        image: "https://placehold.co/600x160/123e35/ffffff?text=Share+Your+Ideas+%26+Feedback+With+Us",
        link: "https://docs.google.com/forms/u/0/"
    },
    {
        id: 3,
        title: "🎓 শিক্ষার্থীদের জন্য বিশেষ স্কিল ও কোডিং রিসোর্স দেখুন",
        image: "https://placehold.co/600x160/1e293b/38bdf8?text=Student+Special+Resources+%26+Tools",
        link: "https://jnhamim.web.app"
    }
];

let currentAdIndex = 0;
let adIntervalTimer = null;
let startX = 0;
let isSwiping = false;

function initCustomAdSlider() {
    const touchArea = document.getElementById('adTouchArea');
    const imgEl = document.getElementById('customAdImage');
    const dotsContainer = document.getElementById('customAdDots');

    if (!imgEl || customAdsList.length === 0) return;

    dotsContainer.innerHTML = customAdsList.map((_, idx) => 
        `<span class="ad-dot ${idx === 0 ? 'active' : ''}" onclick="manualSelectAd(${idx})"></span>`
    ).join('');

    showCustomAd(0);
    startAdAutoLoop();

    if (touchArea) {
        // Mobile Touch Events
        touchArea.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = false;
        }, { passive: true });

        touchArea.addEventListener('touchmove', (e) => {
            const currentX = e.touches[0].clientX;
            if (Math.abs(startX - currentX) > 15) {
                isSwiping = true;
            }
        }, { passive: true });

        touchArea.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            if (Math.abs(diff) > 30) {
                if (diff > 0) nextCustomAd();
                else prevCustomAd();
            }
        });

        // Laptop Mouse Drag Support
        touchArea.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            isSwiping = false;
        });

        touchArea.addEventListener('mouseup', (e) => {
            const diff = startX - e.clientX;
            if (Math.abs(diff) > 35) {
                isSwiping = true;
                if (diff > 0) nextCustomAd();
                else prevCustomAd();
            }
        });
    }
}

function openCurrentAdLink(e) {
    if (isSwiping) {
        e.preventDefault();
        isSwiping = false;
        return;
    }
    const ad = customAdsList[currentAdIndex];
    if (ad && ad.link) {
        window.open(ad.link, '_blank', 'noopener,noreferrer');
    }
}

function startAdAutoLoop() {
    if (adIntervalTimer) clearInterval(adIntervalTimer);
    adIntervalTimer = setInterval(() => {
        currentAdIndex = (currentAdIndex + 1) % customAdsList.length;
        showCustomAd(currentAdIndex);
    }, 6000);
}

function nextCustomAd(e) {
    if (e) e.stopPropagation();
    currentAdIndex = (currentAdIndex + 1) % customAdsList.length;
    showCustomAd(currentAdIndex);
    startAdAutoLoop();
}

function prevCustomAd(e) {
    if (e) e.stopPropagation();
    currentAdIndex = (currentAdIndex - 1 + customAdsList.length) % customAdsList.length;
    showCustomAd(currentAdIndex);
    startAdAutoLoop();
}

function manualSelectAd(idx) {
    showCustomAd(idx);
    startAdAutoLoop();
}

function showCustomAd(index) {
    currentAdIndex = index;
    const ad = customAdsList[index];
    const imgEl = document.getElementById('customAdImage');
    const captionEl = document.getElementById('customAdCaption');

    if (!imgEl) return;

    imgEl.style.opacity = '0.3';
    setTimeout(() => {
        imgEl.src = ad.image;
        captionEl.innerText = ad.title;
        imgEl.style.opacity = '1';
    }, 120);

    document.querySelectorAll('.ad-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === index);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initCustomAdSlider();
});