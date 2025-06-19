const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * User Model
 */
class User {    
    /**
     * Count total number of users
     * @returns {Promise<number>} Total number of users
     */
    static async count() {
        try {
            const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
            return rows[0].count;
        } catch (error) {
            console.error('Error counting users:', error);
            throw error;
        }
    }

    /**
     * Create a new user
     * @param {Object} userData - User data (email, password, firstName, lastName, phoneNumber, etc.)
     * @returns {Promise<Object>} Created user object
     */
    static async create(userData) {
        try {
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);
            
            // Set default role to 'user'
            const role = userData.role || 'user';
            
            // Current date
            const now = new Date();
            
            // Insert user into database with new fields
            const [result] = await pool.execute(
                'INSERT INTO users (email, password, first_name, last_name, phone_number, profile_image, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    userData.email, 
                    hashedPassword, 
                    userData.firstName || null, 
                    userData.lastName || null, 
                    userData.phoneNumber || null,
                    userData.profileImage || null,
                    role, 
                    now
                ]
            );
              // Return created user with new fields
            return {
                id: result.insertId,
                email: userData.email,
                firstName: userData.firstName || null,
                lastName: userData.lastName || null,
                phoneNumber: userData.phoneNumber || null,
                profileImage: userData.profileImage || null,
                role
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    
    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null
     */
    static async findByEmail(email) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }
    
    /**
     * Compare password with stored hash
     * @param {string} password - Plain password
     * @param {string} hashedPassword - Stored hashed password
     * @returns {Promise<boolean>} True if match
     */
    static async comparePassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
      
    /**
     * Get all users
     * @returns {Promise<Array>} Array of users
     */
    static async getAll() {
        try {
            const [rows] = await pool.execute(
                'SELECT id, email, role, created_at FROM users'
            );
            
            return rows;
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }
    
    /**
     * Find user by ID
     * @param {number} id - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    static async findById(id) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM users WHERE id = ?',
                [id]
            );
            
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }
    
    /**
     * Find all users (alias for getAll for consistency)
     * @returns {Promise<Array>} Array of users
     */
    static async findAll() {
        return this.getAll();
    }
}

module.exports = User;
