# Punjab Transport Tracker - Complete Project Setup Guide

## 🚀 Project Overview

**Punjab Transport Tracker** is a comprehensive real-time bus tracking system for Punjab state, India. The system provides live bus tracking, route management, and passenger information services using **Google Earth/Maps API** as the primary mapping solution.

## 🎯 Project Objectives

- **Real-time Bus Tracking**: Live GPS tracking of buses across Punjab
- **Route Management**: Admin tools for creating and managing bus routes
- **Passenger Services**: Real-time arrival predictions and route information
- **Enhanced Mapping**: Google Earth satellite imagery for better route visualization
- **Multi-city Support**: Coverage for major Punjab cities (Chandigarh, Ludhiana, Amritsar, etc.)

## 🏗️ System Architecture

### **Technology Stack**
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Styling**: Tailwind CSS
- **Primary Maps**: Google Maps JavaScript API + Google Earth Engine
- **Secondary Maps**: MapmyIndia (Mappls) API
- **Fallback Maps**: Leaflet + OpenStreetMap
- **Backend**: Firebase Realtime Database
- **Authentication**: Firebase Auth
- **Charts**: Chart.js
- **Icons**: Font Awesome

### **Map Provider Hierarchy**
1. **Primary**: Google Maps API (with Google Earth imagery)
2. **Secondary**: MapmyIndia/Mappls (for Indian locations)
3. **Fallback**: Leaflet with OpenStreetMap

## 📁 Project Structure

```
Punjab_Transport_Tracker/
├── HTML/
│   ├── index.html              # Landing page
│   ├── admin-dashboard.html    # Admin interface with Google Maps
│   ├── user-app.html          # User tracking app with Google Earth
│   ├── driver-app.html        # Driver interface
│   └── diagnostics.html       # System diagnostics
├── JS/
│   ├── config.js              # Configuration with Google API keys
│   ├── admin.js               # Admin functions with Google Maps
│   ├── user-app.js           # User app with Google Earth
│   ├── driver-app.js         # Driver tracking functions
│   ├── common.js             # Shared utilities
│   └── firebase-enhanced.js   # Firebase integration
├── CSS/
│   └── style.css             # Custom styles
├── GOOGLE_EARTH_SETUP.md     # Google Earth setup guide
└── PROJECT_SETUP_GUIDE.md    # This file
```

## 🔧 Prerequisites & Setup

### **1. Google Cloud Platform Setup**

#### **Required APIs to Enable:**
1. **Google Maps JavaScript API** ✅
2. **Google Earth Engine API** ✅ 
3. **Places API** ✅
4. **Geocoding API** ✅
5. **Directions API** (optional for route optimization)

#### **API Key Configuration:**
```javascript
// In JS/config.js
google: {
    apiKey: 'AIzaSyC0p0-2n_otSc39b2N4LeennvO7DZ5mXbA', // Your actual key
    defaultMapType: 'satellite', // Use satellite view by default
    earth: {
        enable3D: true,
        tilt: 45,
        enableTerrain: true,
        enableBuildings: true,
        enableImagery: true
    }
}
```

### **2. Firebase Setup**

#### **Required Firebase Services:**
- **Realtime Database**: For live bus tracking data
- **Authentication**: For admin and driver login
- **Hosting** (optional): For deployment

#### **Firebase Configuration:**
```javascript
// Already configured in config.js
const firebaseConfig = {
    apiKey: "AIzaSyAtFRU9a-l22B85AuzfySTUQD245AE3o30",
    authDomain: "punjab-transport-tracker-e05b3.firebaseapp.com",
    databaseURL: "https://punjab-transport-tracker-e05b3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "punjab-transport-tracker-e05b3",
    // ... rest of config
};
```

## 🌍 Google Earth Integration Features

### **Admin Dashboard Features:**
- **Satellite Route Planning**: Create bus routes over high-resolution satellite imagery
- **3D Terrain Visualization**: See actual terrain when planning routes
- **Enhanced Stop Placement**: Place bus stops with satellite context
- **Hybrid View**: Combine satellite imagery with road overlays
- **Terrain Awareness**: Better understanding of route challenges

### **User App Features:**
- **Real-time Satellite Views**: Users see actual satellite imagery
- **3D Landmarks**: Major buildings and landmarks visible in 3D
- **Enhanced Navigation**: Better visual context for routes
- **Places Search**: Google Places integration for finding locations

## 🚀 Getting Started

### **Step 1: Clone/Setup Project**
```bash
# Navigate to your project directory
cd "c:\Users\KEVINDEEP SINGH\OneDrive\Desktop\SIH_25\Punjab_Transport_Tracker"

# Verify all files are present
dir
```

### **Step 2: Open in Development Environment**
```bash
# If using VS Code
code .

# Or open in any IDE/editor
```

### **Step 3: Start Local Server**
```bash
# Using Python (if installed)
python -m http.server 8000

# Using Node.js (if installed)
npx http-server

# Or use VS Code Live Server extension
```

### **Step 4: Access Applications**
- **Landing Page**: http://localhost:8000/HTML/index.html
- **Admin Dashboard**: http://localhost:8000/HTML/admin-dashboard.html
- **User App**: http://localhost:8000/HTML/user-app.html
- **Driver App**: http://localhost:8000/HTML/driver-app.html

## 🔐 Demo Credentials

### **Admin Login:**
- **Email**: `admin@demo.com`
- **Password**: `admin123`

### **Driver Login:**
- **Driver ID**: `DR001`
- **PIN**: `1234`

## 🧪 Testing Google Earth Integration

### **Admin Dashboard Test:**
1. Login with admin credentials
2. Click "Create New Route"
3. Select a city (Chandigarh recommended)
4. **Expected**: Map shows satellite imagery instead of basic roads
5. Click anywhere on map → should place markers on satellite view
6. Test 3D controls (tilt/rotate buttons)

### **User App Test:**
1. Open user app
2. Select "Chandigarh" from city dropdown
3. **Expected**: Map shows hybrid view (satellite + roads)
4. Try searching for locations using Places API
5. Test 3D landmarks in major areas

## 🗺️ Map Configuration Details

### **Provider Selection Logic:**
```javascript
// Automatic provider selection in admin.js and user-app.js
1. Try Google Maps (if API key configured)
2. Fallback to MapmyIndia (if available)
3. Final fallback to Leaflet/OpenStreetMap
```

### **Google Maps Options:**
```javascript
mapOptions = {
    mapTypeId: 'hybrid',        // Satellite + roads
    tilt: 45,                   // 3D angle
    zoomControl: true,
    mapTypeControl: true,
    streetViewControl: true,
    rotateControl: true,
    styles: [/* Enhanced transport styling */]
}
```

## 📊 Key Features Implemented

### **Admin Dashboard:**
- ✅ Real-time bus monitoring with Google satellite maps
- ✅ Route creation with satellite imagery context
- ✅ Bus stop placement on satellite views
- ✅ 3D terrain visualization
- ✅ Enhanced route analytics

### **User App:**
- ✅ Live bus tracking on hybrid satellite maps
- ✅ Real-time arrival predictions
- ✅ 3D landmark visualization
- ✅ Enhanced location search with Google Places
- ✅ Journey planning with satellite context

### **Driver App:**
- ✅ GPS tracking with satellite background
- ✅ Route guidance with terrain awareness
- ✅ Enhanced navigation context

## 🚦 Development Workflow

### **1. Start Development Server:**
```bash
# Navigate to project
cd "c:\Users\KEVINDEEP SINGH\OneDrive\Desktop\SIH_25\Punjab_Transport_Tracker"

# Start server
python -m http.server 8000
```

### **2. Development URLs:**
- **Admin**: http://localhost:8000/HTML/admin-dashboard.html
- **User**: http://localhost:8000/HTML/user-app.html
- **Driver**: http://localhost:8000/HTML/driver-app.html

### **3. Key Development Areas:**

#### **Route Creation Enhancement:**
```javascript
// File: JS/admin.js
// Function: initializeGoogleRouteCreationMap()
// Purpose: Enhanced route creation with satellite imagery
```

#### **User Experience Enhancement:**
```javascript
// File: JS/user-app.js  
// Function: initializeGoogleMap()
// Purpose: Hybrid satellite + road view for users
```

#### **Configuration Management:**
```javascript
// File: JS/config.js
// Purpose: Google Maps API configuration and fallback settings
```

## 🎯 Next Development Steps

### **Phase 1: Core Enhancement**
1. **Route Optimization**: Use Google Directions API for optimal routes
2. **Real-time Traffic**: Integrate traffic data for better ETAs
3. **Enhanced Search**: Improve location search with Google Places

### **Phase 2: Advanced Features**
1. **3D Route Visualization**: Enhanced 3D route planning
2. **Satellite Route Analysis**: Terrain-aware route optimization
3. **Enhanced Markers**: Custom 3D markers for bus stops

### **Phase 3: User Experience**
1. **Offline Support**: Cache satellite tiles for offline use
2. **Performance Optimization**: Optimize map loading and rendering
3. **Mobile Enhancement**: Improve mobile map interactions

## 🔧 Troubleshooting

### **Google Maps Not Loading:**
1. Check API key in browser console
2. Verify API quotas in Google Cloud Console
3. Ensure required APIs are enabled
4. Check domain restrictions on API key

### **Firebase Connection Issues:**
1. Verify internet connection
2. Check Firebase project status
3. Validate Firebase configuration in config.js

### **Map Click Not Working:**
1. Check browser console for JavaScript errors
2. Verify map initialization completed
3. Test with fallback Leaflet maps

## 📞 Support & Resources

### **Documentation:**
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Google Earth Engine](https://developers.google.com/earth-engine)
- [Firebase Documentation](https://firebase.google.com/docs)

### **Project Files:**
- **Setup Guide**: `GOOGLE_EARTH_SETUP.md`
- **Configuration**: `JS/config.js`
- **Admin Functions**: `JS/admin.js`
- **User Functions**: `JS/user-app.js`

---

## 🎉 Ready to Start!

Your Punjab Transport Tracker is now fully configured with Google Earth integration. Follow the getting started steps above to begin development with enhanced satellite mapping capabilities!

**Happy Coding! 🚀🗺️**