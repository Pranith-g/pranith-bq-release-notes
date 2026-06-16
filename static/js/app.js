// State Management
let releaseNotes = []; // Raw entries from backend
let parsedUpdates = []; // Extracted individual updates
let selectedUpdate = null;
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = refreshBtn.querySelector('.spinner-icon');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const tagFilterBtns = document.querySelectorAll('.tag-filter-btn');
const notesList = document.getElementById('notes-list');
const loader = document.getElementById('loader');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const emptyState = document.getElementById('empty-state');

// Composer DOM Elements
const composerSidebar = document.querySelector('.composer-sidebar');
const composerPrompt = document.getElementById('composer-prompt');
const composerEditor = document.getElementById('composer-editor');
const previewBadge = document.getElementById('preview-badge');
const previewDate = document.getElementById('preview-date');
const previewTextSummary = document.getElementById('preview-text-summary');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const tweetBtn = document.getElementById('tweet-btn');
const closeComposerBtn = document.getElementById('close-composer-btn');

// Toast Notification
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh & Retry
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    retryBtn.addEventListener('click', fetchReleaseNotes);
    
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderNotes();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderNotes();
    });
    
    // Filters
    tagFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tagFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type;
            renderNotes();
        });
    });
    
    // Tweet Textarea length tracker
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Tweet Button
    tweetBtn.addEventListener('click', postTweet);
    
    // Close Composer Panel on Mobile
    closeComposerBtn.addEventListener('click', () => {
        composerSidebar.classList.remove('open');
    });
}

// Fetch Release Notes from Flask API
async function fetchReleaseNotes() {
    setLoadingState(true);
    
    try {
        const response = await fetch('/api/notes');
        const data = await response.json();
        
        if (data.success) {
            releaseNotes = data.entries;
            parseAndProcessNotes();
            renderNotes();
            showToast('Release notes updated successfully!');
        } else {
            showError(data.error || 'Failed to fetch release notes.');
        }
    } catch (err) {
        showError(err.message || 'Network error occurred while fetching.');
    } finally {
        setLoadingState(false);
    }
}

// Loading UI State Switcher
function setLoadingState(isLoading) {
    if (isLoading) {
        loader.classList.remove('hidden');
        notesList.classList.add('hidden');
        errorContainer.classList.add('hidden');
        emptyState.classList.add('hidden');
        refreshBtn.disabled = true;
        refreshIcon.classList.add('loading');
    } else {
        loader.classList.add('hidden');
        notesList.classList.remove('hidden');
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('loading');
    }
}

// Show Error UI State
function showError(msg) {
    errorContainer.classList.remove('hidden');
    notesList.classList.add('hidden');
    loader.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorMessage.textContent = msg;
}

// Parse feed's HTML content to isolate individual updates
function parseAndProcessNotes() {
    parsedUpdates = [];
    
    releaseNotes.forEach(entry => {
        const date = entry.title;
        const entryLink = entry.link;
        const entryId = entry.id;
        
        // Parse the HTML content of the entry
        const parser = new DOMParser();
        const doc = parser.parseFromString(entry.content, 'text/html');
        const body = doc.body;
        
        let currentType = null;
        let currentContentHtml = "";
        let accumulatedText = "";
        
        const children = Array.from(body.children);
        
        children.forEach((child, index) => {
            if (child.tagName === 'H3') {
                // Save previous parsed update if it exists
                if (currentType) {
                    parsedUpdates.push(createUpdateObj(currentType, date, currentContentHtml, accumulatedText, entryLink, entryId, index));
                }
                currentType = child.textContent.trim();
                currentContentHtml = "";
                accumulatedText = "";
            } else {
                if (!currentType) {
                    currentType = "General";
                }
                currentContentHtml += child.outerHTML;
                accumulatedText += " " + child.textContent;
            }
        });
        
        // Save the final parsed update in the entry
        if (currentType) {
            parsedUpdates.push(createUpdateObj(currentType, date, currentContentHtml, accumulatedText, entryLink, entryId, children.length));
        }
    });
}

// Helper to create update object and normalize data
function createUpdateObj(rawType, date, htmlContent, text, link, entryId, index) {
    const type = normalizeType(rawType);
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    return {
        id: `${entryId}-${index}`,
        rawType: rawType,
        type: type,
        date: date,
        htmlContent: htmlContent,
        plainText: cleanText,
        link: link
    };
}

// Normalize types to Feature, Issue, or Changed
function normalizeType(type) {
    const lower = type.toLowerCase();
    if (lower.includes('feature')) return 'Feature';
    if (lower.includes('issue') || lower.includes('deprecated') || lower.includes('deprecation') || lower.includes('deletion')) return 'Issue';
    return 'Changed'; // fallback for Changed, Fixed, General, Resolved, etc.
}

// Render release notes to DOM
function renderNotes() {
    notesList.innerHTML = '';
    
    // Filter updates
    const filteredUpdates = parsedUpdates.filter(update => {
        const matchesFilter = currentFilter === 'all' || update.type === currentFilter;
        const matchesSearch = !searchQuery || 
                             update.plainText.toLowerCase().includes(searchQuery) ||
                             update.date.toLowerCase().includes(searchQuery) ||
                             update.rawType.toLowerCase().includes(searchQuery);
        return matchesFilter && matchesSearch;
    });
    
    if (filteredUpdates.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Group updates by date
    const groups = {};
    filteredUpdates.forEach(update => {
        if (!groups[update.date]) {
            groups[update.date] = [];
        }
        groups[update.date].push(update);
    });
    
    // Build the DOM structures
    for (const date in groups) {
        const dayBlock = document.createElement('div');
        dayBlock.className = 'day-block';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `
            <h3 class="day-title">${date}</h3>
            <div class="day-line"></div>
        `;
        
        const updatesContainer = document.createElement('div');
        updatesContainer.className = 'day-updates-container';
        
        groups[date].forEach(update => {
            const card = document.createElement('div');
            card.className = `update-card type-${update.type.toLowerCase()}`;
            if (selectedUpdate && selectedUpdate.id === update.id) {
                card.classList.add('selected');
            }
            
            // Generate clean type label
            const typeLabel = update.rawType;
            
            card.innerHTML = `
                <div class="update-card-header">
                    <span class="badge ${update.type.toLowerCase()}">${typeLabel}</span>
                    <div class="card-actions">
                        <button class="action-icon-btn share-btn" title="Compose Tweet">
                            <i class="fa-brands fa-x-twitter"></i>
                        </button>
                    </div>
                </div>
                <div class="update-card-body">
                    ${update.htmlContent}
                </div>
            `;
            
            // Add click events
            card.addEventListener('click', (e) => {
                // Ignore clicks if user clicked a link inside the card
                if (e.target.tagName === 'A') return;
                
                selectUpdate(update);
                
                // If sharing button was clicked, focus textarea directly
                if (e.target.closest('.share-btn')) {
                    setTimeout(() => {
                        tweetTextarea.focus();
                        tweetTextarea.setSelectionRange(tweetTextarea.value.length, tweetTextarea.value.length);
                    }, 150);
                }
            });
            
            updatesContainer.appendChild(card);
        });
        
        dayBlock.appendChild(dayHeader);
        dayBlock.appendChild(updatesContainer);
        notesList.appendChild(dayBlock);
    }
}

// Select an update to compose tweet
function selectUpdate(update) {
    selectedUpdate = update;
    
    // Highlight active card
    document.querySelectorAll('.update-card').forEach(card => {
        card.classList.remove('selected');
    });
    const cardEl = document.querySelector(`[id^="${update.id}"]`) || document.querySelector(`.update-card.type-${update.type.toLowerCase()}:hover`);
    if (cardEl) cardEl.classList.add('selected');
    
    // Update preview panel
    previewBadge.className = `badge ${update.type.toLowerCase()}`;
    previewBadge.textContent = update.rawType;
    previewDate.textContent = update.date;
    previewTextSummary.textContent = update.plainText;
    
    // Draft default tweet
    const draftText = draftTweetText(update);
    tweetTextarea.value = draftText;
    updateCharCount();
    
    // Display Composer Editor Panel
    composerPrompt.classList.add('hidden');
    composerEditor.classList.remove('hidden');
    
    // Expand sidebar panel on mobile/tablet screens
    composerSidebar.classList.add('open');
    
    // Re-render notes to reflect selection styling
    renderNotes();
}

// Draft tweet content with limits and URL offsets
function draftTweetText(update) {
    let rawText = update.plainText;
    
    // Format hashtags
    const typeTag = update.type === 'Feature' ? 'Feature' : (update.type === 'Issue' ? 'Issue' : 'Update');
    const prefix = `BigQuery ${typeTag} [${update.date}]: `;
    const tags = `\n\n#BigQuery #GoogleCloud #GCP`;
    const link = `\nhttps://docs.cloud.google.com/bigquery/docs/release-notes`;
    
    // Twitter charges 23 chars for any URL. 
    // Available length: 280 max - prefix.length - tags.length - 23 (link URL) - 5 (safety buffer)
    const urlLengthForTwitter = 23;
    const reservedChars = prefix.length + tags.length + urlLengthForTwitter + 5;
    const maxTextLen = 280 - reservedChars;
    
    let textBody = rawText;
    if (rawText.length > maxTextLen) {
        textBody = rawText.substring(0, maxTextLen - 3) + "...";
    }
    
    return `${prefix}"${textBody}"${link}${tags}`;
}

// Calculate length of the tweet with X/Twitter URL rule
function getTwitterLength(str) {
    // Regex for URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    let temp = str;
    let urlCount = 0;
    
    temp = temp.replace(urlRegex, () => {
        urlCount++;
        return "";
    });
    
    return temp.length + (urlCount * 23);
}

// Update UI character count indicator
function updateCharCount() {
    const len = getTwitterLength(tweetTextarea.value);
    charCount.textContent = len;
    
    // Manage class styling based on size
    charCount.className = "";
    if (len > 280) {
        charCount.classList.add('danger');
        tweetBtn.disabled = true;
    } else if (len > 250) {
        charCount.classList.add('warning');
        tweetBtn.disabled = false;
    } else {
        tweetBtn.disabled = false;
    }
}

// Redirect to Twitter Web Intent
function postTweet() {
    const text = tweetTextarea.value;
    if (getTwitterLength(text) > 280) {
        showToast('Tweet exceeds character limit!', true);
        return;
    }
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    showToast('Redirecting to X (Twitter)...');
}

// Toast Notifications Helper
let toastTimeout;
function showToast(msg, isError = false) {
    clearTimeout(toastTimeout);
    
    toastMessage.textContent = msg;
    toast.className = 'toast';
    
    if (isError) {
        toast.style.borderColor = 'var(--color-issue)';
        toast.querySelector('.toast-icon').className = 'fa-solid fa-circle-xmark toast-icon';
        toast.querySelector('.toast-icon').style.color = 'var(--color-issue)';
    } else {
        toast.style.borderColor = 'var(--color-feature)';
        toast.querySelector('.toast-icon').className = 'fa-solid fa-circle-check toast-icon';
        toast.querySelector('.toast-icon').style.color = 'var(--color-feature)';
    }
    
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}
