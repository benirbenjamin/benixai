const { pool } = require('../config/database');

/**
 * AdminConfig Model
 * Used for admin to manage app-wide settings
 */
class AdminConfig {
    /**
     * Get all config settings
     * @returns {Promise<Object>} Config object
     */
    static async getAll() {
        try {
            const [rows] = await pool.execute('SELECT * FROM admin_config');
            
            // Convert rows to object with key-value pairs
            const config = {};
            rows.forEach(row => {
                // Parse JSON values if needed
                try {
                    config[row.config_key] = JSON.parse(row.config_value);
                } catch (e) {
                    // Not JSON, use as is
                    config[row.config_key] = row.config_value;
                }
            });
            
            return config;
        } catch (error) {
            console.error('Error getting admin config:', error);
            throw error;
        }
    }
    
    /**
     * Get config setting by key
     * @param {string} key - Config key
     * @returns {Promise<*>} Config value
     */
    static async get(key) {
        try {
            const [rows] = await pool.execute(
                'SELECT config_value FROM admin_config WHERE config_key = ?',
                [key]
            );
            
            if (!rows.length) return null;
            
            // Parse JSON if needed
            try {
                return JSON.parse(rows[0].config_value);
            } catch (e) {
                return rows[0].config_value;
            }
        } catch (error) {
            console.error(`Error getting config for key ${key}:`, error);
            throw error;
        }
    }
    
    /**
     * Set config setting
     * @param {string} key - Config key
     * @param {*} value - Config value (will be stringified if object)
     * @returns {Promise<boolean>} Success status
     */
    static async set(key, value) {
        try {
            // Convert objects/arrays to JSON
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            
            // Check if key exists
            const [existingRows] = await pool.execute(
                'SELECT 1 FROM admin_config WHERE config_key = ?',
                [key]
            );
            
            if (existingRows.length) {
                // Update existing
                await pool.execute(
                    'UPDATE admin_config SET config_value = ? WHERE config_key = ?',
                    [valueStr, key]
                );
            } else {
                // Insert new
                await pool.execute(
                    'INSERT INTO admin_config (config_key, config_value) VALUES (?, ?)',
                    [key, valueStr]
                );
            }
            
            return true;
        } catch (error) {
            console.error(`Error setting config for key ${key}:`, error);
            throw error;
        }
    }
    
    /**
     * Update plan prices
     * @param {Object} prices - Map of plan IDs to prices
     * @returns {Promise<boolean>} Success status
     */
    static async updatePlanPrices(prices) {
        try {
            await this.set('plan_prices', prices);
            return true;
        } catch (error) {
            console.error('Error updating plan prices:', error);
            throw error;
        }
    }
    
    /**
     * Update plan features
     * @param {Object} features - Features configuration
     * @returns {Promise<boolean>} Success status
     */
    static async updatePlanFeatures(features) {
        try {
            await this.set('plan_features', features);
            return true;
        } catch (error) {
            console.error('Error updating plan features:', error);
            throw error;
        }
    }
    
    /**
     * Update daily song limits
     * @param {Object} limits - Map of plan IDs to daily limits
     * @returns {Promise<boolean>} Success status
     */
    static async updateSongLimits(limits) {
        try {
            await this.set('song_limits', limits);
            return true;
        } catch (error) {
            console.error('Error updating song limits:', error);
            throw error;
        }
    }
    
    /**
     * Get merged plan configuration
     * Combines default plans with admin overrides
     * @returns {Promise<Object>} Plans configuration
     */
    static async getMergedPlans() {
        try {
            // Get default plans config
            const { plans } = require('../config/plans');
            
            // Get admin overrides
            const prices = await this.get('plan_prices') || {};
            const features = await this.get('plan_features') || {};
            const limits = await this.get('song_limits') || {};
            
            // Create merged config
            const merged = JSON.parse(JSON.stringify(plans)); // Deep clone
            
            // Apply overrides
            Object.keys(merged).forEach(planId => {
                if (prices[planId] !== undefined) {
                    merged[planId].price = prices[planId];
                }
                
                if (features[planId]) {
                    merged[planId].features = {
                        ...merged[planId].features,
                        ...features[planId]
                    };
                }
                
                if (limits[planId] !== undefined) {
                    merged[planId].dailySongLimit = limits[planId];
                }
            });
            
            return merged;
        } catch (error) {
            console.error('Error getting merged plans:', error);
            throw error;
        }
    }
}

module.exports = AdminConfig;
