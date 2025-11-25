// Global variables
let currentUser = null;
let authToken = null;
let selectedUserType = null;
const API_BASE_URL = 'http://localhost:3000/api';

// Socket.io connection
let socket = null;

// Real-time data tracking
let realTimeData = {
    availableAutos: [],
    activeRides: [],
    driverLocations: new Map(),
    systemStats: {
        totalStudents: 0,
        totalDrivers: 0,
        totalRides: 0,
        activeAutos: 0,
        pendingRides: 0
    }
};

// Modal system
const ModalManager = {
    showModal: function(title, message, type = 'info', actions = []) {
        // Remove any existing modals first
        this.hideModal();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="ModalManager.hideModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    ${actions.map(action => `
                        <button class="btn-${action.type}" onclick="${action.handler}">
                            ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                            ${action.text}
                        </button>
                    `).join('')}
                    ${actions.length === 0 ? `
                        <button class="btn-primary" onclick="ModalManager.hideModal()">
                            <i class="fas fa-check"></i> OK
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        setTimeout(() => modal.classList.add('active'), 10);
    },
    
    hideModal: function() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                // Restore body scroll
                document.body.style.overflow = '';
            }, 300);
        }
    },
    
    showConfirmation: function(title, message, confirmHandler) {
        this.showModal(title, message, 'warning', [
            {
                text: 'Cancel',
                type: 'secondary',
                handler: 'ModalManager.hideModal()'
            },
            {
                text: 'Confirm',
                type: 'danger',
                icon: 'fas fa-trash',
                handler: `ModalManager.hideModal(); ${confirmHandler}`
            }
        ]);
    },

    showProfileModal: function(userType, userData) {
        this.hideModal();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = this.getProfileModalContent(userType, userData);
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        setTimeout(() => modal.classList.add('active'), 10);
        
        // Setup profile form handlers
        this.setupProfileFormHandlers(userType);
    },

    getProfileModalContent: function(userType, userData) {
        const isStudent = userType === 'student';
        const isDriver = userType === 'driver';
        const isAdmin = userType === 'admin';

        return `
            <div class="modal-dialog" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-circle"></i> My Profile</h3>
                    <button class="modal-close" onclick="ModalManager.hideModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="profile-section">
                        <div class="profile-header">
                            <div class="profile-avatar">
                                <i class="fas fa-user-${isStudent ? 'graduate' : isDriver ? 'id-card' : 'shield'}"></i>
                            </div>
                            <div class="profile-info">
                                <h4>${userData?.name || 'User'}</h4>
                                <p class="profile-role">${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
                                <p class="profile-email">${userData?.email || 'No email'}</p>
                            </div>
                        </div>

                        <div class="profile-tabs">
                            <button class="profile-tab-btn active" data-tab="personal">Personal Info</button>
                            <button class="profile-tab-btn" data-tab="security">Security</button>
                            ${isStudent ? '<button class="profile-tab-btn" data-tab="academic">Academic</button>' : ''}
                            ${isDriver ? '<button class="profile-tab-btn" data-tab="vehicle">Vehicle</button>' : ''}
                        </div>

                        <div class="profile-tab-content">
                            <!-- Personal Info Tab -->
                            <div id="personal-tab" class="profile-tab-pane active">
                                <form id="profile-form" class="auth-form">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label>Full Name</label>
                                            <input type="text" id="profile-fullName" value="${userData?.name || ''}" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Email</label>
                                            <input type="email" id="profile-email" value="${userData?.email || ''}" required>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" id="profile-phone" value="${userData?.phone || ''}">
                                    </div>
                                    ${isStudent ? `
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label>Roll Number</label>
                                                <input type="text" id="profile-rollNumber" value="${userData?.rollNumber || ''}" required>
                                            </div>
                                            <div class="form-group">
                                                <label>Department</label>
                                                <input type="text" id="profile-department" value="${userData?.department || ''}">
                                            </div>
                                        </div>
                                    ` : ''}
                                    ${isDriver ? `
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label>License Number</label>
                                                <input type="text" id="profile-license" value="${userData?.licenseNumber || ''}">
                                            </div>
                                            <div class="form-group">
                                                <label>Experience</label>
                                                <input type="text" id="profile-experience" value="${userData?.experience || ''}">
                                            </div>
                                        </div>
                                    ` : ''}
                                    <button type="submit" class="btn-primary">
                                        <i class="fas fa-save"></i> Update Profile
                                    </button>
                                </form>
                            </div>

                            <!-- Security Tab -->
                            <div id="security-tab" class="profile-tab-pane">
                                <form id="password-form" class="auth-form">
                                    <div class="form-group">
                                        <label>Current Password</label>
                                        <input type="password" id="current-password" required>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label>New Password</label>
                                            <input type="password" id="new-password" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Confirm New Password</label>
                                            <input type="password" id="confirm-password" required>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn-primary">
                                        <i class="fas fa-key"></i> Change Password
                                    </button>
                                </form>
                            </div>

                            ${isStudent ? `
                                <!-- Academic Tab -->
                                <div id="academic-tab" class="profile-tab-pane">
                                    <form id="academic-form" class="auth-form">
                                        <div class="form-group">
                                            <label>Hostel</label>
                                            <input type="text" id="academic-hostel" value="${userData?.hostel || ''}">
                                        </div>
                                        <div class="form-group">
                                            <label>Semester</label>
                                            <input type="number" id="academic-semester" value="${userData?.semester || ''}" min="1" max="8">
                                        </div>
                                        <div class="form-group">
                                            <label>CGPA</label>
                                            <input type="number" id="academic-cgpa" value="${userData?.cgpa || ''}" step="0.01" min="0" max="10">
                                        </div>
                                        <button type="submit" class="btn-primary">
                                            <i class="fas fa-graduation-cap"></i> Update Academic Info
                                        </button>
                                    </form>
                                </div>
                            ` : ''}

                            ${isDriver ? `
                                <!-- Vehicle Tab -->
                                <div id="vehicle-tab" class="profile-tab-pane">
                                    <form id="vehicle-form" class="auth-form">
                                        <div class="form-group">
                                            <label>Vehicle Number</label>
                                            <input type="text" id="vehicle-number" value="${userData?.vehicleNumber || ''}">
                                        </div>
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label>Vehicle Type</label>
                                                <input type="text" id="vehicle-type" value="${userData?.vehicleType || ''}">
                                            </div>
                                            <div class="form-group">
                                                <label>Seating Capacity</label>
                                                <input type="number" id="vehicle-capacity" value="${userData?.vehicleCapacity || 4}" min="1" max="10">
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label>Registration Number</label>
                                            <input type="text" id="vehicle-registration" value="${userData?.registrationNumber || ''}">
                                        </div>
                                        <button type="submit" class="btn-primary">
                                            <i class="fas fa-car"></i> Update Vehicle Info
                                        </button>
                                    </form>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    setupProfileFormHandlers: function(userType) {
        // Profile form submission
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleProfileUpdate(userType);
            });
        }

        // Password form submission
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handlePasswordChange();
            });
        }

        // Academic form submission (students only)
        const academicForm = document.getElementById('academic-form');
        if (academicForm) {
            academicForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleAcademicUpdate();
            });
        }

        // Vehicle form submission (drivers only)
        const vehicleForm = document.getElementById('vehicle-form');
        if (vehicleForm) {
            vehicleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleVehicleUpdate();
            });
        }

        // Profile tab switching
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchProfileTab(tabName);
            });
        });
    }
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing app');
    initializeApp();
});

function initializeApp() {
    console.log('Initializing app...');
    
    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    console.log('Saved token:', !!savedToken);
    console.log('Saved user:', !!savedUser);
    
    if (savedToken && savedUser) {
        try {
            authToken = savedToken;
            currentUser = JSON.parse(savedUser);
            console.log('Found existing user:', currentUser);
            showApp();
        } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
        }
    } else {
        showAuth();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize real-time connection
    initializeRealTimeConnection();
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Auth forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Student forms
    const rideForm = document.getElementById('request-ride-form');
    const feedbackForm = document.getElementById('feedback-form');
    
    if (rideForm) {
        rideForm.addEventListener('submit', handleRideRequest);
    }
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFeedback);
    }
    
    // Driver forms
    const locationForm = document.getElementById('update-location-form');
    if (locationForm) {
        locationForm.addEventListener('submit', handleUpdateLocation);
    }
    
    // Admin forms
    const addAutoForm = document.getElementById('add-auto-form');
    const addDriverForm = document.getElementById('add-driver-form');
    
    if (addAutoForm) {
        addAutoForm.addEventListener('submit', handleAddAuto);
    }
    if (addDriverForm) {
        addDriverForm.addEventListener('submit', handleAddDriver);
    }
    
    // Initialize rating stars
    initializeRatingStars();
}

// ========== PROFILE MANAGEMENT FUNCTIONS ==========

function showProfile() {
    if (!currentUser) return;
    
    // Enhanced user data with additional fields for demo
    const enhancedUserData = {
        ...currentUser,
        phone: currentUser.phone || '+91 98765 43210',
        rollNumber: currentUser.rollNumber || '2023001',
        department: currentUser.department || 'Computer Science',
        hostel: currentUser.hostel || 'Hostel A',
        semester: currentUser.semester || 3,
        cgpa: currentUser.cgpa || 8.5,
        licenseNumber: currentUser.licenseNumber || 'DL1234567890',
        experience: currentUser.experience || '2 years',
        vehicleNumber: currentUser.vehicleNumber || 'A1',
        vehicleType: currentUser.vehicleType || 'E-Rickshaw',
        vehicleCapacity: currentUser.vehicleCapacity || 4,
        registrationNumber: currentUser.registrationNumber || 'DL01AB1234'
    };
    
    ModalManager.showProfileModal(currentUser.userType, enhancedUserData);
}

function switchProfileTab(tabName) {
    // Hide all tab panes
    document.querySelectorAll('.profile-tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab and activate button
    const tabElement = document.getElementById(`${tabName}-tab`);
    const buttonElement = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (tabElement) tabElement.classList.add('active');
    if (buttonElement) buttonElement.classList.add('active');
}

async function handleProfileUpdate(userType) {
    const fullName = document.getElementById('profile-fullName').value;
    const email = document.getElementById('profile-email').value;
    const phone = document.getElementById('profile-phone').value;
    
    try {
        // Update current user data
        currentUser.name = fullName;
        currentUser.email = email;
        currentUser.phone = phone;
        
        // Update user-specific fields
        if (userType === 'student') {
            currentUser.rollNumber = document.getElementById('profile-rollNumber').value;
            currentUser.department = document.getElementById('profile-department').value;
        } else if (userType === 'driver') {
            currentUser.licenseNumber = document.getElementById('profile-license').value;
            currentUser.experience = document.getElementById('profile-experience').value;
        }
        
        // Save updated user data
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update UI
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = currentUser.name;
        }
        
        showNotification('Profile updated successfully!', 'success');
        ModalManager.hideModal();
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification('Profile updated successfully! (Demo)', 'success');
        ModalManager.hideModal();
    }
}

async function handlePasswordChange() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Password must be at least 6 characters long!', 'error');
        return;
    }
    
    try {
        // Demo password change
        showNotification('Password changed successfully!', 'success');
        document.getElementById('password-form').reset();
    } catch (error) {
        console.error('Password change error:', error);
        showNotification('Password changed successfully! (Demo)', 'success');
        document.getElementById('password-form').reset();
    }
}

async function handleAcademicUpdate() {
    const hostel = document.getElementById('academic-hostel').value;
    const semester = document.getElementById('academic-semester').value;
    const cgpa = document.getElementById('academic-cgpa').value;
    
    try {
        currentUser.hostel = hostel;
        currentUser.semester = semester;
        currentUser.cgpa = cgpa;
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Academic information updated successfully!', 'success');
    } catch (error) {
        console.error('Academic update error:', error);
        showNotification('Academic information updated! (Demo)', 'success');
    }
}

async function handleVehicleUpdate() {
    const vehicleNumber = document.getElementById('vehicle-number').value;
    const vehicleType = document.getElementById('vehicle-type').value;
    const vehicleCapacity = document.getElementById('vehicle-capacity').value;
    const registrationNumber = document.getElementById('vehicle-registration').value;
    
    try {
        currentUser.vehicleNumber = vehicleNumber;
        currentUser.vehicleType = vehicleType;
        currentUser.vehicleCapacity = vehicleCapacity;
        currentUser.registrationNumber = registrationNumber;
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Vehicle information updated successfully!', 'success');
    } catch (error) {
        console.error('Vehicle update error:', error);
        showNotification('Vehicle information updated! (Demo)', 'success');
    }
}

// ========== AUTHENTICATION FUNCTIONS ==========

function selectUserType(userType) {
    console.log('User type selected:', userType);
    selectedUserType = userType;
    document.getElementById('user-type-selection').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    
    const titles = {
        'student': 'Student Login',
        'driver': 'Driver Login', 
        'admin': 'Admin Login'
    };
    document.getElementById('login-title').textContent = titles[userType] || 'Login';
    
    // Hide register link for non-students
    const authSwitch = document.getElementById('login-auth-switch');
    if (userType !== 'student') {
        authSwitch.innerHTML = '<p>Contact administrator for account access.</p>';
    } else {
        authSwitch.innerHTML = '<p>Don\'t have an account? <span onclick="showRegister()" style="color: #007bff; cursor: pointer; text-decoration: underline;">Register here</span></p>';
    }
}

function goBackToUserType() {
    console.log('Going back to user type selection');
    document.getElementById('user-type-selection').classList.remove('hidden');
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.add('hidden');
    selectedUserType = null;
}

function showLogin() {
    console.log('Showing login form');
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
}

function showRegister() {
    console.log('Showing register form');
    
    if (selectedUserType !== 'student') {
        showNotification('Only student registration is available', 'error');
        return;
    }
    
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.remove('hidden');
    
    const titles = {
        'student': 'Student Registration',
        'driver': 'Driver Registration',
        'admin': 'Administrator Registration'
    };
    document.getElementById('register-title').textContent = titles[selectedUserType] || 'Registration';
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('Login attempt for:', selectedUserType);
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!selectedUserType) {
        showNotification('Please select user type first', 'error');
        return;
    }
    
    // Demo login for testing
    if (email.includes('demo')) {
        console.log('Using demo login');
        handleDemoLogin(email, password);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email, password, userType: selectedUserType})
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showApp();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        // Fallback to demo login
        handleDemoLogin(email, password);
    }
}

function handleDemoLogin(email, password) {
    // Demo users for testing
    const demoUsers = {
        'student@demo.com': { 
            id: 1, 
            name: 'Demo Student', 
            userType: 'student',
            email: 'student@demo.com',
            phone: '+91 98765 43210',
            rollNumber: '2023001',
            department: 'Computer Science',
            hostel: 'Hostel A',
            semester: 3,
            cgpa: 8.5
        },
        'driver@demo.com': { 
            id: 1, 
            name: 'Demo Driver', 
            userType: 'driver',
            email: 'driver@demo.com',
            phone: '+91 98765 43211',
            licenseNumber: 'DL1234567890',
            experience: '2 years',
            vehicleNumber: 'A1',
            vehicleType: 'E-Rickshaw',
            vehicleCapacity: 4,
            registrationNumber: 'DL01AB1234'
        },
        'admin@demo.com': { 
            id: 1, 
            name: 'Demo Admin', 
            userType: 'admin',
            email: 'admin@demo.com',
            phone: '+91 98765 43212'
        }
    };
    
    const user = demoUsers[email];
    
    if (user && password === 'password') {
        authToken = 'demo-token';
        currentUser = user;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        showNotification('Demo login successful!', 'success');
    } else {
        showNotification('Invalid demo credentials. Use: student@demo.com, driver@demo.com, or admin@demo.com with password "password"', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('Registration attempt');
    
    if (selectedUserType !== 'student') {
        showNotification('Only student registration is available', 'error');
        return;
    }
    
    const rollNumber = document.getElementById('register-rollNumber').value;
    const fullName = document.getElementById('register-fullName').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const department = document.getElementById('register-department').value;
    const hostel = document.getElementById('register-hostel').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirmPassword').value;
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters!', 'error');
        return;
    }
    
    // Demo registration
    if (email.includes('demo')) {
        showNotification('Demo registration successful! Please login.', 'success');
        showLogin();
        document.getElementById('register-form').reset();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                userType: selectedUserType,
                rollNumber, fullName, email,
                phoneNumber: phone, password,
                department, hostelName: hostel
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Registration successful! Please login.', 'success');
            showLogin();
            document.getElementById('register-form').reset();
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration successful! (Demo mode)', 'success');
        showLogin();
        document.getElementById('register-form').reset();
    }
}

function logout() {
    console.log('Logging out');
    authToken = null;
    currentUser = null;
    selectedUserType = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    showAuth();
    showNotification('Logged out successfully', 'success');
}

// ========== UI MANAGEMENT ==========

function showAuth() {
    console.log('Showing auth section');
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-section').classList.add('hidden');
    document.getElementById('user-type-selection').classList.remove('hidden');
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('register-section').classList.add('hidden');
    
    // Reset forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
}

function showApp() {
    console.log('Showing app section for:', currentUser);
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
    
    // Update user info
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.name || 'User';
    }
    
    // Show appropriate dashboard
    document.querySelectorAll('.dashboard-content').forEach(dash => {
        dash.classList.add('hidden');
    });
    
    const userDashboard = document.getElementById(`${currentUser.userType}-dashboard`);
    if (userDashboard) {
        userDashboard.classList.remove('hidden');
        console.log('Showing dashboard:', currentUser.userType);
    } else {
        console.error('Dashboard not found for user type:', currentUser.userType);
    }
    
    // Initialize user-specific dashboard
    initializeUserDashboard();
}

function initializeUserDashboard() {
    console.log('Initializing dashboard for:', currentUser.userType);
    
    if (!currentUser) {
        console.error('No current user found');
        return;
    }
    
    switch (currentUser.userType) {
        case 'student':
            initializeStudentDashboard();
            break;
        case 'driver':
            initializeDriverDashboard();
            break;
        case 'admin':
            initializeAdminDashboard();
            break;
        default:
            console.error('Unknown user type:', currentUser.userType);
    }
    
    // Load initial data
    loadDashboardData();
}

async function loadDashboardData() {
    console.log('Loading dashboard data for:', currentUser.userType);
    
    if (currentUser.userType === 'student') {
        await loadStudentDashboard();
    } else if (currentUser.userType === 'driver') {
        await loadDriverDashboard();
    } else if (currentUser.userType === 'admin') {
        await loadAdminDashboard();
    }
}

// ========== REAL-TIME DATA MANAGEMENT ==========

function initializeRealTimeConnection() {
    if (typeof io !== 'undefined') {
        socket = io('http://localhost:3000');
        
        socket.on('connect', () => {
            console.log('Connected to real-time server');
            // Join user-specific room
            if (currentUser) {
                socket.emit('join_user', currentUser);
            }
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from real-time server');
        });
        
        // Real-time data updates
        socket.on('location_updated', (data) => {
            handleRealTimeLocationUpdate(data);
        });
        
        socket.on('driver_status_changed', (data) => {
            handleRealTimeStatusUpdate(data);
        });
        
        socket.on('ride_status_updated', (data) => {
            handleRealTimeRideUpdate(data);
        });
        
        socket.on('new_ride_request', (data) => {
            handleNewRideRequest(data);
        });
        
        socket.on('system_stats_updated', (data) => {
            handleSystemStatsUpdate(data);
        });
        
        socket.on('ride_request_confirmed', (data) => {
            if (data.success) {
                showNotification('Ride request sent to driver!', 'success');
            }
        });
        
        socket.on('ride_request_failed', (data) => {
            showNotification('Ride request failed: ' + data.reason, 'error');
        });

// Real-time event handlers for admin dashboard
socket.on('new-student-registered', (studentData) => {
    console.log('📢 REAL-TIME: New student registered', studentData);
    if (currentUser && currentUser.userType === 'admin') {
        // Refresh students list
        loadAdminStudents();
        showNotification(`New student: ${studentData.full_name}`, 'success');
    }
});

socket.on('new-driver-registered', (driverData) => {
    console.log('📢 REAL-TIME: New driver registered', driverData);
    if (currentUser && currentUser.userType === 'admin') {
        loadAdminDrivers();
        showNotification(`New driver: ${driverData.full_name}`, 'success');
    }
});

socket.on('new-auto-registered', (autoData) => {
    console.log('📢 REAL-TIME: New auto registered', autoData);
    if (currentUser && currentUser.userType === 'admin') {
        loadAdminAutos();
        showNotification(`New auto: ${autoData.auto_number}`, 'success');
    }
});

    } else {
        console.log('Socket.io not available - running in demo mode');
    }
}
// New handler functions
function handleNewStudentRegistration(studentData) {
    if (currentUser && currentUser.userType === 'admin') {
        // Refresh students list if admin is viewing students
        if (document.querySelector('#students-tab.active')) {
            loadAdminStudents();
        }
        // Always update stats
        loadAdminStats();
        showNotification(`New student registered: ${studentData.full_name}`, 'info');
    }
}

function handleNewDriverRegistration(driverData) {
    if (currentUser && currentUser.userType === 'admin') {
        if (document.querySelector('#drivers-tab.active')) {
            loadAdminDrivers();
        }
        loadAdminStats();
        showNotification(`New driver registered: ${driverData.full_name}`, 'info');
    }
}

function handleNewAutoRegistration(autoData) {
    if (currentUser && currentUser.userType === 'admin') {
        if (document.querySelector('#autos-tab.active')) {
            loadAdminAutos();
        }
        loadAdminStats();
        showNotification(`New auto registered: ${autoData.auto_number}`, 'info');
    }
}

function handleRealTimeLocationUpdate(data) {
    realTimeData.driverLocations.set(data.driver_id, data);
    
    // Update UI based on current user type
    if (currentUser) {
        switch (currentUser.userType) {
            case 'student':
                updateStudentAutoLocations();
                break;
            case 'driver':
                updateDriverLocationDisplay();
                break;
            case 'admin':
                updateAdminRealTimeData();
                break;
        }
    }
}

function handleRealTimeStatusUpdate(data) {
    // Update driver status in real-time data
    const driver = realTimeData.availableAutos.find(auto => auto.driver_id === data.driver_id);
    if (driver) {
        driver.status = data.status;
    }
    
    // Update UI
    updateRealTimeStatusDisplay();
}

function handleRealTimeRideUpdate(data) {
    // Update ride status
    const rideIndex = realTimeData.activeRides.findIndex(ride => ride.ride_id === data.ride_id);
    if (rideIndex !== -1) {
        realTimeData.activeRides[rideIndex] = { ...realTimeData.activeRides[rideIndex], ...data };
    }
    
    // Update UI
    updateRealTimeRideDisplay();
}

function handleNewRideRequest(data) {
    if (currentUser && currentUser.userType === 'driver') {
        showDriverRideRequest(data);
    }
}

function handleSystemStatsUpdate(data) {
    realTimeData.systemStats = { ...realTimeData.systemStats, ...data };
    updateSystemStatsDisplay();
}

// ========== STUDENT DASHBOARD ==========

function initializeStudentDashboard() {
    console.log('Initializing student dashboard...');
    
    // Setup student-specific event listeners
    const refreshAutosBtn = document.getElementById('refresh-autos');
    const locateMeBtn = document.getElementById('locate-me');
    
    if (refreshAutosBtn) {
        refreshAutosBtn.addEventListener('click', loadAvailableAutos);
    }
    if (locateMeBtn) {
        locateMeBtn.addEventListener('click', locateStudent);
    }
    
    // Initialize student map
    initializeStudentMap();
    
    // Add profile card to student dashboard
    addProfileCard('student');
}

function addProfileCard(userType) {
    const dashboardGrid = document.querySelector(`#${userType}-dashboard .dashboard-grid`);
    if (!dashboardGrid) return;
    
    const profileCard = document.createElement('div');
    profileCard.className = 'card';
    profileCard.innerHTML = `
        <h3><i class="fas fa-user-circle"></i> My Profile</h3>
        <div class="card-content">
            <div class="profile-summary">
                <div class="profile-avatar-large">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <div class="profile-details">
                    <h4>${currentUser?.name || 'User'}</h4>
                    <p class="profile-email">${currentUser?.email || 'No email'}</p>
                    <p class="profile-role">${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
                    ${userType === 'student' ? `
                        <div class="profile-stats">
                            <div class="profile-stat">
                                <span class="stat-label">Roll No:</span>
                                <span class="stat-value">${currentUser?.rollNumber || 'N/A'}</span>
                            </div>
                            <div class="profile-stat">
                                <span class="stat-label">Department:</span>
                                <span class="stat-value">${currentUser?.department || 'N/A'}</span>
                            </div>
                            <div class="profile-stat">
                                <span class="stat-label">Hostel:</span>
                                <span class="stat-value">${currentUser?.hostel || 'N/A'}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${userType === 'driver' ? `
                        <div class="profile-stats">
                            <div class="profile-stat">
                                <span class="stat-label">Vehicle:</span>
                                <span class="stat-value">${currentUser?.vehicleNumber || 'N/A'}</span>
                            </div>
                            <div class="profile-stat">
                                <span class="stat-label">License:</span>
                                <span class="stat-value">${currentUser?.licenseNumber || 'N/A'}</span>
                            </div>
                            <div class="profile-stat">
                                <span class="stat-label">Experience:</span>
                                <span class="stat-value">${currentUser?.experience || 'N/A'}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${userType === 'admin' ? `
                        <div class="profile-stats">
                            <div class="profile-stat">
                                <span class="stat-label">Role:</span>
                                <span class="stat-value">System Administrator</span>
                            </div>
                            <div class="profile-stat">
                                <span class="stat-label">Access:</span>
                                <span class="stat-value">Full System Control</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="profile-actions">
                <button class="btn-primary" onclick="showProfile()">
                    <i class="fas fa-edit"></i> Edit Profile
                </button>
                <button class="btn-secondary" onclick="showProfile(); setTimeout(() => switchProfileTab('security'), 100)">
                    <i class="fas fa-key"></i> Change Password
                </button>
            </div>
        </div>
    `;
    
    // Insert profile card at the beginning
    dashboardGrid.insertBefore(profileCard, dashboardGrid.firstChild);
}

async function loadStudentDashboard() {
    await updateStudentStats();
    await loadAvailableAutos();
    await loadRideHistory();
}

async function updateStudentStats() {
    try {
        // Demo data for testing
        document.getElementById('total-rides').textContent = '12 Completed Rides';
    } catch (error) {
        console.error('Error loading ride count:', error);
        document.getElementById('total-rides').textContent = '0 Completed Rides';
    }
}

async function loadAvailableAutos() {
    try {
        // Demo data for testing
        const demoAutos = [
            {auto_number: 'A1', driver_name: 'Rajesh Kumar', current_location: 'Gate2', available_seats: 4, auto_id: 1, driver_id: 1, driver_rating: 4.5},
            {auto_number: 'A2', driver_name: 'Mohan Singh', current_location: 'Gate1', available_seats: 3, auto_id: 2, driver_id: 2, driver_rating: 4.2},
            {auto_number: 'A3', driver_name: 'Suresh Patel', current_location: 'Satbari', available_seats: 2, auto_id: 3, driver_id: 3, driver_rating: 4.7}
        ];
        realTimeData.availableAutos = demoAutos;
        displayAvailableAutos(demoAutos);
    } catch (error) {
        console.error('Error loading autos:', error);
        // Fallback to demo data
        const demoAutos = [
            {auto_number: 'A1', driver_name: 'Rajesh Kumar', current_location: 'Gate2', available_seats: 4, auto_id: 1, driver_id: 1},
            {auto_number: 'A2', driver_name: 'Mohan Singh', current_location: 'Gate1', available_seats: 3, auto_id: 2, driver_id: 2},
            {auto_number: 'A3', driver_name: 'Suresh Patel', current_location: 'Satbari', available_seats: 2, auto_id: 3, driver_id: 3}
        ];
        realTimeData.availableAutos = demoAutos;
        displayAvailableAutos(demoAutos);
    }
}

function displayAvailableAutos(autos) {
    const container = document.getElementById('available-autos');
    if (!container) return;
    
    if (!autos || autos.length === 0) {
        container.innerHTML = `
            <div class="no-autos">
                <i class="fas fa-rickshaw"></i>
                <p>No autos available at your selected location</p>
                <p class="real-time-indicator"><span class="pulse-dot"></span> Live updates active</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = autos.map(auto => {
        const realTimeLocation = realTimeData.driverLocations.get(auto.driver_id);
        const currentLocation = realTimeLocation ? realTimeLocation.current_location : auto.current_location;
        const availableSeats = realTimeLocation ? realTimeLocation.available_seats : auto.available_seats;
        
        return `
        <div class="auto-card">
            <div class="auto-header">
                <span class="auto-number">${auto.auto_number}</span>
                <span class="auto-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${formatLocation(currentLocation)}
                    <span class="real-time-indicator"><span class="pulse-dot"></span> Live</span>
                </span>
            </div>
            <div class="auto-details">
                <div>
                    <div class="auto-driver">Driver: ${auto.driver_name}</div>
                    <div class="auto-seats">${availableSeats} seats available</div>
                    ${auto.driver_rating ? `<div class="auto-rating">⭐ ${auto.driver_rating}</div>` : ''}
                </div>
                <button class="btn-request" onclick="requestRide(${auto.auto_id})">
                    <i class="fas fa-car-side"></i>
                    Request Ride
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function updateStudentAutoLocations() {
    if (currentUser && currentUser.userType === 'student') {
        displayAvailableAutos(realTimeData.availableAutos);
    }
}

async function handleRideRequest(e) {
    e.preventDefault();
    
    const pickupPoint = document.getElementById('pickup-point').value;
    const dropoffPoint = document.getElementById('dropoff-point').value;
    
    if (!pickupPoint || !dropoffPoint) {
        showNotification('Please select both pickup and dropoff points', 'error');
        return;
    }
    
    if (pickupPoint === dropoffPoint) {
        showNotification('Pickup and dropoff points cannot be the same', 'error');
        return;
    }
    
    // For demo purposes, auto-assign the first available auto
    if (realTimeData.availableAutos.length > 0) {
        const auto = realTimeData.availableAutos[0];
        await requestRide(auto.auto_id);
    } else {
        showNotification('No autos available. Please try again later.', 'warning');
    }
}

async function requestRide(autoId) {
    const pickupPoint = document.getElementById('pickup-point').value;
    const dropoffPoint = document.getElementById('dropoff-point').value;
    
    if (!pickupPoint || !dropoffPoint) {
        showNotification('Please select pickup and dropoff points first', 'error');
        return;
    }
    
    try {
        if (socket) {
            // Send ride request via socket for real-time processing
            socket.emit('request_ride', {
                student_id: currentUser.id,
                student_name: currentUser.name,
                auto_id: autoId,
                pickup_point: pickupPoint,
                dropoff_point: dropoffPoint,
                timestamp: new Date().toISOString()
            });
            
            showNotification('Ride request sent! Waiting for driver confirmation...', 'info');
        } else {
            showNotification('Ride requested successfully! (Demo)', 'success');
            loadAvailableAutos();
        }
    } catch (error) {
        console.error('Ride request error:', error);
        showNotification('Ride requested successfully! (Demo)', 'success');
        loadAvailableAutos();
    }
}

async function loadRideHistory() {
    try {
        // Demo data for testing
        const demoRides = [
            {ride_id: 1, pickup_point: 'Gate1', dropoff_point: 'Hostel Block A', driver_name: 'Rajesh Kumar', auto_number: 'A1', status: 'completed', created_at: new Date().toISOString(), rating: 5},
            {ride_id: 2, pickup_point: 'Gate2', dropoff_point: 'Academic Block', driver_name: 'Mohan Singh', auto_number: 'A2', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), rating: 4}
        ];
        displayRideHistory(demoRides);
    } catch (error) {
        console.error('Error loading ride history:', error);
        displayRideHistory([]);
    }
}

function displayRideHistory(rides) {
    const container = document.getElementById('ride-history');
    if (!container) return;
    
    if (!rides || rides.length === 0) {
        container.innerHTML = `
            <div class="no-rides">
                <i class="fas fa-history"></i>
                <p>No ride history yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = rides.map(ride => `
        <div class="ride-item">
            <div class="ride-info">
                <div class="ride-route">
                    <strong>${formatLocation(ride.pickup_point)} → ${formatLocation(ride.dropoff_point)}</strong>
                </div>
                <div class="ride-details">
                    <span>Driver: ${ride.driver_name || 'N/A'}</span>
                    <span>Auto: ${ride.auto_number || 'N/A'}</span>
                    <span>Date: ${new Date(ride.created_at).toLocaleDateString()}</span>
                </div>
                <div class="ride-status">
                    <span class="status-badge status-${ride.status}">${ride.status}</span>
                    ${ride.rating ? 
                        `<span class="rating-display">${'⭐'.repeat(ride.rating)}</span>` : 
                        '<span class="not-rated">Not rated</span>'
                    }
                </div>
            </div>
        </div>
    `).join('');
}

function locateStudent() {
    // Simulate location detection
    const locations = ['Gate1', 'Gate2', 'Satbari'];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    document.getElementById('pickup-point').value = randomLocation;
    showNotification(`Location set to: ${formatLocation(randomLocation)}`, 'success');
}

// ========== FEEDBACK SYSTEM ==========

function initializeRatingStars() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            updateStarRating(rating);
        });
    });
}

function updateStarRating(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function handleFeedback(e) {
    e.preventDefault();
    
    const activeStars = document.querySelectorAll('.star.active');
    const rating = activeStars.length;
    const feedbackText = document.getElementById('feedback-text').value;
    
    if (rating === 0) {
        showNotification('Please select a rating', 'error');
        return;
    }
    
    try {
        // Demo feedback submission
        showNotification('Feedback submitted successfully!', 'success');
        document.getElementById('feedback-form').reset();
        updateStarRating(0);
        loadRideHistory();
        updateStudentStats();
    } catch (error) {
        console.error('Feedback error:', error);
        showNotification('Feedback submitted successfully! (Demo)', 'success');
        document.getElementById('feedback-form').reset();
        updateStarRating(0);
    }
}

// ========== DRIVER DASHBOARD ==========

function initializeDriverDashboard() {
    console.log('Initializing driver dashboard...');
    
    // Setup driver status buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            updateDriverStatus(status);
        });
    });
    
    // Initialize driver map
    initializeDriverMap();
    
    // Add profile card to driver dashboard
    addProfileCard('driver');
}

async function loadDriverDashboard() {
    await loadDriverProfile();
    await loadDriverActiveRide();
    updateDriverStatusButtons();
}

async function loadDriverProfile() {
    try {
        // Demo data for driver profile
        document.getElementById('driver-total-rides').textContent = '45 Completed Rides';
        document.getElementById('driver-rating').textContent = '4.5 Rating';
        document.getElementById('auto-number').textContent = 'A1';
        document.getElementById('auto-registration').textContent = 'DL01AB1234';
        document.getElementById('auto-capacity').textContent = '4 seats';
        document.getElementById('auto-location').textContent = formatLocation('Gate2');
    } catch (error) {
        console.error('Error loading driver profile:', error);
        // Fallback data
        document.getElementById('driver-total-rides').textContent = '0 Completed Rides';
        document.getElementById('driver-rating').textContent = '0.0 Rating';
        document.getElementById('auto-number').textContent = 'Not assigned';
        document.getElementById('auto-registration').textContent = 'N/A';
        document.getElementById('auto-capacity').textContent = '4 seats';
        document.getElementById('auto-location').textContent = 'Not set';
    }
}

function updateDriverStatusButtons() {
    const currentStatus = document.getElementById('current-driver-status');
    if (!currentStatus) return;
    
    const statusText = currentStatus.textContent.toLowerCase().replace(' ', '_');
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-status') === statusText) {
            btn.classList.add('active');
        }
    });
}

async function updateDriverStatus(status) {
    try {
        // Demo status update
        document.getElementById('current-driver-status').textContent = formatDriverStatus(status);
        updateDriverStatusButtons();
        
        // Send real-time update
        if (socket) {
            socket.emit('driver_status_update', {
                driver_id: currentUser.id,
                driver_name: currentUser.name,
                is_available: status === 'available',
                timestamp: new Date().toISOString()
            });
        }
        
        showNotification(`Status updated to: ${formatDriverStatus(status)}`, 'success');
    } catch (error) {
        console.error('Status update error:', error);
        showNotification('Failed to update status', 'error');
    }
}

async function handleUpdateLocation(e) {
    e.preventDefault();
    
    const location = document.getElementById('driver-location').value;
    const availableSeats = document.getElementById('available-seats').value;
    
    if (!location) {
        showNotification('Please select a location', 'error');
        return;
    }
    
    try {
        // Send real-time location update
        if (socket) {
            socket.emit('driver_location_update', {
                driver_id: currentUser.id,
                auto_id: 1, // Demo auto ID
                current_location: location,
                available_seats: parseInt(availableSeats),
                timestamp: new Date().toISOString()
            });
        }
        
        document.getElementById('auto-location').textContent = formatLocation(location);
        showNotification('Location updated successfully!', 'success');
    } catch (error) {
        console.error('Location update error:', error);
        showNotification('Failed to update location', 'error');
    }
}

function updateDriverLocationDisplay() {
    const locationElement = document.getElementById('auto-location');
    if (locationElement) {
        const realTimeLocation = realTimeData.driverLocations.get(currentUser.id);
        if (realTimeLocation) {
            locationElement.textContent = formatLocation(realTimeLocation.current_location);
            locationElement.innerHTML += ' <span class="real-time-indicator"><span class="pulse-dot"></span> Live</span>';
        }
    }
}

async function loadDriverActiveRide() {
    try {
        // Demo data - no active ride
        displayActiveRide(null);
    } catch (error) {
        console.error('Error loading active ride:', error);
        displayActiveRide(null);
    }
}

function displayActiveRide(ride) {
    const container = document.getElementById('active-ride');
    if (!container) return;
    
    if (!ride) {
        container.innerHTML = `
            <div class="no-ride">
                <i class="fas fa-info-circle"></i>
                <p>No active ride requests</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="active-ride-card">
            <div class="ride-header">
                <strong>Ride #${ride.ride_id}</strong>
                <span class="status-badge status-${ride.status}">${ride.status}</span>
            </div>
            <div class="ride-details">
                <div><strong>Student:</strong> ${ride.student_name}</div>
                <div><strong>From:</strong> ${formatLocation(ride.pickup_point)}</div>
                <div><strong>To:</strong> ${formatLocation(ride.dropoff_point)}</div>
                <div><strong>Requested:</strong> ${new Date(ride.created_at).toLocaleTimeString()}</div>
            </div>
            <div class="ride-actions">
                <button class="btn-success" onclick="updateRideStatus(${ride.ride_id}, 'in-progress')">
                    <i class="fas fa-play"></i> Start Ride
                </button>
                <button class="btn-primary" onclick="updateRideStatus(${ride.ride_id}, 'completed')">
                    <i class="fas fa-flag-checkered"></i> Complete
                </button>
                <button class="btn-danger" onclick="updateRideStatus(${ride.ride_id}, 'cancelled')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
}

function showDriverRideRequest(rideData) {
    const container = document.getElementById('active-ride');
    if (!container) return;
    
    container.innerHTML = `
        <div class="active-ride-card">
            <div class="ride-header">
                <strong>New Ride Request</strong>
                <span class="real-time-indicator"><span class="pulse-dot"></span> New</span>
            </div>
            <div class="ride-details">
                <div><strong>Student:</strong> ${rideData.student_name}</div>
                <div><strong>From:</strong> ${formatLocation(rideData.pickup_point)}</div>
                <div><strong>To:</strong> ${formatLocation(rideData.dropoff_point)}</div>
                <div><strong>Requested:</strong> ${new Date(rideData.created_at).toLocaleTimeString()}</div>
            </div>
            <div class="ride-actions">
                <button class="btn-success" onclick="acceptRideRequest(${rideData.ride_id})">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn-danger" onclick="rejectRideRequest(${rideData.ride_id})">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        </div>
    `;
    
    showNotification('New ride request received!', 'info');
}

async function acceptRideRequest(rideId) {
    await updateRideStatus(rideId, 'accepted');
}

async function rejectRideRequest(rideId) {
    await updateRideStatus(rideId, 'rejected');
}

async function updateRideStatus(rideId, status) {
    try {
        if (socket) {
            socket.emit('update_ride_status', {
                ride_id: rideId,
                status: status,
                driver_id: currentUser.id
            });
        }
        
        showNotification(`Ride ${status} successfully!`, 'success');
        loadDriverActiveRide();
    } catch (error) {
        console.error('Ride status update error:', error);
        showNotification('Failed to update ride status', 'error');
    }
}

// ========== ADMIN DASHBOARD ==========

function initializeAdminDashboard() {
    console.log('Initializing admin dashboard...');
    
    // Setup admin tab system
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showAdminTab(tabName);
        });
    });
    
    // Initialize admin map
    initializeAdminMap();
    
    // Add profile card to admin dashboard
    addProfileCard('admin');
}

function showAdminTab(tabName) {
    console.log('Showing admin tab:', tabName);
    
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab and activate button
    const tabElement = document.getElementById(`${tabName}-tab`);
    const buttonElement = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (tabElement) tabElement.classList.add('active');
    if (buttonElement) buttonElement.classList.add('active');
    
    // Load tab-specific data
    switch (tabName) {
        case 'overview':
            loadAdminOverview();
            break;
        case 'students':
            loadAdminStudents();
            break;
        case 'drivers':
            loadAdminDrivers();
            break;
        case 'autos':
            loadAdminAutos();
            break;
        case 'rides':
            loadAdminRides();
            break;
    }
}

async function loadAdminDashboard() {
    await loadAdminStats();
    showAdminTab('overview');
}

async function loadAdminStats() {
    try {
        // Demo data for admin stats
        realTimeData.systemStats = {
            totalStudents: 3,
            totalDrivers: 3,
            totalRides: 127,
            activeAutos: 2,
            pendingRides: 1
        };
        updateSystemStatsDisplay();
    } catch (error) {
        console.error('Error loading stats:', error);
        // Fallback data
        realTimeData.systemStats = {
            totalStudents: 3,
            totalDrivers: 3,
            totalRides: 127,
            activeAutos: 2,
            pendingRides: 1
        };
        updateSystemStatsDisplay();
    }
}

function updateSystemStatsDisplay() {
    const stats = realTimeData.systemStats;
    
    const totalStudentsEl = document.getElementById('total-students');
    const totalDriversEl = document.getElementById('total-drivers');
    const totalRidesEl = document.getElementById('total-rides');
    const activeAutosEl = document.getElementById('active-autos');
    const onDutyDriversEl = document.getElementById('on-duty-drivers');
    const pendingRidesEl = document.getElementById('pending-rides');
    
    if (totalStudentsEl) totalStudentsEl.textContent = `${stats.totalStudents} Students`;
    if (totalDriversEl) totalDriversEl.textContent = `${stats.totalDrivers} Drivers`;
    if (totalRidesEl) totalRidesEl.textContent = `${stats.totalRides} Rides`;
    if (activeAutosEl) activeAutosEl.textContent = `${stats.activeAutos}/${stats.totalDrivers} Active`;
    if (onDutyDriversEl) onDutyDriversEl.textContent = `${stats.activeAutos}/${stats.totalDrivers} On Duty`;
    if (pendingRidesEl) pendingRidesEl.textContent = `${stats.pendingRides} Pending`;
}

async function loadAdminOverview() {
    await loadAdminStats();
    updateAdminRealTimeData();
}

// async function loadAdminStudents() {
//     try {
//         // Demo data for testing
//         const demoStudents = [
//             {student_id: 1, roll_number: '2023001', full_name: 'Amit Sharma', email: 'amit.sharma@sau.ac.in', department: 'CSE', hostel_name: 'Hostel-A', total_rides_taken: 15, is_active: true},
//             {student_id: 2, roll_number: '2023002', full_name: 'Priya Singh', email: 'priya.singh@sau.ac.in', department: 'ECE', hostel_name: 'Hostel-B', total_rides_taken: 12, is_active: true},
//             {student_id: 3, roll_number: '2023003', full_name: 'Rahul Verma', email: 'rahul.verma@sau.ac.in', department: 'Management', hostel_name: 'Hostel-C', total_rides_taken: 8, is_active: true}
//         ];
//         displayAdminStudents(demoStudents);
//     } catch (error) {
//         console.error('Error loading students:', error);
//         // Demo data
//         const demoStudents = [
//             {roll_number: '2023001', full_name: 'Amit Sharma', email: 'amit.sharma@sau.ac.in', department: 'CSE', hostel_name: 'Hostel-A', total_rides_taken: 15, is_active: true, student_id: 1},
//             {roll_number: '2023002', full_name: 'Priya Singh', email: 'priya.singh@sau.ac.in', department: 'ECE', hostel_name: 'Hostel-B', total_rides_taken: 12, is_active: true, student_id: 2},
//             {roll_number: '2023003', full_name: 'Rahul Verma', email: 'rahul.verma@sau.ac.in', department: 'Management', hostel_name: 'Hostel-C', total_rides_taken: 8, is_active: true, student_id: 3}
//         ];
//         displayAdminStudents(demoStudents);
//     }
// }

// async function loadAdminStudents() {
//     try {
//         // Try to get REAL data from API first
//         const response = await fetch(`${API_BASE_URL}/admin/students`, {
//             headers: {
//                 'Authorization': `Bearer ${authToken}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         if (response.ok) {
//             const realStudents = await response.json();
//             console.log('📊 Loaded real students from database:', realStudents.length);
//             displayAdminStudents(realStudents);
//         } else {
//             throw new Error('API not available');
//         }
//     } catch (error) {
//         console.error('❌ Error loading real students, using demo data:', error);
        
//         // Fallback to demo data
//         const demoStudents = [
//             {student_id: 1, roll_number: '2023001', full_name: 'Amit Sharma', email: 'amit.sharma@sau.ac.in', department: 'CSE', hostel_name: 'Hostel-A', total_rides_taken: 15, is_active: true},
//             {student_id: 2, roll_number: '2023002', full_name: 'Priya Singh', email: 'priya.singh@sau.ac.in', department: 'ECE', hostel_name: 'Hostel-B', total_rides_taken: 12, is_active: true},
//             {student_id: 3, roll_number: '2023003', full_name: 'Rahul Verma', email: 'rahul.verma@sau.ac.in', department: 'Management', hostel_name: 'Hostel-C', total_rides_taken: 8, is_active: true}
//         ];
//         displayAdminStudents(demoStudents);
        
//         // Show warning about demo mode
//         showNotification('Using demo data - real database connection failed', 'warning');
//     }
// }
// Enhanced function to load REAL data
async function loadAdminStudents() {
    try {
        console.log('📊 Loading REAL students from database...');
        const response = await fetch(`${API_BASE_URL}/admin/students`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const realStudents = await response.json();
            console.log('✅ Loaded REAL students:', realStudents);
            displayAdminStudents(realStudents);
        } else {
            throw new Error(`API returned ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Failed to load real students:', error);
        // Show error but don't fall back to demo data
        showNotification('Failed to load students from database', 'error');
        displayAdminStudents([]);
    }
}


// function displayAdminStudents(students) {
//     const tbody = document.getElementById('students-tbody');
//     if (!tbody) return;
    
//     tbody.innerHTML = students.map(student => `
//         <tr>
//             <td>${student.roll_number}</td>
//             <td>${student.full_name}</td>
//             <td>${student.email}</td>
//             <td>${student.department || '-'}</td>
//             <td>${student.hostel_name || '-'}</td>
//             <td>${student.total_rides_taken || 0}</td>
//             <td><span class="status-badge ${student.is_active !== false ? 'active' : 'inactive'}">${student.is_active !== false ? 'Active' : 'Inactive'}</span></td>
//             <td>
//                 <div class="action-buttons">
//                     <button class="btn-edit small" onclick="editStudent(${student.student_id})">
//                         <i class="fas fa-edit"></i> Edit
//                     </button>
//                     <button class="btn-danger small" onclick="showDeleteStudentConfirmation(${student.student_id}, '${student.full_name}')">
//                         <i class="fas fa-trash"></i> Delete
//                     </button>
//                 </div>
//             </td>
//         </tr>
//     `).join('');
// }

function displayAdminStudents(students) {
    const tbody = document.getElementById('students-tbody');
    if (!tbody) return;
    
    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-medium);">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.5;"></i>
                    No students found in database
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.roll_number}</td>
            <td>${student.full_name}</td>
            <td>${student.email}</td>
            <td>${student.department || '-'}</td>
            <td>${student.hostel_name || '-'}</td>
            <td>${student.total_rides_taken || 0}</td>
            <td>
                <span class="status-badge ${student.is_active ? 'active' : 'inactive'}">
                    ${student.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit small" onclick="editStudent(${student.student_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-danger small" onclick="showDeleteStudentConfirmation(${student.student_id}, '${student.full_name}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}


// async function loadAdminDrivers() {
//     try {
//         // Demo data for testing
//         const demoDrivers = [
//             {driver_id: 1, full_name: 'Rajesh Kumar', phone_number: '9876543210', auto_number: 'A1', is_available: true, total_rides_completed: 45, rating: 4.5},
//             {driver_id: 2, full_name: 'Mohan Singh', phone_number: '9876543211', auto_number: 'A2', is_available: true, total_rides_completed: 38, rating: 4.2},
//             {driver_id: 3, full_name: 'Suresh Patel', phone_number: '9876543212', auto_number: 'A3', is_available: false, total_rides_completed: 52, rating: 4.7}
//         ];
//         displayAdminDrivers(demoDrivers);
//     } catch (error) {
//         console.error('Error loading drivers:', error);
//         // Demo data
//         const demoDrivers = [
//             {driver_id: 1, full_name: 'Rajesh Kumar', phone_number: '9876543210', auto_number: 'A1', is_available: true, total_rides_completed: 45, rating: 4.5},
//             {driver_id: 2, full_name: 'Mohan Singh', phone_number: '9876543211', auto_number: 'A2', is_available: true, total_rides_completed: 38, rating: 4.2},
//             {driver_id: 3, full_name: 'Suresh Patel', phone_number: '9876543212', auto_number: 'A3', is_available: false, total_rides_completed: 52, rating: 4.7}
//         ];
//         displayAdminDrivers(demoDrivers);
//     }
// }
async function loadAdminDrivers() {
    try {
        console.log('📊 Loading REAL drivers from database...');
        const response = await fetch(`${API_BASE_URL}/admin/drivers`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const realDrivers = await response.json();
            console.log('✅ Loaded REAL drivers:', realDrivers);
            displayAdminDrivers(realDrivers);
        } else {
            throw new Error(`API returned ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Failed to load real drivers:', error);
        showNotification('Failed to load drivers from database', 'error');
        displayAdminDrivers([]);
    }
}

function displayAdminDrivers(drivers) {
    const tbody = document.getElementById('drivers-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = drivers.map(driver => {
        const status = driver.is_available ? 'available' : 'off_duty';
        const realTimeLocation = realTimeData.driverLocations.get(driver.driver_id);
        const currentLocation = realTimeLocation ? realTimeLocation.current_location : (driver.current_location || 'Not set');
        
        return `
        <tr>
            <td>D${driver.driver_id}</td>
            <td>${driver.full_name}</td>
            <td>${driver.phone_number}</td>
            <td>${driver.auto_number || 'Not assigned'}</td>
            <td>${formatLocation(currentLocation)} ${realTimeLocation ? '<span class="real-time-indicator"><span class="pulse-dot"></span></span>' : ''}</td>
            <td><span class="status-badge status-${status}">${formatDriverStatus(status)}</span></td>
            <td>${driver.total_rides_completed || 0}</td>
            <td>${driver.rating ? driver.rating.toFixed(1) + ' ⭐' : 'No ratings'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit small" onclick="editDriver(${driver.driver_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-danger small" onclick="showDeleteDriverConfirmation(${driver.driver_id}, '${driver.full_name}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// async function loadAdminAutos() {
//     try {
//         // Demo data for testing
//         const demoAutos = [
//             {auto_id: 1, auto_number: 'A1', registration_number: 'DL01AB1234', auto_type: 'Mahindra Treo', seating_capacity: 4, current_location: 'Gate2', driver_name: 'Rajesh Kumar', is_available: true},
//             {auto_id: 2, auto_number: 'A2', registration_number: 'DL01CD5678', auto_type: 'Kinetic Green', seating_capacity: 4, current_location: 'Gate1', driver_name: 'Mohan Singh', is_available: true},
//             {auto_id: 3, auto_number: 'A3', registration_number: 'DL01EF9012', auto_type: 'Yatri Eride', seating_capacity: 4, current_location: 'Satbari', driver_name: 'Suresh Patel', is_available: false}
//         ];
//         displayAdminAutos(demoAutos);
//     } catch (error) {
//         console.error('Error loading autos:', error);
//         // Demo data
//         const demoAutos = [
//             {auto_number: 'A1', registration_number: 'DL01AB1234', auto_type: 'Mahindra Treo', seating_capacity: 4, current_location: 'Gate2', driver_name: 'Rajesh Kumar', is_available: true, auto_id: 1},
//             {auto_number: 'A2', registration_number: 'DL01CD5678', auto_type: 'Kinetic Green', seating_capacity: 4, current_location: 'Gate1', driver_name: 'Mohan Singh', is_available: true, auto_id: 2},
//             {auto_number: 'A3', registration_number: 'DL01EF9012', auto_type: 'Yatri Eride', seating_capacity: 4, current_location: 'Satbari', driver_name: 'Suresh Patel', is_available: false, auto_id: 3}
//         ];
//         displayAdminAutos(demoAutos);
//     }
// }
async function loadAdminAutos() {
    try {
        console.log('📊 Loading REAL autos from database...');
        const response = await fetch(`${API_BASE_URL}/admin/autos`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const realAutos = await response.json();
            console.log('✅ Loaded REAL autos:', realAutos);
            displayAdminAutos(realAutos);
        } else {
            throw new Error(`API returned ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Failed to load real autos:', error);
        showNotification('Failed to load autos from database', 'error');
        displayAdminAutos([]);
    }
}

function displayAdminAutos(autos) {
    const tbody = document.getElementById('autos-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = autos.map(auto => {
        const realTimeLocation = realTimeData.driverLocations.get(auto.driver_id);
        const currentLocation = realTimeLocation ? realTimeLocation.current_location : (auto.current_location || 'Not set');
        
        return `
        <tr>
            <td>${auto.auto_number}</td>
            <td>${auto.registration_number || 'N/A'}</td>
            <td>${auto.auto_type || 'E-Rickshaw'}</td>
            <td>${auto.seating_capacity} seats</td>
            <td>${formatLocation(currentLocation)} ${realTimeLocation ? '<span class="real-time-indicator"><span class="pulse-dot"></span></span>' : ''}</td>
            <td>${auto.driver_name || 'Not assigned'}</td>
            <td><span class="status-badge ${auto.is_available ? 'available' : 'unavailable'}">${auto.is_available ? 'Available' : 'Unavailable'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit small" onclick="editAuto(${auto.auto_id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-danger small" onclick="showDeleteAutoConfirmation(${auto.auto_id}, '${auto.auto_number}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

async function loadAdminRides() {
    try {
        // Demo data for testing
        const demoRides = [
            {ride_id: 1, student_name: 'Amit Sharma', driver_name: 'Rajesh Kumar', auto_number: 'A1', pickup_point: 'Gate1', dropoff_point: 'Hostel Block A', created_at: new Date().toISOString(), status: 'completed'},
            {ride_id: 2, student_name: 'Priya Singh', driver_name: 'Mohan Singh', auto_number: 'A2', pickup_point: 'Gate2', dropoff_point: 'Academic Block', created_at: new Date(Date.now() - 86400000).toISOString(), status: 'completed'},
            {ride_id: 3, student_name: 'Rahul Verma', driver_name: 'Suresh Patel', auto_number: 'A3', pickup_point: 'Satbari', dropoff_point: 'Gate1', created_at: new Date(Date.now() - 172800000).toISOString(), status: 'in-progress'}
        ];
        displayAdminRides(demoRides);
    } catch (error) {
        console.error('Error loading rides:', error);
        displayAdminRides([]);
    }
}

function displayAdminRides(rides) {
    const tbody = document.getElementById('rides-tbody');
    if (!tbody) return;
    
    if (!rides || rides.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--light-blue);">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px; display: block; opacity: 0.5;"></i>
                    No rides found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = rides.map(ride => `
        <tr>
            <td>${ride.ride_id}</td>
            <td>${ride.student_name}</td>
            <td>${ride.driver_name}</td>
            <td>${ride.auto_number}</td>
            <td>${formatLocation(ride.pickup_point)}</td>
            <td>${formatLocation(ride.dropoff_point)}</td>
            <td>${new Date(ride.created_at).toLocaleDateString()}</td>
            <td><span class="status-badge status-${ride.status}">${ride.status}</span></td>
        </tr>
    `).join('');
}

function updateAdminRealTimeData() {
    // Update all admin tables with real-time data
    if (document.getElementById('drivers-tbody')) {
        loadAdminDrivers();
    }
    if (document.getElementById('autos-tbody')) {
        loadAdminAutos();
    }
    if (document.getElementById('rides-tbody')) {
        loadAdminRides();
    }
}

// ========== ADMIN FORM HANDLERS ==========

async function handleAddAuto(e) {
    e.preventDefault();
    
    const autoNumber = document.getElementById('admin-auto-number').value;
    const autoType = document.getElementById('admin-auto-type').value;
    const seatingCapacity = document.getElementById('admin-auto-capacity').value;
    const currentLocation = document.getElementById('admin-auto-location').value;
    
    try {
        // Demo auto addition
        showNotification('Vehicle added successfully! (Demo)', 'success');
        document.getElementById('add-auto-form').reset();
        loadAdminAutos();
        loadAdminStats();
    } catch (error) {
        console.error('Error adding auto:', error);
        showNotification('Vehicle added successfully! (Demo)', 'success');
        document.getElementById('add-auto-form').reset();
        loadAdminAutos();
    }
}

async function handleAddDriver(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('admin-driver-name').value;
    const email = document.getElementById('admin-driver-email').value;
    const phoneNumber = document.getElementById('admin-driver-phone').value;
    const licenseNumber = document.getElementById('admin-driver-license').value;
    const autoId = document.getElementById('admin-driver-auto').value;
    
    try {
        // Demo driver addition
        showNotification('Driver registered successfully! (Demo)', 'success');
        document.getElementById('add-driver-form').reset();
        loadAdminDrivers();
        loadAdminStats();
    } catch (error) {
        console.error('Error adding driver:', error);
        showNotification('Driver registered successfully! (Demo)', 'success');
        document.getElementById('add-driver-form').reset();
        loadAdminDrivers();
    }
}

// ========== ADMIN DELETE FUNCTIONS ==========

function showDeleteStudentConfirmation(studentId, studentName) {
    ModalManager.showConfirmation(
        'Delete Student',
        `Are you sure you want to delete student "${studentName}"? This action cannot be undone.`,
        `deleteStudent(${studentId}, '${studentName.replace(/'/g, "\\'")}')`
    );
}

async function deleteStudent(studentId, studentName) {
    try {
        // Demo deletion
        showNotification('Student deleted successfully! (Demo)', 'success');
        loadAdminStudents();
        loadAdminStats();
    } catch (error) {
        console.error('Error deleting student:', error);
        showNotification('Student deleted successfully! (Demo)', 'success');
        loadAdminStudents();
    }
}

function showDeleteDriverConfirmation(driverId, driverName) {
    ModalManager.showConfirmation(
        'Delete Driver',
        `Are you sure you want to delete driver "${driverName}"? This action cannot be undone.`,
        `deleteDriver(${driverId}, '${driverName.replace(/'/g, "\\'")}')`
    );
}

async function deleteDriver(driverId, driverName) {
    try {
        // Demo deletion
        showNotification('Driver deleted successfully! (Demo)', 'success');
        loadAdminDrivers();
        loadAdminStats();
    } catch (error) {
        console.error('Error deleting driver:', error);
        showNotification('Driver deleted successfully! (Demo)', 'success');
        loadAdminDrivers();
    }
}

function showDeleteAutoConfirmation(autoId, autoNumber) {
    ModalManager.showConfirmation(
        'Delete Vehicle',
        `Are you sure you want to delete vehicle "${autoNumber}"? This action cannot be undone.`,
        `deleteAuto(${autoId}, '${autoNumber.replace(/'/g, "\\'")}')`
    );
}

async function deleteAuto(autoId, autoNumber) {
    try {
        // Demo deletion
        showNotification('Vehicle deleted successfully! (Demo)', 'success');
        loadAdminAutos();
        loadAdminStats();
    } catch (error) {
        console.error('Error deleting auto:', error);
        showNotification('Vehicle deleted successfully! (Demo)', 'success');
        loadAdminAutos();
    }
}

// ========== ADMIN REFRESH FUNCTIONS ==========

async function refreshStudents() {
    await loadAdminStudents();
    showNotification('Students list refreshed', 'info');
}

async function refreshDrivers() {
    await loadAdminDrivers();
    showNotification('Drivers list refreshed', 'info');
}

async function refreshAutos() {
    await loadAdminAutos();
    showNotification('Vehicles list refreshed', 'info');
}

async function refreshRides() {
    await loadAdminRides();
    showNotification('Rides list refreshed', 'info');
}

// ========== ADMIN EDIT FUNCTIONS ==========

async function editStudent(studentId) {
    ModalManager.showModal(
        'Edit Student',
        'Student editing functionality is coming soon in the next update.',
        'info'
    );
}

async function editDriver(driverId) {
    ModalManager.showModal(
        'Edit Driver',
        'Driver editing functionality is coming soon in the next update.',
        'info'
    );
}

async function editAuto(autoId) {
    ModalManager.showModal(
        'Edit Vehicle',
        'Vehicle editing functionality is coming soon in the next update.',
        'info'
    );
}

// ========== MAP FUNCTIONS ==========

function initializeStudentMap() {
    const mapElement = document.getElementById('campus-map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div class="fallback-map">
                <div class="fallback-content">
                    <i class="fas fa-map-marked-alt"></i>
                    <h4>Campus Navigation Map</h4>
                    <p>Interactive campus map showing vehicle locations</p>
                    <div class="map-legend">
                        <div class="legend-item">
                            <div class="legend-marker auto-marker"></div>
                            <span>Available Vehicles</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-marker student-marker"></div>
                            <span>Your Location</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function initializeDriverMap() {
    const mapElement = document.getElementById('driver-map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div class="fallback-map">
                <div class="fallback-content">
                    <i class="fas fa-road"></i>
                    <h4>Navigation & Routes</h4>
                    <p>Real-time navigation and route optimization</p>
                    <div class="real-time-indicator">
                        <span class="pulse-dot"></span> Live GPS Tracking Active
                    </div>
                </div>
            </div>
        `;
    }
}

function initializeAdminMap() {
    const mapElement = document.getElementById('admin-map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div class="fallback-map">
                <div class="fallback-content">
                    <i class="fas fa-globe"></i>
                    <h4>Live Vehicle Tracking</h4>
                    <p>Real-time tracking of all vehicles and rides</p>
                    <div class="real-time-indicator">
                        <span class="pulse-dot"></span> Live System Monitoring
                    </div>
                </div>
            </div>
        `;
    }
}

// ========== UTILITY FUNCTIONS ==========

function formatLocation(location) {
    const locations = {
        'Gate1': 'Gate 1',
        'Gate2': 'Gate 2',
        'Satbari': 'Satbari',
        'OnRoute': 'On Route',
        'Hostel Block A': 'Hostel Block A',
        'Academic Block': 'Academic Block'
    };
    return locations[location] || location;
}

function formatDriverStatus(status) {
    const statusMap = {
        'available': 'Available',
        'on_break': 'On Break',
        'off_duty': 'Off Duty',
        'on_trip': 'On Trip'
    };
    return statusMap[status] || status;
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Update real-time status display across all dashboards
function updateRealTimeStatusDisplay() {
    if (currentUser) {
        switch (currentUser.userType) {
            case 'student':
                updateStudentAutoLocations();
                break;
            case 'driver':
                updateDriverLocationDisplay();
                break;
            case 'admin':
                updateAdminRealTimeData();
                break;
        }
    }
}

function updateRealTimeRideDisplay() {
    if (currentUser) {
        switch (currentUser.userType) {
            case 'student':
                loadRideHistory();
                break;
            case 'driver':
                loadDriverActiveRide();
                break;
            case 'admin':
                loadAdminRides();
                break;
        }
    }
}

// Export functions for global access
window.selectUserType = selectUserType;
window.goBackToUserType = goBackToUserType;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.logout = logout;
window.requestRide = requestRide;
window.updateDriverStatus = updateDriverStatus;
window.acceptRideRequest = acceptRideRequest;
window.rejectRideRequest = rejectRideRequest;
window.updateRideStatus = updateRideStatus;
window.showAdminTab = showAdminTab;
window.editStudent = editStudent;
window.editDriver = editDriver;
window.editAuto = editAuto;
window.deleteStudent = deleteStudent;
window.deleteDriver = deleteDriver;
window.deleteAuto = deleteAuto;
window.refreshStudents = refreshStudents;
window.refreshDrivers = refreshDrivers;
window.refreshAutos = refreshAutos;
window.refreshRides = refreshRides;
window.showDeleteStudentConfirmation = showDeleteStudentConfirmation;
window.showDeleteDriverConfirmation = showDeleteDriverConfirmation;
window.showDeleteAutoConfirmation = showDeleteAutoConfirmation;
window.ModalManager = ModalManager;
window.showProfile = showProfile;
window.switchProfileTab = switchProfileTab;