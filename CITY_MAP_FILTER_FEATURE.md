# City-Specific Map Loading Feature Implementation

## 🎯 Feature Overview

The admin dashboard now supports dynamic city-specific map loading using OpenStreetMap (OSM) tiles. When administrators select a city from the filter dropdown, the map automatically updates to show that city's area with appropriate zoom levels and optimized tile layers.

## ✨ Key Features Implemented

### 1. **Dynamic City Map Loading**
- **Smart City Detection**: Automatically loads city-specific map views
- **OSM Integration**: Uses OpenStreetMap tiles for detailed city visualization
- **Zoom Optimization**: Each city has optimized zoom levels for best viewing
- **Smooth Transitions**: Animated map transitions between cities

### 2. **Enhanced City Filter**
```javascript
// Function triggered when city is selected
function filterByCity() {
    const cityFilter = document.getElementById('cityFilter').value;
    
    if (cityFilter !== 'all') {
        loadCitySpecificMap(cityFilter);  // Load city map
    } else {
        resetToDefaultMapView();          // Show Punjab state
    }
    
    filterActiveBusesByCity(cityFilter);  // Filter bus list
    updateDashboard();                    // Update statistics
}
```

### 3. **City-Specific Configurations**
```javascript
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
    // ... other cities
};
```

### 4. **Multi-Map Provider Support**
- **Google Maps**: Switches to roadmap view for city details
- **Leaflet/OSM**: Updates tile layers for better city visualization
- **Automatic Fallback**: Seamless switching between providers

### 5. **Enhanced Bus List Filtering**
- **City-based Filtering**: Shows only buses operating in selected city
- **Visual Indicators**: City badges on each bus card
- **Interactive Elements**: Click buses to show details and focus on map
- **Real-time Updates**: Live filtering as data updates

## 🛠️ Technical Implementation

### Core Functions

#### 1. City Map Loading
```javascript
function loadCitySpecificMap(cityId) {
    const cityConfig = PTTConfig?.data?.cities?.[cityId];
    
    if (googleMapsLoaded && adminMap.setCenter) {
        // Google Maps implementation
        adminMap.setCenter({
            lat: cityConfig.coordinates.lat,
            lng: cityConfig.coordinates.lng
        });
        adminMap.setZoom(cityConfig.zoom || 12);
        adminMap.setMapTypeId('roadmap');
    } else if (adminMap.setView) {
        // Leaflet implementation
        adminMap.setView(
            [cityConfig.coordinates.lat, cityConfig.coordinates.lng], 
            cityConfig.zoom || 12
        );
        updateLeafletTileLayerForCity(cityId);
    }
    
    updateMapTitle(cityConfig.name);
}
```

#### 2. Tile Layer Management
```javascript
function updateLeafletTileLayerForCity(cityId) {
    // Remove existing tile layers
    adminMap.eachLayer(function(layer) {
        if (layer instanceof L.TileLayer) {
            adminMap.removeLayer(layer);
        }
    });
    
    // Add city-specific tile layer
    const tileConfig = cityTileConfigs[cityId];
    const newTileLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        ...tileConfig.options
    });
    
    newTileLayer.addTo(adminMap);
}
```

#### 3. Bus List Enhancement
```javascript
function addBusToList(bus) {
    // Determine bus city from route data
    let busCity = 'unknown';
    if (bus.routeId) {
        for (const [cityId, routes] of Object.entries(PTTConfig?.data?.routes || {})) {
            if (Array.isArray(routes) && routes.some(route => route.id === bus.routeId)) {
                busCity = cityId;
                break;
            }
        }
    }
    
    item.dataset.city = busCity; // For filtering
    // Enhanced UI with city badges and interaction
}
```

## 🎨 Visual Enhancements

### 1. **CSS Styling**
```css
/* City-specific map styling */
.city-tiles {
    filter: brightness(1.1) contrast(1.05);
}

.city-map-active {
    border: 2px solid #3b82f6 !important;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
}

.city-filter-active {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    font-weight: bold;
}
```

### 2. **Interactive Bus Cards**
- **City Badges**: Color-coded city indicators
- **Hover Effects**: Highlight buses on map when hovering over list
- **Click Actions**: Show detailed bus information modal
- **Status Indicators**: Live status with color-coded icons

### 3. **Map Visual Feedback**
- **Border Highlighting**: Active city maps get blue border
- **Title Updates**: Dynamic map titles showing current city
- **Smooth Transitions**: Animated zoom and pan transitions

## 📱 Usage Guide

### For Administrators:

1. **Select City Filter**:
   ```
   Filter Controls → Select City → Choose from dropdown
   ```

2. **Available Cities**:
   - All Cities (Punjab State View)
   - Chandigarh
   - Ludhiana  
   - Amritsar
   - Jalandhar
   - Patiala
   - Bathinda
   - Mohali
   - Pathankot

3. **Map Behavior**:
   - **\"All Cities\"**: Shows entire Punjab state with hybrid/satellite view
   - **Specific City**: Zooms to city with detailed OSM roadmap view
   - **Auto-Update**: Bus list filters automatically
   - **Visual Feedback**: Map border and title update

### Bus List Interaction:

1. **Hover Effects**: Hover over bus → highlights on map
2. **Click for Details**: Click bus card → detailed modal
3. **Focus on Map**: Click \"Focus on Map\" → centers map on bus
4. **Show Route**: Click \"Show Route\" → displays full route

## 🔧 Configuration

### City Coordinates (PTTConfig)
```javascript
cities: {
    chandigarh: {
        name: \"Chandigarh\",
        coordinates: { lat: 30.7333, lng: 76.7794 },
        zoom: 12
    },
    ludhiana: {
        name: \"Ludhiana\", 
        coordinates: { lat: 30.901, lng: 75.8573 },
        zoom: 12
    },
    // ... other cities
}
```

### Tile Layer URLs
- **Primary**: OpenStreetMap Standard
- **Fallback**: OpenStreetMap Humanitarian
- **Alternative**: CartoDB Positron (for light theme)

## 🚀 Performance Optimizations

1. **Lazy Loading**: Tile layers load only when needed
2. **Caching**: Browser caches tiles for faster subsequent loads
3. **Efficient Filtering**: Uses CSS display properties for fast bus filtering
4. **Debounced Updates**: Prevents excessive API calls during rapid selections

## 🔮 Future Enhancements

1. **Custom Tile Layers**: City-specific optimized tile sources
2. **Satellite Toggle**: Switch between roadmap and satellite for cities
3. **Offline Support**: Cache tiles for offline city viewing
4. **Route Clustering**: Cluster routes by city for better visualization
5. **Heat Maps**: City-specific bus density heat maps

## 📊 Benefits

- **Improved UX**: Administrators can focus on specific cities
- **Better Performance**: Loads only relevant map data
- **Enhanced Filtering**: City-based bus and route filtering
- **Visual Clarity**: Better map details for urban areas
- **Responsive Design**: Works on desktop and mobile devices

---

*The city-specific map loading feature transforms the admin dashboard into a more focused and efficient tool for managing public transportation across Punjab's cities.*