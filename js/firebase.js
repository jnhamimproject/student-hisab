// ==================== 6. FIREBASE & MANDATORY 2-STEP AUTH MODULE (NON-BLOCKING) ====================

const firebaseConfig = {
  apiKey: "AIzaSyCN9AUHKZVLGv2Le60cZMf6lsEjRNEMj_E",
  authDomain: "student-hisab.firebaseapp.com",
  projectId: "student-hisab",
  storageBucket: "student-hisab.firebasestorage.app",
  messagingSenderId: "301710918911",
  appId: "1:301710918911:web:cc4320f8137b44bb55f8ca",
  measurementId: "G-K5TECGT66P"
};

let isFirebaseActive = false;
let pendingRegistrationData = null;
let pendingGoogleLoginUser = null;
let isAuthProcessing = false;

try {
    if (firebaseConfig.apiKey && typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        isFirebaseActive = true;
    }
} catch (err) {
    console.warn("Firebase init notice:", err);
}

// Helper: Runs a promise with a maximum timeout so Firebase never hangs the UI button!
function withTimeout(promise, ms = 3500) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
    ]);
}

function openAuthModal(defaultTab = 'register') {
    isAuthProcessing = false;
    document.getElementById('authTabBar').classList.remove('hidden');
    document.getElementById('authStepSetPassword').classList.add('hidden');
    document.getElementById('authStepVerifyGooglePass').classList.add('hidden');
    switchAuthTab(defaultTab);
    document.getElementById('authModal').classList.remove('hidden');
}

function switchAuthTab(mode) {
    isAuthProcessing = false;
    const loginTab = document.getElementById('tabLoginBtn');
    const regTab = document.getElementById('tabRegisterBtn');
    const stepReg = document.getElementById('authStepRegister');
    const stepLogin = document.getElementById('authStepLogin');
    const stepPass = document.getElementById('authStepSetPassword');
    const stepVerifyG = document.getElementById('authStepVerifyGooglePass');
    const modalTitle = document.getElementById('authModalTitle');

    stepPass.classList.add('hidden');
    stepVerifyG.classList.add('hidden');

    if (mode === 'register') {
        loginTab.classList.remove('active');
        regTab.classList.add('active');
        stepReg.classList.remove('hidden');
        stepLogin.classList.add('hidden');
        modalTitle.innerText = 'Student Registration (বাধ্যতামূলক)';
    } else {
        regTab.classList.remove('active');
        loginTab.classList.add('active');
        stepReg.classList.add('hidden');
        stepLogin.classList.remove('hidden');
        modalTitle.innerText = 'Student Login';
    }
}

// ==================== 1. EMAIL REGISTRATION: STEP 1 -> STEP 2 ====================
function proceedToPasswordSetupStep() {
    const name = document.getElementById('regNameInput').value.trim();
    const email = document.getElementById('regEmailInput').value.trim().toLowerCase();

    if (!name) {
        return showPopup("Name Required", "অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন!", "error");
    }
    if (!email || !email.includes('@')) {
        return showPopup("Valid Email Required", "অনুগ্রহ করে একটি সঠিক ইমেইল অ্যাড্রেস দিন!", "error");
    }

    pendingRegistrationData = {
        method: 'email',
        name: name,
        email: email,
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00b894&color=fff`
    };

    showPasswordSetupScreen();
}

function showPasswordSetupScreen() {
    isAuthProcessing = false;
    document.getElementById('authTabBar').classList.add('hidden');
    document.getElementById('authStepRegister').classList.add('hidden');
    document.getElementById('authStepLogin').classList.add('hidden');
    document.getElementById('authStepVerifyGooglePass').classList.add('hidden');
    document.getElementById('authStepSetPassword').classList.remove('hidden');
    document.getElementById('authModalTitle').innerText = 'Set Master Password';
    document.getElementById('setupMasterPass').value = '';
    document.getElementById('setupMasterConfirm').value = '';
    const btn = document.getElementById('confirmRegBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Confirm & Complete Registration ✓";
    }
}

// ==================== 2. GOOGLE FLOW (REGISTER OR LOGIN) ====================
async function startGoogleAuthFlow(flowType) {
    if (!isFirebaseActive) {
        return showPopup("Firebase Required", "Google Sign-In requires an active internet connection.", "error");
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await firebase.auth().signInWithPopup(provider);
        const u = result.user;

        // Check Firestore with a 3-second timeout so it never hangs if Firestore isn't created yet
        let existingCloudDoc = null;
        try {
            const docSnap = await withTimeout(
                firebase.firestore().collection('students').doc(u.uid).get(),
                3000
            );
            if (docSnap && docSnap.exists) existingCloudDoc = docSnap.data();
        } catch (dbErr) {
            console.warn("Firestore quick check skipped or timed out:", dbErr);
        }

        // Also check local accounts fallback
        const localAccounts = JSON.parse(localStorage.getItem('studentHisabAccounts')) || {};
        const localAcc = localAccounts[u.email?.toLowerCase()];

        if ((existingCloudDoc && existingCloudDoc.masterPassword) || (flowType === 'login' && localAcc && localAcc.pass)) {
            const savedMasterPass = existingCloudDoc?.masterPassword || localAcc.pass;
            pendingGoogleLoginUser = {
                uid: u.uid,
                name: u.displayName || existingCloudDoc?.user?.name || localAcc?.name || 'Student User',
                email: u.email.toLowerCase(),
                photo: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'S')}&background=00b894&color=fff`,
                cloudData: existingCloudDoc || { masterPassword: savedMasterPass }
            };
            document.getElementById('authTabBar').classList.add('hidden');
            document.getElementById('authStepRegister').classList.add('hidden');
            document.getElementById('authStepLogin').classList.add('hidden');
            document.getElementById('authStepSetPassword').classList.add('hidden');
            document.getElementById('authStepVerifyGooglePass').classList.remove('hidden');
            document.getElementById('authModalTitle').innerText = 'Enter Password';
            document.getElementById('googleVerifyGreeting').innerHTML = `স্বাগতম <b>${pendingGoogleLoginUser.name}</b> (${u.email})! প্রবেশ করতে আপনার পাসওয়ার্ড দিন:`;
            document.getElementById('googleVerifyPassInput').value = '';
        } else {
            pendingRegistrationData = {
                method: 'google',
                uid: u.uid,
                name: u.displayName || u.email.split('@')[0],
                email: u.email.toLowerCase(),
                photo: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'S')}&background=00b894&color=fff`
            };
            showPasswordSetupScreen();
        }
    } catch (err) {
        if (err.code === 'auth/unauthorized-domain') {
            showPopup("Domain Lock Notice", "Firebase Console -> Authentication -> Settings -> Authorized domains-এ গিয়ে jnhamimproject.github.io ডোমেইনটি Add করুন।", "error");
        } else if (err.code !== 'auth/popup-closed-by-user') {
            showPopup("Google Sign-In Notice", err.message, "error");
        }
    }
}

function verifyGoogleMasterPassword() {
    if (!pendingGoogleLoginUser) return;
    const pass = document.getElementById('googleVerifyPassInput').value.trim();
    const expectedPass = pendingGoogleLoginUser.cloudData.masterPassword;

    if (pass !== expectedPass) {
        return showPopup("Incorrect Password", "পাসওয়ার্ড সঠিক নয়! আপনার সঠিক মাস্টার পাসওয়ার্ড দিন।", "error");
    }

    appData = {
        ...appData,
        ...pendingGoogleLoginUser.cloudData,
        masterPassword: expectedPass,
        user: {
            uid: pendingGoogleLoginUser.uid,
            name: pendingGoogleLoginUser.name,
            email: pendingGoogleLoginUser.email,
            photo: pendingGoogleLoginUser.photo
        }
    };
    pendingGoogleLoginUser = null;
    saveData(true);
    updateUserProfileUI();
    document.getElementById('authModal').classList.add('hidden');
    showPopup("Welcome Back!", `সফলভাবে লগইন হয়েছে, ${appData.user.name}!`, "success");
}

// ==================== 3. COMPLETE FINAL REGISTRATION (100% INSTANT & NON-BLOCKING) ====================
async function completeFinalRegistration() {
    const pass = document.getElementById('setupMasterPass').value.trim();
    const confirmPass = document.getElementById('setupMasterConfirm').value.trim();
    const strictRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;

    if (!strictRegex.test(pass)) {
        return showPopup("Weak Password", "পাসওয়ার্ডে কমপক্ষে ৬টি অক্ষর এবং ইংরেজি বর্ণ, সংখ্যা ও বিশেষ চিহ্ন (@,#,$ ইত্যাদি) থাকতে হবে!", "error");
    }
    if (pass !== confirmPass) {
        return showPopup("Password Mismatch", "পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড দুইটি মেলেনি!", "error");
    }

    // Fallback if pendingRegistrationData was lost
    if (!pendingRegistrationData) {
        const currentUser = isFirebaseActive ? firebase.auth().currentUser : null;
        if (currentUser) {
            pendingRegistrationData = {
                method: 'google',
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email.toLowerCase(),
                photo: currentUser.photoURL || `https://ui-avatars.com/api/?name=S&background=00b894&color=fff`
            };
        } else {
            const nameVal = document.getElementById('regNameInput')?.value.trim() || 'Student User';
            const emailVal = document.getElementById('regEmailInput')?.value.trim().toLowerCase() || 'student@hisab.app';
            pendingRegistrationData = {
                method: 'email',
                name: nameVal,
                email: emailVal,
                photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(nameVal)}&background=00b894&color=fff`
            };
        }
    }

    const btn = document.getElementById('confirmRegBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Completing Registration...";
    }

    if (pendingRegistrationData.method === 'email' && isFirebaseActive) {
        try {
            const userCred = await withTimeout(
                firebase.auth().createUserWithEmailAndPassword(pendingRegistrationData.email, pass),
                5000
            );
            pendingRegistrationData.uid = userCred.user.uid;
            userCred.user.updateProfile({ displayName: pendingRegistrationData.name }).catch(() => {});
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                try {
                    const existingCred = await withTimeout(
                        firebase.auth().signInWithEmailAndPassword(pendingRegistrationData.email, pass),
                        4000
                    );
                    pendingRegistrationData.uid = existingCred.user.uid;
                } catch (signInErr) {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerText = "Confirm & Complete Registration ✓";
                    }
                    openAuthModal('login');
                    document.getElementById('loginEmailInput').value = pendingRegistrationData.email;
                    return showPopup("Already Registered!", "এই ইমেইল দিয়ে পূর্বেই অ্যাকাউন্ট খোলা হয়েছে! আপনার পূর্বের পাসওয়ার্ড দিয়ে Login করুন।", "error");
                }
            } else if (err.message === 'TIMEOUT') {
                pendingRegistrationData.uid = 'local_' + pendingRegistrationData.email;
            } else {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "Confirm & Complete Registration ✓";
                }
                return showPopup("Registration Error", err.message, "error");
            }
        }
    } else if (!pendingRegistrationData.uid) {
        pendingRegistrationData.uid = 'local_' + pendingRegistrationData.email;
    }

    // Save locally in account registry
    let accounts = JSON.parse(localStorage.getItem('studentHisabAccounts')) || {};
    accounts[pendingRegistrationData.email] = {
        name: pendingRegistrationData.name,
        email: pendingRegistrationData.email,
        pass: pass
    };
    localStorage.setItem('studentHisabAccounts', JSON.stringify(accounts));

    // Set Master Password & User Profile immediately
    appData.masterPassword = pass;
    appData.user = {
        uid: pendingRegistrationData.uid,
        name: pendingRegistrationData.name,
        email: pendingRegistrationData.email,
        photo: pendingRegistrationData.photo
    };

    pendingRegistrationData = null;
    saveData(true);
    updateUserProfileUI();

    // Immediately close Auth Modal and unlock App!
    document.getElementById('authModal').classList.add('hidden');
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Confirm & Complete Registration ✓";
    }

    // Sync to Firestore in background without blocking the user interface
    pushDataToFirebaseCloud();

    showPopup("Registration Complete!", `অভিনন্দন ${appData.user.name}! আপনার একাউন্ট ও মাস্টার পাসওয়ার্ড সফলভাবে চালু হয়েছে।`, "success");
}

// ==================== 4. DIRECT EMAIL + PASSWORD LOGIN ====================
async function submitDirectEmailLogin() {
    const email = document.getElementById('loginEmailInput').value.trim().toLowerCase();
    const pass = document.getElementById('loginPassInput').value.trim();

    if (!email || !pass) {
        return showPopup("Missing Details", "অনুগ্রহ করে আপনার ইমেইল এবং পাসওয়ার্ড দিন!", "error");
    }

    const loginBtn = document.getElementById('emailLoginSubmitBtn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerText = "Logging in...";
    }

    if (isFirebaseActive) {
        try {
            const userCred = await withTimeout(
                firebase.auth().signInWithEmailAndPassword(email, pass),
                5000
            );
            const u = userCred.user;
            appData.masterPassword = pass;
            appData.user = {
                uid: u.uid,
                name: u.displayName || email.split('@')[0],
                email: u.email,
                photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'Student')}&background=00b894&color=fff`
            };
            await pullDataFromFirebaseCloud(u.uid);
            saveData(true);
            updateUserProfileUI();
            document.getElementById('authModal').classList.add('hidden');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerText = "Login to Account";
            }
            showPopup("Welcome Back!", `Logged in as ${appData.user.name}.`, "success");
            return;
        } catch (err) {
            // Fall through to check local accounts if offline/timeout
        }
    }

    let accounts = JSON.parse(localStorage.getItem('studentHisabAccounts')) || {};
    const acc = accounts[email];
    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerText = "Login to Account";
    }

    if (!acc || acc.pass !== pass) {
        return showPopup("Login Failed", "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়!", "error");
    }

    appData.masterPassword = pass;
    appData.user = {
        uid: 'local_' + email,
        name: acc.name,
        email: acc.email,
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.name)}&background=00b894&color=fff`
    };
    saveData(true);
    updateUserProfileUI();
    document.getElementById('authModal').classList.add('hidden');
    showPopup("Welcome Back!", `Logged in as ${acc.name}.`, "success");
}

// ==================== 5. SIGN OUT & CLOUD SYNC ====================
function triggerSignOut() {
    if (isFirebaseActive && firebase.auth().currentUser) {
        firebase.auth().signOut().catch(() => {});
    }
    appData.user = null;
    saveData(true);
    updateUserProfileUI();
    openAuthModal('login');
}

function handleAccountButtonAction() {
    if (appData.user) {
        triggerSignOut();
    } else {
        openAuthModal('register');
    }
}

async function syncUpdatedPasswordToCloud(newPass) {
    if (!isFirebaseActive) return;
    try {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            currentUser.updatePassword(newPass).catch(() => {});
        }
        pushDataToFirebaseCloud();
    } catch (e) {
        console.warn("Password cloud sync notice:", e);
    }
}

function pushDataToFirebaseCloud() {
    if (!isFirebaseActive || !appData.user || !appData.user.uid) return;
    try {
        firebase.firestore().collection('students').doc(appData.user.uid).set(appData).catch(() => {});
    } catch (e) {
        console.warn("Cloud push error:", e);
    }
}

async function pullDataFromFirebaseCloud(uid) {
    if (!isFirebaseActive || !uid) return;
    try {
        const doc = await withTimeout(
            firebase.firestore().collection('students').doc(uid).get(),
            3000
        );
        if (doc && doc.exists) {
            const cloudData = doc.data();
            appData = { ...appData, ...cloudData, user: appData.user };
            saveData(true);
        }
    } catch (e) {
        console.warn("Cloud pull skipped:", e);
    }
}

function updateUserProfileUI() {
    const guestBtn = document.getElementById('guestAuthBtn');
    const profileBox = document.getElementById('loggedInProfile');
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const btnEl = document.getElementById('googleAuthActionBtn');
    const statusText = document.getElementById('accountStatusText');

    if (appData.user && appData.masterPassword) {
        if (guestBtn) guestBtn.classList.add('hidden');
        if (profileBox) profileBox.classList.remove('hidden');

        nameEl.innerText = appData.user.name;
        avatarEl.src = appData.user.photo;

        if (btnEl) {
            btnEl.innerHTML = `<i class="ri-logout-box-r-line"></i> Sign Out (${appData.user.email})`;
            btnEl.className = "btn btn-expense";
        }
        if (statusText) {
            statusText.innerHTML = `Signed in as <b>${appData.user.name}</b> (${appData.user.email}).`;
        }
        document.getElementById('authModal').classList.add('hidden');
    } else {
        if (guestBtn) guestBtn.classList.remove('hidden');
        if (profileBox) profileBox.classList.add('hidden');
        openAuthModal('register');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    updateUserProfileUI();
});