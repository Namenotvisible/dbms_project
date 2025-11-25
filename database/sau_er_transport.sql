-- -- Enhanced Database Schema
-- CREATE DATABASE IF NOT EXISTS SAU_Er_Transport;
-- USE SAU_Er_Transport;

-- -- Admin Table (Enhanced)
-- CREATE TABLE admin (
--     admin_id INT PRIMARY KEY AUTO_INCREMENT,
--     username VARCHAR(50) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     email VARCHAR(100) UNIQUE NOT NULL,
--     full_name VARCHAR(100) NOT NULL,
--     role ENUM('super_admin', 'transport_manager') DEFAULT 'transport_manager',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     last_login TIMESTAMP NULL
-- );

-- -- Auto Table (Enhanced)
-- CREATE TABLE auto (
--     auto_id INT PRIMARY KEY AUTO_INCREMENT,
--     registration_number VARCHAR(20) UNIQUE NOT NULL,
--     auto_number VARCHAR(10) UNIQUE NOT NULL,
--     model VARCHAR(50),
--     capacity INT NOT NULL DEFAULT 4,
--     current_location ENUM('Gate1', 'Gate2', 'Satbari', 'OnRoute') DEFAULT 'Gate2',
--     battery_level INT DEFAULT 100,
--     is_available BOOLEAN DEFAULT TRUE,
--     is_active BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Auto Driver Table (Enhanced)
-- CREATE TABLE auto_driver (
--     driver_id INT PRIMARY KEY AUTO_INCREMENT,
--     auto_id INT,
--     driver_code VARCHAR(10) UNIQUE NOT NULL,
--     full_name VARCHAR(100) NOT NULL,
--     phone_number VARCHAR(15) UNIQUE NOT NULL,
--     license_number VARCHAR(20) UNIQUE NOT NULL,
--     address TEXT,
--     experience_years INT,
--     emergency_contact VARCHAR(15),
--     profile_image VARCHAR(255),
--     is_on_duty BOOLEAN DEFAULT FALSE,
--     is_available BOOLEAN DEFAULT TRUE,
--     current_status ENUM('available', 'on_break', 'off_duty', 'on_trip') DEFAULT 'off_duty',
--     total_rides_completed INT DEFAULT 0,
--     average_rating DECIMAL(3,2) DEFAULT 0.00,
--     joined_date DATE,
--     FOREIGN KEY (auto_id) REFERENCES auto(auto_id) ON DELETE SET NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Student Table (Enhanced)
-- CREATE TABLE student (
--     student_id INT PRIMARY KEY AUTO_INCREMENT,
--     roll_number VARCHAR(20) UNIQUE NOT NULL,
--     full_name VARCHAR(100) NOT NULL,
--     email VARCHAR(100) UNIQUE NOT NULL,
--     phone_number VARCHAR(15),
--     date_of_birth DATE,
--     address TEXT,
--     class VARCHAR(20),
--     department VARCHAR(50),
--     hostel_name VARCHAR(50),
--     room_number VARCHAR(10),
--     preferred_pickup_point ENUM('Gate1', 'Gate2', 'Satbari') DEFAULT 'Gate2',
--     total_rides_taken INT DEFAULT 0,
--     is_active BOOLEAN DEFAULT TRUE,
--     profile_image VARCHAR(255),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Ride Table (Enhanced with fare)
-- CREATE TABLE ride (
--     ride_id INT PRIMARY KEY AUTO_INCREMENT,
--     student_id INT NOT NULL,
--     auto_id INT NOT NULL,
--     driver_id INT NOT NULL,
--     pickup_point ENUM('Gate1', 'Gate2', 'Satbari') NOT NULL,
--     dropoff_point ENUM('Gate1', 'Gate2', 'Satbari') NOT NULL,
--     ride_date DATE NOT NULL,
--     ride_time TIME NOT NULL,
--     scheduled_time TIMESTAMP,
--     actual_start_time TIMESTAMP NULL,
--     actual_end_time TIMESTAMP NULL,
--     status ENUM('requested', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'requested',
--     fare DECIMAL(8,2) DEFAULT 0.00,
--     rating_by_student TINYINT CHECK (rating_by_student BETWEEN 1 AND 5),
--     feedback_text TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (student_id) REFERENCES student(student_id),
--     FOREIGN KEY (auto_id) REFERENCES auto(auto_id),
--     FOREIGN KEY (driver_id) REFERENCES auto_driver(driver_id),
--     INDEX idx_status (status),
--     INDEX idx_date (ride_date)
-- );

-- -- Auto Availability Table
-- CREATE TABLE auto_availability (
--     availability_id INT PRIMARY KEY AUTO_INCREMENT,
--     auto_id INT NOT NULL,
--     driver_id INT NOT NULL,
--     available_seats INT NOT NULL,
--     current_location ENUM('Gate1', 'Gate2', 'OnRoute', 'Satbari') NOT NULL,
--     latitude DECIMAL(10,8),
--     longitude DECIMAL(11,8),
--     next_available_time TIME NULL,
--     is_accepting_rides BOOLEAN DEFAULT TRUE,
--     last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--     FOREIGN KEY (auto_id) REFERENCES auto(auto_id),
--     FOREIGN KEY (driver_id) REFERENCES auto_driver(driver_id)
-- );

-- -- Driver Break Table
-- CREATE TABLE driver_breaks (
--     break_id INT PRIMARY KEY AUTO_INCREMENT,
--     driver_id INT NOT NULL,
--     break_type ENUM('short_break', 'lunch_break', 'holiday', 'emergency') NOT NULL,
--     start_time TIMESTAMP NOT NULL,
--     end_time TIMESTAMP NOT NULL,
--     reason TEXT,
--     is_approved BOOLEAN DEFAULT TRUE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (driver_id) REFERENCES auto_driver(driver_id)
-- );

-- -- Payment Table (New)
-- CREATE TABLE payment (
--     payment_id INT PRIMARY KEY AUTO_INCREMENT,
--     ride_id INT NOT NULL,
--     amount DECIMAL(8,2) NOT NULL,
--     payment_method ENUM('cash', 'upi', 'college_wallet') DEFAULT 'cash',
--     payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
--     transaction_id VARCHAR(100),
--     payment_date TIMESTAMP NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (ride_id) REFERENCES ride(ride_id)
-- );

-- -- Insert Sample Data
-- INSERT INTO admin (username, password_hash, email, full_name, role) VALUES 
-- ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@sau.ac.in', 'System Administrator', 'super_admin');

-- INSERT INTO auto (registration_number, auto_number, model, capacity, current_location) VALUES
-- ('DL01AB1234', 'A1', 'Mahindra Treo', 4, 'Gate2'),
-- ('DL01CD5678', 'A2', 'Kinetic Green', 4, 'Gate1'),
-- ('DL01EF9012', 'A3', 'Yatri Eride', 4, 'Satbari');

-- INSERT INTO auto_driver (auto_id, driver_code, full_name, phone_number, license_number, experience_years, joined_date) VALUES
-- (1, 'D1', 'Rajesh Kumar', '9876543210', 'DL123456789', 3, '2023-01-15'),
-- (2, 'D2', 'Mohan Singh', '9876543211', 'DL123456790', 2, '2023-02-20'),
-- (3, 'D3', 'Suresh Patel', '9876543212', 'DL123456791', 4, '2023-01-10');

-- INSERT INTO student (roll_number, full_name, email, phone_number, class, department, hostel_name, room_number) VALUES
-- ('2023001', 'Amit Sharma', 'amit.sharma@sau.ac.in', '9876543213', 'B.Tech', 'CSE', 'Hostel-A', '101'),
-- ('2023002', 'Priya Singh', 'priya.singh@sau.ac.in', '9876543214', 'B.Tech', 'ECE', 'Hostel-B', '205'),
-- ('2023003', 'Rahul Verma', 'rahul.verma@sau.ac.in', '9876543215', 'MBA', 'Management', 'Hostel-C', '304');x




CREATE DATABASE IF NOT EXISTS SAU_Er_Transport;
USE SAU_Er_Transport;

-- Admin Table
CREATE TABLE admin (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'transport_manager') DEFAULT 'transport_manager',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Auto Table
CREATE TABLE auto (
    auto_id INT PRIMARY KEY AUTO_INCREMENT,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    auto_number VARCHAR(10) UNIQUE NOT NULL,
    model VARCHAR(50),
    capacity INT NOT NULL DEFAULT 4,
    current_location ENUM('Gate1', 'Gate2', 'Satbari', 'OnRoute') DEFAULT 'Gate2',
    battery_level INT DEFAULT 100,
    is_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto Driver Table (Enhanced with login credentials)
CREATE TABLE auto_driver (
    driver_id INT PRIMARY KEY AUTO_INCREMENT,
    auto_id INT,
    driver_code VARCHAR(10) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    license_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    address TEXT,
    experience_years INT,
    emergency_contact VARCHAR(15),
    profile_image VARCHAR(255),
    is_on_duty BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    current_status ENUM('available', 'on_break', 'off_duty', 'on_trip') DEFAULT 'off_duty',
    total_rides_completed INT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    joined_date DATE,
    FOREIGN KEY (auto_id) REFERENCES auto(auto_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Table
CREATE TABLE student (
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    roll_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    date_of_birth DATE,
    address TEXT,
    class VARCHAR(20),
    department VARCHAR(50),
    hostel_name VARCHAR(50),
    room_number VARCHAR(10),
    preferred_pickup_point ENUM('Gate1', 'Gate2', 'Satbari') DEFAULT 'Gate2',
    total_rides_taken INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ride Table
CREATE TABLE ride (
    ride_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    auto_id INT NOT NULL,
    driver_id INT NOT NULL,
    pickup_point ENUM('Gate1', 'Gate2', 'Satbari') NOT NULL,
    dropoff_point ENUM('Gate1', 'Gate2', 'Satbari') NOT NULL,
    ride_date DATE NOT NULL,
    ride_time TIME NOT NULL,
    scheduled_time TIMESTAMP,
    actual_start_time TIMESTAMP NULL,
    actual_end_time TIMESTAMP NULL,
    status ENUM('requested', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'requested',
    fare DECIMAL(8,2) DEFAULT 20.00,
    rating_by_student TINYINT CHECK (rating_by_student BETWEEN 1 AND 5),
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student(student_id),
    FOREIGN KEY (auto_id) REFERENCES auto(auto_id),
    FOREIGN KEY (driver_id) REFERENCES auto_driver(driver_id),
    INDEX idx_status (status),
    INDEX idx_date (ride_date)
);

-- Auto Availability Table
CREATE TABLE auto_availability (
    availability_id INT PRIMARY KEY AUTO_INCREMENT,
    auto_id INT NOT NULL,
    driver_id INT NOT NULL,
    available_seats INT NOT NULL,
    current_location ENUM('Gate1', 'Gate2', 'OnRoute', 'Satbari') NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    next_available_time TIME NULL,
    is_accepting_rides BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (auto_id) REFERENCES auto(auto_id),
    FOREIGN KEY (driver_id) REFERENCES auto_driver(driver_id)
);

-- Insert Sample Data with PROPER PASSWORDS
INSERT INTO admin (username, password_hash, email, full_name, role) VALUES 
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@sau.ac.in', 'System Administrator', 'super_admin');

INSERT INTO auto (registration_number, auto_number, model, capacity, current_location) VALUES
('DL01AB1234', 'A1', 'Mahindra Treo', 4, 'Gate2'),
('DL01CD5678', 'A2', 'Kinetic Green', 4, 'Gate1'),
('DL01EF9012', 'A3', 'Yatri Eride', 4, 'Satbari');

INSERT INTO auto_driver (auto_id, driver_code, full_name, email, phone_number, license_number, password_hash, experience_years, joined_date) VALUES
(1, 'D1', 'Rajesh Kumar', 'rajesh.driver@sau.ac.in', '9876543210', 'DL123456789', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, '2023-01-15'),
(2, 'D2', 'Mohan Singh', 'mohan.driver@sau.ac.in', '9876543211', 'DL123456790', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2, '2023-02-20'),
(3, 'D3', 'Suresh Patel', 'suresh.driver@sau.ac.in', '9876543212', 'DL123456791', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, '2023-01-10');

INSERT INTO student (roll_number, full_name, email, phone_number, class, department, hostel_name, room_number) VALUES
('2023001', 'Amit Sharma', 'amit.sharma@sau.ac.in', '9876543213', 'B.Tech', 'CSE', 'Hostel-A', '101'),
('2023002', 'Priya Singh', 'priya.singh@sau.ac.in', '9876543214', 'B.Tech', 'ECE', 'Hostel-B', '205'),
('2023003', 'Rahul Verma', 'rahul.verma@sau.ac.in', '9876543215', 'MBA', 'Management', 'Hostel-A', '304');

-- Update all passwords to use bcrypt $2a$ format
UPDATE admin SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' WHERE username = 'admin';

UPDATE auto_driver SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
WHERE email IN ('rajesh.driver@sau.ac.in', 'mohan.driver@sau.ac.in', 'suresh.driver@sau.ac.in');

-- For testing, also add this demo student with proper password
INSERT IGNORE INTO student (roll_number, full_name, email, phone_number, department, hostel_name) 
VALUES ('2024001', 'Demo Student', 'student@demo.com', '9876543216', 'CSE', 'Hostel-A');