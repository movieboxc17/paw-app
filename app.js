// Sample pet data
const pets = [
    {
        id: 1,
        name: "Max",
        age: "3 years",
        type: "dog",
        breed: "Golden Retriever",
        description: "Friendly and playful golden retriever who loves to run and play fetch.",
        image: "https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
    },
    {
        id: 2,
        name: "Luna",
        age: "2 years",
        type: "cat",
        breed: "Siamese",
        description: "Gentle and calm Siamese cat who enjoys lounging in sunny spots.",
        image: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
    },
    {
        id: 3,
        name: "Rocky",
        age: "4 years",
        type: "dog",
        breed: "German Shepherd",
        description: "Loyal and intelligent German Shepherd, great with families and children.",
        image: "https://images.unsplash.com/photo-1589941013453-ec89f98c6492?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
    },
    {
        id: 4,
        name: "Whiskers",
        age: "1 year",
        type: "cat",
        breed: "Maine Coon",
        description: "Playful Maine Coon kitten with beautiful fur and a sweet personality.",
        image: "https://images.unsplash.com/photo-1586042091284-bd35c8c1d917?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
    },
    {
        id: 5,
        name: "Bubbles",
        age: "2 years",
        type: "other",
        breed: "Goldfish",
        description: "Vibrant gold-colored fish who loves swimming around her tank.",
        image: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
    },
    {
        id: 6,
        name: "Charlie",
        age: "5 years",
        type: "dog",
        breed: "Beagle",
        description: "Energetic Beagle who loves going on adventures and sniffing everything.",
        image: "https://images.unsplash.com/photo-1505628346881-b72b27e84530?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
    }
];

// DOM Elements
const petGrid = document.querySelector('.pet-grid');
const filterButtons = document.querySelectorAll('.filter-btn');
const installPrompt = document.getElementById('install-prompt');
const installButton = document.getElementById('install-button');
const dismissButton = document.getElementById('dismiss-button');

// Current selected filter
let currentFilter = 'all';

// PWA Install Event
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    installPrompt.style.display = 'block';
});

installButton.addEventListener('click', () => {
    // Hide the app provided install promotion
    installPrompt.style.display = 'none';
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
    });
});

dismissButton.addEventListener('click', () => {
    installPrompt.style.display = 'none';
});

// Display pets in the grid
function displayPets() {
    // Clear current pets
    petGrid.innerHTML = '';
    
    // Filter pets based on current filter
    const filteredPets = currentFilter === 'all' 
        ? pets 
        : pets.filter(pet => pet.type === currentFilter);
    
    // Create and append pet cards
    filteredPets.forEach(pet => {
        const petCard = document.createElement('div');
        petCard.className = 'pet-card';
        petCard.innerHTML = `
            <img src="${pet.image}" alt="${pet.name}" class="pet-image">
            <div class="pet-info">
                <h2 class="pet-name">${pet.name}</h2>
                <p class="pet-age">${pet.age} old • ${pet.breed}</p>
                <p class="pet-description">${pet.description}</p>
                <button class="adopt-button">Adopt Me</button>
            </div>
        `;
        petGrid.appendChild(petCard);
    });
    
    // Add event listeners to adopt buttons
    document.querySelectorAll('.adopt-button').forEach(button => {
        button.addEventListener('click', function() {
            const petName = this.parentElement.querySelector('.pet-name').textContent;
            alert(`Thank you for wanting to adopt ${petName}! We'll contact you soon.`);
        });
    });
}

// Filter functionality
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        // Update current filter
        currentFilter = button.getAttribute('data-filter');
        // Display pets based on new filter
        displayPets();
    });
});

// Initial display
displayPets();
