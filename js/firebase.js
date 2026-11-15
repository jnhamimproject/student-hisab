// ==================== 6. FIREBASE & 2-STEP MASTER PASSWORD AUTH MODULE (FIXED) ====================

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
let isAuthProcessing = false; // Prevents double-tap duplicate errors

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
        modalTitle.innerText = 'Student Registration';
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
    document.getElementById('authTabBar').classList.add('hidden');
    document.getElementById('authStepRegister').classList.add('hidden');
    document.getElementById('authStepLogin').classList.add('hidden');
    document.getElementById('authStepVerifyGooglePass').classList.add('hidden');
    document.getElementById('authStepSetPassword').classList.remove('hidden');
    document.getElementById('authModalTitle').innerText = 'Set Master Password';
    document.getElementById('setupMasterPass').value = '';
    document.getElementById('setupMasterConfirm').value = '';
}

// ==================== 2. GOOGLE FLOW (REGISTER OR LOGIN) ====================
async function startGoogleAuthFlow(flowType) {
    if (isAuthProcessing) return;
    if (!isFirebaseActive) {
        return showPopup("Firebase Required", "Google Sign-In requires an active internet connection.", "error");
    }

    try {
        isAuthProcessing = true;
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await firebase.auth().signInWithPopup(provider);
        const u = result.user;
        isAuthProcessing = false;

        let existingCloudDoc = null;
        try {
            const docSnap = await firebase.firestore().collection('students').doc(u.uid).get();
            if (docSnap.exists) existingCloudDoc = docSnap.data();
        } catch (dbErr) {
            console.warn("Firestore read notice:", dbErr);
        }

        if (existingCloudDoc && existingCloudDoc.masterPassword) {
            pendingGoogleLoginUser = {
                uid: u.uid,
                name: u.displayName || existingCloudDoc.user?.name || 'Student User',
                email: u.email,
                photo: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'S')}&background=00b894&color=fff`,
                cloudData: existingCloudDoc
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
                email: u.email,
                photo: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'S')}&background=00b894&color=fff`
            };
            showPasswordSetupScreen();
        }
    } catch (err) {
        isAuthProcessing = false;
        if (err.code === 'auth/unauthorized-domain') {
            showPopup("Domain Lock Notice", "Firebase Console -> Authentication -> Settings -> Authorized domains-এ গিয়ে jnhamimproject.github.io ডোমেইনটি Add করুন।", "error");
        } else {
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
    closeModal('authModal');
    showPopup("Welcome Back!", `সফলভাবে লগইন হয়েছে, ${appData.user.name}!`, "success");
}

// ==================== 3. COMPLETE FINAL REGISTRATION (SMART RECOVERY + LOCK) ====================
async function completeFinalRegistration() {
    if (!pendingRegistrationData || isAuthProcessing) return;

    const pass = document.getElementById('setupMasterPass').value.trim();
    const confirmPass = document.getElementById('setupMasterConfirm').value.trim();
    const strictRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;

    if (!strictRegex.test(pass)) {
        return showPopup("Weak Password", "পাসওয়ার্ডে কমপক্ষে ৬টি অক্ষর এবং ইংরেজি বর্ণ, সংখ্যা ও বিশেষ চিহ্ন (@,#,$ ইত্যাদি) থাকতে হবে!", "error");
    }
    if (pass !== confirmPass) {
        return showPopup("Password Mismatch", "পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড দুইটি মেলেনি!", "error");
    }

    isAuthProcessing = true;

    if (pendingRegistrationData.method === 'email') {
        if (isFirebaseActive) {
            try {
                // Try creating new account
                const userCred = await firebase.auth().createUserWithEmailAndPassword(pendingRegistrationData.email, pass);
                await userCred.user.updateProfile({ displayName: pendingRegistrationData.name }).catch(() => {});
                pendingRegistrationData.uid = userCred.user.uid;
            } catch (err) {
                // Smart Recovery: If already created (e.g., from previous tap), try signing in with the same password
                if (err.code === 'auth/email-already-in-use') {
                    try {
                        const existingCred = await firebase.auth().signInWithEmailAndPassword(pendingRegistrationData.email, pass);
                        pendingRegistrationData.uid = existingCred.user.uid;
                    } catch (signInErr) {
                        isAuthProcessing = false;
                        openAuthModal('login');
                        document.getElementById('loginEmailInput').value = pendingRegistrationData.email;
                        return showPopup("Already Registered!", "এই ইমেইল দিয়ে পূর্বেই অ্যাকাউন্ট খোলা হয়েছে! অনুগ্রহ করে আপনার পূর্বের পাসওয়ার্ড দিয়ে Login করুন।", "error");
                    }
                } else {
                    isAuthProcessing = false;
                    return showPopup("Registration Error", err.message, "error");
                }
            }
        } else {
            pendingRegistrationData.uid = 'local_' + pendingRegistrationData.email;
        }
    }

    // Save locally in fallback registry
    let accounts = JSON.parse(localStorage.getItem('studentHisabAccounts')) || {};
    accounts[pendingRegistrationData.email] = {
        name: pendingRegistrationData.name,
        email: pendingRegistrationData.email,
        pass: pass
    };
    localStorage.setItem('studentHisabAccounts', JSON.stringify(accounts));

    appData.masterPassword = pass;
    appData.user = {
        uid: pendingRegistrationData.uid,
        name: pendingRegistrationData.name,
        email: pendingRegistrationData.email,
        photo: pendingRegistrationData.photo
    };

    await pushDataToFirebaseCloud();
    pendingRegistrationData = null;
    isAuthProcessing = false;
    saveData(true);
    updateUserProfileUI();
    closeModal('authModal');
    showPopup("Registration Complete!", `অভিনন্দন ${appData.user.name}! আপনার একাউন্ট ও মাস্টার পাসওয়ার্ড সফলভাবে চালু হয়েছে।`, "success");
}

// ==================== 4. DIRECT EMAIL + PASSWORD LOGIN ====================
async function submitDirectEmailLogin() {
    if (isAuthProcessing) return;
    const email = document.getElementById('loginEmailInput').value.trim().toLowerCase();
    const pass = document.getElementById('loginPassInput').value.trim();

    if (!email || !pass) {
        return showPopup("Missing Details", "অনুগ্রহ করে আপনার ইমেইল এবং পাসওয়ার্ড দিন!", "error");
    }

    isAuthProcessing = true;

    if (isFirebaseActive) {
        try {
            const userCred = await firebase.auth().signInWithEmailAndPassword(email, pass);
            const u = userCred.user;
            appData.masterPassword = pass;
            appData.user = {
                uid: u.uid,
                name: u.displayName || email.split('@')[0],
                email: u.email,
                photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || 'Student')}&background=00b894&color=fff`
            };
            await pullDataFromFirebaseCloud(u.uid);
            isAuthProcessing = false;
            saveData(true);
            updateUserProfileUI();
            closeModal('authModal');
            showPopup("Welcome Back!", `Logged in as ${appData.user.name}.`, "success");
            return;
        } catch (err) {
            isAuthProcessing = false;
            return showPopup("Login Failed", "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়!", "error");
        }
    }

    let accounts = JSON.parse(localStorage.getItem('studentHisabAccounts')) || {};
    const acc = accounts[email];
    isAuthProcessing = false;

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
    closeModal('authModal');
    showPopup("Welcome Back!", `Logged in as ${acc.name}.`, "success");
}

// ==================== 5. SIGN OUT & CLOUD SYNC ====================
function triggerSignOut() {
    if (isFirebaseActive && firebase.auth().currentUser) {
        firebase.auth().signOut();
    }
    appData.user = null;
    saveData(true);
    updateUserProfileUI();
    showPopup("Signed Out", "আপনি সফলভাবে লগআউট করেছেন।", "success");
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
            await currentUser.updatePassword(newPass).catch(() => {});
        }
        await pushDataToFirebaseCloud();
    } catch (e) {
        console.warn("Password cloud sync notice:", e);
    }
}

async function pushDataToFirebaseCloud() {
    if (!isFirebaseActive || !appData.user || !appData.user.uid) return;
    try {
        await firebase.firestore().collection('students').doc(appData.user.uid).set(appData);
    } catch (e) {
        console.warn("Cloud push error:", e);
    }
}

async function pullDataFromFirebaseCloud(uid) {
    if (!isFirebaseActive || !uid) return;
    try {
        const doc = await firebase.firestore().collection('students').doc(uid).get();
        if (doc.exists) {
            const cloudData = doc.data();
            appData = { ...appData, ...cloudData, user: appData.user };
            saveData(true);
        }
    } catch (e) {
        console.warn("Cloud pull error:", e);
    }
}

function updateUserProfileUI() {
    const guestBtn = document.getElementById('guestAuthBtn');
    const profileBox = document.getElementById('loggedInProfile');
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const btnEl = document.getElementById('googleAuthActionBtn');
    const statusText = document.getElementById('accountStatusText');

    if (appData.user) {
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
    } else {
        if (guestBtn) guestBtn.classList.remove('hidden');
        if (profileBox) profileBox.classList.add('hidden');

        if (btnEl) {
            btnEl.innerHTML = `<i class="ri-user-add-line"></i> Login / Register Account`;
            btnEl.className = "btn btn-transfer";
        }
        if (statusText) {
            statusText.innerText = "Login or register to sync your financial records securely.";
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    updateUserProfileUI();
    if (!appData.user) {
        setTimeout(() => { openAuthModal('register'); }, 400);
    }
});