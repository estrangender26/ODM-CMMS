// ODM Mobile JavaScript
// Mobile-first interaction handlers

// QR Scanner Functions
function openQRScanner() {
    const modal = document.getElementById('qrModal');
    modal.classList.add('active');
    startCamera();
}

function closeQRScanner() {
    const modal = document.getElementById('qrModal');
    modal.classList.remove('active');
    stopCamera();
}

function startCamera() {
    const video = document.getElementById('qrVideo');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
            })
            .catch(err => {
                console.error('Camera error:', err);
                alert('Could not access camera. Please use manual entry.');
            });
    }
}

function stopCamera() {
    const video = document.getElementById('qrVideo');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
}

function manualEntry() {
    const code = prompt('Enter Asset QR Code:');
    if (code) {
        closeQRScanner();
        // Navigate to asset context
        window.location.href = `/mobile/asset?code=${encodeURIComponent(code)}`;
    }
}

// Simulate QR code scanning
function onQRDetected(qrCode) {
    closeQRScanner();
    window.location.href = `/mobile/asset?code=${encodeURIComponent(qrCode)}`;
}

// Offline Detection
function updateOnlineStatus() {
    const indicator = document.getElementById('offlineIndicator');
    if (!indicator) return;
    
    if (navigator.onLine) {
        indicator.style.display = 'none';
    } else {
        indicator.style.display = 'block';
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Swipe Navigation for Inspection Items
let touchStartX = 0;
let touchEndX = 0;

function handleSwipe() {
    const swipeThreshold = 100;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next item
            nextInspectionItem();
        } else {
            // Swipe right - previous item
            previousInspectionItem();
        }
    }
}

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function nextInspectionItem() {
    // Implement navigation to next inspection item
    console.log('Next item');
}

function previousInspectionItem() {
    // Implement navigation to previous inspection item
    console.log('Previous item');
}

// Inspection Item Interactions
function selectPass() {
    const btn = document.querySelector('.btn-pass');
    if (btn) {
        btn.classList.add('selected');
        document.querySelector('.btn-fail')?.classList.remove('selected');
        
        // Auto-advance after short delay
        setTimeout(() => {
            nextInspectionItem();
        }, 300);
    }
}

function selectFail() {
    const btn = document.querySelector('.btn-fail');
    if (btn) {
        btn.classList.add('selected');
        document.querySelector('.btn-pass')?.classList.remove('selected');
        
        // Show finding modal
        const modal = document.getElementById('findingModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
}

function selectSeverity(level) {
    document.querySelectorAll('.btn-severity').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`.btn-severity.${level}`)?.classList.add('selected');
}

function closeFindingModal() {
    const modal = document.getElementById('findingModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function saveFinding() {
    closeFindingModal();
    // Save finding logic here
    setTimeout(() => {
        nextInspectionItem();
    }, 200);
}

function takePhoto() {
    // In real implementation, this would trigger camera
    // For now, simulate photo capture
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.click();
}

// Filter Chips
function toggleFilter(chip) {
    chip.classList.toggle('active');
    // Apply filter logic
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateOnlineStatus();
    
    // Initialize filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => toggleFilter(chip));
    });
});

// Prevent double-tap zoom
document.addEventListener('touchend', e => {
    e.preventDefault();
    e.target.click();
}, { passive: false });

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'));
}

// Work Order Selection
function selectWorkOrder(element, woId) {
    document.querySelectorAll('.wo-item').forEach(item => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
}

// Numeric Input Helper
function showNumericPad(inputId) {
    // Show custom numeric keypad for better mobile experience
    console.log('Show numeric pad for', inputId);
}

// Auto-save Draft
let autoSaveTimer;
function autoSaveDraft() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        // Save inspection progress to localStorage
        console.log('Auto-saving draft...');
    }, 3000);
}

// Sync Offline Data
async function syncOfflineData() {
    if (!navigator.onLine) return;
    
    // Check for queued data in localStorage
    const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
    
    for (const item of queue) {
        try {
            // Send to server
            console.log('Syncing item:', item);
            // Remove from queue on success
        } catch (err) {
            console.error('Sync failed:', err);
        }
    }
}

// Expose functions globally
window.openQRScanner = openQRScanner;
window.closeQRScanner = closeQRScanner;
window.manualEntry = manualEntry;
window.selectPass = selectPass;
window.selectFail = selectFail;
window.selectSeverity = selectSeverity;
window.closeFindingModal = closeFindingModal;
window.saveFinding = saveFinding;
window.takePhoto = takePhoto;
window.nextInspectionItem = nextInspectionItem;
