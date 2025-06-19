/**
 * Subscription plans configuration
 */
const plans = {
    basic: {
        id: 'basic',
        name: 'Basic',
        price: 5.00,  // Price in USD
        features: {
            vocal: true,
            instrumental: true,
            chorus: true
        },
        dailySongLimit: 2
    },
    standard: {
        id: 'standard',
        name: 'Standard',
        price: 10.00,  // Price in USD
        features: {
            vocal: true,
            instrumental: true,
            chorus: true
        },
        dailySongLimit: 5
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: 20.00,  // Price in USD
        features: {
            vocal: true,
            instrumental: true,
            chorus: true
        },
        dailySongLimit: Infinity  // Unlimited
    }
};

/**
 * Free trial configuration
 */
const freeTrial = {
    durationDays: 14,
    dailySongLimit: 2
};

/**
 * Get all subscription plans
 * @returns {Object[]} Array of plan objects
 */
const getAllPlans = () => {
    return Object.values(plans);
};

module.exports = {
    plans,
    freeTrial,
    getAllPlans
};
