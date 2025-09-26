// ===================================
// Punjab Transport Tracker - Enhanced Driver App with IoT Support
// ===================================

// Global variables
let driverMap, driverMarker, driverInfo, busAssignment;
let isTracking = false;
let watchId = null;
let driverLocationWatchId = null; // For tracking driver location even when not on duty
let deviceId = null; // Store device ID for this session
let trackingMode = 'mobile'; // 'mobile' or 'iot'
let iotDeviceId = null; // Associated IoT device ID
let iotDataInterval = null; // Interval for receiving IoT data

document.addEventListener('DOMContentLoaded', () => {
    console.log('Driver app DOM loaded');
    
    // Check if required libraries are loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded!');
        alert('Map library failed to load. Please refresh the page.');
        return;
    }
    
    // Wait for configuration to load
    let configCheckAttempts = 0;
    const maxConfigAttempts = 50; // 5 seconds total
    
    const checkConfig = () => {
        if (typeof PTTConfig !== 'undefined') {
            console.log('Configuration loaded successfully');
            
            // Check if CommonUtils is loaded
            if (typeof CommonUtils !== 'undefined') {
                console.log('CommonUtils loaded successfully');
                
                // Check if driver is already logged in from a previous session
                const storedDriver = sessionStorage.getItem('driverInfo');
                if (storedDriver) {
                    driverInfo = JSON.parse(storedDriver);
                    showDashboard();
                } else {
                    showLogin();
                }
            } else {
                console.error('CommonUtils not loaded!');
                alert('Common utilities failed to load. Please refresh the page.');
            }
        } else {
            configCheckAttempts++;
            if (configCheckAttempts < maxConfigAttempts) {
                setTimeout(checkConfig, 100);
            } else {
                console.error('Configuration failed to load after timeout');
                alert('Configuration failed to load. Please refresh the page.');
            }
        }
    };
    
    checkConfig();
});

function driverLogin(event) {
    event.preventDefault();
    const phone = document.getElementById('phoneNumber').value;
    const driverId = document.getElementById('driverId').value;

    // Get device ID for this session
    deviceId = PTTConfig.utils.getDeviceId();
    console.log('Device ID for this session:', deviceId);

    // In a real app, you would verify this against a database. We use demo data from config.js
    const validDriver = PTTConfig.demo.drivers.find(d => d.id === driverId && d.phone === phone);
    
    if (validDriver) {
        const loginTime = Date.now();
        driverInfo = {
            ...validDriver,
            deviceId: deviceId,
            sessionStart: loginTime,
            workShiftStart: loginTime, // Track when work shift begins
            totalWorkHours: 0, // Initialize work hours counter
            breakTime: 0, // Track break duration
            fatigueLevel: 'normal' // Track fatigue level
        };
        
        // Store driver info with work tracking data
        sessionStorage.setItem('driverInfo', JSON.stringify(driverInfo));
        
        // Log driver work session in Firebase for fatigue management
        if (database) {
            database.ref(`driver_work_sessions/${driverId}/${loginTime}`).set({
                driverId: driverId,
                driverName: validDriver.name,
                sessionStart: firebase.database.ServerValue.TIMESTAMP,
                deviceId: deviceId,
                status: 'logged_in',
                shiftType: getShiftType(loginTime), // morning/afternoon/night
                deviceInfo: PTTConfig.utils.getDeviceInfo()
            }).catch(error => {
                console.warn('Failed to log work session:', error);
            });
            
            // Update driver current status
            database.ref(`drivers_status/${driverId}`).set({
                status: 'logged_in',
                lastLogin: firebase.database.ServerValue.TIMESTAMP,
                deviceId: deviceId,
                currentShiftStart: loginTime
            }).catch(error => {
                console.warn('Failed to update driver status:', error);
            });
        }
        
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(`Welcome ${validDriver.name}! Work shift started.`, 'success');
        }
        
        showDashboard();
    } else {
        alert('Invalid credentials. Please try again.');
    }
}

function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('driverDashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('driverDashboard').classList.remove('hidden');
    document.getElementById('driverName').textContent = `Welcome, ${driverInfo.name}`;
    
    // Populate driver info card with work session details
    const infoDiv = document.getElementById('driverInfo');
    infoDiv.innerHTML = `
        <p><strong>ID:</strong> ${driverInfo.id}</p>
        <p><strong>Name:</strong> ${driverInfo.name}</p>
        <p><strong>Phone:</strong> ${driverInfo.phone}</p>
        <p><strong>Shift Started:</strong> ${new Date(driverInfo.workShiftStart).toLocaleTimeString()}</p>
        <p><strong>Fatigue Level:</strong> <span id="fatigueLevel" class="${getFatigueLevelColor(driverInfo.fatigueLevel)}">${driverInfo.fatigueLevel.toUpperCase()}</span></p>
    `;

    // Initialize engaging dashboard (no tracking modes)
    initializeEngagingDashboard();

    // Initialize map without GPS tracking
    setTimeout(() => {
        initializeDriverMap();
        // Start work hour tracking
        startWorkHourTracking();
        // Update dashboard stats
        updateDashboardStats();
    }, 100);
    
    document.getElementById('busCity').addEventListener('change', populateRoutes);
}

// Helper function to determine shift type
function getShiftType(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
}

// Helper function to get fatigue level color class
function getFatigueLevelColor(level) {
    switch(level) {
        case 'normal': return 'text-green-600';
        case 'caution': return 'text-yellow-600';
        case 'danger': return 'text-red-600';
        default: return 'text-gray-600';
    }
}

// Start work hour tracking for fatigue management
function startWorkHourTracking() {
    // Update work hours every minute
    setInterval(() => {
        if (driverInfo && driverInfo.workShiftStart) {
            const currentTime = Date.now();
            const workHours = (currentTime - driverInfo.workShiftStart) / (1000 * 60 * 60); // Convert to hours
            
            // Update driver info
            driverInfo.totalWorkHours = workHours;
            
            // Calculate fatigue level based on work hours
            let fatigueLevel = 'normal';
            if (workHours >= 8) fatigueLevel = 'caution';
            if (workHours >= 12) fatigueLevel = 'danger';
            
            driverInfo.fatigueLevel = fatigueLevel;
            
            // Update session storage
            sessionStorage.setItem('driverInfo', JSON.stringify(driverInfo));
            
            // Update both old and new UI elements
            updateWorkHourDisplay();
            updateDashboardStats();
            
            // Log work hours in Firebase every 30 minutes
            if (Math.floor(workHours * 2) !== Math.floor((workHours - 1/60) * 2)) {
                logWorkHours();
            }
            
            // Show fatigue warnings
            if (workHours >= 8 && workHours < 8.1) {
                if (typeof CommonUtils !== 'undefined') {
                    CommonUtils.showNotification('You\'ve been working for 8 hours. Consider taking a break soon! ☕', 'warning');
                }
            } else if (workHours >= 12 && workHours < 12.1) {
                if (typeof CommonUtils !== 'undefined') {
                    CommonUtils.showNotification('Important: You\'ve reached 12 hours of work. Please take a mandatory rest! 😴', 'error');
                }
            }
        }
    }, 60000); // Every minute
    
    console.log('Work hour tracking started');
}

// Update work hour display in UI (legacy support)
function updateWorkHourDisplay() {
    const fatigueElement = document.getElementById('fatigueLevel');
    const tripDurationElement = document.getElementById('tripDuration');
    
    if (fatigueElement) {
        fatigueElement.textContent = driverInfo.fatigueLevel.toUpperCase();
        fatigueElement.className = getFatigueLevelColor(driverInfo.fatigueLevel);
    }
    
    if (tripDurationElement) {
        const hours = Math.floor(driverInfo.totalWorkHours);
        const minutes = Math.floor((driverInfo.totalWorkHours % 1) * 60);
        tripDurationElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}

// Update dashboard statistics in real-time
function updateDashboardStats() {
    // Update work hours
    const workHoursElement = document.getElementById('dashboardWorkHours');
    if (workHoursElement && driverInfo) {
        const hours = Math.floor(driverInfo.totalWorkHours || 0);
        const minutes = Math.floor(((driverInfo.totalWorkHours || 0) % 1) * 60);
        workHoursElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Update status based on current activity
    const statusElement = document.getElementById('dashboardStatus');
    if (statusElement) {
        if (isTracking) {
            statusElement.textContent = 'On Duty';
            statusElement.className = 'text-lg font-bold text-green-400';
        } else if (busAssignment) {
            statusElement.textContent = 'Ready';
            statusElement.className = 'text-lg font-bold text-blue-400';
        } else {
            statusElement.textContent = 'Standby';
            statusElement.className = 'text-lg font-bold text-yellow-400';
        }
    }
    
    // Update map driver name
    const mapDriverNameElement = document.getElementById('mapDriverName');
    if (mapDriverNameElement && driverInfo) {
        if (isTracking) {
            mapDriverNameElement.textContent = `${driverInfo.name} - On Duty`;
        } else {
            mapDriverNameElement.textContent = `${driverInfo.name} - Ready`;
        }
    }
    
    // Simulate trip count (in real app, this would come from database)
    const tripsElement = document.getElementById('dashboardTrips');
    if (tripsElement) {
        const tripCount = sessionStorage.getItem('todayTrips') || '0';
        tripsElement.textContent = tripCount;
    }
    
    // Update rating (in real app, this would come from passenger feedback)
    const ratingElement = document.getElementById('dashboardRating');
    if (ratingElement) {
        const rating = driverInfo.rating || 4.8;
        ratingElement.textContent = rating.toFixed(1);
    }
}

// Add interactive notifications and motivational messages
function showMotivationalMessage() {
    const messages = [
        { text: "Great job maintaining perfect safety record! 🛡️", type: "success" },
        { text: "You're helping keep Punjab moving! 🚌", type: "info" },
        { text: "Remember to take breaks for your wellbeing 😌", type: "info" },
        { text: "Your punctuality is appreciated by passengers! ⏰", type: "success" },
        { text: "Drive safe, drive smart! 🛣️", type: "info" }
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification(randomMessage.text, randomMessage.type, 4000);
    }
}

// Enhanced bus assignment with better validation
function saveBusAssignment() {
    const city = document.getElementById('busCity').value;
    const busNumber = document.getElementById('busNumber').value;
    const routeId = document.getElementById('busRoute').value;

    console.log('Bus assignment attempt:', { city, busNumber, routeId });

    if (!city || !busNumber || !routeId) {
        const missingFields = [];
        if (!city) missingFields.push('City');
        if (!busNumber) missingFields.push('Bus Number');
        if (!routeId) missingFields.push('Route');
        
        const message = `Please fill out: ${missingFields.join(', ')}`;
        
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(message, 'warning');
        } else {
            alert(message);
        }
        return;
    }

    busAssignment = { city, busNumber, routeId };
    
    // Log assignment in Firebase
    if (database && driverInfo) {
        database.ref(`driver_bus_assignments/${driverInfo.id}`).set({
            ...busAssignment,
            assignedAt: firebase.database.ServerValue.TIMESTAMP,
            driverName: driverInfo.name
        }).catch(error => {
            console.warn('Failed to log bus assignment:', error);
        });
    }
    
    // Get route name for display
    let routeName = 'Selected Route';
    try {
        if (PTTConfig && PTTConfig.data && PTTConfig.data.routes && PTTConfig.data.routes[city]) {
            const route = PTTConfig.data.routes[city].find(r => r.id === routeId);
            if (route) {
                routeName = route.name;
            }
        }
    } catch (error) {
        console.warn('Could not get route name:', error);
    }
    
    // Show success message
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification(`✅ Successfully assigned to Bus ${busNumber} on ${routeName}! 🚌`, 'success');
    } else {
        alert('Bus assignment saved!');
    }
    
    // Enable tracking button
    const trackingBtn = document.getElementById('trackingBtn');
    if (trackingBtn) {
        trackingBtn.disabled = false;
        trackingBtn.classList.remove('bg-gray-400');
        trackingBtn.classList.add('bg-white');
    }
    
    // Update status message
    const statusMessage = document.querySelector('#trackingStatus p');
    if (statusMessage) {
        statusMessage.textContent = 'Ready to start your service! Good luck!';
    }
    
    // Update dashboard stats
    updateDashboardStats();
    
    // Show motivational message
    setTimeout(showMotivationalMessage, 2000);
    
    console.log('Bus assignment saved successfully:', busAssignment);
}

// Log work hours for fatigue management
function logWorkHours() {
    if (database && driverInfo) {
        const workData = {
            driverId: driverInfo.id,
            totalWorkHours: driverInfo.totalWorkHours,
            fatigueLevel: driverInfo.fatigueLevel,
            shiftStart: driverInfo.workShiftStart,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: isTracking ? 'active_duty' : 'on_break'
        };
        
        database.ref(`driver_fatigue_tracking/${driverInfo.id}`).push(workData)
            .catch(error => {
                console.warn('Failed to log work hours:', error);
            });
    }
}

// Initialize engaging driver dashboard (no GPS tracking)
function initializeEngagingDashboard() {
    // Add engaging dashboard elements
    const dashboardDiv = document.createElement('div');
    dashboardDiv.className = 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg mb-4';
    dashboardDiv.innerHTML = `
        <h3 class="text-xl font-bold mb-4 flex items-center">
            <i class="fas fa-tachometer-alt text-yellow-300 mr-3"></i>
            Driver Dashboard
        </h3>
        
        <!-- Quick Stats Row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
                <i class="fas fa-clock text-2xl text-yellow-300 mb-2"></i>
                <div class="text-sm opacity-90">Work Hours</div>
                <div class="text-lg font-bold" id="dashboardWorkHours">00:00</div>
            </div>
            <div class="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
                <i class="fas fa-user-check text-2xl text-green-300 mb-2"></i>
                <div class="text-sm opacity-90">Status</div>
                <div class="text-lg font-bold" id="dashboardStatus">Ready</div>
            </div>
            <div class="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
                <i class="fas fa-route text-2xl text-blue-300 mb-2"></i>
                <div class="text-sm opacity-90">Trips Today</div>
                <div class="text-lg font-bold" id="dashboardTrips">0</div>
            </div>
            <div class="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
                <i class="fas fa-star text-2xl text-orange-300 mb-2"></i>
                <div class="text-sm opacity-90">Rating</div>
                <div class="text-lg font-bold" id="dashboardRating">4.8</div>
            </div>
        </div>
        
        <!-- Driver Performance Card -->
        <div class="bg-white/10 backdrop-blur rounded-lg p-4">
            <h4 class="font-semibold mb-3 flex items-center">
                <i class="fas fa-chart-line text-green-300 mr-2"></i>
                Performance Overview
            </h4>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <div class="text-sm opacity-90 mb-1">Safety Score</div>
                    <div class="bg-white/20 rounded-full h-2 mb-1">
                        <div class="bg-green-400 h-2 rounded-full" style="width: 95%"></div>
                    </div>
                    <div class="text-xs">95% - Excellent</div>
                </div>
                <div>
                    <div class="text-sm opacity-90 mb-1">Punctuality</div>
                    <div class="bg-white/20 rounded-full h-2 mb-1">
                        <div class="bg-blue-400 h-2 rounded-full" style="width: 88%"></div>
                    </div>
                    <div class="text-xs">88% - Good</div>
                </div>
            </div>
        </div>
    `;
    
    // Insert at the beginning of the dashboard
    const driverDashboard = document.getElementById('driverDashboard');
    const firstCard = driverDashboard.querySelector('.bg-gradient-to-r');
    if (firstCard) {
        driverDashboard.insertBefore(dashboardDiv, firstCard.nextSibling);
    } else {
        const firstSection = driverDashboard.querySelector('.bg-white');
        driverDashboard.insertBefore(dashboardDiv, firstSection);
    }
    
    // Add achievement notifications
    addAchievementSystem();
    
    console.log('Engaging dashboard initialized');
}

// Add achievement and gamification system
function addAchievementSystem() {
    // Add achievements panel
    const achievementsDiv = document.createElement('div');
    achievementsDiv.className = 'bg-white p-4 rounded-lg shadow mb-4';
    achievementsDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-3 flex items-center">
            <i class="fas fa-trophy text-yellow-500 mr-2"></i>
            Achievements & Rewards
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="achievement-badge bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-3 rounded-lg text-center">
                <i class="fas fa-shield-alt text-2xl mb-2"></i>
                <div class="text-sm font-bold">Safety Champion</div>
                <div class="text-xs opacity-90">30 days accident-free</div>
            </div>
            <div class="achievement-badge bg-gradient-to-r from-green-400 to-blue-500 text-white p-3 rounded-lg text-center">
                <i class="fas fa-clock text-2xl mb-2"></i>
                <div class="text-sm font-bold">Punctuality Pro</div>
                <div class="text-xs opacity-90">95% on-time arrival</div>
            </div>
            <div class="achievement-badge bg-gradient-to-r from-purple-400 to-pink-500 text-white p-3 rounded-lg text-center">
                <i class="fas fa-users text-2xl mb-2"></i>
                <div class="text-sm font-bold">Passenger Favorite</div>
                <div class="text-xs opacity-90">4.8+ rating</div>
            </div>
        </div>
        
        <!-- Progress towards next achievement -->
        <div class="mt-4 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">Progress to "Speed Master"</span>
                <span class="text-sm text-gray-600">7/10 efficient trips</span>
            </div>
            <div class="bg-gray-200 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full" style="width: 70%"></div>
            </div>
        </div>
    `;
    
    // Insert after the main dashboard
    const driverDashboard = document.getElementById('driverDashboard');
    const busAssignmentSection = driverDashboard.querySelector('.bg-white');
    driverDashboard.insertBefore(achievementsDiv, busAssignmentSection);
}



function initializeDriverMap() {
    try {
        // Ensure the map container exists and has proper dimensions
        const mapContainer = document.getElementById('driverMap');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }
        
        // Force the container to have dimensions
        mapContainer.style.height = '100%';
        mapContainer.style.minHeight = '400px';
        
        driverMap = L.map('driverMap').setView([PTTConfig.app.map.defaultCenter.lat, PTTConfig.app.map.defaultCenter.lng], 13);
        L.tileLayer(PTTConfig.app.map.tileLayer, { 
            attribution: PTTConfig.app.map.attribution,
            maxZoom: PTTConfig.app.map.maxZoom,
            minZoom: PTTConfig.app.map.minZoom
        }).addTo(driverMap);
        
        // Force map to resize after initialization
        setTimeout(() => {
            driverMap.invalidateSize();
        }, 250);
        
        console.log('Driver map initialized successfully');
    } catch (error) {
        console.error('Error initializing driver map:', error);
        CommonUtils.showNotification('Map initialization failed', 'error');
    }
}

// Test function to debug route loading
function testRouteLoading() {
    console.log('=== ROUTE LOADING DEBUG ===');
    console.log('PTTConfig exists:', typeof PTTConfig !== 'undefined');
    
    if (typeof PTTConfig !== 'undefined') {
        console.log('PTTConfig.data exists:', typeof PTTConfig.data !== 'undefined');
        
        if (PTTConfig.data) {
            console.log('PTTConfig.data.routes exists:', typeof PTTConfig.data.routes !== 'undefined');
            
            if (PTTConfig.data.routes) {
                console.log('Available cities:', Object.keys(PTTConfig.data.routes));
                
                Object.keys(PTTConfig.data.routes).forEach(city => {
                    const routes = PTTConfig.data.routes[city];
                    console.log(`${city}:`, routes ? routes.length : 'No routes', 'routes');
                    if (routes && routes.length > 0) {
                        routes.forEach((route, index) => {
                            console.log(`  ${index + 1}. ${route.name} (ID: ${route.id})`);
                        });
                    }
                });
            }
        }
    }
    console.log('=== END DEBUG ===');
}

// Call test function when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testRouteLoading, 1000);
    });
} else {
    setTimeout(testRouteLoading, 1000);
}

function populateRoutes() {
    const city = document.getElementById('busCity').value;
    const routeSelect = document.getElementById('busRoute');
    
    // Clear and disable the route selection
    routeSelect.innerHTML = '<option value="">Choose route...</option>';
    routeSelect.disabled = true;
    
    console.log('Selected city:', city);
    console.log('PTTConfig.data:', PTTConfig.data);
    console.log('Available routes data:', PTTConfig.data.routes);
    
    if (!city) {
        console.log('No city selected');
        return;
    }
    
    // Check if PTTConfig and routes data exists
    if (!PTTConfig || !PTTConfig.data || !PTTConfig.data.routes) {
        console.error('PTTConfig.data.routes not available');
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Route data not loaded. Please refresh the page.', 'error');
        }
        return;
    }
    
    const cityRoutes = PTTConfig.data.routes[city];
    console.log('Routes for', city, ':', cityRoutes);
    
    if (cityRoutes && Array.isArray(cityRoutes) && cityRoutes.length > 0) {
        cityRoutes.forEach((route, index) => {
            console.log(`Adding route ${index + 1}:`, route);
            const option = document.createElement('option');
            option.value = route.id;
            option.textContent = route.name;
            routeSelect.appendChild(option);
        });
        
        routeSelect.disabled = false;
        
        // Show success message
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(`✅ ${cityRoutes.length} routes loaded for ${city}`, 'success');
        }
        
        console.log(`Successfully loaded ${cityRoutes.length} routes for ${city}`);
    } else {
        console.log('No routes found for city:', city);
        
        // Add some default routes for testing if none exist
        const defaultRoutes = {
            chandigarh: [
                { id: 'ch1', name: 'Route 1: Sector 17 to Sector 43' },
                { id: 'ch2', name: 'Route 2: PGI to Railway Station' },
                { id: 'ch3', name: 'Route 3: ISBT to University' }
            ],
            ludhiana: [
                { id: 'ld1', name: 'Route 1: Bus Stand to PAU' },
                { id: 'ld2', name: 'Route 2: Clock Tower to Mall Road' }
            ],
            amritsar: [
                { id: 'am1', name: 'Route 1: Golden Temple to Airport' },
                { id: 'am2', name: 'Route 2: Hall Gate to Railway Station' }
            ]
        };
        
        if (defaultRoutes[city]) {
            console.log('Using default routes for', city);
            defaultRoutes[city].forEach(route => {
                const option = document.createElement('option');
                option.value = route.id;
                option.textContent = route.name;
                routeSelect.appendChild(option);
            });
            
            routeSelect.disabled = false;
            
            if (typeof CommonUtils !== 'undefined') {
                CommonUtils.showNotification(`📍 ${defaultRoutes[city].length} demo routes loaded for ${city}`, 'info');
            }
        } else {
            if (typeof CommonUtils !== 'undefined') {
                CommonUtils.showNotification('⚠️ No routes available for selected city', 'warning');
            }
        }
    }
}



function toggleTracking() {
    if (isTracking) {
        stopTracking();
    } else {
        startTracking();
    }
}

function startTracking() {
    if (!busAssignment) {
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Please assign a bus and route first', 'warning');
        } else {
            alert('Please assign a bus and route first.');
        }
        return;
    }

    // Show tracking start notification
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Starting your service! Drive safe and have a great trip! 🚌✨', 'success');
    }

    isTracking = true;
    updateTrackingUI();
    
    // Update trip count
    let todayTrips = parseInt(sessionStorage.getItem('todayTrips') || '0');
    todayTrips++;
    sessionStorage.setItem('todayTrips', todayTrips.toString());
    
    // Update dashboard stats
    updateDashboardStats();
    
    // Log service start in Firebase
    if (database && driverInfo && busAssignment) {
        database.ref(`active_services/${driverInfo.id}`).set({
            driverId: driverInfo.id,
            driverName: driverInfo.name,
            busNumber: busAssignment.busNumber,
            routeId: busAssignment.routeId,
            city: busAssignment.city,
            serviceStarted: firebase.database.ServerValue.TIMESTAMP,
            status: 'active',
            tripNumber: todayTrips
        }).catch(error => {
            console.warn('Failed to log service start:', error);
        });
    }
    
    console.log('Service tracking started');
}

function stopTracking() {
    isTracking = false;

    // Log service end in Firebase
    if (database && driverInfo) {
        database.ref(`active_services/${driverInfo.id}`).update({
            serviceEnded: firebase.database.ServerValue.TIMESTAMP,
            status: 'completed'
        }).catch(error => {
            console.warn('Failed to log service end:', error);
        });
    }
    
    updateTrackingUI();
    updateDashboardStats();
    
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Service completed! Great job! 🎉', 'success');
    }
    
    // Show completion message after a delay
    setTimeout(() => {
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Take a moment to rest before your next trip 😌', 'info');
        }
    }, 3000);
}



function updateTrackingUI() {
    const btn = document.getElementById('trackingBtn');
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    if (isTracking) {
        btn.innerHTML = '<i class="fas fa-stop mr-2"></i> Stop Tracking';
        btn.classList.replace('bg-green-600', 'bg-red-600');
        btn.classList.add('tracking-active');
        dot.classList.replace('bg-red-500', 'bg-green-500');
        text.textContent = 'Active';
        text.classList.replace('text-red-600', 'text-green-600');
    } else {
        btn.innerHTML = '<i class="fas fa-play mr-2"></i> Start Tracking';
        btn.classList.replace('bg-red-600', 'bg-green-600');
        btn.classList.remove('tracking-active');
        dot.classList.replace('bg-green-500', 'bg-red-500');
        text.textContent = 'Inactive';
        text.classList.replace('text-green-600', 'text-red-600');
    }
}

function sendAlert(type) {
    if (!busAssignment) {
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Please assign a bus first', 'warning');
        } else {
            alert('Please assign a bus first');
        }
        return;
    }
    
    // Check if Firebase database is available
    if (!database) {
        console.error('Firebase database not available');
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Database connection not available. Alert not sent.', 'error');
        } else {
            alert('Database connection not available. Alert not sent.');
        }
        return;
    }
    
    const alertData = {
        type: type,
        deviceId: deviceId, // Include device ID for better tracking
        driverId: driverInfo.id,
        driverName: driverInfo.name,
        busNumber: busAssignment.busNumber,
        routeId: busAssignment.routeId,
        city: busAssignment.city,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'active',
        location: driverMarker ? {
            lat: driverMarker.getLatLng().lat,
            lng: driverMarker.getLatLng().lng
        } : null,
        deviceInfo: {
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 50),
            online: navigator.onLine
        }
    };
    
    database.ref('alerts').push(alertData)
        .then(() => {
            if (typeof CommonUtils !== 'undefined') {
                CommonUtils.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} alert sent successfully`, 'success');
            } else {
                alert(`${type.charAt(0).toUpperCase() + type.slice(1)} alert sent successfully`);
            }
        })
        .catch((error) => {
            console.error('Error sending alert:', error);
            if (typeof CommonUtils !== 'undefined') {
                CommonUtils.showNotification('Failed to send alert', 'error');
            } else {
                alert('Failed to send alert');
            }
        });
}

// Add emergency alert function
function sendEmergencyAlert() {
    if (!busAssignment) {
        CommonUtils.showNotification('Please assign a bus first', 'warning');
        return;
    }
    
    const confirmed = confirm('Are you sure you want to send an EMERGENCY alert? This will notify all administrators immediately.');
    if (!confirmed) return;
    
    const emergencyData = {
        type: 'emergency',
        driverId: driverInfo.id,
        driverName: driverInfo.name,
        driverPhone: driverInfo.phone,
        busNumber: busAssignment.busNumber,
        routeId: busAssignment.routeId,
        city: busAssignment.city,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'critical',
        priority: 'high',
        location: driverMarker ? {
            lat: driverMarker.getLatLng().lat,
            lng: driverMarker.getLatLng().lng
        } : null
    };
    
    database.ref('alerts').push(emergencyData)
        .then(() => {
            CommonUtils.showNotification('EMERGENCY ALERT sent! Help is on the way.', 'success');
        })
        .catch((error) => {
            console.error('Error sending emergency alert:', error);
            CommonUtils.showNotification('Failed to send emergency alert', 'error');
        });
}

// Add passenger count update function
function updatePassengerCount() {
    if (!busAssignment || !isTracking) return;
    
    const passengerCount = document.getElementById('passengerCount').value;
    const busRef = database.ref(`live_buses/${busAssignment.routeId}/${driverInfo.id}`);
    
    busRef.update({
        passengerCount: parseInt(passengerCount) || 0,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    }).catch(error => {
        console.error('Error updating passenger count:', error);
    });
}

// Add functions for map controls
function centerOnDriver() {
    if (driverMarker) {
        driverMap.setView(driverMarker.getLatLng(), 16);
    } else {
        CommonUtils.showNotification('Driver location not available', 'warning');
    }
}

function toggleMapView() {
    // Toggle between satellite and street view
    // This is a placeholder - implement based on your tile provider
    CommonUtils.showNotification('Map view toggled', 'info');
}

function logout() {
    if (isTracking) stopTracking();
    
    // Log work session end for fatigue management
    if (database && driverInfo) {
        const sessionEnd = Date.now();
        const totalSessionHours = (sessionEnd - driverInfo.workShiftStart) / (1000 * 60 * 60);
        
        database.ref(`driver_work_sessions/${driverInfo.id}/${driverInfo.workShiftStart}`).update({
            sessionEnd: firebase.database.ServerValue.TIMESTAMP,
            totalHours: totalSessionHours,
            fatigueLevel: driverInfo.fatigueLevel,
            status: 'logged_out'
        }).catch(error => {
            console.warn('Failed to log session end:', error);
        });
        
        // Update driver status
        database.ref(`drivers_status/${driverInfo.id}`).update({
            status: 'logged_out',
            lastLogout: firebase.database.ServerValue.TIMESTAMP,
            totalSessionHours: totalSessionHours
        }).catch(error => {
            console.warn('Failed to update driver status:', error);
        });
    }
    
    // Clear session data
    sessionStorage.removeItem('driverInfo');
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.clearSession('driverLocation');
    }
    
    // Reset variables
    driverInfo = null;
    busAssignment = null;
    
    // Clear map marker
    if (driverMarker) {
        driverMap.removeLayer(driverMarker);
        driverMarker = null;
    }
    
    showLogin();
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Work shift ended. Logged out successfully', 'info');
    }
}