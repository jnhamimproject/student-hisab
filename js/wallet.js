// ==================== 3. WALLET, TRANSACTIONS & TRANSFER SECURITY ====================

function setupLockScreenUI() {
    const title = document.getElementById('lockTitle');
    const btn = document.getElementById('unlockBtn');
    const hint = document.getElementById('passHint');

    if (!appData.masterPassword) {
        title.innerText = "Set Master Password";
        btn.innerText = "Set Password & Unlock";
        if (hint) hint.innerHTML = "Create a strong password (min 6 chars: Letter, Number & Symbol).";
    } else {
        title.innerText = "Wallet & Savings Protected";
        btn.innerText = "Unlock Wallet";
        if (hint) hint.innerHTML = "Enter your account password to unlock.";
    }
}

function togglePassVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'ri-eye-off-line';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'ri-eye-line';
    }
}

function handleWalletAuth() {
    const passInput = document.getElementById('walletPasswordInput').value.trim();
    const errorMsg = document.getElementById('passError');
    const strictRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;

    if (!appData.masterPassword) {
        if (!strictRegex.test(passInput)) {
            errorMsg.innerText = "Min 6 chars including a Letter, Number & Symbol (@,#,$, etc.)";
            return;
        }
        appData.masterPassword = passInput;
        saveData();
        openWalletContent();
        showPopup("Password Saved!", "Your password is now active for all security checks.", "success");
        return;
    }

    if (passInput === appData.masterPassword) {
        errorMsg.innerText = "";
        document.getElementById('walletPasswordInput').value = "";
        openWalletContent();
    } else {
        errorMsg.innerText = "Incorrect password! Please try again.";
    }
}

function openWalletContent() {
    document.getElementById('walletLockScreen').classList.add('hidden');
    document.getElementById('walletContent').classList.remove('hidden');
}

function lockWallet() {
    document.getElementById('walletLockScreen').classList.remove('hidden');
    document.getElementById('walletContent').classList.add('hidden');
}

// Designed Change Password Popup Controller
function openChangePasswordModal() {
    if (!appData.masterPassword) {
        openAuthModal('register');
        return;
    }
    document.getElementById('cpOldPass').value = '';
    document.getElementById('cpNewPass').value = '';
    document.getElementById('cpConfirmPass').value = '';
    document.getElementById('changePassModal').classList.remove('hidden');
}

async function executeMasterPasswordChange() {
    const oldP = document.getElementById('cpOldPass').value.trim();
    const newP = document.getElementById('cpNewPass').value.trim();
    const confirmP = document.getElementById('cpConfirmPass').value.trim();

    if (oldP !== appData.masterPassword) {
        return showPopup("Incorrect Old Password", "আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়!", "error");
    }

    const strictRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;
    if (!strictRegex.test(newP)) {
        return showPopup("Weak Password", "নতুন পাসওয়ার্ডে কমপক্ষে ৬ অক্ষর (ইংরেজি বর্ণ, সংখ্যা ও বিশেষ চিহ্ন @,#,$) থাকতে হবে!", "error");
    }

    if (newP !== confirmP) {
        return showPopup("Password Mismatch", "নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড দুইটি মেলেনি!", "error");
    }

    appData.masterPassword = newP;

    // Update in Local Account Registry if exists
    if (appData.user && appData.user.email) {
        let accounts = JSON.parse(localStorage.getItem('studentHisabAccounts')) || {};
        if (accounts[appData.user.email]) {
            accounts[appData.user.email].pass = newP;
            localStorage.setItem('studentHisabAccounts', JSON.stringify(accounts));
        }
    }

    // Update in Firebase Auth & Cloud if logged in
    if (typeof syncUpdatedPasswordToCloud === 'function') {
        await syncUpdatedPasswordToCloud(newP);
    }

    saveData(true);
    closeModal('changePassModal');
    showPopup("Password Updated!", "আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "success");
}

function openTxModal(type) {
    document.getElementById('txType').value = type;
    document.getElementById('txModalTitle').innerText = type === 'income' ? 'Add New Income' : 'Add New Expense';
    const badge = document.getElementById('txModalBadge');
    badge.className = type === 'income' ? 'modal-badge' : 'modal-badge badge-red';
    badge.innerHTML = type === 'income' ? '<i class="ri-add-circle-line"></i>' : '<i class="ri-indeterminate-circle-line"></i>';

    document.getElementById('txAmount').value = '';
    document.getElementById('txCategory').value = '';
    document.getElementById('txNote').value = '';
    populateWalletSelect('txWallet');
    document.getElementById('txModal').classList.remove('hidden');
}

function populateWalletSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = appData.wallets.map(w => 
        `<option value="${w.name}">${w.name} (৳${w.balance})</option>`
    ).join('');
}

const txCategoryInput = document.getElementById('txCategory');
const suggestionsBox = document.getElementById('categorySuggestions');

if (txCategoryInput) {
    txCategoryInput.addEventListener('input', showCategorySuggestions);
    txCategoryInput.addEventListener('focus', showCategorySuggestions);
}

function showCategorySuggestions() {
    const type = document.getElementById('txType').value;
    const list = type === 'income' ? appData.incomeCategories : appData.expenseCategories;
    const query = txCategoryInput.value.toLowerCase();

    const matched = list.filter(item => item.toLowerCase().includes(query));
    if (matched.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    suggestionsBox.innerHTML = matched.map(item => 
        `<li onclick="selectCategory('${item}')">${item}</li>`
    ).join('');
    suggestionsBox.classList.remove('hidden');
}

function selectCategory(val) {
    txCategoryInput.value = val;
    suggestionsBox.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    if (e.target !== txCategoryInput && suggestionsBox) suggestionsBox.classList.add('hidden');
});

function saveTransaction() {
    const type = document.getElementById('txType').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const walletName = document.getElementById('txWallet').value;
    const category = document.getElementById('txCategory').value.trim();
    const note = document.getElementById('txNote').value.trim();

    if (!amount || amount <= 0 || !category) {
        showPopup("Missing Info", "Please enter a valid amount and category!", "error");
        return;
    }

    const wallet = appData.wallets.find(w => w.name === walletName);
    if (type === 'expense' && wallet.balance < amount) {
        showPopup("Insufficient Balance", `You only have ৳${wallet.balance} in ${walletName}.`, "error");
        return;
    }

    wallet.balance = type === 'income' ? +(wallet.balance + amount).toFixed(2) : +(wallet.balance - amount).toFixed(2);

    const catList = type === 'income' ? appData.incomeCategories : appData.expenseCategories;
    if (!catList.some(c => c.toLowerCase() === category.toLowerCase())) {
        catList.push(category);
    }

    appData.transactions.unshift({
        id: Date.now(), type, amount, wallet: walletName, category, note: note || category, date: new Date().toISOString()
    });

    saveData();
    closeModal('txModal');
    showPopup("Saved Successfully", `${type === 'income' ? 'Income' : 'Expense'} of ৳${amount} recorded in ${walletName}.`, "success");
}

function openTransferModal() {
    populateWalletSelect('trFromWallet');
    populateWalletSelect('trToWallet');
    if (appData.wallets.length > 1) {
        document.getElementById('trFromWallet').selectedIndex = 1;
        document.getElementById('trToWallet').selectedIndex = 0;
    }
    document.getElementById('trAmount').value = '';
    updateTransferFeeDefault();
    document.getElementById('transferModal').classList.remove('hidden');
}

function updateTransferFeeDefault() {
    const fromName = document.getElementById('trFromWallet').value;
    const wallet = appData.wallets.find(w => w.name === fromName);
    document.getElementById('trFeePercent').value = wallet ? wallet.fee : 0;
    calcFeeFromPercent();
}

function calcFeeFromPercent() {
    const amount = parseFloat(document.getElementById('trAmount').value) || 0;
    const percent = parseFloat(document.getElementById('trFeePercent').value) || 0;
    const feeTaka = (amount * percent) / 100;
    document.getElementById('trFeeTaka').value = feeTaka ? feeTaka.toFixed(2) : 0;
}

function calcPercentFromFee() {
    const amount = parseFloat(document.getElementById('trAmount').value) || 0;
    const feeTaka = parseFloat(document.getElementById('trFeeTaka').value) || 0;
    if (amount > 0) {
        const percent = (feeTaka / amount) * 100;
        document.getElementById('trFeePercent').value = percent.toFixed(2);
    }
}

// Mandatory Password Verification for Balance Transfer
function promptTransferPasswordVerification() {
    const fromName = document.getElementById('trFromWallet').value;
    const toName = document.getElementById('trToWallet').value;
    const amount = parseFloat(document.getElementById('trAmount').value) || 0;

    if (fromName === toName) {
        return showPopup("Invalid Selection", "Please select two different wallets!", "error");
    }
    if (amount <= 0) {
        return showPopup("Invalid Amount", "Please enter a valid transfer amount!", "error");
    }
    if (!appData.masterPassword) {
        return showPopup("Registration Required", "ট্রান্সফার করার পূর্বে অনুগ্রহ করে একাউন্ট পাসওয়ার্ড সেট করুন!", "error");
    }

    document.getElementById('transferVerifyPass').value = '';
    document.getElementById('transferPassModal').classList.remove('hidden');
}

function verifyAndExecuteTransfer() {
    const pass = document.getElementById('transferVerifyPass').value.trim();
    if (pass !== appData.masterPassword) {
        return showPopup("Verification Failed", "পাসওয়ার্ড সঠিক নয়! সঠিক পাসওয়ার্ড দিন।", "error");
    }
    closeModal('transferPassModal');
    executeTransfer();
}

function executeTransfer() {
    const fromName = document.getElementById('trFromWallet').value;
    const toName = document.getElementById('trToWallet').value;
    const amount = parseFloat(document.getElementById('trAmount').value) || 0;
    const feeTaka = parseFloat(document.getElementById('trFeeTaka').value) || 0;

    const fromWallet = appData.wallets.find(w => w.name === fromName);
    const toWallet = appData.wallets.find(w => w.name === toName);
    const totalNeeded = +(amount + feeTaka).toFixed(2);

    if (fromWallet.balance < totalNeeded) {
        showPopup("Insufficient Balance!", `Need ৳${totalNeeded} (including fee), but ${fromName} has ৳${fromWallet.balance}.`, "error");
        return;
    }

    fromWallet.balance = +(fromWallet.balance - totalNeeded).toFixed(2);
    toWallet.balance = +(toWallet.balance + amount).toFixed(2);

    appData.transactions.unshift({
        id: Date.now(), type: 'transfer', amount: amount, fee: feeTaka, wallet: `${fromName} ➔ ${toName}`, category: 'Wallet Transfer', note: feeTaka > 0 ? `Fee: ৳${feeTaka}` : 'No Fee', date: new Date().toISOString()
    });

    saveData();
    closeModal('transferModal');
    showPopup("Transfer Complete!", `৳${amount} transferred successfully.`, "success");
}

function openAddWalletModal() {
    document.getElementById('newWalletName').value = '';
    document.getElementById('newWalletBalance').value = '';
    document.getElementById('newWalletFee').value = '';
    document.getElementById('addWalletModal').classList.remove('hidden');
}

function saveNewWallet() {
    const name = document.getElementById('newWalletName').value.trim();
    const balance = parseFloat(document.getElementById('newWalletBalance').value) || 0;
    const fee = parseFloat(document.getElementById('newWalletFee').value) || 0;

    if (!name) return showPopup("Name Required", "Enter wallet name!", "error");
    appData.wallets.push({ id: 'w' + Date.now(), name, balance, fee });
    saveData();
    closeModal('addWalletModal');
    showPopup("Wallet Added", `${name} added successfully!`, "success");
}

function deleteWallet(id) {
    if (appData.wallets.length <= 1) return;
    appData.wallets = appData.wallets.filter(w => w.id !== id);
    saveData();
}

function openAddGoalModal() {
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalTarget').value = '';
    document.getElementById('goalSaved').value = '';
    document.getElementById('addGoalModal').classList.remove('hidden');
}

function saveNewGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const target = parseFloat(document.getElementById('goalTarget').value) || 0;
    const saved = parseFloat(document.getElementById('goalSaved').value) || 0;

    if (!title || target <= 0) return showPopup("Invalid Goal", "Enter valid goal title and target amount!", "error");
    appData.goals.push({ id: Date.now(), title, target, saved });
    saveData();
    closeModal('addGoalModal');
    showPopup("Goal Created!", `Savings goal "${title}" added.`, "success");
}

function addMoneyToGoal(id) {
    const goal = appData.goals.find(g => g.id === id);
    if (!goal) return;
    const amt = parseFloat(prompt(`Add saved amount (৳) to "${goal.title}":`, "500"));
    if (!amt || amt <= 0) return;
    goal.saved = +(goal.saved + amt).toFixed(2);
    saveData();
    showPopup("Savings Updated!", `৳${amt} added to ${goal.title}!`, "success");
}

function deleteGoal(id) {
    appData.goals = appData.goals.filter(g => g.id !== id);
    saveData();
}