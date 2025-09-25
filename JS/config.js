// ===================================
// Punjab Transport Tracker Configuration
// ===================================

// Firebase Configuration
// Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyAtFRU9a-l22B85AuzfySTUQD245AE3o30",
  authDomain: "punjab-transport-tracker-e05b3.firebaseapp.com",
  databaseURL: "https://punjab-transport-tracker-e05b3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "punjab-transport-tracker-e05b3",
  storageBucket: "punjab-transport-tracker-e05b3.firebasestorage.app",
  messagingSenderId: "387953050990",
  appId: "1:387953050990:web:197b336f369eed2929ed7f",
  measurementId: "G-6GT6FV79YP"
};

// Initialize Firebase with proper error handling
let database, auth;

try {
  // Check if Firebase is loaded
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded!');
    throw new Error('Firebase SDK not loaded');
  }
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
  
  // Get Firebase services with error handling
  try {
    database = firebase.database();
    console.log('Firebase Database initialized');
  } catch (dbError) {
    console.error('Firebase Database initialization failed:', dbError);
  }
  
  try {
    // Check if auth module is loaded before using it
    if (firebase.auth) {
      auth = firebase.auth();
      console.log('Firebase Auth initialized');
    } else {
      console.warn('Firebase Auth module not loaded - authentication features will be disabled');
    }
  } catch (authError) {
    console.warn('Firebase Auth initialization failed:', authError);
  }
  
} catch (error) {
  console.error('Firebase initialization failed:', error);
  // Set fallback values
  database = null;
  auth = null;
}

// ===================================
// Enhanced Data Structure for Passenger Benefits
// ===================================

const enhancedDataStructure = {
    // Enhanced Driver Profiles
    drivers: {
        "DR001": {
            id: "DR001",
            name: "Rajinder Singh",
            phone: "+919876543210",
            email: "rajinder.singh@punjabtransport.gov.in",
            license: "PB-DL-2020-001234",
            licenseExpiry: "2025-12-31",
            experience: "8 years",
            rating: 4.7,
            totalTrips: 2456,
            safetyScore: 98,
            languages: ["Punjabi", "Hindi", "English"],
            emergencyContact: "+919876543211",
            photo: "https://example.com/driver-photos/dr001.jpg",
            medicalCertificate: "Valid until 2025-06-30",
            currentRoute: "CH-001",
            status: "active", // active, inactive, on-break, emergency
            lastUpdated: "2024-01-01T10:30:00Z",
            achievements: ["Safe Driver Award 2023", "Customer Service Excellence"]
        }
    },

    // Enhanced Bus Information
    buses: {
        "BUS001": {
            id: "BUS001",
            number: "PB-07-1234",
            model: "Ashok Leyland 2020",
            capacity: 45,
            type: "AC Deluxe", // AC Deluxe, Non-AC, Low Floor, Electric
            fuel: "CNG",
            features: ["GPS", "CCTV", "WiFi", "USB Charging", "Wheelchair Access"],
            lastMaintenance: "2024-01-15",
            nextMaintenance: "2024-02-15",
            insuranceExpiry: "2024-12-31",
            fitnessExpiry: "2024-11-30",
            currentDriver: "DR001",
            currentRoute: "CH-001",
            status: "active", // active, maintenance, breakdown, out-of-service
            realTimeData: {
                latitude: 30.7333,
                longitude: 76.7794,
                speed: 35,
                heading: 90,
                occupancy: 23, // Current passenger count
                fuelLevel: 75,
                engineTemp: 85,
                lastUpdated: "2024-01-01T10:35:00Z"
            }
        }
    },

    // Enhanced Route Information
    routes: {
        "chandigarh": {
            "CH-001": {
                id: "CH-001",
                routeNumber: "CH-001",
                routeName: "Sector 17 to Railway Station Express",
                city: "chandigarh",
                routeType: "express",
                operationalHours: {
                    weekdays: { start: "06:00", end: "23:00" },
                    weekends: { start: "07:00", end: "22:00" },
                    holidays: { start: "08:00", end: "21:00" }
                },
                frequency: {
                    peak: 10, // minutes during peak hours
                    normal: 15, // minutes during normal hours
                    offPeak: 20 // minutes during off-peak hours
                },
                peakHours: [
                    { start: "07:00", end: "10:00" },
                    { start: "17:00", end: "20:00" }
                ],
                fare: {
                    regular: 15,
                    student: 10,
                    senior: 8,
                    disabled: 0
                },
                distance: 12.5, // km
                estimatedDuration: 35, // minutes
                accessibility: true,
                features: ["AC", "CCTV", "GPS Tracking", "Digital Display"],
                stops: [
                    {
                        id: "CH001_01",
                        name: "Sector 17 Bus Terminal",
                        latitude: 30.7410,
                        longitude: 76.7822,
                        amenities: ["Shelter", "Seating", "Digital Display", "Ticket Counter"],
                        accessibility: true,
                        estimatedTime: 0, // minutes from start
                        landmarks: ["City Centre Mall", "Neelam Theatre"]
                    },
                    {
                        id: "CH001_02",
                        name: "Sector 22 Market",
                        latitude: 30.7340,
                        longitude: 76.7752,
                        amenities: ["Shelter", "Seating"],
                        accessibility: true,
                        estimatedTime: 8,
                        landmarks: ["Sector 22 Market", "Community Centre"]
                    },
                    {
                        id: "CH001_03",
                        name: "Sector 35 Shopping Complex",
                        latitude: 30.7240,
                        longitude: 76.7602,
                        amenities: ["Shelter", "Seating", "Digital Display"],
                        accessibility: true,
                        estimatedTime: 18,
                        landmarks: ["Shopping Complex", "Bank of India"]
                    },
                    {
                        id: "CH001_04",
                        name: "Chandigarh Railway Station",
                        latitude: 30.6954,
                        longitude: 76.8302,
                        amenities: ["Shelter", "Seating", "Digital Display", "Ticket Counter", "Restrooms"],
                        accessibility: true,
                        estimatedTime: 35,
                        landmarks: ["Railway Station", "ISBT Sector 43"]
                    }
                ],
                activeBuses: ["BUS001"],
                status: "active",
                lastUpdated: "2024-01-01T10:00:00Z"
            }
        }
    },

    // Real-time Bus Tracking
    live_tracking: {
        "BUS001": {
            routeId: "CH-001",
            currentStop: "CH001_02",
            nextStop: "CH001_03",
            estimatedArrival: {
                "CH001_03": "2024-01-01T10:45:00Z",
                "CH001_04": "2024-01-01T11:02:00Z"
            },
            delay: 3, // minutes (positive = late, negative = early)
            occupancy: 23,
            lastGPSUpdate: "2024-01-01T10:35:00Z",
            speed: 35,
            direction: "towards_destination"
        }
    },

    // Bus Stop Real-time Information
    stop_arrivals: {
        "CH001_03": {
            stopName: "Sector 35 Shopping Complex",
            upcomingBuses: [
                {
                    busId: "BUS001",
                    routeNumber: "CH-001",
                    estimatedArrival: "2024-01-01T10:45:00Z",
                    delay: 3,
                    occupancy: "moderate", // low, moderate, high, full
                    accessibility: true
                },
                {
                    busId: "BUS002",
                    routeNumber: "CH-001",
                    estimatedArrival: "2024-01-01T11:00:00Z",
                    delay: 0,
                    occupancy: "low",
                    accessibility: true
                }
            ],
            lastUpdated: "2024-01-01T10:35:00Z"
        }
    },

    // Service Alerts and Announcements
    service_alerts: {
        "alert_001": {
            id: "alert_001",
            type: "delay", // delay, cancellation, route_change, maintenance, weather
            severity: "medium", // low, medium, high, critical
            affectedRoutes: ["CH-001"],
            affectedStops: ["CH001_03", "CH001_04"],
            title: "Traffic Congestion Delay",
            message: "Buses on Route CH-001 are experiencing 5-10 minute delays due to traffic congestion near Sector 35.",
            startTime: "2024-01-01T10:30:00Z",
            endTime: "2024-01-01T12:00:00Z",
            isActive: true,
            lastUpdated: "2024-01-01T10:35:00Z"
        }
    }
};

// ===================================
// Application Configuration
// ===================================

const appConfig = {
    appName: "Punjab Transport Tracker",
    version: "1.0.0",
    environment: "production", // 'development' or 'production'
    
    // Map Configuration - Using Google Earth and Google Maps
    map: {
        defaultCenter: { lat: 31.1471, lng: 75.3412 }, // Punjab center
        defaultZoom: 8,
        maxZoom: 18,
        minZoom: 6,
        
        // Primary provider: Google Earth/Maps
        provider: 'google', // 'google', 'leaflet', 'mappls'
        
        // Google Earth/Maps Configuration
        google: {
            // TODO: Replace with your actual Google Cloud API key
            apiKey: 'AIzaSyC0p0-2n_otSc39b2N4LeennvO7DZ5mXbA', // Google Cloud Console API Key
            
            // Map types available
            mapTypes: {
                roadmap: 'roadmap',     // Standard road map
                satellite: 'satellite', // Satellite imagery
                hybrid: 'hybrid',       // Satellite with labels
                terrain: 'terrain',     // Terrain view
                earth: 'earth'          // Google Earth view (3D)
            },
            
            // Default map type
            defaultMapType: 'satellite', // Use satellite view by default
            
            // Google Earth specific settings
            earth: {
                enable3D: true,
                tilt: 45,              // 3D tilt angle
                heading: 0,            // Initial heading
                enableTerrain: true,   // Show 3D terrain
                enableBuildings: true, // Show 3D buildings
                enableImagery: true    // High-resolution imagery
            },
            
            // Map controls
            controls: {
                zoom: true,
                mapType: true,
                streetView: true,
                fullscreen: true,
                rotate: true,
                tilt: true
            },
            
            // Styling options
            styles: {
                // Custom map styling (optional)
                hideLabels: false,
                hideRoads: false,
                customStyle: [] // Custom Google Maps styling array
            }
        },
        
        // Fallback: OpenStreetMap with Leaflet (when Google API not available)
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        
        // MapmyIndia configuration (secondary fallback)
        mappls: {
            // TODO: Replace with your actual MapmyIndia API keys
            restApiKey: '', // Get from https://apis.mappls.com/console/
            mapSdkKey: '', // Get from https://apis.mappls.com/console/
            licenseKey: '', // Get from https://apis.mappls.com/console/
            // Tile layer template (will be used when API key is configured)
            tileLayerTemplate: 'https://apis.mappls.com/advancedmaps/v1/{restApiKey}/map_tiles/{z}/{x}/{y}.png',
            satelliteLayerTemplate: 'https://apis.mappls.com/advancedmaps/v1/{restApiKey}/map_tiles/{z}/{x}/{y}.png?layer=satellite',
            // Style IDs for different map styles
            styles: {
                standard: 'standard',
                satellite: 'satellite',
                terrain: 'terrain',
                traffic: 'traffic'
            },
            // Search configuration
            search: {
                enabled: true,
                radius: 5000, // 5km search radius
                includeTokenizeAddress: true
            },
            // Geocoding configuration
            geocoding: {
                enabled: true,
                region: 'IND', // India
                bias: 'punjab' // Bias towards Punjab
            }
        }
    },
    
    // GPS Update Intervals (in milliseconds)
    gps: {
        updateInterval: 5000, // 5 seconds
        highAccuracyMode: true,
        timeout: 10000,
        maximumAge: 0
    },
    
    // Bus Tracking Configuration
    tracking: {
        staleDataThreshold: 300000, // 5 minutes - mark as inactive
        locationHistoryLimit: 50, // Keep last 50 locations
        speedCalculationInterval: 3, // Calculate speed over last 3 updates
    },
    
    // UI Configuration
    ui: {
        animationDuration: 300,
        toastDuration: 3000,
        autoRefreshInterval: 30000, // 30 seconds
        maxBusesPerRoute: 50
    }
};

// ===================================
// Punjab Cities and Routes Data
// ===================================

const punjabData = {
    cities: {
        chandigarh: {
            name: "Chandigarh",
            coordinates: { lat: 30.7333, lng: 76.7794 },
            zoom: 12
        },
        ludhiana: {
            name: "Ludhiana",
            coordinates: { lat: 30.901, lng: 75.8573 },
            zoom: 12
        },
        amritsar: {
            name: "Amritsar",
            coordinates: { lat: 31.6340, lng: 74.8723 },
            zoom: 12
        },
        jalandhar: {
            name: "Jalandhar",
            coordinates: { lat: 31.3260, lng: 75.5762 },
            zoom: 12
        },
        patiala: {
            name: "Patiala",
            coordinates: { lat: 30.3398, lng: 76.3869 },
            zoom: 12
        },
        bathinda: {
            name: "Bathinda",
            coordinates: { lat: 30.2110, lng: 74.9455 },
            zoom: 12
        },
        mohali: {
            name: "Mohali",
            coordinates: { lat: 30.7046, lng: 76.7179 },
            zoom: 13
        },
        pathankot: {
            name: "Pathankot",
            coordinates: { lat: 32.2643, lng: 75.6421 },
            zoom: 12
        }
    },
    
    routes: {
        chandigarh: [
            {
                id: 'ch1',
                name: 'Route 1: Sector 17 to Sector 43',
                color: '#FF6B6B',
                stops: [
                    { id: 's1', name: 'Sector 17', lat: 30.7410, lng: 76.7822, stopTime: 2 },
                    { id: 's2', name: 'Sector 22', lat: 30.7340, lng: 76.7752, stopTime: 2 },
                    { id: 's3', name: 'Sector 35', lat: 30.7240, lng: 76.7602, stopTime: 2 },
                    { id: 's4', name: 'Sector 43', lat: 30.7150, lng: 76.7450, stopTime: 3 }
                ]
            },
            {
                id: 'ch2',
                name: 'Route 2: PGI to Railway Station',
                color: '#4ECDC4',
                stops: [
                    { id: 's1', name: 'PGI', lat: 30.7649, lng: 76.7748, stopTime: 3 },
                    { id: 's2', name: 'Sector 12', lat: 30.7510, lng: 76.7750, stopTime: 2 },
                    { id: 's3', name: 'Sector 17', lat: 30.7410, lng: 76.7822, stopTime: 2 },
                    { id: 's4', name: 'Railway Station', lat: 30.6954, lng: 76.8302, stopTime: 5 }
                ]
            }
        ],
        ludhiana: [
            {
                id: 'ld1',
                name: 'Route 1: Bus Stand to PAU',
                color: '#FF6B6B',
                stops: [
                    { id: 's1', name: 'Bus Stand', lat: 30.9120, lng: 75.8473, stopTime: 5 },
                    { id: 's2', name: 'Clock Tower', lat: 30.9060, lng: 75.8490, stopTime: 2 },
                    { id: 's3', name: 'Civil Hospital', lat: 30.9010, lng: 75.8520, stopTime: 3 },
                    { id: 's4', name: 'PAU', lat: 30.9010, lng: 75.8073, stopTime: 5 }
                ]
            }
        ],
        amritsar: [
            {
                id: 'am1',
                name: 'Route 1: Golden Temple to Airport',
                color: '#FFD93D',
                stops: [
                    { id: 's1', name: 'Golden Temple', lat: 31.6200, lng: 74.8765, stopTime: 5 },
                    { id: 's2', name: 'Hall Gate', lat: 31.6240, lng: 74.8690, stopTime: 2 },
                    { id: 's3', name: 'Chheharta', lat: 31.6580, lng: 74.8130, stopTime: 3 },
                    { id: 's4', name: 'Airport', lat: 31.7096, lng: 74.7973, stopTime: 5 }
                ]
            }
        ]
    }
};

// ===================================
// Utility Functions
// ===================================

const utils = {
    // Generate unique ID
    generateId: () => {
        return '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Generate or get device ID
    getDeviceId: () => {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            // Create a unique device ID based on various browser characteristics
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Device fingerprint', 2, 2);
            
            const fingerprint = [
                navigator.userAgent,
                navigator.language,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                canvas.toDataURL()
            ].join('|');
            
            // Create a hash-like ID from the fingerprint
            let hash = 0;
            for (let i = 0; i < fingerprint.length; i++) {
                const char = fingerprint.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            deviceId = 'DEV_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
            localStorage.setItem('device_id', deviceId);
            console.log('Generated new device ID:', deviceId);
        }
        return deviceId;
    },
    
    // Get device info
    getDeviceInfo: () => {
        return {
            id: utils.getDeviceId(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: screen.width + 'x' + screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            online: navigator.onLine,
            timestamp: Date.now()
        };
    },
    
    // Format timestamp
    formatTime: (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },
    
    // Calculate distance between two points
    calculateDistance: (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },
    
    // Calculate speed
    calculateSpeed: (distance, time) => {
        // distance in km, time in hours
        return Math.round((distance / time) * 10) / 10;
    },
    
    // Check if location is stale
    isLocationStale: (timestamp) => {
        return (Date.now() - timestamp) > appConfig.tracking.staleDataThreshold;
    },
    
    // Validate phone number
    validatePhone: (phone) => {
        const regex = /^\+91[0-9]{10}$/;
        return regex.test(phone);
    },
    
    // Show toast notification
    showToast: (message, type = 'info') => {
        // This would be implemented based on your toast library
        console.log(`${type.toUpperCase()}: ${message}`);
    }
};

// ===================================
// Demo/Test Data (Remove in production)
// ===================================

const demoData = {
    drivers: [
        {
            id: 'DR001',
            name: 'Rajinder Singh',
            phone: '+919876543210',
            license: 'PB-DL-2020-001234',
            experience: '5 years'
        },
        {
            id: 'DR002',
            name: 'Harpreet Kaur',
            phone: '+919876543211',
            license: 'PB-DL-2019-005678',
            experience: '7 years'
        }
    ],
    
    buses: [
        {
            busNumber: 'PB-01-1234',
            type: 'Regular',
            capacity: 50,
            features: ['GPS', 'AC']
        },
        {
            busNumber: 'PB-01-5678',
            type: 'Deluxe',
            capacity: 40,
            features: ['GPS', 'AC', 'WiFi']
        }
    ],
    
    adminCredentials: {
        email: 'admin@demo.com',
        password: 'admin123'
    }
};

// ===================================
// Error Messages
// ===================================

const errorMessages = {
    network: 'Network error. Please check your internet connection.',
    gpsPermission: 'Please enable GPS permission to use this feature.',
    gpsUnavailable: 'GPS is not available on this device.',
    authFailed: 'Authentication failed. Please check your credentials.',
    dataLoadFailed: 'Failed to load data. Please try again.',
    invalidInput: 'Please fill all required fields correctly.',
    sessionExpired: 'Your session has expired. Please login again.',
    generalError: 'Something went wrong. Please try again later.'
};

// ===================================
// Success Messages
// ===================================

const successMessages = {
    loginSuccess: 'Login successful!',
    trackingStarted: 'GPS tracking started successfully.',
    trackingStopped: 'GPS tracking stopped.',
    dataUpdated: 'Data updated successfully.',
    busAssigned: 'Bus assigned successfully.',
    alertSent: 'Alert sent successfully.'
};

// Export for use in other files
// ===================================

// Add Firebase connection checker
function checkFirebaseConnection() {
    return new Promise((resolve, reject) => {
        if (!database) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const testRef = database.ref('.info/connected');
        testRef.once('value', (snapshot) => {
            if (snapshot.val() === true) {
                resolve(true);
            } else {
                reject(new Error('Not connected to Firebase'));
            }
        }, (error) => {
            reject(error);
        });
    });
}

// Add global error handler for Firebase
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('firebase')) {
        console.error('Firebase error detected:', event.error);
    }
});

console.log('Punjab Transport Tracker - Configuration Loaded');
console.log(`Environment: ${appConfig.environment}`);
console.log(`Version: ${appConfig.version}`);
if (database) {
    console.log('✅ Firebase Database: Connected');
} else {
    console.log('❌ Firebase Database: Not Connected');
}
if (auth) {
    console.log('✅ Firebase Auth: Available');
} else {
    console.log('⚠️ Firebase Auth: Not Available');
}

// Make configuration available globally
window.PTTConfig = {
    firebase: firebaseConfig,
    app: appConfig,
    data: punjabData,
    utils: utils,
    demo: demoData,
    enhanced: enhancedDataStructure, // Add enhanced data structure
    messages: {
        error: errorMessages,
        success: successMessages
    },
    checkConnection: checkFirebaseConnection
};

// Make Firebase services available globally
window.database = database;
window.auth = auth;

// ===================================
// Enhanced Passenger-Focused Data Structure
// ===================================

const enhancedPassengerData = {
    // Comprehensive Bus Stop Information
    busStops: {
        "CH001_01": {
            id: "CH001_01",
            name: "Sector 17 Bus Terminal",
            latitude: 30.7410,
            longitude: 76.7822,
            address: "Sector 17, Chandigarh, Punjab 160017",
            amenities: {
                shelter: true,
                seating: 20,
                digitalDisplay: true,
                realTimeInfo: true,
                ticketCounter: true,
                restrooms: true,
                waterFountain: true,
                wifi: true,
                cctv: 4,
                lighting: "LED",
                emergencyButton: true,
                wheelchair_access: true,
                audio_announcements: true
            },
            connectivity: {
                wifi_ssid: "Punjab_Transport_Free_WiFi",
                mobile_coverage: "Excellent",
                charging_ports: 8
            },
            safety: {
                security_rating: 9.2,
                police_station_distance: "500m",
                hospital_distance: "1.2km",
                emergency_contact: "+91-172-2740000"
            },
            accessibility: {
                wheelchair_friendly: true,
                blind_friendly_features: ["Audio announcements", "Braille signage", "Tactile pathways"],
                elderly_friendly: true,
                dedicated_seating: 6
            },
            nearbyLandmarks: [
                { name: "City Centre Mall", distance: "100m", walking_time: "2 minutes" },
                { name: "Neelam Theatre", distance: "200m", walking_time: "3 minutes" },
                { name: "Plaza Shopping Complex", distance: "150m", walking_time: "2 minutes" }
            ],
            connectedRoutes: ["CH-001", "CH-002", "CH-003", "CH-010"],
            averageWaitTime: {
                peak: 8,
                normal: 12,
                offPeak: 15
            },
            crowdingPattern: {
                "06:00-09:00": "High",
                "09:00-17:00": "Moderate",
                "17:00-20:00": "High",
                "20:00-23:00": "Low"
            },
            weatherProtection: "Full coverage",
            lastMaintenance: "2024-01-15",
            maintenanceSchedule: "Weekly - Mondays"
        }
    },

    // Real-time Arrival Predictions with Enhanced Details
    arrivalPredictions: {
        "CH001_01": {
            stopId: "CH001_01",
            stopName: "Sector 17 Bus Terminal",
            lastUpdated: "2024-01-01T10:40:00Z",
            currentWeather: {
                condition: "Clear",
                temperature: 18,
                visibility: "Good",
                impact_on_service: "None"
            },
            trafficCondition: {
                level: "Moderate",
                cause: "Morning office traffic",
                expected_delay: 3,
                alternative_routes: ["CH-002"]
            },
            upcomingBuses: [
                {
                    busId: "BUS001",
                    busNumber: "PB-07-1234",
                    routeId: "CH-001",
                    routeName: "Sector 17 to Railway Station Express",
                    driver: {
                        name: "Rajinder Singh",
                        rating: 4.7,
                        experience: "8 years",
                        languages: ["Punjabi", "Hindi", "English"]
                    },
                    estimatedArrival: "2024-01-01T10:42:00Z",
                    arrivalConfidence: 95,
                    currentDelay: 2,
                    delayReason: "Traffic congestion near Sector 22",
                    occupancy: {
                        percentage: 65,
                        available_seats: 16,
                        wheelchair_spaces: 1,
                        standing_room: "Limited"
                    },
                    busFeatures: {
                        ac: true,
                        wifi: true,
                        usb_charging: true,
                        wheelchair_access: true,
                        cctv: true,
                        audio_system: true,
                        gps_tracking: true,
                        emergency_button: true
                    },
                    comfortLevel: {
                        temperature: 22,
                        cleanliness: 9.1,
                        noise_level: "Low",
                        ride_quality: "Smooth"
                    },
                    nextStops: [
                        { name: "Sector 22 Market", eta: "2024-01-01T10:50:00Z" },
                        { name: "Sector 35 Complex", eta: "2024-01-01T11:00:00Z" },
                        { name: "Railway Station", eta: "2024-01-01T11:17:00Z" }
                    ],
                    fare: {
                        to_destination: 15,
                        payment_methods: ["Cash", "UPI", "Card", "Transport Card"]
                    },
                    passengerAlerts: [
                        "Bus is wheelchair accessible",
                        "Free WiFi available",
                        "Next stop: Sector 22 Market in 8 minutes"
                    ]
                }
            ],
            serviceAlerts: [
                {
                    type: "info",
                    message: "Next bus in CH-001 route arriving in 2 minutes",
                    priority: "normal"
                }
            ],
            alternativeOptions: [
                {
                    route: "CH-002",
                    nextArrival: "2024-01-01T10:45:00Z",
                    advantage: "Less crowded",
                    additionalTime: 5
                }
            ]
        }
    },

    // Enhanced Service Alerts
    serviceAlerts: {
        "alert_001": {
            id: "alert_001",
            type: "delay",
            severity: "medium",
            title: "Traffic Delay on Route CH-001",
            message: "Buses on Route CH-001 experiencing 5-10 minute delays due to traffic congestion near Sector 35. Alternative route CH-002 is operating normally.",
            affectedRoutes: ["CH-001"],
            affectedStops: ["CH001_03", "CH001_04"],
            estimatedResolution: "2024-01-01T12:00:00Z",
            alternatives: [
                {
                    route: "CH-002",
                    reason: "No delays reported",
                    additionalTime: 10
                }
            ],
            passengerAdvice: "Consider using Route CH-002 or wait for next available bus. Real-time updates available on app.",
            startTime: "2024-01-01T10:30:00Z",
            lastUpdated: "2024-01-01T10:35:00Z",
            isActive: true,
            priority: "high"
        }
    },

    // Passenger Journey Planning
    journeyPlanning: {
        "sector17_to_railway": {
            origin: {
                stopId: "CH001_01",
                name: "Sector 17 Bus Terminal",
                coordinates: { lat: 30.7410, lng: 76.7822 }
            },
            destination: {
                stopId: "CH001_04",
                name: "Chandigarh Railway Station",
                coordinates: { lat: 30.6954, lng: 76.8302 }
            },
            distance: 12.5,
            directRoute: {
                routeId: "CH-001",
                estimatedTime: 35,
                totalFare: 15,
                transfers: 0,
                accessibility: "Full",
                nextDeparture: "2024-01-01T10:42:00Z",
                frequency: "Every 10 minutes"
            },
            alternativeRoutes: [
                {
                    routeId: "CH-002",
                    estimatedTime: 42,
                    totalFare: 18,
                    transfers: 1,
                    transferPoint: "Sector 22 Market",
                    advantage: "Less crowded",
                    nextDeparture: "2024-01-01T10:45:00Z"
                }
            ],
            walkingOption: {
                distance: 12.5,
                estimatedTime: "2 hours 30 minutes",
                difficulty: "Moderate",
                recommendation: "Not recommended for long distance"
            },
            recommendations: [
                "Route CH-001 is the fastest option",
                "Morning peak hours - expect moderate crowding",
                "WiFi available on all buses",
                "Wheelchair accessible buses available"
            ]
        }
    },

    // Passenger Feedback System
    feedback: {
        "feedback_001": {
            id: "feedback_001",
            userId: "anonymous",
            busId: "BUS001",
            routeId: "CH-001",
            stopId: "CH001_01",
            timestamp: "2024-01-01T10:30:00Z",
            ratings: {
                overall: 4.5,
                cleanliness: 4.0,
                punctuality: 5.0,
                driverBehavior: 4.5,
                comfortLevel: 4.0,
                safety: 5.0
            },
            comments: "Excellent service and very punctual. Driver was very helpful and professional.",
            categories: ["positive", "punctuality", "driver_appreciation"]
        }
    }
};

// Make enhanced passenger data available globally
window.PTTEnhanced = enhancedPassengerData;