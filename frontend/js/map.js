// Professional Map functionality for University E-Rickshaw System
class CampusMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.userLocation = null;
        this.options = options;
        this.autoMarkers = new Map(); // Track auto markers for real-time updates
        this.init();
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Map container ${this.containerId} not found`);
            return;
        }

        // Check if Google Maps is available
        if (typeof google === 'undefined') {
            this.showFallbackMap();
            return;
        }

        this.loadGoogleMap();
    }

    showFallbackMap() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = `
            <div class="fallback-map">
                <div class="fallback-content">
                    <i class="fas fa-map-marked-alt" style="color: var(--primary-gold);"></i>
                    <h4>Campus Navigation System</h4>
                    <p>Interactive campus map showing vehicle locations and routes</p>
                    <div class="real-time-indicator">
                        <span class="pulse-dot"></span> Live Tracking Available
                    </div>
                    <div class="fallback-locations">
                        <div class="fallback-location">
                            <span class="location-marker gate-marker"></span>
                            <span>Gate 1 - Main Entrance</span>
                        </div>
                        <div class="fallback-location">
                            <span class="location-marker gate-marker"></span>
                            <span>Gate 2 - Secondary Entrance</span>
                        </div>
                        <div class="fallback-location">
                            <span class="location-marker gate-marker"></span>
                            <span>Satbari - Campus Junction</span>
                        </div>
                        <div class="fallback-location">
                            <span class="location-marker auto-marker"></span>
                            <span>Available E-Rickshaws</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadGoogleMap() {
        try {
            // Default center (University coordinates)
            const defaultCenter = { lat: 28.5360, lng: 77.3920 };
            
            this.map = new google.maps.Map(document.getElementById(this.containerId), {
                zoom: 16,
                center: defaultCenter,
                styles: this.getMapStyle(),
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_CENTER
                }
            });

            // Add campus landmarks
            this.addCampusLandmarks();
            
            // Load current autos
            this.loadAutoLocations();

            console.log('Campus Map initialized successfully');
        } catch (error) {
            console.error('Error loading Campus Map:', error);
            this.showFallbackMap();
        }
    }

    getMapStyle() {
        return [
            {
                "elementType": "geometry",
                "stylers": [{ "color": "#f8fafc" }]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#1e3a8a" }]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{ "color": "#f8fafc" }]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "administrative.land_parcel",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "administrative.neighborhood",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "poi",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [{ "color": "#ffffff" }]
            },
            {
                "featureType": "road",
                "elementType": "geometry.stroke",
                "stylers": [{ "color": "#d4d4d8" }]
            },
            {
                "featureType": "road",
                "elementType": "labels",
                "stylers": [{ "visibility": "simplified" }]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{ "color": "#e0f2fe" }]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.stroke",
                "stylers": [{ "color": "#60a5fa" }]
            },
            {
                "featureType": "transit",
                "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{ "color": "#dbeafe" }]
            },
            {
                "featureType": "water",
                "elementType": "labels.text",
                "stylers": [{ "visibility": "off" }]
            }
        ];
    }

    addCampusLandmarks() {
        const landmarks = [
            {
                position: { lat: 28.5355, lng: 77.3910 },
                title: 'Gate 1',
                type: 'gate',
                description: 'Main University Entrance',
                icon: this.getMarkerIcon('gate')
            },
            {
                position: { lat: 28.5360, lng: 77.3920 },
                title: 'Gate 2',
                type: 'gate',
                description: 'Secondary University Entrance',
                icon: this.getMarkerIcon('gate')
            },
            {
                position: { lat: 28.5370, lng: 77.3930 },
                title: 'Satbari',
                type: 'gate',
                description: 'Campus Transportation Hub',
                icon: this.getMarkerIcon('gate')
            },
            {
                position: { lat: 28.5365, lng: 77.3915 },
                title: 'Hostel Block A',
                type: 'hostel',
                description: 'Student Accommodation',
                icon: this.getMarkerIcon('hostel')
            },
            {
                position: { lat: 28.5350, lng: 77.3925 },
                title: 'Academic Block',
                type: 'academic',
                description: 'Main Academic Building',
                icon: this.getMarkerIcon('academic')
            },
            {
                position: { lat: 28.5375, lng: 77.3910 },
                title: 'Central Library',
                type: 'academic',
                description: 'University Library',
                icon: this.getMarkerIcon('academic')
            }
        ];

        landmarks.forEach(landmark => {
            const marker = new google.maps.Marker({
                position: landmark.position,
                map: this.map,
                title: landmark.title,
                icon: landmark.icon,
                zIndex: 1
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="map-popup">
                        <h4>${landmark.title}</h4>
                        <p>${landmark.description}</p>
                        <div class="location-type ${landmark.type}">
                            ${landmark.type === 'gate' ? 'Transport Hub' : 
                              landmark.type === 'hostel' ? 'Student Residence' : 
                              'Academic Facility'}
                        </div>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);
        });
    }

    getMarkerIcon(type) {
        const baseIcons = {
            gate: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#10B981',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8
            },
            hostel: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#3B82F6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8
            },
            academic: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#8B5CF6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8
            },
            auto: {
                path: 'M12,2 C13.1,2 14,2.9 14,4 L14,5 L17,5 L17,7 L16,7 L16,17.28 C16,17.62 15.81,17.95 15.45,18.11 L12.45,19.5 C12.17,19.63 11.82,19.63 11.54,19.5 L8.54,18.11 C8.19,17.95 8,17.62 8,17.28 L8,7 L7,7 L7,5 L10,5 L10,4 C10,2.9 10.9,2 12,2 Z M12,4 C11.45,4 11,4.45 11,5 L11,6 L13,6 L13,5 C13,4.45 12.55,4 12,4 Z M9,8 L9,16 L10,16 L10,8 L9,8 Z M11,8 L11,16 L12,16 L12,8 L11,8 Z M13,8 L13,16 L14,16 L14,8 L13,8 Z',
                fillColor: '#d4af37',
                fillOpacity: 1,
                strokeColor: '#1e3a8a',
                strokeWeight: 1.5,
                scale: 1.2,
                anchor: new google.maps.Point(12, 12),
                labelOrigin: new google.maps.Point(12, 6)
            },
            user: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#EF4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8
            }
        };

        return baseIcons[type] || baseIcons.auto;
    }

    async loadAutoLocations() {
        try {
            // Get auth token from global scope
            const token = window.authToken || localStorage.getItem('authToken');
            if (!token) {
                console.warn('No auth token available for map API call');
                this.addDemoAutoMarkers();
                return;
            }

            const response = await fetch('http://localhost:3000/api/autos/available', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch autos');
            }

            const data = await response.json();
            if (data.success) {
                this.addAutoMarkers(data.autos);
            } else {
                throw new Error(data.error || 'Failed to load auto data');
            }
        } catch (error) {
            console.error('Error loading auto locations:', error);
            // Add demo auto markers as fallback
            this.addDemoAutoMarkers();
        }
    }

    addAutoMarkers(autos) {
        // Clear existing auto markers
        this.clearAutoMarkers();

        if (!autos || autos.length === 0) {
            console.log('No autos available to display');
            this.showNoAutosMessage();
            return;
        }

        autos.forEach(auto => {
            // Get coordinates for auto location with slight variation for visibility
            const baseCoordinates = this.getLocationCoordinates(auto.current_location);
            const coordinates = {
                lat: baseCoordinates.lat + (Math.random() - 0.5) * 0.0002,
                lng: baseCoordinates.lng + (Math.random() - 0.5) * 0.0002
            };
            
            const marker = new google.maps.Marker({
                position: coordinates,
                map: this.map,
                title: `Vehicle ${auto.auto_number}`,
                icon: this.getMarkerIcon('auto'),
                zIndex: 10
            });

            // Create custom info window content
            const infoContent = `
                <div class="map-popup">
                    <h4>Vehicle ${auto.auto_number}</h4>
                    <div class="popup-details">
                        <p><i class="fas fa-user"></i> <strong>Driver:</strong> ${auto.driver_name}</p>
                        <p><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${this.formatLocation(auto.current_location)}</p>
                        <p><i class="fas fa-users"></i> <strong>Available Seats:</strong> ${auto.available_seats}</p>
                        ${auto.driver_rating ? `<p><i class="fas fa-star"></i> <strong>Rating:</strong> ${auto.driver_rating}/5</p>` : ''}
                    </div>
                    <div class="auto-status available">
                        <i class="fas fa-check-circle"></i> Available for Ride
                    </div>
                    ${this.containerId === 'campus-map' ? `
                        <div class="popup-actions">
                            <button class="btn-request-small" onclick="requestRideFromMap(${auto.auto_id})">
                                <i class="fas fa-car-side"></i> Request Ride
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;

            const infoWindow = new google.maps.InfoWindow({
                content: infoContent
            });

            marker.addListener('click', () => {
                // Close other open info windows
                this.markers.forEach(m => {
                    if (m.infoWindow) {
                        m.infoWindow.close();
                    }
                });
                infoWindow.open(this.map, marker);
                marker.infoWindow = infoWindow;
            });

            // Store marker reference for real-time updates
            this.autoMarkers.set(auto.auto_id, marker);
            this.markers.push(marker);
        });

        console.log(`Added ${autos.length} vehicle markers to map`);
        
        // Adjust map bounds to show all autos if there are multiple
        if (autos.length > 1) {
            this.fitMapToMarkers();
        }
    }

    showNoAutosMessage() {
        const container = document.getElementById(this.containerId);
        const noAutosDiv = document.createElement('div');
        noAutosDiv.className = 'map-overlay-message';
        noAutosDiv.innerHTML = `
            <div class="overlay-content">
                <i class="fas fa-rickshaw"></i>
                <h4>No Vehicles Available</h4>
                <p>Currently no e-rickshaws are available at your selected location.</p>
                <p class="real-time-indicator"><span class="pulse-dot"></span> Monitoring for new vehicles...</p>
            </div>
        `;
        container.appendChild(noAutosDiv);
    }

    clearAutoMarkers() {
        // Remove auto markers from map and clear tracking
        this.autoMarkers.forEach((marker, autoId) => {
            marker.setMap(null);
            if (marker.infoWindow) {
                marker.infoWindow.close();
            }
        });
        this.autoMarkers.clear();
        
        // Remove auto markers from main markers array
        this.markers = this.markers.filter(marker => {
            const isAutoMarker = Array.from(this.autoMarkers.values()).includes(marker);
            if (isAutoMarker) {
                return false;
            }
            return true;
        });

        // Remove any overlay messages
        const container = document.getElementById(this.containerId);
        const overlay = container.querySelector('.map-overlay-message');
        if (overlay) {
            overlay.remove();
        }
    }

    addDemoAutoMarkers() {
        console.log('Adding demo vehicle markers');
        
        const demoAutos = [
            { 
                position: { lat: 28.5357, lng: 77.3912 }, 
                number: 'A1', 
                driver: 'Rajesh Kumar', 
                seats: 4,
                location: 'Gate 1',
                auto_id: 1
            },
            { 
                position: { lat: 28.5362, lng: 77.3922 }, 
                number: 'A2', 
                driver: 'Mohan Singh', 
                seats: 3,
                location: 'Gate 2',
                auto_id: 2
            },
            { 
                position: { lat: 28.5372, lng: 77.3932 }, 
                number: 'A3', 
                driver: 'Suresh Patel', 
                seats: 2,
                location: 'Satbari',
                auto_id: 3
            }
        ];

        demoAutos.forEach(auto => {
            const marker = new google.maps.Marker({
                position: auto.position,
                map: this.map,
                title: `Vehicle ${auto.number}`,
                icon: this.getMarkerIcon('auto'),
                zIndex: 10
            });

            const infoContent = `
                <div class="map-popup">
                    <h4>Vehicle ${auto.number}</h4>
                    <div class="popup-details">
                        <p><i class="fas fa-user"></i> <strong>Driver:</strong> ${auto.driver}</p>
                        <p><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${auto.location}</p>
                        <p><i class="fas fa-users"></i> <strong>Available Seats:</strong> ${auto.seats}</p>
                        <p><i class="fas fa-star"></i> <strong>Rating:</strong> 4.5/5</p>
                    </div>
                    <div class="auto-status available">
                        <i class="fas fa-check-circle"></i> Available for Ride
                    </div>
                    ${this.containerId === 'campus-map' ? `
                        <div class="popup-actions">
                            <button class="btn-request-small" onclick="requestRideFromMap(${auto.auto_id})">
                                <i class="fas fa-car-side"></i> Request Ride
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;

            const infoWindow = new google.maps.InfoWindow({
                content: infoContent
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            this.autoMarkers.set(auto.auto_id, marker);
            this.markers.push(marker);
        });

        // Adjust map bounds to show all demo autos
        this.fitMapToMarkers();
    }

    fitMapToMarkers() {
        const bounds = new google.maps.LatLngBounds();
        
        this.autoMarkers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });

        // Also include landmarks in bounds
        this.markers.forEach(marker => {
            if (!this.autoMarkers.has(marker.auto_id)) { // Only include non-auto markers
                bounds.extend(marker.getPosition());
            }
        });

        if (!bounds.isEmpty()) {
            this.map.fitBounds(bounds);
            
            // Don't zoom in too close if there are only a few markers
            const zoom = this.map.getZoom();
            if (zoom > 17) {
                this.map.setZoom(17);
            }
        }
    }

    getLocationCoordinates(location) {
        const locations = {
            'Gate1': { lat: 28.5355, lng: 77.3910 },
            'Gate2': { lat: 28.5360, lng: 77.3920 },
            'Satbari': { lat: 28.5370, lng: 77.3930 },
            'OnRoute': { lat: 28.5365, lng: 77.3925 },
            'Hostel Block A': { lat: 28.5365, lng: 77.3915 },
            'Academic Block': { lat: 28.5350, lng: 77.3925 },
            'Library': { lat: 28.5375, lng: 77.3910 }
        };
        return locations[location] || locations['Gate2'];
    }

    formatLocation(location) {
        const locations = {
            'Gate1': 'Gate 1 - Main Entrance',
            'Gate2': 'Gate 2 - Secondary Entrance',
            'Satbari': 'Satbari Junction',
            'OnRoute': 'Currently Moving',
            'Hostel Block A': 'Hostel Block A',
            'Academic Block': 'Academic Block',
            'Library': 'Central Library'
        };
        return locations[location] || location;
    }

    locateUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    // Remove existing user marker
                    this.clearUserMarker();

                    // Add user marker
                    const userMarker = new google.maps.Marker({
                        position: this.userLocation,
                        map: this.map,
                        title: 'Your Current Location',
                        icon: this.getMarkerIcon('user'),
                        zIndex: 100
                    });

                    // Create info window for user location
                    const infoWindow = new google.maps.InfoWindow({
                        content: `
                            <div class="map-popup">
                                <h4>Your Location</h4>
                                <p>You are here! This is your current position on campus.</p>
                                <div class="location-type user">
                                    <i class="fas fa-location-arrow"></i> Current Position
                                </div>
                            </div>
                        `
                    });

                    userMarker.addListener('click', () => {
                        infoWindow.open(this.map, userMarker);
                    });

                    // Store user marker reference
                    this.userMarker = userMarker;
                    this.markers.push(userMarker);

                    // Center map on user with smooth animation
                    this.map.panTo(this.userLocation);
                    
                    showNotification('Your location has been added to the map', 'success');
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    let errorMessage = 'Unable to determine your location. ';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Location access was denied. Please enable location services in your browser settings.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Location request timed out. Please try again.';
                            break;
                        default:
                            errorMessage += 'An unknown error occurred.';
                    }
                    
                    showNotification(errorMessage, 'error');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        } else {
            showNotification('Geolocation is not supported by your browser', 'error');
        }
    }

    clearUserMarker() {
        if (this.userMarker) {
            this.userMarker.setMap(null);
            this.markers = this.markers.filter(marker => marker !== this.userMarker);
            this.userMarker = null;
        }
    }

    refresh() {
        this.loadAutoLocations();
        showNotification('Map updated with latest vehicle locations', 'info');
    }

    // Update specific auto marker in real-time
    updateAutoLocation(autoId, newLocation) {
        const marker = this.autoMarkers.get(autoId);
        if (marker) {
            const newCoordinates = this.getLocationCoordinates(newLocation);
            marker.setPosition(newCoordinates);
            
            // Add animation for movement
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => {
                marker.setAnimation(null);
            }, 1500);
        }
    }

    // Clean up method to remove all markers
    destroy() {
        this.markers.forEach(marker => {
            marker.setMap(null);
        });
        this.markers = [];
        this.autoMarkers.clear();
        this.userMarker = null;
    }
}

// Global map instances
let studentMap = null;
let adminMap = null;
let driverMap = null;

// Initialize maps when dashboard loads
function initializeStudentMap() {
    if (document.getElementById('campus-map')) {
        // Destroy existing map if any
        if (studentMap) {
            studentMap.destroy();
        }
        
        studentMap = new CampusMap('campus-map', {
            showUserLocation: true,
            enableRealTimeUpdates: true
        });
        
        // Add event listeners for map controls
        const refreshBtn = document.getElementById('refresh-map');
        const locateBtn = document.getElementById('locate-me');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                studentMap.refresh();
            });
        }
        
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                studentMap.locateUser();
            });
        }
        
        console.log('Student campus map initialized');
    }
}

function initializeDriverMap() {
    if (document.getElementById('driver-map')) {
        // Destroy existing map if any
        if (driverMap) {
            driverMap.destroy();
        }
        
        driverMap = new CampusMap('driver-map', {
            showUserLocation: true,
            enableNavigation: true
        });
        
        console.log('Driver navigation map initialized');
    }
}

function initializeAdminMap() {
    if (document.getElementById('admin-map')) {
        // Destroy existing map if any
        if (adminMap) {
            adminMap.destroy();
        }
        
        adminMap = new CampusMap('admin-map', {
            showAllVehicles: true,
            enableRealTimeTracking: true
        });
        
        // Add event listeners for admin map controls
        const refreshBtn = document.getElementById('admin-refresh-map');
        const autoLocationsBtn = document.getElementById('auto-locations');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                adminMap.refresh();
            });
        }
        
        if (autoLocationsBtn) {
            autoLocationsBtn.addEventListener('click', () => {
                adminMap.loadAutoLocations();
            });
        }
        
        console.log('Admin tracking map initialized');
    }
}

// Function to request ride directly from map popup
function requestRideFromMap(autoId) {
    if (window.requestRide) {
        window.requestRide(autoId);
    } else {
        showNotification('Please select pickup and dropoff points first', 'warning');
    }
}

// Real-time map updates via Socket.io
function initializeMapRealTime() {
    if (typeof io !== 'undefined' && window.socket) {
        const socket = window.socket;
        
        socket.on('location_updated', (data) => {
            console.log('Real-time location update received:', data);
            
            // Update maps when auto locations update
            if (studentMap) {
                studentMap.updateAutoLocation(data.auto_id, data.current_location);
            }
            if (adminMap) {
                adminMap.updateAutoLocation(data.auto_id, data.current_location);
            }
        });

        socket.on('driver_status_changed', (data) => {
            console.log('Driver status updated:', data);
            // Refresh maps to reflect status changes
            if (studentMap) studentMap.refresh();
            if (adminMap) adminMap.refresh();
        });

        socket.on('new_ride_request', (data) => {
            console.log('New ride request received:', data);
            // Admin might want to see new ride requests on map
            if (adminMap) {
                adminMap.refresh();
            }
        });

        socket.on('auto_added', (data) => {
            console.log('New vehicle added:', data);
            if (studentMap) studentMap.refresh();
            if (adminMap) adminMap.refresh();
        });

        socket.on('driver_added', (data) => {
            console.log('New driver added:', data);
            if (adminMap) adminMap.refresh();
        });
        
        console.log('Map real-time updates enabled');
    } else {
        console.warn('Socket.io not available for real-time map updates');
    }
}

// Initialize all maps when user logs in
function initializeAllMaps() {
    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
        initializeStudentMap();
        initializeDriverMap();
        initializeAdminMap();
        initializeMapRealTime();
    }, 1000);
}

// Export functions for global access
window.initializeStudentMap = initializeStudentMap;
window.initializeDriverMap = initializeDriverMap;
window.initializeAdminMap = initializeAdminMap;
window.initializeAllMaps = initializeAllMaps;
window.requestRideFromMap = requestRideFromMap;