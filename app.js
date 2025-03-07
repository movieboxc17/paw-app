// Immediately check if we're running as PWA when script loads
(function() {
    // Immediately check if we're running as PWA when script loads
    const runningAsPWA = 
        window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://');
    
    if (runningAsPWA) {
        console.log('Running as PWA - setting flag');
        localStorage.setItem('app_installed', 'true');
        
        // Hide installation guide immediately if it exists
        document.addEventListener('DOMContentLoaded', function() {
            const guide = document.getElementById('installation-guide');
            if (guide) {
                guide.style.display = 'none';
            }
        });
    }
    
    // Debug info
    console.log('Display mode standalone:', window.matchMedia('(display-mode: standalone)').matches);
    console.log('Navigator standalone:', window.navigator.standalone);
    console.log('Referrer includes android-app:', document.referrer.includes('android-app://'));
    console.log('LocalStorage app_installed:', localStorage.getItem('app_installed'));
})();

// Global variables
window.appMap = null;
window.userLocation = null;
window.routeStartPoint = null;
window.routeEndPoint = null;
window.routeLine = null;
window.routeMarkers = [];
window.placeMarkers = {};
window.deferredPrompt = null;

// Initialize app
function initApp() {
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    // Force check if standalone
    const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://') ||
        localStorage.getItem('app_installed') === 'true';
    
    console.log('Is standalone mode (in initApp):', isStandalone);
    
    // If app is in standalone mode, ALWAYS set the installed flag
    if (isStandalone) {
        localStorage.setItem('app_installed', 'true');
    }
    
    // Only show installation guide if definitely not installed
    const guide = document.getElementById('installation-guide');
    if (guide) {
        if (isStandalone || localStorage.getItem('app_installed') === 'true') {
            // We're in PWA mode, definitely hide the guide
            guide.style.display = 'none';
        } else if (!localStorage.getItem('installation_guide_dismissed')) {
            // Show the guide
            guide.style.display = 'flex';
        }
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

// Initialize map
function initMap() {
    window.appMap = L.map('map', {
        zoomControl: false
    }).setView([40.7128, -74.0060], 13);
    
    // Add the tile layer (using OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.appMap);
    
    // Add locate control
    L.control.locate({
        position: 'bottomright',
        icon: 'locate-icon',
        flyTo: true,
        showPopup: false,
        strings: {
            title: 'My location'
        },
        locateOptions: {
            enableHighAccuracy: true
        }
    }).addTo(window.appMap);
    
    // Get user's location
    window.appMap.locate({
        setView: true,
        maxZoom: 15,
        enableHighAccuracy: true
    });
    
    // Set up location events
    window.appMap.on('locationfound', onLocationFound);
    window.appMap.on('locationerror', onLocationError);
    
    // Set up map click event
    window.appMap.on('click', function(e) {
        showLocationOptions(e.latlng);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Navigation menu
    document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close').addEventListener('click', toggleSidebar);
    
    // View navigation
    const navItems = document.querySelectorAll('#sidebar nav ul li');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            navigateToView(view);
            toggleSidebar();
        });
    });
    
    // Map controls
    document.getElementById('locate-me').addEventListener('click', function() {
        if (window.userLocation) {
            window.appMap.setView(window.userLocation, 16);
        } else {
            window.appMap.locate({
                setView: true,
                maxZoom: 16
            });
        }
    });
    
    document.getElementById('zoom-in').addEventListener('click', function() {
        window.appMap.zoomIn();
    });
    
    document.getElementById('zoom-out').addEventListener('click', function() {
        window.appMap.zoomOut();
    });
    
    // Categories
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            searchNearbyPlaces(category);
        });
    });
    
    // Bottom panel drag
    const bottomPanel = document.getElementById('bottom-panel');
    const handle = bottomPanel.querySelector('.handle');
    
    handle.addEventListener('mousedown', initPanelDrag);
    handle.addEventListener('touchstart', initPanelDrag);
    
    // Place details
    document.getElementById('place-details-close').addEventListener('click', function() {
        document.getElementById('place-details').classList.remove('active');
    });
    
    document.getElementById('btn-directions').addEventListener('click', function() {
        const placeId = document.getElementById('place-details').getAttribute('data-place-id');
        const place = getPlaceById(placeId);
        
        if (place) {
            window.routeEndPoint = place.location;
            document.getElementById('route-end').value = place.name;
            navigateToView('routes');
        }
    });
    
    document.getElementById('btn-save').addEventListener('click', function() {
        const placeId = document.getElementById('place-details').getAttribute('data-place-id');
        const place = getPlaceById(placeId);
        
        if (place) {
            savePlace(place);
            showToast('Place saved to favorites!');
            document.getElementById('btn-save').classList.add('active');
        }
    });
    
    document.getElementById('btn-share').addEventListener('click', function() {
        const placeId = document.getElementById('place-details').getAttribute('data-place-id');
        const place = getPlaceById(placeId);
        
        if (place && navigator.share) {
            navigator.share({
                title: place.name,
                text: `Check out ${place.name} on Wayfinder!`,
                url: `https://wayfinder-app.com/place/${placeId}`
            })
            .then(() => console.log('Share successful'))
            .catch((error) => console.log('Error sharing:', error));
        } else {
            // Fallback for browsers that don't support share API
            copyToClipboard(`https://wayfinder-app.com/place/${placeId}`);
            showToast('Link copied to clipboard!');
        }
    });
    
    // Search
    document.getElementById('search-btn').addEventListener('click', function() {
        document.getElementById('search-overlay').classList.add('active');
        document.getElementById('search-input').focus();
    });
    
    document.getElementById('search-back-btn').addEventListener('click', function() {
        document.getElementById('search-overlay').classList.remove('active');
    });
    
    document.getElementById('search-input').addEventListener('input', function() {
        if (this.value.length > 2) {
            searchPlaces(this.value);
        }
    });
    
    document.getElementById('clear-search-btn').addEventListener('click', function() {
        document.getElementById('search-input').value = '';
        document.querySelector('.search-results').innerHTML = '';
    });
    
    // Routes
    document.getElementById('route-start-location').addEventListener('click', function() {
        if (window.userLocation) {
            window.routeStartPoint = window.userLocation;
            document.getElementById('route-start').value = 'My Location';
        }
    });
    
    document.getElementById('route-end-location').addEventListener('click', function() {
        if (window.userLocation) {
            window.routeEndPoint = window.userLocation;
            document.getElementById('route-end').value = 'My Location';
        }
    });
    
    const routeOptions = document.querySelectorAll('.route-option');
    routeOptions.forEach(option => {
        option.addEventListener('click', function() {
            routeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    document.getElementById('get-route').addEventListener('click', function() {
        if (window.routeStartPoint && window.routeEndPoint) {
            calculateRoute();
        } else {
            showToast('Please select start and end points');
        }
    });
    
    // Settings
    document.getElementById('dark-mode-toggle').addEventListener('change', function() {
        toggleDarkMode(this.checked);
    });
    
    document.getElementById('map-style-select').addEventListener('change', function() {
        changeMapStyle(this.value);
    });
    
    document.querySelectorAll('input[name="distance-unit"]').forEach(input => {
        input.addEventListener('change', function() {
            localStorage.setItem('distance_unit', this.value);
        });
    });
    
    document.getElementById('clear-app-data').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all app data? This cannot be undone.')) {
            clearAppData();
            showToast('All data cleared!');
        }
    });
    
    // Installation guide buttons
    const laterButton = document.getElementById('later-button');
    if (laterButton) {
        laterButton.addEventListener('click', function() {
            document.getElementById('installation-guide').style.display = 'none';
            localStorage.setItem('installation_guide_dismissed', 'true');
        });
    }
    
    // Add PWA status reset and debug buttons
    const resetPwaBtn = document.getElementById('reset-pwa-status');
    if (resetPwaBtn) {
        resetPwaBtn.addEventListener('click', function() {
            localStorage.removeItem('app_installed');
            localStorage.removeItem('installation_guide_dismissed');
            showToast('PWA status reset. Please reload the app.');
        });
    }

    const debugPwaBtn = document.getElementById('debug-pwa-status');
    if (debugPwaBtn) {
        debugPwaBtn.addEventListener('click', function() {
            const status = {
                'display-mode: standalone': window.matchMedia('(display-mode: standalone)').matches,
                'navigator.standalone': window.navigator.standalone,
                'android-app referrer': document.referrer.includes('android-app://'),
                'localStorage app_installed': localStorage.getItem('app_installed'),
                'localStorage guide_dismissed': localStorage.getItem('installation_guide_dismissed')
            };
            
            alert(JSON.stringify(status, null, 2));
        });
    }
}

// Location found handler
function onLocationFound(e) {
    window.userLocation = e.latlng;
    
    // Update or add user location marker
    if (window.userMarker) {
        window.userMarker.setLatLng(e.latlng);
    } else {
        const locationIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="marker-pulse"></div>'
        });
        
        window.userMarker = L.marker(e.latlng, {
            icon: locationIcon,
            zIndexOffset: 1000
        }).addTo(window.appMap);
    }
    
    // Find nearby places automatically
    findNearbyPlaces();
}

// Location error handler
function onLocationError(e) {
    showToast('Could not find your location: ' + e.message);
    
    // Set default location (New York City)
    window.userLocation = L.latLng(40.7128, -74.0060);
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Navigate to view
function navigateToView(view) {
    const views = document.querySelectorAll('.app-view');
    views.forEach(v => v.classList.remove('active-view'));
    
    document.getElementById(`${view}-view`).classList.add('active-view');
    
    const navItems = document.querySelectorAll('#sidebar nav ul li');
    navItems.forEach(item => item.classList.remove('active'));
    
    document.querySelector(`#sidebar nav ul li[data-view="${view}"]`).classList.add('active');
    
    // Handle special view actions
    if (view === 'map' && window.appMap) {
        window.appMap.invalidateSize();
    }
}

// Search for places
function searchPlaces(query) {
    // In a real app, this would make an API call
    // Here we'll simulate it with a timeout
    const searchResults = document.querySelector('.search-results');
    searchResults.innerHTML = '<div class="loading-results">Searching...</div>';
    
    setTimeout(() => {
        const mockResults = [
            { id: 'place1', name: 'Central Park', category: 'Park', address: 'New York, NY', rating: 4.8 },
            { id: 'place2', name: 'Empire State Building', category: 'Landmark', address: '350 5th Ave, New York', rating: 4.7 },
            { id: 'place3', name: 'Times Square', category: 'Plaza', address: 'Manhattan, NY', rating: 4.5 },
            { id: 'place4', name: 'Brooklyn Bridge', category: 'Bridge', address: 'Brooklyn Bridge, New York', rating: 4.6 }
        ].filter(place => place.name.toLowerCase().includes(query.toLowerCase()));
        
        renderSearchResults(mockResults);
    }, 500);
}

// Render search results
function renderSearchResults(results) {
    const searchResults = document.querySelector('.search-results');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No places found</div>';
        return;
    }
    
    let html = '';
    results.forEach(place => {
        html += `
            <div class="search-result" data-place-id="${place.id}">
                <div class="result-details">
                    <h3>${place.name}</h3>
                    <div class="result-meta">
                        <span class="result-category">${place.category}</span>
                        <span class="result-rating">★ ${place.rating}</span>
                    </div>
                    <p class="result-address">${place.address}</p>
                </div>
                <button class="result-directions" aria-label="Get directions">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M21.71,11.29l-9-9c-0.39-0.39-1.02-0.39-1.41,0l-9,9c-0.39,0.39-0.39,1.02,0,1.41l9,9c0.39,0.39,1.02,0.39,1.41,0l9-9C22.1,12.32,22.1,11.69,21.71,11.29z M14,14.5V12h-4v3H8v-4c0-0.55,0.45-1,1-1h5V7.5l3.5,3.5L14,14.5z" />
                    </svg>
                </button>
            </div>
        `;
    });
    
    searchResults.innerHTML = html;
    
    // Add event listeners to results
    document.querySelectorAll('.search-result').forEach(result => {
        result.addEventListener('click', function() {
            const placeId = this.getAttribute('data-place-id');
            showPlaceDetails(getPlaceById(placeId));
            document.getElementById('search-overlay').classList.remove('active');
        });
    });
    
    document.querySelectorAll('.result-directions').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const placeId = this.closest('.search-result').getAttribute('data-place-id');
            const place = getPlaceById(placeId);
            
            window.routeEndPoint = place.location;
            document.getElementById('route-end').value = place.name;
            navigateToView('routes');
            document.getElementById('search-overlay').classList.remove('active');
        });
    });
}

// Find nearby places
function findNearbyPlaces() {
    if (!window.userLocation) return;
    
    // In a real app, this would make an API call
    // Here we'll create mock places around the user location
    const mockPlaces = generateMockPlaces(window.userLocation);
    
    // Clear existing markers
    for (const id in window.placeMarkers) {
        window.appMap.removeLayer(window.placeMarkers[id]);
    }
    window.placeMarkers = {};
    
    // Add markers for each place
    mockPlaces.forEach(place => {
        const markerIcon = L.divIcon({
            className: 'place-marker',
            html: `<div class="marker-content">${getCategoryIcon(place.category)}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        
        const marker = L.marker(place.location, {
            icon: markerIcon
        }).addTo(window.appMap);
        
        marker.on('click', function() {
            showPlaceDetails(place);
        });
        
        window.placeMarkers[place.id] = marker;
    });
    
    // Populate nearby places view
    renderNearbyPlaces(mockPlaces);
}

// Generate mock places
function generateMockPlaces(center) {
    const categories = ['restaurant', 'cafe', 'shopping', 'hotel', 'park', 'gas', 'atm'];
    const places = [];
    
    for (let i = 0; i < 15; i++) {
        const randomLat = center.lat + (Math.random() - 0.5) * 0.02;
        const randomLng = center.lng + (Math.random() - 0.5) * 0.02;
        const category = categories[Math.floor(Math.random() * categories.length)];
        
        places.push({
            id: 'place_' + i,
            name: getRandomPlaceName(category),
            category: category,
            location: L.latLng(randomLat, randomLng),
            address: '123 Main St',
            rating: (3 + Math.random() * 2).toFixed(1),
            distance: calculateDistance(center, L.latLng(randomLat, randomLng))
        });
    }
    
    return places;
}

// Calculate distance between two points
function calculateDistance(point1, point2) {
    return point1.distanceTo(point2);
}

// Get random place name
function getRandomPlaceName(category) {
    const namesByCategory = {
        restaurant: ['Tasty Bites', 'Urban Eats', 'The Food House', 'Flavor Town', 'Spice Garden'],
        cafe: ['Coffee Culture', 'Morning Brew', 'The Coffee Shop', 'Bean & Leaf', 'Cafe Mocha'],
        shopping: ['City Mall', 'Fashion Hub', 'The Shopping Center', 'Retail Paradise', 'Style Zone'],
        hotel: ['Comfort Inn', 'City View Hotel', 'Luxury Suites', 'The Grand Hotel', 'Urban Lodge'],
        park: ['City Park', 'Green Meadows', 'Central Garden', 'Nature Valley', 'Riverside Park'],
        gas: ['Fuel Stop', 'City Gas', 'QuickFill Station', 'Energy Pumps', 'Eco Fuels'],
        atm: ['City Bank', 'Money Express', 'Cash Point', 'Quick Money', 'Banking Hub']
    };
    
    const names = namesByCategory[category] || ['Unnamed Place'];
    return names[Math.floor(Math.random() * names.length)];
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        restaurant: '🍽️',
        cafe: '☕',
        shopping: '🛍️',
        hotel: '🏨',
        park: '🌳',
        gas: '⛽',
        atm: '🏧'
    };
    
    return icons[category] || '📍';
}

// Show place details
function showPlaceDetails(place) {
    if (!place) return;
    
    const detailsPanel = document.getElementById('place-details');
    
    // Update details
    detailsPanel.setAttribute('data-place-id', place.id);
    detailsPanel.querySelector('h2').textContent = place.name;
    detailsPanel.querySelector('.place-category').textContent = place.category.charAt(0).toUpperCase() + place.category.slice(1);
    detailsPanel.querySelector('.place-address').textContent = place.address;
    
    // Update rating stars
    const ratingValue = parseFloat(place.rating) || 0;
    const ratingStars = detailsPanel.querySelector('.rating-stars');
    ratingStars.innerHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(ratingValue)) {
            ratingStars.innerHTML += '★';
        } else if (i - 0.5 <= ratingValue) {
            ratingStars.innerHTML += '⯨';
        } else {
            ratingStars.innerHTML += '☆';
        }
    }
    
    detailsPanel.querySelector('.rating-number').textContent = ratingValue.toFixed(1);
    
    // Check if place is saved
    const savedPlaces = JSON.parse(localStorage.getItem('saved_places') || '[]');
    const isSaved = savedPlaces.some(saved => saved.id === place.id);
    
    if (isSaved) {
        document.getElementById('btn-save').classList.add('active');
    } else {
        document.getElementById('btn-save').classList.remove('active');
    }
    
    // Zoom to place location
    if (place.location) {
        window.appMap.setView(place.location, 17);
    }
    
    // Show the panel
    detailsPanel.classList.add('active');
}

// Search nearby places by category
function searchNearbyPlaces(category) {
    if (!window.userLocation) return;
    
    // Show loading toast
    showToast(`Searching for ${category} nearby...`);
    
    // Get all places
    const allPlaces = Object.values(window.placeMarkers).map(marker => {
        return getPlaceById(marker._leaflet_id);
    });
    
    // Filter by category
    let filteredPlaces;
    if (category === 'more') {
        // Show all categories selection
        showCategorySelection();
        return;
    } else {
        filteredPlaces = allPlaces.filter(place => place && place.category === category);
    }
    
    // Highlight the markers
    highlightPlaceMarkers(filteredPlaces);
    
    // Show results toast
    showToast(`Found ${filteredPlaces.length} ${category} places nearby`);
}

// Highlight place markers
function highlightPlaceMarkers(places) {
    // Reset all markers first
    for (const id in window.placeMarkers) {
        const marker = window.placeMarkers[id];
        marker._icon.classList.remove('highlighted');
    }
    
    // Highlight the filtered places
    places.forEach(place => {
        const marker = window.placeMarkers[place.id];
        if (marker) {
            marker._icon.classList.add('highlighted');
        }
    });
    
    // Create a bounds object if we have places
    if (places.length > 0) {
        const bounds = L.latLngBounds(places.map(place => place.location));
        window.appMap.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Show category selection
function showCategorySelection() {
    // This would show a full screen category selection
    // For now, we'll just show a toast
    showToast('More categories coming soon!');
}

// Show location options
function showLocationOptions(latlng) {
    // In a real app, this would reverse geocode the location
    // and show options like "Set as start", "Set as destination", etc.
    
    const popup = L.popup()
        .setLatLng(latlng)
        .setContent(`
            <div class="location-popup">
                <strong>Selected Location</strong>
                <p>${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</p>
                <div class="popup-actions">
                    <button id="set-start" class="popup-btn">Set as Start</button>
                    <button id="set-dest" class="popup-btn">Set as Destination</button>
                </div>
            </div>
        `)
        .openOn(window.appMap);
    
    // Add event listeners once the popup is added to the DOM
    setTimeout(() => {
        document.getElementById('set-start').addEventListener('click', function() {
            window.routeStartPoint = latlng;
            document.getElementById('route-start').value = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
            navigateToView('routes');
            window.appMap.closePopup();
        });
        
        document.getElementById('set-dest').addEventListener('click', function() {
            window.routeEndPoint = latlng;
            document.getElementById('route-end').value = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
            navigateToView('routes');
            window.appMap.closePopup();
        });
    }, 100);
}

// Calculate route
function calculateRoute() {
    // Clear existing route
    if (window.routeLine) {
        window.appMap.removeLayer(window.routeLine);
    }
    
    window.routeMarkers.forEach(marker => {
        window.appMap.removeLayer(marker);
    });
    window.routeMarkers = [];
    
    // Get route mode
    const modeElement = document.querySelector('.route-option.active');
    const mode = modeElement ? modeElement.getAttribute('data-mode') : 'driving';
    
    // Show loading
    const resultsContainer = document.getElementById('route-results');
    resultsContainer.innerHTML = '<div class="loading-results">Calculating route...</div>';
    
    // In a real app, this would make an API call to a routing service
    // Here we'll create a mock route
    setTimeout(() => {
        // Create a simulated route between points
        const points = simulateRouteBetween(window.routeStartPoint, window.routeEndPoint);
        
        // Draw route on map
        window.routeLine = L.polyline(points, {
            color: '#3498db',
            weight: 5,
            opacity: 0.7,
            lineJoin: 'round'
        }).addTo(window.appMap);
        
        // Add markers for start and end
        const startIcon = L.divIcon({
            className: 'route-marker start-marker',
            html: '<div class="marker-content">A</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        const endIcon = L.divIcon({
            className: 'route-marker end-marker',
            html: '<div class="marker-content">B</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        const startMarker = L.marker(window.routeStartPoint, { icon: startIcon }).addTo(window.appMap);
        const endMarker = L.marker(window.routeEndPoint, { icon: endIcon }).addTo(window.appMap);
        
        window.routeMarkers.push(startMarker, endMarker);
        
        // Fit map to show route
        window.appMap.fitBounds(window.routeLine.getBounds(), { padding: [50, 50] });
        
        // Show route details
        const distance = calculateRouteDistance(points);
        const duration = calculateRouteDuration(distance, mode);
        
        resultsContainer.innerHTML = `
            <div class="route-summary">
                <div class="route-meta">
                    <div class="route-distance">${formatDistance(distance)}</div>
                    <div class="route-duration">${formatDuration(duration)}</div>
                </div>
                <div class="route-mode-icon">${getRouteModeIcon(mode)}</div>
            </div>
                            <div class="route-step">
                    <div class="step-indicator">A</div>
                    <div class="step-details">
                        <span class="step-action">Start from</span>
                        <span class="step-location">${document.getElementById('route-start').value}</span>
                    </div>
                </div>
                <div class="route-step-divider"></div>
                <div class="route-step">
                    <div class="step-indicator">B</div>
                    <div class="step-details">
                        <span class="step-action">Arrive at</span>
                        <span class="step-location">${document.getElementById('route-end').value}</span>
                    </div>
                </div>
            </div>
            <button id="start-navigation" class="primary-btn">Start Navigation</button>
        `;
        
        // Add event listener for navigation button
        document.getElementById('start-navigation').addEventListener('click', function() {
            startNavigation();
        });
    }, 1000);
}

// Simulate route between two points
function simulateRouteBetween(start, end) {
    const points = [];
    points.push(start);
    
    // Calculate intermediate points
    const numPoints = 5; // Number of intermediate points
    const deltaLat = (end.lat - start.lat) / (numPoints + 1);
    const deltaLng = (end.lng - start.lng) / (numPoints + 1);
    
    // Add some randomness to make it look like a real route
    for (let i = 1; i <= numPoints; i++) {
        const randomFactor = 0.0005 * (Math.random() - 0.5);
        points.push(L.latLng(
            start.lat + deltaLat * i + randomFactor,
            start.lng + deltaLng * i + randomFactor
        ));
    }
    
    points.push(end);
    return points;
}

// Calculate route distance
function calculateRouteDistance(points) {
    let distance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        distance += points[i].distanceTo(points[i + 1]);
    }
    return distance;
}

// Calculate route duration
function calculateRouteDuration(distance, mode) {
    // Average speeds in meters per second
    const speeds = {
        driving: 14, // ~50 km/h
        walking: 1.4, // ~5 km/h
        bicycling: 4, // ~14 km/h
        transit: 8 // ~30 km/h (including stops)
    };
    
    const speed = speeds[mode] || speeds.driving;
    return distance / speed;
}

// Format distance
function formatDistance(meters) {
    const distanceUnit = localStorage.getItem('distance_unit') || 'km';
    
    if (distanceUnit === 'mi') {
        const miles = meters / 1609.34;
        return miles < 0.1 ? 
            `${Math.round(miles * 5280)} ft` : 
            `${miles.toFixed(1)} mi`;
    } else {
        return meters < 1000 ? 
            `${Math.round(meters)} m` : 
            `${(meters / 1000).toFixed(1)} km`;
    }
}

// Format duration
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours} hr ${minutes} min`;
    } else {
        return `${minutes} min`;
    }
}

// Get route mode icon
function getRouteModeIcon(mode) {
    const icons = {
        driving: '🚗',
        walking: '🚶',
        bicycling: '🚲',
        transit: '🚆'
    };
    
    return icons[mode] || '🚗';
}

// Start navigation
function startNavigation() {
    // In a real app, this would start turn-by-turn navigation
    showToast('Navigation starting...');
    
    // For this demo, we'll just go back to the map view
    navigateToView('map');
}

// Initialize panel drag
function initPanelDrag(e) {
    e.preventDefault();
    
    const bottomPanel = document.getElementById('bottom-panel');
    const startY = getEventY(e);
    const startHeight = bottomPanel.offsetHeight;
    const maxHeight = window.innerHeight * 0.9;
    const minHeight = 100;
    
    function handleDrag(e) {
        const currentY = getEventY(e);
        const deltaY = startY - currentY;
        let newHeight = startHeight + deltaY;
        
        // Constrain height
        if (newHeight > maxHeight) newHeight = maxHeight;
        if (newHeight < minHeight) newHeight = minHeight;
        
        bottomPanel.style.height = `${newHeight}px`;
    }
    
    function stopDrag() {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
    }
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
}

// Get vertical position from mouse or touch event
function getEventY(e) {
    return e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
}

// Get place by ID
function getPlaceById(id) {
    // In a real app, this would fetch from a database or API
    // For this demo, we'll return a mock place
    return {
        id: id,
        name: 'Central Park',
        category: 'park',
        location: window.userLocation ? window.userLocation : L.latLng(40.7812, -73.9665),
        address: 'Manhattan, NY 10022',
        rating: 4.8,
        distance: 500
    };
}

// Save place
function savePlace(place) {
    let savedPlaces = JSON.parse(localStorage.getItem('saved_places') || '[]');
    
    // Check if place is already saved
    const alreadySaved = savedPlaces.some(saved => saved.id === place.id);
    
    if (!alreadySaved) {
        savedPlaces.push(place);
        localStorage.setItem('saved_places', JSON.stringify(savedPlaces));
        updateSavedPlacesView();
    }
}

// Load saved places
function loadSavedPlaces() {
    updateSavedPlacesView();
}

// Update saved places view
function updateSavedPlacesView() {
    const savedPlaces = JSON.parse(localStorage.getItem('saved_places') || '[]');
    const container = document.getElementById('saved-places-container');
    
    if (!container) return;
    
    if (savedPlaces.length === 0) {
        container.innerHTML = `
            <div class="no-items-message">
                <svg viewBox="0 0 24 24" width="48" height="48">
                    <path fill="currentColor" d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
                </svg>
                <p>You haven't saved any places yet</p>
                <button class="primary-btn" id="explore-places-btn">Explore Places</button>
            </div>
        `;
        
        // Add event listener to explore button
        if (document.getElementById('explore-places-btn')) {
            document.getElementById('explore-places-btn').addEventListener('click', function() {
                navigateToView('map');
            });
        }
        return;
    }
    
    let html = '';
    savedPlaces.forEach(place => {
        html += `
            <div class="place-card" data-place-id="${place.id}">
                <div class="place-card-content">
                    <div class="place-icon">${getCategoryIcon(place.category)}</div>
                    <div class="place-info">
                        <h3>${place.name}</h3>
                        <p class="place-address">${place.address}</p>
                        <div class="place-meta">
                            <span class="place-category">${place.category.charAt(0).toUpperCase() + place.category.slice(1)}</span>
                            <span class="place-rating">★ ${place.rating}</span>
                        </div>
                    </div>
                </div>
                <div class="place-actions">
                    <button class="view-place-btn" aria-label="View place details">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                        </svg>
                    </button>
                    <button class="get-directions-btn" aria-label="Get directions">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M21.71,11.29l-9-9c-0.39-0.39-1.02-0.39-1.41,0l-9,9c-0.39,0.39-0.39,1.02,0,1.41l9,9c0.39,0.39,1.02,0.39,1.41,0l9-9C22.1,12.32,22.1,11.69,21.71,11.29z M14,14.5V12h-4v3H8v-4c0-0.55,0.45-1,1-1h5V7.5l3.5,3.5L14,14.5z" />
                        </svg>
                    </button>
                    <button class="remove-place-btn" aria-label="Remove from saved places">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners to place cards
    document.querySelectorAll('.view-place-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.closest('.place-card').getAttribute('data-place-id');
            showPlaceDetails(getPlaceById(placeId));
            navigateToView('map');
        });
    });
    
    document.querySelectorAll('.get-directions-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.closest('.place-card').getAttribute('data-place-id');
            const place = getPlaceById(placeId);
            
            window.routeEndPoint = place.location;
            document.getElementById('route-end').value = place.name;
            navigateToView('routes');
        });
    });
    
    document.querySelectorAll('.remove-place-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.closest('.place-card').getAttribute('data-place-id');
            removeSavedPlace(placeId);
        });
    });
}

// Remove saved place
function removeSavedPlace(placeId) {
    let savedPlaces = JSON.parse(localStorage.getItem('saved_places') || '[]');
    savedPlaces = savedPlaces.filter(place => place.id !== placeId);
    localStorage.setItem('saved_places', JSON.stringify(savedPlaces));
    updateSavedPlacesView();
    showToast('Place removed from saved places');
}

// Render nearby places
function renderNearbyPlaces(places) {
    const container = document.getElementById('nearby-places-container');
    
    if (!container) return;
    
    if (places.length === 0) {
        container.innerHTML = '<div class="no-items-message">No places found nearby</div>';
        return;
    }
    
    // Sort places by distance
    places.sort((a, b) => a.distance - b.distance);
    
    let html = '';
    places.forEach(place => {
        html += `
            <div class="place-card" data-place-id="${place.id}" data-category="${place.category}">
                <div class="place-card-content">
                    <div class="place-icon">${getCategoryIcon(place.category)}</div>
                    <div class="place-info">
                        <h3>${place.name}</h3>
                        <p class="place-address">${place.address}</p>
                        <div class="place-meta">
                            <span class="place-category">${place.category.charAt(0).toUpperCase() + place.category.slice(1)}</span>
                            <span class="place-distance">${formatDistance(place.distance)}</span>
                        </div>
                    </div>
                </div>
                <div class="place-actions">
                                        <button class="view-place-btn" aria-label="View place details">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                        </svg>
                    </button>
                    <button class="get-directions-btn" aria-label="Get directions">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M21.71,11.29l-9-9c-0.39-0.39-1.02-0.39-1.41,0l-9,9c-0.39,0.39-0.39,1.02,0,1.41l9,9c0.39,0.39,1.02,0.39,1.41,0l9-9C22.1,12.32,22.1,11.69,21.71,11.29z M14,14.5V12h-4v3H8v-4c0-0.55,0.45-1,1-1h5V7.5l3.5,3.5L14,14.5z" />
                        </svg>
                    </button>
                    <button class="save-place-btn" aria-label="Save place">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners to place cards
    document.querySelectorAll('.view-place-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.closest('.place-card').getAttribute('data-place-id');
            showPlaceDetails(getPlaceById(placeId));
            navigateToView('map');
        });
    });
    
    document.querySelectorAll('.get-directions-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.closest('.place-card').getAttribute('data-place-id');
            const place = getPlaceById(placeId);
            
            window.routeEndPoint = place.location;
            document.getElementById('route-end').value = place.name;
            navigateToView('routes');
        });
    });
    
    document.querySelectorAll('.save-place-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const placeId = this.closest('.place-card').getAttribute('data-place-id');
            savePlace(getPlaceById(placeId));
            showToast('Place saved!');
            this.classList.add('active');
        });
    });
    
    // Add event listeners to category filters
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.addEventListener('click', function() {
            const filterValue = this.getAttribute('data-filter');
            
            // Toggle active class
            document.querySelectorAll('.category-filter').forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            
            // Filter the places
            document.querySelectorAll('.place-card').forEach(card => {
                if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Apply user preferences
function applyUserPreferences() {
    // Dark mode preference
    const darkModeEnabled = localStorage.getItem('dark_mode') === 'true';
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
        
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.checked = true;
        }
    }
    
    // Map style preference
    const mapStyle = localStorage.getItem('map_style') || 'standard';
    const mapStyleSelect = document.getElementById('map-style-select');
    if (mapStyleSelect) {
        mapStyleSelect.value = mapStyle;
    }
    changeMapStyle(mapStyle);
    
    // Distance unit preference
    const distanceUnit = localStorage.getItem('distance_unit') || 'km';
    const unitRadio = document.querySelector(`input[name="distance-unit"][value="${distanceUnit}"]`);
    if (unitRadio) {
        unitRadio.checked = true;
    }
}

// Toggle dark mode
function toggleDarkMode(enabled) {
    if (enabled) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    localStorage.setItem('dark_mode', enabled);
}

// Change map style
function changeMapStyle(style) {
    // In a real app, this would change the map tiles
    console.log('Changing map style to:', style);
    localStorage.setItem('map_style', style);
    
    // Here we're just changing the map's appearance with CSS
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.className = ''; // Clear existing classes
        mapElement.classList.add(`map-style-${style}`);
    }
}

// Clear app data
function clearAppData() {
    // Clear all data from localStorage
    localStorage.clear();
    
    // Refresh page to reset app state
    window.location.reload();
}

// Show toast notification
function showToast(message, duration = 3000) {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Automatically remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// Copy text to clipboard
function copyToClipboard(text) {
    // Create a temporary input element
    const input = document.createElement('input');
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    input.value = text;
    document.body.appendChild(input);
    
    // Select and copy the text
    input.select();
    document.execCommand('copy');
    
    // Remove the temporary element
    document.body.removeChild(input);
}

// Handle PWA installation
function setupPWAInstallation() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Store the event for later use
        window.deferredPrompt = e;
        
        // Show install button if available
        const installButton = document.getElementById('install-btn');
        if (installButton) {
            installButton.style.display = 'block';
            
            installButton.addEventListener('click', () => {
                // Show the install prompt
                window.deferredPrompt.prompt();
                
                // Wait for the user to respond to the prompt
                window.deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                        localStorage.setItem('app_installed', 'true');
                        
                        // Hide installation guide if it exists
                        const guide = document.getElementById('installation-guide');
                        if (guide) {
                            guide.style.display = 'none';
                        }
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    
                    // Reset the deferred prompt variable
                    window.deferredPrompt = null;
                    installButton.style.display = 'none';
                });
            });
        }
    });
    
    // Listen for the appinstalled event
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        localStorage.setItem('app_installed', 'true');
        
        // Hide installation guide if it exists
        const guide = document.getElementById('installation-guide');
        if (guide) {
            guide.style.display = 'none';
        }
        
        // Clear the deferredPrompt
        window.deferredPrompt = null;
    });
    
    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
        if (evt.matches) {
            console.log('App is running in standalone mode');
            localStorage.setItem('app_installed', 'true');
            
            // Hide installation guide if it exists
            const guide = document.getElementById('installation-guide');
            if (guide) {
                guide.style.display = 'none';
            }
        }
    });
}

// Register service worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupPWAInstallation();
    registerServiceWorker();
    
    // Set up immediate display-mode detection
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone ||
        document.referrer.includes('android-app://')) {
        console.log('App launched in standalone mode');
        localStorage.setItem('app_installed', 'true');
        
        // Hide installation guide if it exists
        const guide = document.getElementById('installation-guide');
        if (guide) {
            guide.style.display = 'none';
        }
    }
});

// Listen for the visibilitychange event to handle app resuming
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // App has become visible again
        if (window.appMap) {
            // Update map size when resuming
            window.appMap.invalidateSize();
            
            // Refresh user location when coming back to the app
            window.appMap.locate({
                setView: false,
                maxZoom: 16,
                enableHighAccuracy: true
            });
        }
    }
});
