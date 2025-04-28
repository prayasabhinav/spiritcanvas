document.addEventListener('DOMContentLoaded', () => {
    const pathwaySelectionView = document.getElementById('pathway-selection-view');
    const pathwayOptionsContainer = document.getElementById('pathway-options-container');
    const selectionMessage = document.getElementById('selection-message');
    const mainView = document.getElementById('main-view');
    const progressBarsContainer = document.getElementById('progress-bars-container');
    const columnsContainer = document.getElementById('columns-container');
    const userStatusElement = document.getElementById('user-status');
    const editAllPathwaysBtn = document.getElementById('edit-all-pathways-btn');
    
    // --- Modal Elements ---
    // Existing modal for selected pathway edits (renamed for clarity)
    /*
    const editSelectedPathwayModal = document.getElementById('edit-pathways-modal');
    const closeSelectedModalBtn = editSelectedPathwayModal.querySelector('.close-modal'); // Assuming class is unique or first
    const saveSelectedPathwayNamesBtn = document.getElementById('save-pathway-names');
    const cancelSelectedPathwayEditBtn = document.getElementById('cancel-pathway-edit');
    const selectedPathwayNamesGrid = document.getElementById('pathway-names-grid');
    */

    // New modal for editing ALL pathways (Admin) - REMOVED
    /* 
    const editAllPathwaysModal = document.getElementById('edit-all-pathways-modal');
    const closeAllModalBtn = editAllPathwaysModal.querySelector('.close-modal-all'); // Use the new class
    const saveAllPathwaysBtn = document.getElementById('save-all-pathways-btn');
    const cancelAllPathwaysEditBtn = document.getElementById('cancel-all-pathways-edit-btn');
    const allPathwaysGrid = document.getElementById('all-pathways-grid');
    */
    
    let isAdmin = false;
    let adminCheckComplete = false; // Flag to track completion
    
    // Check admin status
    async function checkAdminStatus() {
        console.log('Checking admin status...');
        try {
            const response = await fetch('/api/check-admin');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            isAdmin = data.isAdmin;
            adminCheckComplete = true; // Mark as complete
            console.log(`Admin status received: ${isAdmin}`);
            updateUIForAdminStatus();
        } catch (error) { 
            console.error('Error checking admin status:', error);
            isAdmin = false;
            adminCheckComplete = true; // Mark as complete even on error
            updateUIForAdminStatus(); // Update UI even on error
        }
    }
    
    // Update UI based on admin status and card/item counts
    function updateUIForAdminStatus() {
        console.log(`Updating UI for admin status: ${isAdmin} (Check complete: ${adminCheckComplete})`);
        if (!adminCheckComplete) {
            console.log('Admin check not complete yet, UI update skipped.');
            return; // Don't update UI if check isn't done
        }
        
        // Add/remove admin class from body
        if (isAdmin) {
            document.body.classList.add('admin');
        } else {
            document.body.classList.remove('admin');
        }

        // Update editability for titles, items, etc.
        const adminEditableElements = document.querySelectorAll('.editable');
        console.log(`Found ${adminEditableElements.length} admin-editable elements.`);
        adminEditableElements.forEach(element => {
            element.contentEditable = isAdmin;
            if (isAdmin) {
                element.classList.add('admin-editable-active');
                element.classList.remove('admin-not-editable');
            } else {
                element.classList.remove('admin-editable-active');
                element.classList.add('admin-not-editable');
            }
            element.style.display = ''; 
            console.log(`Set contentEditable=${isAdmin} for element:`, element.tagName, element.className);
        });

        // Only proceed if columnsContainer exists
        if (!columnsContainer) return;
        // Iterate through each column to update its Add buttons
        const columns = columnsContainer ? columnsContainer.querySelectorAll('.column') : [];
        columns.forEach(column => {
            const cards = column.querySelectorAll('.card');
            const cardCount = cards.length;
            let allCardsMeetItemRequirement = true;

            if (cardCount > 0) {
                for (const card of cards) {
                    const itemCount = card.querySelectorAll('.card-item').length;
                    if (itemCount < 5) {
                        allCardsMeetItemRequirement = false;
                        break;
                    }
                }
            }

            const shouldHideAddButtons = (cardCount >= 12 && allCardsMeetItemRequirement);

            // Update Add Card button visibility for this column
            const addCardBtn = column.querySelector('.add-card-btn');
            if (addCardBtn) {
                addCardBtn.style.display = (isAdmin && !shouldHideAddButtons) ? '' : 'none';
            }

            // Update Add Item button visibility for all cards in this column
            cards.forEach(card => {
                const addItemBtn = card.querySelector('.add-item-btn');
                if (addItemBtn) {
                    addItemBtn.style.display = (isAdmin && !shouldHideAddButtons) ? '' : 'none';
                }
            });
        });

        // Replace buttons with clones for non-admins to remove listeners 
        // (This logic needs adjustment to work with the per-column visibility)
        if (!isAdmin) {
            console.log('Replacing potentially visible add buttons with clones for non-admin.');
            document.querySelectorAll('.add-card-btn, .add-item-btn').forEach(btn => {
                // Only clone if it wasn't already hidden by the count logic
                if (btn.style.display !== 'none') {
                    const clone = btn.cloneNode(true);
                    btn.parentNode.replaceChild(clone, btn);
                    clone.style.display = 'none'; // Ensure clone is hidden for non-admin
                }
            });
        } else {
            // Ensure buttons are potentially visible for admins (if not hidden by count logic)
            // This part might need adjustment if buttons were previously cloned
            // For now, assume the per-column logic correctly sets display for admins
        }
    }
    
    // Initial check admin status when the page loads
    checkAdminStatus();
    
    // Get the current URL path to determine which view to show
    const currentPath = window.location.pathname;
    
    // Show the appropriate view based on the current path
    function showAppropriateView() {
        console.log('Showing appropriate view for path:', currentPath);
        
        // Check if DOM elements exist
        if (!pathwaySelectionView || !mainView) {
            console.error('Required DOM elements not found!');
            console.log('pathwaySelectionView exists:', !!pathwaySelectionView);
            console.log('mainView exists:', !!mainView);
            return;
        }
        
        // Hide all views first
        pathwaySelectionView.style.display = 'none';
        mainView.style.display = 'none';
        
        // Determine primary action based on path
        if (currentPath === '/pathways/select') {
            // --- Always show selection view if URL is explicitly /pathways/select --- 
            console.log('Showing pathway selection view (explicit path)');
            pathwaySelectionView.style.display = 'block';
            if (!allPathways || allPathways.length === 0) {
                 if (pathwayOptionsContainer) {
                    pathwayOptionsContainer.innerHTML = '<div class="spinner"></div>'; 
                }
            }
            fetchPathways(); // Load pathway options 
            
        } else {
            // --- For /dashboard, /, or /pathways/canvas, check selected pathways first --- 
            console.log('Checking selected pathways for path:', currentPath);
            fetch('/api/selected-pathways')
                .then(response => {
                    if (!response.ok) {
                        // Handle non-OK response (e.g., user not authenticated, server error)
                        if (response.status === 401) {
                             console.log('User not authenticated, redirecting likely handled by server/auth middleware.');
                             // Potentially redirect to login explicitly if needed, but server should handle
                             // window.location.href = '/auth/login'; 
                        } else {
                            console.error(`HTTP error fetching selected pathways! status: ${response.status}`);
                             // Show a generic error or the selection page as fallback
                             showSelectionViewFallback(); 
                        }
                        throw new Error(`HTTP error! status: ${response.status}`); // Stop further processing in this chain
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.selectedPathways && data.selectedPathways.length === 3) {
                        // --- User has 3 pathways, show canvas view --- 
                        selectedPathways = data.selectedPathways;
                        console.log('Retrieved 3 selected pathways, showing canvas view for path:', currentPath, selectedPathways);
                        return fetchPathways().then(() => {
                            console.log('Pathways fetched, initializing canvas view');
                            mainView.style.display = 'flex';
                            initializeMainView();
                        });
                    } else {
                        // --- User has < 3 pathways OR is on /pathways/canvas without 3 pathways --- 
                        if (currentPath === '/pathways/canvas') {
                             console.log('On /pathways/canvas without 3 pathways, redirecting to selection');
                             window.location.href = '/pathways/select'; // Redirect if trying to access canvas directly without setup
                        } else {
                             console.log('No/incomplete pathways found for path', currentPath, ', showing selection view');
                             showSelectionViewFallback(); // Show selection view for /, /dashboard etc.
                        }
                    }
                })
                .catch(error => {
                    // Catch errors from fetch or subsequent .then blocks
                    console.error('Error checking or loading pathways:', error);
                    // Show selection view as a safe fallback on error, unless it was an auth error handled above
                    if (error.message.includes('401')) {
                        // Likely auth error, do nothing more here
        } else {
                        showSelectionViewFallback();
                    }
                });
        }
    }

    // Helper function to show the pathway selection view as a fallback
    function showSelectionViewFallback() {
        console.log('Fallback: Showing pathway selection view');
            pathwaySelectionView.style.display = 'block';
            if (!allPathways || allPathways.length === 0) {
                 if (pathwayOptionsContainer) {
                pathwayOptionsContainer.innerHTML = '<div class="spinner"></div>'; 
                }
            }
        fetchPathways(); // Load pathway options
    }
    
    // Modal elements - keeping for reference but will not be used
    const editPathwaysModal = document.getElementById('edit-pathways-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const savePathwayNamesBtn = document.getElementById('save-pathway-names');
    const cancelPathwayEditBtn = document.getElementById('cancel-pathway-edit');
    const pathwayNamesGrid = document.getElementById('pathway-names-grid');

    let selectedPathways = [];
    let allPathways = [];
    let pathwayCustomizations = {}; // To store custom details for pathways

    // --- Fetch Pathways ---
    async function fetchPathways() {
        // Check if pathways are already cached in this session
        if (allPathways && allPathways.length > 0) {
            console.log('Using cached pathway data.');
            // Ensure spinner is removed if it was somehow still there (shouldn't happen with current logic, but safe)
            if (pathwayOptionsContainer && pathwayOptionsContainer.querySelector('.spinner')) {
                pathwayOptionsContainer.innerHTML = '';
            }
            displayPathwayOptions(); // Display immediately using cached data
            return; // Skip fetching again
        }

        // If not cached, fetch from the server (spinner should already be shown by showAppropriateView)
        console.log('Fetching pathway data from server...');
        try {
            const response = await fetch('/api/pathways');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allPathways = await response.json();
            
            // Initialize pathway customizations with original pathway data
            allPathways.forEach(pathway => {
                pathwayCustomizations[pathway._id] = {
                    name: pathway.name,
                    description: pathway.description
                };
            });
            
            displayPathwayOptions();
        } catch (error) {
            console.error("Error fetching pathways:", error);
            // Replace spinner with error message
            if (pathwayOptionsContainer) {
                 pathwayOptionsContainer.innerHTML = '<p>Error loading career pathways. Please try refreshing.</p>';
            }
        }
    }

    // --- Display Pathway Options ---
    function displayPathwayOptions() {
        pathwayOptionsContainer.innerHTML = ''; // Clear loading message
        
        const pathwaysContainer = document.createElement('div');
        pathwaysContainer.classList.add('pathways-container');
        pathwayOptionsContainer.appendChild(pathwaysContainer);
        
        let displayPathways = [...allPathways];
        
        // Fisher-Yates shuffle algorithm remains
        for (let i = displayPathways.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [displayPathways[i], displayPathways[j]] = [displayPathways[j], displayPathways[i]];
        }
        
        console.log(`Displaying all ${displayPathways.length} pathways`);
        
        displayPathways.forEach(pathway => {
            const option = document.createElement('div');
            option.classList.add('pathway-option');
            
            const nameElem = document.createElement('div');
            nameElem.classList.add('pathway-name');
            // Use customized name if available, fallback to original
            nameElem.textContent = pathwayCustomizations[pathway._id]?.name || pathway.name;
            
            option.appendChild(nameElem);
            option.dataset.pathwayId = pathway._id;
            option.dataset.pathwayName = pathway.name;
            option.dataset.pathwayDescription = pathwayCustomizations[pathway._id]?.description || pathway.description;
            option.addEventListener('click', handlePathwaySelection);
            
            const minimalRotate = (Math.random() * 2 - 1);
            option.style.transform = `rotate(${minimalRotate}deg)`;

            pathwaysContainer.appendChild(option);
        });
        
        console.log('Pathway options displayed, ensuring UI reflects admin status.');
        updateUIForAdminStatus();
    }

    // --- Handle Pathway Selection ---
    function handlePathwaySelection(event) {
        const selectedOption = event.currentTarget; // Use currentTarget to ensure we get the main div
        const pathwayId = selectedOption.dataset.pathwayId;
        const pathway = allPathways.find(p => p._id === pathwayId);
        
        if (!pathway) return;

        if (selectedPathways.includes(pathwayId)) {
            // Deselect
            selectedPathways = selectedPathways.filter(id => id !== pathwayId);
            selectedOption.classList.remove('selected');
        } else {
            // Select
            if (selectedPathways.length < 3) {
                selectedPathways.push(pathwayId);
                selectedOption.classList.add('selected');
            }
        }

        updateSelectionMessage();

        if (selectedPathways.length === 3) {
            // Save selected pathways to server session via POST request
            selectionMessage.textContent = 'Saving your selections...';
            
            // Create a POST request to the server
            fetch('/api/selected-pathways', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pathwayIds: selectedPathways }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Navigate to canvas view after successful save
                    console.log('Pathways saved successfully, redirecting to canvas');
                    window.location.href = '/pathways/canvas';
                } else {
                    // Show error message
                    selectionMessage.textContent = data.message || 'Error saving your selections. Please try again.';
                }
            })
            .catch(error => {
                console.error('Error saving pathways:', error);
                selectionMessage.textContent = 'Error saving your selections. Please try again.';
            });
        }
    }

    // --- Update Selection Message ---
    function updateSelectionMessage() {
        const remaining = 3 - selectedPathways.length;
        if (remaining > 0) {
            selectionMessage.textContent = `Please select ${remaining} more pathway${remaining > 1 ? 's' : ''}.`;
        } else {
            selectionMessage.textContent = 'Ready! Initializing your career canvas...';
        }
    }

    // --- Initialize Main View ---
    function initializeMainView() {
        pathwaySelectionView.style.display = 'none';
        mainView.style.display = 'flex'; // Use flex as defined in CSS

        // Check if header already exists before creating a new one
        if (!mainView.querySelector('.main-view-header')) {
            // Create header with app name that is NOT a link
            const headerContainer = document.createElement('div');
            headerContainer.classList.add('main-view-header');
            
            // Left side of header
            const leftHeader = document.createElement('div');
            leftHeader.classList.add('header-left');
            const appName = document.createElement('span');
            appName.classList.add('app-name-link');
            appName.textContent = 'SpiritCanvas';
            leftHeader.appendChild(appName);
            
            // Right side of header
            const rightHeader = document.createElement('div');
            rightHeader.classList.add('header-right');
            
            // --- Add Profile Link --- 
            const profileLink = document.createElement('a');
            profileLink.classList.add('header-link', 'profile-link');
            profileLink.textContent = 'Profile';
            profileLink.href = '/profile';
            rightHeader.appendChild(profileLink);
            // --- End Profile Link ---
            
            headerContainer.appendChild(leftHeader);
            headerContainer.appendChild(rightHeader);
            mainView.prepend(headerContainer);
        }

        progressBarsContainer.innerHTML = '';
        columnsContainer.innerHTML = '';

        selectedPathways.forEach((pathwayId, index) => {
            const pathway = allPathways.find(p => p._id === pathwayId);
            if (pathway) {
                const displayName = pathwayCustomizations[pathwayId]?.name || pathway.name;
                createProgressBar(displayName, index, pathway._id);
                createColumn(displayName, index, pathway._id);
            }
        });
        console.log('Main view initialized, ensuring UI reflects admin status.');
        updateUIForAdminStatus(); // Ensure UI is correct after dynamic content load
    }

    // --- Create Progress Bar ---
    function createProgressBar(pathwayName, index, pathwayId) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('progress-bar-wrapper');
        wrapper.dataset.pathwayId = pathwayId; // Use pathwayId for mapping

        const title = document.createElement('div');
        title.classList.add('progress-bar-title');
        title.textContent = pathwayName;

        const bar = document.createElement('div');
        bar.classList.add('progress-bar');

        const innerBar = document.createElement('div');
        innerBar.classList.add('progress-bar-inner');
        innerBar.textContent = '0%'; // Initial text
        innerBar.style.width = '0%'; // Initial width

        bar.appendChild(innerBar);
        wrapper.appendChild(title);
        wrapper.appendChild(bar);
        progressBarsContainer.appendChild(wrapper);
    }

    // --- Create Column ---
    async function createColumn(pathwayName, index, pathwayId) {
        const column = document.createElement('div');
        column.classList.add('column');
        column.dataset.columnIndex = index; // Link to progress bar (legacy, can be removed later)
        column.dataset.pathwayId = pathwayId; // Store original pathway ID

        const header = document.createElement('div');
        header.classList.add('column-header');
        header.classList.add('editable');
        header.textContent = pathwayName;
        
        const description = document.createElement('div');
        description.classList.add('column-description');
        const pathway = allPathways.find(p => p._id === pathwayId);
        description.textContent = pathway ? pathway.description : '';
        
        header.contentEditable = isAdmin;
        
        header.addEventListener('focus', (e) => {
            if (!isAdmin) e.target.blur();
        });
        
        header.addEventListener('blur', (e) => {
            if (!isAdmin) return;
            if (!e.target.textContent.trim()) {
                e.target.textContent = pathwayName;
            }
            const progressBarTitle = progressBarsContainer.querySelector(
                `.progress-bar-wrapper[data-pathway-id="${pathwayId}"] .progress-bar-title`
            );
            if (progressBarTitle) {
                progressBarTitle.textContent = e.target.textContent;
            }
            savePathwayState(pathwayId);
        });
        header.addEventListener('keydown', (e) => { 
            if (!isAdmin) { 
                e.preventDefault(); 
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });

        const addCardBtn = document.createElement('button');
        addCardBtn.classList.add('add-card-btn');
        addCardBtn.textContent = '+ Add Card';
        addCardBtn.addEventListener('click', () => addCard(column));

        column.appendChild(header);
        column.appendChild(description);

        // --- Load per-user progress if available, else fallback to pathway state ---
        let cardsData = null;
        try {
            const userProgressRes = await fetch(`/api/user/progress/${pathwayId}`);
            if (userProgressRes.ok) {
                const userProgress = await userProgressRes.json();
                if (userProgress && userProgress.progress && Array.isArray(userProgress.progress.cards)) {
                    cardsData = userProgress.progress.cards;
                }
            }
        } catch (e) {
            console.warn('Could not fetch user progress, will fallback to pathway state.', e);
        }
        if (!cardsData) {
        try {
            console.log(`Fetching state for pathway: ${pathwayId}`);
            const response = await fetch(`/api/pathways/${pathwayId}/state`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
                cardsData = await response.json();
            console.log(`Received state for ${pathwayId}:`, cardsData);
        } catch (error) {
            console.error(`Error loading state for pathway ${pathwayId}:`, error);
                cardsData = [];
        }
        }
        (cardsData || []).forEach(cardData => {
            const card = createCardElement(cardData.title, cardData.items);
            column.appendChild(card); // Add loaded card
        });
        // --- End Load --- 

        column.appendChild(addCardBtn);
        columnsContainer.appendChild(column);
        
        updateProgressBarForColumn(column); // Update progress bar after loading
        updateUIForAdminStatus(); 
    }

    // --- Create Card Element (Helper for loading and adding) ---
    function createCardElement(title = "Card Title", itemsData = [{ text: "New Task...", completed: false }], cardIndex = null, pathwayId = null) {
        const card = document.createElement('div');
        card.classList.add('card');

        const cardTitle = document.createElement('h4');
        cardTitle.classList.add('card-title', 'editable'); // Add editable class
        cardTitle.textContent = title;
        cardTitle.contentEditable = isAdmin;
        
        cardTitle.addEventListener('focus', (e) => { 
            if (!isAdmin) e.target.blur(); 
        });
        cardTitle.addEventListener('blur', (e) => {
            if (!isAdmin) return;
            if (!e.target.textContent.trim()) {
                e.target.textContent = "Card Title";
            }
            savePathwayState(card.closest('.column')?.dataset.pathwayId);
        });
        cardTitle.addEventListener('keydown', (e) => {
            if (!isAdmin) { e.preventDefault(); return; }
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });

        card.appendChild(cardTitle);

        // Track completion for all items
        let allCompleted = true;
        let itemElements = [];
        itemsData.forEach(itemData => {
            if (!itemData.completed) allCompleted = false;
            const itemElement = createItemElement(itemData.text, itemData.completed);
            card.appendChild(itemElement);
            itemElements.push(itemElement);
        });
        if (itemsData.length > 0 && allCompleted) {
            card.classList.add('card-completed');
        }

        const addItemBtn = document.createElement('button');
        addItemBtn.classList.add('add-item-btn');
        addItemBtn.textContent = '+ Add Item';
        addItemBtn.addEventListener('click', () => addItem(card));
        card.appendChild(addItemBtn);

        // --- Personalise Button (non-admins only) ---
        if (!isAdmin) {
            const personaliseBtn = document.createElement('button');
            personaliseBtn.classList.add('personalise-btn');
            personaliseBtn.textContent = 'Personalise';
            personaliseBtn.style.marginTop = '10px';
            personaliseBtn.addEventListener('click', () => {
                // Always read the latest tasks from the card DOM
                const currentTasks = Array.from(card.querySelectorAll('.card-item')).map(itemDiv => {
                    const text = itemDiv.querySelector('span').textContent;
                    const completed = itemDiv.querySelector('input[type="checkbox"]').checked;
                    return { text, completed };
                });
                openPersonaliseModal(card, cardTitle.textContent, currentTasks, cardIndex, pathwayId);
            });
            card.appendChild(personaliseBtn); // Always append after add-item-btn so it's at the bottom
        }
        // --- End Personalise Button ---

        return card;
    }

    // --- Add Card --- (Updated to use helper and save)
    function addCard(column) {
        console.log('addCard called. isAdmin:', isAdmin);
        if (!isAdmin) {
            console.error('Non-admin user attempted to add card');
            return;
        }
        
        const card = createCardElement(); // Create card with defaults

        // Insert card before the "Add Card" button
        const addCardBtn = column.querySelector('.add-card-btn');
        column.insertBefore(card, addCardBtn);

        updateProgressBarForColumn(column);
        updateUIForAdminStatus(); // Ensure new elements respect admin status
        savePathwayState(column.dataset.pathwayId);
    }

    // --- Add Item --- (Updated to save)
    function addItem(card) {
        console.log('addItem called. isAdmin:', isAdmin);
        if (!isAdmin) {
            console.error('Non-admin user attempted to add item');
            return;
        }
        const newItem = createItemElement(); // Create item with defaults
        const addItemBtn = card.querySelector('.add-item-btn');
        card.insertBefore(newItem, addItemBtn);

        const column = card.closest('.column');
        updateProgressBarForColumn(column);
        updateUIForAdminStatus(); // Ensure new elements respect admin status
        savePathwayState(column?.dataset.pathwayId);
    }

    // --- Create Item Element --- (Updated to accept completed status)
    function createItemElement(initialText = "New Task...", completed = false) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('card-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = completed;
        checkbox.addEventListener('change', handleItemTick);

        const span = document.createElement('span');
        span.textContent = initialText;
        span.classList.add('editable');
        span.contentEditable = isAdmin;
        span.classList.toggle('ticked-off', completed);

        span.addEventListener('focus', (e) => { 
            if (!isAdmin) e.target.blur(); 
        });
        span.addEventListener('blur', (e) => { 
            if (!isAdmin) return;
            if (!e.target.textContent.trim()) {
                e.target.textContent = "Empty Task";
            }
            savePathwayState(itemDiv.closest('.column')?.dataset.pathwayId);
        });
        span.addEventListener('keydown', (e) => { 
            if (!isAdmin) { e.preventDefault(); return; }
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(span);

        itemDiv.addEventListener('click', (e) => {
            if (e.target !== span && e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        return itemDiv;
    }

    // --- Handle Item Tick --- (Updated to save)
    function handleItemTick(event) {
        console.log('handleItemTick called. isAdmin:', isAdmin);
        const checkbox = event.target;
        const itemSpan = checkbox.closest('.card-item').querySelector('span');
        itemSpan.classList.toggle('ticked-off', checkbox.checked);

        // --- Card completion logic ---
        const card = checkbox.closest('.card');
        if (card) {
            const allCheckboxes = card.querySelectorAll('input[type="checkbox"]');
            const checkedCheckboxes = card.querySelectorAll('input[type="checkbox"]:checked');
            if (allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length) {
                card.classList.add('card-completed');
            } else {
                card.classList.remove('card-completed');
            }
        }

        // --- Progress bar update logic ---
        const column = checkbox.closest('.column');
        updateProgressBarForColumn(column);
        
             savePathwayState(column?.dataset.pathwayId);
    }

    // --- Update Progress Bar for Column ---
    function updateProgressBarForColumn(column) {
        if (!column) return; // Safety check

        const pathwayId = column.dataset.pathwayId;
        const items = column.querySelectorAll('.card-item');
        const tickedItems = column.querySelectorAll('.card-item input[type="checkbox"]:checked');

        const totalItems = items.length;
        const completedItems = tickedItems.length;

        let percentage = 0;
        if (totalItems > 0) {
            percentage = Math.round((completedItems / totalItems) * 100);
        }

        // Find the corresponding progress bar by pathwayId
        const progressBarWrapper = progressBarsContainer.querySelector(`.progress-bar-wrapper[data-pathway-id="${pathwayId}"]`);
        if (progressBarWrapper) {
            const innerBar = progressBarWrapper.querySelector('.progress-bar-inner');
            innerBar.style.width = `${percentage}%`;
            innerBar.textContent = `${percentage}%`;
        } else {
            console.warn(`Could not find progress bar for pathwayId ${pathwayId}`);
        }
    }

    // --- Initialize Pathway Details Modal ---
    function initializePathwayDetailsModal() {
        pathwayNamesGrid.innerHTML = ''; // Clear existing content
        
        allPathways.forEach(pathway => {
            const pathwayDiv = document.createElement('div');
            pathwayDiv.classList.add('pathway-edit-item');
            
            const label = document.createElement('label');
            label.textContent = pathway.name;
            label.setAttribute('for', `pathway-name-input-${pathway._id}`);
            
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.id = `pathway-name-input-${pathway._id}`;
            nameInput.placeholder = 'Custom name';
            nameInput.value = pathwayCustomizations[pathway._id]?.name || pathway.name;
            nameInput.dataset.pathwayId = pathway._id;
            nameInput.dataset.field = 'name';
            
            const descLabel = document.createElement('label');
            descLabel.textContent = 'Description:';
            descLabel.setAttribute('for', `pathway-desc-input-${pathway._id}`);
            
            const descInput = document.createElement('textarea');
            descInput.id = `pathway-desc-input-${pathway._id}`;
            descInput.placeholder = 'Custom description';
            descInput.value = pathwayCustomizations[pathway._id]?.description || pathway.description;
            descInput.dataset.pathwayId = pathway._id;
            descInput.dataset.field = 'description';
            
            pathwayDiv.appendChild(label);
            pathwayDiv.appendChild(nameInput);
            pathwayDiv.appendChild(descLabel);
            pathwayDiv.appendChild(descInput);
            pathwayNamesGrid.appendChild(pathwayDiv);
        });
    }
    
    // --- Open Edit Pathways Modal ---
    function openEditPathwaysModal() {
        initializePathwayDetailsModal();
        editPathwaysModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    }
    
    // --- Close Edit Pathways Modal ---
    function closeEditPathwaysModal() {
        editPathwaysModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // --- Save Pathway Details ---
    function savePathwayDetails() {
        const nameInputs = pathwayNamesGrid.querySelectorAll('input[data-field="name"]');
        const descInputs = pathwayNamesGrid.querySelectorAll('textarea[data-field="description"]');
        
        nameInputs.forEach(input => {
            const pathwayId = input.dataset.pathwayId;
            const newName = input.value.trim();
            
            if (!pathwayCustomizations[pathwayId]) {
                pathwayCustomizations[pathwayId] = {};
            }
            
            const originalPathway = allPathways.find(p => p._id === pathwayId);
            
            if (newName && newName !== originalPathway.name) {
                pathwayCustomizations[pathwayId].name = newName;
            } else {
                // If empty or same as original, use original
                pathwayCustomizations[pathwayId].name = originalPathway.name;
                input.value = originalPathway.name;
            }
        });
        
        descInputs.forEach(input => {
            const pathwayId = input.dataset.pathwayId;
            const newDescription = input.value.trim();
            
            if (!pathwayCustomizations[pathwayId]) {
                pathwayCustomizations[pathwayId] = {};
            }
            
            const originalPathway = allPathways.find(p => p._id === pathwayId);
            
            if (newDescription && newDescription !== originalPathway.description) {
                pathwayCustomizations[pathwayId].description = newDescription;
            } else {
                // If empty or same as original, use original
                pathwayCustomizations[pathwayId].description = originalPathway.description;
                input.value = originalPathway.description;
            }
        });
        
        // Update displayed pathway options
        displayPathwayOptions();
        
        // Update any selected column headers if in main view
        if (mainView.style.display !== 'none') {
            document.querySelectorAll('.column').forEach(column => {
                const pathwayId = column.dataset.pathwayId;
                const index = column.dataset.columnIndex;
                const header = column.querySelector('.column-header');
                
                if (pathwayId && header && pathwayCustomizations[pathwayId]) {
                    header.textContent = pathwayCustomizations[pathwayId].name;
                    
                    // Update corresponding progress bar title
                    const progressBarTitle = progressBarsContainer.querySelector(
                        `.progress-bar-wrapper[data-pathway-id="${pathwayId}"] .progress-bar-title`
                    );
                    if (progressBarTitle) {
                        progressBarTitle.textContent = pathwayCustomizations[pathwayId].name;
                    }
                }
            });
        }
        
        closeEditPathwaysModal();
    }
    
    // --- Event Listeners for Modal ---
    // Removed editPathwaysBtn listener as the button no longer exists
    /*
    closeModalBtn.addEventListener('click', closeEditPathwaysModal);
    savePathwayNamesBtn.addEventListener('click', savePathwayDetails);
    cancelPathwayEditBtn.addEventListener('click', closeEditPathwaysModal);
    */
    
    // Close modal when clicking outside of it
    /*
    window.addEventListener('click', (event) => {
        // Keep this check only if editSelectedPathwayModal is still used elsewhere
        // if (event.target === editSelectedPathwayModal && editSelectedPathwayModal.style.display === 'block') {
        //     closeEditPathwaysModal();
        // }
        // Removed check for editAllPathwaysModal
    });
    */

    // --- REMOVE Listeners for Edit All Pathways Modal ---
    /*
    if (closeAllModalBtn) { ... }
    if (saveAllPathwaysBtn) { ... }
    if (cancelAllPathwaysEditBtn) { ... }
    // Adjust window click listener if it only handled the removed modal
    window.addEventListener('click', (event) => {
        if (event.target === editSelectedPathwayModal && editSelectedPathwayModal.style.display === 'block') {
            closeEditPathwaysModal(); // Keep this if editSelectedPathwayModal still exists and is used
        }
        // Remove check for editAllPathwaysModal
    });
    */

    // --- Check Authentication Status ---
    async function checkAuthStatus() {
        try {
            const response = await fetch('/auth/status');
            if (!response.ok) {
                throw new Error('Failed to fetch auth status');
            }
            
            const data = await response.json();
            
            if (data.isAuthenticated) {
                // User is logged in - update UI
                if (userStatusElement) {
                    userStatusElement.innerHTML = `
                        <div class="user-profile">
                            <img src="${data.user.image}" alt="Profile" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.displayName)}&background=random'">
                            <span class="user-name">${data.user.displayName}</span>
                        </div>
                        <a href="/auth/logout" class="logout-link">Logout</a>
                    `;
                }
                return true; // Return authentication status
            } else {
                // User is not logged in
                if (userStatusElement) {
                    userStatusElement.innerHTML = `
                        <a href="/auth/login" class="login-button">Sign in with Google</a>
                    `;
                }
                return false; // Return authentication status
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            // Fallback to login button if there's an error
            if (userStatusElement) {
                userStatusElement.innerHTML = `
                    <a href="/auth/login" class="login-button">Sign in with Google</a>
                `;
            }
            return false; // Assume not authenticated on error
        }
    }

    // --- Initial Load ---
    // Check auth status first, then handle view display based on URL and authentication
    checkAuthStatus()
        .then(isAuthenticated => {
            if (isAuthenticated) {
                // User is authenticated, show the appropriate view based on URL
                showAppropriateView();
            }
            // If not authenticated, the server should redirect to the login page
            // so we don't need to do anything here
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
        });

    // Check admin status when the page loads and periodically
    checkAdminStatus();
    setInterval(checkAdminStatus, 30000); // Check every 30 seconds

    // --- Save Pathway State --- (Updated for per-user progress)
    async function savePathwayState(pathwayId) {
        if (!pathwayId) {
            console.log(`Save skipped (invalid pathwayId: ${pathwayId})`);
            return;
        }

        console.log(`Gathering state to save for pathway: ${pathwayId}`);
        const column = columnsContainer.querySelector(`.column[data-pathway-id="${pathwayId}"]`);
        if (!column) {
            console.error(`Could not find column for pathway ${pathwayId} to save state.`);
            return;
        }

        const cardsData = [];
        const cardElements = column.querySelectorAll('.card');
        
        cardElements.forEach(cardElement => {
            const cardTitle = cardElement.querySelector('.card-title').textContent;
            const itemsData = [];
            const itemElements = cardElement.querySelectorAll('.card-item');
            
            itemElements.forEach(itemElement => {
                const itemText = itemElement.querySelector('span').textContent;
                const isCompleted = itemElement.querySelector('input[type="checkbox"]').checked;
                itemsData.push({ text: itemText, completed: isCompleted });
            });
            
            cardsData.push({ title: cardTitle, items: itemsData });
        });

        console.log(`Attempting to save state for ${pathwayId}:`, cardsData);

        try {
            let response;
            if (isAdmin) {
                // Admins save to the global pathway state
                response = await fetch(`/api/pathways/${pathwayId}/state`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cards: cardsData }),
            });
            } else {
                // Non-admins save to their own progress
                response = await fetch(`/api/user/progress/${pathwayId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ cards: cardsData }),
                });
            }

            if (!response.ok) {
                // Try to read the response as text first, as it might be HTML
                const errorText = await response.text(); 
                let errorMessage = `HTTP error! status: ${response.status} - ${response.statusText}`;
                try {
                    // Attempt to parse as JSON if possible
                    const errorData = JSON.parse(errorText);
                    errorMessage = `HTTP error! status: ${response.status} - ${errorData.message || errorText}`;
                } catch (e) {
                    // If JSON parsing fails, use the raw text (likely HTML error page)
                    // Limit the length to avoid overly long alerts
                    errorMessage += `\nServer Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log(`Successfully saved state for pathway ${pathwayId}:`, result);
        } catch (error) {
            console.error(`Error saving state for pathway ${pathwayId}:`, error);
            // Optionally display a user-facing error message
            alert(`Error saving changes for pathway ${pathwayId}. Please try again.`);
        }
    }

    // --- Event Listeners ---
    if (editAllPathwaysBtn) {
        editAllPathwaysBtn.addEventListener('click', () => {
            console.log('Admin clicked Edit All Pathways button. Navigating to admin page...');
            window.location.href = '/admin/edit-pathways'; // Navigate to the new page
        });
    }

    // --- REMOVE Modal Helper Functions ---
    /*
    async function openEditAllPathwaysModal() { ... }
    function populateEditAllPathwaysModal(pathways) { ... }
    function createEditableCardElement(cardData, cardIndex) { ... }
    function createEditableItemElement(itemData, itemIndex) { ... }
    function closeEditAllPathwaysModal() { ... }
    async function handleSaveAllPathways() { ... }
    */

    // --- REMOVE Listeners for Edit All Pathways Modal ---
    /*
    if (closeAllModalBtn) { ... }
    if (saveAllPathwaysBtn) { ... }
    if (cancelAllPathwaysEditBtn) { ... }
    // Adjust window click listener if it only handled the removed modal
    window.addEventListener('click', (event) => {
        if (event.target === editSelectedPathwayModal && editSelectedPathwayModal.style.display === 'block') {
            closeEditPathwaysModal(); // Keep this if editSelectedPathwayModal still exists and is used
        }
        // Remove check for editAllPathwaysModal
    });
    */

    // --- Personalise Modal Logic ---
    let personaliseModal = null;
    function openPersonaliseModal(card, cardTitle, itemsData, cardIndex, pathwayId) {
        // Remove existing modal if present
        if (personaliseModal) personaliseModal.remove();
        personaliseModal = document.createElement('div');
        personaliseModal.classList.add('modal');
        personaliseModal.style.display = 'block';
        personaliseModal.innerHTML = `
            <div class="modal-content personalise-modal-content">
                <div class="personalise-modal-header">
                    <h2>Personalise Tasks for "${cardTitle}"</h2>
                    <span class="close-modal" style="cursor:pointer;font-size:24px;">&times;</span>
                </div>
                <div class="modal-body personalise-modal-body">
                    <form id="personalise-form">
                        ${[0,1,2,3,4].map(i => `
                            <div style="margin-bottom:10px;">
                                <input type="text" name="task${i}" value="${itemsData[i] ? itemsData[i].text.replace(/"/g, '&quot;') : ''}" placeholder="Task ${i+1}" maxlength="100" class="personalise-modal-input" />
                            </div>
                        `).join('')}
                    </form>
                </div>
                <div class="modal-actions personalise-modal-actions">
                    <button type="button" id="save-personalise-btn" class="btn btn-primary">Save</button>
                    <button type="button" id="cancel-personalise-btn" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(personaliseModal);

        // Close modal logic
        personaliseModal.querySelector('.close-modal').onclick = closePersonaliseModal;
        personaliseModal.querySelector('#cancel-personalise-btn').onclick = closePersonaliseModal;

        // Save logic
        personaliseModal.querySelector('#save-personalise-btn').onclick = async function() {
            const form = personaliseModal.querySelector('#personalise-form');
            const newTasks = [];
            for (let i = 0; i < 5; i++) {
                const val = form[`task${i}`].value.trim();
                if (val) newTasks.push({ text: val, completed: false });
            }
            // Update the card in the UI
            // Remove all .card-item elements
            card.querySelectorAll('.card-item').forEach(e => e.remove());
            newTasks.forEach(task => {
                const itemElement = createItemElement(task.text, task.completed);
                card.insertBefore(itemElement, card.querySelector('.add-item-btn'));
            });
            // Save to user progress
            // Find the column and card index
            const column = card.closest('.column');
            if (column) {
                savePathwayState(column.dataset.pathwayId);
            }
            closePersonaliseModal();
        };
    }
    function closePersonaliseModal() {
        if (personaliseModal) {
            personaliseModal.remove();
            personaliseModal = null;
        }
    }

});
