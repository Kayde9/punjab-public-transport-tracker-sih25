// ===================================
// Punjab Transport Tracker - Enhanced Firebase Operations
// ===================================

// Enhanced Firebase database operations for passenger features
class EnhancedFirebaseManager {
    constructor() {
        this.database = window.database;
        this.isConnected = false;
        this.cache = new Map();
        this.listeners = new Map();
    }

    // Initialize enhanced data structure in Firebase
    async initializeEnhancedData() {
        if (!this.database) {
            console.error('Firebase database not available');
            return false;
        }

        try {
            // Initialize enhanced data structure
            const enhancedData = window.PTTEnhanced;
            
            // Set up enhanced bus stops
            await this.database.ref('enhanced/bus_stops').set(enhancedData.busStops);
            
            // Set up arrival predictions structure
            await this.database.ref('enhanced/arrival_predictions').set(enhancedData.arrivalPredictions);
            
            // Set up service alerts
            await this.database.ref('enhanced/service_alerts').set(enhancedData.serviceAlerts);
            
            // Set up journey planning
            await this.database.ref('enhanced/journey_planning').set(enhancedData.journeyPlanning);
            
            console.log('✅ Enhanced data structure initialized in Firebase');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize enhanced data:', error);
            return false;
        }
    }

    // Enhanced bus tracking with passenger-focused data
    async updateBusLocation(busId, locationData) {
        if (!this.database) return;

        const enhancedLocationData = {
            ...locationData,
            timestamp: Date.now(),
            passengerInfo: {
                occupancy: locationData.occupancy || 0,
                availableSeats: Math.max(0, (locationData.capacity || 45) - (locationData.occupancy || 0)),
                wheelchairSpaces: locationData.wheelchairSpaces || 2,
                comfortLevel: this.calculateComfortLevel(locationData)
            },
            serviceInfo: {
                nextStop: locationData.nextStop,
                estimatedArrival: locationData.nextStopETA,
                delay: locationData.delay || 0,
                routeProgress: locationData.routeProgress || 0
            },
            busFeatures: locationData.features || ['GPS', 'CCTV'],
            driverInfo: {
                name: locationData.driverName,
                rating: locationData.driverRating || 5.0,
                languages: locationData.driverLanguages || ['Hindi', 'Punjabi']
            }
        };

        try {
            await this.database.ref(`enhanced/live_tracking/${busId}`).set(enhancedLocationData);
            
            // Update arrival predictions for affected stops
            await this.updateArrivalPredictions(busId, enhancedLocationData);
            
        } catch (error) {
            console.error('Error updating enhanced bus location:', error);
        }
    }

    // Calculate comfort level based on various factors
    calculateComfortLevel(locationData) {
        let comfortScore = 5.0; // Base score

        // Adjust based on occupancy
        const occupancy = locationData.occupancy || 0;
        if (occupancy > 80) comfortScore -= 1.5;
        else if (occupancy > 60) comfortScore -= 1.0;
        else if (occupancy > 40) comfortScore -= 0.5;

        // Adjust based on speed (jerky movement)
        const speed = locationData.speed || 0;
        if (speed > 60) comfortScore -= 0.5;

        // Adjust based on weather
        if (locationData.weather === 'rainy') comfortScore -= 0.3;

        return Math.max(1.0, Math.min(5.0, comfortScore));
    }

    // Update arrival predictions for bus stops
    async updateArrivalPredictions(busId, busData) {
        if (!busData.route || !busData.nextStop) return;

        try {
            const stopId = busData.nextStop;
            const predictionRef = this.database.ref(`enhanced/arrival_predictions/${stopId}/upcomingBuses`);
            
            // Get current predictions
            const snapshot = await predictionRef.once('value');
            const currentPredictions = snapshot.val() || {};
            
            // Update or add bus prediction
            const busIndex = Object.keys(currentPredictions).find(key => 
                currentPredictions[key].busId === busId
            );
            
            const newPrediction = {
                busId: busId,
                busNumber: busData.busNumber,
                routeId: busData.routeId,
                estimatedArrival: busData.nextStopETA,
                arrivalConfidence: this.calculateArrivalConfidence(busData),
                currentDelay: busData.delay || 0,
                occupancy: {
                    percentage: busData.occupancy || 0,
                    available_seats: busData.passengerInfo?.availableSeats || 0,
                    standing_room: busData.occupancy > 70 ? 'Limited' : 'Available'
                },
                driver: {
                    name: busData.driverName || 'Unknown',
                    rating: busData.driverRating || 5.0
                },
                busFeatures: busData.features || [],
                lastUpdated: Date.now()
            };

            if (busIndex) {
                await predictionRef.child(busIndex).set(newPrediction);
            } else {
                await predictionRef.push(newPrediction);
            }

        } catch (error) {
            console.error('Error updating arrival predictions:', error);
        }
    }

    // Calculate arrival confidence based on data quality and patterns
    calculateArrivalConfidence(busData) {
        let confidence = 70; // Base confidence

        // GPS accuracy
        if (busData.accuracy && busData.accuracy < 10) confidence += 20;
        else if (busData.accuracy && busData.accuracy < 50) confidence += 10;

        // Recent data
        const dataAge = Date.now() - (busData.timestamp || 0);
        if (dataAge < 30000) confidence += 10; // Less than 30 seconds

        // Historical punctuality
        if (busData.driverRating && busData.driverRating > 4.5) confidence += 5;

        // Traffic conditions
        if (busData.trafficLevel === 'low') confidence += 5;
        else if (busData.trafficLevel === 'high') confidence -= 10;

        return Math.max(50, Math.min(99, confidence));
    }

    // Enhanced service alerts management
    async createServiceAlert(alertData) {
        try {
            const alertId = `alert_${Date.now()}`;
            const enhancedAlert = {
                id: alertId,
                ...alertData,
                timestamp: Date.now(),
                isActive: true,
                affectedPassengers: await this.estimateAffectedPassengers(alertData.affectedRoutes),
                recommendations: this.generateRecommendations(alertData)
            };

            await this.database.ref(`enhanced/service_alerts/${alertId}`).set(enhancedAlert);
            
            // Notify affected stops
            if (alertData.affectedStops) {
                for (const stopId of alertData.affectedStops) {
                    await this.database.ref(`enhanced/stop_alerts/${stopId}/${alertId}`).set({
                        alertId,
                        severity: alertData.severity,
                        message: alertData.message,
                        timestamp: Date.now()
                    });
                }
            }

            console.log('✅ Service alert created:', alertId);
            return alertId;
        } catch (error) {
            console.error('❌ Error creating service alert:', error);
            return null;
        }
    }

    // Estimate affected passengers based on routes and time
    async estimateAffectedPassengers(affectedRoutes) {
        // This would typically query historical data
        // For now, return estimated values based on route popularity
        const routePassengerEstimates = {
            'CH-001': 200,
            'CH-002': 150,
            'CH-003': 180
        };

        return affectedRoutes.reduce((total, routeId) => {
            return total + (routePassengerEstimates[routeId] || 100);
        }, 0);
    }

    // Generate recommendations for service alerts
    generateRecommendations(alertData) {
        const recommendations = [];

        if (alertData.type === 'delay') {
            recommendations.push('Consider using alternative routes if available');
            recommendations.push('Check real-time updates for latest information');
        }

        if (alertData.type === 'cancellation') {
            recommendations.push('Next available bus in the same route');
            recommendations.push('Alternative routes to your destination');
        }

        if (alertData.severity === 'high') {
            recommendations.push('Allow extra travel time');
            recommendations.push('Consider rescheduling non-urgent trips');
        }

        return recommendations;
    }

    // Passenger feedback collection
    async submitFeedback(feedbackData) {
        try {
            const feedbackId = `feedback_${Date.now()}`;
            const enhancedFeedback = {
                id: feedbackId,
                ...feedbackData,
                timestamp: Date.now(),
                processed: false,
                category: this.categorizeFeedback(feedbackData.comments)
            };

            await this.database.ref(`enhanced/feedback/${feedbackId}`).set(enhancedFeedback);
            
            // Update bus/route ratings
            await this.updateRatings(feedbackData);

            console.log('✅ Feedback submitted:', feedbackId);
            return feedbackId;
        } catch (error) {
            console.error('❌ Error submitting feedback:', error);
            return null;
        }
    }

    // Categorize feedback using simple keyword matching
    categorizeFeedback(comments) {
        if (!comments) return ['general'];

        const categories = [];
        const lowerComments = comments.toLowerCase();

        if (lowerComments.includes('late') || lowerComments.includes('delay')) {
            categories.push('punctuality');
        }
        if (lowerComments.includes('clean') || lowerComments.includes('dirty')) {
            categories.push('cleanliness');
        }
        if (lowerComments.includes('driver') || lowerComments.includes('staff')) {
            categories.push('staff');
        }
        if (lowerComments.includes('crowded') || lowerComments.includes('space')) {
            categories.push('capacity');
        }
        if (lowerComments.includes('good') || lowerComments.includes('excellent')) {
            categories.push('positive');
        }
        if (lowerComments.includes('bad') || lowerComments.includes('poor')) {
            categories.push('negative');
        }

        return categories.length > 0 ? categories : ['general'];
    }

    // Update overall ratings based on feedback
    async updateRatings(feedbackData) {
        try {
            if (feedbackData.busId) {
                const busRatingRef = this.database.ref(`enhanced/bus_ratings/${feedbackData.busId}`);
                const snapshot = await busRatingRef.once('value');
                const currentRating = snapshot.val() || { total: 0, count: 0, average: 5.0 };

                const newTotal = currentRating.total + feedbackData.ratings.overall;
                const newCount = currentRating.count + 1;
                const newAverage = newTotal / newCount;

                await busRatingRef.set({
                    total: newTotal,
                    count: newCount,
                    average: Math.round(newAverage * 10) / 10
                });
            }
        } catch (error) {
            console.error('Error updating ratings:', error);
        }
    }

    // Listen for real-time arrival updates
    listenForArrivals(stopId, callback) {
        if (!this.database) return null;

        const arrivalRef = this.database.ref(`enhanced/arrival_predictions/${stopId}`);
        
        arrivalRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && callback) {
                callback(data);
            }
        });

        // Store listener for cleanup
        this.listeners.set(`arrivals_${stopId}`, arrivalRef);
        
        return arrivalRef;
    }

    // Listen for service alerts
    listenForAlerts(callback) {
        if (!this.database) return null;

        const alertsRef = this.database.ref('enhanced/service_alerts')
            .orderByChild('isActive')
            .equalTo(true);
        
        alertsRef.on('value', (snapshot) => {
            const alerts = snapshot.val() || {};
            if (callback) {
                callback(Object.values(alerts));
            }
        });

        this.listeners.set('alerts', alertsRef);
        return alertsRef;
    }

    // Cleanup listeners
    cleanup() {
        this.listeners.forEach((ref) => {
            ref.off();
        });
        this.listeners.clear();
        this.cache.clear();
    }
}

// Initialize enhanced Firebase manager
const enhancedFirebase = new EnhancedFirebaseManager();

// Make it globally available
window.EnhancedFirebase = enhancedFirebase;

// Auto-initialize when Firebase is ready
if (window.database) {
    enhancedFirebase.initializeEnhancedData().then(() => {
        console.log('🚀 Enhanced Firebase features ready');
    });
} else {
    // Wait for Firebase to initialize
    const checkFirebase = setInterval(() => {
        if (window.database) {
            clearInterval(checkFirebase);
            enhancedFirebase.initializeEnhancedData().then(() => {
                console.log('🚀 Enhanced Firebase features ready');
            });
        }
    }, 1000);
}