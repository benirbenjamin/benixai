/**
 * Main JavaScript for BenixSpace AI Music Generator
 * Common functionalities used across all pages
 */

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
      // Apply audio fixes if the fix modules are loaded
    if (typeof applyAudioFixes === 'function') {
        applyAudioFixes();
    } else {
        // Fallback audio fix if the function isn't loaded from audioFixUtils.js
        document.querySelectorAll('audio').forEach(audio => {
            audio.addEventListener('error', function(e) {
                console.error('Audio error detected:', e);
                
                // Try to recover
                const src = this.src;
                
                setTimeout(() => {
                    this.src = '';
                    setTimeout(() => {
                        this.src = src;
                        this.load();
                    }, 500);
                }, 500);
            });
        });
    }
    
    // Auto-dismiss alerts
    setTimeout(() => {
        const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
        alerts.forEach(alert => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);
});

/**
 * BenixSpace Global Utilities
 */

// Initialize our global namespace
window.benixSpace = window.benixSpace || {};

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'danger', 'warning', or 'info'
 * @param {number} duration - Duration in ms (default: 5000)
 */
window.benixSpace.showToast = function(message, type = 'info', duration = 5000) {
    // Create container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    toast.className = `toast show bg-${type} text-white`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Set toast content
    toast.innerHTML = `
        <div class="toast-header bg-${type} text-white">
            <strong class="me-auto">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                               type === 'danger' ? 'fa-exclamation-circle' :
                               type === 'warning' ? 'fa-exclamation-triangle' : 
                               'fa-info-circle'} me-2"></i>
                BenixSpace
            </strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Initialize with Bootstrap
    const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: duration });
    bsToast.show();
    
    // Remove after hiding
    toast.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
    
    // Return the toast instance
    return bsToast;
};

/**
 * Format a date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';
    
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format a currency value
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Make an API call
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request data
 * @returns {Promise<Object>} API response
 */
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(endpoint, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API call error:', error);
        showToast(error.message, 'danger');
        throw error;
    }
}

/**
 * Check user subscription status
 * @returns {Promise<Object>} Subscription status
 */
async function checkSubscriptionStatus() {
    try {
        return await apiCall('/api/user/status');
    } catch (error) {
        console.error('Error checking subscription status:', error);
        return {
            active: false,
            plan: 'none',
            features: {
                vocal: false,
                instrumental: false,
                chorus: false
            },
            songsRemaining: 0
        };
    }
}

/**
 * Update UI based on subscription status
 * @param {Object} status - Subscription status
 */
function updateUIFromSubscription(status) {
    // Update subscription badges or indicators
    const subscriptionBadges = document.querySelectorAll('[data-subscription-badge]');
    subscriptionBadges.forEach(badge => {
        badge.textContent = status.plan;
        badge.className = `badge ${status.active ? 'bg-success' : 'bg-danger'}`;
    });
    
    // Update remaining songs counters
    const songCounters = document.querySelectorAll('[data-song-counter]');
    songCounters.forEach(counter => {
        counter.textContent = status.songsRemaining === Infinity ? 
            'Unlimited' : `${status.songsRemaining} / ${status.songsLimit}`;
    });
    
    // Update feature availability
    const featureElements = document.querySelectorAll('[data-feature]');
    featureElements.forEach(element => {
        const feature = element.dataset.feature;
        const isAvailable = status.features[feature];
        
        // Enable or disable based on subscription
        if (element.tagName === 'BUTTON') {
            element.disabled = !isAvailable || !status.active || status.songsRemaining <= 0;
        }
        
        // Update visual indicators
        if (element.dataset.featureIndicator) {
            element.innerHTML = isAvailable ? 
                '<i class="fas fa-check text-success"></i>' : 
                '<i class="fas fa-times text-danger"></i>';
        }
    });
}

/**
 * Apply fixes to audio elements and recording
 * Addresses the MEDIA_ELEMENT_ERROR: Format error issue
 */
function applyAudioFixes() {
    // Check if audio element fix module is loaded
    if (window.audioFix) {
        // Fix all existing audio elements
        document.querySelectorAll('audio').forEach(audio => {
            window.audioFix.fixAudioElement(audio);
        });
        
        // Watch for new audio elements
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'AUDIO') {
                        window.audioFix.fixAudioElement(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('audio').forEach(audio => {
                            window.audioFix.fixAudioElement(audio);
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Fix recording if on a recording page
    if (window.clickSoundFix) {
        // Override MediaRecorder creation to use optimal settings
        const originalMediaRecorder = window.MediaRecorder;
        window.MediaRecorder = function(stream, options) {
            const optimalOptions = window.clickSoundFix.getOptimalRecordingConfig();
            const mergedOptions = { ...optimalOptions, ...options };
            const recorder = new originalMediaRecorder(stream, mergedOptions);
            window.clickSoundFix.fixMediaRecorder(recorder);
            return recorder;
        };
        window.MediaRecorder.isTypeSupported = originalMediaRecorder.isTypeSupported;
    }
    
    // Add error handler for audio playback issues
    window.addEventListener('error', function(event) {
        if (event.target && event.target.tagName === 'AUDIO') {
            console.error('Audio error detected:', event);
            const audioElement = event.target;
            
            // Create error notification
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-warning alert-dismissible fade show';
            errorDiv.innerHTML = `
                <strong>Audio Playback Issue:</strong> 
                There was a problem playing this audio. Trying to fix...
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            // Insert error notification before the audio element
            audioElement.parentNode.insertBefore(errorDiv, audioElement);
            
            // Fix the audio element
            if (window.audioFix) {
                window.audioFix.fixAudioElement(audioElement);
            } else {
                // Basic recovery
                setTimeout(() => {
                    const src = audioElement.src;
                    audioElement.src = '';
                    setTimeout(() => {
                        audioElement.src = src;
                        audioElement.load();
                    }, 100);
                }, 100);
            }
        }
    }, true);
}

// Export functions for other scripts
window.benixSpace = {
    formatDate,
    formatCurrency,
    showToast,
    apiCall,
    checkSubscriptionStatus,
    updateUIFromSubscription
};
