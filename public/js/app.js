/**
 * ODM-CMMS Application JavaScript
 */

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}

// Highlight current nav item
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/')[1] || 'dashboard';
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    if (item.dataset.page === currentPage) {
      item.classList.add('active');
    }
  });
});

// Global toast function
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Global loading functions
function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// Pull to refresh functionality
let touchStartY = 0;
let pullDistance = 0;
const pullThreshold = 80;

document.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0) {
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (touchStartY > 0 && window.scrollY === 0) {
    const touchY = e.touches[0].clientY;
    pullDistance = touchY - touchStartY;
    
    if (pullDistance > 0 && pullDistance < pullThreshold * 2) {
      const pullRefresh = document.getElementById('pull-refresh');
      if (pullRefresh) {
        pullRefresh.style.transform = `translateY(${Math.min(pullDistance / 2, 60)}px)`;
        pullRefresh.style.opacity = Math.min(pullDistance / pullThreshold, 1);
      }
    }
  }
}, { passive: true });

document.addEventListener('touchend', () => {
  if (pullDistance > pullThreshold) {
    location.reload();
  }
  
  const pullRefresh = document.getElementById('pull-refresh');
  if (pullRefresh) {
    pullRefresh.style.transform = '';
    pullRefresh.style.opacity = '';
  }
  
  touchStartY = 0;
  pullDistance = 0;
});

// Offline indicator
window.addEventListener('online', () => {
  showToast('Back online', 'success');
});

window.addEventListener('offline', () => {
  showToast('You are offline', 'error');
});

// Form validation helper
function validateForm(form) {
  const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
  let isValid = true;
  
  inputs.forEach(input => {
    if (!input.value.trim()) {
      isValid = false;
      input.classList.add('error');
    } else {
      input.classList.remove('error');
    }
  });
  
  return isValid;
}

// API request helper with error handling
async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    showToast('Network error. Please try again.', 'error');
    throw error;
  }
}
