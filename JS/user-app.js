// ===================================
// Punjab Transport Tracker - Enhanced User App with Google Earth
// ===================================

// Global variables
let map;
let userMarker;
let busMarkers = {};
let routeLine;
let firebaseListeners = [];
let selectedStopId = null;
let arrivalUpdateInterval = null;
let userLocation = null;
let googleMapsLoaded = false;

// Google Maps initialization callback
function initGoogleMaps() {
    console.log('Google Maps API loaded successfully for user app');
    googleMapsLoaded = true;
    
    // Re-initialize map if app is already running
    if (typeof PTTConfig !== 'undefined') {
        initializeMap();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting app initialization...');
    
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
                initializeApp();
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

function initializeApp() {
    console.log('Initializing User App');
    
    // Wait for DOM to be fully ready before initializing map
    setTimeout(() => {
        initializeMap();
        populateCitySelect();
        
        // Check for pre-selected city from URL or localStorage
        checkForPreSelectedCity();
    }, 100);

    // Event Listeners
    document.getElementById('citySelect').addEventListener('change', handleCityChange);
}

// Check for pre-selected city from homepage or URL
function checkForPreSelectedCity() {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const cityFromUrl = urlParams.get('city');
    
    // Check localStorage as fallback
    const cityFromStorage = localStorage.getItem('selectedCity');
    
    const preSelectedCity = cityFromUrl || cityFromStorage;
    
    if (preSelectedCity) {
        console.log('Pre-selected city found:', preSelectedCity);
        
        // Set the city select value
        const citySelect = document.getElementById('citySelect');
        if (citySelect) {
            citySelect.value = preSelectedCity;
            
            // Trigger the change event to zoom to city and load routes
            handleCityChange();
            
            // Show notification
            if (typeof CommonUtils !== 'undefined') {
                const cityName = PTTConfig.data.cities[preSelectedCity]?.name || preSelectedCity;
                CommonUtils.showNotification(`Viewing buses in ${cityName}`, 'info');
            }
        }
        
        // Clear localStorage to prevent persistence across sessions
        localStorage.removeItem('selectedCity');
        
        // Update URL without the parameter (clean URL)
        if (cityFromUrl) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }
}

function initializeMap() {
    try {
        // Ensure the map container exists and has proper dimensions
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }
        
        // Force the container to have dimensions
        mapContainer.style.height = '100vh';
        mapContainer.style.minHeight = '500px';
        
        console.log('Initializing map with center:', PTTConfig.app.map.defaultCenter);
        
        // Check provider preference
        const preferredProvider = PTTConfig.app.map.provider || 'google';
        
        // Try Google Maps first if preferred and available
        if (preferredProvider === 'google' && googleMapsLoaded) {
            console.log('Using Google Maps as primary provider');
            initializeGoogleMap();
            return;
        }
        
        // Check if MapmyIndia SDK is loaded AND API key is configured
        const hasMapplsApiKey = PTTConfig.app.map.mappls && 
                               PTTConfig.app.map.mappls.restApiKey && 
                               PTTConfig.app.map.mappls.restApiKey.trim() !== '';
        
        if (typeof mappls !== 'undefined' && hasMapplsApiKey) {
            console.log('Using MapmyIndia as secondary provider');
            initializeMapplsMap();
            return;
        }
        
        // Default to Leaflet as fallback
        console.log('Using Leaflet as fallback provider');
        initializeLeafletMap();
        
    } catch (error) {
        console.error('Error in initializeMap:', error);
        // Fallback to Leaflet
        initializeLeafletMap();
    }
}

// Google Maps initialization for user app
function initializeGoogleMap() {
    try {
        console.log('Initializing Google Maps for user app');
        
        const mapContainer = document.getElementById('map');
        const mapConfig = PTTConfig.app.map;
        
        // Check if API key is configured
        const hasGoogleApiKey = mapConfig.google && 
                               mapConfig.google.apiKey && 
                               mapConfig.google.apiKey.trim() !== '';
        
        if (!hasGoogleApiKey) {
            console.log('Google Maps API key not configured, using fallback');
            initializeLeafletMap();
            return;
        }
        
        // Google Maps options optimized for transport tracking
        const mapOptions = {
            center: {
                lat: mapConfig.defaultCenter.lat,
                lng: mapConfig.defaultCenter.lng
            },
            zoom: mapConfig.defaultZoom,
            maxZoom: mapConfig.maxZoom || 20,
            minZoom: mapConfig.minZoom || 6,
            
            // Use hybrid view for better route visualization
            mapTypeId: 'hybrid',
            
            // Enhanced controls for users
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            rotateControl: true,
            
            // User-friendly options
            gestureHandling: 'greedy',
            backgroundColor: '#f8f9fa',
            clickableIcons: true,
            
            // 3D features for better visualization
            tilt: 0, // Start flat, users can tilt if needed
            
            // Enhanced styles for transport
            styles: [
                {
                    featureType: 'transit.station.bus',
                    elementType: 'all',
                    stylers: [{ visibility: 'on', weight: 2 }]
                },
                {
                    featureType: 'transit.line',
                    elementType: 'all',
                    stylers: [{ visibility: 'on' }]
                },
                {
                    featureType: 'road.highway',
                    elementType: 'all',
                    stylers: [{ weight: 3 }]
                }
            ]
        };
        
        // Create the map
        map = new google.maps.Map(mapContainer, mapOptions);
        
        // Add places search functionality
        const searchInput = document.getElementById('locationSearch');
        if (searchInput) {
            const searchBox = new google.maps.places.SearchBox(searchInput);
            
            // Bias search results towards Punjab
            const punjabBounds = new google.maps.LatLngBounds(
                new google.maps.LatLng(29.5, 73.5), // Southwest
                new google.maps.LatLng(32.5, 77.5)  // Northeast
            );
            searchBox.setBounds(punjabBounds);
        }
        
        // Add click event for coordinate selection (if needed)
        map.addListener('click', function(event) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            console.log('Google Map clicked at:', lat, lng);
            
            // If in route creation mode, add the coordinate
            if (window.routeCreationMode) {
                addRouteCoordinate(lat, lng);
            }
        });
        
        console.log('Google Maps user app initialized successfully');
        
    } catch (error) {
        console.error('Error initializing Google Maps for user app:', error);
        console.log('Falling back to Leaflet');
        initializeLeafletMap();
    }
}

// MapmyIndia initialization for user app
function initializeMapplsMap() {
    try {
        console.log('Initializing MapmyIndia map with API key');
        
        // Initialize MapmyIndia map
        const mapConfig = PTTConfig.app.map;
        
        map = new mappls.Map('map', {
            center: [mapConfig.defaultCenter.lat, mapConfig.defaultCenter.lng],
            zoom: mapConfig.defaultZoom,
            maxZoom: mapConfig.maxZoom,
            minZoom: mapConfig.minZoom,
            zoomControl: true,
            location: true, // Show current location
            clickableIcons: true,
            backgroundColor: '#f8f9fa',
            // Enable Indian language support
            language: 'en',
            region: 'ind'
        });
        
        // Add search control for better coordinate picking
        const searchControl = new mappls.search({
            map: map,
            location: [mapConfig.defaultCenter.lat, mapConfig.defaultCenter.lng],
            region: 'ind',
            height: 300,
            placeholder: 'Search for places in Punjab...',
            geolocation: true
        });
        
        // Add click event for coordinate selection
        map.on('click', function(e) {
            const latlng = e.latlng;
            console.log('MapmyIndia map clicked at:', latlng.lat, latlng.lng);
            
            // If in route creation mode, add the coordinate
            if (window.routeCreationMode) {
                addRouteCoordinate(latlng.lat, latlng.lng);
            }
        });
        
        console.log('MapmyIndia map initialized successfully');
        
    } catch (mapplsError) {
        console.error('Error initializing MapmyIndia map:', mapplsError);
        initializeLeafletMap();
    }
}

// Leaflet fallback initialization
function initializeLeafletMap() {
    try {
        map = L.map('map').setView([PTTConfig.app.map.defaultCenter.lat, PTTConfig.app.map.defaultCenter.lng], PTTConfig.app.map.defaultZoom);

        // Use the tileLayer from config (which is now set to OpenStreetMap by default)
        L.tileLayer(PTTConfig.app.map.tileLayer, {
            attribution: PTTConfig.app.map.attribution,
            maxZoom: PTTConfig.app.map.maxZoom,
            minZoom: PTTConfig.app.map.minZoom
        }).addTo(map);
        
        // Add click event handler for Leaflet
        map.on('click', function(e) {
            const latlng = e.latlng;
            console.log('Map clicked at:', latlng.lat, latlng.lng);
            
            if (window.routeCreationMode) {
                addRouteCoordinate(latlng.lat, latlng.lng);
            }
        });
        
        console.log('Leaflet map initialized successfully');
        
    } catch (error) {
        console.error('Error initializing Leaflet map:', error);
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Leaflet map initialization failed', 'error');
        }
    }
}

function populateCitySelect() {
    const citySelect = document.getElementById('citySelect');
    citySelect.innerHTML = '<option value="">Choose a city...</option>';
    for (const cityId in PTTConfig.data.cities) {
        const city = PTTConfig.data.cities[cityId];
        const option = document.createElement('option');
        option.value = cityId;
        option.textContent = city.name;
        citySelect.appendChild(option);
    }
}

// Enhanced zoom function that works with all map providers
function zoomToLocation(lat, lng, zoom) {
    console.log(`Zooming to: lat=${lat}, lng=${lng}, zoom=${zoom}`);
    
    try {
        // Detect the map provider and use appropriate zoom method
        if (map && typeof google !== 'undefined' && map.setCenter && map.setZoom) {
            // Google Maps
            console.log('Using Google Maps zoom');
            map.setCenter({ lat: lat, lng: lng });
            map.setZoom(zoom);
            
            // Add smooth animation effect
            if (map.panTo) {
                map.panTo({ lat: lat, lng: lng });
            }
            
        } else if (map && typeof mappls !== 'undefined' && map.setView) {
            // MapmyIndia (uses Leaflet-like API)
            console.log('Using MapmyIndia zoom');
            map.setView([lat, lng], zoom, { 
                animate: true, 
                duration: 1.0,
                easeLinearity: 0.25
            });
            
        } else if (map && map.setView) {
            // Leaflet or Leaflet-compatible
            console.log('Using Leaflet zoom');
            map.setView([lat, lng], zoom, { 
                animate: true, 
                duration: 1.0,
                easeLinearity: 0.25
            });
            
        } else {
            console.warn('Unable to determine map provider or map not initialized');
            // Fallback: try common methods
            if (map) {
                if (map.setView) {
                    map.setView([lat, lng], zoom);
                } else if (map.setCenter && map.setZoom) {
                    map.setCenter({ lat: lat, lng: lng });
                    map.setZoom(zoom);
                }
            }
        }
        
    } catch (error) {
        console.error('Error in zoomToLocation:', error);
        // Final fallback - basic zoom without animation
        if (map && map.setView) {
            map.setView([lat, lng], zoom);
        }
    }
}

function handleCityChange() {
    const cityId = document.getElementById('citySelect').value;
    const routeSelect = document.getElementById('routeSelect');

    console.log('City changed to:', cityId); // Debug log

    // Clear previous state
    clearAllListeners();
    clearMap();
    document.getElementById('busList').innerHTML = '<p class="text-gray-500 text-center py-8">Select a route to see active buses</p>';
    document.getElementById('busCount').textContent = '0';

    if (!cityId) {
        routeSelect.disabled = true;
        routeSelect.innerHTML = '<option value="">Choose a route...</option>';
        if (map && PTTConfig) {
            zoomToLocation(PTTConfig.app.map.defaultCenter.lat, PTTConfig.app.map.defaultCenter.lng, PTTConfig.app.map.defaultZoom);
        }
        return;
    }

    // Center map on selected city with enhanced zoom
    const city = PTTConfig.data.cities[cityId];
    if (city && map) {
        console.log('Zooming to city:', city.name, 'at coordinates:', city.coordinates);
        zoomToLocation(city.coordinates.lat, city.coordinates.lng, city.zoom);
        
        // Show notification about city selection
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(`Map centered on ${city.name}`, 'success', 3000);
        }
    }

    // Populate routes
    routeSelect.disabled = false;
    routeSelect.innerHTML = '<option value="">Choose a route...</option>';
    
    console.log('Looking for routes in city:', cityId); // Debug log
    console.log('Available routes data:', PTTConfig.data.routes); // Debug log
    
    const routes = PTTConfig.data.routes[cityId];
    if (routes && Array.isArray(routes)) {
        console.log('Found routes for city:', routes); // Debug log
        routes.forEach(route => {
            const option = document.createElement('option');
            option.value = route.id;
            option.textContent = route.name;
            routeSelect.appendChild(option);
        });
        console.log('Routes populated successfully');
    } else {
        console.log('No routes found for city:', cityId);
        // Add a fallback option to show that the function is working
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No routes available for this city';
        option.disabled = true;
        routeSelect.appendChild(option);
    }
    
    // Add route change event listener
    routeSelect.addEventListener('change', function() {
        console.log('Route changed to:', this.value);
        if (this.value) {
            trackBuses();
        }
    });
}

function trackBuses() {
    const cityId = document.getElementById('citySelect').value;
    const routeId = document.getElementById('routeSelect').value;

    console.log('Track buses called with city:', cityId, 'route:', routeId); // Debug log

    if (!cityId || !routeId) {
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Please select a city and a route first', 'warning');
        } else {
            alert('Please select a city and a route first');
        }
        return;
    }
    
    // Check if Firebase database is available
    if (!database) {
        console.error('Firebase database not available');
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification('Database connection not available. Using demo mode.', 'warning');
        } else {
            alert('Database connection not available. Using demo mode.');
        }
        // Load demo data for testing
        loadDemoData(cityId, routeId);
        return;
    }
    
    clearAllListeners();
    clearMap();
    
    // Show loading state
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showPageLoading(true);
    }
    document.getElementById('busList').innerHTML = '<div class="flex items-center justify-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-orange-600"></i><span class="ml-2">Loading buses...</span></div>';

    // Draw the selected route on the map
    drawRoute(cityId, routeId);

    // Listen for live bus data
    const busRef = database.ref(`live_buses/${routeId}`);
    
    busRef.on('value', (snapshot) => {
        const buses = snapshot.val();
        console.log('Received bus data:', buses); // Debug log
        updateBusList(buses);
        updateBusMarkers(buses);
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showPageLoading(false);
        }
        
        if (!buses || Object.keys(buses).length === 0) {
            if (typeof CommonUtils !== 'undefined') {
                CommonUtils.showNotification('No buses currently active on this route', 'info');
            }
            // Load demo data for testing
            loadDemoData(cityId, routeId);
        }
    }, (error) => {
        console.error('Error listening to bus data:', error);
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showPageLoading(false);
            CommonUtils.showNotification('Failed to load bus data. Loading demo data.', 'warning');
        }
        // Load demo data as fallback
        loadDemoData(cityId, routeId);
    });

    // Store the listener so we can detach it later
    firebaseListeners.push(busRef);
    
    // Listen for alerts on this route
    listenForAlerts(routeId);
}

function drawRoute(cityId, routeId) {
    console.log('Drawing route for city:', cityId, 'route:', routeId); // Debug log
    
    const routes = PTTConfig.data.routes[cityId];
    if (!routes || !Array.isArray(routes)) {
        console.log('No routes found for city:', cityId);
        return;
    }
    
    const route = routes.find(r => r.id === routeId);
    if (!route || !route.stops) {
        console.log('Route not found or no stops:', routeId);
        return;
    }

    console.log('Found route:', route);
    const routePath = route.stops.map(stop => [stop.lat, stop.lng]);
    
    if (routeLine) {
        map.removeLayer(routeLine);
    }

    routeLine = L.polyline(routePath, { color: route.color || '#ea580c' }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    console.log('Route drawn successfully');
}

// Demo data loading function for testing
function loadDemoData(cityId, routeId) {
    console.log('Loading demo data for testing...');
    
    // Create some demo bus data
    const demoBuses = {
        'DEMO_BUS_001': {
            busNumber: 'PB-07-DEMO1',
            driverName: 'Demo Driver 1',
            latitude: 30.7333,
            longitude: 76.7794,
            speed: 25,
            timestamp: Date.now(),
            isActive: true,
            passengerCount: 15,
            routeId: routeId
        },
        'DEMO_BUS_002': {
            busNumber: 'PB-07-DEMO2',
            driverName: 'Demo Driver 2',
            latitude: 30.7400,
            longitude: 76.7850,
            speed: 30,
            timestamp: Date.now(),
            isActive: true,
            passengerCount: 23,
            routeId: routeId
        }
    };
    
    console.log('Demo buses created:', demoBuses);
    
    // Update the UI with demo data
    updateBusList(demoBuses);
    updateBusMarkers(demoBuses);
    
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Demo data loaded for testing', 'info');
    }
}

function updateBusList(buses) {
    const busList = document.getElementById('busList');
    const busCount = document.getElementById('busCount');
    busList.innerHTML = '';

    if (!buses) {
        busList.innerHTML = '<p class="text-gray-500 text-center py-8">No active buses on this route.</p>';
        busCount.textContent = '0';
        return;
    }

    let activeBuses = 0;
    Object.keys(buses).forEach(deviceId => {
        const bus = buses[deviceId];
        // Check if data is recent (e.g., within last 5 minutes)
        if (Date.now() - bus.timestamp < PTTConfig.app.tracking.staleDataThreshold) {
            activeBuses++;
            const busCard = document.createElement('div');
            busCard.className = 'p-3 rounded-lg bg-gray-50 border cursor-pointer hover:bg-orange-50 transition-all duration-200';
            
            const statusIcon = bus.isActive ? '<i class="fas fa-circle text-green-500 text-xs"></i>' : '<i class="fas fa-circle text-red-500 text-xs"></i>';
            const passengerInfo = bus.passengerCount ? `<span class="text-xs text-blue-600"><i class="fas fa-users mr-1"></i>${bus.passengerCount}</span>` : '';
            const deviceInfo = `<span class="text-xs text-gray-500">Device: ${deviceId.substring(0, 8)}...</span>`;
            
            busCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <p class="font-semibold text-gray-800"><i class="fas fa-bus text-orange-600 mr-1"></i> ${bus.busNumber}</p>
                        ${statusIcon}
                    </div>
                    <div class="flex items-center space-x-2">
                        <p class="text-sm text-green-600 font-medium">${bus.speed || 0} km/h</p>
                        ${passengerInfo}
                    </div>
                </div>
                <div class="flex items-center justify-between mt-2">
                    <p class="text-xs text-gray-500">Driver: ${bus.driverName || 'Unknown'}</p>
                    <p class="text-xs text-gray-500">${typeof CommonUtils !== 'undefined' ? CommonUtils.getTimeAgo(bus.timestamp) : 'Recently'}</p>
                </div>
                <div class="mt-1">
                    ${deviceInfo}
                </div>
            `;
            
            busCard.onclick = () => {
                const busLocation = [bus.latitude, bus.longitude];
                map.setView(busLocation, 16);
                if (busMarkers[deviceId]) {
                    busMarkers[deviceId].openPopup();
                }
                // Show detailed bus info
                showBusDetails(bus, deviceId);
            };
            busList.appendChild(busCard);
        }
    });

    busCount.textContent = activeBuses;
    if (activeBuses === 0) {
        busList.innerHTML = '<div class="text-gray-500 text-center py-8"><i class="fas fa-bus text-2xl mb-2 block"></i><p>No active buses on this route</p><p class="text-xs mt-1">Buses may be offline or between routes</p></div>';
    }
}

function updateBusMarkers(buses) {
    // Remove stale markers
    Object.keys(busMarkers).forEach(deviceId => {
        if (!buses || !buses[deviceId] || (Date.now() - buses[deviceId].timestamp > PTTConfig.app.tracking.staleDataThreshold)) {
            map.removeLayer(busMarkers[deviceId]);
            delete busMarkers[deviceId];
        }
    });

    if (!buses) return;
    
    Object.keys(buses).forEach(deviceId => {
        const bus = buses[deviceId];
        if (Date.now() - bus.timestamp < PTTConfig.app.tracking.staleDataThreshold) {
            const busLocation = [bus.latitude, bus.longitude];
            
            if (busMarkers[deviceId]) {
                // Update existing marker
                busMarkers[deviceId].setLatLng(busLocation);
            } else {
                // Create new marker
                const busIcon = L.divIcon({
                    className: 'bus-marker',
                    html: `<i class="fas fa-bus"></i>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                busMarkers[deviceId] = L.marker(busLocation, { icon: busIcon }).addTo(map);
            }
            
            // Update popup with device info
            const popupContent = `
                <div>
                    <b>Bus:</b> ${bus.busNumber}<br>
                    <b>Driver:</b> ${bus.driverName || 'Unknown'}<br>
                    <b>Speed:</b> ${bus.speed || 0} km/h<br>
                    <b>Device:</b> ${deviceId.substring(0, 12)}...<br>
                    <b>Last Update:</b> ${typeof CommonUtils !== 'undefined' ? CommonUtils.getTimeAgo(bus.timestamp) : 'Recently'}
                </div>
            `;
            busMarkers[deviceId].bindPopup(popupContent);
        }
    });
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            document.getElementById('userLocationInfo').classList.remove('hidden');
            document.getElementById('userLat').textContent = userLocation.lat.toFixed(4);
            document.getElementById('userLng').textContent = userLocation.lng.toFixed(4);

            if (userMarker) {
                userMarker.setLatLng([userLocation.lat, userLocation.lng]);
            } else {
                const userIcon = L.divIcon({
                    className: 'user-marker',
                    html: '<i class="fas fa-street-view"></i>',
                    iconSize: [25, 25],
                    iconAnchor: [12, 12]
                });
                userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
            }
            map.setView([userLocation.lat, userLocation.lng], 15);
            userMarker.bindPopup("Your Location").openPopup();
        }, () => {
            alert('Could not get your location. Please allow location access.');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

// Utility Functions
function clearMap() {
    if (routeLine) map.removeLayer(routeLine);
    Object.values(busMarkers).forEach(marker => map.removeLayer(marker));
    busMarkers = {};
}

function clearAllListeners() {
    firebaseListeners.forEach(ref => ref.off());
    firebaseListeners = [];
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('hidden');
}

function centerOnUser() {
    if (userMarker) {
        map.setView(userMarker.getLatLng(), 15);
    } else {
        getUserLocation();
    }
}

// Additional utility functions
function listenForAlerts(routeId) {
    const alertsRef = database.ref('alerts').orderByChild('routeId').equalTo(routeId);
    
    alertsRef.on('child_added', (snapshot) => {
        const alert = snapshot.val();
        if (alert && alert.status === 'active' && (Date.now() - alert.timestamp) < 300000) { // 5 minutes
            showRouteAlert(alert);
        }
    });
    
    firebaseListeners.push(alertsRef);
}

function showRouteAlert(alert) {
    const alertTypes = {
        traffic: { icon: 'fa-traffic-light', color: 'orange', title: 'Traffic Alert' },
        break: { icon: 'fa-coffee', color: 'yellow', title: 'Driver Break' },
        emergency: { icon: 'fa-exclamation-triangle', color: 'red', title: 'Emergency Alert' }
    };
    
    const alertInfo = alertTypes[alert.type] || { icon: 'fa-info-circle', color: 'blue', title: 'Info' };
    
    CommonUtils.showNotification(
        `${alertInfo.title}: Bus ${alert.busNumber} - ${alert.message || alert.type}`,
        alert.type === 'emergency' ? 'error' : 'warning',
        8000
    );
}

function showBusDetails(bus, deviceId) {
    const modal = CommonUtils.createModal(
        `Bus Details - ${bus.busNumber}`,
        `
            <div class="space-y-4">
                <!-- Bus Information -->
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-blue-800 mb-2">🚌 Bus Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><span class="font-medium">Bus Number:</span> ${bus.busNumber}</div>
                        <div><span class="font-medium">Route:</span> ${bus.routeId || 'N/A'}</div>
                        <div><span class="font-medium">Type:</span> ${bus.busType || 'Standard'}</div>
                        <div><span class="font-medium">Capacity:</span> ${bus.capacity || 45} passengers</div>
                        <div><span class="font-medium">Current Speed:</span> ${bus.speed || 0} km/h</div>
                        <div><span class="font-medium">Occupancy:</span> 
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOccupancyColor(bus.occupancy || 0)}">
                                ${getOccupancyText(bus.occupancy || 0)} (${bus.occupancy || 0}%)
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Driver Information -->
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-green-800 mb-2">👨‍✈️ Driver Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><span class="font-medium">Name:</span> ${bus.driverName || 'Unknown'}</div>
                        <div><span class="font-medium">ID:</span> ${bus.driverId || 'N/A'}</div>
                        <div><span class="font-medium">Experience:</span> ${bus.driverExperience || 'N/A'}</div>
                        <div><span class="font-medium">Rating:</span> 
                            ${'★'.repeat(Math.floor(bus.driverRating || 5))} ${(bus.driverRating || 5).toFixed(1)}/5
                        </div>
                        <div><span class="font-medium">Languages:</span> ${bus.driverLanguages ? bus.driverLanguages.join(', ') : 'Hindi, Punjabi'}</div>
                        <div><span class="font-medium">Contact:</span> ${bus.driverPhone || 'Emergency Only'}</div>
                    </div>
                </div>

                <!-- Bus Features -->
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-purple-800 mb-2">🛡️ Bus Features & Amenities</h3>
                    <div class="flex flex-wrap gap-2">
                        ${bus.features ? bus.features.map(feature => 
                            `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                ${getFeatureIcon(feature)} ${feature}
                            </span>`
                        ).join('') : 
                            `<span class="text-purple-600">AC, GPS Tracking, CCTV</span>`
                        }
                    </div>
                </div>

                <!-- Real-time Status -->
                <div class="bg-yellow-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-yellow-800 mb-2">📍 Real-time Status</h3>
                    <div class="space-y-2 text-sm">
                        <div><span class="font-medium">Current Location:</span> ${bus.currentStop || 'In Transit'}</div>
                        <div><span class="font-medium">Next Stop:</span> ${bus.nextStop || 'Calculating...'}</div>
                        <div><span class="font-medium">ETA to Next Stop:</span> 
                            ${bus.nextStopETA ? `${Math.round((new Date(bus.nextStopETA) - new Date()) / 60000)} minutes` : 'Calculating...'}
                        </div>
                        <div><span class="font-medium">Delay Status:</span> ${getDelayInfo(bus.delay || 0)}</div>
                        <div><span class="font-medium">Last Update:</span> ${typeof CommonUtils !== 'undefined' ? CommonUtils.getTimeAgo(bus.timestamp) : 'Recently'}</div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-gray-800 mb-2">🎯 Quick Actions</h3>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="trackThisBus('${deviceId}')" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                            📱 Track This Bus
                        </button>
                        <button onclick="setArrivalAlert('${deviceId}')" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                            🔔 Set Arrival Alert
                        </button>
                        <button onclick="shareLocation('${deviceId}')" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
                            📤 Share Location
                        </button>
                    </div>
                </div>
            </div>
        `,
        () => {},
        'OK'
    );
}

// Helper functions for enhanced bus details
function getOccupancyColor(occupancy) {
    if (occupancy <= 30) return 'bg-green-100 text-green-800';
    if (occupancy <= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
}

function getOccupancyText(occupancy) {
    if (occupancy <= 30) return 'Low';
    if (occupancy <= 70) return 'Moderate';
    return 'High';
}

function getFeatureIcon(feature) {
    const icons = {
        'AC': '❄️',
        'WiFi': '📶',
        'CCTV': '📹',
        'GPS': '🛰️',
        'USB Charging': '🔌',
        'Wheelchair Access': '♿',
        'Audio System': '🔊',
        'Reading Lights': '💡'
    };
    return icons[feature] || '✓';
}

function getDelayInfo(delayMinutes) {
    if (delayMinutes <= 0) {
        return '<span class="text-green-600 font-medium">On Time ✅</span>';
    } else if (delayMinutes <= 5) {
        return `<span class="text-yellow-600 font-medium">${delayMinutes} min delay ⚠️</span>`;
    } else {
        return `<span class="text-red-600 font-medium">${delayMinutes} min delay 🚨</span>`;
    }
}

// Enhanced tracking functions
function trackThisBus(deviceId) {
    // Focus on this specific bus
    const bus = Object.values(busMarkers).find(marker => marker.deviceId === deviceId);
    if (bus) {
        map.setView(bus.getLatLng(), 16);
        CommonUtils.showNotification('Now tracking this bus', 'success');
    }
}

function setArrivalAlert(deviceId) {
    // Set arrival notification for user's selected stop
    if (selectedStopId) {
        CommonUtils.showNotification('Arrival alert set! You\'ll be notified when the bus approaches your stop.', 'success');
        // Store alert in localStorage or Firebase
        localStorage.setItem(`alert_${deviceId}_${selectedStopId}`, JSON.stringify({
            deviceId,
            stopId: selectedStopId,
            timestamp: Date.now()
        }));
    } else {
        CommonUtils.showNotification('Please select a bus stop first to set arrival alerts.', 'warning');
    }
}

function shareLocation(deviceId) {
    if (navigator.share) {
        navigator.share({
            title: 'Bus Location',
            text: `Track this bus live on Punjab Transport Tracker`,
            url: `${window.location.origin}${window.location.pathname}?track=${deviceId}`
        });
    } else {
        // Fallback - copy to clipboard
        const url = `${window.location.origin}${window.location.pathname}?track=${deviceId}`;
        navigator.clipboard.writeText(url).then(() => {
            CommonUtils.showNotification('Bus tracking link copied to clipboard!', 'success');
        });
    }
}

function trackSingleBus(busNumber, lat, lng) {
    map.setView([lat, lng], 18);
    CommonUtils.showNotification(`Now tracking bus ${busNumber}`, 'success');
}

function fitAllBuses() {
    const markers = Object.values(busMarkers);
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    } else {
        CommonUtils.showNotification('No buses to display', 'info');
    }
}

function toggleAutoFollow() {
    // Placeholder for auto-follow functionality
    const btn = document.getElementById('autoFollowBtn');
    const icon = btn.querySelector('i');
    
    if (icon.classList.contains('fa-location-arrow')) {
        icon.classList.replace('fa-location-arrow', 'fa-location-arrow');
        icon.style.color = '#ea580c';
        CommonUtils.showNotification('Auto-follow enabled', 'success');
    } else {
        icon.style.color = '#6b7280';
        CommonUtils.showNotification('Auto-follow disabled', 'info');
    }
}

function closeBusModal() {
    const modal = document.getElementById('busModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ===================================
// Enhanced Passenger Features
// ===================================

// Journey Planning
function planJourney() {
    const fromStop = document.getElementById('fromStop').value;
    const toStop = document.getElementById('toStop').value;
    
    if (!fromStop || !toStop || fromStop === toStop) {
        CommonUtils.showNotification('Please select valid origin and destination', 'warning');
        return;
    }
    
    const resultsDiv = document.getElementById('journeyResults');
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = `
        <div class="bg-white p-4 rounded-lg border">
            <h4 class="font-semibold mb-2">🚀 Journey Plan</h4>
            <div class="space-y-2 text-sm">
                <div>Route: CH-001 Express</div>
                <div>Time: 25 minutes</div>
                <div>Fare: ₹15</div>
                <div>Next bus: In 8 minutes</div>
            </div>
            <button onclick="startTracking()" class="w-full bg-green-600 text-white p-2 rounded mt-3">Start Tracking</button>
        </div>
    `;
}

function startTracking() {
    CommonUtils.showNotification('Live tracking started!', 'success');
}

// Feedback System
function initializeFeedback() {
    const stars = document.querySelectorAll('.star');
    window.selectedRating = 0;
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            window.selectedRating = parseInt(star.getAttribute('data-rating'));
            updateStars(window.selectedRating);
        });
    });
}

function updateStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.classList.toggle('text-yellow-500', index < rating);
        star.classList.toggle('text-gray-300', index >= rating);
    });
}

function submitFeedback() {
    const busNumber = document.getElementById('feedbackBusNumber').value;
    const rating = window.selectedRating;
    
    if (!busNumber || !rating) {
        CommonUtils.showNotification('Please fill all fields', 'warning');
        return;
    }
    
    CommonUtils.showNotification('Thank you for your feedback!', 'success');
    document.getElementById('feedbackBusNumber').value = '';
    window.selectedRating = 0;
    updateStars(0);
}

// Live Arrivals
function updateArrivals() {
    const content = document.getElementById('predictionsContent');
    if (content) {
        content.innerHTML = `
            <div class="bg-white p-3 rounded border-l-4 border-green-500">
                <div class="flex justify-between">
                    <div>Bus PB-07-1234</div>
                    <div class="font-bold text-green-600">3 min</div>
                </div>
                <div class="text-xs text-gray-500">Route CH-001 • 45% full • ⭐ 4.7</div>
            </div>
        `;
        document.getElementById('arrivalPredictions').classList.remove('hidden');
    }
}

// Initialize features
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initializeFeedback();
        updateArrivals();
        populateStops();
    }, 1000);
});

function populateStops() {
    const stops = [['CH001_01', 'Sector 17'], ['CH001_02', 'Sector 22'], ['CH001_03', 'Sector 35']];
    const selects = ['fromStop', 'toStop'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            stops.forEach(([id, name]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                select.appendChild(option);
            });
        }
    });
}

// ===================================
// MapmyIndia Enhanced Functions
// ===================================

// Route creation coordinate handling
function addRouteCoordinate(lat, lng) {
    console.log('Adding route coordinate:', lat, lng);
    
    // Create a temporary marker at the clicked location
    let marker;
    
    if (typeof mappls !== 'undefined') {
        // MapmyIndia marker
        marker = new mappls.Marker({
            map: map,
            position: [lat, lng],
            fitbounds: false,
            icon: 'https://apis.mappls.com/map_v3/1.3/map_sdk/place-marker.png',
            title: `Coordinate: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        });
        
        // Add info window with coordinate details
        const infoWindow = new mappls.InfoWindow({
            content: `
                <div style="padding: 10px; min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: #333;">📍 Selected Location</h4>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
                    <div style="margin-top: 10px;">
                        <button onclick="confirmCoordinate(${lat}, ${lng})" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">✓ Use This Location</button>
                        <button onclick="cancelCoordinate()" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">✗ Cancel</button>
                    </div>
                </div>
            `,
            position: [lat, lng]
        });
        
        marker.infoWindow = infoWindow;
        infoWindow.open();
        
    } else {
        // Leaflet fallback
        marker = L.marker([lat, lng]).addTo(map);
        const popupContent = `
            <div style="min-width: 180px;">
                <h4 style="margin: 0 0 8px 0;">📍 Selected Location</h4>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Lat:</strong> ${lat.toFixed(6)}</p>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Lng:</strong> ${lng.toFixed(6)}</p>
                <div style="margin-top: 8px;">
                    <button onclick="confirmCoordinate(${lat}, ${lng})" class="btn-confirm">✓ Use This</button>
                    <button onclick="cancelCoordinate()" class="btn-cancel">✗ Cancel</button>
                </div>
            </div>
        `;
        marker.bindPopup(popupContent).openPopup();
    }
    
    // Store the temporary marker
    window.tempMarker = marker;
    
    // Reverse geocode to get address (if MapmyIndia is available)
    if (typeof mappls !== 'undefined') {
        reverseGeocode(lat, lng);
    }
}

// Reverse geocoding to get readable address
function reverseGeocode(lat, lng) {
    // This would use MapmyIndia's reverse geocoding API
    // For now, we'll show a placeholder
    console.log('Reverse geocoding for:', lat, lng);
    
    // You would implement actual reverse geocoding here
    // Example: mappls.reverseGeocode({lat: lat, lng: lng}, callback);
}

// Confirm the selected coordinate
function confirmCoordinate(lat, lng) {
    console.log('Coordinate confirmed:', lat, lng);
    
    // Add to route coordinates array (you'll need to implement this based on your route creation logic)
    if (!window.routeCoordinates) {
        window.routeCoordinates = [];
    }
    
    window.routeCoordinates.push({ lat: lat, lng: lng });
    
    // Clean up temporary marker
    if (window.tempMarker) {
        if (window.tempMarker.remove) {
            window.tempMarker.remove(); // Leaflet
        } else if (window.tempMarker.setMap) {
            window.tempMarker.setMap(null); // MapmyIndia
        }
        window.tempMarker = null;
    }
    
    // Show success notification
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification(`Coordinate added: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
    }
    
    // Update route creation form if it exists
    updateRouteCreationForm(lat, lng);
}

// Cancel coordinate selection
function cancelCoordinate() {
    console.log('Coordinate selection cancelled');
    
    // Clean up temporary marker
    if (window.tempMarker) {
        if (window.tempMarker.remove) {
            window.tempMarker.remove(); // Leaflet
        } else if (window.tempMarker.setMap) {
            window.tempMarker.setMap(null); // MapmyIndia
        }
        window.tempMarker = null;
    }
    
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Coordinate selection cancelled', 'info');
    }
}

// Update route creation form with new coordinates
function updateRouteCreationForm(lat, lng) {
    // This function would update your route creation form
    // You'll need to implement this based on your specific form structure
    console.log('Updating route creation form with:', lat, lng);
    
    // Example: Add to a list of coordinates in the form
    const coordinatesList = document.getElementById('coordinatesList');
    if (coordinatesList) {
        const listItem = document.createElement('div');
        listItem.className = 'coordinate-item p-2 bg-gray-100 rounded mb-2';
        listItem.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="text-sm">📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
                <button onclick="removeCoordinate(this, ${lat}, ${lng})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        coordinatesList.appendChild(listItem);
    }
}

// Remove coordinate from route
function removeCoordinate(button, lat, lng) {
    // Remove from coordinates array
    if (window.routeCoordinates) {
        window.routeCoordinates = window.routeCoordinates.filter(
            coord => !(Math.abs(coord.lat - lat) < 0.0001 && Math.abs(coord.lng - lng) < 0.0001)
        );
    }
    
    // Remove from DOM
    button.closest('.coordinate-item').remove();
    
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Coordinate removed', 'info');
    }
}

// Enable route creation mode
function enableRouteCreationMode() {
    window.routeCreationMode = true;
    window.routeCoordinates = [];
    
    // Change cursor to crosshair
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.style.cursor = 'crosshair';
    }
    
    if (typeof CommonUtils !== 'undefined') {
        CommonUtils.showNotification('Click on the map to add route coordinates', 'info');
    }
    console.log('Route creation mode enabled');
}

// Disable route creation mode
function disableRouteCreationMode() {
    window.routeCreationMode = false;
    
    // Reset cursor
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.style.cursor = '';
    }
    
    console.log('Route creation mode disabled');
}

// Enhanced bus marker creation for MapmyIndia
function createBusMarker(bus, deviceId) {
    const busLocation = [bus.latitude, bus.longitude];
    let marker;
    
    if (typeof mappls !== 'undefined') {
        // MapmyIndia marker
        marker = new mappls.Marker({
            map: map,
            position: busLocation,
            icon: {
                url: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r="18" fill="#ea580c" stroke="white" stroke-width="2"/>
                        <text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="bold">🚌</text>
                    </svg>
                `),
                scaledSize: [40, 40],
                anchor: [20, 20]
            },
            title: `Bus: ${bus.busNumber}`
        });
        
        // Add info window
        const infoContent = `
            <div style="padding: 12px; min-width: 250px;">
                <h4 style="margin: 0 0 8px 0; color: #ea580c;">🚌 ${bus.busNumber}</h4>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Driver:</strong> ${bus.driverName || 'Unknown'}</p>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Speed:</strong> ${bus.speed || 0} km/h</p>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Last Update:</strong> ${typeof CommonUtils !== 'undefined' ? CommonUtils.getTimeAgo(bus.timestamp) : 'Recently'}</p>
                <div style="margin-top: 8px;">
                    <button onclick="showBusDetails({...${JSON.stringify(bus)}}, '${deviceId}')" style="background: #ea580c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">View Details</button>
                </div>
            </div>
        `;
        
        const infoWindow = new mappls.InfoWindow({
            content: infoContent,
            position: busLocation
        });
        
        marker.addListener('click', () => {
            infoWindow.open();
        });
        
    } else {
        // Leaflet fallback
        const busIcon = L.divIcon({
            className: 'bus-marker',
            html: `<i class="fas fa-bus"></i>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        marker = L.marker(busLocation, { icon: busIcon }).addTo(map);
        
        const popupContent = `
            <div>
                <b>Bus:</b> ${bus.busNumber}<br>
                <b>Driver:</b> ${bus.driverName || 'Unknown'}<br>
                <b>Speed:</b> ${bus.speed || 0} km/h<br>
                <b>Last Update:</b> ${typeof CommonUtils !== 'undefined' ? CommonUtils.getTimeAgo(bus.timestamp) : 'Recently'}
            </div>
        `;
        marker.bindPopup(popupContent);
    }
    
    return marker;
}