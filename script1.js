document.addEventListener('DOMContentLoaded', () => {
    // Konfigurasi API
    const API_URL = 'https://hanxtools.byethost7.com/api.php';
    const API_KEY = '1234567890abcdef'; // Harus sama dengan di api.php

    // Time limits based on user roles
    const TIME_LIMITS = {
        free: {
            sessionLimit: 2 * 60 * 1000, // 2 minutes
            cooldownPeriod: 1 * 60 * 1000 // 1 minute
        },
        vip: {
            sessionLimit: 10 * 60 * 1000, // 10 minutes
            cooldownPeriod: 30 * 1000 // 30 seconds
        },
        owner: {
            sessionLimit: 999 * 60 * 1000, // 999 minutes
            cooldownPeriod: 1 * 1000 // 1 second
        }
    };
    
    const MAX_ACCOUNTS_PER_DEVICE = 4;

    // Fungsi untuk memuat data user dari API
    async function fetchUsers() {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'X-API-Key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Pastikan struktur data sesuai
            if (!data.users) {
                return { users: [], accountRegistry: { deviceLimits: {} } };
            }
            
            // Inisialisasi accountRegistry jika belum ada
            if (!data.accountRegistry) {
                data.accountRegistry = { deviceLimits: {} };
            }
            
            return data;
        } catch (error) {
            console.error("Error fetching users:", error);
            return { users: [], accountRegistry: { deviceLimits: {} } };
        }
    }

    // Fungsi untuk menyimpan data user ke API
    async function updateUsers(usersData) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(usersData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("Error updating users:", error);
            throw error;
        }
    }

    // Fungsi untuk mendapatkan device ID unik
    function getUniqueDeviceId() {
        let deviceId = localStorage.getItem('uniqueDeviceId');
        
        if (!deviceId) {
            const randomPart = Math.random().toString(36).substring(2, 15);
            const timePart = Date.now().toString(36);
            const fpPart = generateFingerprint();
            
            deviceId = `${randomPart}-${timePart}-${fpPart}`;
            localStorage.setItem('uniqueDeviceId', deviceId);
        }
        
        return deviceId;
    }

    // Fungsi untuk generate browser fingerprint
    function generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const text = 'Browser Fingerprint';
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText(text, 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText(text, 4, 17);
        
        const dataURL = canvas.toDataURL();
        let hash = 0;
        for (let i = 0; i < dataURL.length; i++) {
            hash = ((hash << 5) - hash) + dataURL.charCodeAt(i);
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(36).substring(0, 8);
    }

    // Fungsi untuk verifikasi sesi
    async function verifySessionValidity() {
        const username = getCookie("currentUser");
        if (!username) return false;
        
        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (!user) return false;
            
            const currentTime = Date.now();
            
            if (currentTime > (user.sessionData?.expiresAt || 0)) {
                return false;
            }
            
            return true;
        } catch (error) {
            console.error("Session validation error:", error);
            return false;
        }
    }

    // Fungsi untuk mendapatkan cookie
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Fungsi untuk setup form login/register
    function setupLoginForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const loginError = document.getElementById('loginError');
        const registerError = document.getElementById('registerError');
        const registerSuccess = document.getElementById('registerSuccess');

        // Handler untuk registrasi
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages();

            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;

            if (!username || !password) {
                return showError(registerError, "Harap isi semua field");
            }
            if (password !== confirmPassword) {
                return showError(registerError, "Password tidak cocok");
            }

            try {
                const deviceId = getUniqueDeviceId();
                const usersData = await fetchUsers();
                
                // Cek username sudah ada
                if (usersData.users.some(user => user.username === username)) {
                    return showError(registerError, "Username sudah terdaftar");
                }
                
                // Inisialisasi accountRegistry jika belum ada
                if (!usersData.accountRegistry) {
                    usersData.accountRegistry = { deviceLimits: {} };
                }
                
                // Inisialisasi device entry
                if (!usersData.accountRegistry.deviceLimits[deviceId]) {
                    usersData.accountRegistry.deviceLimits[deviceId] = {
                        accountCount: 0,
                        lastCreationTime: Date.now(),
                        accounts: []
                    };
                }
                
                const deviceRegistry = usersData.accountRegistry.deviceLimits[deviceId];
                const actualDeviceAccounts = usersData.users.filter(user => 
                    user.deviceIdentifier === deviceId
                );
                deviceRegistry.accountCount = actualDeviceAccounts.length;
                
                // Cek batas akun per device
                if (deviceRegistry.accountCount >= MAX_ACCOUNTS_PER_DEVICE) {
                    return showError(registerError, 
                        `Maksimal ${MAX_ACCOUNTS_PER_DEVICE} akun per perangkat`);
                }

                // Buat user baru
                const newUser = {
                    username,
                    password: btoa(password), // Encode base64 sederhana
                    deviceIdentifier: deviceId,
                    creationTime: Date.now(),
                    role: 'free',
                    sessionData: {
                        expiresAt: 0,
                        lastActivity: 0,
                        sessionStartTime: 0,
                        limitMessageShown: false
                    }
                };
                
                usersData.users.push(newUser);
                deviceRegistry.accountCount++;
                deviceRegistry.lastCreationTime = Date.now();
                deviceRegistry.accounts.push(username);
                
                await updateUsers(usersData);
                showSuccess(registerSuccess, "Registrasi berhasil! Silakan login.");
                registerForm.reset();
                
                setTimeout(() => {
                    document.querySelector('[data-tab="login"]').click();
                }, 2000);

            } catch (error) {
                console.error("Registration error:", error);
                showError(registerError, "Registrasi gagal. Silakan coba lagi.");
            }
        });

        // Handler untuk login
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages();

            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                return showError(loginError, "Harap isi semua field");
            }

            try {
                const usersData = await fetchUsers();
                const user = usersData.users.find(u => u.username === username);
                
                if (!user || btoa(password) !== user.password) {
                    return showError(loginError, "Username atau password salah");
                }

                const currentTime = Date.now();
                const userLimits = TIME_LIMITS[user.role] || TIME_LIMITS.free;
                
                // Periksa status sesi
                if (user.sessionData.expiresAt > 0 && currentTime < user.sessionData.expiresAt) {
                    // Sesi aktif - perbarui dan lanjutkan
                    user.sessionData.lastActivity = currentTime;
                    await updateUsers(usersData);
                    
                    document.cookie = `currentUser=${username}; path=/; SameSite=Lax`;
                    window.location.href = "next1.html";
                } else if (user.sessionData.expiresAt > 0 && currentTime < user.sessionData.expiresAt + userLimits.cooldownPeriod) {
                    // Dalam masa cooldown
                    const cooldownTimeSeconds = Math.ceil(userLimits.cooldownPeriod / 1000);
                    return showError(loginError, `Tunggu ${cooldownTimeSeconds} detik untuk reset limit`);
                } else {
                    // Buat sesi baru
                    user.sessionData.limitMessageShown = false;
                    user.sessionData.lastActivity = currentTime;
                    user.sessionData.sessionStartTime = currentTime;
                    user.sessionData.expiresAt = currentTime + userLimits.sessionLimit;
                    await updateUsers(usersData);
                    
                    document.cookie = `currentUser=${username}; path=/; SameSite=Lax`;
                    window.location.href = "next1.html";
                }

            } catch (error) {
                console.error("Login error:", error);
                showError(loginError, "Login gagal. Silakan coba lagi.");
            }
        });

        // Fungsi bantuan
        function showError(element, message) {
            element.textContent = message;
            element.style.display = 'block';
        }

        function showSuccess(element, message) {
            element.textContent = message;
            element.style.display = 'block';
        }

        function clearMessages() {
            if (loginError) loginError.textContent = '';
            if (registerError) registerError.textContent = '';
            if (registerSuccess) registerSuccess.textContent = '';
        }
    }

    // Fungsi untuk setup halaman setelah login
    function setupNext1Page() {
        const currentUser = getCookie("currentUser");
        
        if (!currentUser) {
            window.location.replace("index.html");
            return;
        }

        // Periksa sesi setiap 5 detik
        setInterval(checkSession, 5000);
        
        // Tampilkan info user
        displayUserInfo();

        // Tambahkan tombol logout
        addLogoutButton();
    }

    // Fungsi untuk mengecek sesi
    async function checkSession() {
        const username = getCookie("currentUser");
        if (!username) return;
        
        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (!user) {
                sessionExpiredRedirect();
                return;
            }
            
            const currentTime = Date.now();
            
            if (currentTime > user.sessionData.expiresAt) {
                if (!user.sessionData.limitMessageShown) {
                    user.sessionData.limitMessageShown = true;
                    await updateUsers(usersData);
                }
                
                sessionExpiredRedirect();
            } else {
                // Perbarui aktivitas terakhir
                user.sessionData.lastActivity = currentTime;
                await updateUsers(usersData);
            }
        } catch (error) {
            console.error("Session check error:", error);
        }
    }

    // Fungsi untuk redirect saat sesi habis
    function sessionExpiredRedirect() {
        sessionStorage.setItem('sessionExpired', 'true');
        document.cookie = "currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        alert("Waktu anda telah habis. Anda akan dialihkan ke halaman login.");
        window.location.replace("index.html");
    }

    // Fungsi untuk menampilkan info user
    async function displayUserInfo() {
        const username = getCookie("currentUser");
        if (!username) return;
        
        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (user) {
                let userInfoEl = document.getElementById('userInfo');
                if (!userInfoEl) {
                    userInfoEl = document.createElement('div');
                    userInfoEl.id = 'userInfo';
                    userInfoEl.style.cssText = `
                        position: fixed;
                        top: 10px;
                        left: 10px;
                        padding: 10px;
                        background: rgba(0,0,0,0.8);
                        color: white;
                        border-radius: 5px;
                        font-family: Arial, sans-serif;
                        z-index: 10000;
                    `;
                    document.body.appendChild(userInfoEl);
                }
                
                const role = user.role || 'free';
                const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
                userInfoEl.textContent = `User: ${username} - Role: ${roleCapitalized}`;
            }
        } catch (error) {
            console.error("Error displaying user info:", error);
        }
    }

    // Fungsi untuk menambahkan tombol logout
    function addLogoutButton() {
        const logoutContainer = document.createElement('div');
        logoutContainer.style.cssText = `
            width: 100%;
            position: fixed;
            bottom: 20px;
            left: 0;
            display: flex;
            justify-content: center;
            z-index: 10000;
        `;
        
        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.style.cssText = `
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        `;
        
        logoutButton.addEventListener('click', () => {
            document.cookie = "currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = "index.html";
        });
        
        logoutContainer.appendChild(logoutButton);
        document.body.appendChild(logoutContainer);
    }

    // Deteksi halaman dan jalankan setup yang sesuai
    const isIndexPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname === '/' || 
                        window.location.pathname.endsWith('/');
    
    const isNextPage = window.location.pathname.includes('next1.html');

    if (isIndexPage) {
        const quickCheck = getCookie("currentUser");
        if (quickCheck) {
            verifySessionValidity().then(isValid => {
                if (isValid) {
                    window.location.href = "next1.html";
                } else {
                    document.cookie = "currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                }
                if (!isValid) setupLoginForms();
            }).catch(() => setupLoginForms());
        } else {
            setupLoginForms();
        }
    } else if (isNextPage) {
        verifySessionValidity().then(isValid => {
            if (!isValid) {
                sessionExpiredRedirect();
            } else {
                setupNext1Page();
            }
        }).catch(() => sessionExpiredRedirect());
    }
});
