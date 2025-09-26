// ===================================
// Google Maps, Earth, and KML Integration
// ===================================

// Global variables for KML management
let kmlLayer = null;
let routeKmlData = [];
let currentKmlFile = null;

let googleMapsLoaded = false;
let googleMap = null;

// Google Maps initialization callback
function initGoogleMaps() {
    console.log('Google Maps API loaded successfully');
    googleMapsLoaded = true;
    
    // Initialize admin dashboard if it's visible
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard && !adminDashboard.classList.contains('hidden')) {
        initializeAdminMap();
    }
}

// Initialize Google Maps for admin
function initializeGoogleAdminMap(config) {
    try {
        const mapContainer = document.getElementById('adminMap');
        if (!mapContainer) {
            console.error('Admin map container not found');
            return;
        }

        // Check if API key is configured
        const hasGoogleApiKey = config.app.map.google && 
                               config.app.map.google.apiKey && 
                               config.app.map.google.apiKey.trim() !== '';

        if (!hasGoogleApiKey) {
            console.log('Google Maps API key not configured, using fallback');
            initializeLeafletAdminMap(config);
            return;
        }

        console.log('Initializing Google Maps for admin dashboard');

        // Google Maps configuration
        const mapOptions = {
            center: {
                lat: config.app.map.defaultCenter.lat,
                lng: config.app.map.defaultCenter.lng
            },
            zoom: config.app.map.defaultZoom,
            maxZoom: config.app.map.maxZoom || 20,
            minZoom: config.app.map.minZoom || 6,
            
            // Use satellite view for better terrain visualization
            mapTypeId: config.app.map.google.defaultMapType || 'satellite',
            
            // Enable 3D features if Google Earth is enabled
            tilt: config.app.map.google.earth.enable3D ? config.app.map.google.earth.tilt : 0,
            heading: config.app.map.google.earth.heading || 0,
            
            // Map controls
            zoomControl: config.app.map.google.controls.zoom,
            mapTypeControl: config.app.map.google.controls.mapType,
            streetViewControl: config.app.map.google.controls.streetView,
            fullscreenControl: config.app.map.google.controls.fullscreen,
            rotateControl: config.app.map.google.controls.rotate,
            
            // Additional options
            gestureHandling: 'greedy',
            backgroundColor: '#f8f9fa',
            clickableIcons: true,
            
            // Custom styles if provided
            styles: config.app.map.google.styles.customStyle || []
        };

        // Create the map
        googleMap = new google.maps.Map(mapContainer, mapOptions);
        adminMap = googleMap; // Set global reference

        // Enable terrain and buildings for 3D effect
        if (config.app.map.google.earth.enableTerrain) {
            googleMap.setTilt(config.app.map.google.earth.tilt || 45);
        }

        // Add click event for route creation
        googleMap.addListener('click', function(event) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            console.log('Google Map clicked at:', lat, lng);
            
            if (window.adminRouteCreationMode) {
                addRouteStopMarker(lat, lng);
            }
        });

        // Add places search if enabled
        if (config.app.map.google.controls.search !== false) {
            const searchBox = new google.maps.places.SearchBox(
                document.getElementById('mapSearch') || document.createElement('input')
            );
        }

        console.log('Google Maps admin map initialized successfully');
        
    } catch (error) {
        console.error('Error initializing Google Maps:', error);
        console.log('Falling back to Leaflet map');
        initializeLeafletAdminMap(config);
    }
}

// Initialize Google Maps for route creation
function initializeGoogleRouteCreationMap() {
    console.log('🗺️ Initializing Google Maps for route creation...');
    
    const mapContainer = document.getElementById('routeCreationMap');
    if (!mapContainer) {
        console.error('❌ Route creation map container not found!');
        return;
    }

    // Check if Google Maps is available and API key is configured
    const config = window.PTTConfig || window.appConfig;
    const hasGoogleApiKey = config?.app?.map?.google?.apiKey && 
                           config.app.map.google.apiKey.trim() !== '';

    if (!googleMapsLoaded || !hasGoogleApiKey) {
        console.log('Google Maps not available, using Leaflet fallback');
        initializeRouteCreationMap(); // Fallback to Leaflet
        return;
    }

    try {
        // Prepare container
        mapContainer.style.height = '256px';
        mapContainer.style.width = '100%';
        mapContainer.innerHTML = '';

        // Google Maps options optimized for route creation
        const mapOptions = {
            center: {
                lat: config.app.map.defaultCenter.lat,
                lng: config.app.map.defaultCenter.lng
            },
            zoom: config.app.map.defaultZoom,
            
            // Use hybrid view for better route planning
            mapTypeId: 'hybrid',
            
            // Enhanced controls for route creation
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            rotateControl: true,
            
            gestureHandling: 'greedy',
            clickableIcons: false, // Prevent interference with click events
            
            // 3D features for better visualization
            tilt: 45,
            
            // Custom styles for route creation
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'on' }] // Show points of interest
                },
                {
                    featureType: 'transit.station.bus',
                    elementType: 'all',
                    stylers: [{ visibility: 'on' }] // Highlight bus stations
                }
            ]
        };

        // Create the route creation map
        routeCreationMap = new google.maps.Map(mapContainer, mapOptions);

        // Add click handler for adding stops
        routeCreationMap.addListener('click', function(event) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            console.log('🎯 Google Map clicked at coordinates:', lat.toFixed(6), lng.toFixed(6));
            
            // Visual feedback
            const clickMarker = new google.maps.Marker({
                position: { lat, lng },
                map: routeCreationMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#10b981',
                    fillOpacity: 0.8,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                },
                animation: google.maps.Animation.DROP
            });
            
            // Remove click marker after animation
            setTimeout(() => {
                clickMarker.setMap(null);
            }, 1500);
            
            // Add the stop
            addStopToRoute(lat, lng);
        });

        // Update debug info
        const debugOverlay = document.getElementById('mapDebugInfo');
        if (debugOverlay) {
            debugOverlay.innerHTML = '✅ Google Maps Ready - Click to Add Stop';
            debugOverlay.style.background = 'rgba(59, 130, 246, 0.9)';
        }

        // Visual feedback
        mapContainer.style.border = '3px solid #3b82f6';
        mapContainer.title = '✅ Google Maps Ready! Click anywhere to add bus stops';
        
        console.log('✅ Google Maps route creation initialized successfully');
        showNotification('Google Maps loaded successfully! Click to add stops.', 'success');
        
        // If we have KML data loaded, display it on this map too
        if (routeKmlData && routeKmlData.length > 0) {
            console.log('📍 Displaying KML data on Google Maps route creation map...');
            displayKMLRoutesOnRouteCreationMap(routeKmlData);
        }
        
        // Check for modal KML data
        if (window.modalKmlData && window.modalKmlData.length > 0) {
            console.log('📍 Displaying modal KML data on Google Maps route creation map...');
            displayKMLRoutesOnRouteCreationMap(window.modalKmlData);
        }
        
    } catch (error) {
        console.error('Error initializing Google Maps route creation:', error);
        console.log('Falling back to Leaflet for route creation');
        initializeRouteCreationMap();
    }
}

// Update route visualization for Google Maps
function updateGoogleRouteVisualization() {
    if (!routeCreationMap || !routeCreationMap.setCenter) {
        // Not a Google Map, fall back to Leaflet method
        updateRouteVisualization();
        return;
    }

    console.log('Updating Google Maps route visualization...');
    
    // Clear existing markers and polylines (Google Maps version)
    // Note: In a production app, you'd keep track of these in arrays
    
    // Add markers for stops with coordinates
    const validStops = routeStops.filter(stop => stop.latitude && stop.longitude);
    console.log('Valid stops for Google Maps visualization:', validStops.length);
    
    validStops.forEach((stop, index) => {
        // Create custom marker for each stop
        const marker = new google.maps.Marker({
            position: { lat: stop.latitude, lng: stop.longitude },
            map: routeCreationMap,
            title: `Stop ${index + 1}: ${stop.name || 'Unnamed Stop'}`,
            label: {
                text: (index + 1).toString(),
                color: 'white',
                fontWeight: 'bold'
            },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 15,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            }
        });
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 8px;">
                    <h4 style="margin: 0 0 4px 0; color: #ef4444;">🚏 Stop ${index + 1}</h4>
                    <p style="margin: 2px 0; font-size: 12px;"><strong>Name:</strong> ${stop.name || 'Unnamed Stop'}</p>
                    <p style="margin: 2px 0; font-size: 12px;"><strong>Coordinates:</strong> ${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}</p>
                </div>
            `
        });
        
        marker.addListener('click', () => {
            infoWindow.open(routeCreationMap, marker);
        });
    });
    
    // Draw route polyline if we have multiple stops
    if (validStops.length > 1) {
        const path = validStops.map(stop => ({
            lat: stop.latitude,
            lng: stop.longitude
        }));
        
        const routePolyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.8,
            strokeWeight: 4
        });
        
        routePolyline.setMap(routeCreationMap);
        
        // Fit map to show all stops
        const bounds = new google.maps.LatLngBounds();
        validStops.forEach(stop => {
            bounds.extend({ lat: stop.latitude, lng: stop.longitude });
        });
        routeCreationMap.fitBounds(bounds);
        
        console.log('Google Maps route line drawn with', validStops.length, 'stops');
    } else if (validStops.length === 1) {
        // Center on the single stop
        routeCreationMap.setCenter({
            lat: validStops[0].latitude,
            lng: validStops[0].longitude
        });
        routeCreationMap.setZoom(15);
    }
}

let adminMap, activityChart, routeChart;
let busMarkers = {};
let allBuses = {};
let routeCreationMap, routeEditMap;
let routeStops = [];
let routePolyline = null;
let allRoutes = {};
let editingRouteId = null;

document.addEventListener('DOMContentLoaded', () => {
    const storedAdmin = sessionStorage.getItem('adminInfo');
    if (storedAdmin) {
        showAdminDashboard();
    } else {
        showAdminLogin();
    }
    
    // Initialize form event listeners
    initializeFormHandlers();
});

function initializeFormHandlers() {
    // Route creation form handler
    const routeForm = document.getElementById('routeCreationForm');
    if (routeForm) {
        routeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createNewRoute();
        });
    }
    
    // Route edit form handler  
    const editForm = document.getElementById('routeEditForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateRoute();
        });
    }
    
    // KML file upload handler
    const kmlUpload = document.getElementById('kmlFileUpload');
    if (kmlUpload) {
        kmlUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && (file.name.endsWith('.kml') || file.name.endsWith('.kmz'))) {
                loadKMLFile(file);
            } else {
                showNotification('Please select a valid KML file', 'error');
            }
        });
    }
    
    // Modal KML file upload handler
    const modalKmlUpload = document.getElementById('modalKmlFileUpload');
    if (modalKmlUpload) {
        modalKmlUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && (file.name.endsWith('.kml') || file.name.endsWith('.kmz'))) {
                loadKMLFileInModal(file);
            } else {
                showNotification('Please select a valid KML file', 'error');
            }
        });
    }
}

// ===================================
// KML File Management System
// ===================================

/**
 * Load and display KML file on the map
 * @param {File} file - The KML file to load
 */
function loadKMLFile(file) {
    console.log('📄 Loading KML file:', file.name);
    
    // Store the current KML file name for reference
    currentKmlFile = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const kmlContent = e.target.result;
            parseAndDisplayKML(kmlContent, file.name);
        } catch (error) {
            console.error('Error reading KML file:', error);
            showNotification('Failed to read KML file', 'error');
        }
    };
    reader.readAsText(file);
}

/**
 * Parse KML content and display on map
 * @param {string} kmlContent - The KML file content
 * @param {string} fileName - Name of the KML file
 */
function parseAndDisplayKML(kmlContent, fileName) {
    console.log('🔍 Parsing KML content...');
    
    try {
        // Parse KML using DOMParser
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlContent, 'application/xml');
        
        if (kmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Invalid KML format');
        }
        
        // Extract placemarks (routes, stops, etc.)
        const placemarks = kmlDoc.getElementsByTagName('Placemark');
        const extractedRoutes = [];
        
        console.log(`📍 Found ${placemarks.length} placemarks in KML`);
        
        for (let i = 0; i < placemarks.length; i++) {
            const placemark = placemarks[i];
            const routeData = extractRouteFromPlacemark(placemark);
            
            if (routeData) {
                extractedRoutes.push(routeData);
            }
        }
        
        if (extractedRoutes.length > 0) {
            displayKMLRoutes(extractedRoutes, fileName);
            showNotification(`Successfully loaded ${extractedRoutes.length} routes from ${fileName}`, 'success');
        } else {
            showNotification('No valid routes found in KML file', 'warning');
        }
        
    } catch (error) {
        console.error('Error parsing KML:', error);
        showNotification('Failed to parse KML file: ' + error.message, 'error');
    }
}

/**
 * Extract route data from a KML placemark
 * @param {Element} placemark - KML Placemark element
 * @returns {Object|null} Route data or null if invalid
 */
function extractRouteFromPlacemark(placemark) {
    try {
        const name = placemark.getElementsByTagName('name')[0]?.textContent || 'Unnamed Route';
        const description = placemark.getElementsByTagName('description')[0]?.textContent || '';
        
        // Check for LineString (route path)
        const lineString = placemark.getElementsByTagName('LineString')[0];
        if (lineString) {
            const coordinates = lineString.getElementsByTagName('coordinates')[0]?.textContent;
            if (coordinates) {
                const stops = parseKMLCoordinates(coordinates);
                
                return {
                    id: 'kml_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    name: name,
                    description: description,
                    stops: stops,
                    type: 'kml_import',
                    color: extractKMLStyle(placemark) || '#3b82f6',
                    source: 'kml_import'
                };
            }
        }
        
        // Check for Point (single stop)
        const point = placemark.getElementsByTagName('Point')[0];
        if (point) {
            const coordinates = point.getElementsByTagName('coordinates')[0]?.textContent;
            if (coordinates) {
                const coords = coordinates.trim().split(',');
                const lng = parseFloat(coords[0]);
                const lat = parseFloat(coords[1]);
                const alt = coords[2] ? parseFloat(coords[2]) : 0;
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    return {
                        id: 'kml_stop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        name: name,
                        description: description,
                        type: 'stop',
                        latitude: lat,
                        longitude: lng,
                        altitude: alt,
                        source: 'kml_import'
                    };
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error extracting route from placemark:', error);
        return null;
    }
}

function adminLogin(event) {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    if (email === PTTConfig.demo.adminCredentials.email && password === PTTConfig.demo.adminCredentials.password) {
        sessionStorage.setItem('adminInfo', JSON.stringify({ email }));
        showAdminDashboard();
    } else {
        alert('Invalid admin credentials.');
    }
}

// ===================================
// Additional KML Helper Functions
// ===================================

/**
 * Parse KML coordinates string into stops array
 * @param {string} coordinatesString - KML coordinates string
 * @returns {Array} Array of stop objects
 */
function parseKMLCoordinates(coordinatesString) {
    const stops = [];
    const lines = coordinatesString.trim().split(/\s+/);
    
    lines.forEach((line, index) => {
        const coords = line.split(',');
        if (coords.length >= 2) {
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            const alt = coords[2] ? parseFloat(coords[2]) : 0;
            
            if (!isNaN(lat) && !isNaN(lng)) {
                stops.push({
                    id: `kml_stop_${index + 1}`,
                    name: `Stop ${index + 1}`,
                    latitude: lat,
                    longitude: lng,
                    altitude: alt,
                    stopTime: 2 // Default stop time in minutes
                });
            }
        }
    });
    
    return stops;
}

/**
 * Extract style information from KML placemark
 * @param {Element} placemark - KML Placemark element
 * @returns {string|null} Color hex code or null
 */
function extractKMLStyle(placemark) {
    try {
        // Check for inline style
        const lineStyle = placemark.getElementsByTagName('LineStyle')[0];
        if (lineStyle) {
            const color = lineStyle.getElementsByTagName('color')[0]?.textContent;
            if (color) {
                // Convert KML color (aabbggrr) to CSS hex color (#rrggbb)
                return convertKMLColorToHex(color);
            }
        }
        
        // Check for style reference
        const styleUrl = placemark.getElementsByTagName('styleUrl')[0]?.textContent;
        if (styleUrl) {
            // In a full implementation, you would look up the style by ID
            // For now, return a default color
            return '#ea580c';
        }
        
        return null;
    } catch (error) {
        console.error('Error extracting KML style:', error);
        return null;
    }
}

/**
 * Convert KML color format (aabbggrr) to CSS hex (#rrggbb)
 * @param {string} kmlColor - KML color string
 * @returns {string} CSS hex color
 */
function convertKMLColorToHex(kmlColor) {
    if (kmlColor.length === 8) {
        // Extract components: aabbggrr -> rrggbb
        const r = kmlColor.substr(6, 2);
        const g = kmlColor.substr(4, 2);
        const b = kmlColor.substr(2, 2);
        return `#${r}${g}${b}`;
    }
    return '#3b82f6'; // Default blue
}

/**
 * Display KML routes on the map
 * @param {Array} routes - Array of route objects extracted from KML
 * @param {string} fileName - Name of the source KML file
 */
function displayKMLRoutes(routes, fileName) {
    console.log('🗺️ Displaying KML routes on map:', routes.length);
    
    // Clear existing KML layer if any
    if (kmlLayer) {
        clearKMLLayer();
    }
    
    // Store KML data
    routeKmlData = routes;
    currentKmlFile = fileName;
    
    // Display routes based on map type
    if (googleMapsLoaded && adminMap) {
        displayKMLRoutesOnGoogleMaps(routes);
    } else if (adminMap) {
        displayKMLRoutesOnLeaflet(routes);
    }
    
    // Update UI
    updateKMLRoutesDisplay(routes, fileName);
}

/**
 * Display KML routes on Google Maps
 * @param {Array} routes - Array of route objects
 */
function displayKMLRoutesOnGoogleMaps(routes) {
    console.log('📍 Displaying KML routes on Google Maps');
    
    const bounds = new google.maps.LatLngBounds();
    
    routes.forEach((route, index) => {
        if (route.stops && route.stops.length > 0) {
            // Create path for polyline
            const path = route.stops.map(stop => ({
                lat: stop.latitude,
                lng: stop.longitude
            }));
            
            // Create polyline
            const polyline = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: route.color || '#3b82f6',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                map: adminMap
            });
            
            // Store reference for cleanup
            if (!window.kmlPolylines) window.kmlPolylines = [];
            window.kmlPolylines.push(polyline);
            
            // Add markers for stops
            route.stops.forEach((stop, stopIndex) => {
                const marker = new google.maps.Marker({
                    position: { lat: stop.latitude, lng: stop.longitude },
                    map: adminMap,
                    title: `${route.name} - ${stop.name}`,
                    label: {
                        text: (stopIndex + 1).toString(),
                        color: 'white',
                        fontWeight: 'bold'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: route.color || '#3b82f6',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    }
                });
                
                // Add info window
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px; max-width: 200px;">
                            <h4 style="margin: 0 0 8px 0; color: ${route.color || '#3b82f6'};">
                                🚏 ${stop.name}
                            </h4>
                            <p style="margin: 2px 0; font-size: 12px;">
                                <strong>Route:</strong> ${route.name}
                            </p>
                            <p style="margin: 2px 0; font-size: 12px;">
                                <strong>Coordinates:</strong> ${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}
                            </p>
                            ${stop.altitude ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Altitude:</strong> ${stop.altitude}m</p>` : ''}
                            ${route.description ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">${route.description}</p>` : ''}
                        </div>
                    `
                });
                
                marker.addListener('click', () => {
                    infoWindow.open(adminMap, marker);
                });
                
                // Store reference for cleanup
                if (!window.kmlMarkers) window.kmlMarkers = [];
                window.kmlMarkers.push(marker);
                
                // Extend bounds
                bounds.extend({ lat: stop.latitude, lng: stop.longitude });
            });
        }
    });
    
    // Fit map to show all routes
    if (!bounds.isEmpty()) {
        adminMap.fitBounds(bounds);
    }
}

/**
 * Display KML routes on Leaflet map
 * @param {Array} routes - Array of route objects
 */
function displayKMLRoutesOnLeaflet(routes) {
    console.log('🍃 Displaying KML routes on Leaflet');
    
    const group = L.featureGroup();
    
    routes.forEach((route, index) => {
        if (route.stops && route.stops.length > 0) {
            // Create path for polyline
            const latlngs = route.stops.map(stop => [stop.latitude, stop.longitude]);
            
            // Create polyline
            const polyline = L.polyline(latlngs, {
                color: route.color || '#3b82f6',
                weight: 4,
                opacity: 0.8
            });
            
            group.addLayer(polyline);
            
            // Add markers for stops
            route.stops.forEach((stop, stopIndex) => {
                const marker = L.marker([stop.latitude, stop.longitude], {
                    icon: L.divIcon({
                        className: 'kml-stop-marker',
                        html: `
                            <div style="
                                background-color: ${route.color || '#3b82f6'};
                                color: white;
                                border-radius: 50%;
                                width: 24px;
                                height: 24px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-weight: bold;
                                font-size: 12px;
                                border: 2px solid white;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            ">
                                ${stopIndex + 1}
                            </div>
                        `,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                });
                
                // Add popup
                marker.bindPopup(`
                    <div style="min-width: 150px;">
                        <h4 style="margin: 0 0 8px 0; color: ${route.color || '#3b82f6'};">
                            🚏 ${stop.name}
                        </h4>
                        <p style="margin: 2px 0; font-size: 12px;">
                            <strong>Route:</strong> ${route.name}
                        </p>
                        <p style="margin: 2px 0; font-size: 12px;">
                            <strong>Coordinates:</strong> ${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}
                        </p>
                        ${stop.altitude ? `<p style="margin: 2px 0; font-size: 12px;"><strong>Altitude:</strong> ${stop.altitude}m</p>` : ''}
                        ${route.description ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">${route.description}</p>` : ''}
                    </div>
                `);
                
                group.addLayer(marker);
            });
        }
    });
    
    // Add to map and fit bounds
    kmlLayer = group;
    group.addTo(adminMap);
    adminMap.fitBounds(group.getBounds(), { padding: [20, 20] });
}

/**
 * Clear KML layer from map
 */
function clearKMLLayer() {
    console.log('🧹 Clearing KML layer from map');
    
    if (googleMapsLoaded && adminMap) {
        // Clear Google Maps markers and polylines
        if (window.kmlMarkers) {
            window.kmlMarkers.forEach(marker => marker.setMap(null));
            window.kmlMarkers = [];
        }
        if (window.kmlPolylines) {
            window.kmlPolylines.forEach(polyline => polyline.setMap(null));
            window.kmlPolylines = [];
        }
    } else if (kmlLayer && adminMap) {
        // Clear Leaflet layer
        adminMap.removeLayer(kmlLayer);
    }
    
    kmlLayer = null;
    routeKmlData = [];
    currentKmlFile = null;
    
    // Clear the UI display as well
    updateKMLRoutesDisplay([]);
    
    showNotification('KML data cleared successfully', 'info');
}

/**
 * Display KML routes on the route creation map for reference
 * @param {Array} routes - Array of KML route objects
 */
function displayKMLRoutesOnRouteCreationMap(routes) {
    if (!routeCreationMap || !routes || routes.length === 0) {
        console.warn('Cannot display KML routes: map not initialized or no routes available');
        return;
    }
    
    console.log('🗺️ Displaying', routes.length, 'KML routes on route creation map');
    
    routes.forEach((route, index) => {
        if (route.stops && route.stops.length > 0) {
            const routeColor = route.color || '#ff6b6b'; // Use red color to distinguish from new route being created
            
            if (googleMapsLoaded && routeCreationMap instanceof google.maps.Map) {
                // Google Maps implementation
                const path = route.stops.map(stop => ({
                    lat: stop.latitude,
                    lng: stop.longitude
                }));
                
                // Create polyline for KML route
                const polyline = new google.maps.Polyline({
                    path: path,
                    geodesic: true,
                    strokeColor: routeColor,
                    strokeOpacity: 0.6,
                    strokeWeight: 3,
                    map: routeCreationMap
                });
                
                // Store reference for cleanup
                if (!window.kmlRouteCreationPolylines) window.kmlRouteCreationPolylines = [];
                window.kmlRouteCreationPolylines.push(polyline);
                
                // Add markers for KML route stops
                route.stops.forEach((stop, stopIndex) => {
                    const marker = new google.maps.Marker({
                        position: { lat: stop.latitude, lng: stop.longitude },
                        map: routeCreationMap,
                        title: `KML Route: ${route.name} - ${stop.name}`,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: routeColor,
                            fillOpacity: 0.7,
                            strokeColor: '#ffffff',
                            strokeWeight: 1
                        }
                    });
                    
                    // Add info window
                    const infoWindow = new google.maps.InfoWindow({
                        content: `
                            <div style="padding: 8px; max-width: 200px;">
                                <h4 style="margin: 0 0 8px 0; color: ${routeColor};">
                                    📋 KML Reference: ${stop.name}
                                </h4>
                                <p style="margin: 2px 0; font-size: 12px;">
                                    <strong>Route:</strong> ${route.name}
                                </p>
                                <p style="margin: 2px 0; font-size: 12px;">
                                    <strong>Coordinates:</strong> ${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">
                                    📍 This is a reference from your uploaded KML file
                                </p>
                            </div>
                        `
                    });
                    
                    marker.addListener('click', () => {
                        infoWindow.open(routeCreationMap, marker);
                    });
                    
                    // Store reference for cleanup
                    if (!window.kmlRouteCreationMarkers) window.kmlRouteCreationMarkers = [];
                    window.kmlRouteCreationMarkers.push(marker);
                });
                
            } else if (routeCreationMap) {
                // Leaflet implementation
                const latlngs = route.stops.map(stop => [stop.latitude, stop.longitude]);
                
                // Create polyline for KML route
                const polyline = L.polyline(latlngs, {
                    color: routeColor,
                    weight: 3,
                    opacity: 0.6,
                    dashArray: '5, 5' // Dashed line to distinguish from new route
                });
                
                polyline.addTo(routeCreationMap);
                
                // Store reference for cleanup
                if (!window.kmlRouteCreationLayers) window.kmlRouteCreationLayers = [];
                window.kmlRouteCreationLayers.push(polyline);
                
                // Add markers for KML route stops
                route.stops.forEach((stop, stopIndex) => {
                    const marker = L.marker([stop.latitude, stop.longitude], {
                        icon: L.divIcon({
                            className: 'kml-reference-marker',
                            html: `
                                <div style="
                                    background-color: ${routeColor};
                                    color: white;
                                    border-radius: 50%;
                                    width: 20px;
                                    height: 20px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: bold;
                                    font-size: 10px;
                                    border: 2px solid white;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                    opacity: 0.8;
                                ">
                                    K
                                </div>
                            `,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    });
                    
                    // Add popup
                    marker.bindPopup(`
                        <div style="min-width: 150px;">
                            <h4 style="margin: 0 0 8px 0; color: ${routeColor};">
                                📋 KML Reference: ${stop.name}
                            </h4>
                            <p style="margin: 2px 0; font-size: 12px;">
                                <strong>Route:</strong> ${route.name}
                            </p>
                            <p style="margin: 2px 0; font-size: 12px;">
                                <strong>Coordinates:</strong> ${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}
                            </p>
                            <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">
                                📍 This is a reference from your uploaded KML file
                            </p>
                        </div>
                    `);
                    
                    marker.addTo(routeCreationMap);
                    
                    // Store reference for cleanup
                    if (!window.kmlRouteCreationLayers) window.kmlRouteCreationLayers = [];
                    window.kmlRouteCreationLayers.push(marker);
                });
            }
        }
    });
    
    console.log('✅ KML routes displayed on route creation map');
}

/**
 * Clear KML routes from route creation map
 */
function clearKMLRoutesFromRouteCreationMap() {
    console.log('🧹 Clearing KML routes from route creation map');
    
    if (googleMapsLoaded && window.kmlRouteCreationMarkers) {
        // Clear Google Maps markers and polylines
        window.kmlRouteCreationMarkers.forEach(marker => marker.setMap(null));
        window.kmlRouteCreationMarkers = [];
        
        if (window.kmlRouteCreationPolylines) {
            window.kmlRouteCreationPolylines.forEach(polyline => polyline.setMap(null));
            window.kmlRouteCreationPolylines = [];
        }
    } else if (window.kmlRouteCreationLayers) {
        // Clear Leaflet layers
        window.kmlRouteCreationLayers.forEach(layer => {
            if (routeCreationMap && routeCreationMap.hasLayer(layer)) {
                routeCreationMap.removeLayer(layer);
            }
        });
        window.kmlRouteCreationLayers = [];
    }
}

/**
 * Load KML file within the route creation modal
 * @param {File} file - The KML file to load
 */
function loadKMLFileInModal(file) {
    console.log('📄 Loading KML file in modal:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const kmlContent = e.target.result;
            parseKMLForModal(kmlContent, file.name);
        } catch (error) {
            console.error('Error reading KML file:', error);
            showNotification('Failed to read KML file', 'error');
        }
    };
    reader.readAsText(file);
}

/**
 * Parse KML content for display in the modal
 * @param {string} kmlContent - The KML file content
 * @param {string} fileName - Name of the KML file
 */
function parseKMLForModal(kmlContent, fileName) {
    console.log('🔍 Parsing KML content for modal...');
    
    try {
        // Parse KML using DOMParser
        const parser = new DOMParser();
        const kmlDoc = parser.parseFromString(kmlContent, 'application/xml');
        
        if (kmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Invalid KML format');
        }
        
        // Extract placemarks (routes, stops, etc.)
        const placemarks = kmlDoc.getElementsByTagName('Placemark');
        const modalKmlRoutes = [];
        
        console.log(`📍 Found ${placemarks.length} placemarks in KML`);
        
        for (let i = 0; i < placemarks.length; i++) {
            const placemark = placemarks[i];
            const routeData = extractRouteFromPlacemark(placemark);
            
            if (routeData) {
                modalKmlRoutes.push(routeData);
            }
        }
        
        if (modalKmlRoutes.length > 0) {
            displayKMLInModal(modalKmlRoutes, fileName);
            
            // If route creation map is already initialized, display the routes
            if (routeCreationMap) {
                displayKMLRoutesOnRouteCreationMap(modalKmlRoutes);
            }
            
            // Store for later use when map is initialized
            window.modalKmlData = modalKmlRoutes;
            
            showNotification(`Successfully loaded ${modalKmlRoutes.length} routes from ${fileName}`, 'success');
        } else {
            showNotification('No valid routes found in KML file', 'warning');
        }
        
    } catch (error) {
        console.error('Error parsing KML:', error);
        showNotification('Failed to parse KML file: ' + error.message, 'error');
    }
}

/**
 * Display KML routes information in the modal
 * @param {Array} routes - Array of KML routes
 * @param {string} fileName - Name of the KML file
 */
function displayKMLInModal(routes, fileName) {
    const kmlUploadArea = document.getElementById('kmlUploadArea');
    const modalKmlDisplay = document.getElementById('modalKmlDisplay');
    const clearKmlBtn = document.getElementById('clearKmlBtn');
    
    if (!modalKmlDisplay) {
        console.error('Modal KML display area not found');
        return;
    }
    
    // Hide upload area and show display area
    if (kmlUploadArea) kmlUploadArea.classList.add('hidden');
    modalKmlDisplay.classList.remove('hidden');
    if (clearKmlBtn) clearKmlBtn.classList.remove('hidden');
    
    modalKmlDisplay.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-green-800">
                    <i class="fas fa-check-circle mr-2"></i> KML File Loaded Successfully
                </h4>
                <button onclick="clearKMLDataFromModal()" class="text-green-600 hover:text-green-800">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="text-sm text-green-700 mb-3">
                <p><strong>File:</strong> ${fileName}</p>
                <p><strong>Routes Found:</strong> ${routes.length}</p>
            </div>
            
            <div class="space-y-2 max-h-32 overflow-y-auto">
                ${routes.map((route, index) => `
                    <div class="bg-white border border-green-200 rounded p-2">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-sm" style="color: ${route.color || '#ef4444'};">
                                🚍 ${route.name}
                            </span>
                            <span class="text-xs bg-green-100 px-2 py-1 rounded">
                                ${route.stops ? route.stops.length : 0} stops
                            </span>
                        </div>
                        ${route.description ? `
                            <p class="text-xs text-gray-600 mt-1">${route.description}</p>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <p class="text-xs text-blue-700">
                    <i class="fas fa-info-circle mr-1"></i>
                    <strong>Reference Mode:</strong> KML routes are displayed on the map as reference (red/pink lines). 
                    You can still create your own route normally by clicking on the map.
                </p>
            </div>
        </div>
    `;
}

/**
 * Clear KML data from the modal
 */
function clearKMLDataFromModal() {
    console.log('🧹 Clearing KML data from modal');
    
    const kmlUploadArea = document.getElementById('kmlUploadArea');
    const modalKmlDisplay = document.getElementById('modalKmlDisplay');
    const clearKmlBtn = document.getElementById('clearKmlBtn');
    const modalKmlUpload = document.getElementById('modalKmlFileUpload');
    
    // Reset file input
    if (modalKmlUpload) {
        modalKmlUpload.value = '';
    }
    
    // Show upload area and hide display area
    if (kmlUploadArea) kmlUploadArea.classList.remove('hidden');
    if (modalKmlDisplay) modalKmlDisplay.classList.add('hidden');
    if (clearKmlBtn) clearKmlBtn.classList.add('hidden');
    
    // Clear KML routes from map
    if (routeCreationMap) {
        clearKMLRoutesFromRouteCreationMap();
    }
    
    // Clear stored data
    window.modalKmlData = null;
    
    showNotification('KML data cleared from route creation', 'info');
}

/**
 * Generate KML content from route data
 * @param {Array} routes - Array of route objects
 * @param {string} title - Title for the KML document
 * @returns {string} KML content
 */
function generateKMLFromRoutes(routes, title = 'Punjab Transport Routes') {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
    <description>Bus routes exported from Punjab Transport Tracker</description>`;
    
    const kmlFooter = `
  </Document>
</kml>`;
    
    let kmlContent = kmlHeader;
    
    // Add styles
    kmlContent += `
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Style id="stopStyle">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>`;
    
    // Add placemarks for each route
    routes.forEach((route, index) => {
        if (route.stops && route.stops.length > 0) {
            // Add route line
            kmlContent += `
    <Placemark>
      <name>${route.name || `Route ${index + 1}`}</name>
      <description>${route.description || 'Bus route'}</description>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <coordinates>`;
            
            // Add coordinates
            route.stops.forEach(stop => {
                kmlContent += `
          ${stop.longitude},${stop.latitude},${stop.altitude || 0}`;
            });
            
            kmlContent += `
        </coordinates>
      </LineString>
    </Placemark>`;
            
            // Add stop markers
            route.stops.forEach((stop, stopIndex) => {
                kmlContent += `
    <Placemark>
      <name>${stop.name || `Stop ${stopIndex + 1}`}</name>
      <description>Bus stop on route: ${route.name}</description>
      <styleUrl>#stopStyle</styleUrl>
      <Point>
        <coordinates>${stop.longitude},${stop.latitude},${stop.altitude || 0}</coordinates>
      </Point>
    </Placemark>`;
            });
        }
    });
    
    kmlContent += kmlFooter;
    return kmlContent;
}

/**
 * Export current KML routes to file
 */
function exportCurrentKMLRoutes() {
    if (routeKmlData.length === 0) {
        showNotification('No KML routes to export', 'warning');
        return;
    }
    
    const kmlContent = generateKMLFromRoutes(routeKmlData, 'Exported Punjab Transport Routes');
    downloadKMLFile(kmlContent, 'punjab_transport_routes.kml');
    showNotification('KML routes exported successfully', 'success');
}

/**
 * Export single KML route
 * @param {number} routeIndex - Index of route to export
 */
function exportSingleKMLRoute(routeIndex) {
    if (!routeKmlData[routeIndex]) {
        showNotification('Route not found', 'error');
        return;
    }
    
    const route = routeKmlData[routeIndex];
    const kmlContent = generateKMLFromRoutes([route], route.name);
    const fileName = `${route.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.kml`;
    
    downloadKMLFile(kmlContent, fileName);
    showNotification(`Route "${route.name}" exported successfully`, 'success');
}

/**
 * Download KML content as file
 * @param {string} kmlContent - KML content to download
 * @param {string} fileName - Name for the downloaded file
 */
function downloadKMLFile(kmlContent, fileName) {
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Focus map on specific KML route
 * @param {number} routeIndex - Index of route to focus on
 */
function focusOnKMLRoute(routeIndex) {
    const route = routeKmlData[routeIndex];
    if (!route || !route.stops || route.stops.length === 0) {
        showNotification('Route not found or has no stops', 'error');
        return;
    }
    
    if (googleMapsLoaded && adminMap) {
        // Google Maps version
        const bounds = new google.maps.LatLngBounds();
        route.stops.forEach(stop => {
            bounds.extend({ lat: stop.latitude, lng: stop.longitude });
        });
        adminMap.fitBounds(bounds);
    } else if (adminMap) {
        // Leaflet version
        const bounds = L.latLngBounds(route.stops.map(stop => [stop.latitude, stop.longitude]));
        adminMap.fitBounds(bounds, { padding: [20, 20] });
    }
    
    showNotification(`Focused on route: ${route.name}`, 'info');
}

/**
 * Update KML routes display in the UI
 * @param {Array} routes - Array of KML routes to display
 * @param {string} fileName - Name of the KML file (optional)
 */
function updateKMLRoutesDisplay(routes, fileName = null) {
    const kmlDisplay = document.getElementById('kmlRoutesContainer');
    if (!kmlDisplay) {
        console.warn('KML routes display element not found');
        return;
    }
    
    if (routes.length === 0) {
        kmlDisplay.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-upload text-3xl mb-2"></i>
                <p>No KML routes loaded</p>
                <p class="text-sm">Upload a KML file to get started</p>
            </div>
        `;
        return;
    }
    
    kmlDisplay.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-green-800 mb-2">
                <i class="fas fa-check-circle mr-2"></i> KML File Loaded Successfully
            </h4>
            ${fileName ? `
                <p class="text-green-700 text-sm mb-2">
                    <strong>File:</strong> ${fileName}
                </p>
            ` : ''}
            <p class="text-green-700 text-sm mb-3">
                <strong>Routes Found:</strong> ${routes.length}
            </p>
            <div class="flex flex-wrap gap-2">
                <button onclick="exportCurrentKMLRoutes()" 
                        class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                    💾 Export Routes
                </button>
                <button onclick="convertKMLToSystemRoutes()" 
                        class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                    ⚡ Import to Firebase
                </button>
                <button onclick="clearKMLLayer()" 
                        class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                    🗑️ Clear KML
                </button>
            </div>
        </div>
        
        <div class="space-y-2">
            ${routes.map((route, index) => `
                <div class="bg-white border rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                        <h5 class="font-semibold" style="color: ${route.color || '#3b82f6'};">
                            🚍 ${route.name}
                        </h5>
                        <span class="text-xs bg-gray-100 px-2 py-1 rounded">
                            ${route.stops ? route.stops.length : 0} stops
                        </span>
                    </div>
                    ${route.description ? `
                        <p class="text-sm text-gray-600 mb-2">${route.description}</p>
                    ` : ''}
                    <div class="flex flex-wrap gap-1">
                        <button onclick="focusOnKMLRoute(${index})" 
                                class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                            🎯 Focus
                        </button>
                        <button onclick="editKMLRoute(${index})" 
                                class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200">
                            ✏️ Edit
                        </button>
                        <button onclick="exportSingleKMLRoute(${index})" 
                                class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
                            📤 Export
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Convert KML routes to system routes and save to Firebase
 */
function convertKMLToSystemRoutes() {
    if (routeKmlData.length === 0) {
        showNotification('No KML routes to convert', 'warning');
        return;
    }
    
    if (!database) {
        showNotification('Database not connected. Please check your internet connection.', 'error');
        return;
    }
    
    showNotification('Converting KML routes to system routes...', 'info');
    
    let convertedCount = 0;
    const conversionPromises = [];
    
    routeKmlData.forEach(kmlRoute => {
        if (kmlRoute.stops && kmlRoute.stops.length > 0) {
            // Create system route object with proper structure for Firebase
            const systemRoute = {
                id: 'kml_import_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                routeNumber: `KML-${String(convertedCount + 1).padStart(3, '0')}`,
                routeName: kmlRoute.name || 'Imported KML Route',
                city: 'KML_Imported', // Default city - admin can change later
                routeType: 'city_bus',
                description: kmlRoute.description || 'Route imported from KML file',
                firstBusTime: '06:00',
                lastBusTime: '22:00',
                frequency: 30, // Default 30 minutes
                stops: kmlRoute.stops.map(stop => ({
                    id: stop.id || `stop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: stop.name || 'Imported Stop',
                    latitude: stop.latitude,
                    longitude: stop.longitude,
                    stopTime: stop.stopTime || 2
                })),
                status: 'active',
                createdAt: new Date().toISOString(),
                createdBy: 'admin_kml_import',
                importedAt: new Date().toISOString(),
                source: 'kml_import',
                kmlFileName: currentKmlFile || 'unknown.kml'
            };
            
            // Create promise for Firebase save
            const savePromise = database.ref(`routes/${systemRoute.city}/${systemRoute.id}`).set(systemRoute)
                .then(() => {
                    // Add to local routes for immediate display
                    allRoutes[systemRoute.id] = systemRoute;
                    convertedCount++;
                    console.log('KML route saved to Firebase:', systemRoute.id);
                })
                .catch(error => {
                    console.error('Error saving KML route to Firebase:', error);
                    throw error;
                });
            
            conversionPromises.push(savePromise);
        }
    });
    
    // Wait for all routes to be saved to Firebase
    Promise.all(conversionPromises)
        .then(() => {
            if (convertedCount > 0) {
                showNotification(`Successfully imported ${convertedCount} KML routes to Firebase database!`, 'success');
                // Refresh routes list to show the new routes
                loadAllRoutes();
                
                // Clear the KML data since it's now imported
                routeKmlData = [];
                clearKMLLayer();
                
                // Update the KML display
                updateKMLRoutesDisplay([]);
            } else {
                showNotification('No valid routes found to import', 'warning');
            }
        })
        .catch(error => {
            console.error('Error importing KML routes to Firebase:', error);
            showNotification('Failed to import some routes to database. Please try again.', 'error');
        });
}

/**
 * Export system routes to KML format
 */
function exportSystemRoutesToKML() {
    // Get current system routes
    const systemRoutes = Object.values(allRoutes);
    
    if (systemRoutes.length === 0) {
        showNotification('No system routes to export', 'warning');
        return;
    }
    
    // Convert to KML format
    const kmlRoutes = systemRoutes.map(route => ({
        id: route.id,
        name: route.name || 'Unnamed Route',
        description: route.description || `System route: ${route.name}`,
        color: route.color || '#3b82f6',
        stops: route.stops ? route.stops.map(stop => ({
            id: stop.id,
            name: stop.name,
            latitude: stop.lat,
            longitude: stop.lng,
            altitude: 0,
            stopTime: stop.stopTime || 2
        })) : [],
        source: 'system_export'
    }));
    
    const kmlContent = generateKMLFromRoutes(kmlRoutes, 'Punjab Transport System Routes');
    downloadKMLFile(kmlContent, 'punjab_transport_system_routes.kml');
    
    showNotification(`Exported ${systemRoutes.length} system routes to KML`, 'success');
}

/**
 * Show KML help modal
 */
function showKMLHelp() {
    const helpContent = `
        <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold text-blue-800 mb-2">🌍 Google Earth KML Integration</h4>
                <p class="text-blue-700 text-sm">
                    Import and export bus routes using Google Earth's KML format for advanced route planning and visualization.
                </p>
            </div>
            
            <div class="space-y-3">
                <div>
                    <h5 class="font-semibold text-gray-800">📥 Importing KML Files</h5>
                    <ul class="text-sm text-gray-600 mt-1 space-y-1">
                        <li>• Create routes in Google Earth Pro</li>
                        <li>• Save as KML file (.kml or .kmz)</li>
                        <li>• Upload using the file picker above</li>
                        <li>• Review and import routes to system</li>
                    </ul>
                </div>
                
                <div>
                    <h5 class="font-semibold text-gray-800">📤 Exporting to KML</h5>
                    <ul class="text-sm text-gray-600 mt-1 space-y-1">
                        <li>• Export current system routes</li>
                        <li>• Open in Google Earth for 3D visualization</li>
                        <li>• Share with stakeholders and planners</li>
                        <li>• Use for satellite imagery route planning</li>
                    </ul>
                </div>
                
                <div>
                    <h5 class="font-semibold text-gray-800">✨ Benefits</h5>
                    <ul class="text-sm text-gray-600 mt-1 space-y-1">
                        <li>• Visual route planning with satellite imagery</li>
                        <li>• 3D terrain visualization</li>
                        <li>• Integration with Google Earth's measuring tools</li>
                        <li>• Easy sharing and collaboration</li>
                        <li>• Professional route documentation</li>
                    </ul>
                </div>
                
                <div class="bg-amber-50 p-3 rounded">
                    <h5 class="font-semibold text-amber-800">⚠️ Tips</h5>
                    <ul class="text-sm text-amber-700 mt-1 space-y-1">
                        <li>• Use LineString for route paths</li>
                        <li>• Add Point markers for bus stops</li>
                        <li>• Include descriptive names and details</li>
                        <li>• Test routes before importing to system</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    showModal('Google Earth KML Help', helpContent);
}

/**
 * Edit KML route (placeholder for future implementation)
 * @param {number} routeIndex - Index of route to edit
 */
function editKMLRoute(routeIndex) {
    const route = routeKmlData[routeIndex];
    if (!route) {
        showNotification('Route not found', 'error');
        return;
    }
    
    // For now, just show route details
    const routeDetails = `
        <div class="space-y-3">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Route Name</label>
                    <input type="text" value="${route.name}" class="w-full p-2 border rounded" readonly>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Number of Stops</label>
                    <input type="text" value="${route.stops ? route.stops.length : 0}" class="w-full p-2 border rounded" readonly>
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Description</label>
                <textarea class="w-full p-2 border rounded" rows="3" readonly>${route.description || 'No description'}</textarea>
            </div>
            <div class="bg-blue-50 p-3 rounded">
                <p class="text-blue-700 text-sm">
                    🚧 Route editing will be available in a future update. For now, you can export this route to KML, 
                    edit it in Google Earth, and re-import it.
                </p>
            </div>
        </div>
    `;
    
    showModal(`Edit Route: ${route.name}`, routeDetails);
}

/**
 * Show generic modal
 * @param {string} title - Modal title
 * @param {string} content - Modal content HTML
 */
function showModal(title, content) {
    // Remove existing modal if any
    const existingModal = document.getElementById('genericModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'genericModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h3 class="text-xl font-semibold">${title}</h3>
                <button onclick="document.getElementById('genericModal').remove()" 
                        class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="p-4">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Update KML status display
 * @param {string} message - Status message
 * @param {string} type - Status type (success, error, info)
 */
function updateKMLStatus(message, type = 'info') {
    const statusElement = document.getElementById('kmlStatus');
    if (!statusElement) return;
    
    const colors = {
        success: 'text-green-600',
        error: 'text-red-600',
        warning: 'text-yellow-600',
        info: 'text-gray-500'
    };
    
    statusElement.className = `text-xs text-center ${colors[type] || colors.info}`;
    statusElement.textContent = message;
}

function showAdminLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');

    initializeAdminMap();
    initializeCharts();
    loadAllBusData();
    loadAllRoutes(); // Load routes when dashboard loads
}

function initializeAdminMap() {
    console.log('Initializing Admin Map');
    
    // Use config from config.js
    const config = window.PTTConfig || window.appConfig || {
        app: {
            map: {
                defaultCenter: { lat: 31.1471, lng: 75.3412 },
                defaultZoom: 8,
                provider: 'leaflet', // fallback
                google: { apiKey: '' },
                tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors'
            }
        }
    };
    
    const mapContainer = document.getElementById('adminMap');
    if (!mapContainer) {
        console.error('Admin map container not found');
        return;
    }
    
    // Check provider preference and availability
    const preferredProvider = config.app.map.provider || 'google';
    
    // Try Google Maps first if preferred and available
    if (preferredProvider === 'google' && googleMapsLoaded) {
        console.log('Using Google Maps as primary provider');
        initializeGoogleAdminMap(config);
        return;
    }
    
    // Check if MapmyIndia SDK is loaded AND API key is configured
    const hasMapplsApiKey = config.app.map.mappls && 
                           config.app.map.mappls.restApiKey && 
                           config.app.map.mappls.restApiKey.trim() !== '';
    
    if (typeof mappls !== 'undefined' && hasMapplsApiKey) {
        console.log('Using MapmyIndia as secondary provider');
        initializeMapplsAdminMap(config);
        return;
    }
    
    // Default to Leaflet as fallback
    console.log('Using Leaflet as fallback provider');
    initializeLeafletAdminMap(config);
}

// MapmyIndia admin map initialization
function initializeMapplsAdminMap(config) {
    try {
        console.log('Initializing MapmyIndia admin map with API key');
        
        adminMap = new mappls.Map('adminMap', {
            center: [config.app.map.defaultCenter.lat, config.app.map.defaultCenter.lng],
            zoom: config.app.map.defaultZoom,
            maxZoom: 18,
            minZoom: 6,
            zoomControl: true,
            location: true,
            clickableIcons: true,
            backgroundColor: '#f8f9fa',
            language: 'en',
            region: 'ind'
        });
        
        // Add search control for admin map
        const adminSearchControl = new mappls.search({
            map: adminMap,
            location: [config.app.map.defaultCenter.lat, config.app.map.defaultCenter.lng],
            region: 'ind',
            height: 300,
            placeholder: 'Search for locations in Punjab...',
            geolocation: true
        });
        
        // Add click event for route creation
        adminMap.on('click', function(e) {
            const latlng = e.latlng;
            console.log('MapmyIndia admin map clicked at:', latlng.lat, latlng.lng);
            
            // If in route creation mode, add the coordinate
            if (window.adminRouteCreationMode) {
                addRouteStopMarker(latlng.lat, latlng.lng);
            }
        });
        
        console.log('MapmyIndia admin map initialized successfully');
        
    } catch (error) {
        console.error('Error initializing MapmyIndia map:', error);
        initializeLeafletAdminMap(config);
    }
}

// Separate function for Leaflet initialization
function initializeLeafletAdminMap(config) {
    try {
        adminMap = L.map('adminMap').setView(
            [config.app.map.defaultCenter.lat, config.app.map.defaultCenter.lng], 
            config.app.map.defaultZoom
        );
        
        // Use the tileLayer from config (which is now set to OpenStreetMap by default)
        L.tileLayer(config.app.map.tileLayer, { 
            attribution: config.app.map.attribution,
            maxZoom: config.app.map.maxZoom || 18,
            minZoom: config.app.map.minZoom || 6
        }).addTo(adminMap);
        
        // Add click event for route creation with Leaflet
        adminMap.on('click', function(e) {
            const latlng = e.latlng;
            console.log('Admin map clicked at:', latlng.lat, latlng.lng);
            
            if (window.adminRouteCreationMode) {
                addRouteStopMarker(latlng.lat, latlng.lng);
            }
        });
        
        console.log('Leaflet admin map initialized successfully');
        
    } catch (error) {
        console.error('Error initializing Leaflet map:', error);
        showNotification('Map initialization failed. Please refresh the page.', 'error');
    }
}

function initializeCharts() {
    // Activity Chart
    const activityCtx = document.getElementById('activityChart').getContext('2d');
    activityChart = new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Active Buses',
                data: [], // Populate with real data
                borderColor: '#3b82f6',
                tension: 0.1
            }]
        }
    });

    // Route Usage Chart
    const routeCtx = document.getElementById('routeChart').getContext('2d');
    routeChart = new Chart(routeCtx, {
        type: 'doughnut',
        data: {
            labels: [], // Populate with route names
            datasets: [{
                label: 'Route Usage',
                data: [], // Populate with bus counts per route
                backgroundColor: ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b']
            }]
        }
    });
}

function loadAllBusData() {
    if (!database) {
        console.error('Database not initialized');
        return;
    }
    
    const busesRef = database.ref('live_buses');
    busesRef.on('value', snapshot => {
        allBuses = snapshot.val() || {};
        updateDashboard();
    }, error => {
        console.error('Error loading bus data:', error);
    });
}

function updateDashboard() {
    let activeBusCount = 0;
    let activeDriverCount = 0;
    const routeUsage = {};

    const activeBusesList = document.getElementById('activeBusesList');
    activeBusesList.innerHTML = '';
    
    for (const routeId in allBuses) {
        const routeBuses = allBuses[routeId];
        routeUsage[routeId] = 0;

        for (const driverId in routeBuses) {
            const bus = routeBuses[driverId];
            if (bus.isActive && (Date.now() - bus.timestamp < PTTConfig.app.tracking.staleDataThreshold)) {
                activeBusCount++;
                routeUsage[routeId]++;
                updateBusOnMap(driverId, bus);
                addBusToList(bus);
            } else {
                removeBusFromMap(driverId);
            }
        }
    }
    
    // In this demo, active drivers = active buses
    activeDriverCount = activeBusCount;

    // Update Stat Cards
    document.getElementById('activeBusCount').textContent = activeBusCount;
    document.getElementById('activeDriverCount').textContent = activeDriverCount;
    // Calculate total routes from loaded routes
    const totalRoutes = Object.keys(allRoutes).length || Object.values(PTTConfig.data.routes).flat().length;
    document.getElementById('totalRouteCount').textContent = totalRoutes;

    // Update Route Chart
    routeChart.data.labels = Object.keys(routeUsage);
    routeChart.data.datasets[0].data = Object.values(routeUsage);
    routeChart.update();
}

function updateBusOnMap(driverId, bus) {
    const latLng = [bus.latitude, bus.longitude];
    const busIcon = L.divIcon({ className: 'bus-marker-admin', html: 'B', iconSize: [25, 25] });

    if (busMarkers[driverId]) {
        busMarkers[driverId].setLatLng(latLng);
    } else {
        busMarkers[driverId] = L.marker(latLng, { icon: busIcon }).addTo(adminMap);
    }
    busMarkers[driverId].bindPopup(`<b>Bus:</b> ${bus.busNumber}<br><b>Driver:</b> ${bus.driverId}<br><b>Speed:</b> ${bus.speed} km/h`);
}

function removeBusFromMap(driverId) {
    if (busMarkers[driverId]) {
        adminMap.removeLayer(busMarkers[driverId]);
        delete busMarkers[driverId];
    }
}

function addBusToList(bus) {
    const list = document.getElementById('activeBusesList');
    const item = document.createElement('div');
    
    // Determine city based on route or default to 'unknown'
    let busCity = 'unknown';
    if (bus.routeId) {
        // Try to find the city by checking which city contains this route
        for (const [cityId, routes] of Object.entries(PTTConfig?.data?.routes || {})) {
            if (Array.isArray(routes) && routes.some(route => route.id === bus.routeId)) {
                busCity = cityId;
                break;
            }
        }
    }
    
    // Get city display name
    const cityDisplayName = PTTConfig?.data?.cities?.[busCity]?.name || busCity;
    
    item.className = 'bus-item p-3 border-b hover:bg-gray-50 transition-all duration-200';
    item.dataset.city = busCity; // Add city data attribute for filtering
    item.dataset.busId = bus.busNumber;
    
    // Determine status color and icon
    const statusIcon = bus.isActive ? 
        '<i class="fas fa-circle text-green-500 text-xs"></i>' : 
        '<i class="fas fa-circle text-red-500 text-xs"></i>';
    
    const lastUpdateTime = bus.timestamp ? 
        new Date(bus.timestamp).toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : 'Unknown';
    
    item.innerHTML = `
        <div class="flex items-center justify-between mb-1">
            <div class="flex items-center space-x-2">
                <p class="font-semibold text-gray-800">
                    <i class="fas fa-bus text-blue-600 mr-1"></i>
                    ${bus.busNumber}
                </p>
                ${statusIcon}
            </div>
            <div class="flex items-center space-x-2">
                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    ${cityDisplayName}
                </span>
                <span class="text-sm font-medium text-green-600">
                    ${bus.speed || 0} km/h
                </span>
            </div>
        </div>
        <div class="flex items-center justify-between text-sm text-gray-600">
            <span>
                <i class="fas fa-user-tie text-gray-400 mr-1"></i>
                Driver: ${bus.driverId || 'Unknown'}
            </span>
            <span class="text-xs text-gray-500">
                <i class="fas fa-clock text-gray-400 mr-1"></i>
                ${lastUpdateTime}
            </span>
        </div>
        ${bus.routeId ? `
            <div class="mt-2 text-xs text-gray-500">
                <i class="fas fa-route text-gray-400 mr-1"></i>
                Route: ${bus.routeId}
            </div>
        ` : ''}
    `;
    
    // Add click handler for bus details
    item.addEventListener('click', () => {
        showBusDetails(bus, busCity);
    });
    
    // Add hover effect
    item.addEventListener('mouseenter', () => {
        item.classList.add('bg-blue-50', 'shadow-sm');
        // Highlight bus on map if marker exists
        if (busMarkers[bus.driverId]) {
            highlightBusOnMap(bus.driverId);
        }
    });
    
    item.addEventListener('mouseleave', () => {
        item.classList.remove('bg-blue-50', 'shadow-sm');
        // Remove highlight from map
        if (busMarkers[bus.driverId]) {
            removeHighlightFromMap(bus.driverId);
        }
    });
    
    list.appendChild(item);
}

/**
 * Show detailed information about a bus
 * @param {Object} bus - Bus data object
 * @param {string} cityId - City identifier
 */
function showBusDetails(bus, cityId) {
    const cityName = PTTConfig?.data?.cities?.[cityId]?.name || cityId;
    
    const detailsContent = `
        <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold text-blue-800 mb-2">
                    <i class="fas fa-bus mr-2"></i>
                    Bus ${bus.busNumber}
                </h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span class="font-medium text-gray-700">Status:</span>
                        <span class="ml-2 ${bus.isActive ? 'text-green-600' : 'text-red-600'}">
                            ${bus.isActive ? '🟢 Active' : '🔴 Inactive'}
                        </span>
                    </div>
                    <div>
                        <span class="font-medium text-gray-700">Speed:</span>
                        <span class="ml-2 text-green-600 font-medium">${bus.speed || 0} km/h</span>
                    </div>
                    <div>
                        <span class="font-medium text-gray-700">City:</span>
                        <span class="ml-2 text-blue-600">${cityName}</span>
                    </div>
                    <div>
                        <span class="font-medium text-gray-700">Route:</span>
                        <span class="ml-2 text-purple-600">${bus.routeId || 'Not assigned'}</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
                <h5 class="font-semibold text-green-800 mb-2">
                    <i class="fas fa-user-tie mr-2"></i>
                    Driver Information
                </h5>
                <div class="text-sm text-green-700">
                    <p><span class="font-medium">Driver ID:</span> ${bus.driverId || 'Unknown'}</p>
                    <p><span class="font-medium">Last Update:</span> ${bus.timestamp ? new Date(bus.timestamp).toLocaleString('en-IN') : 'Unknown'}</p>
                </div>
            </div>
            
            <div class="bg-yellow-50 p-4 rounded-lg">
                <h5 class="font-semibold text-yellow-800 mb-2">
                    <i class="fas fa-map-marker-alt mr-2"></i>
                    Location Details
                </h5>
                <div class="text-sm text-yellow-700">
                    <p><span class="font-medium">Latitude:</span> ${bus.latitude?.toFixed(6) || 'Unknown'}</p>
                    <p><span class="font-medium">Longitude:</span> ${bus.longitude?.toFixed(6) || 'Unknown'}</p>
                </div>
                <div class="mt-3 flex gap-2">
                    <button onclick="focusOnBusOnMap('${bus.driverId}')" 
                            class="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                        📍 Focus on Map
                    </button>
                    <button onclick="trackBusRoute('${bus.routeId}')" 
                            class="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
                        🛣️ Show Route
                    </button>
                </div>
            </div>
        </div>
    `;
    
    showModal(`Bus Details - ${bus.busNumber}`, detailsContent);
}

/**
 * Highlight bus marker on map
 * @param {string} driverId - Driver/Bus identifier
 */
function highlightBusOnMap(driverId) {
    const marker = busMarkers[driverId];
    if (!marker) return;
    
    // Different highlighting for different map types
    if (marker.setIcon) {
        // Leaflet marker
        const highlightIcon = L.divIcon({ 
            className: 'bus-marker-admin bus-marker-highlight', 
            html: 'B', 
            iconSize: [30, 30] 
        });
        marker.setIcon(highlightIcon);
    }
}

/**
 * Remove highlight from bus marker on map
 * @param {string} driverId - Driver/Bus identifier
 */
function removeHighlightFromMap(driverId) {
    const marker = busMarkers[driverId];
    if (!marker) return;
    
    if (marker.setIcon) {
        // Leaflet marker - reset to normal icon
        const normalIcon = L.divIcon({ 
            className: 'bus-marker-admin', 
            html: 'B', 
            iconSize: [25, 25] 
        });
        marker.setIcon(normalIcon);
    }
}

/**
 * Focus map on specific bus
 * @param {string} driverId - Driver/Bus identifier
 */
function focusOnBusOnMap(driverId) {
    const marker = busMarkers[driverId];
    if (!marker) {
        showNotification('Bus not found on map', 'error');
        return;
    }
    
    // Focus on the bus location
    if (adminMap.setView) {
        // Leaflet
        const latlng = marker.getLatLng();
        adminMap.setView(latlng, 15);
    } else if (adminMap.setCenter) {
        // Google Maps
        const position = marker.getPosition();
        adminMap.setCenter(position);
        adminMap.setZoom(15);
    }
    
    // Open popup/info window
    if (marker.openPopup) {
        marker.openPopup();
    }
    
    // Close modal
    const modal = document.getElementById('genericModal');
    if (modal) modal.remove();
    
    showNotification('Focused on bus location', 'success');
}

/**
 * Track and display bus route
 * @param {string} routeId - Route identifier
 */
function trackBusRoute(routeId) {
    if (!routeId) {
        showNotification('No route assigned to this bus', 'warning');
        return;
    }
    
    // This function would display the full route on the map
    console.log(`Tracking route: ${routeId}`);
    showNotification(`Tracking route: ${routeId}`, 'info');
    
    // Close modal
    const modal = document.getElementById('genericModal');
    if (modal) modal.remove();
}

function showAllBuses() {
    if (Object.keys(busMarkers).length === 0) return;
    const bounds = L.latLngBounds(Object.values(busMarkers).map(m => m.getLatLng()));
    adminMap.fitBounds(bounds, { padding: [50, 50] });
}

function refreshData() {
    // The 'on' listener already provides real-time data, but this can force a re-render.
    updateDashboard();
    console.log('Dashboard data refreshed.');
}

function showAllBuses() {
    console.log('Showing all buses on map');
    if (Object.keys(busMarkers).length === 0) {
        alert('No active buses to display on map.');
        return;
    }
    const bounds = L.latLngBounds(Object.values(busMarkers).map(m => m.getLatLng()));
    adminMap.fitBounds(bounds, { padding: [50, 50] });
}

// Add missing filter functions
function filterByCity() {
    const cityFilter = document.getElementById('cityFilter').value;
    console.log('Filtering by city:', cityFilter);
    
    // Remove any existing active styling first
    const cityFilterElement = document.getElementById('cityFilter');
    if (cityFilterElement) {
        cityFilterElement.classList.remove('city-filter-active');
    }
    
    // Load city-specific map if a specific city is selected
    if (cityFilter !== 'all') {
        loadCitySpecificMap(cityFilter);
    } else {
        // Reset to default Punjab view
        resetToDefaultMapView();
    }
    
    // Filter the active buses list by city
    filterActiveBusesByCity(cityFilter);
    
    // Update dashboard with filtered data
    updateDashboard();
}

/**
 * Load city-specific map view with OSM tiles
 * @param {string} cityId - The city identifier
 */
function loadCitySpecificMap(cityId) {
    console.log(`🏙️ Loading map for city: ${cityId}`);
    
    // Get city configuration from PTTConfig
    const cityConfig = PTTConfig?.data?.cities?.[cityId];
    
    if (!cityConfig) {
        console.error(`City configuration not found for: ${cityId}`);
        showNotification(`City "${cityId}" not found in configuration`, 'error');
        return;
    }
    
    console.log(`📍 City coordinates:`, cityConfig.coordinates);
    
    // Update map view based on map type
    if (googleMapsLoaded && adminMap && adminMap.setCenter) {
        // Google Maps
        console.log('🗺️ Updating Google Maps view to city');
        adminMap.setCenter({
            lat: cityConfig.coordinates.lat,
            lng: cityConfig.coordinates.lng
        });
        adminMap.setZoom(cityConfig.zoom || 12);
        
        // Optionally switch to a more detailed map type for city view
        adminMap.setMapTypeId('roadmap'); // Switch to roadmap for better city details
        
    } else if (adminMap && adminMap.setView) {
        // Leaflet Map
        console.log('🗺️ Updating Leaflet map view to city');
        adminMap.setView(
            [cityConfig.coordinates.lat, cityConfig.coordinates.lng], 
            cityConfig.zoom || 12
        );
        
        // Optionally change tile layer for better city view
        updateLeafletTileLayerForCity(cityId);
    }
    
    // Update map title
    updateMapTitle(cityConfig.name);
    
    // Show notification
    showNotification(`Map updated to show ${cityConfig.name}`, 'success');
}

/**
 * Update Leaflet tile layer for better city visualization
 * @param {string} cityId - The city identifier
 */
function updateLeafletTileLayerForCity(cityId) {
    if (!adminMap || !adminMap.eachLayer) return;
    
    // Define city-specific tile layer configurations
    const cityTileConfigs = {
        chandigarh: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            options: { maxZoom: 18, className: 'city-tiles' }
        },
        ludhiana: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            options: { maxZoom: 18, className: 'city-tiles' }
        },
        amritsar: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            options: { maxZoom: 18, className: 'city-tiles' }
        },
        jalandhar: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            options: { maxZoom: 18, className: 'city-tiles' }
        },
        patiala: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            options: { maxZoom: 18, className: 'city-tiles' }
        },
        bathinda: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            options: { maxZoom: 18, className: 'city-tiles' }
        },
        mohali: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            options: { maxZoom: 18, className: 'city-tiles' }
        },
        pathankot: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            options: { maxZoom: 18, className: 'city-tiles' }
        }
    };
    
    const tileConfig = cityTileConfigs[cityId];
    if (!tileConfig) {
        console.log(`No specific tile configuration for ${cityId}, using default`);
        return;
    }
    
    // Remove existing tile layers
    adminMap.eachLayer(function(layer) {
        if (layer instanceof L.TileLayer) {
            adminMap.removeLayer(layer);
        }
    });
    
    // Add new tile layer for the city
    const newTileLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        ...tileConfig.options
    });
    
    newTileLayer.addTo(adminMap);
    
    console.log(`🌍 Tile layer updated for ${cityId}`);
}

/**
 * Reset map to default Punjab view
 */
function resetToDefaultMapView() {
    console.log('🏞️ Resetting map to default Punjab view');
    
    const defaultConfig = PTTConfig?.app?.map || {
        defaultCenter: { lat: 31.1471, lng: 75.3412 },
        defaultZoom: 8
    };
    
    if (googleMapsLoaded && adminMap && adminMap.setCenter) {
        // Google Maps
        adminMap.setCenter({
            lat: defaultConfig.defaultCenter.lat,
            lng: defaultConfig.defaultCenter.lng
        });
        adminMap.setZoom(defaultConfig.defaultZoom);
        adminMap.setMapTypeId('hybrid'); // Reset to hybrid view for state overview
        
    } else if (adminMap && adminMap.setView) {
        // Leaflet Map
        adminMap.setView(
            [defaultConfig.defaultCenter.lat, defaultConfig.defaultCenter.lng], 
            defaultConfig.defaultZoom
        );
        
        // Reset to default tile layer
        resetToDefaultTileLayer();
    }
    
    // Update map title
    updateMapTitle('Punjab State');
    
    showNotification('Map reset to Punjab state view', 'info');
}

/**
 * Reset Leaflet to default tile layer
 */
function resetToDefaultTileLayer() {
    if (!adminMap || !adminMap.eachLayer) return;
    
    // Remove existing tile layers
    adminMap.eachLayer(function(layer) {
        if (layer instanceof L.TileLayer) {
            adminMap.removeLayer(layer);
        }
    });
    
    // Add default OSM tile layer
    const defaultTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    });
    
    defaultTileLayer.addTo(adminMap);
    
    console.log('🌍 Reset to default tile layer');
}

/**
 * Update map title in the UI
 * @param {string} location - The location name to display
 */
function updateMapTitle(location) {
    const mapTitleElement = document.querySelector('#adminMap').closest('.bg-white').querySelector('h3');
    if (mapTitleElement) {
        mapTitleElement.innerHTML = `<i class="fas fa-map mr-2"></i> Live Bus Tracking - ${location}`;
    }
    
    // Update city filter visual feedback
    updateCityFilterVisual(location);
}

/**
 * Update visual feedback for city filter
 * @param {string} locationName - The selected location name
 */
function updateCityFilterVisual(locationName) {
    const cityFilter = document.getElementById('cityFilter');
    if (!cityFilter) return;
    
    // Add visual feedback to show active city (only for specific cities, not "All Cities")
    if (locationName === 'Punjab State' || locationName === 'All Cities') {
        cityFilter.classList.remove('city-filter-active');
        cityFilter.value = 'all';
    } else {
        // Only apply active styling for specific cities
        cityFilter.classList.add('city-filter-active');
    }
    
    // Add map visual feedback
    const mapContainer = document.getElementById('adminMap');
    if (mapContainer) {
        if (locationName !== 'Punjab State' && locationName !== 'All Cities') {
            mapContainer.classList.add('city-map-active');
        } else {
            mapContainer.classList.remove('city-map-active');
        }
    }
}

/**
 * Filter active buses list by city
 * @param {string} cityFilter - The city filter value
 */
function filterActiveBusesByCity(cityFilter) {
    const busList = document.getElementById('activeBusesList');
    if (!busList) return;
    
    // Get all bus elements
    const busElements = busList.querySelectorAll('.bus-item');
    
    busElements.forEach(busElement => {
        const busCity = busElement.dataset.city;
        
        if (cityFilter === 'all' || busCity === cityFilter) {
            busElement.style.display = 'block';
        } else {
            busElement.style.display = 'none';
        }
    });
    
    // Update visible count
    const visibleBuses = Array.from(busElements).filter(el => el.style.display !== 'none');
    console.log(`📊 Showing ${visibleBuses.length} buses for city filter: ${cityFilter}`);
    
    // Optionally update the count display
    updateFilteredBusCount(visibleBuses.length, cityFilter);
}

/**
 * Update the displayed count of filtered buses
 * @param {number} count - Number of visible buses
 * @param {string} cityFilter - Current city filter
 */
function updateFilteredBusCount(count, cityFilter) {
    const countElement = document.getElementById('activeBusCount');
    if (countElement) {
        const cityName = cityFilter === 'all' ? 'All Cities' : 
                        PTTConfig?.data?.cities?.[cityFilter]?.name || cityFilter;
        countElement.textContent = count;
        countElement.title = `${count} active buses in ${cityName}`;
    }
}

function filterByStatus() {
    const statusFilter = document.getElementById('statusFilter').value;
    console.log('Filtering by status:', statusFilter);
    
    // This would filter the active buses list by status
    // For now, just update the dashboard
    updateDashboard();
}

// Add missing alerts function
function showAlerts() {
    console.log('Showing alerts');
    alert('Alert System:\n\nNo active alerts at this time.\n\nThis feature will show:\n- Emergency situations\n- Bus breakdowns\n- Route disruptions\n- Traffic delays');
}

function logout() {
    sessionStorage.removeItem('adminInfo');
    // Detach Firebase listeners if necessary
    if (database) {
        database.ref('live_buses').off();
    }
    showAdminLogin();
}

// ===================================
// Enhanced Route Creation with MapmyIndia
// ===================================

// Route creation variables
routeStops = [];
routeMarkers = [];
routePolyline = null;

// Add route stop marker with enhanced UI
function addRouteStopMarker(lat, lng) {
    console.log('Adding route stop at:', lat, lng);
    
    const stopNumber = routeStops.length + 1;
    let marker;
    
    if (typeof mappls !== 'undefined') {
        // MapmyIndia marker
        marker = new mappls.Marker({
            map: adminMap,
            position: [lat, lng],
            icon: {
                url: `data:image/svg+xml;base64,${btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                        <circle cx="15" cy="15" r="12" fill="#ef4444" stroke="white" stroke-width="2"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${stopNumber}</text>
                    </svg>
                `)}`,
                scaledSize: [30, 30],
                anchor: [15, 15]
            },
            title: `Stop ${stopNumber}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        });
        
        // Add info window with stop details
        const infoWindow = new mappls.InfoWindow({
            content: `
                <div style="padding: 12px; min-width: 250px;">
                    <h4 style="margin: 0 0 8px 0; color: #ef4444;">🚩 Stop ${stopNumber}</h4>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
                    <div style="margin-top: 10px;">
                        <input type="text" id="stopName${stopNumber}" placeholder="Enter stop name..." style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 8px;">
                        <div style="display: flex; gap: 5px;">
                            <button onclick="confirmRouteStop(${lat}, ${lng}, ${stopNumber})" style="background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; flex: 1;">✓ Confirm</button>
                            <button onclick="removeRouteStop(${stopNumber - 1})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; flex: 1;">✗ Remove</button>
                        </div>
                    </div>
                </div>
            `,
            position: [lat, lng]
        });
        
        marker.infoWindow = infoWindow;
        infoWindow.open();
        
    } else {
        // Leaflet fallback
        const stopIcon = L.divIcon({
            className: 'route-stop-marker',
            html: stopNumber.toString(),
            iconSize: [25, 25],
            iconAnchor: [12, 12]
        });
        
        marker = L.marker([lat, lng], { icon: stopIcon }).addTo(adminMap);
        
        const popupContent = `
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 8px 0;">🚩 Stop ${stopNumber}</h4>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Lat:</strong> ${lat.toFixed(6)}</p>
                <p style="margin: 2px 0; font-size: 12px;"><strong>Lng:</strong> ${lng.toFixed(6)}</p>
                <input type="text" id="stopName${stopNumber}" placeholder="Enter stop name..." style="width: 100%; padding: 4px; margin: 8px 0; border: 1px solid #ccc; border-radius: 4px;">
                <div style="display: flex; gap: 5px; margin-top: 8px;">
                    <button onclick="confirmRouteStop(${lat}, ${lng}, ${stopNumber})" style="background: #22c55e; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; flex: 1;">✓ OK</button>
                    <button onclick="removeRouteStop(${stopNumber - 1})" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; flex: 1;">✗ Remove</button>
                </div>
            </div>
        `;
        marker.bindPopup(popupContent).openPopup();
    }
    
    // Store the stop data
    routeStops.push({ lat, lng, name: '', marker, stopNumber });
    routeMarkers.push(marker);
    
    // Update route line
    updateRoutePolyline();
    
    // Update stops list in the form
    updateRouteStopsList();
    
    // Show success message
    showNotification(`Stop ${stopNumber} added successfully! Click on the marker to name it.`, 'success');
}

// Confirm route stop with name
function confirmRouteStop(lat, lng, stopNumber) {
    const stopNameInput = document.getElementById(`stopName${stopNumber}`);
    const stopName = stopNameInput ? stopNameInput.value.trim() : '';
    
    if (!stopName) {
        showNotification('Please enter a name for this stop', 'warning');
        return;
    }
    
    // Update the stop data
    const stopIndex = stopNumber - 1;
    if (routeStops[stopIndex]) {
        routeStops[stopIndex].name = stopName;
        showNotification(`Stop "${stopName}" confirmed!`, 'success');
        
        // Close info window/popup
        if (routeStops[stopIndex].marker.infoWindow) {
            routeStops[stopIndex].marker.infoWindow.close();
        } else if (routeStops[stopIndex].marker.closePopup) {
            routeStops[stopIndex].marker.closePopup();
        }
        
        // Update the stops list
        updateRouteStopsList();
    }
}

// Remove route stop
function removeRouteStop(stopIndex) {
    if (stopIndex >= 0 && stopIndex < routeStops.length) {
        const stop = routeStops[stopIndex];
        
        // Remove marker from map
        if (stop.marker) {
            if (typeof mappls !== 'undefined' && stop.marker.setMap) {
                stop.marker.setMap(null);
            } else if (stop.marker.remove) {
                stop.marker.remove();
            }
        }
        
        // Remove from arrays
        routeStops.splice(stopIndex, 1);
        routeMarkers.splice(stopIndex, 1);
        
        // Renumber remaining stops
        renumberRouteStops();
        
        // Update route line
        updateRoutePolyline();
        
        // Update stops list
        updateRouteStopsList();
        
        showNotification('Stop removed successfully', 'info');
    }
}

// Renumber route stops after removal
function renumberRouteStops() {
    routeStops.forEach((stop, index) => {
        stop.stopNumber = index + 1;
        
        // Update marker icon
        if (typeof mappls !== 'undefined' && stop.marker.setIcon) {
            stop.marker.setIcon({
                url: `data:image/svg+xml;base64,${btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                        <circle cx="15" cy="15" r="12" fill="#ef4444" stroke="white" stroke-width="2"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${stop.stopNumber}</text>
                    </svg>
                `)}`,
                scaledSize: [30, 30],
                anchor: [15, 15]
            });
        }
    });
}

// Update route polyline
function updateRoutePolyline() {
    if (routeStops.length < 2) {
        if (routePolyline) {
            if (typeof mappls !== 'undefined' && routePolyline.setMap) {
                routePolyline.setMap(null);
            } else if (routePolyline.remove) {
                routePolyline.remove();
            }
            routePolyline = null;
        }
        return;
    }
    
    const coordinates = routeStops.map(stop => [stop.lat, stop.lng]);
    
    if (typeof mappls !== 'undefined') {
        // MapmyIndia polyline
        if (routePolyline) {
            routePolyline.setMap(null);
        }
        
        routePolyline = new mappls.Polyline({
            map: adminMap,
            paths: coordinates,
            strokeColor: '#ef4444',
            strokeWeight: 4,
            strokeOpacity: 0.8
        });
    } else {
        // Leaflet polyline
        if (routePolyline) {
            routePolyline.remove();
        }
        
        routePolyline = L.polyline(coordinates, {
            color: '#ef4444',
            weight: 4,
            opacity: 0.8
        }).addTo(adminMap);
    }
}

// Update route stops list in the UI
function updateRouteStopsList() {
    const stopsList = document.getElementById('routeStopsList');
    if (!stopsList) return;
    
    stopsList.innerHTML = '';
    
    routeStops.forEach((stop, index) => {
        const stopItem = document.createElement('div');
        stopItem.className = 'flex items-center justify-between p-2 bg-gray-50 rounded mb-2';
        stopItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">${stop.stopNumber}</span>
                <div>
                    <div class="font-medium text-sm">${stop.name || 'Unnamed Stop'}</div>
                    <div class="text-xs text-gray-500">${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</div>
                </div>
            </div>
            <button onclick="removeRouteStop(${index})" class="text-red-500 hover:text-red-700 text-sm">
                <i class="fas fa-times"></i>
            </button>
        `;
        stopsList.appendChild(stopItem);
    });
    
    // Show total stops count
    const totalStopsElement = document.getElementById('totalStops');
    if (totalStopsElement) {
        totalStopsElement.textContent = routeStops.length;
    }
}

// Enable route creation mode
function enableAdminRouteCreationMode() {
    window.adminRouteCreationMode = true;
    routeStops = [];
    routeMarkers = [];
    
    // Change map cursor
    const mapContainer = document.getElementById('adminMap');
    if (mapContainer) {
        mapContainer.style.cursor = 'crosshair';
    }
    
    showNotification('Route creation mode enabled. Click on the map to add stops.', 'info');
    console.log('Admin route creation mode enabled');
}

// Disable route creation mode
function disableAdminRouteCreationMode() {
    window.adminRouteCreationMode = false;
    
    // Reset cursor
    const mapContainer = document.getElementById('adminMap');
    if (mapContainer) {
        mapContainer.style.cursor = '';
    }
    
    console.log('Admin route creation mode disabled');
}

// Clear all route data
function clearRouteData() {
    // Remove all markers
    routeMarkers.forEach(marker => {
        if (typeof mappls !== 'undefined' && marker.setMap) {
            marker.setMap(null);
        } else if (marker.remove) {
            marker.remove();
        }
    });
    
    // Remove polyline
    if (routePolyline) {
        if (typeof mappls !== 'undefined' && routePolyline.setMap) {
            routePolyline.setMap(null);
        } else if (routePolyline.remove) {
            routePolyline.remove();
        }
    }
    
    // Clear arrays
    routeStops = [];
    routeMarkers = [];
    routePolyline = null;
    
    // Update UI
    updateRouteStopsList();
    
    showNotification('Route data cleared', 'info');
}

// Enhanced notification function
function showNotification(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
    }`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${
                type === 'success' ? 'check-circle' :
                type === 'error' ? 'exclamation-triangle' :
                type === 'warning' ? 'exclamation-circle' :
                'info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// ===================================
// Route Management Functions
// ===================================

// Create Route Modal Functions
function showCreateRouteModal() {
    console.log('Opening route creation modal');
    
    // Add modal-open class to body to prevent background scrolling
    document.body.classList.add('modal-open');
    
    // Hide the main admin dashboard temporarily
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.style.zIndex = '1';
    }
    
    // Show modal with higher z-index
    const modal = document.getElementById('createRouteModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('modal-backdrop');
        console.log('✅ Modal should now be visible');
    } else {
        console.error('❌ Create route modal not found!');
        return;
    }
    
    // Reset route stops array
    routeStops = [];
    console.log('✅ Route stops array reset');
    
    // Clear any existing stops list
    const stopsList = document.getElementById('routeStopsList');
    if (stopsList) {
        stopsList.innerHTML = '<p class="text-gray-500 text-sm">🗺️ Click "Add Stop" button below or click anywhere on the map to add bus stops</p>';
        console.log('✅ Stops list cleared');
    } else {
        console.error('❌ Route stops list element not found!');
    }
    
    // Show/hide KML indicator
    const kmlIndicator = document.getElementById('kmlIndicator');
    if (kmlIndicator) {
        if (routeKmlData && routeKmlData.length > 0) {
            kmlIndicator.classList.remove('hidden');
            kmlIndicator.innerHTML = `<i class="fas fa-file-code mr-1"></i> KML Data Available (${routeKmlData.length} route${routeKmlData.length > 1 ? 's' : ''})`;
        } else {
            kmlIndicator.classList.add('hidden');
        }
    }
    
    // Initialize map with longer delay to ensure modal is fully rendered
    setTimeout(() => {
        console.log('🗺️ Starting map initialization...');
        
        // Check if Google Maps should be used
        const config = window.PTTConfig || window.appConfig;
        const preferredProvider = config?.app?.map?.provider || 'google';
        
        if (preferredProvider === 'google' && googleMapsLoaded) {
            initializeGoogleRouteCreationMap();
        } else {
            initializeRouteCreationMap(); // Fallback to Leaflet
        }
        
        // If we have KML data loaded, display it on the route creation map
        if (routeKmlData && routeKmlData.length > 0) {
            console.log('📍 Displaying KML data on route creation map...');
            displayKMLRoutesOnRouteCreationMap(routeKmlData);
            showNotification(`Showing ${routeKmlData.length} KML route(s) on the map for reference`, 'info');
        }
    }, 1000); // Increased timeout for better modal rendering
}

function closeCreateRouteModal() {
    console.log('Closing route creation modal');
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    
    // Restore main admin dashboard z-index
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.style.zIndex = 'auto';
    }
    
    // Hide modal
    const modal = document.getElementById('createRouteModal');
    modal.classList.add('hidden');
    modal.classList.remove('modal-backdrop');
    
    // Clear KML routes from route creation map before destroying it
    clearKMLRoutesFromRouteCreationMap();
    
    // Clear modal KML data
    window.modalKmlData = null;
    
    if (routeCreationMap) {
        routeCreationMap.remove();
        routeCreationMap = null;
    }
    resetRouteForm();
}

function initializeRouteCreationMap() {
    console.log('🗺️ Initializing route creation map...');
    
    // Remove existing map if any
    if (routeCreationMap) {
        console.log('🗑️ Removing existing map');
        routeCreationMap.off(); // Remove all event listeners
        routeCreationMap.remove();
        routeCreationMap = null;
    }
    
    // Check if map container exists
    const mapContainer = document.getElementById('routeCreationMap');
    if (!mapContainer) {
        console.error('❌ Route creation map container not found!');
        showNotification('Map container not found. Please try refreshing the page.', 'error');
        return;
    }
    
    // Log container status
    console.log('📦 Map container found:', mapContainer);
    console.log('📏 Container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
    
    // Ensure container has proper dimensions and is visible
    mapContainer.style.height = '256px';
    mapContainer.style.width = '100%';
    mapContainer.style.position = 'relative';
    mapContainer.style.zIndex = '1';
    mapContainer.style.background = '#e5e7eb'; // Gray background while loading
    mapContainer.style.cursor = 'crosshair'; // Show it's clickable
    
    // Clear any existing content
    mapContainer.innerHTML = '';
    
    // Use config from config.js
    const config = window.PTTConfig || window.appConfig || {
        app: {
            map: {
                defaultCenter: { lat: 30.7333, lng: 76.7794 }, // Chandigarh
                defaultZoom: 11,
                tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors'
            }
        }
    };
    
    try {
        console.log('🌍 Creating Leaflet map...');
        
        // Create map with forced container check
        routeCreationMap = L.map(mapContainer, {
            center: [config.app.map.defaultCenter.lat, config.app.map.defaultCenter.lng],
            zoom: config.app.map.defaultZoom,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: false, // Disable double click zoom to prevent conflicts
            dragging: true,
            touchZoom: true
        });
        
        console.log('✅ Map object created successfully');
        
        // Add tile layer
        const tileLayer = L.tileLayer(config.app.map.tileLayer, {
            attribution: config.app.map.attribution,
            maxZoom: 18,
            minZoom: 5
        });
        
        tileLayer.addTo(routeCreationMap);
        console.log('🗺️ Tile layer added');
        
        // Wait for tiles to load before setting up interactions
        tileLayer.on('load', function() {
            console.log('🎨 Map tiles loaded successfully');
            setupMapInteractions();
        });
        
        // Fallback - setup interactions after timeout even if tiles don't load
        setTimeout(() => {
            setupMapInteractions();
        }, 1000);
        
        function setupMapInteractions() {
            if (!routeCreationMap) return;
            
            // Force map to recognize its size
            routeCreationMap.invalidateSize(true);
            console.log('📐 Map size invalidated and refreshed');
            
            // Add visual feedback that map is ready
            mapContainer.style.border = '3px solid #10b981'; // Green border when ready
            mapContainer.style.borderRadius = '8px';
            mapContainer.title = '✅ Ready! Click anywhere on the map to add a bus stop';
            mapContainer.classList.add('map-ready');
            
            // Add debugging info overlay
            const debugOverlay = document.createElement('div');
            debugOverlay.id = 'mapDebugInfo';
            debugOverlay.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(16, 185, 129, 0.9);
                color: white;
                padding: 8px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 1000;
                font-family: monospace;
            `;
            debugOverlay.innerHTML = '✅ Map Ready - Click to Add Stop';
            mapContainer.appendChild(debugOverlay);
            
            // Add click handler for adding stops - CRITICAL!
            routeCreationMap.on('click', function(e) {
                console.log('🎯 Map clicked at coordinates:', e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
                
                // Update debug overlay
                const debugOverlay = document.getElementById('mapDebugInfo');
                if (debugOverlay) {
                    debugOverlay.innerHTML = `🎯 Clicked: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
                    debugOverlay.style.background = 'rgba(59, 130, 246, 0.9)'; // Blue when clicked
                    
                    // Reset color after 2 seconds
                    setTimeout(() => {
                        debugOverlay.style.background = 'rgba(16, 185, 129, 0.9)';
                        debugOverlay.innerHTML = '✅ Map Ready - Click to Add Stop';
                    }, 2000);
                }
                
                // Prevent event bubbling
                if (e.originalEvent) {
                    e.originalEvent.stopPropagation();
                }
                
                // Visual feedback with ripple effect
                const clickMarker = L.circleMarker([e.latlng.lat, e.latlng.lng], {
                    color: '#10b981',
                    fillColor: '#10b981',
                    radius: 12,
                    fillOpacity: 0.6,
                    weight: 3
                }).addTo(routeCreationMap);
                
                // Animate the click feedback
                let radius = 12;
                const animation = setInterval(() => {
                    radius += 5;
                    clickMarker.setRadius(radius);
                    clickMarker.setStyle({ fillOpacity: 0.6 - (radius - 12) / 50 });
                    
                    if (radius > 30) {
                        clearInterval(animation);
                        routeCreationMap.removeLayer(clickMarker);
                    }
                }, 50);
                
                // Add the stop
                addStopToRoute(e.latlng.lat, e.latlng.lng);
            });
            
            // Add hover effects
            routeCreationMap.on('mousemove', function(e) {
                mapContainer.style.cursor = 'crosshair';
                mapContainer.title = `Click here to add stop at ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
            });
            
            routeCreationMap.on('mouseout', function(e) {
                mapContainer.style.cursor = 'crosshair';
                mapContainer.title = 'Click anywhere on the map to add a bus stop';
            });
            
            console.log('✅ Map click handler attached successfully');
            console.log('🎯 Map is ready for clicks!');
            
            // Show ready notification
            showNotification('Map is ready! Click anywhere to add bus stops.', 'success');
            
            // Add instructional popup that's more prominent
            const instructionPopup = L.popup({
                closeButton: true,
                autoClose: false,
                closeOnClick: false,
                className: 'route-instruction-popup'
            })
                .setLatLng([config.app.map.defaultCenter.lat, config.app.map.defaultCenter.lng])
                .setContent(`
                    <div style="text-align: center; padding: 10px;">
                        <h4 style="margin: 0 0 8px 0; color: #10b981; font-size: 16px;">🗺️ Route Creation Map</h4>
                        <p style="margin: 4px 0; font-size: 14px;"><strong>✅ Click anywhere to add bus stops!</strong></p>
                        <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">Select a city first to center the map on that area</p>
                        <button onclick="routeCreationMap.closePopup()" style="margin-top: 8px; background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">Got it!</button>
                    </div>
                `)
                .openOn(routeCreationMap);
        }
        
        // If we have KML data loaded, display it on this map too
        if (routeKmlData && routeKmlData.length > 0) {
            console.log('📍 Displaying KML data on Leaflet route creation map...');
            displayKMLRoutesOnRouteCreationMap(routeKmlData);
        }
        
        // Check for modal KML data
        if (window.modalKmlData && window.modalKmlData.length > 0) {
            console.log('📍 Displaying modal KML data on Leaflet route creation map...');
            displayKMLRoutesOnRouteCreationMap(window.modalKmlData);
        }
        
    } catch (error) {
        console.error('Error initializing route creation map:', error);
        mapContainer.innerHTML = `
            <div class="flex items-center justify-center h-full bg-red-50 text-red-600 p-4 rounded-lg">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p class="font-semibold">Map failed to load</p>
                    <p class="text-sm mt-1">Error: ${error.message}</p>
                    <button onclick="initializeRouteCreationMap()" class="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
                        <i class="fas fa-redo mr-1"></i> Try Again
                    </button>
                </div>
            </div>
        `;
        showNotification('Map initialization failed. Click "Try Again" button.', 'error');
    }
}

function addRouteStop() {
    console.log('Adding manual route stop');
    const stopIndex = routeStops.length;
    
    // Add empty stop to array
    routeStops.push({
        name: '',
        latitude: null,
        longitude: null
    });
    
    addRouteStopToUI(stopIndex);
}

function addRouteStopToUI(stopIndex) {
    const stopsList = document.getElementById('routeStopsList');
    if (!stopsList) {
        console.error('Route stops list not found!');
        return;
    }
    
    // Clear the placeholder text if this is the first stop
    if (stopIndex === 0) {
        stopsList.innerHTML = '';
    }
    
    const stopDiv = document.createElement('div');
    stopDiv.className = 'border border-gray-200 p-3 rounded-lg bg-white';
    stopDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-gray-800 text-sm">Stop ${stopIndex + 1}</h4>
            <button type="button" onclick="removeRouteStop(${stopIndex})" class="text-red-500 hover:text-red-700 text-sm">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
                <label class="block text-xs text-gray-600 mb-1">Stop Name</label>
                <input type="text" class="w-full p-2 border rounded text-sm" placeholder="Enter stop name" 
                       onchange="updateStopName(${stopIndex}, this.value)">
            </div>
            <div>
                <label class="block text-xs text-gray-600 mb-1">Coordinates</label>
                <input type="text" class="w-full p-2 border rounded bg-gray-50 text-sm" 
                       placeholder="Click on map to set" readonly id="stopCoords${stopIndex}">
            </div>
        </div>
    `;
    
    stopsList.appendChild(stopDiv);
    console.log('Stop UI added for index:', stopIndex);
}

function removeRouteStop(index) {
    routeStops.splice(index, 1);
    updateRouteStopsDisplay();
    updateRouteVisualization();
}

function updateStopName(index, name) {
    if (routeStops[index]) {
        routeStops[index].name = name;
    }
}

function addStopToRoute(lat, lng) {
    console.log('📍 Adding stop at coordinates:', lat.toFixed(6), lng.toFixed(6));
    
    // Validate coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.error('❌ Invalid coordinates provided:', lat, lng);
        alert('Invalid coordinates. Please try clicking on the map again.');
        return;
    }
    
    // Find the first empty stop or add new one
    let targetIndex = routeStops.findIndex(stop => !stop.latitude);
    
    if (targetIndex === -1) {
        // No empty stops, create a new one
        const stopIndex = routeStops.length;
        routeStops.push({
            name: '',
            latitude: lat,
            longitude: lng
        });
        targetIndex = stopIndex;
        console.log('➕ Created new stop at index:', targetIndex);
        
        // Add new stop to the UI
        addRouteStopToUI(targetIndex);
    } else {
        // Fill empty stop
        routeStops[targetIndex].latitude = lat;
        routeStops[targetIndex].longitude = lng;
        console.log('🔄 Updated existing stop at index:', targetIndex);
    }
    
    // Update coordinate display
    const coordsInput = document.getElementById(`stopCoords${targetIndex}`);
    if (coordsInput) {
        coordsInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        coordsInput.style.backgroundColor = '#dcfce7'; // Light green to show it's filled
        console.log('Updated coordinates display for stop', targetIndex + 1);
    } else {
        console.error('Coordinates input not found for stop:', targetIndex);
    }
    
    // Update route visualization
    updateRouteVisualization();
    
    // Show success feedback
    const stopsList = document.getElementById('routeStopsList');
    if (stopsList && routeStops.filter(s => s.latitude).length === 1) {
        // First stop added, update instructions
        const instructionP = stopsList.querySelector('p');
        if (instructionP && instructionP.textContent.includes('Click')) {
            instructionP.innerHTML = 'Great! Keep clicking on the map to add more stops, or use the "Add Stop" button.';
            instructionP.className = 'text-green-600 text-sm font-medium';
        }
    }
    
    console.log('✅ Stop added successfully. Total stops:', routeStops.length);
    console.log('📋 Current route stops:', routeStops);
    
    // Provide audio feedback (if supported)
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAfBjiH0+/NfS4FJGq+7+OZQA');
        audio.volume = 0.1;
        audio.play().catch(() => {}); // Ignore if audio fails
    } catch (e) {}
}

function updateRouteStopsDisplay() {
    const stopsList = document.getElementById('routeStopsList');
    stopsList.innerHTML = '';
    
    routeStops.forEach((stop, index) => {
        const stopDiv = document.createElement('div');
        stopDiv.className = 'border border-gray-200 p-4 rounded-lg';
        stopDiv.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-gray-800">Stop ${index + 1}</h4>
                <button type="button" onclick="removeRouteStop(${index})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label class="block text-sm text-gray-600 mb-1">Stop Name</label>
                    <input type="text" class="w-full p-2 border rounded" placeholder="Enter stop name" 
                           value="${stop.name}" onchange="updateStopName(${index}, this.value)">
                </div>
                <div>
                    <label class="block text-sm text-gray-600 mb-1">Coordinates</label>
                    <input type="text" class="w-full p-2 border rounded bg-gray-50" 
                           value="${stop.latitude ? `${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}` : 'Click on map to set'}" 
                           readonly id="stopCoords${index}">
                </div>
            </div>
        `;
        stopsList.appendChild(stopDiv);
    });
}

function updateRouteVisualization() {
    console.log('Updating route visualization...');
    
    const map = routeCreationMap || routeEditMap;
    if (!map) {
        console.warn('No map available for visualization');
        return;
    }
    
    // Check if this is a Google Map
    if (map.setCenter && typeof map.setCenter === 'function' && map.addListener) {
        // This is a Google Map
        updateGoogleRouteVisualization();
        return;
    }
    
    // This is a Leaflet map - use original method
    // Clear existing markers and polylines
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
    
    // Add markers for stops with coordinates
    const validStops = routeStops.filter(stop => stop.latitude && stop.longitude);
    console.log('Valid stops for visualization:', validStops.length);
    
    validStops.forEach((stop, index) => {
        // Create custom marker icon
        const markerIcon = L.divIcon({
            className: 'route-stop-marker',
            html: `<div style="background: #ef4444; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        const marker = L.marker([stop.latitude, stop.longitude], { icon: markerIcon }).addTo(map);
        marker.bindPopup(`<b>Stop ${index + 1}</b><br>${stop.name || 'Unnamed Stop'}<br>Lat: ${stop.latitude.toFixed(6)}<br>Lng: ${stop.longitude.toFixed(6)}`);
    });
    
    // Draw route line if we have multiple stops
    if (validStops.length > 1) {
        const latlngs = validStops.map(stop => [stop.latitude, stop.longitude]);
        const polyline = L.polyline(latlngs, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(map);
        
        // Fit map to show all stops
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [20, 20] });
        
        console.log('Route line drawn with', validStops.length, 'stops');
    } else if (validStops.length === 1) {
        // Center on the single stop
        map.setView([validStops[0].latitude, validStops[0].longitude], 15);
    }
}

function resetRouteForm() {
    document.getElementById('routeCreationForm').reset();
    document.getElementById('routeStopsList').innerHTML = '';
    routeStops = [];
    routePolyline = null;
    
    // Clear modal KML data if any
    window.modalKmlData = null;
    
    // Reset KML UI elements
    const kmlUploadArea = document.getElementById('kmlUploadArea');
    const modalKmlDisplay = document.getElementById('modalKmlDisplay');
    const clearKmlBtn = document.getElementById('clearKmlBtn');
    const modalKmlUpload = document.getElementById('modalKmlFileUpload');
    
    if (kmlUploadArea) kmlUploadArea.classList.remove('hidden');
    if (modalKmlDisplay) modalKmlDisplay.classList.add('hidden');
    if (clearKmlBtn) clearKmlBtn.classList.add('hidden');
    if (modalKmlUpload) modalKmlUpload.value = '';
}

// Handle route creation form submission
function createNewRoute() {
    console.log('Creating new route...');
    
    if (!database) {
        alert('Database not connected. Please check your internet connection.');
        return;
    }
    
    const routeData = {
        id: 'route_' + Date.now(),
        routeNumber: document.getElementById('routeNumber').value,
        routeName: document.getElementById('routeName').value,
        city: document.getElementById('routeCity').value,
        routeType: document.getElementById('routeType').value,
        description: document.getElementById('routeDescription').value,
        firstBusTime: document.getElementById('firstBusTime').value,
        lastBusTime: document.getElementById('lastBusTime').value,
        frequency: parseInt(document.getElementById('busFrequency').value),
        stops: routeStops.filter(stop => stop.latitude && stop.longitude),
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'admin'
    };
    
    console.log('Route data to save:', routeData);
    
    // Validate route data
    if (!routeData.routeNumber || !routeData.routeName || !routeData.city || !routeData.routeType) {
        alert('Please fill in all required fields.');
        return;
    }
    
    if (routeData.stops.length < 2) {
        alert('Route must have at least 2 stops. Click on the map to add stops.');
        return;
    }
    
    // Save to Firebase under city-specific path
    database.ref(`routes/${routeData.city}/${routeData.id}`).set(routeData)
        .then(() => {
            console.log('Route created successfully:', routeData.id);
            alert(`City bus route "${routeData.routeName}" created successfully for ${routeData.city}!`);
            closeCreateRouteModal();
            loadAllRoutes(); // Refresh routes list
        })
        .catch(error => {
            console.error('Error creating route:', error);
            alert('Error creating route. Please try again.');
        });
}

// Manage Routes Modal Functions
function showManageRoutesModal() {
    console.log('Opening manage routes modal');
    
    // Add modal-open class to body
    document.body.classList.add('modal-open');
    
    // Hide the main admin dashboard temporarily  
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.style.zIndex = '1';
    }
    
    // Show modal
    const modal = document.getElementById('manageRoutesModal');
    modal.classList.remove('hidden');
    modal.classList.add('modal-backdrop');
    
    loadAllRoutes();
}

function closeManageRoutesModal() {
    console.log('Closing manage routes modal');
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    
    // Restore main admin dashboard z-index
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.style.zIndex = 'auto';
    }
    
    // Hide modal
    const modal = document.getElementById('manageRoutesModal');
    modal.classList.add('hidden');
    modal.classList.remove('modal-backdrop');
}

function loadAllRoutes() {
    if (!database) {
        console.error('Database not initialized');
        return;
    }
    
    // Load routes from all cities
    database.ref('routes').once('value')
        .then(snapshot => {
            const routesData = snapshot.val() || {};
            allRoutes = {};
            
            // Flatten city-based route structure
            Object.keys(routesData).forEach(cityId => {
                if (routesData[cityId] && typeof routesData[cityId] === 'object') {
                    Object.keys(routesData[cityId]).forEach(routeId => {
                        allRoutes[routeId] = routesData[cityId][routeId];
                    });
                }
            });
            
            console.log('Loaded routes:', allRoutes);
            displayRoutesTable();
        })
        .catch(error => {
            console.error('Error loading routes:', error);
        });
}

function displayRoutesTable() {
    const tbody = document.getElementById('routesTableBody');
    tbody.innerHTML = '';
    
    Object.values(allRoutes).forEach(route => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const statusColor = {
            'active': 'bg-green-100 text-green-800',
            'inactive': 'bg-red-100 text-red-800',
            'maintenance': 'bg-yellow-100 text-yellow-800'
        }[route.status] || 'bg-gray-100 text-gray-800';
        
        const cityName = route.city ? route.city.charAt(0).toUpperCase() + route.city.slice(1) : 'N/A';
        const routeType = route.routeType ? route.routeType.charAt(0).toUpperCase() + route.routeType.slice(1) : 'Standard';
        
        row.innerHTML = `
            <td class="border border-gray-200 p-3">${route.routeNumber}</td>
            <td class="border border-gray-200 p-3">${route.routeName}</td>
            <td class="border border-gray-200 p-3">${cityName}</td>
            <td class="border border-gray-200 p-3">${routeType}</td>
            <td class="border border-gray-200 p-3">${route.stops?.length || 0}</td>
            <td class="border border-gray-200 p-3">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">
                    ${route.status}
                </span>
            </td>
            <td class="border border-gray-200 p-3">
                <div class="flex items-center space-x-2">
                    <button onclick="editRoute('${route.id}')" class="text-blue-500 hover:text-blue-700" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="viewRoute('${route.id}')" class="text-green-500 hover:text-green-700" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="toggleRouteStatus('${route.id}')" class="text-orange-500 hover:text-orange-700" title="Toggle Status">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                    <button onclick="deleteRoute('${route.id}')" class="text-red-500 hover:text-red-700" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function searchRoutes() {
    const searchTerm = document.getElementById('routeSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#routesTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function filterRoutes() {
    const statusFilter = document.getElementById('routeStatusFilter').value;
    const rows = document.querySelectorAll('#routesTableBody tr');
    
    rows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(5)');
        const status = statusCell.textContent.trim().toLowerCase();
        
        if (statusFilter === 'all' || status === statusFilter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Add new functions for city-specific map handling
function updateMapToCity() {
    const selectedCity = document.getElementById('routeCity').value;
    if (selectedCity && routeCreationMap) {
        const config = window.PTTConfig || window.appConfig;
        const cityData = config?.data?.cities?.[selectedCity];
        
        if (cityData) {
            routeCreationMap.setView(
                [cityData.coordinates.lat, cityData.coordinates.lng], 
                cityData.zoom || 12
            );
            console.log(`Map centered on ${selectedCity}`);
        }
    }
}

function updateEditMapToCity() {
    const selectedCity = document.getElementById('editRouteCity').value;
    if (selectedCity && routeEditMap) {
        const config = window.PTTConfig || window.appConfig;
        const cityData = config?.data?.cities?.[selectedCity];
        
        if (cityData) {
            routeEditMap.setView(
                [cityData.coordinates.lat, cityData.coordinates.lng], 
                cityData.zoom || 12
            );
            console.log(`Edit map centered on ${selectedCity}`);
        }
    }
}

// Update edit route function to handle city-specific data
function editRoute(routeId) {
    const route = allRoutes[routeId];
    if (!route) return;
    
    editingRouteId = routeId;
    
    // Populate edit form
    document.getElementById('editRouteId').value = routeId;
    document.getElementById('editRouteNumber').value = route.routeNumber;
    document.getElementById('editRouteName').value = route.routeName;
    document.getElementById('editRouteCity').value = route.city || route.startCity || 'chandigarh';
    document.getElementById('editRouteType').value = route.routeType || 'local';
    document.getElementById('editRouteStatus').value = route.status;
    document.getElementById('editRouteDescription').value = route.description || '';
    
    // Set route stops for editing
    routeStops = route.stops || [];
    
    // Show edit modal
    console.log('Opening edit route modal');
    
    // Add modal-open class to body
    document.body.classList.add('modal-open');
    
    // Hide the main admin dashboard temporarily
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.style.zIndex = '1';
    }
    
    // Show modal
    const modal = document.getElementById('editRouteModal');
    modal.classList.remove('hidden');
    modal.classList.add('modal-backdrop');
    
    setTimeout(() => {
        initializeRouteEditMap();
    }, 300);
}

function closeEditRouteModal() {
    console.log('Closing edit route modal');
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    
    // Restore main admin dashboard z-index
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.style.zIndex = 'auto';
    }
    
    // Hide modal
    const modal = document.getElementById('editRouteModal');
    modal.classList.add('hidden');
    modal.classList.remove('modal-backdrop');
    
    if (routeEditMap) {
        routeEditMap.remove();
        routeEditMap = null;
    }
    editingRouteId = null;
}

function initializeRouteEditMap() {
    if (routeEditMap) {
        routeEditMap.remove();
    }
    
    // Use config from config.js
    const config = window.PTTConfig || window.appConfig || {
        app: {
            map: {
                defaultCenter: { lat: 31.1471, lng: 75.3412 },
                defaultZoom: 8,
                tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors'
            }
        }
    };
    
    routeEditMap = L.map('routeEditMap').setView(
        [config.app.map.defaultCenter.lat, config.app.map.defaultCenter.lng], 
        config.app.map.defaultZoom
    );
    
    L.tileLayer(config.app.map.tileLayer, {
        attribution: config.app.map.attribution
    }).addTo(routeEditMap);
    
    // Invalidate size to fix map rendering issues in modal
    setTimeout(() => {
        routeEditMap.invalidateSize();
    }, 200);
    
    // Show existing route
    updateRouteVisualization();
}

function viewRoute(routeId) {
    const route = allRoutes[routeId];
    if (!route) return;
    
    const cityName = route.city ? route.city.charAt(0).toUpperCase() + route.city.slice(1) : 'N/A';
    const routeType = route.routeType ? route.routeType.charAt(0).toUpperCase() + route.routeType.slice(1) : 'Standard';
    
    alert(`City Bus Route Details:

Route: ${route.routeNumber}
Name: ${route.routeName}
City: ${cityName}
Type: ${routeType}
Stops: ${route.stops?.length || 0}
Status: ${route.status}
Schedule: ${route.firstBusTime} - ${route.lastBusTime} (every ${route.frequency} min)`);
}

function toggleRouteStatus(routeId) {
    const route = allRoutes[routeId];
    if (!route) return;
    
    const newStatus = route.status === 'active' ? 'inactive' : 'active';
    const city = route.city || route.startCity || 'chandigarh';
    
    database.ref(`routes/${city}/${routeId}/status`).set(newStatus)
        .then(() => {
            route.status = newStatus;
            displayRoutesTable();
            alert(`Route status changed to ${newStatus}`);
        })
        .catch(error => {
            console.error('Error updating route status:', error);
            alert('Error updating route status.');
        });
}

function deleteRoute(routeId) {
    const route = allRoutes[routeId];
    if (!route) return;
    
    const city = route.city || route.startCity || 'chandigarh';
    
    if (confirm(`Are you sure you want to delete city bus route ${route.routeNumber} (${route.routeName})?\n\nThis action cannot be undone.`)) {
        database.ref(`routes/${city}/${routeId}`).remove()
            .then(() => {
                delete allRoutes[routeId];
                displayRoutesTable();
                alert('Route deleted successfully.');
            })
            .catch(error => {
                console.error('Error deleting route:', error);
                alert('Error deleting route.');
            });
    }
}

// Handle route edit form submission
function updateRoute() {
    if (!editingRouteId) return;
    
    const currentRoute = allRoutes[editingRouteId];
    const oldCity = currentRoute.city || currentRoute.startCity;
    const newCity = document.getElementById('editRouteCity').value;
    
    const updatedRoute = {
        ...allRoutes[editingRouteId],
        routeNumber: document.getElementById('editRouteNumber').value,
        routeName: document.getElementById('editRouteName').value,
        city: newCity,
        routeType: document.getElementById('editRouteType').value,
        status: document.getElementById('editRouteStatus').value,
        description: document.getElementById('editRouteDescription').value,
        stops: routeStops.filter(stop => stop.latitude && stop.longitude),
        updatedAt: new Date().toISOString()
    };
    
    // If city changed, we need to move the route
    if (oldCity !== newCity) {
        // Delete from old city location
        database.ref(`routes/${oldCity}/${editingRouteId}`).remove()
            .then(() => {
                // Add to new city location
                return database.ref(`routes/${newCity}/${editingRouteId}`).set(updatedRoute);
            })
            .then(() => {
                allRoutes[editingRouteId] = updatedRoute;
                displayRoutesTable();
                closeEditRouteModal();
                alert('Route updated and moved to new city successfully!');
            })
            .catch(error => {
                console.error('Error moving route:', error);
                alert('Error moving route. Please try again.');
            });
    } else {
        // Same city, just update
        database.ref(`routes/${newCity}/${editingRouteId}`).set(updatedRoute)
            .then(() => {
                allRoutes[editingRouteId] = updatedRoute;
                displayRoutesTable();
                closeEditRouteModal();
                alert('Route updated successfully!');
            })
            .catch(error => {
                console.error('Error updating route:', error);
                alert('Error updating route. Please try again.');
            });
    }
}

function showRouteAnalytics() {
    // Simple analytics display - can be enhanced
    database.ref('routes').once('value')
        .then(snapshot => {
            const routes = snapshot.val() || {};
            const totalRoutes = Object.keys(routes).length;
            const activeRoutes = Object.values(routes).filter(r => r.status === 'active').length;
            const inactiveRoutes = Object.values(routes).filter(r => r.status === 'inactive').length;
            const maintenanceRoutes = Object.values(routes).filter(r => r.status === 'maintenance').length;
            
            alert(`Route Analytics:

Total Routes: ${totalRoutes}
Active Routes: ${activeRoutes}
Inactive Routes: ${inactiveRoutes}
Under Maintenance: ${maintenanceRoutes}`);
        })
        .catch(error => {
            console.error('Error loading route analytics:', error);
            alert('Error loading route analytics.');
        });
}

// Add missing toggle functions
function toggleHeatmap() {
    console.log('Toggling heatmap view');
    alert('Heatmap Feature:\n\nThis will show bus density heatmap across the region.\n\nFeature coming soon!');
}

// Demo function to add sample city bus routes (for testing)
function addSampleRoutes() {
    const sampleRoutes = [
        {
            id: 'route_ch_001',
            routeNumber: 'CH-001',
            routeName: 'Sector 17 to Railway Station',
            city: 'chandigarh',
            routeType: 'linear',
            description: 'Main route connecting city center to railway station',
            firstBusTime: '06:00',
            lastBusTime: '22:00',
            frequency: 15,
            status: 'active',
            stops: [
                { name: 'Sector 17 Bus Stand', latitude: 30.7410, longitude: 76.7822 },
                { name: 'Sector 22', latitude: 30.7340, longitude: 76.7752 },
                { name: 'Sector 35', latitude: 30.7240, longitude: 76.7602 },
                { name: 'Railway Station', latitude: 30.6954, longitude: 76.8302 }
            ],
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        },
        {
            id: 'route_ch_002',
            routeNumber: 'CH-002',
            routeName: 'PGI Circular Route',
            city: 'chandigarh',
            routeType: 'circular',
            description: 'Circular route serving PGI and nearby sectors',
            firstBusTime: '05:30',
            lastBusTime: '23:00',
            frequency: 20,
            status: 'active',
            stops: [
                { name: 'PGI', latitude: 30.7649, longitude: 76.7748 },
                { name: 'Sector 12', latitude: 30.7510, longitude: 76.7750 },
                { name: 'Sector 8', latitude: 30.7460, longitude: 76.7880 },
                { name: 'Sector 15', latitude: 30.7380, longitude: 76.7950 }
            ],
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        },
        {
            id: 'route_ld_001',
            routeNumber: 'LD-001',
            routeName: 'Bus Stand to PAU',
            city: 'ludhiana',
            routeType: 'linear',
            description: 'University route connecting main bus stand to PAU campus',
            firstBusTime: '06:30',
            lastBusTime: '21:30',
            frequency: 25,
            status: 'active',
            stops: [
                { name: 'Ludhiana Bus Stand', latitude: 30.9120, longitude: 75.8473 },
                { name: 'Clock Tower', latitude: 30.9060, longitude: 75.8490 },
                { name: 'Civil Hospital', latitude: 30.9010, longitude: 75.8520 },
                { name: 'PAU Campus', latitude: 30.9010, longitude: 75.8073 }
            ],
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        }
    ];
    
    const promises = sampleRoutes.map(route => 
        database.ref(`routes/${route.city}/${route.id}`).set(route)
    );
    
    Promise.all(promises)
        .then(() => {
            console.log('Sample city bus routes added successfully');
            loadAllRoutes();
            alert('Sample city bus routes added successfully! Check the Manage Routes section.');
        })
        .catch(error => {
            console.error('Error adding sample routes:', error);
            alert('Error adding sample routes.');
        });
}

// Add click outside modal to close functionality
document.addEventListener('click', function(event) {
    // Check if click is on modal backdrop
    if (event.target.classList.contains('modal-backdrop')) {
        if (event.target.id === 'createRouteModal') {
            closeCreateRouteModal();
        } else if (event.target.id === 'manageRoutesModal') {
            closeManageRoutesModal();
        } else if (event.target.id === 'editRouteModal') {
            closeEditRouteModal();
        }
    }
});

// Add escape key to close modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const createModal = document.getElementById('createRouteModal');
        const manageModal = document.getElementById('manageRoutesModal');
        const editModal = document.getElementById('editRouteModal');
        
        if (!createModal.classList.contains('hidden')) {
            closeCreateRouteModal();
        } else if (!manageModal.classList.contains('hidden')) {
            closeManageRoutesModal();
        } else if (!editModal.classList.contains('hidden')) {
            closeEditRouteModal();
        }
    }
});

// Test map click functionality
function testMapClick() {
    console.log('Testing map click functionality...');
    
    if (!routeCreationMap) {
        showNotification('Map not initialized yet. Please wait a moment and try again.', 'warning');
        return;
    }
    
    // Get map center coordinates
    const center = routeCreationMap.getCenter();
    const lat = center.lat;
    const lng = center.lng;
    
    console.log('Simulating click at map center:', lat.toFixed(6), lng.toFixed(6));
    
    // Manually call the addStopToRoute function
    addStopToRoute(lat, lng);
    
    showNotification(`Test stop added at center: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
}

// Clear route data function
function clearRouteData() {
    console.log('Clearing route data...');
    
    // Clear stops array
    routeStops = [];
    
    // Clear UI
    const stopsList = document.getElementById('routeStopsList');
    if (stopsList) {
        stopsList.innerHTML = '<p class="text-gray-500 text-sm">🗺️ Click "Add Stop" button below or click anywhere on the map to add bus stops</p>';
    }
    
    // Clear map markers and polylines
    if (routeCreationMap) {
        routeCreationMap.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                routeCreationMap.removeLayer(layer);
            }
        });
    }
    
    showNotification('Route data cleared successfully', 'info');
}