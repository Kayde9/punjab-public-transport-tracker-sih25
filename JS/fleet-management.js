// ===================================
// Punjab Transport Tracker - Fleet Management System
// ===================================

/**
 * Fleet Management Module
 * Handles driver registration, vehicle management, and fleet operations
 */

class FleetManager {
    constructor() {
        this.drivers = new Map();
        this.vehicles = new Map();
        this.assignments = new Map();
        this.pendingApplications = new Map();
        
        console.log('Fleet Manager initialized');
        this.initializeFleetManagement();
    }

    // Initialize fleet management system
    initializeFleetManagement() {
        // Load existing data from Firebase
        this.loadExistingData();
        
        // Set up real-time listeners
        this.setupRealtimeListeners();
        
        // Initialize validation rules
        this.initializeValidationRules();
    }

    // ===================================
    // Driver Management Functions
    // ===================================

    // Register a new driver
    async registerDriver(driverData) {
        try {
            // Validate driver data
            const validationResult = this.validateDriverData(driverData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.message);
            }

            // Generate unique driver ID
            const driverId = this.generateDriverId(driverData.city);

            const driver = {
                id: driverId,
                personalInfo: {
                    name: driverData.name.trim(),
                    fatherName: driverData.fatherName?.trim() || '',
                    dateOfBirth: driverData.dateOfBirth,
                    gender: driverData.gender,
                    bloodGroup: driverData.bloodGroup || '',
                    maritalStatus: driverData.maritalStatus || 'single'
                },
                contactInfo: {
                    phone: driverData.phone.trim(),
                    alternatePhone: driverData.alternatePhone?.trim() || '',
                    email: driverData.email?.trim() || '',
                    address: {
                        street: driverData.address.street.trim(),
                        city: driverData.address.city.trim(),
                        state: driverData.address.state || 'Punjab',
                        pincode: driverData.address.pincode.trim(),
                        district: driverData.address.district?.trim() || ''
                    }
                },
                documentation: {
                    aadharNumber: driverData.aadharNumber?.trim() || '',
                    panNumber: driverData.panNumber?.trim() || '',
                    drivingLicense: {
                        number: driverData.licenseNumber.trim(),
                        issueDate: driverData.licenseIssueDate,
                        expiryDate: driverData.licenseExpiryDate,
                        issuingAuthority: driverData.licenseAuthority?.trim() || '',
                        categories: driverData.licenseCategories || ['LMV', 'MCWG']
                    }
                },
                employment: {
                    employeeId: this.generateEmployeeId(),
                    joinDate: new Date().toISOString(),
                    department: 'Transport',
                    designation: 'Bus Driver',
                    workingCity: driverData.city,
                    shiftPreference: driverData.shiftPreference || 'any',
                    emergencyContact: {
                        name: driverData.emergencyContactName?.trim() || '',
                        relation: driverData.emergencyContactRelation?.trim() || '',
                        phone: driverData.emergencyContactPhone?.trim() || ''
                    }
                },
                qualifications: {
                    experience: {
                        totalYears: parseInt(driverData.experience) || 0,
                        previousEmployers: driverData.previousEmployers || [],
                        specialTraining: driverData.specialTraining || []
                    },
                    certifications: driverData.certifications || [],
                    languages: driverData.languages || ['Hindi', 'Punjabi']
                },
                medical: {
                    lastCheckupDate: driverData.medicalCheckupDate || null,
                    fitnessStatus: 'pending_verification',
                    restrictions: driverData.medicalRestrictions || [],
                    nextCheckupDue: this.calculateNextMedicalCheckup()
                },
                system: {
                    status: 'pending_approval',
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    createdBy: 'admin',
                    approvedAt: null,
                    approvedBy: null,
                    isActive: false,
                    loginCredentials: {
                        username: driverId,
                        temporaryPassword: this.generateTempPassword(),
                        passwordChanged: false,
                        lastLogin: null
                    }
                },
                performance: {
                    rating: 5.0,
                    totalTrips: 0,
                    completedTrips: 0,
                    punctualityScore: 100,
                    safetyScore: 100,
                    customerRating: 5.0,
                    incidents: [],
                    commendations: []
                }
            };

            // Store in local map
            this.drivers.set(driverId, driver);

            // Save to Firebase
            await this.saveDriverToFirebase(driver);

            console.log(`Driver registered successfully: ${driverId}`);
            return {
                success: true,
                driverId: driverId,
                temporaryPassword: driver.system.loginCredentials.temporaryPassword,
                message: 'Driver registered successfully. Pending admin approval.'
            };

        } catch (error) {
            console.error('Error registering driver:', error);
            throw error;
        }
    }

    // Validate driver data
    validateDriverData(data) {
        const errors = [];

        // Required fields validation
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }

        if (!data.phone || !this.validatePhoneNumber(data.phone)) {
            errors.push('Valid phone number is required');
        }

        if (!data.licenseNumber || data.licenseNumber.trim().length < 8) {
            errors.push('Valid driving license number is required');
        }

        if (!data.dateOfBirth || !this.validateAge(data.dateOfBirth)) {
            errors.push('Driver must be between 18 and 65 years old');
        }

        if (!data.city || !PTTConfig.data.cities[data.city]) {
            errors.push('Valid working city must be selected');
        }

        if (!data.address || !data.address.street || !data.address.pincode) {
            errors.push('Complete address is required');
        }

        // Check for duplicate phone number
        if (this.isDuplicatePhone(data.phone)) {
            errors.push('Phone number already registered');
        }

        // Check for duplicate license number
        if (this.isDuplicateLicense(data.licenseNumber)) {
            errors.push('Driving license already registered');
        }

        return {
            isValid: errors.length === 0,
            message: errors.join(', '),
            errors: errors
        };
    }

    // ===================================
    // Vehicle Management Functions
    // ===================================

    // Register a new vehicle
    async registerVehicle(vehicleData) {
        try {
            // Validate vehicle data
            const validationResult = this.validateVehicleData(vehicleData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.message);
            }

            const vehicle = {
                id: vehicleData.registrationNumber.toUpperCase(),
                basicInfo: {
                    registrationNumber: vehicleData.registrationNumber.toUpperCase(),
                    chassisNumber: vehicleData.chassisNumber?.toUpperCase() || '',
                    engineNumber: vehicleData.engineNumber?.toUpperCase() || '',
                    vehicleType: vehicleData.vehicleType || 'bus',
                    category: vehicleData.category || 'public_transport'
                },
                specifications: {
                    make: vehicleData.make?.trim() || '',
                    model: vehicleData.model?.trim() || '',
                    year: parseInt(vehicleData.manufacturingYear) || new Date().getFullYear(),
                    fuelType: vehicleData.fuelType || 'diesel',
                    engineCapacity: vehicleData.engineCapacity || '',
                    seatingCapacity: parseInt(vehicleData.seatingCapacity) || 45,
                    standingCapacity: parseInt(vehicleData.standingCapacity) || 20,
                    totalCapacity: (parseInt(vehicleData.seatingCapacity) || 45) + (parseInt(vehicleData.standingCapacity) || 20),
                    gvw: vehicleData.grossVehicleWeight || '',
                    wheelBase: vehicleData.wheelBase || '',
                    bodyType: vehicleData.bodyType || 'standard'
                },
                documentation: {
                    registrationCertificate: {
                        number: vehicleData.rcNumber || '',
                        issueDate: vehicleData.rcIssueDate || null,
                        expiryDate: vehicleData.rcExpiryDate || null,
                        authority: vehicleData.rcAuthority || ''
                    },
                    insurance: {
                        policyNumber: vehicleData.insurancePolicyNumber || '',
                        provider: vehicleData.insuranceProvider || '',
                        startDate: vehicleData.insuranceStartDate || null,
                        expiryDate: vehicleData.insuranceExpiryDate || null,
                        coverageType: vehicleData.insuranceCoverage || 'comprehensive'
                    },
                    permit: {
                        number: vehicleData.permitNumber || '',
                        type: vehicleData.permitType || 'stage_carriage',
                        issueDate: vehicleData.permitIssueDate || null,
                        expiryDate: vehicleData.permitExpiryDate || null,
                        routes: vehicleData.authorizedRoutes || []
                    },
                    fitness: {
                        certificateNumber: vehicleData.fitnessNumber || '',
                        issueDate: vehicleData.fitnessIssueDate || null,
                        expiryDate: vehicleData.fitnessExpiryDate || null,
                        nextDue: vehicleData.fitnessNextDue || null
                    },
                    pollution: {
                        certificateNumber: vehicleData.pucNumber || '',
                        issueDate: vehicleData.pucIssueDate || null,
                        expiryDate: vehicleData.pucExpiryDate || null,
                        emissionNorms: vehicleData.emissionNorms || 'BS6'
                    }
                },
                features: {
                    hasAC: vehicleData.features?.includes('AC') || false,
                    hasGPS: vehicleData.features?.includes('GPS') || true,
                    hasCCTV: vehicleData.features?.includes('CCTV') || false,
                    hasWiFi: vehicleData.features?.includes('WiFi') || false,
                    hasUSBCharging: vehicleData.features?.includes('USB') || false,
                    wheelchairAccessible: vehicleData.features?.includes('Wheelchair') || false,
                    emergencyFeatures: vehicleData.emergencyFeatures || ['First Aid Kit', 'Fire Extinguisher'],
                    audioAnnouncement: vehicleData.features?.includes('Audio') || false,
                    digitalDisplay: vehicleData.features?.includes('Display') || false
                },
                operational: {
                    assignedCity: vehicleData.city,
                    assignedRoutes: [],
                    currentDriver: null,
                    status: 'available', // available, in_service, maintenance, out_of_service
                    lastServiceDate: vehicleData.lastServiceDate || null,
                    nextServiceDue: this.calculateNextService(vehicleData.lastServiceDate),
                    currentMileage: parseInt(vehicleData.currentMileage) || 0,
                    averageMileage: 0,
                    workingDays: vehicleData.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                    shiftType: vehicleData.shiftType || 'full_day'
                },
                maintenance: {
                    maintenanceSchedule: 'monthly',
                    lastMaintenance: vehicleData.lastMaintenanceDate || null,
                    nextMaintenance: this.calculateNextMaintenance(vehicleData.lastMaintenanceDate),
                    maintenanceHistory: [],
                    serviceProvider: vehicleData.serviceProvider || '',
                    warrantyStatus: vehicleData.warrantyStatus || 'expired',
                    warrantyExpiryDate: vehicleData.warrantyExpiryDate || null
                },
                performance: {
                    totalKilometers: parseInt(vehicleData.currentMileage) || 0,
                    fuelEfficiency: 0,
                    breakdownCount: 0,
                    utilizationRate: 0,
                    passengerRating: 5.0,
                    onTimePerformance: 100,
                    lastBreakdown: null,
                    accidentHistory: []
                },
                system: {
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    createdBy: 'admin',
                    status: 'pending_verification',
                    isActive: false,
                    iotDeviceId: null,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                }
            };

            // Store in local map
            this.vehicles.set(vehicle.id, vehicle);

            // Save to Firebase
            await this.saveVehicleToFirebase(vehicle);

            console.log(`Vehicle registered successfully: ${vehicle.id}`);
            return {
                success: true,
                vehicleId: vehicle.id,
                message: 'Vehicle registered successfully. Pending verification.'
            };

        } catch (error) {
            console.error('Error registering vehicle:', error);
            throw error;
        }
    }

    // Validate vehicle data
    validateVehicleData(data) {
        const errors = [];

        // Required fields validation
        if (!data.registrationNumber || !this.validateRegistrationNumber(data.registrationNumber)) {
            errors.push('Valid registration number is required (e.g., PB-01-AB-1234)');
        }

        if (!data.seatingCapacity || parseInt(data.seatingCapacity) < 10 || parseInt(data.seatingCapacity) > 100) {
            errors.push('Seating capacity must be between 10 and 100');
        }

        if (!data.city || !PTTConfig.data.cities[data.city]) {
            errors.push('Valid operating city must be selected');
        }

        if (data.manufacturingYear && (parseInt(data.manufacturingYear) < 1990 || parseInt(data.manufacturingYear) > new Date().getFullYear() + 1)) {
            errors.push('Manufacturing year must be between 1990 and current year');
        }

        // Check for duplicate registration number
        if (this.isDuplicateRegistration(data.registrationNumber)) {
            errors.push('Vehicle registration number already exists');
        }

        return {
            isValid: errors.length === 0,
            message: errors.join(', '),
            errors: errors
        };
    }

    // ===================================
    // Assignment Management
    // ===================================

    // Assign driver to vehicle
    async assignDriverToVehicle(driverId, vehicleId, routeId) {
        try {
            const driver = this.drivers.get(driverId);
            const vehicle = this.vehicles.get(vehicleId);

            if (!driver) {
                throw new Error('Driver not found');
            }

            if (!vehicle) {
                throw new Error('Vehicle not found');
            }

            if (driver.system.status !== 'approved') {
                throw new Error('Driver is not approved yet');
            }

            if (vehicle.system.status !== 'active') {
                throw new Error('Vehicle is not active');
            }

            // Check if driver is already assigned
            if (driver.currentAssignment && driver.currentAssignment.vehicleId) {
                throw new Error('Driver is already assigned to another vehicle');
            }

            // Check if vehicle is already assigned
            if (vehicle.operational.currentDriver) {
                throw new Error('Vehicle is already assigned to another driver');
            }

            const assignment = {
                id: `${driverId}_${vehicleId}_${Date.now()}`,
                driverId: driverId,
                vehicleId: vehicleId,
                routeId: routeId,
                assignedDate: new Date().toISOString(),
                assignedBy: 'admin',
                status: 'active',
                shiftDetails: {
                    startTime: '06:00',
                    endTime: '22:00',
                    shiftType: 'full_day',
                    workingDays: vehicle.operational.workingDays
                }
            };

            // Update driver assignment
            driver.currentAssignment = {
                vehicleId: vehicleId,
                routeId: routeId,
                assignmentId: assignment.id,
                assignedDate: assignment.assignedDate
            };

            // Update vehicle assignment
            vehicle.operational.currentDriver = driverId;
            vehicle.operational.status = 'in_service';

            // Store assignment
            this.assignments.set(assignment.id, assignment);

            // Update Firebase
            await Promise.all([
                this.updateDriverInFirebase(driver),
                this.updateVehicleInFirebase(vehicle),
                this.saveAssignmentToFirebase(assignment)
            ]);

            return {
                success: true,
                assignmentId: assignment.id,
                message: 'Driver assigned to vehicle successfully'
            };

        } catch (error) {
            console.error('Error assigning driver to vehicle:', error);
            throw error;
        }
    }

    // ===================================
    // Utility Functions
    // ===================================

    // Generate unique driver ID
    generateDriverId(city) {
        const cityCode = city.substring(0, 2).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `DR${cityCode}${timestamp}${random}`;
    }

    // Generate unique employee ID
    generateEmployeeId() {
        const year = new Date().getFullYear().toString().slice(-2);
        const timestamp = Date.now().toString().slice(-6);
        return `EMP${year}${timestamp}`;
    }

    // Generate temporary password
    generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // Validate phone number
    validatePhoneNumber(phone) {
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        return phoneRegex.test(phone.replace(/\s+/g, ''));
    }

    // Validate age
    validateAge(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age >= 18 && age <= 65;
    }

    // Validate registration number
    validateRegistrationNumber(regNo) {
        const regexPunjab = /^PB[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}$/i;
        return regexPunjab.test(regNo.replace(/\s+/g, ''));
    }

    // Check for duplicate phone
    isDuplicatePhone(phone) {
        for (const driver of this.drivers.values()) {
            if (driver.contactInfo.phone === phone) {
                return true;
            }
        }
        return false;
    }

    // Check for duplicate license
    isDuplicateLicense(license) {
        for (const driver of this.drivers.values()) {
            if (driver.documentation.drivingLicense.number === license) {
                return true;
            }
        }
        return false;
    }

    // Check for duplicate registration
    isDuplicateRegistration(regNo) {
        return this.vehicles.has(regNo.toUpperCase());
    }

    // Calculate next medical checkup date
    calculateNextMedicalCheckup() {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear.toISOString().split('T')[0];
    }

    // Calculate next service date
    calculateNextService(lastServiceDate) {
        if (!lastServiceDate) {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return nextMonth.toISOString().split('T')[0];
        }
        
        const lastService = new Date(lastServiceDate);
        lastService.setMonth(lastService.getMonth() + 1);
        return lastService.toISOString().split('T')[0];
    }

    // Calculate next maintenance date
    calculateNextMaintenance(lastMaintenanceDate) {
        if (!lastMaintenanceDate) {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return nextMonth.toISOString().split('T')[0];
        }
        
        const lastMaintenance = new Date(lastMaintenanceDate);
        lastMaintenance.setMonth(lastMaintenance.getMonth() + 1);
        return lastMaintenance.toISOString().split('T')[0];
    }

    // ===================================
    // Firebase Integration
    // ===================================

    // Save driver to Firebase
    async saveDriverToFirebase(driver) {
        if (!window.database) {
            throw new Error('Firebase database not available');
        }

        try {
            await window.database.ref(`drivers/${driver.id}`).set(driver);
            console.log(`Driver saved to Firebase: ${driver.id}`);
        } catch (error) {
            console.error('Error saving driver to Firebase:', error);
            throw error;
        }
    }

    // Save vehicle to Firebase
    async saveVehicleToFirebase(vehicle) {
        if (!window.database) {
            throw new Error('Firebase database not available');
        }

        try {
            await window.database.ref(`vehicles/${vehicle.id}`).set(vehicle);
            console.log(`Vehicle saved to Firebase: ${vehicle.id}`);
        } catch (error) {
            console.error('Error saving vehicle to Firebase:', error);
            throw error;
        }
    }

    // Update driver in Firebase
    async updateDriverInFirebase(driver) {
        if (!window.database) return;

        try {
            await window.database.ref(`drivers/${driver.id}`).update(driver);
        } catch (error) {
            console.error('Error updating driver in Firebase:', error);
            throw error;
        }
    }

    // Update vehicle in Firebase
    async updateVehicleInFirebase(vehicle) {
        if (!window.database) return;

        try {
            await window.database.ref(`vehicles/${vehicle.id}`).update(vehicle);
        } catch (error) {
            console.error('Error updating vehicle in Firebase:', error);
            throw error;
        }
    }

    // Save assignment to Firebase
    async saveAssignmentToFirebase(assignment) {
        if (!window.database) return;

        try {
            await window.database.ref(`assignments/${assignment.id}`).set(assignment);
        } catch (error) {
            console.error('Error saving assignment to Firebase:', error);
            throw error;
        }
    }

    // Load existing data
    loadExistingData() {
        // Implementation for loading existing drivers and vehicles from Firebase
        console.log('Loading existing fleet data...');
    }

    // Setup realtime listeners
    setupRealtimeListeners() {
        // Implementation for real-time data synchronization
        console.log('Setting up real-time listeners...');
    }

    // Initialize validation rules
    initializeValidationRules() {
        // Implementation for validation rule setup
        console.log('Validation rules initialized');
    }

    // Get all drivers
    getAllDrivers() {
        return Array.from(this.drivers.values());
    }

    // Get all vehicles
    getAllVehicles() {
        return Array.from(this.vehicles.values());
    }

    // Get driver by ID
    getDriver(driverId) {
        return this.drivers.get(driverId);
    }

    // Get vehicle by ID
    getVehicle(vehicleId) {
        return this.vehicles.get(vehicleId);
    }
}

// Initialize Fleet Manager
const fleetManager = new FleetManager();

// Make it globally available
window.FleetManager = fleetManager;

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FleetManager;
}

console.log('Fleet Management system loaded successfully');