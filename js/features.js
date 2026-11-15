// ==================== 4. MESS, TUITION, DEBT & DATA BACKUP ====================

// 1. Mess Calculator
function addMessEntry() {
    const member = document.getElementById('messMember').value.trim();
    const cost = parseFloat(document.getElementById('messCost').value) || 0;
    const meals = parseFloat(document.getElementById('messMeals').value) || 0;

    if (!member || (cost <= 0 && meals <= 0)) {
        return showPopup("Invalid Entry", "Please enter member name and bazaar cost or meal count!", "error");
    }

    appData.messRecords.unshift({ id: Date.now(), member, cost, meals });
    document.getElementById('messMember').value = '';
    document.getElementById('messCost').value = '';
    document.getElementById('messMeals').value = '';
    saveData();
}

function deleteMess(id) {
    appData.messRecords = appData.messRecords.filter(m => m.id !== id);
    saveData();
}

// 2. Tuition Manager
function addTuition() {
    const name = document.getElementById('tuitionName').value.trim();
    const fee = parseFloat(document.getElementById('tuitionFee').value) || 0;
    const wallet = document.getElementById('tuitionWallet').value;

    if (!name || fee <= 0) {
        return showPopup("Missing Details", "Please enter student/batch name and monthly fee!", "error");
    }

    appData.tuitions.push({ id: Date.now(), name, fee, wallet, paid: false });
    document.getElementById('tuitionName').value = '';
    document.getElementById('tuitionFee').value = '';
    saveData();
    showPopup("Student Added", `${name} added to your tuition tracker.`, "success");
}

function collectTuitionFee(id) {
    const item = appData.tuitions.find(t => t.id === id);
    if (!item) return;

    item.paid = !item.paid;
    if (item.paid) {
        const w = appData.wallets.find(x => x.name === item.wallet) || appData.wallets[0];
        w.balance = +(w.balance + item.fee).toFixed(2);
        appData.transactions.unshift({
            id: Date.now(),
            type: 'income',
            amount: item.fee,
            wallet: w.name,
            category: 'Tuition Fee',
            note: `Received from ${item.name}`,
            date: new Date().toISOString()
        });
        showPopup("Payment Collected!", `৳${item.fee} from ${item.name} added to your ${w.name} wallet!`, "success");
    }
    saveData();
}

function deleteTuition(id) {
    appData.tuitions = appData.tuitions.filter(t => t.id !== id);
    saveData();
}

// 3. Borrow & Lend (Directly connected with Wallets & Ledger)
function addDebtRecord() {
    const type = document.getElementById('debtType').value;
    const amount = parseFloat(document.getElementById('debtAmount').value) || 0;
    const walletName = document.getElementById('debtWallet')?.value || appData.wallets[0].name;
    const person = document.getElementById('debtPerson').value.trim();

    if (!person || amount <= 0) {
        return showPopup("Invalid Input", "Please enter person name and valid amount!", "error");
    }

    const wallet = appData.wallets.find(w => w.name === walletName) || appData.wallets[0];
    if (type === 'lent' && wallet.balance < amount) {
        return showPopup("Insufficient Balance", `Not enough money in ${wallet.name} to lend ৳${amount}!`, "error");
    }

    // Adjust Wallet Balance
    if (type === 'lent') {
        wallet.balance = +(wallet.balance - amount).toFixed(2);
    } else {
        wallet.balance = +(wallet.balance + amount).toFixed(2);
    }

    appData.debts.unshift({ id: Date.now(), type, person, amount, wallet: wallet.name });

    appData.transactions.unshift({
        id: Date.now() + 1,
        type: type === 'borrowed' ? 'income' : 'expense',
        amount: amount,
        wallet: wallet.name,
        category: type === 'borrowed' ? 'Loan / Borrowed' : 'Lent Out',
        note: `${person}`,
        date: new Date().toISOString()
    });

    document.getElementById('debtAmount').value = '';
    document.getElementById('debtPerson').value = '';
    saveData();
    showPopup("Record Saved", `৳${amount} ${type === 'lent' ? 'deducted from' : 'added to'} ${wallet.name}.`, "success");
}

function settleDebt(id) {
    const d = appData.debts.find(x => x.id === id);
    if (!d) return;

    const wallet = appData.wallets.find(w => w.name === d.wallet) || appData.wallets[0];
    if (d.type === 'borrowed' && wallet.balance < d.amount) {
        return showPopup("Insufficient Balance", `You need ৳${d.amount} in ${wallet.name} to pay back this loan!`, "error");
    }

    if (d.type === 'lent') {
        wallet.balance = +(wallet.balance + d.amount).toFixed(2);
    } else {
        wallet.balance = +(wallet.balance - d.amount).toFixed(2);
    }

    appData.transactions.unshift({
        id: Date.now(),
        type: d.type === 'lent' ? 'income' : 'expense',
        amount: d.amount,
        wallet: wallet.name,
        category: d.type === 'lent' ? 'Loan Recovered' : 'Loan Repaid',
        note: `Settled with ${d.person}`,
        date: new Date().toISOString()
    });

    appData.debts = appData.debts.filter(x => x.id !== id);
    saveData();
    showPopup("Settled!", `Record settled and ${wallet.name} balance updated!`, "success");
}

// 4. Backup & Restore
function downloadJSONBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `Student_Hisab_Backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showPopup("Backup Downloaded!", "Keep this .json file safe in your Google Drive or Email.", "success");
}

function downloadCSVReport() {
    let csv = "Date,Type,Category,Wallet,Amount,Note\n";
    appData.transactions.forEach(t => {
        const d = new Date(t.date).toLocaleDateString();
        csv += `"${d}","${t.type}","${t.category}","${t.wallet}","${t.amount}","${t.note}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Student_Hisab_Report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showPopup("Excel CSV Exported!", "Your transactions report has been downloaded.", "success");
}

function restoreJSONBackup() {
    const fileInput = document.getElementById('restoreFileInput');
    if (!fileInput.files.length) {
        return showPopup("No File Selected", "Please select a .json backup file first!", "error");
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported && imported.wallets && imported.transactions) {
                appData = imported;
                saveData();
                showPopup("Restore Successful!", "All your wallets and records have been restored.", "success");
            } else {
                showPopup("Invalid File", "This file is not a valid Student Hisab backup.", "error");
            }
        } catch (err) {
            showPopup("Restore Failed", "Could not read backup file!", "error");
        }
    };
    reader.readAsText(fileInput.files[0]);
}

function renderSubFeatures() {
    const totalBazaar = appData.messRecords.reduce((s, m) => s + m.cost, 0);
    const totalMeals = appData.messRecords.reduce((s, m) => s + m.meals, 0);
    const mealRate = totalMeals > 0 ? (totalBazaar / totalMeals).toFixed(2) : "0.00";

    document.getElementById('messTotalBazaar').innerText = `৳ ${totalBazaar.toLocaleString()}`;
    document.getElementById('messTotalMeals').innerText = `Total Meals: ${totalMeals}`;
    document.getElementById('messMealRate').innerText = `৳ ${mealRate}`;

    document.getElementById('messList').innerHTML = appData.messRecords.map(m => `
        <div class="tx-item">
            <div class="tx-left">
                <div class="tx-icon transfer-bg"><i class="ri-restaurant-2-line"></i></div>
                <div>
                    <h4>${m.member}</h4>
                    <small>Bazaar: ৳${m.cost} • Meals: ${m.meals}</small>
                </div>
            </div>
            <button class="del-btn" onclick="deleteMess(${m.id})"><i class="ri-delete-bin-line"></i></button>
        </div>
    `).join('');

    document.getElementById('tuitionList').innerHTML = appData.tuitions.map(t => `
        <div class="tx-item">
            <div class="tx-left">
                <div class="tx-icon ${t.paid ? 'income-bg' : 'expense-bg'}"><i class="ri-graduation-cap-line"></i></div>
                <div>
                    <h4>${t.name}</h4>
                    <small>৳${t.fee}/month • Wallet: ${t.wallet}</small>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
                <button class="small-btn" style="background:${t.paid ? '#10ac84' : '#ee5253'}; color:#fff; border:none;" onclick="collectTuitionFee(${t.id})">
                    ${t.paid ? '✓ Paid' : 'Collect Fee'}
                </button>
                <button class="del-btn" onclick="deleteTuition(${t.id})"><i class="ri-delete-bin-line"></i></button>
            </div>
        </div>
    `).join('');

    document.getElementById('debtList').innerHTML = appData.debts.map(d => `
        <div class="tx-item">
            <div class="tx-left">
                <div class="tx-icon ${d.type === 'lent' ? 'income-bg' : 'expense-bg'}"><i class="ri-hand-coin-line"></i></div>
                <div>
                    <h4>${d.person}</h4>
                    <small>${d.type === 'lent' ? 'To Receive (পাওনা)' : 'To Pay (দেনা)'} • ${d.wallet || 'Cash'}</small>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span class="tx-amount ${d.type === 'lent' ? 'text-success' : 'text-danger'}">৳${d.amount}</span>
                <button class="small-btn" onclick="settleDebt(${d.id})">✓ Settle</button>
            </div>
        </div>
    `).join('');
}