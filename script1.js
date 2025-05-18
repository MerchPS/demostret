document.addEventListener('DOMContentLoaded', () => {
    // JSONBin.io configuration
    const API_KEY = "$2a$10$9kHgztOh.ilOXFRyT1yKDeAOzehtWhzDjvlljalagFGpJkisFEcV6";
    const ACCESS_KEY = "$2a$10$8uNP9HMoovTq15LIREAxU.DpP78ZU.YdxjYUfUDeHkV2ZWFYWBdTu";
    const API_URL = "https://generich.my.id/api.php";

    // Time limits based on user roles
    const TIME_LIMITS = {
        free: {
            sessionLimit: 2 * 60 * 1000, // 2 minutes
            cooldownPeriod: 1 * 60 * 1000 // 1 minute
        },
        vip: { // Changed from "premium" to "vip"
            sessionLimit: 10 * 60 * 1000, // 10 minutes
            cooldownPeriod: 30 * 1000 // 30 seconds
        },
        owner: {
            sessionLimit: 999 * 60 * 1000, // 999 minutes (nearly infinite)
            cooldownPeriod: 1 * 1000 // 1 second reset limit
        }
    };
    
    const MAX_ACCOUNTS_PER_DEVICE = 4;

    // Initial fast load - minimal setup
    const isIndexPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname === '/' || 
                        window.location.pathname.endsWith('/');
    
    const isNextPage = window.location.pathname.includes('next1.html');
    
    const isAdminPage = window.location.pathname.includes('sisnejwjwjw.html');

    // Get unique device identifier - improved version
    function getUniqueDeviceId() {
        let deviceId = localStorage.getItem('uniqueDeviceId');
        
        if (!deviceId) {
            // Generate a truly unique ID using multiple factors
            const randomPart = Math.random().toString(36).substring(2, 15);
            const timePart = Date.now().toString(36);
            const fpPart = generateFingerprint();
            
            deviceId = `${randomPart}-${timePart}-${fpPart}`;
            localStorage.setItem('uniqueDeviceId', deviceId);
        }
        
        return deviceId;
    }

    // Generate browser fingerprint for additional uniqueness
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
        // Generate hash from canvas data
        let hash = 0;
        for (let i = 0; i < dataURL.length; i++) {
            hash = ((hash << 5) - hash) + dataURL.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(36).substring(0, 8);
    }

    // Check session validity immediately - do this before any other checks
    // This prevents back button exploitation
    if (isNextPage) {
        // Immediately verify session validity before proceeding with any other code
        verifySessionValidity().then(isValid => {
            if (!isValid) {
                // Store session expired flag and redirect
                sessionStorage.setItem('sessionExpired', 'true');
                window.location.replace("index.html");
                return;
            } else {
                // Session is valid, continue with setup
                setupNext1Page();
            }
        }).catch(error => {
            console.error("Session verification error:", error);
            // On any error, redirect to be safe
            window.location.replace("index.html");
        });
    }
    
    // Check for admin page access
    if (isAdminPage) {
        verifySessionValidity().then(isValid => {
            if (!isValid) {
                // Store session expired flag and redirect
                sessionStorage.setItem('sessionExpired', 'true');
                window.location.replace("index.html");
                return;
            }
            
            verifyAdminAccess().then(isAdmin => {
                if (!isAdmin) {
                    // Redirect non-admin users
                    alert("Akses ditolak! Anda tidak memiliki hak akses admin.");
                    window.location.replace("index.html");
                    return;
                }
                // Admin is valid, continue with admin page setup
                setupAdminPage();
            }).catch(error => {
                console.error("Admin verification error:", error);
                window.location.replace("index.html");
            });
        }).catch(error => {
            console.error("Session verification error:", error);
            window.location.replace("index.html");
        });
    }

    // Fast startup function for index.html
    if (isIndexPage) {
        // Check if redirected due to expired session
        const sessionExpired = sessionStorage.getItem('sessionExpired');
        if (sessionExpired === 'true') {
            // Clear the flag
            sessionStorage.removeItem('sessionExpired');
            // Display alert after a slight delay to ensure it shows after page load
            setTimeout(() => {
                alert("Waktu anda telah habis. Silakan login kembali.");
            }, 100);
        }
        
        const quickCheck = getCookie("currentUser");
        if (quickCheck) {
            // Don't auto-redirect - verify session first
            verifySessionValidity().then(isValid => {
                if (isValid) {
                    window.location.href = "next1.html";
                } else {
                    // Clear cookie since session is invalid
                    document.cookie = "currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                }
                // Setup forms if we're staying on this page
                if (!isValid) setupLoginForms();
            }).catch(error => {
                console.error("Quick session check error:", error);
                // Setup forms anyway on error
                setupLoginForms();
            });
        } else {
            // No user cookie, just setup forms
            setupLoginForms();
        }
    }
    
    // Verify if the current session is valid
    async function verifySessionValidity() {
        const username = getCookie("currentUser");
        if (!username) return false;
        
        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (!user) return false;
            
            const currentTime = Date.now();
            
            // Check if session has expired
            if (currentTime > user.sessionData.expiresAt) {
                return false;
            }
            
            // Session is valid
            return true;
        } catch (error) {
            console.error("Session validation error:", error);
            return false;
        }
    }
    
    // Verify if the current user has admin access (owner role)
    async function verifyAdminAccess() {
        const username = getCookie("currentUser");
        if (!username) return false;
        
        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (!user) return false;
            
            // Check if user has owner role
            if (user.role !== 'owner') {
                return false;
            }
            
            // Admin is valid
            return true;
        } catch (error) {
            console.error("Admin validation error:", error);
            return false;
        }
    }

    // Setup admin page
    function setupAdminPage() {
        const currentUser = getCookie("currentUser");
        
        if (!currentUser) {
            window.location.replace("index.html");
            return;
        }

        // Initialize session monitoring
        checkSession();
        
        // Session check every 5 seconds
        setInterval(checkSession, 5000);
        
        // Initialize custom cursor
        requestAnimationFrame(() => setupCustomCursor());
        
        // Display user role information
        displayUserInfo();

        // Block browser back behavior when session expired
        window.addEventListener('popstate', async (e) => {
            const isValid = await verifySessionValidity();
            if (!isValid) {
                // Prevent navigation and redirect to index
                sessionExpiredRedirect();
            }
        });

        // Disable back/forward cache for session pages
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                // Page was restored from back/forward cache
                // Force session check
                checkSession();
            }
        });
        
        // Add logout button
        addLogoutButton();
    }

    // Setup login and registration forms
    function setupLoginForms() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const forms = document.querySelectorAll('.form');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const adminForm = document.getElementById('adminForm');
        const redeemForm = document.getElementById('redeemForm');  // Add redeem form
        const loginError = document.getElementById('loginError');
        const registerError = document.getElementById('registerError');
        const adminError = document.getElementById('adminError');
        const redeemError = document.getElementById('redeemError');  // Add redeem error
        const registerSuccess = document.getElementById('registerSuccess');
        const redeemSuccess = document.getElementById('redeemSuccess');  // Add redeem success

        // Initialize custom cursor
        requestAnimationFrame(() => setupCustomCursor());

        // Tab switching
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                forms.forEach(form => {
                    form.classList.remove('active');
                    if (form.id === `${tabId}Form`) form.classList.add('active');
                });
                clearMessages();
            });
        });

        // Redeem code handler
        if (redeemForm) {
            redeemForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessages();

                const username = document.getElementById('redeemUsername').value.trim();
                const redeemCode = document.getElementById('redeemCode').value.trim();

                if (!username || !redeemCode) {
                    return showError(redeemError, "Please fill in all fields");
                }

                try {
                    const usersData = await fetchUsers();
                    const user = usersData.users.find(u => u.username === username);
                    
                    if (!user) {
                        return showError(redeemError, "Username not found");
                    }
                    
                    // Check if redeemCodes array exists, if not create it
                    if (!usersData.redeemCodes) {
                        usersData.redeemCodes = [];
                    }
                    
                    // Find the redeem code
                    const codeData = usersData.redeemCodes.find(c => 
                        c.code === redeemCode && 
                        !c.isUsed && 
                        Date.now() < c.expiryTime
                    );
                    
                    if (!codeData) {
                        return showError(redeemError, "Invalid or expired redeem code");
                    }
                    
                    // Check if it's a single-use code and already used by this user
                    if (codeData.singleUse && codeData.usedBy && codeData.usedBy.includes(username)) {
                        return showError(redeemError, "You have already used this code");
                    }
                    
                    // Add time to the user's session
                    const currentTime = Date.now();
                    
                    // If session is active, add time to current session
                    if (user.sessionData.expiresAt > currentTime) {
                        user.sessionData.expiresAt += codeData.additionalTimeMs;
                    } else {
                        // If session is expired, create a new session with the additional time
                        const userLimits = TIME_LIMITS[user.role] || TIME_LIMITS.free;
                        user.sessionData.sessionStartTime = currentTime;
                        user.sessionData.lastActivity = currentTime;
                        user.sessionData.limitMessageShown = false;
                        user.sessionData.expiresAt = currentTime + userLimits.sessionLimit + codeData.additionalTimeMs;
                    }
                    
                    // Update code usage
                    if (codeData.singleUse) {
                        codeData.isUsed = true;
                    }
                    
                    // Record user who used this code
                    if (!codeData.usedBy) {
                        codeData.usedBy = [];
                    }
                    codeData.usedBy.push(username);
                    
                    // Save updates
                    await updateUsers(usersData);
                    
                    // Show success message with time added
                    const minutesAdded = Math.floor(codeData.additionalTimeMs / 60000);
                    showSuccess(redeemSuccess, `Success! Added ${minutesAdded} minutes to your session time.`);
                    redeemForm.reset();
                    
                } catch (error) {
                    console.error("Redeem code error:", error);
                    showError(redeemError, "Error processing redeem code. Please try again later.");
                }
            });
        }

        // Admin login handler
        if (adminForm) {
            adminForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessages();

                const username = document.getElementById('adminUsername').value.trim();
                const password = document.getElementById('adminPassword').value;

                if (!username || !password) {
                    return showError(adminError, "Please fill in all fields");
                }

                try {
                    const usersData = await fetchUsers();
                    const user = usersData.users.find(u => u.username === username);
                    
                    if (!user || btoa(password) !== user.password) {
                        return showError(adminError, "Invalid username or password");
                    }
                    
                    // Check if user has owner role
                    if (user.role !== 'owner') {
                        return showError(adminError, "Failed login, kamu bukan owner idiot");
                    }
                    
                    // Set current user cookie for session validation
                    document.cookie = `currentUser=${username}; path=/; SameSite=Lax`;
                    
                    // Initialize session data for admin user
                    const currentTime = Date.now();
                    const userLimits = TIME_LIMITS[user.role] || TIME_LIMITS.owner;
                    user.sessionData.lastActivity = currentTime;
                    user.sessionData.sessionStartTime = currentTime;
                    user.sessionData.limitMessageShown = false;
                    user.sessionData.expiresAt = currentTime + userLimits.sessionLimit;
                    await updateUsers(usersData);
                    
                    window.location.href = "sisnejwjwjw.html";
                } catch (error) {
                    console.error("Admin login error:", error);
                    showError(adminError, "Login failed. Please try again later.");
                }
            });
        }

        // Registration handler
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages();

            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;

            if (!username || !password) {
                return showError(registerError, "Please fill in all fields");
            }
            if (password !== confirmPassword) {
                return showError(registerError, "Passwords do not match");
            }

            try {
                const deviceId = getUniqueDeviceId();
                const usersData = await fetchUsers();
                
                // Check if username already exists
                if (usersData.users.some(user => user.username === username)) {
                    return showError(registerError, "Username already exists");
                }
                
                // Initialize accountRegistry if it doesn't exist
                if (!usersData.accountRegistry) {
                    usersData.accountRegistry = {
                        deviceLimits: {}
                    };
                }
                
                // Initialize device entry in registry
                if (!usersData.accountRegistry.deviceLimits[deviceId]) {
                    usersData.accountRegistry.deviceLimits[deviceId] = {
                        accountCount: 0,
                        lastCreationTime: Date.now(),
                        accounts: []
                    };
                }
                
                const deviceRegistry = usersData.accountRegistry.deviceLimits[deviceId];
                
                // Update account count based on actual users in database
                const actualDeviceAccounts = usersData.users.filter(user => 
                    user.deviceIdentifier === deviceId
                );
                deviceRegistry.accountCount = actualDeviceAccounts.length;
                
                // Check device account limit
                if (deviceRegistry.accountCount >= MAX_ACCOUNTS_PER_DEVICE) {
                    return showError(registerError, 
                        `Maaf, Anda telah mencapai batas maksimal ${MAX_ACCOUNTS_PER_DEVICE} akun per perangkat.`);
                }

                // Create new user with role
                const newUser = {
                    username,
                    password: btoa(password),
                    deviceIdentifier: deviceId,
                    creationTime: Date.now(),
                    role: 'free', // Default role is free
                    sessionData: {
                        expiresAt: 0,
                        lastActivity: 0,
                        sessionStartTime: 0,
                        limitMessageShown: false
                    }
                };
                
                // Add new user to users array
                usersData.users.push(newUser);
                
                // Update device registry
                deviceRegistry.accountCount++;
                deviceRegistry.lastCreationTime = Date.now();
                deviceRegistry.accounts.push(username);
                
                // Make sure the registry is properly updated
                usersData.accountRegistry.deviceLimits[deviceId] = deviceRegistry;
                
                await updateUsers(usersData);
                showSuccess(registerSuccess, "Registration successful! You can now login.");
                registerForm.reset();
                
                // Auto-switch to login tab
                setTimeout(() => {
                    document.querySelector('[data-tab="login"]').click();
                }, 2000);

            } catch (error) {
                console.error("Registration error:", error);
                showError(registerError, "Registration failed. Please try again later.");
            }
        });

        // Login handler
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessages();

            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                return showError(loginError, "Please fill in all fields");
            }

            try {
                const usersData = await fetchUsers();
                const user = usersData.users.find(u => u.username === username);
                
                if (!user || btoa(password) !== user.password) {
                    return showError(loginError, "Invalid username or password");
                }

                // Ensure the user has a role defined
                if (!user.role) {
                    user.role = 'free'; // Default to free if not set
                }
                
                // Update any "premium" roles to "vip"
                if (user.role === 'premium') {
                    user.role = 'vip';
                }

                const currentTime = Date.now();
                const userLimits = TIME_LIMITS[user.role] || TIME_LIMITS.free;
                
                // Check session status
                if (user.sessionData.expiresAt > 0 && currentTime < user.sessionData.expiresAt) {
                    // Active session - update and proceed
                    user.sessionData.lastActivity = currentTime;
                    await updateUsers(usersData);
                    
                    document.cookie = `currentUser=${username}; path=/; SameSite=Lax`;
                    window.location.href = "next1.html";
                } else if (user.sessionData.expiresAt > 0 && currentTime < user.sessionData.expiresAt + userLimits.cooldownPeriod) {
                    // In cooldown period
                    const cooldownTimeSeconds = Math.ceil(userLimits.cooldownPeriod / 1000);
                    return showError(loginError, `Limit telah habis. Tunggu ${cooldownTimeSeconds} detik untuk reset limit anda. Atau hubungi owner jika ingin beli bisa pencet icon whatsapp di pojok kanan bawah`);
                } else {
                    // Create new session
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
                showError(loginError, "Login failed. Please try again later.");
            }
        });

        // Utility functions
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
            if (adminError) adminError.textContent = '';
            if (redeemError) redeemError.textContent = '';
            if (redeemSuccess) redeemSuccess.textContent = '';
        }
    }

    // Setup next1.html page
    function setupNext1Page() {
        const currentUser = getCookie("currentUser");
        
        if (!currentUser) {
            window.location.replace("index.html");
            return;
        }

        // Initialize session monitoring
        checkSession();
        
        // More frequent session check (every 5 seconds)
        setInterval(checkSession, 5000);
        
        // Initialize custom cursor
        requestAnimationFrame(() => setupCustomCursor());
        
        // Initial timer setup
        getRemainingTime().then(timeData => {
            if (timeData && timeData.remainingTime > 0) {
                startSessionTimer(timeData.expiresAt, timeData.role);
                
                // Auto-redirect on expiry (only for non-owner users)
                if (timeData.role !== 'owner') {
                    setTimeout(() => {
                        sessionExpiredRedirect();
                    }, timeData.remainingTime);
                }
            } else {
                // If no valid time data or time already expired
                sessionExpiredRedirect();
            }
        });

        // Display user role information
        displayUserInfo();

        // Block browser back behavior when session expired
        window.addEventListener('popstate', async (e) => {
            const isValid = await verifySessionValidity();
            if (!isValid) {
                // Prevent navigation and redirect to index
                sessionExpiredRedirect();
            }
        });

        // Disable back/forward cache for session pages
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                // Page was restored from back/forward cache
                // Force session check
                checkSession();
            }
        });
        
        // Add logout button
        addLogoutButton();
    }
    
    // Function to add logout button
    function addLogoutButton() {
        // Create logout button container
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
        
        // Create logout button
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
        
        // Hover effect
        logoutButton.addEventListener('mouseover', () => {
            logoutButton.style.backgroundColor = '#0056b3';
            logoutButton.style.transform = 'translateY(-2px)';
        });
        
        logoutButton.addEventListener('mouseout', () => {
            logoutButton.style.backgroundColor = '#007bff';
            logoutButton.style.transform = 'translateY(0)';
        });
        
        // Click effect
        logoutButton.addEventListener('mousedown', () => {
            logoutButton.style.transform = 'translateY(1px)';
        });
        
        logoutButton.addEventListener('mouseup', () => {
            logoutButton.style.transform = 'translateY(-2px)';
        });
        
        // Add logout functionality
        logoutButton.addEventListener('click', () => {
            // Clear current user cookie
            document.cookie = "currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            // Redirect to index.html
            window.location.href = "index.html";
        });
        
        // Append button to container
        logoutContainer.appendChild(logoutButton);
        
        // Append container to body
        document.body.appendChild(logoutContainer);
    }

    // Function to display user role information
    async function displayUserInfo() {
        const username = getCookie("currentUser");
        if (!username) return;
        
        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (user) {
                // Update any "premium" roles to "vip"
                if (user.role === 'premium') {
                    user.role = 'vip';
                    await updateUsers(usersData);
                }
                
                // Create or find user info element
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
                
                // Display role information
                const role = user.role || 'free';
                const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
                userInfoEl.textContent = `User: ${username} - Role: ${roleCapitalized}`;
            }
        } catch (error) {
            console.error("Error displaying user info:", error);
        }
    }

    // Function to handle session expired redirects
    function sessionExpiredRedirect() {
        // First set session expired flag
        sessionStorage.setItem('sessionExpired', 'true');
        // Clear user cookie
        document.cookie = "currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        // Show message
        alert("Waktu anda telah habis. Anda akan dialihkan ke halaman login.");
        // Use replace instead of href to prevent back button from working
        window.location.replace("index.html");
    }

    // Check user session
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
            
            // Ensure user has a role
            if (!user.role) {
                user.role = 'free';
            }
            
            // Update any "premium" roles to "vip"
            if (user.role === 'premium') {
                user.role = 'vip';
                await updateUsers(usersData);
            }
            
            const currentTime = Date.now();
            
            // Owner never expires
            if (user.role === 'owner') {
                // Just update last activity
                user.sessionData.lastActivity = currentTime;
                await updateUsers(usersData);
                return;
            }
            
            if (currentTime > user.sessionData.expiresAt) {
                if (!user.sessionData.limitMessageShown) {
                    user.sessionData.limitMessageShown = true;
                    await updateUsers(usersData);
                }
                
                sessionExpiredRedirect();
            } else {
                // Update last activity
                user.sessionData.lastActivity = currentTime;
                await updateUsers(usersData);
            }
        } catch (error) {
            console.error("Session check error:", error);
        }
    }

    // Get remaining session time
    async function getRemainingTime() {
        const username = getCookie("currentUser");
        if (!username) return null;
        
        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (user) {
                // Update any "premium" roles to "vip"
                if (user.role === 'premium') {
                    user.role = 'vip';
                    await updateUsers(usersData);
                }
                
                const currentTime = Date.now();
                
                // Ensure the user has a role
                if (!user.role) {
                    user.role = 'free';
                    await updateUsers(usersData);
                }
                
                const remainingTime = user.sessionData.expiresAt - currentTime;
                
                return {
                    remainingTime: Math.max(0, remainingTime),
                    expiresAt: user.sessionData.expiresAt,
                    sessionStartTime: user.sessionData.sessionStartTime,
                    role: user.role
                };
            }
            
            return null;
        } catch (error) {
            console.error("Error getting remaining time:", error);
            return null;
        }
    }

    // Display session timer
    function startSessionTimer(expiresAt, role) {
        let timerElement = document.getElementById('sessionTimer');
        if (!timerElement) {
            // Create timer element if not exists
            timerElement = document.createElement('div');
            timerElement.id = 'sessionTimer';
            timerElement.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                z-index: 10000;
            `;
            document.body.appendChild(timerElement);
        }
        
        // For owner role, show unlimited time
        if (role === 'owner') {
            timerElement.textContent = "Waktu: Unlimited";
            return;
        }
        
        const updateTimer = () => {
            const currentTime = Date.now();
            const remainingTime = expiresAt - currentTime;
            
            if (remainingTime <= 0) {
                timerElement.textContent = "Waktu habis";
                return false;
            }
            
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            timerElement.textContent = `Waktu tersisa: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            return true;
        };
        
        if (updateTimer()) {
            const timerInterval = setInterval(() => {
                if (!updateTimer()) {
                    clearInterval(timerInterval);
                }
            }, 1000);
        }
    }

    // Utility functions
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Setup custom cursor
    function setupCustomCursor() {
        const cursor = document.querySelector('.cursor');
        const cursorFollower = document.querySelector('.cursor-follower');
        
        if (!cursor || !cursorFollower) return;

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Smooth cursor animation
        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.3;
            cursorY += (mouseY - cursorY) * 0.3;
            followerX += (mouseX - followerX) * 0.1;
            followerY += (mouseY - followerY) * 0.1;

            cursor.style.left = cursorX + 'px';
            cursor.style.top = cursorY + 'px';
            cursorFollower.style.left = followerX + 'px';
            cursorFollower.style.top = followerY + 'px';

            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Cursor interactions
        document.addEventListener('mousedown', () => {
            cursor.classList.add('active');
            cursorFollower.classList.add('active');
        });

        document.addEventListener('mouseup', () => {
            cursor.classList.remove('active');
            cursorFollower.classList.remove('active');
        });

        const clickables = document.querySelectorAll('button, input, a');
        clickables.forEach(item => {
            item.addEventListener('mouseenter', () => {
                cursor.classList.add('hover');
                cursorFollower.classList.add('hover');
            });

            item.addEventListener('mouseleave', () => {
                cursor.classList.remove('hover');
                cursorFollower.classList.remove('hover');
            });
        });

        document.body.style.cursor = 'none';
    }

    async function fetchUsers() {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'X-Master-Key': API_KEY,
                'X-Access-Key': ACCESS_KEY
            }
        });
        
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const data = await response.json();
        const usersData = data.record || { users: [] };
        
        // Initialize accountRegistry if not exists
        if (!usersData.accountRegistry) {
            usersData.accountRegistry = {
                deviceLimits: {}
            };
        }
        
        // Ensure all users have required fields and sync registry
        const deviceCounts = {};
        usersData.users.forEach(user => {
            // Ensure all users have a role property
            if (!user.role) {
                user.role = 'free';
            }
            
            // Update any "premium" roles to "vip"
            if (user.role === 'premium') {
                user.role = 'vip';
            }
            
            if (!user.sessionData) {
                user.sessionData = {
                    expiresAt: 0,
                    lastActivity: 0,
                    sessionStartTime: 0,
                    limitMessageShown: false
                };
            }
            
            // Count devices
            if (user.deviceIdentifier) {
                if (!deviceCounts[user.deviceIdentifier]) {
                    deviceCounts[user.deviceIdentifier] = {
                        count: 0,
                        accounts: []
                    };
                }
                deviceCounts[user.deviceIdentifier].count++;
                deviceCounts[user.deviceIdentifier].accounts.push(user.username);
            }
        });
        
        // Sync registry with actual data
        Object.keys(deviceCounts).forEach(deviceId => {
            if (!usersData.accountRegistry.deviceLimits[deviceId]) {
                usersData.accountRegistry.deviceLimits[deviceId] = {
                    accountCount: deviceCounts[deviceId].count,
                    lastCreationTime: Date.now(),
                    accounts: deviceCounts[deviceId].accounts
                };
            } else {
                // Update existing entry
                usersData.accountRegistry.deviceLimits[deviceId].accountCount = deviceCounts[deviceId].count;
                usersData.accountRegistry.deviceLimits[deviceId].accounts = deviceCounts[deviceId].accounts;
            }
        });
        
        return usersData;
    }

    async function updateUsers(usersData) {
    try {
        // 1. Validasi input
        if (!usersData || typeof usersData !== 'object') {
            throw new Error('Invalid user data format');
        }

        // 2. Enkripsi data sebelum dikirim
        const encryptedData = {
            timestamp: Date.now(),
            payload: await encryptPayload(usersData),
            checksum: await generateChecksum(usersData)
        };

        // 3. Tambahkan nonce untuk mencegah replay attacks
        const nonce = window.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
        
        // 4. Buat signature request
        const requestSignature = await generateRequestSignature(encryptedData, nonce);

        // 5. Kirim request dengan proteksi tambahan
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/octet-stream', // Sembunyikan tipe data asli
                'X-Request-Signature': requestSignature,
                'X-Request-Nonce': nonce,
                'X-Request-Timestamp': encryptedData.timestamp,
                'X-Request-Checksum': encryptedData.checksum,
                'X-Master-Key': await generateDynamicKey(), // Key tidak statis
                'X-Access-Key': await generateSessionToken()
            },
            body: JSON.stringify(encryptedData)
        });

        // 6. Validasi response
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }

        // 7. Dekripsi dan validasi response
        const responseData = await response.json();
        return await decryptAndVerifyResponse(responseData);

    } catch (error) {
        console.error('Update users failed:', error.message);
        // Log error ke monitoring system
        logSecurityEvent('UPDATE_USERS_ERROR', error);
        throw error; // Re-throw untuk handling di caller
    }
}

// Fungsi helper untuk enkripsi
async function encryptPayload(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(await generateDynamicKey()),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
    );
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}

// Fungsi untuk generate checksum
async function generateChecksum(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fungsi untuk generate dynamic key
async function generateDynamicKey() {
    const masterKey = API_KEY; // Dari environment atau config terenkripsi
    const timestamp = Math.floor(Date.now() / 60000); // Berubah setiap menit
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(`${masterKey}:${timestamp}`);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Fungsi untuk generate session token
async function generateSessionToken() {
    if (!window.sessionToken) {
        const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
        window.sessionToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return window.sessionToken;
}

// Fungsi untuk generate request signature
async function generateRequestSignature(data, nonce) {
    const secret = await generateDynamicKey();
    const encoder = new TextEncoder();
    const dataToSign = `${secret}:${nonce}:${data.timestamp}:${JSON.stringify(data.payload)}`;
    const signatureBuffer = await window.crypto.subtle.digest('SHA-512', encoder.encode(dataToSign));
    return Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Function to hash a string using SHA-256
async function hashString(str) {
  // Encode the string as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  // Hash the data using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert the hash to hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Execute the hash function and display the result
hashString(apiEndpoint).then(hash => {
  console.log("Original API Endpoint:", apiEndpoint);
  console.log("SHA-256 Hash:", hash);
});
