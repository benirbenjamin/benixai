/**
 * Admin User Creation Script
 * Run this script to create an initial admin user
 * Usage: node utils/createAdmin.js <email> <password>
 */
require('dotenv').config();
const User = require('../models/User');

async function createAdminUser() {
    try {
        // Check command line arguments
        const email = process.argv[2];
        const password = process.argv[3];
        
        if (!email || !password) {
            console.error('Usage: node utils/createAdmin.js <email> <password>');
            process.exit(1);
        }
        
        console.log(`Creating admin user with email: ${email}`);
        
        // Create admin user
        const adminUser = await User.create({
            email,
            password,
            role: 'admin'
        });
        
        console.log(`Admin user created with ID: ${adminUser.id}`);
        console.log('You can now log in to the admin panel with these credentials');
        
        process.exit(0);
    } catch (error) {
        console.error('Failed to create admin user:', error);
        process.exit(1);
    }
}

// Run the function
createAdminUser();
