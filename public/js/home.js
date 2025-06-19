document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Navbar style change on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    });
    
    // Animation on scroll
    const animatedElements = document.querySelectorAll('.feature-card, .step-card, .testimonial-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
    
    // Check if user is logged in
    const checkLoginStatus = () => {
        // This would typically check for a session cookie or token
        // For demo purposes, we'll just check if localStorage has a user item
        const user = localStorage.getItem('user');
        if (user) {
            // Update login/signup buttons
            document.getElementById('login-btn').textContent = 'Dashboard';
            document.getElementById('login-btn').href = '/dashboard';
            
            // Optional: Hide signup button if already logged in
            const signupButtons = document.querySelectorAll('.signup-btn');
            signupButtons.forEach(btn => {
                btn.textContent = 'Dashboard';
                btn.href = '/dashboard';
            });
        }
    };
    
    // Call the function
    checkLoginStatus();
});
