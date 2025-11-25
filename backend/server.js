const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Enhanced Middleware
app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json());
app.use(express.static('../frontend'));

// Database connection with better error handling
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sau_er_transport',
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Default password hash for admin/driver
const DEFAULT_PASSWORD = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // "password"

// Enhanced Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('🔐 Auth Middleware - Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'sau_transport_secret_key_2024', (err, user) => {
        if (err) {
            console.error('❌ Token verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        console.log('✅ Authenticated user:', user.userType, '-', user.name);
        next();
    });
};

// Database connection helper with retry logic
const createConnection = async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected successfully');
        return connection;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
};

// ============= ENHANCED DATABASE LOGGING =============
async function executeWithLogging(query, params, operation) {
    const connection = await createConnection();
    try {
        console.log(`🗃️ DATABASE ${operation}:`, { query, params });
        const [result] = await connection.execute(query, params);
        console.log(`✅ DATABASE SUCCESS ${operation}:`, result);
        return result;
    } catch (error) {
        console.error(`❌ DATABASE ERROR ${operation}:`, error);
        throw error;
    } finally {
        await connection.end();
    }
}

// ============= AUTHENTICATION ROUTES =============

// Student Registration with Enhanced Logging
app.post('/api/register', async (req, res) => {
    console.log('📝 Registration attempt:', req.body);
    try {
        const { userType, rollNumber, fullName, email, phoneNumber, password, department, hostelName } = req.body;
        
        if (userType !== 'student') {
            return res.status(400).json({ error: 'Only student registration is allowed' });
        }

        // Check existing email with logging
        const existingUsers = await executeWithLogging(
            'SELECT student_id FROM student WHERE email = ?',
            [email],
            'CHECK_EXISTING_EMAIL'
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Check existing roll number with logging
        const existingRoll = await executeWithLogging(
            'SELECT student_id FROM student WHERE roll_number = ?',
            [rollNumber],
            'CHECK_EXISTING_ROLL'
        );
        
        if (existingRoll.length > 0) {
            return res.status(400).json({ error: 'Roll number already registered' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert student with logging
        const result = await executeWithLogging(
            'INSERT INTO student (roll_number, full_name, email, phone_number, department, hostel_name) VALUES (?, ?, ?, ?, ?, ?)',
            [rollNumber, fullName, email, phoneNumber, department, hostelName],
            'INSERT_STUDENT'
        );
        
        // Get the new student with logging
        const newStudents = await executeWithLogging(
            'SELECT student_id, roll_number, full_name, email, phone_number, department, hostel_name, created_at FROM student WHERE student_id = ?',
            [result.insertId],
            'GET_NEW_STUDENT'
        );
        
        const newStudent = newStudents[0];
        
        // EMIT REAL-TIME EVENT
        io.emit('new-student-registered', {
            student_id: newStudent.student_id,
            roll_number: newStudent.roll_number,
            full_name: newStudent.full_name,
            email: newStudent.email,
            phone_number: newStudent.phone_number,
            department: newStudent.department,
            hostel_name: newStudent.hostel_name,
            created_at: newStudent.created_at,
            total_rides_taken: 0,
            is_active: true
        });
        
        console.log('✅ Student registered in MySQL database:', newStudent);
        res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Registration failed - server error' });
    }
});

// Enhanced Login with Debugging
app.post('/api/login', async (req, res) => {
    console.log('🔑 LOGIN ATTEMPT:', { 
        email: req.body.email, 
        userType: req.body.userType,
        passwordLength: req.body.password ? req.body.password.length : 'missing'
    });
    
    try {
        const { email, password, userType } = req.body;
        
        if (!email || !password || !userType) {
            console.log('❌ Missing credentials');
            return res.status(400).json({ error: 'Email, password and user type are required' });
        }

        const connection = await createConnection();
        
        let table, idField, nameField;
        
        switch (userType) {
            case 'admin':
                table = 'admin';
                idField = 'admin_id';
                nameField = 'username';
                break;
            case 'student':
                table = 'student';
                idField = 'student_id';
                nameField = 'full_name';
                break;
            case 'driver':
                table = 'auto_driver';
                idField = 'driver_id';
                nameField = 'full_name';
                break;
            default:
                await connection.end();
                return res.status(400).json({ error: 'Invalid user type' });
        }
        
        console.log(`🔍 Searching in table: ${table} for email: ${email}`);
        
        const [users] = await connection.execute(
            `SELECT * FROM ${table} WHERE email = ?`,
            [email]
        );
        
        if (users.length === 0) {
            await connection.end();
            console.log('❌ Login failed: User not found in database');
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = users[0];
        console.log(`✅ User found: ${user[nameField]}`, { 
            hasPasswordHash: !!user.password_hash,
            userType: userType
        });
        
        let validPassword = false;
        
        // For students with hashed passwords
        if (userType === 'student' && user.password_hash) {
            console.log('🔐 Checking student hashed password...');
            validPassword = await bcrypt.compare(password, user.password_hash);
        } 
        // For admin/driver with default password
        else {
            console.log('🔐 Checking default password...');
            // Use simple comparison for demo
            validPassword = (password === 'password');
            
            // Also try bcrypt comparison
            if (!validPassword && user.password_hash) {
                validPassword = await bcrypt.compare(password, user.password_hash);
            }
        }
        
        console.log(`🔐 Password valid: ${validPassword}`);
        
        if (!validPassword) {
            await connection.end();
            console.log('❌ Login failed: Invalid password');
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const tokenPayload = { 
            id: user[idField], 
            email: user.email, 
            userType: userType,
            name: user[nameField]
        };
        
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'sau_transport_secret_key_2024',
            { expiresIn: '24h' }
        );
        
        await connection.end();
        
        console.log(`✅ LOGIN SUCCESS: ${userType} - ${user[nameField]}`);
        
        res.json({
            success: true,
            token,
            user: {
                id: user[idField],
                name: user[nameField],
                email: user.email,
                userType: userType
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed - server error' });
    }
});

// ============= STUDENT ROUTES =============

// Get available autos
app.get('/api/autos/available', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        
        const [autos] = await connection.execute(`
            SELECT a.*, ad.full_name as driver_name, ad.phone_number as driver_phone
            FROM auto a 
            JOIN auto_driver ad ON a.auto_id = ad.auto_id 
            WHERE a.is_available = TRUE AND ad.is_available = TRUE
        `);
        
        await connection.end();
        console.log(`✅ Sent ${autos.length} available autos to student`);
        res.json(autos);
    } catch (error) {
        console.error('❌ Error fetching autos:', error);
        res.status(500).json({ error: 'Failed to fetch available autos' });
    }
});

// Request a ride
app.post('/api/rides/request', authenticateToken, async (req, res) => {
    try {
        const { auto_id, pickup_point, dropoff_point } = req.body;
        const student_id = req.user.id;
        
        console.log(`🚗 Ride request from student ${student_id} for auto ${auto_id}`);
        
        const connection = await createConnection();
        
        const [drivers] = await connection.execute(
            'SELECT driver_id FROM auto_driver WHERE auto_id = ?',
            [auto_id]
        );
        
        if (drivers.length === 0) {
            await connection.end();
            return res.status(400).json({ error: 'No driver found for this auto' });
        }
        
        const [result] = await connection.execute(
            `INSERT INTO ride (student_id, auto_id, driver_id, pickup_point, dropoff_point, status, created_at) 
             VALUES (?, ?, ?, ?, ?, 'requested', NOW())`,
            [student_id, auto_id, drivers[0].driver_id, pickup_point, dropoff_point]
        );
        
        await connection.end();
        
        // Enhanced real-time update
        const rideData = { 
            ride_id: result.insertId, 
            auto_id, 
            driver_id: drivers[0].driver_id,
            student_id: student_id,
            status: 'requested',
            timestamp: new Date()
        };
        
        io.emit('new-ride-request', rideData);
        console.log(`📢 Emitted new-ride-request event for ride ${result.insertId}`);
        
        res.json({ success: true, ride_id: result.insertId, message: 'Ride requested successfully' });
    } catch (error) {
        console.error('❌ Ride request error:', error);
        res.status(500).json({ error: 'Ride request failed' });
    }
});

// Get student rides
app.get('/api/rides/student', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        
        const [rides] = await connection.execute(`
            SELECT r.*, a.vehicle_number, ad.full_name as driver_name, ad.phone_number as driver_phone
            FROM ride r
            JOIN auto a ON r.auto_id = a.auto_id
            JOIN auto_driver ad ON r.driver_id = ad.driver_id
            WHERE r.student_id = ?
            ORDER BY r.created_at DESC
        `, [req.user.id]);
        
        await connection.end();
        console.log(`✅ Sent ${rides.length} rides to student ${req.user.id}`);
        res.json(rides);
    } catch (error) {
        console.error('❌ Error fetching student rides:', error);
        res.status(500).json({ error: 'Failed to fetch your rides' });
    }
});

// Submit feedback
app.post('/api/feedback', authenticateToken, async (req, res) => {
    try {
        const { ride_id, rating, comments } = req.body;
        const connection = await createConnection();
        
        await connection.execute(
            'INSERT INTO feedback (ride_id, student_id, rating, comments, created_at) VALUES (?, ?, ?, ?, NOW())',
            [ride_id, req.user.id, rating, comments]
        );
        
        await connection.end();
        console.log(`⭐ Feedback submitted for ride ${ride_id}`);
        res.json({ success: true, message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('❌ Feedback error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// ============= DRIVER ROUTES =============

// Get driver rides
app.get('/api/rides/driver', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        
        const [rides] = await connection.execute(`
            SELECT r.*, s.full_name as student_name, s.phone_number as student_phone, a.vehicle_number
            FROM ride r
            JOIN student s ON r.student_id = s.student_id
            JOIN auto a ON r.auto_id = a.auto_id
            WHERE r.driver_id = ?
            ORDER BY r.created_at DESC
        `, [req.user.id]);
        
        await connection.end();
        console.log(`✅ Sent ${rides.length} rides to driver ${req.user.id}`);
        res.json(rides);
    } catch (error) {
        console.error('❌ Error fetching driver rides:', error);
        res.status(500).json({ error: 'Failed to fetch your rides' });
    }
});

// Update ride status
app.put('/api/rides/:ride_id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const connection = await createConnection();
        
        await connection.execute(
            'UPDATE ride SET status = ? WHERE ride_id = ?',
            [status, req.params.ride_id]
        );
        
        await connection.end();
        
        // Enhanced real-time update
        const updateData = { 
            ride_id: req.params.ride_id, 
            status: status,
            timestamp: new Date()
        };
        
        io.emit('ride-status-updated', updateData);
        console.log(`🔄 Ride ${req.params.ride_id} status updated to: ${status}`);
        
        res.json({ success: true, message: 'Ride status updated successfully' });
    } catch (error) {
        console.error('❌ Status update error:', error);
        res.status(500).json({ error: 'Failed to update ride status' });
    }
});

// Update driver availability
app.put('/api/driver/availability', authenticateToken, async (req, res) => {
    try {
        const { is_available } = req.body;
        const connection = await createConnection();
        
        await connection.execute(
            'UPDATE auto_driver SET is_available = ? WHERE driver_id = ?',
            [is_available, req.user.id]
        );
        
        await connection.end();
        console.log(`🚗 Driver ${req.user.id} availability set to: ${is_available}`);
        res.json({ success: true, message: 'Availability updated successfully' });
    } catch (error) {
        console.error('❌ Availability update error:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// ============= ADMIN ROUTES =============

// Get all students - REAL DATA
app.get('/api/admin/students', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        const [students] = await connection.execute(`
            SELECT 
                student_id,
                roll_number,
                full_name,
                email,
                phone_number,
                department,
                hostel_name,
                total_rides_taken,
                is_active,
                created_at
            FROM student 
            ORDER BY created_at DESC
        `);
        await connection.end();
        console.log(`✅ Sent ${students.length} REAL students to admin`);
        res.json(students);
    } catch (error) {
        console.error('❌ Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Get all drivers - REAL DATA
app.get('/api/admin/drivers', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        const [drivers] = await connection.execute(`
            SELECT 
                ad.driver_id,
                ad.driver_code,
                ad.full_name,
                ad.email,
                ad.phone_number,
                ad.license_number,
                ad.experience_years,
                ad.is_available,
                ad.current_status,
                ad.total_rides_completed,
                ad.average_rating,
                a.auto_number,
                a.registration_number
            FROM auto_driver ad
            LEFT JOIN auto a ON ad.auto_id = a.auto_id
            ORDER BY ad.created_at DESC
        `);
        await connection.end();
        console.log(`✅ Sent ${drivers.length} REAL drivers to admin`);
        res.json(drivers);
    } catch (error) {
        console.error('❌ Error fetching drivers:', error);
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

// Get all autos - REAL DATA
app.get('/api/admin/autos', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        const [autos] = await connection.execute(`
            SELECT 
                auto_id,
                auto_number,
                registration_number,
                model,
                capacity,
                current_location,
                is_available,
                created_at
            FROM auto 
            ORDER BY created_at DESC
        `);
        await connection.end();
        console.log(`✅ Sent ${autos.length} REAL autos to admin`);
        res.json(autos);
    } catch (error) {
        console.error('❌ Error fetching autos:', error);
        res.status(500).json({ error: 'Failed to fetch autos' });
    }
});

// Get all rides - REAL DATA
app.get('/api/admin/rides', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        const [rides] = await connection.execute(`
            SELECT 
                r.ride_id,
                s.full_name as student_name,
                ad.full_name as driver_name,
                a.auto_number,
                r.pickup_point,
                r.dropoff_point,
                r.status,
                r.fare,
                r.created_at
            FROM ride r
            JOIN student s ON r.student_id = s.student_id
            JOIN auto_driver ad ON r.driver_id = ad.driver_id
            JOIN auto a ON r.auto_id = a.auto_id
            ORDER BY r.created_at DESC
        `);
        await connection.end();
        console.log(`✅ Sent ${rides.length} REAL rides to admin`);
        res.json(rides);
    } catch (error) {
        console.error('❌ Error fetching rides:', error);
        res.status(500).json({ error: 'Failed to fetch rides' });
    }
});

// Enhanced Add Driver Route with Logging
app.post('/api/admin/drivers', authenticateToken, async (req, res) => {
    console.log('🚗 Adding new driver:', req.body);
    try {
        const { full_name, email, phone_number, license_number, password, auto_id, experience_years } = req.body;
        
        // Check if email already exists with logging
        const existingDrivers = await executeWithLogging(
            'SELECT driver_id FROM auto_driver WHERE email = ?',
            [email],
            'CHECK_EXISTING_DRIVER_EMAIL'
        );
        
        if (existingDrivers.length > 0) {
            return res.status(400).json({ error: 'Driver with this email already exists' });
        }
        
        // Check if license already exists with logging
        const existingLicense = await executeWithLogging(
            'SELECT driver_id FROM auto_driver WHERE license_number = ?',
            [license_number],
            'CHECK_EXISTING_LICENSE'
        );
        
        if (existingLicense.length > 0) {
            return res.status(400).json({ error: 'License number already registered' });
        }
        
        // Generate driver code with logging
        const driverCount = await executeWithLogging(
            'SELECT COUNT(*) as count FROM auto_driver',
            [],
            'COUNT_DRIVERS'
        );
        const driverCode = `D${driverCount[0].count + 1}`;
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert into auto_driver table with logging
        const result = await executeWithLogging(
            `INSERT INTO auto_driver 
            (driver_code, full_name, email, phone_number, license_number, password_hash, auto_id, experience_years, joined_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
            [driverCode, full_name, email, phone_number, license_number, hashedPassword, auto_id, experience_years || 0],
            'INSERT_DRIVER'
        );
        
        // Get the new driver with auto information with logging
        const newDrivers = await executeWithLogging(`
            SELECT 
                ad.driver_id, ad.driver_code, ad.full_name, ad.email, 
                ad.phone_number, ad.license_number, ad.experience_years,
                ad.is_available, ad.current_status, ad.total_rides_completed,
                ad.average_rating, a.auto_number, a.registration_number
            FROM auto_driver ad
            LEFT JOIN auto a ON ad.auto_id = a.auto_id
            WHERE ad.driver_id = ?
        `, [result.insertId], 'GET_NEW_DRIVER');
        
        const newDriver = newDrivers[0];
        
        // EMIT REAL-TIME EVENT TO ADMIN DASHBOARD
        io.emit('new-driver-registered', newDriver);
        console.log('✅ New driver registered and event emitted:', newDriver.full_name);
        
        res.json({ 
            success: true, 
            message: 'Driver registered successfully',
            driver: newDriver
        });
    } catch (error) {
        console.error('❌ Error adding driver:', error);
        res.status(500).json({ error: 'Failed to add driver' });
    }
});

// Enhanced Add Auto Route with Logging
app.post('/api/admin/autos', authenticateToken, async (req, res) => {
    console.log('🚗 Adding new auto:', req.body);
    try {
        const { auto_number, registration_number, model, capacity, current_location } = req.body;
        
        // Check if auto number already exists with logging
        const existingAutos = await executeWithLogging(
            'SELECT auto_id FROM auto WHERE auto_number = ?',
            [auto_number],
            'CHECK_EXISTING_AUTO_NUMBER'
        );
        
        if (existingAutos.length > 0) {
            return res.status(400).json({ error: 'Auto number already exists' });
        }
        
        // Check if registration number already exists with logging
        const existingReg = await executeWithLogging(
            'SELECT auto_id FROM auto WHERE registration_number = ?',
            [registration_number],
            'CHECK_EXISTING_REGISTRATION'
        );
        
        if (existingReg.length > 0) {
            return res.status(400).json({ error: 'Registration number already exists' });
        }
        
        const result = await executeWithLogging(
            'INSERT INTO auto (auto_number, registration_number, model, capacity, current_location) VALUES (?, ?, ?, ?, ?)',
            [auto_number, registration_number, model, capacity, current_location],
            'INSERT_AUTO'
        );
        
        // Get the new auto with logging
        const newAutos = await executeWithLogging(
            'SELECT * FROM auto WHERE auto_id = ?',
            [result.insertId],
            'GET_NEW_AUTO'
        );
        
        const newAuto = newAutos[0];
        
        // EMIT REAL-TIME EVENT TO ADMIN DASHBOARD
        io.emit('new-auto-registered', newAuto);
        console.log('✅ New auto registered and event emitted:', newAuto.auto_number);
        
        res.json({ 
            success: true, 
            message: 'Auto registered successfully',
            auto: newAuto
        });
    } catch (error) {
        console.error('❌ Error adding auto:', error);
        res.status(500).json({ error: 'Failed to add auto' });
    }
});

// Delete student
app.delete('/api/admin/students/:id', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        await connection.execute('DELETE FROM student WHERE student_id = ?', [req.params.id]);
        await connection.end();
        console.log(`🗑️ Admin deleted student: ${req.params.id}`);
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

// Delete driver
app.delete('/api/admin/drivers/:id', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        await connection.execute('DELETE FROM auto_driver WHERE driver_id = ?', [req.params.id]);
        await connection.end();
        console.log(`🗑️ Admin deleted driver: ${req.params.id}`);
        res.json({ success: true, message: 'Driver deleted successfully' });
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ error: 'Failed to delete driver' });
    }
});

// Delete auto
app.delete('/api/admin/autos/:id', authenticateToken, async (req, res) => {
    try {
        const connection = await createConnection();
        await connection.execute('DELETE FROM auto WHERE auto_id = ?', [req.params.id]);
        await connection.end();
        console.log(`🗑️ Admin deleted auto: ${req.params.id}`);
        res.json({ success: true, message: 'Auto deleted successfully' });
    } catch (error) {
        console.error('❌ Delete error:', error);
        res.status(500).json({ error: 'Failed to delete auto' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'SAU Transport Backend'
    });
});

// ============= ENHANCED SOCKET.IO REAL-TIME =============

io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);
    
    socket.on('driver-location-update', async (data) => {
        try {
            const connection = await createConnection();
            await connection.execute(
                'UPDATE auto SET current_location = ? WHERE auto_id = ?',
                [data.location, data.auto_id]
            );
            await connection.end();
            socket.broadcast.emit('location-updated', data);
            console.log(`📍 Location updated for auto ${data.auto_id}`);
        } catch (error) {
            console.error('❌ Location update error:', error);
        }
    });
    
    socket.on('join-driver-room', (driverId) => {
        socket.join(`driver-${driverId}`);
        console.log(`🚗 Driver ${driverId} joined their room`);
    });
    
    socket.on('join-student-room', (studentId) => {
        socket.join(`student-${studentId}`);
        console.log(`🎓 Student ${studentId} joined their room`);
    });
    
    socket.on('join-admin-room', () => {
        socket.join('admin-room');
        console.log(`👨‍💼 Admin joined admin room`);
    });

    // Real-time event handlers for admin dashboard
    socket.on('new-student-registered', (studentData) => {
        console.log('📢 REAL-TIME: New student registered', studentData);
        socket.broadcast.emit('new-student-registered', studentData);
    });

    socket.on('new-driver-registered', (driverData) => {
        console.log('📢 REAL-TIME: New driver registered', driverData);
        socket.broadcast.emit('new-driver-registered', driverData);
    });

    socket.on('new-auto-registered', (autoData) => {
        console.log('📢 REAL-TIME: New auto registered', autoData);
        socket.broadcast.emit('new-auto-registered', autoData);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

// ============= SERVER START =============

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 SAU Transport Server running on port ${PORT}`);
    console.log(`📱 Access: http://localhost:${PORT}`);
    console.log(`\n🔑 Demo Login Credentials:`);
    console.log(`   👨‍💼 Admin: admin@sau.ac.in / password`);
    console.log(`   🎓 Student: amit.sharma@sau.ac.in / password`);
    console.log(`   🚗 Driver: rajesh.driver@sau.ac.in / password`);
    console.log(`\n✅ Backend is ready with enhanced real-time features!`);
});

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});