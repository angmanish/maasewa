// Mobile menu toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const toggle = document.getElementById('menuToggle');
    if (menu) {
        menu.classList.toggle('active');
    }
    if (toggle) {
        toggle.classList.toggle('active');
    }
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// Form submission handling
const form = document.getElementById('enquiryForm');
const result = document.getElementById('result');

if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const object = Object.fromEntries(formData);
        const json = JSON.stringify(object);
        
        if (result) {
            result.style.display = 'block';
            result.innerHTML = "Please wait...";
            result.style.color = 'var(--text-primary)';
        }

        fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: json
            })
            .then(async (response) => {
                let res = await response.json();
                if (response.status == 200) {
                    if (result) {
                        result.innerHTML = "Message sent successfully!";
                        result.style.color = '#00d4aa'; 
                    }
                    form.reset();
                } else {
                    console.log(response);
                    if (result) {
                        result.innerHTML = res.message;
                        result.style.color = '#ef4444'; 
                    }
                }
            })
            .catch(error => {
                console.log(error);
                if (result) {
                    result.innerHTML = "Something went wrong!";
                    result.style.color = '#ef4444'; 
                }
            })
            .then(function() {
                setTimeout(() => {
                    if (result) {
                        result.style.display = 'none';
                    }
                }, 5000);
            });
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            const appWrapper = document.querySelector('.app-wrapper');
            
            if (target && appWrapper) {
                // Close mobile menu if open
                const menu = document.getElementById('mobileMenu');
                const toggle = document.getElementById('menuToggle');
                if (menu && menu.classList.contains('active')) {
                    menu.classList.remove('active');
                    toggle.classList.remove('active');
                }

                const headerOffset = 80;
                const elementPosition = target.offsetTop;
                const offsetPosition = elementPosition - headerOffset;

                appWrapper.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// Handle hash on load for .app-wrapper
window.addEventListener('load', () => {
    if (window.location.hash) {
        const target = document.querySelector(window.location.hash);
        const appWrapper = document.querySelector('.app-wrapper');
        if (target && appWrapper) {
            setTimeout(() => {
                const headerOffset = 80;
                const elementPosition = target.offsetTop;
                const offsetPosition = elementPosition - headerOffset;
                appWrapper.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }
});
