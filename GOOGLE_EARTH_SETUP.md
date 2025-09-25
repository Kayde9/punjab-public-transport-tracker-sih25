# Google Earth & Maps API Integration Guide

This guide will help you set up Google Earth and Google Maps API integration for the Punjab Transport Tracker.

## 🚀 Quick Setup

### 1. Get Google Cloud API Key

1. **Visit Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**: Create a new project called "Punjab Transport Tracker"
3. **Enable APIs**: Navigate to "APIs & Services" > "Library" and enable:
   - ✅ **Google Maps JavaScript API** 
   - ✅ **Google Earth Engine API** (for satellite imagery)
   - ✅ **Places API** (for location search)
   - ✅ **Geocoding API** (for address lookup)
   - ✅ **Directions API** (for route optimization)

4. **Create API Key**: 
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

5. **Secure Your API Key** (Important!):
   - Click on your API key to edit it
   - Under "Application restrictions": Select "HTTP referrers"
   - Add your domains:
     - `http://localhost/*` (for development)
     - `https://yourdomain.com/*` (for production)
   - Under "API restrictions": Select "Restrict key" and choose only the APIs you enabled

### 2. Update Configuration Files

#### Step 1: Update `config.js`
Replace the empty Google API key in `JS/config.js`:

```javascript
google: {
    apiKey: 'YOUR_ACTUAL_GOOGLE_API_KEY_HERE', // Replace this!
    // ... rest of config stays the same
}
```

#### Step 2: Update HTML Files
Replace `YOUR_GOOGLE_MAPS_API_KEY` in both HTML files:

**admin-dashboard.html:**
```html
<script async defer 
        src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=geometry,places,visualization&callback=initGoogleMaps">
</script>
```

**user-app.html:**
```html
<script async defer 
        src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY&libraries=geometry,places,visualization&callback=initGoogleMaps">
</script>
```

### 3. Enable Google Earth Features

The integration includes several Google Earth features:

#### 🌍 **Satellite Imagery**
- High-resolution satellite views of Punjab
- Real-time imagery updates
- Enhanced terrain visualization

#### 🏗️ **3D Buildings and Terrain**
- 3D visualization of major buildings and landmarks
- Terrain elevation for better route understanding
- Tilt and rotation controls

#### 🛣️ **Advanced Route Planning**
- Hybrid view combining satellite imagery with road overlays
- Enhanced stop placement with landmark recognition
- Visual route optimization

## 🎯 Features Added

### For Admin Dashboard:
- **Satellite View**: Better visualization of bus routes over actual terrain
- **3D Tilt Controls**: Ability to tilt and rotate the map for better perspective
- **Enhanced Markers**: More detailed bus stop markers with satellite context
- **Terrain Awareness**: Route planning considers actual terrain and obstacles

### For User App:
- **Real-time Satellite**: Users can see actual satellite imagery of their area
- **3D Landmarks**: Major buildings and landmarks visible in 3D
- **Enhanced Navigation**: Better visual context for route understanding

## 🔧 Configuration Options

### Map Types Available:
- `roadmap` - Standard road map
- `satellite` - Pure satellite imagery
- `hybrid` - Satellite with road overlays (recommended)
- `terrain` - Terrain with elevation data

### 3D Features:
```javascript
earth: {
    enable3D: true,        // Enable 3D features
    tilt: 45,             // Default tilt angle
    enableTerrain: true,   // Show elevation
    enableBuildings: true, // Show 3D buildings
    enableImagery: true    // High-res imagery
}
```

## 🛡️ Security Best Practices

1. **Never expose your API key in public repositories**
2. **Always use HTTP referrer restrictions**
3. **Limit API access to only required services**
4. **Monitor usage in Google Cloud Console**
5. **Set up billing alerts to avoid unexpected charges**

## 💰 Cost Considerations

### Free Tier Limits:
- **Maps JavaScript API**: 28,000 loads per month free
- **Geocoding API**: 40,000 requests per month free
- **Places API**: Limited free tier

### For Punjab Transport Tracker:
- Estimated cost: $0-50/month for moderate usage
- Can be optimized by implementing caching
- Consider implementing map tiles caching for production

## 🚦 Testing the Integration

### 1. Admin Dashboard Test:
1. Login with: `admin@demo.com` / `admin123`
2. Click "Create New Route"
3. Select a city (map should show satellite view)
4. Click on map - should place markers on satellite imagery
5. Try 3D controls (tilt/rotate)

### 2. User App Test:
1. Open user-app.html
2. Select a city
3. Map should show hybrid satellite + roads view
4. Test location search functionality

## 🔄 Fallback System

The system includes automatic fallback:
1. **Primary**: Google Maps (when API key configured)
2. **Secondary**: MapmyIndia/Mappls (if configured)
3. **Fallback**: OpenStreetMap with Leaflet

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify API key has correct permissions
3. Ensure billing is enabled in Google Cloud
4. Check API quotas and usage

## 🎉 Expected Results

After setup, you should see:
- ✅ High-resolution satellite imagery of Punjab
- ✅ 3D buildings in major cities (Chandigarh, Ludhiana, etc.)
- ✅ Enhanced route creation with satellite context
- ✅ Better visual landmarks for bus stop placement
- ✅ Improved user experience with realistic map visualization

---

**Note**: Google Earth imagery provides significantly better detail for Indian locations compared to OpenStreetMap, making it ideal for transport route planning in Punjab.