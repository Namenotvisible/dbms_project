const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root', 
    password: '', // your password
    database: 'SAU_Er_Transport'
};

async function monitorDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        console.log('🔍 DATABASE MONITOR - Live Data');
        console.log('================================');
        
        // Check students
        const [students] = await connection.execute('SELECT COUNT(*) as count, MAX(created_at) as latest FROM student');
        console.log(`📊 Students: ${students[0].count} total, Latest: ${students[0].latest}`);
        
        // Check drivers  
        const [drivers] = await connection.execute('SELECT COUNT(*) as count, MAX(created_at) as latest FROM auto_driver');
        console.log(`🚗 Drivers: ${drivers[0].count} total, Latest: ${drivers[0].latest}`);
        
        // Check autos
        const [autos] = await connection.execute('SELECT COUNT(*) as count, MAX(created_at) as latest FROM auto');
        console.log(`🛺 Autos: ${autos[0].count} total, Latest: ${autos[0].latest}`);
        
        // Check rides
        const [rides] = await connection.execute('SELECT COUNT(*) as count, MAX(created_at) as latest FROM ride');
        console.log(`🚕 Rides: ${rides[0].count} total, Latest: ${rides[0].latest}`);
        
        // Show latest 3 students
        const [latestStudents] = await connection.execute('SELECT student_id, roll_number, full_name, email, created_at FROM student ORDER BY created_at DESC LIMIT 3');
        console.log('\n🎓 LATEST STUDENTS:');
        latestStudents.forEach(student => {
            console.log(`   ${student.student_id}. ${student.full_name} (${student.roll_number}) - ${student.created_at}`);
        });
        
        // Show latest 3 drivers
        const [latestDrivers] = await connection.execute('SELECT driver_id, driver_code, full_name, email, created_at FROM auto_driver ORDER BY created_at DESC LIMIT 3');
        console.log('\n👨‍💼 LATEST DRIVERS:');
        latestDrivers.forEach(driver => {
            console.log(`   ${driver.driver_id}. ${driver.full_name} (${driver.driver_code}) - ${driver.created_at}`);
        });
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Database monitoring error:', error.message);
    }
}

// Run every 5 seconds
setInterval(monitorDatabase, 5000);

// Run immediately
monitorDatabase();