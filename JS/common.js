// ===================================
// Punjab Transport Tracker - Common Functions
// ===================================

// Common utilities used across all apps
const CommonUtils = {
    
    // ===================================
    // Notification System
    // ===================================
    
    showNotification: function(message, type = 'info', duration = 3000) {
        // Remove any existing notifications
        const existingToasts = document.querySelectorAll('.notification-toast');
        existingToasts.forEach(toast => toast.remove());
        
        // Create new notification
        const toast = document.createElement('div');
        toast.className = 'notification-toast fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-96 max-w-sm';
        
        // Set styles based on type
        const styles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        toast.classList.add(...(styles[type] || styles.info).split(' '));
        
        // Set icon
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icons[type] || icons.info} mr-3 text-xl"></i>
                <div>
                    <p class="font-medium">${message}</p>
                    <p class="text-xs opacity-75 mt-1">${new Date().toLocaleTimeString()}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-96');
            toast.classList.add('translate-x-0');
        });
        
        // Auto remove after duration
        setTimeout(() => {
            toast.classList.add('translate-x-96');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    },
    
    // ===================================
    // Loading States
    // ===================================
    
    showButtonLoading: function(button, loading, originalText) {
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Please wait...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || originalText || 'Submit';
        }
    },
    
    showPageLoading: function(show) {
        let loader = document.getElementById('pageLoader');
        
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'pageLoader';
                loader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                loader.innerHTML = `
                    <div class="bg-white rounded-lg p-8 flex flex-col items-center">
                        <div class="loader mb-4"></div>
                        <p class="text-gray-700">Loading...</p>
                    </div>
                `;
                document.body.appendChild(loader);
            }
        } else {
            if (loader) {
                loader.remove();
            }
        }
    },
    
    // ===================================
    // Session Management
    // ===================================
    
    setSession: function(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Session storage error:', e);
            return false;
        }
    },
    
    getSession: function(key) {
        try {
            const value = sessionStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error('Session retrieval error:', e);
            return null;
        }
    },
    
    clearSession: function(key) {
        if (key) {
            sessionStorage.removeItem(key);
        } else {
            sessionStorage.clear();
        }
    },
    
    // ===================================
    // Local Storage Management
    // ===================================
    
    setLocal: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Local storage error:', e);
            return false;
        }
    },
    
    getLocal: function(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error('Local storage retrieval error:', e);
            return null;
        }
    },
    
    clearLocal: function(key) {
        if (key) {
            localStorage.removeItem(key);
        } else {
            localStorage.clear();
        }
    },
    
    // ===================================
    // Data Validation
    // ===================================
    
    validatePhone: function(phone) {
        const regex = /^\+91[0-9]{10}$/;
        return regex.test(phone);
    },
    
    validateEmail: function(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    validateBusNumber: function(busNumber) {
        const regex = /^[A-Z]{2}-[0-9]{2}-[0-9]{4}$/;
        return regex.test(busNumber);
    },
    
    sanitizeInput: function(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },
    
    // ===================================
    // Date & Time Utilities
    // ===================================
    
    formatTime: function(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },
    
    formatDate: function(timestamp) {
        return new Date(timestamp).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },
    
    formatDateTime: function(timestamp) {
        return new Date(timestamp).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    getTimeAgo: function(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds} seconds ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    },
    
    // ===================================
    // Geolocation Utilities
    // ===================================
    
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return (R * c).toFixed(2);
    },
    
    calculateSpeed: function(distance, timeInHours) {
        return timeInHours > 0 ? Math.round(distance / timeInHours) : 0;
    },
    
    calculateETA: function(distance, avgSpeed) {
        if (avgSpeed <= 0) return 'N/A';
        const hours = distance / avgSpeed;
        const minutes = Math.round(hours * 60);
        
        if (minutes < 60) {
            return `${minutes} min`;
        } else {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return `${h}h ${m}min`;
        }
    },
    
    isLocationStale: function(timestamp, threshold = 300000) {
        return (Date.now() - timestamp) > threshold;
    },
    
    // ===================================
    // Map Utilities
    // ===================================
    
    createBusIcon: function(color = '#ea580c', isActive = true) {
        return L.divIcon({
            className: 'custom-bus-marker',
            html: `
                <div class="bus-marker ${isActive ? 'active' : 'inactive'}" style="background-color: ${color};">
                    <i class="fas fa-bus"></i>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    },
    
    createStopIcon: function(stopNumber) {
        return L.divIcon({
            className: 'custom-stop-marker',
            html: `
                <div class="stop-marker">
                    ${stopNumber}
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    },
    
    createUserIcon: function() {
        return L.divIcon({
            className: 'custom-user-marker',
            html: `
                <div class="user-marker">
                    <i class="fas fa-user"></i>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    },
    
    // ===================================
    // Firebase Helpers
    // ===================================
    
    listenToRealtimeData: function(path, callback, errorCallback) {
        const ref = database.ref(path);
        const listener = ref.on('value', 
            (snapshot) => callback(snapshot.val()),
            (error) => {
                console.error(`Error listening to ${path}:`, error);
                if (errorCallback) errorCallback(error);
            }
        );
        
        return () => ref.off('value', listener);
    },
    
    updateRealtimeData: function(path, data) {
        return database.ref(path).update({
            ...data,
            lastUpdated: Date.now()
        });
    },
    
    pushRealtimeData: function(path, data) {
        return database.ref(path).push({
            ...data,
            createdAt: Date.now()
        });
    },
    
    // ===================================
    // UI Utilities
    // ===================================
    
    toggleSidebar: function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('sidebar-mobile');
            sidebar.classList.toggle('active');
        }
    },
    
    createModal: function(title, content, actions) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
                <div class="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
                    <h3 class="text-lg font-semibold">${title}</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-4 overflow-y-auto max-h-[60vh]">
                    ${content}
                </div>
                ${actions ? `
                <div class="bg-gray-100 px-4 py-3 border-t flex justify-end space-x-2">
                    ${actions}
                </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    },
    
    confirmAction: function(message, onConfirm, onCancel) {
        const modal = this.createModal(
            'Confirm Action',
            `<p class="text-gray-700">${message}</p>`,
            `
                <button onclick="this.closest('.fixed').remove(); ${onCancel ? onCancel() : ''}" 
                        class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                    Cancel
                </button>
                <button onclick="this.closest('.fixed').remove(); ${onConfirm()}" 
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Confirm
                </button>
            `
        );
    },
    
    // ===================================
    // Network & Connection
    // ===================================
    
    checkConnection: function() {
        return navigator.onLine;
    },
    
    monitorConnection: function(onlineCallback, offlineCallback) {
        window.addEventListener('online', onlineCallback);
        window.addEventListener('offline', offlineCallback);
        
        // Return cleanup function
        return () => {
            window.removeEventListener('online', onlineCallback);
            window.removeEventListener('offline', offlineCallback);
        };
    },
    
    // ===================================
    // Error Handling
    // ===================================
    
    handleError: function(error, context) {
        console.error(`Error in ${context}:`, error);
        
        // Show user-friendly error message
        let userMessage = 'An error occurred';
        
        if (error.code) {
            switch(error.code) {
                case 'PERMISSION_DENIED':
                    userMessage = 'Permission denied. Please check your access rights.';
                    break;
                case 'UNAVAILABLE':
                    userMessage = 'Service temporarily unavailable. Please try again.';
                    break;
                case 'NETWORK_ERROR':
                    userMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    userMessage = error.message || 'An unexpected error occurred';
            }
        } else {
            userMessage = error.message || 'An unexpected error occurred';
        }
        
        this.showNotification(userMessage, 'error');
        return userMessage;
    },
    
    // Log function for debugging
    log: function(message, level = 'info') {
        const timestamp = new Date().toISOString();
        console[level](`[${timestamp}] ${message}`);
    }
};

// Make CommonUtils available globally
window.CommonUtils = CommonUtils;

// Log that common utilities are loaded
console.log('Common utilities loaded successfully');
    