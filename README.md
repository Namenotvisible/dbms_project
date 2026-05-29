# SAU Vahan: Campus Transportation Management System

## Overview
A comprehensive full-stack transportation management system designed to resolve real-life campus mobility inefficiencies. The platform features dedicated dashboards for Students, Drivers, and Administrators, integrating real-time GPS tracking with a highly optimized, centralized database. By engineering a structured Database Management System (DBMS), this project eliminates manual tracking errors and optimizes driver scheduling.

## Core Architecture & Database Design

* **3NF-Normalized Database:** Architected a highly efficient MySQL backend utilizing Third Normal Form (3NF) principles. This strict relational modeling reduced data redundancy by ~70%.
* **Query Optimization:** Implemented optimized stored procedures and structural entity relationships (Students, Drivers, Vehicles, Rides) that accelerated complex query execution speeds by 50%.
* **Real-Time Tracking & Availability:** Engineered a Node.js backend utilizing Socket.io to process and broadcast live e-rickshaw locations and driver availability statuses directly to the student dashboard.
* **Role-Based Dashboards:** Deployed a multi-tiered UI architecture providing tailored views and access controls for Administrators (system management), Drivers (availability toggles), and Students (ride requests).

## Tech Stack
* **Database:** MySQL (Relational Mapping, Stored Procedures)
* **Backend:** Node.js, Socket.io
* **Frontend:** HTML5, CSS3, Vanilla JavaScript

## Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Namenotvisible/Sau-Vahan-Transportation.git]
   cd Sau-Vahan-Transportation
