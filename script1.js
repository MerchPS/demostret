document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const API_URL = 'https://hanxtools.byethost7.com/api.php';
    const API_KEY = '1234567890abcdef'; // Must match your api.php key

    // Tab switching functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.form');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Remove active class from all buttons and forms
            tabBtns.forEach(b => b.classList.remove('active'));
            forms.forEach(form => form.classList.remove('active'));
            
            // Add active class to clicked button and corresponding form
            btn.classList.add('active');
            document.getElementById(`${tabId}Form`).classList.add('active');
            
            // Clear all messages
            clearMessages();
        });
    });

    // Clear all error/success messages
    function clearMessages() {
        document.querySelectorAll('.error-message, .success-message').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
    }

    // Show error message
    function showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    // Show success message
    function showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    // Get cookie value
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // API call to fetch users
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
            return data.users ? data : { users: [], accountRegistry: { deviceLimits: {} } };
        } catch (error) {
            console.error("Error fetching users:", error);
            return { users: [], accountRegistry: { deviceLimits: {} } };
        }
    }

    // API call to update users
    async function updateUsers(data) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
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

    // Register form handler
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (!username || !password) {
            return showError('registerError', 'Please fill in all fields');
        }
        if (password !== confirmPassword) {
            return showError('registerError', 'Passwords do not match');
        }

        try {
            const usersData = await fetchUsers();
            
            // Check if username exists
            if (usersData.users.some(user => user.username === username)) {
                return showError('registerError', 'Username already exists');
            }

            // Create new user
            const newUser = {
                username,
                password: btoa(password), // Simple base64 encoding
                role: 'free',
                created_at: new Date().toISOString()
            };

            // Add new user and update
            usersData.users.push(newUser);
            await updateUsers(usersData);
            
            showSuccess('registerSuccess', 'Registration successful! Please login.');
            document.getElementById('registerForm').reset();
            
            // Switch to login tab after 2 seconds
            setTimeout(() => {
                document.querySelector('[data-tab="login"]').click();
            }, 2000);

        } catch (error) {
            console.error("Registration error:", error);
            showError('registerError', 'Registration failed. Please try again.');
        }
    });

    // Login form handler
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            return showError('loginError', 'Please fill in all fields');
        }

        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (!user || btoa(password) !== user.password) {
                return showError('loginError', 'Invalid username or password');
            }

            // Set cookie and redirect
            document.cookie = `currentUser=${username}; path=/; SameSite=Lax`;
            window.location.href = "next1.html";

        } catch (error) {
            console.error("Login error:", error);
            showError('loginError', 'Login failed. Please try again.');
        }
    });

    // Redeem form handler
    document.getElementById('redeemForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById('redeemUsername').value.trim();
        const code = document.getElementById('redeemCode').value.trim();

        if (!username || !code) {
            return showError('redeemError', 'Please fill in all fields');
        }

        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (!user) {
                return showError('redeemError', 'Username not found');
            }

            // Basic redeem logic - you should implement your own
            if (code === "VIPCODE123") {
                user.role = 'vip';
                await updateUsers(usersData);
                showSuccess('redeemSuccess', 'Code redeemed successfully! You now have VIP access.');
            } else {
                showError('redeemError', 'Invalid redeem code');
            }

        } catch (error) {
            console.error("Redeem error:", error);
            showError('redeemError', 'Error processing redeem code. Please try again.');
        }
    });

    // Admin form handler
    document.getElementById('adminForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value;

        if (!username || !password) {
            return showError('adminError', 'Please fill in all fields');
        }

        try {
            const usersData = await fetchUsers();
            const user = usersData.users.find(u => u.username === username);
            
            if (!user || btoa(password) !== user.password) {
                return showError('adminError', 'Invalid admin credentials');
            }

            if (user.role !== 'owner') {
                return showError('adminError', 'Access denied. Admin privileges required.');
            }

            // Set cookie and redirect
            document.cookie = `currentUser=${username}; path=/; SameSite=Lax`;
            window.location.href = "sisnejwjwjw.html";

        } catch (error) {
            console.error("Admin login error:", error);
            showError('adminError', 'Admin login failed. Please try again.');
        }
    });

    // Check if user is already logged in
    const currentUser = getCookie('currentUser');
    if (currentUser && window.location.pathname.includes('index.html')) {
        // Verify user exists
        fetchUsers().then(usersData => {
            const user = usersData.users.find(u => u.username === currentUser);
            if (user) {
                window.location.href = "next1.html";
            } else {
                document.cookie = "currentUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            }
        });
    }
});
