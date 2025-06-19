/**
 * Database Initialization Script
 * This script creates all the required tables for BenixSpace
 */
const { pool } = require('../config/database');

/**
 * Create users table
 */
async function createUsersTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            phone_number VARCHAR(20),
            profile_image VARCHAR(255),
            role ENUM('user', 'admin') DEFAULT 'user',
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    try {
        await pool.execute(query);
        console.log('Users table created or already exists');
    } catch (error) {
        console.error('Error creating users table:', error);
        throw error;
    }
}

/**
 * Create subscriptions table
 */
async function createSubscriptionsTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            plan VARCHAR(50) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            transaction_id VARCHAR(255),
            started_at DATETIME NOT NULL,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX (user_id),
            INDEX (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    try {
        await pool.execute(query);
        console.log('Subscriptions table created or already exists');
    } catch (error) {
        console.error('Error creating subscriptions table:', error);
        throw error;
    }
}

/**
 * Create song usage table
 */
async function createSongUsageTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS song_usage (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            song_type VARCHAR(50) NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX (user_id),
            INDEX (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    try {
        await pool.execute(query);
        console.log('Song usage table created or already exists');
    } catch (error) {
        console.error('Error creating song usage table:', error);
        throw error;
    }
}

/**
 * Create music generations table
 */
async function createMusicGenerationsTable() {    const query = `
        CREATE TABLE IF NOT EXISTS music_generations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            original_voice_path VARCHAR(255),
            instrumental_path VARCHAR(255),
            vocals_path VARCHAR(255),
            chorus_path VARCHAR(255),
            beat_path VARCHAR(255),
            final_song_path VARCHAR(255),
            song_structure VARCHAR(50) NOT NULL DEFAULT 'verse',
            num_verses INT NOT NULL DEFAULT 1,
            has_bridge BOOLEAN NOT NULL DEFAULT FALSE,
            has_chorus BOOLEAN NOT NULL DEFAULT FALSE,
            bpm INT NOT NULL DEFAULT 90,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    try {
        await pool.execute(query);
        console.log('Music generations table created or already exists');
    } catch (error) {
        console.error('Error creating music generations table:', error);
        throw error;
    }
}

/**
 * Create admin config table
 */
async function createAdminConfigTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS admin_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            config_key VARCHAR(100) NOT NULL UNIQUE,
            config_value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    try {
        await pool.execute(query);
        console.log('Admin config table created or already exists');
    } catch (error) {
        console.error('Error creating admin config table:', error);
        throw error;
    }
}

/**
 * Initialize default admin config
 */
async function initializeDefaultConfig() {
    const { plans } = require('../config/plans');
    
    // Extract plan prices
    const planPrices = {};
    Object.keys(plans).forEach(planId => {
        planPrices[planId] = plans[planId].price;
    });
    
    // Extract song limits
    const songLimits = {};
    Object.keys(plans).forEach(planId => {
        songLimits[planId] = plans[planId].dailySongLimit;
    });
    
    // Default config items
    const defaultConfig = [
        { key: 'plan_prices', value: JSON.stringify(planPrices) },
        { key: 'song_limits', value: JSON.stringify(songLimits) },
        { key: 'free_trial_days', value: '14' },
        { key: 'maintenance_mode', value: 'false' }
    ];
    
    try {
        for (const config of defaultConfig) {
            // Check if config already exists
            const [existingRows] = await pool.execute(
                'SELECT 1 FROM admin_config WHERE config_key = ?',
                [config.key]
            );
            
            if (!existingRows.length) {
                // Insert default config
                await pool.execute(
                    'INSERT INTO admin_config (config_key, config_value) VALUES (?, ?)',
                    [config.key, config.value]
                );
                console.log(`Added default config: ${config.key}`);
            }
        }
        
        console.log('Default admin config initialized');
    } catch (error) {
        console.error('Error initializing default config:', error);
        throw error;
    }
}

/**
 * Main initialization function
 */
async function initializeDatabase() {    try {
        console.log('Starting database initialization...');
        console.log('Make sure your MySQL server is running and the database exists!');
        
        // Test database connection
        const { testConnection } = require('../config/database');
        const isConnected = await testConnection();
        
        if (!isConnected) {
            throw new Error('Cannot connect to database. Please check your database configuration.');
        }
        
        // Create tables in order (respecting foreign key dependencies)
        await createUsersTable();
        await createSubscriptionsTable();
        await createSongUsageTable();
        await createMusicGenerationsTable();
        await createAdminConfigTable();
        
        // Initialize default config
        await initializeDefaultConfig();
        
        console.log('Database initialization completed successfully!');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

// Run if called directly (node utils/initDb.js)
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Uncaught error:', err);
            process.exit(1);
        });
}

module.exports = {
    initializeDatabase
};
