// ===================================
// Punjab Transport Tracker - IoT Device Integration
// ===================================

/**
 * IoT Device Integration Module
 * Handles communication with GPS-enabled IoT devices without SIM cards
 * Supports multiple connectivity methods: WiFi, LoRaWAN, Bluetooth
 */

class IoTDeviceManager {
    constructor() {
        this.devices = new Map();
        this.pendingData = new Map();
        this.connectivityMethods = ['wifi', 'lorawan', 'bluetooth', 'cellular'];
        this.dataBuffer = [];
        this.maxBufferSize = 1000;
        this.transmissionInterval = 30000; // 30 seconds
        this.offlineThreshold = 300000; // 5 minutes
        
        console.log('IoT Device Manager initialized');
        this.initializeDeviceManagement();
    }

    // Initialize device management system
    initializeDeviceManagement() {
        // Load existing devices from Firebase
        this.loadDevicesFromFirebase();
        
        // Start periodic data transmission attempts
        setInterval(() => {
            this.attemptDataTransmission();
        }, this.transmissionInterval);

        // Monitor device connectivity
        setInterval(() => {
            this.checkDeviceConnectivity();
        }, 60000); // Check every minute

        // Initialize device discovery
        this.startDeviceDiscovery();
    }
    
    // Load existing devices from Firebase
    async loadDevicesFromFirebase() {
        if (!window.database) {
            console.warn('Firebase database not available for loading devices');
            return;
        }
        
        try {
            console.log('Loading devices from Firebase...');
            const snapshot = await window.database.ref('iot_devices').once('value');
            const devicesData = snapshot.val();
            
            if (devicesData) {
                // Clear existing devices before loading from Firebase
                this.devices.clear();
                
                Object.keys(devicesData).forEach(deviceId => {
                    const deviceData = devicesData[deviceId];
                    const device = {
                        deviceId: deviceId,
                        busNumber: deviceData.busNumber,
                        routeId: deviceData.routeId,
                        cityId: deviceData.cityId,
                        driverId: deviceData.driverId,
                        lastSeen: deviceData.lastSeen || Date.now(),
                        connectivity: deviceData.connectivity || 'wifi',
                        status: deviceData.status || 'active',
                        location: deviceData.location || null,
                        batteryLevel: deviceData.batteryLevel || 100,
                        signalStrength: deviceData.signalStrength || 0,
                        dataBuffer: [],
                        metadata: deviceData.metadata || {
                            hardwareVersion: '1.0',
                            firmwareVersion: '1.0',
                            manufacturer: 'Punjab Transport',
                            installDate: new Date().toISOString()
                        }
                    };
                    
                    this.devices.set(deviceId, device);
                    console.log(`Loaded device from Firebase: ${deviceId}`);
                });
                
                console.log(`Successfully loaded ${this.devices.size} devices from Firebase`);
            } else {
                console.log('No existing devices found in Firebase');
            }
        } catch (error) {
            console.error('Failed to load devices from Firebase:', error);
            throw error;
        }
    }

    // Register a new IoT device
    async registerDevice(deviceConfig) {
        try {
            const device = {
                deviceId: deviceConfig.deviceId,
                busNumber: deviceConfig.busNumber,
                routeId: deviceConfig.routeId,
                cityId: deviceConfig.cityId,
                driverId: deviceConfig.driverId,
                lastSeen: Date.now(),
                connectivity: deviceConfig.connectivity || 'wifi',
                status: 'active',
                location: null,
                batteryLevel: 100,
                signalStrength: 0,
                dataBuffer: [],
                metadata: {
                    hardwareVersion: deviceConfig.hardwareVersion || '1.0',
                    firmwareVersion: deviceConfig.firmwareVersion || '1.0',
                    manufacturer: deviceConfig.manufacturer || 'Punjab Transport',
                    installDate: deviceConfig.installDate || new Date().toISOString()
                }
            };

            // Store in local map
            this.devices.set(deviceConfig.deviceId, device);
            console.log(`Device registered locally: ${deviceConfig.deviceId}`);
            
            // Save to Firebase immediately
            await this.updateDeviceInFirebase(device);
            console.log(`Device saved to Firebase: ${deviceConfig.deviceId}`);
            
            return device;
        } catch (error) {
            console.error(`Failed to register device ${deviceConfig.deviceId}:`, error);
            throw error;
        }
    }

    // Receive GPS data from IoT device
    receiveGPSData(deviceId, gpsData) {
        const device = this.devices.get(deviceId);
        if (!device) {
            console.warn(`Unknown device: ${deviceId}`);
            return false;
        }

        // Validate GPS data
        if (!this.validateGPSData(gpsData)) {
            console.error(`Invalid GPS data from device: ${deviceId}`);
            return false;
        }

        // Process and store GPS data
        const processedData = this.processGPSData(deviceId, gpsData);
        
        // Update device status
        device.lastSeen = Date.now();
        device.location = {
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            accuracy: gpsData.accuracy || 5,
            timestamp: gpsData.timestamp || Date.now()
        };

        // Add to transmission buffer
        this.addToBuffer(deviceId, processedData);

        // Attempt immediate transmission if connected
        if (device.connectivity !== 'offline') {
            this.transmitData(deviceId, [processedData]);
        }

        console.log(`GPS data received from device: ${deviceId}`);
        return true;
    }

    // Process raw GPS data from IoT device
    processGPSData(deviceId, rawData) {
        const device = this.devices.get(deviceId);
        
        return {
            deviceId: deviceId,
            busNumber: device.busNumber,
            routeId: device.routeId,
            driverId: device.driverId,
            latitude: parseFloat(rawData.latitude),
            longitude: parseFloat(rawData.longitude),
            altitude: rawData.altitude || 0,
            speed: this.calculateSpeed(deviceId, rawData),
            heading: rawData.heading || 0,
            accuracy: rawData.accuracy || 5,
            satelliteCount: rawData.satelliteCount || 0,
            timestamp: rawData.timestamp || Date.now(),
            isActive: true,
            batteryLevel: rawData.batteryLevel || device.batteryLevel,
            signalStrength: rawData.signalStrength || device.signalStrength,
            connectivity: device.connectivity,
            deviceInfo: {
                hardwareVersion: device.metadata.hardwareVersion,
                firmwareVersion: device.metadata.firmwareVersion,
                lastMaintenance: device.metadata.lastMaintenance
            }
        };
    }

    // Validate GPS data integrity
    validateGPSData(data) {
        // Check required fields
        if (!data.latitude || !data.longitude) {
            return false;
        }

        // Validate coordinate ranges
        if (data.latitude < -90 || data.latitude > 90) {
            return false;
        }

        if (data.longitude < -180 || data.longitude > 180) {
            return false;
        }

        // Check if coordinates are within Punjab region (rough bounds)
        const punjabBounds = {
            north: 32.5,
            south: 29.5,
            east: 77.5,
            west: 73.5
        };

        if (data.latitude < punjabBounds.south || data.latitude > punjabBounds.north ||
            data.longitude < punjabBounds.west || data.longitude > punjabBounds.east) {
            console.warn('GPS coordinates outside Punjab region');
            // Don't reject, but log warning
        }

        return true;
    }

    // Calculate speed based on previous location
    calculateSpeed(deviceId, currentData) {
        const device = this.devices.get(deviceId);
        if (!device.location || !device.location.timestamp) {
            return 0;
        }

        const timeDiff = (currentData.timestamp - device.location.timestamp) / 1000; // seconds
        if (timeDiff <= 0) return 0;

        // Calculate distance using Haversine formula
        const distance = this.haversineDistance(
            device.location.latitude, device.location.longitude,
            currentData.latitude, currentData.longitude
        );

        // Speed in km/h
        const speed = (distance / timeDiff) * 3.6;
        return Math.round(speed);
    }

    // Haversine distance calculation
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in kilometers
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Add data to transmission buffer
    addToBuffer(deviceId, data) {
        const device = this.devices.get(deviceId);
        if (!device) return;

        device.dataBuffer.push(data);

        // Prevent buffer overflow
        if (device.dataBuffer.length > this.maxBufferSize) {
            device.dataBuffer = device.dataBuffer.slice(-this.maxBufferSize);
        }
    }

    // Attempt to transmit buffered data
    async attemptDataTransmission() {
        for (const [deviceId, device] of this.devices) {
            if (device.dataBuffer.length > 0 && device.connectivity !== 'offline') {
                try {
                    await this.transmitData(deviceId, device.dataBuffer);
                    device.dataBuffer = []; // Clear buffer on successful transmission
                } catch (error) {
                    console.error(`Failed to transmit data for device ${deviceId}:`, error);
                }
            }
        }
    }

    // Transmit data to Firebase
    async transmitData(deviceId, dataArray) {
        if (!window.database) {
            throw new Error('Firebase database not available');
        }

        const device = this.devices.get(deviceId);
        if (!device) {
            throw new Error(`Device not found: ${deviceId}`);
        }

        try {
            // Batch update for efficiency
            const updates = {};
            
            dataArray.forEach((data, index) => {
                const path = `live_buses/${device.routeId}/${deviceId}`;
                updates[path] = data;
                
                // Also store in device history
                const historyPath = `device_history/${deviceId}/${Date.now()}_${index}`;
                updates[historyPath] = data;
            });

            // Update device status
            updates[`iot_devices/${deviceId}`] = {
                lastUpdate: firebase.database.ServerValue.TIMESTAMP,
                status: 'active',
                batteryLevel: device.batteryLevel,
                signalStrength: device.signalStrength,
                dataCount: dataArray.length
            };

            await window.database.ref().update(updates);
            console.log(`Successfully transmitted ${dataArray.length} data points for device ${deviceId}`);

        } catch (error) {
            console.error(`Transmission failed for device ${deviceId}:`, error);
            throw error;
        }
    }

    // Update device information in Firebase
    async updateDeviceInFirebase(device) {
        if (!window.database) {
            console.warn('Firebase database not available - device will be stored locally only');
            return false;
        }

        try {
            const deviceData = {
                busNumber: device.busNumber,
                routeId: device.routeId,
                cityId: device.cityId,
                driverId: device.driverId,
                status: device.status,
                connectivity: device.connectivity,
                batteryLevel: device.batteryLevel,
                lastSeen: device.lastSeen,
                location: device.location,
                signalStrength: device.signalStrength,
                metadata: device.metadata,
                registrationTime: firebase.database.ServerValue.TIMESTAMP,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            };
            
            await window.database.ref(`iot_devices/${device.deviceId}`).set(deviceData);
            console.log(`Device ${device.deviceId} successfully saved to Firebase`);
            return true;
        } catch (error) {
            console.error(`Failed to update device in Firebase: ${device.deviceId}`, error);
            throw error;
        }
    }

    // Check device connectivity status
    checkDeviceConnectivity() {
        const now = Date.now();
        
        for (const [deviceId, device] of this.devices) {
            const timeSinceLastSeen = now - device.lastSeen;
            
            if (timeSinceLastSeen > this.offlineThreshold) {
                if (device.status !== 'offline') {
                    device.status = 'offline';
                    device.connectivity = 'offline';
                    console.warn(`Device ${deviceId} appears to be offline`);
                    
                    // Update Firebase
                    this.updateDeviceInFirebase(device);
                    
                    // Notify relevant systems
                    this.notifyDeviceOffline(deviceId);
                }
            }
        }
    }

    // Start device discovery process
    startDeviceDiscovery() {
        console.log('Starting IoT device discovery...');
        
        // This would integrate with actual IoT communication protocols
        // For now, we'll simulate device discovery
        
        // WiFi-based discovery
        this.discoverWiFiDevices();
        
        // LoRaWAN device discovery
        this.discoverLoRaDevices();
        
        // Bluetooth device discovery
        this.discoverBluetoothDevices();
    }

    // WiFi device discovery
    discoverWiFiDevices() {
        console.log('Discovering WiFi IoT devices...');
        // Implementation would depend on WiFi communication protocol
    }

    // LoRaWAN device discovery
    discoverLoRaDevices() {
        console.log('Discovering LoRaWAN IoT devices...');
        // Implementation would depend on LoRaWAN gateway
    }

    // Bluetooth device discovery
    discoverBluetoothDevices() {
        console.log('Discovering Bluetooth IoT devices...');
        // Implementation would use Web Bluetooth API if available
    }

    // Notify systems when device goes offline
    notifyDeviceOffline(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return;

        // Send alert to Firebase
        const alertData = {
            type: 'device_offline',
            deviceId: deviceId,
            busNumber: device.busNumber,
            routeId: device.routeId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'active',
            message: `IoT device ${deviceId} (Bus ${device.busNumber}) has gone offline`
        };

        if (window.database) {
            window.database.ref('alerts').push(alertData).catch(error => {
                console.error('Failed to send offline alert:', error);
            });
        }

        // Notify UI if CommonUtils is available
        if (typeof CommonUtils !== 'undefined') {
            CommonUtils.showNotification(
                `Bus ${device.busNumber} IoT device offline`, 
                'warning'
            );
        }
    }

    // Get device status
    getDeviceStatus(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) return null;

        return {
            deviceId: device.deviceId,
            busNumber: device.busNumber,
            status: device.status,
            connectivity: device.connectivity,
            batteryLevel: device.batteryLevel,
            lastSeen: device.lastSeen,
            bufferSize: device.dataBuffer.length,
            location: device.location
        };
    }

    // Get all devices status
    getAllDevicesStatus() {
        const status = [];
        for (const [deviceId, device] of this.devices) {
            status.push(this.getDeviceStatus(deviceId));
        }
        return status;
    }

    // Simulate IoT device data (for testing)
    simulateDeviceData(deviceId, routeCoordinates) {
        const device = this.devices.get(deviceId);
        if (!device || !routeCoordinates || routeCoordinates.length === 0) return;

        let currentIndex = 0;
        
        const simulationInterval = setInterval(() => {
            if (currentIndex >= routeCoordinates.length) {
                currentIndex = 0; // Loop back to start
            }

            const coord = routeCoordinates[currentIndex];
            const simulatedData = {
                latitude: coord.lat + (Math.random() - 0.5) * 0.001, // Add small random variation
                longitude: coord.lng + (Math.random() - 0.5) * 0.001,
                accuracy: Math.floor(Math.random() * 10) + 5,
                timestamp: Date.now(),
                batteryLevel: Math.max(20, device.batteryLevel - Math.random() * 0.1),
                signalStrength: Math.floor(Math.random() * 100)
            };

            this.receiveGPSData(deviceId, simulatedData);
            currentIndex++;

        }, 10000 + Math.random() * 10000); // Random interval between 10-20 seconds

        return simulationInterval;
    }
}

// Initialize IoT Device Manager
const iotManager = new IoTDeviceManager();

// Make it globally available
window.IoTManager = iotManager;

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IoTDeviceManager;
}

console.log('IoT Device Integration module loaded successfully');