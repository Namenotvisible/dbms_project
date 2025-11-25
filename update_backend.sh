#!/bin/bash

echo "🔄 Updating backend with login fixes..."

cd /Users/sp/Desktop/SAU_Transport/backend

# Create backup of server.js
cp server.js server.js.backup

# Create the updated server.js file
cat > server.js << 'EOF'
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
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Database connection
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Default password hash (for demo purposes)
const DEFAULT_PASSWORD = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // "password"

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes

// User Registration (Students only) - UPDATED
app.post('/api/register', async (req, res) => {
    try {
        const { userType, rollNumber, fullName, email, phoneNumber, password, department, hostelName } = req.body;
        
        if (userType !== 'student') {
            return res.status(400).json({ error: 'Only student registration is allowed' });
        }

        const connection = await mysql.createConnection(dbConfig);
        
        // Check if email already exists
        const [existingUsers] = await connection.execute(
            'SELECT student_id FROM student WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            await connection.end();
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if roll number already exists
        const [existingRoll] = await connection.execute(
            'SELECT student_id FROM student WHERE roll_number = ?',
            [rollNumber]
        );
        
        if (existingRoll.length > 0) {
            await connection.end();
            return res.status(400).json({ error: 'Roll number already registered' });
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert student WITH password
        const [result] = await connection.execute(
            'INSERT INTO student (roll_number, full_name, email, phone_number, department, hostel_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [rollNumber, fullName, email, phoneNumber, department, hostelName, hashedPassword]
        );
        
        await connection.end();
        res.json({ success: true, message: 'Student registered successfully' });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User Login - UPDATED
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;
        const connection = await mysql.createConnection(dbConfig);
        
        let user, table, idField, nameField;
        
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
                return res.status(400).json({ error: 'Invalid user type' });
        }
        
        const [users] = await connection.execute(
            `SELECT * FROM ${table} WHERE email = ?`,
            [email]
        );
        
        if (users.length === 0) {
            await connection.end();
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        user = users[0];
        
        let validPassword;
        
        // Handle password verification based on user type
        switch (userType) {
            case 'student':
                // For students, check if they have a password_hash, otherwise use default
                if (user.password_hash && user.password_hash !== '') {
                    validPassword = await bcrypt.compare(password, user.password_hash);
                } else {
                    // For students without password (old records), use default
                    validPassword = await bcrypt.compare(password, DEFAULT_PASSWORD);
                }
                break;
            case 'admin':
            case 'driver':
                // For admin and drivers, use default password for demo
                validPassword = await bcrypt.compare(password, DEFAULT_PASSWORD);
                break;
            default:
                validPassword = false;
        }
        
        if (!validPassword) {
            await connection.end();
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { 
                id: user[idField], 
                email: user.email, 
                userType: userType,
                name: user[nameField]
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        await connection.end();
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
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get available autos
app.get('/api/autos/available', authenticateToken, async (req, res) => {
    try {
        const { location } = req.query;
        const connection = await mysql.createConnection(dbConfig);
        
        let query = `
            SELECT a.*, ad.full_name as driver_name, ad.phone_number as driver_phone
            FROM auto a 
            JOIN auto_driver ad ON a.auto_id = ad.auto_id 
            WHERE a.is_available = TRUE AND ad.is_available = TRUE
        `;
        
        const params = [];
        
        if (location) {
            query += ' AND a.current_location = ?';
            params.push(location);
        }
        
        const [autos] = await connection.execute(query, params);
        
        // Add demo available seats
        const autosWithSeats = autos.map(auto => ({
            ...auto,
            available_seats: Math.floor(Math.random() * 4) + 1 // Random seats 1-4
        }));
        
        await connection.end();
        res.json(autosWithSeats);
    } catch (error) {
        console.error('Error fetching autos:', error);
        res.status(500).json({ error: 'Failed to fetch autos' });
    }
});

// Book a ride
app.post('/api/rides/book', authenticateToken, async (req, res) => {
    try {
        const { auto_id, pickup_point, dropoff_point, ride_date, ride_time } = req.body;
        const student_id = req.user.id;
        
        const connection = await mysql.createConnection(dbConfig);
        
        // Get driver_id for the auto
        const [drivers] = await connection.execute(
            'SELECT driver_id FROM auto_driver WHERE auto_id = ?',
            [auto_id]
        );
        
        if (drivers.length === 0) {
            await connection.end();
            return res.status(400).json({ error: 'No driver found for this auto' });
        }
        
        const driver_id = drivers[0].driver_id;
        
        const [result] = await connection.execute(
            `INSERT INTO ride (student_id, auto_id, driver_id, pickup_point, dropoff_point, 
             ride_date, ride_time, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', NOW())`,
            [student_id, auto_id, driver_id, pickup_point, dropoff_point, ride_date, ride_time]
        );
        
        await connection.end();
        res.json({ success: true, ride_id: result.insertId, message: 'Ride booked successfully' });
        
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Ride booking failed' });
    }
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('driver-location-update', async (data) => {
        try {
            const connection = await mysql.createConnection(dbConfig);
            await connection.execute(
                `INSERT INTO auto_availability (auto_id, driver_id, available_seats, current_location, last_updated) 
                 VALUES (?, ?, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE 
                 available_seats = ?, current_location = ?, last_updated = NOW()`,
                [data.auto_id, data.driver_id, data.available_seats, data.current_location,
                 data.available_seats, data.current_location]
            );
            await connection.end();
            
            // Broadcast to all clients
            socket.broadcast.emit('location-updated', data);
        } catch (error) {
            console.error('Location update error:', error);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Access the application at: http://localhost:3000`);
    console.log(`🔑 Demo Login Credentials:`);
    console.log(`   Admin: admin@sau.ac.in / password`);
    console.log(`   Student: amit.sharma@sau.ac.in / password`);
    console.log(`   Driver: rajesh.driver@sau.ac.in / password`);
});
EOF

echo "✅ Backend updated successfully!"
echo "🔄 Restarting backend server..."

# Kill existing backend and restart
pkill -f "node.*server.js" 2>/dev/null
sleep 2
npm run dev &

echo "🎉 Update complete! Student registration should now work properly."