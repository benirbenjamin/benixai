const { pool } = require('../config/database');
const { plans, freeTrial } = require('../config/plans');

/**
 * Subscription Model
 */
class Subscription {
    /**
     * Create a new subscription
     * @param {Object} subData - Subscription data
     * @returns {Promise<Object>} Created subscription
     */
    static async create(subData) {
        try {
            const now = new Date();
            const expiry = new Date(now);
            
            // If this is a free trial
            if (subData.plan === 'trial') {
                // Set expiry date to 14 days from now
                expiry.setDate(expiry.getDate() + freeTrial.durationDays);
            } else {
                // Regular subscription - set expiry to 30 days (1 month)
                expiry.setDate(expiry.getDate() + 30);
            }
            
            // Insert subscription into database
            const [result] = await pool.execute(
                'INSERT INTO subscriptions (user_id, plan, amount, transaction_id, started_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    subData.userId,
                    subData.plan,
                    subData.amount || 0,  // Free for trial
                    subData.transactionId || null,
                    now,
                    expiry
                ]
            );
            
            // Return created subscription
            return {
                id: result.insertId,
                userId: subData.userId,
                plan: subData.plan,
                amount: subData.amount || 0,
                transactionId: subData.transactionId,
                startedAt: now,
                expiresAt: expiry
            };
        } catch (error) {
            console.error('Error creating subscription:', error);
            throw error;
        }
    }
    
    /**
     * Create a new subscription with custom duration
     * @param {Object} subData - Subscription data with custom duration
     * @returns {Promise<Object>} Created subscription
     */
    static async createWithDuration(subData) {
        try {
            // Insert subscription into database
            const [result] = await pool.execute(
                'INSERT INTO subscriptions (user_id, plan, amount, transaction_id, started_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    subData.userId,
                    subData.plan,
                    subData.amount || 0,
                    subData.transactionId || null,
                    subData.startedAt,
                    subData.expiresAt
                ]
            );
            
            // Return created subscription
            return {
                id: result.insertId,
                userId: subData.userId,
                plan: subData.plan,
                amount: subData.amount || 0,
                transactionId: subData.transactionId,
                startedAt: subData.startedAt,
                expiresAt: subData.expiresAt,
                duration: subData.duration
            };
        } catch (error) {
            console.error('Error creating subscription with custom duration:', error);
            throw error;
        }
    }
    
    /**
     * Get active subscription for user
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Subscription object or null
     */
    static async getActiveByUserId(userId) {
        try {
            const now = new Date();
            
            const [rows] = await pool.execute(
                'SELECT * FROM subscriptions WHERE user_id = ? AND expires_at > ? ORDER BY id DESC LIMIT 1',
                [userId, now]
            );
            
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error getting active subscription:', error);
            throw error;
        }
    }
    
    /**
     * Get user's subscription status including features and limits
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Subscription status
     */
    static async getUserStatus(userId) {
        try {
            // Get active subscription
            const subscription = await this.getActiveByUserId(userId);
            
            // Get songs used today
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const [usageRows] = await pool.execute(
                'SELECT COUNT(*) as count FROM song_usage WHERE user_id = ? AND DATE(created_at) = ?',
                [userId, today]
            );
            const songsUsedToday = usageRows[0].count || 0;
            
            // Default to free/no subscription
            let status = {
                active: false,
                plan: 'none',
                expiry: null,
                features: {
                    vocal: false,
                    instrumental: false,
                    chorus: false
                },
                songsLimit: 0,
                songsUsedToday,
                songsRemaining: 0
            };
            
            // If subscription exists and is active
            if (subscription) {
                const planConfig = plans[subscription.plan] || 
                                  (subscription.plan === 'trial' ? { ...plans.basic, name: 'Free Trial' } : null);
                
                if (planConfig) {
                    status = {
                        active: true,
                        plan: subscription.plan === 'trial' ? 'Free Trial' : planConfig.name,
                        expiry: subscription.expires_at,
                        features: planConfig.features,
                        songsLimit: subscription.plan === 'trial' ? freeTrial.dailySongLimit : planConfig.dailySongLimit,
                        songsUsedToday,
                        songsRemaining: Math.max(0, 
                            (subscription.plan === 'trial' ? 
                                freeTrial.dailySongLimit : 
                                planConfig.dailySongLimit) - songsUsedToday)
                    };
                }
            }
            
            return status;
        } catch (error) {
            console.error('Error getting user subscription status:', error);
            throw error;
        }
    }
    
    /**
     * Record song usage
     * @param {number} userId - User ID
     * @param {string} songType - Type of song generated
     * @returns {Promise<Object>} Created usage record
     */
    static async recordUsage(userId, songType) {
        try {
            const now = new Date();
            
            // Insert usage record
            const [result] = await pool.execute(
                'INSERT INTO song_usage (user_id, song_type, created_at) VALUES (?, ?, ?)',
                [userId, songType, now]
            );
            
            return {
                id: result.insertId,
                userId,
                songType,
                createdAt: now
            };
        } catch (error) {
            console.error('Error recording song usage:', error);
            throw error;
        }
    }
    
    /**
     * Check if user can generate more songs today
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if user has remaining quota
     */    static async canGenerateMore(userId) {
        try {
            const status = await this.getUserStatus(userId);
            return status.active && status.songsRemaining > 0;
        } catch (error) {
            console.error('Error checking generation quota:', error);
            throw error;
        }
    }
    
    /**
     * Find subscription by user ID (alias for getActiveByUserId for compatibility)
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Subscription object or null
     */
    static async findByUserId(userId) {
        return this.getActiveByUserId(userId);
    }
    
    /**
     * Get subscription by ID
     * @param {number} id - Subscription ID
     * @returns {Promise<Object|null>} Subscription object or null
     */
    static async getById(id) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM subscriptions WHERE id = ?',
                [id]
            );
            
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error getting subscription by ID:', error);
            throw error;
        }
    }
    
    /**
     * Count active subscriptions by type/plan
     * @param {string} planType - Plan type (premium, standard, basic, free_trial)
     * @returns {Promise<number>} Count of active subscriptions
     */
    static async countByType(planType) {
        try {
            const now = new Date();
            const plan = planType === 'free_trial' ? 'trial' : planType;
            
            const [rows] = await pool.execute(
                'SELECT COUNT(*) as count FROM subscriptions WHERE plan = ? AND expires_at > ?',
                [plan, now]
            );
            
            return rows[0].count || 0;
        } catch (error) {
            console.error(`Error counting ${planType} subscriptions:`, error);
            throw error;
        }
    }
    
    /**
     * Cancel subscription
     * @param {number} id - Subscription ID
     * @returns {Promise<boolean>} Success status
     */
    static async cancel(id) {
        try {
            const now = new Date();
            
            // Update expiration to now (immediately cancel)
            await pool.execute(
                'UPDATE subscriptions SET expires_at = ? WHERE id = ?',
                [now, id]
            );
            
            return true;
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            throw error;
        }
    }
    
    /**
     * Check if a user has previously used the free trial
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Whether user has used trial
     */
    static async hasUserUsedTrial(userId) {
        try {
            const [rows] = await pool.execute(
                'SELECT 1 FROM subscriptions WHERE user_id = ? AND plan = "trial" LIMIT 1',
                [userId]
            );
            
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking trial usage:', error);
            throw error;
        }
    }
}

module.exports = Subscription;
