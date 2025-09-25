// ===================================
// Firebase Database Initialization Script
// ===================================

// This script helps initialize your Firebase Realtime Database with the proper structure
// Run this once to set up your database with initial data

class FirebaseInitializer {
    constructor() {
        this.database = firebase.database();
        console.log('Firebase Initializer loaded');
    }

    // Initialize database structure
    async initializeDatabase() {
        try {
            console.log('Starting Firebase database initialization...');
            
            // Set up database rules (these should be set in Firebase Console)
            await this.setupInitialData();
            console.log('Database initialization completed successfully!');
            
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    }

    // Set up initial data structure
    async setupInitialData() {
        const initialData = {
            // System configuration
            system_config: {
                app_version: "1.0.0",
                maintenance_mode: false,
                last_updated: firebase.database.ServerValue.TIMESTAMP
            },

            // Cities and routes (from config.js)
            cities: PTTConfig.data.cities,
            routes: PTTConfig.data.routes,

            // Initial driver data
            drivers: {
                DR001: {
                    id: "DR001",
                    name: "Rajinder Singh",
                    phone: "+919876543210",
                    license: "PB-DL-2020-001234",
                    experience: "5 years",
                    status: "active",
                    created_at: firebase.database.ServerValue.TIMESTAMP
                },
                DR002: {
                    id: "DR002",
                    name: "Harpreet Kaur",
                    phone: "+919876543211",
                    license: "PB-DL-2019-005678",
                    experience: "7 years",
                    status: "active",
                    created_at: firebase.database.ServerValue.TIMESTAMP
                }
            },

            // Bus fleet data
            buses: {
                "PB-01-1234": {
                    busNumber: "PB-01-1234",
                    type: "Regular",
                    capacity: 50,
                    features: ["GPS", "AC"],
                    status: "active",
                    created_at: firebase.database.ServerValue.TIMESTAMP
                },
                "PB-01-5678": {
                    busNumber: "PB-01-5678",
                    type: "Deluxe",
                    capacity: 40,
                    features: ["GPS", "AC", "WiFi"],
                    status: "active",
                    created_at: firebase.database.ServerValue.TIMESTAMP
                }
            },

            // Live buses (initially empty - populated by driver app using device IDs)
            live_buses: {},

            // Driver-Device mappings (track which devices are used by which drivers)
            driver_devices: {},
            driver_active_devices: {},

            // Alerts (initially empty - populated by driver app)
            alerts: {},

            // Admin users
            admin_users: {
                admin1: {
                    email: "admin@demo.com",
                    name: "System Administrator",
                    role: "super_admin",
                    created_at: firebase.database.ServerValue.TIMESTAMP
                }
            },

            // System statistics
            statistics: {
                total_buses: 2,
                total_drivers: 2,
                total_routes: 24,
                last_calculated: firebase.database.ServerValue.TIMESTAMP
            }
        };

        // Set initial data
        await this.database.ref().set(initialData);
        console.log('Initial data structure created');
    }

    // Set up database security rules (display for manual setup)
    displaySecurityRules() {
        const rules = {
            "rules": {
                ".read": "auth != null",
                ".write": "auth != null",
                "live_buses": {
                    "$routeId": {
                        "$driverId": {
                            ".write": "auth != null && auth.uid == $driverId",
                            ".read": true
                        }
                    }
                },
                "alerts": {
                    ".write": "auth != null",
                    ".read": "auth != null"
                },
                "drivers": {
                    "$driverId": {
                        ".write": "auth != null && (auth.uid == $driverId || root.child('admin_users').child(auth.uid).exists())",
                        ".read": "auth != null"
                    }
                },
                "admin_users": {
                    ".write": "root.child('admin_users').child(auth.uid).exists()",
                    ".read": "root.child('admin_users').child(auth.uid).exists()"
                }
            }
        };

        console.log('Copy these security rules to Firebase Console > Database > Rules:');
        console.log(JSON.stringify(rules, null, 2));
    }

    // Test database connectivity
    async testConnection() {
        try {
            const testRef = this.database.ref('test_connection');
            await testRef.set({
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                message: "Connection test successful"
            });
            
            const snapshot = await testRef.once('value');
            if (snapshot.exists()) {
                console.log('✅ Database connection test passed');
                await testRef.remove(); // Clean up test data
                return true;
            } else {
                console.log('❌ Database connection test failed');
                return false;
            }
        } catch (error) {
            console.error('❌ Database connection error:', error);
            return false;
        }
    }

    // Clear all data (use with caution!)
    async clearDatabase() {
        const confirmed = confirm('⚠️ WARNING: This will delete ALL data from your Firebase database. Are you sure?');
        if (!confirmed) return;

        const doubleConfirm = confirm('⚠️ FINAL WARNING: This action cannot be undone. Type "DELETE" to confirm.');
        if (!doubleConfirm) return;

        try {
            await this.database.ref().remove();
            console.log('Database cleared successfully');
        } catch (error) {
            console.error('Error clearing database:', error);
        }
    }

    // Add sample live bus data for testing
    async addSampleLiveData() {
        const sampleData = {
            live_buses: {
                ch1: {
                    DR001: {
                        busNumber: "PB-01-1234",
                        driverId: "DR001",
                        isActive: true,
                        latitude: 30.7352,
                        longitude: 76.778,
                        speed: 25,
                        passengerCount: 15,
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    }
                },
                ld1: {
                    DR002: {
                        busNumber: "PB-01-5678",
                        driverId: "DR002",
                        isActive: true,
                        latitude: 30.901,
                        longitude: 75.8573,
                        speed: 30,
                        passengerCount: 8,
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    }
                }
            }
        };

        await this.database.ref().update(sampleData);
        console.log('Sample live data added');
    }
}

// Make it available globally
window.FirebaseInit = new FirebaseInitializer();

// Auto-run when page loads (only if needed)
document.addEventListener('DOMContentLoaded', () => {
    console.log('Firebase Initializer ready. Use FirebaseInit.initializeDatabase() to set up your database.');
    console.log('Available methods:');
    console.log('- FirebaseInit.testConnection()');
    console.log('- FirebaseInit.initializeDatabase()');
    console.log('- FirebaseInit.addSampleLiveData()');
    console.log('- FirebaseInit.displaySecurityRules()');
    console.log('- FirebaseInit.clearDatabase() [DANGEROUS]');
});