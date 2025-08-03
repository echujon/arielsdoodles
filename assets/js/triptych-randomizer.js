document.addEventListener('DOMContentLoaded', function() {
    const triptychItems = document.querySelectorAll('.triptych-item');

    triptychItems.forEach(item => {
        const sectionItemsJson = item.dataset.sectionItems;
        let items = [];

        try {
            items = JSON.parse(sectionItemsJson);
        } catch (e) {
            console.error('Error parsing section items JSON for triptych item:', e);
            return; // Skip this item if JSON is invalid
        }

        if (items.length > 0) {
            const randomIndex = Math.floor(Math.random() * items.length);
            const chosenItem = items[randomIndex];

            const imageElement = item.querySelector('.image img');
            const sourceElement = item.querySelector('.image picture source');
            const linkOverlay = item.querySelector('.triptych-link-overlay');
            // const titleElement = item.querySelector('h3'); // <-- REMOVE THIS LINE

            if (chosenItem.image) {
                imageElement.src = chosenItem.image;
                // Still good to use itemTitle for alt text if present
                imageElement.alt = chosenItem.itemTitle || item.dataset.sectionTitle || 'Triptych Image';

                if (sourceElement && chosenItem.webp) {
                    sourceElement.srcset = chosenItem.webp;
                } else if (sourceElement) {
                    sourceElement.srcset = chosenItem.image;
                }
            } else {
                console.warn('No image path found for chosen item in:', chosenItem);
                imageElement.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // Transparent GIF fallback
            }

            // Remove if you only want Hugo to control the h3 title:
            // if (titleElement) {
            //     titleElement.textContent = chosenItem.itemTitle || item.dataset.sectionTitle;
            // }

            if (chosenItem.link) {
                linkOverlay.href = chosenItem.link;
            } else {
                console.warn('No link found for chosen item in:', chosenItem);
                linkOverlay.href = '#';
            }
        } else {
            console.warn('No section items found for a triptych section:', item.dataset.sectionTitle);
            item.querySelector('.image').style.display = 'none';
            item.querySelector('.triptych-link-overlay').href = '#';
        }
    });
});