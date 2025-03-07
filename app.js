// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app after a simulated loading time
    setTimeout(function() {
        initApp();
    }, 2000);
});

// Main app initialization
function initApp() {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    // Check if the app is running as a PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone;
    
    // Show installation guide if not PWA and not previously dismissed
    if (!isPWA && !localStorage.getItem('installation_guide_dismissed')) {
        showInstallationGuide();
    }

    // Initialize the map
    initMap();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load user saved places
    loadSavedPlaces();
    
    // Apply user preferences from localStorage
    applyUserPreferences();
}

// Show installation guide for first-time users
function showInstallationGuide() {
    const guide = document.getElementById('installation-guide');
    if (guide) {
        guide.style.display = 'flex';
        
        document.getElementById('later-button').addEventListener('click', function() {
            guide.style.opacity = '0';
            setTimeout(() => {
                guide.style.display = 'none';
            }, 300);
            localStorage.setItem('installation_guide_dismissed', 'true');
        });
    }
}

// Initialize the map
function initMap() {
    // Create the map with Leaflet
    const map = L.map('map').setView([40.7128, -74.0060], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add location control
    L.control.locate({
        position: 'bottomright',
        strings: {
            title: "Show me where I am"
        },
        locateOptions: {
            enableHighAccuracy: true
        }
    }).addTo(map);
    
    // Add the map to global scope for access from other functions
    window.appMap = map;
    
    // Try to get user's location
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const userLocation = [position.coords.latitude, position.coords.longitude];
            map.setView(userLocation, 15);
            addUserMarker(userLocation);
            findNearbyPlaces(userLocation);
        },
        function(error) {
            console.error("Error getting location: ", error);
            showToast("Could not access your location. Please enable location services.");
        }
    );
    
    // Add map control event listeners
    document.getElementById('locate-me').addEventListener('click', function() {
        map.locate({setView: true, maxZoom: 16});
    });
    
    document.getElementById('zoom-in').addEventListener('click', function() {
        map.zoomIn();
    });
    
    document.getElementById('zoom-out').addEventListener('click', function() {
        map.zoomOut();
    });
    
    // Handle map click for adding markers
    map.on('click', function(e) {
        showLocationOptions(e.latlng);
    });
    
    // Set up the bottom panel
    initBottomPanel();
}

// Add a marker for the user's location
function addUserMarker(location) {
    if (window.userMarker) {
        window.appMap.removeLayer(window.userMarker);
    }
    
    // Custom icon for user
    const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div class="user-marker-icon"></div>',
        iconSize: [24, 24]
    });
    
    window.userMarker = L.marker(location, {
        icon: userIcon,
        zIndexOffset: 1000
    }).addTo(window.appMap);
}

// Initialize the bottom panel with category options
function initBottomPanel() {
    const bottomPanel = document.getElementById('bottom-panel');
    const handle = bottomPanel.querySelector('.handle');
    
    // Make the panel expandable
    handle.addEventListener('click', function() {
        bottomPanel.classList.toggle('expanded');
    });
    
    // Add event listeners to categories
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            const category = this.dataset.category;
            searchNearbyCategory(category);
        });
    });
}

// Find places within a category near the user
function searchNearbyCategory(category) {
    // In a real app, this would use an API like OpenStreetMap's Overpass API
    // For this example, we'll use mock data
    showToast(`Searching for ${category} nearby...`);
    
    // Simulate loading
    setTimeout(() => {
        addMockPlacesForCategory(category);
        navigateToView('nearby');
    }, 1000);
}

// Add mock places around the user's location
function addMockPlacesForCategory(category) {
    // Clear previous results
    const container = document.getElementById('nearby-places-container');
    container.innerHTML = '';
    
    // Show correct filter as active
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.classList.remove('active');
        if (filter.dataset.filter === 'all' || filter.dataset.filter === category) {
            filter.classList.add('active');
        }
    });
    
    // Get user location from map
    const center = window.appMap.getCenter();
    
    // Generate some mock places
    const mockPlaces = generateMockPlaces(center, category);
    
    // Add places to the list and map
    mockPlaces.forEach(place => {
        addPlaceCard(place, container);
        addPlaceMarker(place);
    });
}

// Generate mock place data
function generateMockPlaces(center, category) {
    const categories = {
        restaurant: {
            names: ['Delicious Bites', 'Tasty Corner', 'The Hungry Spot', 'Fine Dining', 'Cuisine Experts'],
            icon: '🍽️'
        },
        cafe: {
            names: ['Coffee Heaven', 'Morning Brew', 'Café Delight', 'Bean & Cup', 'Tea Time'],
            icon: '☕'
        },
        hotel: {
            names: ['Comfort Stay', 'Luxury Inn', 'Royal Rooms', 'Rest & Relax', 'Peaceful Lodge'],
            icon: '🏨'
        },
        attraction: {
            names: ['Amazing Views', 'Historic Site', 'Fun Land', 'Museum of Arts', 'Nature Trail'],
            icon: '🏛️'
        },
        shopping: {
            names: ['Fashion Hub', 'Mega Mall', 'Shoppers Stop', 'Brand Center', 'Market Place'],
            icon: '🛍️'
        },
        park: {
            names: ['Green Park', 'Central Gardens', 'Nature Reserve', 'Outdoor Space', 'Leisure Park'],
            icon: '🌳'
        }
    };
    
    const mockPlaces = [];
    const placesCount = Math.floor(Math.random() * 5) + 3; // 3-7 places
    
    for (let i = 0; i < placesCount; i++) {
        const cat = category || Object.keys(categories)[Math.floor(Math.random() * Object.keys(categories).length)];
        const catInfo = categories[cat];
        
        // Create a location slightly offset from center
        const lat = center.lat + (Math.random() - 0.5) * 0.02;
        const lng = center.lng + (Math.random() - 0.5) * 0.02;
        
        mockPlaces.push({
            id: 'place_' + Math.random().toString(36).substr(2, 9),
            name: catInfo.names[Math.floor(Math.random() * catInfo.names.length)],
            category: cat,
            icon: catInfo.icon,
            location: [lat, lng],
            address: `${Math.floor(Math.random() * 100) + 1} Main Street`,
            rating: (Math.random() * 2 + 3).toFixed(1), // Rating between 3.0 and 5.0
            distance: (Math.random() * 2 + 0.1).toFixed(1) // Distance in km
        });
    }
    
    return mockPlaces;
}

// Add a place card to the UI
function addPlaceCard(place, container) {
    const card = document.createElement('div');
    card.className = 'place-card';
    card.dataset.placeId = place.id;
    
    card.innerHTML = `
        <div class="place-card-img" style="background-color: #f0f0f0;"></div>
        <div class="place-card-content">
            <h3>${place.name}</h3>
            <p>${place.icon} ${place.category.charAt(0).toUpperCase() + place.category.slice(1)} · ${place.rating}★ · ${place.distance}km</p>
            <div class="place-card-actions">
                <button class="card-action-btn view-place" data-place-id="${place.id}">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                    </svg>
                    View
                </button>
                <button class="card-action-btn get-directions" data-place-id="${place.id}">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                                                <path fill="currentColor" d="M21.71,11.29l-9-9c-0.39-0.39-1.02-0.39-1.41,0l-9,9c-0.39,0.39-0.39,1.02,0,1.41l9,9c0.39,0.39,1.02,0.39,1.41,0l9-9C22.1,12.32,22.1,11.69,21.71,11.29z M14,14.5V12h-4v3H8v-4c0-0.55,0.45-1,1-1h5V7.5l3.5,3.5L14,14.5z" />
                    </svg>
                    Directions
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(card);
    
    // Add event listeners to the buttons
    card.querySelector('.view-place').addEventListener('click', function() {
        showPlaceDetails(place);
    });
    
    card.querySelector('.get-directions').addEventListener('click', function() {
        showDirectionsToPlace(place);
    });
}

// Add a marker for a place on the map
function addPlaceMarker(place) {
    const placeIcon = L.divIcon({
        className: 'place-marker',
        html: `<div class="place-marker-icon">${place.icon}</div>`,
        iconSize: [32, 32]
    });
    
    const marker = L.marker(place.location, {
        icon: placeIcon
    }).addTo(window.appMap);
    
    // Store the place data with the marker
    marker.place = place;
    
    // Add click handler
    marker.on('click', function() {
        showPlaceDetails(this.place);
    });
    
    // Store the marker for later reference
    if (!window.placeMarkers) window.placeMarkers = {};
    window.placeMarkers[place.id] = marker;
}

// Show place details in the modal
function showPlaceDetails(place) {
    // Set modal data
    document.getElementById('place-name').textContent = place.name;
    document.getElementById('place-address').textContent = place.address;
    
    // Simulate some opening hours
    const hours = Math.random() > 0.3 ? 'Open now · Closes 10 PM' : 'Closed now · Opens 9 AM tomorrow';
    document.getElementById('place-hours').textContent = hours;
    
    // Simulate a phone number
    const phone = `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
    document.getElementById('place-phone').textContent = phone;
    
    // Show the modal
    const modal = document.getElementById('place-detail-modal');
    modal.classList.add('active');
    
    // Setup close button
    document.getElementById('close-modal').addEventListener('click', function() {
        closeModal();
    });
    
    // Setup action buttons
    document.getElementById('save-place').onclick = function() {
        savePlace(place);
        showToast(`${place.name} added to saved places!`);
    };
    
    document.getElementById('share-place').onclick = function() {
        sharePlace(place);
    };
    
    document.getElementById('directions-to-place').onclick = function() {
        closeModal();
        showDirectionsToPlace(place);
    };
    
    // Handle clicks outside the modal content to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Close the modal
function closeModal() {
    const modal = document.getElementById('place-detail-modal');
    modal.classList.remove('active');
}

// Save a place to user favorites
function savePlace(place) {
    // Get existing saved places
    let savedPlaces = JSON.parse(localStorage.getItem('savedPlaces') || '[]');
    
    // Check if the place is already saved
    if (!savedPlaces.some(p => p.id === place.id)) {
        savedPlaces.push(place);
        localStorage.setItem('savedPlaces', JSON.stringify(savedPlaces));
        
        // Refresh the saved places view if it's active
        if (document.getElementById('saved-view').classList.contains('active-view')) {
            loadSavedPlaces();
        }
    }
}

// Share a place
function sharePlace(place) {
    // Use the Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: place.name,
            text: `Check out ${place.name}!`,
            url: window.location.href
        })
        .then(() => showToast('Shared successfully!'))
        .catch(err => showToast('Could not share at this time'));
    } else {
        // Fallback for browsers that don't support Web Share API
        showToast('Sharing not supported in this browser');
        // Could provide a fallback like copying location to clipboard
    }
}

// Show directions to a place
function showDirectionsToPlace(place) {
    // Navigate to the route view
    navigateToView('routes');
    
    // Set the destination in the route form
    document.getElementById('route-end').value = place.name;
    
    // Get current location for the start point
    if (window.userMarker) {
        const userLocation = window.userMarker.getLatLng();
        // We could do a reverse geocode here to get an address
        document.getElementById('route-start').value = 'My Location';
        
        // Store the coordinates for route calculation
        window.routeEndPoint = place.location;
        window.routeStartPoint = [userLocation.lat, userLocation.lng];
    }
}

// Setup event listeners for the app
function setupEventListeners() {
    // Menu button
    document.getElementById('menu-btn').addEventListener('click', function() {
        document.getElementById('sidebar').classList.add('active');
    });
    
    // Sidebar close button
    document.getElementById('sidebar-close').addEventListener('click', function() {
        document.getElementById('sidebar').classList.remove('active');
    });
    
    // Navigation items in sidebar
    document.querySelectorAll('#sidebar nav li').forEach(item => {
        item.addEventListener('click', function() {
            // Close the sidebar
            document.getElementById('sidebar').classList.remove('active');
            
            // Navigate to the selected view
            const view = this.dataset.view;
            navigateToView(view);
        });
    });
    
    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const view = this.dataset.view;
            navigateToView(view);
        });
    });
    
    // Search button
    document.getElementById('search-btn').addEventListener('click', function() {
        document.getElementById('search-overlay').classList.add('active');
        document.getElementById('search-input').focus();
    });
    
    // Search close button
    document.getElementById('search-close').addEventListener('click', function() {
        document.getElementById('search-overlay').classList.remove('active');
    });
    
    // Search input
    document.getElementById('search-input').addEventListener('input', function() {
        if (this.value.length > 2) {
            searchPlaces(this.value);
        }
    });
    
    // Category filters in nearby view
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.addEventListener('click', function() {
            const category = this.dataset.filter;
            
            if (category === 'all') {
                findNearbyPlaces();
            } else {
                searchNearbyCategory(category);
            }
        });
    });
    
    // Route calculation
    document.getElementById('calculate-route').addEventListener('click', function() {
        calculateRoute();
    });
    
    // Route mode options
    document.querySelectorAll('.route-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.route-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Current location buttons for route inputs
    document.getElementById('route-start-location').addEventListener('click', function() {
        document.getElementById('route-start').value = 'My Location';
        if (window.userMarker) {
            const location = window.userMarker.getLatLng();
            window.routeStartPoint = [location.lat, location.lng];
        }
    });
    
    document.getElementById('route-end-location').addEventListener('click', function() {
        document.getElementById('route-end').value = 'My Location';
        if (window.userMarker) {
            const location = window.userMarker.getLatLng();
            window.routeEndPoint = [location.lat, location.lng];
        }
    });
    
    // Settings toggles
    document.getElementById('dark-mode-toggle').addEventListener('change', function() {
        toggleDarkMode(this.checked);
    });
    
    document.getElementById('map-style-select').addEventListener('change', function() {
        changeMapStyle(this.value);
    });
    
    document.getElementById('clear-data').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all app data?')) {
            clearAppData();
        }
    });
}

// Navigate to a specific view
function navigateToView(viewName) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active-view');
    });
    
    // Show selected view
    document.getElementById(`${viewName}-view`).classList.add('active-view');
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });
    
    // Update sidebar nav
    document.querySelectorAll('#sidebar nav li').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });
    
    // Special handling for map view
    if (viewName === 'map' && window.appMap) {
        window.appMap.invalidateSize();
    }
}

// Search for places by name or keyword
function searchPlaces(query) {
    // In a real app, this would use a geocoding API
    const resultsContainer = document.querySelector('.search-results');
    resultsContainer.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>Searching...</p></div>';
    
    // Simulate search delay
    setTimeout(() => {
        // Generate some mock results
        const mockResults = [
            {
                name: query + ' Restaurant',
                address: '123 Main St',
                category: 'restaurant',
                distance: '0.8 km',
                icon: '🍽️'
            },
            {
                name: query + ' Café',
                address: '456 Elm St',
                category: 'cafe',
                distance: '1.2 km',
                icon: '☕'
            },
            {
                name: query + ' Park',
                address: '789 Oak St',
                category: 'park',
                distance: '1.5 km',
                icon: '🌳'
            }
        ];
        
        resultsContainer.innerHTML = '';
        
        mockResults.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result';
            resultItem.innerHTML = `
                <div class="search-result-icon">${result.icon}</div>
                <div class="search-result-info">
                    <h3>${result.name}</h3>
                    <p>${result.category} · ${result.distance}</p>
                </div>
            `;
            
            // Add click handler
            resultItem.addEventListener('click', function() {
                // Close search and navigate to location
                document.getElementById('search-overlay').classList.remove('active');
                
                // Generate a mock place
                const center = window.appMap.getCenter();
                const place = {
                    id: 'search_' + Math.random().toString(36).substr(2, 9),
                    name: result.name,
                    category: result.category,
                    icon: result.icon,
                    location: [center.lat + (Math.random() - 0.5) * 0.01, center.lng + (Math.random() - 0.5) * 0.01],
                    address: result.address,
                    rating: (Math.random() * 2 + 3).toFixed(1),
                    distance: result.distance
                };
                
                // Add marker and show details
                addPlaceMarker(place);
                window.appMap.setView(place.location, 16);
                showPlaceDetails(place);
            });
            
            resultsContainer.appendChild(resultItem);
        });
    }, 1000);
}

// Find nearby places based on user location
function findNearbyPlaces(location) {
    // In a real app, this would use a places API
    const container = document.getElementById('nearby-places-container');
    container.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>Finding places nearby...</p></div>';
    
    // Use cached location or map center if no location provided
    if (!location) {
        if (window.userMarker) {
            const userLoc = window.userMarker.getLatLng();
            location = [userLoc.lat, userLoc.lng];
        } else {
            const center = window.appMap.getCenter();
            location = [center.lat, center.lng];
        }
    }
    
    // Simulate loading delay
    setTimeout(() => {
        // Clear previous markers
        if (window.placeMarkers) {
            Object.values(window.placeMarkers).forEach(marker => {
                window.appMap.removeLayer(marker);
            });
            window.placeMarkers = {};
        }
        
        // Get mock places
        const mockPlaces = generateMockPlaces({lat: location[0], lng: location[1]});
        
        // Clear container
        container.innerHTML = '';
        
        // Add place cards and markers
        mockPlaces.forEach(place => {
            addPlaceCard(place, container);
            addPlaceMarker(place);
        });
    }, 1000);
}

// Calculate a route between two points
function calculateRoute() {
    const startInput = document.getElementById('route-start').value;
    const endInput = document.getElementById('route-end').value;
    
    if (!startInput || !endInput) {
        showToast('Please enter both start and end locations');
        return;
    }
    
    // Get selected transportation mode
    let mode = 'driving';
    document.querySelectorAll('.route-option').forEach(option => {
        if (option.classList.contains('active')) {
            mode = option.dataset.mode;
        }
    });
    
        // Simulate route calculation
        const routeResults = document.getElementById('route-results');
        routeResults.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>Calculating route...</p></div>';
        
        // Simulate loading delay
        setTimeout(() => {
            // In a real app, this would use a routing API like OpenStreetMap Routing Machine
            // For this demo, we'll generate a mock route
            
            // Make sure we have start and end points
            if (!window.routeStartPoint || !window.routeEndPoint) {
                // If we don't have actual coordinates, use random ones around the map center
                const center = window.appMap.getCenter();
                window.routeStartPoint = [center.lat - 0.01, center.lng - 0.01];
                window.routeEndPoint = [center.lat + 0.01, center.lng + 0.01];
            }
            
            // Generate mock route details
            const distance = (Math.random() * 5 + 1).toFixed(1); // 1-6km
            const duration = Math.round((parseFloat(distance) / 0.8) * 60); // Roughly 0.8km per minute
            
            // Generate route on map
            const routePoints = generateMockRoutePoints(window.routeStartPoint, window.routeEndPoint);
            displayRouteOnMap(routePoints);
            
            // Show route summary
            routeResults.innerHTML = `
                <div class="route-summary">
                    <div class="route-stats">
                        <div class="route-stat">
                            <div class="route-stat-value">${distance} km</div>
                            <div class="route-stat-label">Distance</div>
                        </div>
                        <div class="route-stat">
                            <div class="route-stat-value">${duration} min</div>
                            <div class="route-stat-label">Duration</div>
                        </div>
                        <div class="route-stat">
                            <div class="route-stat-value">${getArrivalTime(duration)}</div>
                            <div class="route-stat-label">Arrival</div>
                        </div>
                    </div>
                    <div class="route-steps">
                        ${generateMockRouteSteps(mode, duration)}
                    </div>
                </div>
                <button class="primary-btn" id="start-navigation">Start Navigation</button>
                <button class="secondary-btn" style="margin-top: 12px;" id="share-route">Share Route</button>
            `;
            
            // Add event listeners to new buttons
            document.getElementById('start-navigation').addEventListener('click', function() {
                showToast('Navigation started!');
                // In a real app, this would start turn-by-turn navigation
            });
            
            document.getElementById('share-route').addEventListener('click', function() {
                shareRoute(startInput, endInput, distance, duration);
            });
        }, 2000);
    }
    
    // Generate points for a mock route
    function generateMockRoutePoints(start, end) {
        const points = [start];
        
        // Number of points based on random distance
        const pointsCount = Math.floor(Math.random() * 5) + 3;
        
        // Generate intermediate points with some randomness
        for (let i = 1; i < pointsCount; i++) {
            const ratio = i / pointsCount;
            const lat = start[0] + (end[0] - start[0]) * ratio + (Math.random() - 0.5) * 0.005;
            const lng = start[1] + (end[1] - start[1]) * ratio + (Math.random() - 0.5) * 0.005;
            points.push([lat, lng]);
        }
        
        points.push(end);
        return points;
    }
    
    // Display a route on the map
    function displayRouteOnMap(points) {
        // Remove any existing route
        if (window.routeLine) {
            window.appMap.removeLayer(window.routeLine);
        }
        
        // Create a new route line
        window.routeLine = L.polyline(points, {
            color: '#3498db',
            weight: 5,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(window.appMap);
        
        // Fit the map to show the entire route
        window.appMap.fitBounds(window.routeLine.getBounds(), {
            padding: [50, 50]
        });
        
        // Add start and end markers
        if (window.routeMarkers) {
            window.routeMarkers.forEach(marker => window.appMap.removeLayer(marker));
        }
        
        window.routeMarkers = [];
        
        // Start marker
        const startIcon = L.divIcon({
            className: 'route-marker start',
            html: '<div class="route-marker-icon start">A</div>',
            iconSize: [32, 32]
        });
        
        const startMarker = L.marker(points[0], {
            icon: startIcon
        }).addTo(window.appMap);
        
        window.routeMarkers.push(startMarker);
        
        // End marker
        const endIcon = L.divIcon({
            className: 'route-marker end',
            html: '<div class="route-marker-icon end">B</div>',
            iconSize: [32, 32]
        });
        
        const endMarker = L.marker(points[points.length - 1], {
            icon: endIcon
        }).addTo(window.appMap);
        
        window.routeMarkers.push(endMarker);
    }
    
    // Calculate estimated arrival time
    function getArrivalTime(durationMinutes) {
        const now = new Date();
        const arrival = new Date(now.getTime() + durationMinutes * 60000);
        
        const hours = arrival.getHours();
        const minutes = arrival.getMinutes();
        
        const formattedHours = hours % 12 || 12; // Convert to 12-hour format
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    }
    
    // Generate mock route steps
    function generateMockRouteSteps(mode, duration) {
        const stepsCount = Math.floor(duration / 5) + 1; // Roughly one step every 5 minutes
        let stepsHTML = '';
        
        const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
        const streets = ['Main St', 'Oak Ave', 'Maple Rd', 'Park Blvd', 'Market St', 'Broadway', 'Washington Ave', 'River Rd'];
        
        for (let i = 0; i < stepsCount; i++) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const street = streets[Math.floor(Math.random() * streets.length)];
            const distance = (Math.random() * 1.5 + 0.1).toFixed(1); // 0.1-1.6km
            
            let icon, instruction;
            
            if (i === 0) {
                icon = '🚩';
                instruction = `Start from your location heading ${direction}`;
            } else if (i === stepsCount - 1) {
                icon = '🏁';
                instruction = `Arrive at your destination`;
            } else {
                const actions = ['Turn left', 'Turn right', 'Continue straight', 'Slight left', 'Slight right'];
                const action = actions[Math.floor(Math.random() * actions.length)];
                
                icon = '↗️';
                if (action.includes('left')) icon = '↖️';
                if (action.includes('right')) icon = '↗️';
                if (action.includes('straight')) icon = '⬆️';
                
                instruction = `${action} onto ${street} and go ${distance} km`;
            }
            
            stepsHTML += `
                <div class="route-step">
                    <div class="route-step-icon">${icon}</div>
                    <div class="route-step-text">${instruction}</div>
                </div>
            `;
        }
        
        return stepsHTML;
    }
    
    // Share a route
    function shareRoute(start, end, distance, duration) {
        // Use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'My Route',
                text: `Route from ${start} to ${end}: ${distance}km, ${duration}min`,
                url: window.location.href
            })
            .then(() => showToast('Route shared successfully!'))
            .catch(err => showToast('Could not share at this time'));
        } else {
            // Fallback for browsers that don't support Web Share API
            showToast('Sharing not supported in this browser');
        }
    }
    
    // Load user's saved places
    function loadSavedPlaces() {
        const container = document.getElementById('saved-places-container');
        
        // Get saved places from localStorage
        const savedPlaces = JSON.parse(localStorage.getItem('savedPlaces') || '[]');
        
        if (savedPlaces.length === 0) {
            // Show empty state
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="64" height="64">
                        <path fill="currentColor" d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z" />
                    </svg>
                    <p>No saved places yet</p>
                    <p class="hint">Explore the map and save places you like!</p>
                </div>
            `;
        } else {
            // Create cards for each saved place
            container.innerHTML = '';
            
            savedPlaces.forEach(place => {
                const card = document.createElement('div');
                card.className = 'place-card';
                
                card.innerHTML = `
                    <div class="place-card-img" style="background-color: #f0f0f0;"></div>
                    <div class="place-card-content">
                        <h3>${place.name}</h3>
                        <p>${place.icon} ${place.category.charAt(0).toUpperCase() + place.category.slice(1)} · ${place.rating}★</p>
                        <div class="place-card-actions">
                            <button class="card-action-btn view-saved-place" data-place-id="${place.id}">
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                                </svg>
                                View
                            </button>
                            <button class="card-action-btn remove-saved-place" data-place-id="${place.id}">
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                                </svg>
                                Remove
                            </button>
                        </div>
                    </div>
                `;
                
                container.appendChild(card);
                
                // Add event listeners
                card.querySelector('.view-saved-place').addEventListener('click', function() {
                    viewSavedPlace(place);
                });
                
                card.querySelector('.remove-saved-place').addEventListener('click', function() {
                    removeSavedPlace(place.id);
                });
            });
        }
    }
    
    // View a saved place
    function viewSavedPlace(place) {
        // Navigate to map view
        navigateToView('map');
        
        // Center map on the place
        window.appMap.setView(place.location, 16);
        
        // Add or locate the marker
        if (!window.placeMarkers || !window.placeMarkers[place.id]) {
            addPlaceMarker(place);
        }
        
        // Show place details
        showPlaceDetails(place);
    }
    
    // Remove a place from saved places
    function removeSavedPlace(placeId) {
        // Get current saved places
        let savedPlaces = JSON.parse(localStorage.getItem('savedPlaces') || '[]');
        
        // Filter out the place to remove
        savedPlaces = savedPlaces.filter(place => place.id !== placeId);
        
        // Save back to localStorage
        localStorage.setItem('savedPlaces', JSON.stringify(savedPlaces));
        
        // Refresh the view
        loadSavedPlaces();
        
        showToast('Place removed from saved places');
    }
    
    // Toggle dark mode
    function toggleDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Save preference
        localStorage.setItem('darkMode', enabled ? 'true' : 'false');
    }
    
    // Change map style
    function changeMapStyle(style) {
        // In a real app, this would switch between different map tile providers
        showToast(`Map style changed to ${style}`);
        
        // Save preference
        localStorage.setItem('mapStyle', style);
    }
    
    // Clear all app data
    function clearAppData() {
        localStorage.clear();
        showToast('All app data has been cleared');
        loadSavedPlaces(); // Refresh saved places view
    }
    
    // Apply user preferences from localStorage
    function applyUserPreferences() {
        // Apply dark mode if enabled
        const darkMode = localStorage.getItem('darkMode') === 'true';
        document.getElementById('dark-mode-toggle').checked = darkMode;
        toggleDarkMode(darkMode);
        
            // Apply map style
    const mapStyle = localStorage.getItem('mapStyle') || 'standard';
    document.getElementById('map-style-select').value = mapStyle;
    
    // In a real app, we would actually change the map tiles based on the style
}

// Show a toast notification
function showToast(message) {
    // Check if there's already a toast
    let toast = document.querySelector('.toast');
    
    if (!toast) {
        // Create new toast
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    // Set message and show
    toast.textContent = message;
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show location options when user taps on map
function showLocationOptions(latlng) {
    // Create a temporary marker
    const tempMarker = L.marker(latlng).addTo(window.appMap);
    
    // Create a popup with options
    const popup = L.popup()
        .setLatLng(latlng)
        .setContent(`
            <div class="map-popup">
                <p>What would you like to do?</p>
                <button id="popup-start-here" class="popup-btn">Start route here</button>
                <button id="popup-end-here" class="popup-btn">End route here</button>
                <button id="popup-add-place" class="popup-btn">Add a place</button>
            </div>
        `)
        .openOn(window.appMap);
    
    // Add event listeners
    setTimeout(() => {
        document.getElementById('popup-start-here').addEventListener('click', function() {
            window.routeStartPoint = [latlng.lat, latlng.lng];
            
            // Set start in route view
            document.getElementById('route-start').value = 'Selected location';
            
            // Navigate to route view
            navigateToView('routes');
            
            // Close popup
            window.appMap.closePopup();
            
            // Remove temp marker
            window.appMap.removeLayer(tempMarker);
        });
        
        document.getElementById('popup-end-here').addEventListener('click', function() {
            window.routeEndPoint = [latlng.lat, latlng.lng];
            
            // Set end in route view
            document.getElementById('route-end').value = 'Selected location';
            
            // Navigate to route view
            navigateToView('routes');
            
            // Close popup
            window.appMap.closePopup();
            
            // Remove temp marker
            window.appMap.removeLayer(tempMarker);
        });
        
        document.getElementById('popup-add-place').addEventListener('click', function() {
            addCustomPlace(latlng);
            
            // Close popup
            window.appMap.closePopup();
            
            // Remove temp marker
            window.appMap.removeLayer(tempMarker);
        });
    }, 100);
    
    // Set up popup close event
    window.appMap.on('popupclose', function() {
        // Remove temp marker if it exists
        if (window.appMap.hasLayer(tempMarker)) {
            window.appMap.removeLayer(tempMarker);
        }
    });
}

// Add a custom place
function addCustomPlace(latlng) {
    // In a real app, this would open a form to enter place details
    // For the demo, we'll create a simple prompt
    const placeName = prompt('Enter a name for this place:');
    
    if (placeName) {
        const place = {
            id: 'custom_' + Math.random().toString(36).substr(2, 9),
            name: placeName,
            category: 'custom',
            icon: '📍',
            location: [latlng.lat, latlng.lng],
            address: 'Custom location',
            rating: '5.0',
            distance: '0'
        };
        
        // Add marker
        addPlaceMarker(place);
        
        // Ask if user wants to save
        if (confirm('Would you like to save this place?')) {
            savePlace(place);
            showToast('Place saved successfully!');
        }
    }
}

// Handle app installation
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Store the event so it can be triggered later
    window.deferredPrompt = e;
    
    // Show install button if available
    const installBtn = document.getElementById('install-app');
    if (installBtn) {
        installBtn.style.display = 'block';
        
        installBtn.addEventListener('click', async () => {
            // Show the prompt
            window.deferredPrompt.prompt();
            
            // Wait for the user to respond to the prompt
            const { outcome } = await window.deferredPrompt.userChoice;
            
            // Hide button regardless of outcome
            installBtn.style.display = 'none';
            
            // We no longer need the prompt
            window.deferredPrompt = null;
            
            // Log outcome
            console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
        });
    }
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Handle online/offline status
window.addEventListener('online', function() {
    showToast('You are now online');
    // Sync any offline changes here
});

window.addEventListener('offline', function() {
    showToast('You are offline. Some features may be limited.');
});

// Handle screen size changes for responsive adjustments
window.addEventListener('resize', function() {
    if (window.appMap) {
        window.appMap.invalidateSize();
    }
});

// Add pull-to-refresh functionality
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
}, false);

document.addEventListener('touchend', function(e) {
    touchEndY = e.changedTouches[0].clientY;
    handleSwipeGesture();
}, false);

function handleSwipeGesture() {
    // Calculate swipe distance
    const swipeDistance = touchEndY - touchStartY;
    
    // If it's a pull down at the top of the page (pull-to-refresh)
    if (swipeDistance > 100 && window.scrollY === 0) {
        // Show refresh indicator
        showToast('Refreshing...');
        
        // Reload current view
        const currentView = document.querySelector('.app-view.active-view').id.replace('-view', '');
        
        // Perform view-specific refresh
        switch (currentView) {
            case 'map':
                findNearbyPlaces();
                break;
            case 'saved':
                loadSavedPlaces();
                break;
            case 'nearby':
                findNearbyPlaces();
                break;
            case 'routes':
                // Clear route results
                document.getElementById('route-results').innerHTML = '';
                break;
            case 'settings':
                // Nothing to refresh
                break;
        }
    }
}
