// ===================================
// Punjab Transport Tracker - Driver App
// ===================================

// Global variables
let driverMap, driverMarker, driverInfo, busAssignment;
let isTracking = false;
let watchId = null;
let driverLocationWatchId = null; // For tracking driver location even when not on duty
let deviceId = null; // Store device ID for this session

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
        driverInfo = {
            ...validDriver,
            deviceId: deviceId, // Add device ID to driver info
            sessionStart: Date.now()
        };
        
        // Store driver info with device ID
        sessionStorage.setItem('driverInfo', JSON.stringify(driverInfo));
        
        // Log device association in Firebase
        if (database) {
            database.ref(`driver_devices/${driverId}`).set({
                deviceId: deviceId,
                driverInfo: driverInfo,
                lastLogin: firebase.database.ServerValue.TIMESTAMP,
                deviceInfo: PTTConfig.utils.getDeviceInfo()
            }).catch(error => {
                console.warn('Failed to log device association:', error);
            });
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
    
    // Populate driver info card
    const infoDiv = document.getElementById('driverInfo');
    infoDiv.innerHTML = `
        <p><strong>ID:</strong> ${driverInfo.id}</p>
        <p><strong>Name:</strong> ${driverInfo.name}</p>
        <p><strong>Phone:</strong> ${driverInfo.phone}</p>
    `;

    // Initialize map with a slight delay to ensure DOM is ready
    setTimeout(() => {
        initializeDriverMap();
        // Start tracking driver's location immediately upon login
        startDriverLocationTracking();
    }, 100);
    
    document.getElementById('busCity').addEventListener('change', populateRoutes);
}

// Function to start tracking driver's location immediately upon login
function startDriverLocationTracking() {
    if (!navigator.geolocation) {
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Geolocation is not supported by your browser', 'error');
        } else {
            alert('Geolocation is not supported by your browser');
        }
        return;
    }

    // Enhanced GPS options with better timeout and fallback settings
    const options = {
        enableHighAccuracy: true,
        timeout: 30000, // Increased to 30 seconds
        maximumAge: 60000 // Allow cached position up to 60 seconds
    };

    // Show GPS initialization status
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Initializing GPS... Please wait', 'info', 5000);
    }

    // Get initial position with retry mechanism
    attemptLocationRequest(options, 0, 3); // Try up to 3 times

    // Start watching position with enhanced error handling
    startLocationWatching(options);
}

// Enhanced location request with retry mechanism
function attemptLocationRequest(options, attempt, maxAttempts) {
    console.log(`GPS attempt ${attempt + 1}/${maxAttempts}`);
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log('GPS initial position acquired successfully');
            updateDriverLocationOnMap(position);
            if (typeof CommonUtils !== 'undefined') {
                CommonUtils.showNotification('GPS location acquired successfully', 'success');
            }
        },
        (error) => {
            console.warn(`GPS attempt ${attempt + 1} failed:`, error);
            handleLocationError(error, attempt, maxAttempts, options);
        },
        options
    );
}

// Enhanced location error handling
function handleLocationError(error, attempt, maxAttempts, options) {
    let errorMessage = 'Location access failed';
    let shouldRetry = false;
    
    // Update GPS status to show error
    updateGPSStatus(null, 'error');
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check if GPS is enabled.';
            shouldRetry = attempt < maxAttempts - 1;
            break;
        case error.TIMEOUT:
            errorMessage = `GPS timeout (attempt ${attempt + 1}/${maxAttempts}). Retrying with relaxed settings...`;
            shouldRetry = attempt < maxAttempts - 1;
            // Update status to show searching during retry
            if (shouldRetry) {
                updateGPSStatus(null, 'searching');
            }
            break;
        default:
            errorMessage = `Unknown location error: ${error.message}`;
            shouldRetry = attempt < maxAttempts - 1;
    }
    
    console.warn(errorMessage);
    
    if (shouldRetry) {
        // Use progressively relaxed settings for retries
        const retryOptions = {
            enableHighAccuracy: attempt === 0, // High accuracy only on first attempt
            timeout: 45000 + (attempt * 15000), // Increase timeout with each attempt
            maximumAge: 120000 + (attempt * 60000) // Allow older cached positions
        };
        
        setTimeout(() => {
            attemptLocationRequest(retryOptions, attempt + 1, maxAttempts);
        }, 2000); // Wait 2 seconds between attempts
        
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(`GPS retry ${attempt + 1}/${maxAttempts - 1}...`, 'warning');
        }
    } else {
        // All attempts failed, show final error
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(errorMessage, 'error', 8000);
        } else {
            alert(errorMessage);
        }
        
        // Try to get last known location from session storage
        tryLastKnownLocation();
    }
}

// Start continuous location watching with enhanced error handling
function startLocationWatching(initialOptions) {
    const watchOptions = {
        enableHighAccuracy: false, // Use less accurate but more reliable mode for continuous tracking
        timeout: 20000, // Shorter timeout for continuous updates
        maximumAge: 30000 // Allow some caching for continuous updates
    };

    driverLocationWatchId = navigator.geolocation.watchPosition(
        (position) => {
            updateDriverLocationOnMap(position);
            // Reset any error states
            clearLocationErrorState();
        },
        (error) => {
            console.warn('Continuous location tracking error:', error);
            handleContinuousLocationError(error);
        },
        watchOptions
    );

    console.log('Continuous GPS tracking started with ID:', driverLocationWatchId);
}

// Handle errors during continuous location tracking
function handleContinuousLocationError(error) {
    // Don't spam notifications for continuous tracking errors
    const now = Date.now();
    const lastErrorNotification = sessionStorage.getItem('lastGPSErrorNotification');
    
    if (!lastErrorNotification || (now - parseInt(lastErrorNotification)) > 60000) { // Only show error every minute
        let message = 'GPS signal weak';
        
        switch(error.code) {
            case error.TIMEOUT:
                message = 'GPS signal timeout - using last known position';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'GPS unavailable - check device settings';
                break;
        }
        
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(message, 'warning', 3000);
        }
        
        sessionStorage.setItem('lastGPSErrorNotification', now.toString());
    }
}

// Try to use last known location if GPS fails
function tryLastKnownLocation() {
    const lastLocation = CommonUtils.getSession('driverLocation');
    if (lastLocation && (Date.now() - lastLocation.timestamp) < 600000) { // Use if less than 10 minutes old
        console.log('Using last known location:', lastLocation);
        
        const fakePosition = {
            coords: {
                latitude: lastLocation.lat,
                longitude: lastLocation.lng,
                accuracy: 1000 // Mark as low accuracy
            },
            timestamp: lastLocation.timestamp
        };
        
        updateDriverLocationOnMap(fakePosition);
        
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Using last known location (GPS unavailable)', 'info');
        }
    } else {
        console.log('No suitable last known location available');
        showManualLocationOption();
    }
}

// Clear any location error states
function clearLocationErrorState() {
    sessionStorage.removeItem('lastGPSErrorNotification');
}

// Show option for manual location input as last resort
function showManualLocationOption() {
    if (typeof CommonUtils !== 'undefined') {
        const modal = CommonUtils.createModal(
            'GPS Not Available',
            `
                <div class="text-center space-y-4">
                    <i class="fas fa-exclamation-triangle text-yellow-500 text-4xl"></i>
                    <p class="text-gray-700">GPS location is not available. You can:</p>
                    <div class="space-y-2 text-left">
                        <p class="text-sm text-gray-600">• Check if location services are enabled in device settings</p>
                        <p class="text-sm text-gray-600">• Allow location access when prompted by the browser</p>
                        <p class="text-sm text-gray-600">• Move to an area with better GPS signal (outdoors)</p>
                        <p class="text-sm text-gray-600">• Close other apps that might be using GPS</p>
                        <p class="text-sm text-gray-600">• Restart your browser and try again</p>
                    </div>
                    <div class="bg-blue-50 p-3 rounded mt-4">
                        <p class="text-sm text-blue-800"><strong>For best results:</strong></p>
                        <p class="text-xs text-blue-700">Use the app outdoors with a clear view of the sky</p>
                    </div>
                </div>
            `,
            `
                <button onclick="this.closest('.fixed').remove(); window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    <i class="fas fa-refresh mr-1"></i> Try Again
                </button>
                <button onclick="showGPSTroubleshooting()" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    <i class="fas fa-question-circle mr-1"></i> Troubleshooting
                </button>
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                    Continue Without GPS
                </button>
            `
        );
    }
}

// Show detailed GPS troubleshooting guide
function showGPSTroubleshooting() {
    if (typeof CommonUtils !== 'undefined') {
        const modal = CommonUtils.createModal(
            'GPS Troubleshooting Guide',
            `
                <div class="space-y-4 max-h-96 overflow-y-auto">
                    <div class="border-b pb-3">
                        <h4 class="font-semibold text-gray-800 mb-2">1. Browser Permissions</h4>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• Click the location icon in your browser's address bar</li>
                            <li>• Select "Always allow" for location access</li>
                            <li>• Refresh the page after changing permissions</li>
                        </ul>
                    </div>
                    
                    <div class="border-b pb-3">
                        <h4 class="font-semibold text-gray-800 mb-2">2. Device Settings</h4>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li><strong>Android:</strong> Settings > Location > Turn on</li>
                            <li><strong>iPhone:</strong> Settings > Privacy > Location Services > On</li>
                            <li><strong>Windows:</strong> Settings > Privacy > Location > On</li>
                        </ul>
                    </div>
                    
                    <div class="border-b pb-3">
                        <h4 class="font-semibold text-gray-800 mb-2">3. Environment</h4>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• Go outdoors for better GPS signal</li>
                            <li>• Avoid areas with tall buildings or tunnels</li>
                            <li>• Wait 30-60 seconds for GPS to acquire signal</li>
                        </ul>
                    </div>
                    
                    <div class="bg-yellow-50 p-3 rounded">
                        <h4 class="font-semibold text-yellow-800 mb-2">Still having issues?</h4>
                        <p class="text-sm text-yellow-700">Contact your system administrator with the device ID: <code class="bg-yellow-200 px-1 rounded">${deviceId || 'Not available'}</code></p>
                    </div>
                </div>
            `,
            `
                <button onclick="this.closest('.fixed').remove(); window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    <i class="fas fa-refresh mr-1"></i> Try Again
                </button>
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                    Close
                </button>
            `
        );
    }
}

// Function to update driver location on map (before bus assignment)
function updateDriverLocationOnMap(position) {
    const { latitude, longitude, accuracy } = position.coords;
    
    // Update GPS accuracy display and status
    updateGPSStatus(accuracy, 'active');

    // Update map marker
    const latLng = [latitude, longitude];
    
    if (driverMarker) {
        driverMarker.setLatLng(latLng);
    } else {
        // Create driver marker with different style when not on duty
        const driverIcon = L.divIcon({ 
            className: 'driver-marker-standby', 
            html: '<i class="fas fa-user-circle"></i>', 
            iconSize: [25, 25],
            iconAnchor: [12, 12]
        });
        driverMarker = L.marker(latLng, { icon: driverIcon }).addTo(driverMap);
        driverMarker.bindPopup(`Driver: ${driverInfo.name}<br>Status: Standby`);
    }
    
    // Center map on driver location on first update
    if (!driverMap._mapInitialCentered) {
        driverMap.setView(latLng, 15);
        driverMap._mapInitialCentered = true;
    }

    // Store driver location in session for potential use
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.setSession('driverLocation', {
            lat: latitude,
            lng: longitude,
            timestamp: Date.now(),
            accuracy: accuracy
        });
    }
}

// Update GPS status indicator
function updateGPSStatus(accuracy, status) {
    const accuracyElement = document.getElementById('gpsAccuracy');
    const statusElement = document.getElementById('gpsStatus');
    const iconElement = document.getElementById('gpsStatusIcon');
    
    if (accuracyElement) {
        accuracyElement.textContent = accuracy ? Math.round(accuracy) : '--';
    }
    
    if (statusElement && iconElement) {
        switch(status) {
            case 'active':
                const qualityText = accuracy <= 10 ? 'Excellent' : accuracy <= 50 ? 'Good' : accuracy <= 100 ? 'Fair' : 'Poor';
                statusElement.textContent = qualityText;
                iconElement.className = accuracy <= 50 ? 'fas fa-satellite text-green-600' : accuracy <= 100 ? 'fas fa-satellite text-yellow-600' : 'fas fa-satellite text-red-600';
                break;
            case 'error':
                statusElement.textContent = 'Error';
                iconElement.className = 'fas fa-satellite text-red-600';
                break;
            case 'searching':
                statusElement.textContent = 'Searching...';
                iconElement.className = 'fas fa-satellite text-blue-600 fa-pulse';
                break;
            default:
                statusElement.textContent = 'Unknown';
                iconElement.className = 'fas fa-satellite text-gray-400';
        }
    }
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

function populateRoutes() {
    const city = document.getElementById('busCity').value;
    const routeSelect = document.getElementById('busRoute');
    routeSelect.innerHTML = '<option value="">Choose route...</option>';
    routeSelect.disabled = true;

    if (city && PTTConfig.data.routes[city]) {
        PTTConfig.data.routes[city].forEach(route => {
            const option = document.createElement('option');
            option.value = route.id;
            option.textContent = route.name;
            routeSelect.appendChild(option);
        });
        routeSelect.disabled = false;
    }
}

function saveBusAssignment() {
    const city = document.getElementById('busCity').value;
    const busNumber = document.getElementById('busNumber').value;
    const routeId = document.getElementById('busRoute').value;

    if (!city || !busNumber || !routeId) {
        alert('Please fill out all fields.');
        return;
    }

    busAssignment = { city, busNumber, routeId };
    alert('Bus assignment saved!');
    document.getElementById('trackingBtn').disabled = false;
    document.querySelector('#trackingStatus p').textContent = 'Ready to start tracking.';
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

    if (!navigator.geolocation) {
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Geolocation is not supported by your browser', 'error');
        } else {
            alert('Geolocation is not supported by your browser.');
        }
        return;
    }

    // Enhanced options for active bus tracking
    const trackingOptions = {
        enableHighAccuracy: true,
        timeout: 25000, // 25 seconds timeout
        maximumAge: 10000 // Allow cached position up to 10 seconds for active tracking
    };

    // Show tracking start notification
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Starting GPS tracking for bus service...', 'info');
    }

    watchId = navigator.geolocation.watchPosition(
        updateLocation, 
        handleError, 
        trackingOptions
    );
    
    isTracking = true;
    updateTrackingUI();
    
    console.log('Active bus tracking started with watch ID:', watchId);
}

function stopTracking() {
    navigator.geolocation.clearWatch(watchId);
    isTracking = false;

    // Set the bus to inactive in Firebase using device ID
    if (busAssignment && deviceId) {
        const busRef = database.ref(`live_buses/${busAssignment.routeId}/${deviceId}`);
        busRef.update({ 
            isActive: false,
            lastDeactivated: firebase.database.ServerValue.TIMESTAMP
        }).catch(error => {
            console.warn('Failed to update bus status:', error);
        });
        
        // Also update driver-device mapping
        database.ref(`driver_active_devices/${driverInfo.id}`).update({
            isActive: false,
            lastDeactivated: firebase.database.ServerValue.TIMESTAMP
        }).catch(error => {
            console.warn('Failed to update driver-device mapping:', error);
        });
    }
    
    updateTrackingUI();
}

function updateLocation(position) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const speedKmh = speed ? Math.round(speed * 3.6) : 0;

    // Update UI
    document.getElementById('currentSpeed').textContent = `${speedKmh} km/h`;
    document.getElementById('speedDisplay').textContent = speedKmh;
    
    // Update GPS status with current accuracy
    updateGPSStatus(accuracy, 'active');

    // Update map marker with bus icon when actively tracking
    const latLng = [latitude, longitude];
    
    if (driverMarker) {
        driverMarker.setLatLng(latLng);
        // Update icon to bus when tracking
        const busIcon = L.divIcon({ 
            className: 'driver-marker-active', 
            html: '<i class="fas fa-bus"></i>', 
            iconSize: [35, 35],
            iconAnchor: [17, 17]
        });
        driverMarker.setIcon(busIcon);
        driverMarker.setPopupContent(`Bus: ${busAssignment.busNumber}<br>Driver: ${driverInfo.name}<br>Speed: ${speedKmh} km/h<br>Device: ${deviceId}`);
    } else {
        const busIcon = L.divIcon({ 
            className: 'driver-marker-active', 
            html: '<i class="fas fa-bus"></i>', 
            iconSize: [35, 35],
            iconAnchor: [17, 17]
        });
        driverMarker = L.marker(latLng, { icon: busIcon }).addTo(driverMap);
        driverMarker.bindPopup(`Bus: ${busAssignment.busNumber}<br>Driver: ${driverInfo.name}<br>Speed: ${speedKmh} km/h<br>Device: ${deviceId}`);
    }
    
    driverMap.setView(latLng, 16);

    // Send data to Firebase only when actively tracking - using device ID as primary key
    if (isTracking && busAssignment) {
        const busData = {
            deviceId: deviceId, // Primary identifier
            driverId: driverInfo.id,
            driverName: driverInfo.name,
            busNumber: busAssignment.busNumber,
            routeId: busAssignment.routeId,
            city: busAssignment.city,
            latitude: latitude,
            longitude: longitude,
            speed: speedKmh,
            accuracy: Math.round(accuracy),
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isActive: true,
            lastUpdated: new Date().toISOString(),
            deviceInfo: {
                userAgent: navigator.userAgent.substring(0, 50), // Truncate for storage
                platform: navigator.platform,
                online: navigator.onLine
            }
        };
        
        // Store by device ID instead of driver ID for better tracking
        const busRef = database.ref(`live_buses/${busAssignment.routeId}/${deviceId}`);
        busRef.set(busData).catch(error => {
            console.error('Error updating bus location:', error);
            if (typeof CommonUtils !== 'undefined') {
                CommonUtils.showNotification('Failed to update location', 'error');
            }
        });
        
        // Also maintain driver-device mapping
        database.ref(`driver_active_devices/${driverInfo.id}`).set({
            deviceId: deviceId,
            busNumber: busAssignment.busNumber,
            routeId: busAssignment.routeId,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        }).catch(error => {
            console.warn('Failed to update driver-device mapping:', error);
        });
    }
}

function handleError(error) {
    console.error('GPS Error during active tracking:', error);
    
    let errorMessage = 'GPS Error';
    let shouldStopTracking = false;
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'GPS permission denied. Please enable location access and restart tracking.';
            shouldStopTracking = true;
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS position unavailable. Please check your device GPS settings.';
            // Don't stop tracking, might recover
            break;
        case error.TIMEOUT:
            errorMessage = 'GPS timeout. Trying again with extended timeout...';
            // Try to restart with more lenient settings
            restartTrackingWithLenientSettings();
            return; // Don't stop tracking, we're restarting
        default:
            errorMessage = `GPS Error: ${error.message}`;
    }
    
    // Show user-friendly error message
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification(errorMessage, 'error', 6000);
    } else {
        alert(errorMessage);
    }
    
    if (shouldStopTracking) {
        stopTracking();
    }
}

// Restart tracking with more lenient GPS settings
function restartTrackingWithLenientSettings() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
    
    console.log('Restarting GPS tracking with lenient settings...');
    
    const lenientOptions = {
        enableHighAccuracy: false, // Use less accurate but more reliable mode
        timeout: 45000, // Longer timeout
        maximumAge: 120000 // Allow older cached positions
    };
    
    watchId = navigator.geolocation.watchPosition(
        updateLocation, 
        (error) => {
            console.error('Lenient GPS tracking also failed:', error);
            
            if (typeof CommonUtils !== 'undefined') {
                CommonUtils.showNotification('GPS tracking failed. Please check your device location settings.', 'error');
            } else {
                alert('GPS tracking failed. Please check your device location settings.');
            }
            
            stopTracking();
        }, 
        lenientOptions
    );
    
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('GPS restarted with extended timeout...', 'info');
    }
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
    
    // Stop driver location tracking
    if (driverLocationWatchId) {
        navigator.geolocation.clearWatch(driverLocationWatchId);
        driverLocationWatchId = null;
    }
    
    // Clear session data
    sessionStorage.removeItem('driverInfo');
    CommonUtils.clearSession('driverLocation');
    
    // Reset variables
    driverInfo = null;
    busAssignment = null;
    
    // Clear map marker
    if (driverMarker) {
        driverMap.removeLayer(driverMarker);
        driverMarker = null;
    }
    
    showLogin();
    CommonUtils.showNotification('Logged out successfully', 'info');
}