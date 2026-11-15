// ==================== 1. CENTRAL DATA STORE & POPUP (CLEAN ZERO DEFAULT) ====================

const STORAGE_KEY = 'studentHisabData_v2'; // Clean v2 key clears old demo data automatically

function getCleanDefaultData() {
    return {
        user: null,
        walletPassword: null,
        unsavedCloudCount: 0,
        isCloudSynced: true,
        wallets: [
            { id: 'w1', name: 'Cash (Hand)', balance: 0, fee: 0 },
            { id: 'w2', name: 'bKash', balance: 0, fee: 1.85 },
            { id: 'w3', name: 'Nagad', balance: 0, fee: 1.50 }
        ],
        expenseCategories: ['Food & Dining', 'Bus / Rickshaw Fare', 'Books & Photocopy', 'Mobile Recharge', 'Mess Bill', 'Snacks & Tea', 'Medical'],
        incomeCategories: ['Family Allowance', 'Tuition Fee', 'Salami / Gift', 'Part-time Income', 'Scholarship'],
        transactions: [],
        goals: [],
        messRecords: [],
        tuitions: [],
        debts: []
    };
}

let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || getCleanDefaultData();

if (!appData.messRecords) appData.messRecords = [];
if (!appData.tuitions) appData.tuitions = [];
if (!appData.debts) appData.debts = [];
if (appData.unsavedCloudCount === undefined) appData.unsavedCloudCount = 0;

function saveData(skipUnsavedIncrement = false) {
    if (!skipUnsavedIncrement) {
        appData.unsavedCloudCount = (appData.unsavedCloudCount || 0) + 1;
        appData.isCloudSynced = false;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    if (typeof renderAll === 'function') renderAll();
    if (typeof updateCloudSyncBanner === 'function') updateCloudSyncBanner();
}

function showPopup(title, message, type = 'error') {
    const iconWrap = document.getElementById('alertIconWrap');
    const icon = document.getElementById('alertIcon');
    const okBtn = document.getElementById('alertOkBtn');

    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = message;

    if (type === 'success') {
        iconWrap.className = 'alert-icon-wrap alert-success';
        icon.className = 'ri-checkbox-circle-fill';
        okBtn.style.background = 'linear-gradient(135deg, #00e6b8, #00b894)';
        okBtn.style.color = '#041f1a';
    } else {
        iconWrap.className = 'alert-icon-wrap alert-error';
        icon.className = 'ri-error-warning-fill';
        okBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5253)';
        okBtn.style.color = '#ffffff';
    }

    document.getElementById('customAlertModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Smart Cloud Sync Banner UI Controller
function updateCloudSyncBanner() {
    const banner = document.getElementById('cloudSyncBanner');
    const icon = document.getElementById('syncBannerIcon');
    const title = document.getElementById('syncBannerTitle');
    const desc = document.getElementById('syncBannerDesc');
    const btn = document.getElementById('syncActionBtn');

    if (!banner) return;

    if (appData.unsavedCloudCount === 0) {
        banner.className = "cloud-sync-banner alert-green";
        icon.className = "ri-cloud-check-line";
        if (appData.transactions.length === 0) {
            title.innerText = "Welcome to Student Hisab!";
            desc.innerText = "Add your income or expense to start tracking.";
            btn.innerText = "Ready ✓";
        } else {
            title.innerText = "All Records Safe in Cloud!";
            desc.innerText = "Your entries are backed up & secured.";
            btn.innerText = "Synced ✓";
        }
    } else {
        banner.className = "cloud-sync-banner alert-red";
        icon.className = "ri-cloud-off-line";
        title.innerText = `${appData.unsavedCloudCount} Unsaved Offline Records!`;
        desc.innerText = "Tap here to securely save your data to the cloud.";
        btn.innerText = "Save to Cloud";
    }
}

// Rewarded Ad 5-Second Simulator + Real Cloud Sync Trigger
function triggerSmartCloudSync() {
    if (appData.unsavedCloudCount === 0) {
        showPopup("Up to Date", "You have no unsaved offline records right now!", "success");
        return;
    }

    const modal = document.getElementById('rewardedAdModal');
    const closeBtn = document.getElementById('adCloseBtn');
    const progress = document.getElementById('adProgressFill');
    const text = document.getElementById('adCountdownText');

    modal.classList.remove('hidden');
    closeBtn.disabled = true;
    closeBtn.style.opacity = '0.5';
    closeBtn.innerText = "Please wait (5s)...";
    progress.style.width = '100%';

    let timeLeft = 5;
    text.innerHTML = `Watching a 5-second sponsor ad to support free cloud storage & secure your <b>${appData.unsavedCloudCount}</b> records...`;

    const timer = setInterval(() => {
        timeLeft--;
        progress.style.width = `${(timeLeft / 5) * 100}%`;
        if (timeLeft > 0) {
            closeBtn.innerText = `Please wait (${timeLeft}s)...`;
        } else {
            clearInterval(timer);
            closeBtn.disabled = false;
            closeBtn.style.opacity = '1';
            closeBtn.innerText = "Complete Cloud Sync ✓";
            closeBtn.onclick = async function() {
                modal.classList.add('hidden');
                if (typeof pushDataToFirebaseCloud === 'function') {
                    await pushDataToFirebaseCloud();
                }
                appData.unsavedCloudCount = 0;
                appData.isCloudSynced = true;
                saveData(true);
                showPopup("Cloud Backup Complete!", "All your financial records are now 100% safe & backed up!", "success");
            };
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    updateCloudSyncBanner();
});