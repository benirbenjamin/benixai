/**
 * BenixAI Mobile Navigation
 * Bottom navigation bar for mobile devices
 */

document.addEventListener('DOMContentLoaded', function() {
  // Create mobile navigation if it doesn't exist
  if (!document.querySelector('.mobile-nav')) {
    createMobileNavigation();
  }
  
  // Update active state based on current path
  updateActiveNavItem();
});

/**
 * Create the mobile navigation element
 */
function createMobileNavigation() {
  // Define navigation items
  const navItems = [
    { path: '/', icon: 'fa-home', label: 'Home' },
    { path: '/record', icon: 'fa-microphone', label: 'Record' },
    { path: '/music-library', icon: 'fa-music', label: 'Library' },
    { path: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' }
  ];
  
  // Create navigation container
  const mobileNav = document.createElement('nav');
  mobileNav.className = 'mobile-nav';
  
  // Create navigation items container
  const navContainer = document.createElement('div');
  navContainer.className = 'mobile-nav-container';
  
  // Generate navigation items
  navItems.forEach(item => {
    const navItem = document.createElement('a');
    navItem.href = item.path;
    navItem.className = 'mobile-nav-item';
    navItem.dataset.path = item.path;
    
    navItem.innerHTML = `
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
    `;
    
    navContainer.appendChild(navItem);
  });
  
  // Append to navigation
  mobileNav.appendChild(navContainer);
  
  // Append to body
  document.body.appendChild(mobileNav);
}

/**
 * Update the active state of navigation items
 */
function updateActiveNavItem() {
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll('.mobile-nav-item');
  
  navItems.forEach(item => {
    const itemPath = item.dataset.path;
    
    if (currentPath === itemPath || 
        (itemPath !== '/' && currentPath.startsWith(itemPath))) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
