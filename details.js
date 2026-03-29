const servicesData = {
    'nursing-staff': {
        title: 'Nursing Staff',
        icon: 'fas fa-user-nurse',
        image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=1200',
        description: 'Our certified male and female nursing staff provide comprehensive 12 to 24-hour home care. We ensure that patients receive hospital-quality clinical care in the comfort and familiarity of their own homes. Our nurses are highly trained to handle complex medical needs with compassion and professionalism.',
        details: '<ul><li>Post-hospitalization and surgical recovery care</li><li>Wound dressing, infection control, and management</li><li>Continuous vital signs monitoring and charting</li><li>Timely medication administration (Oral, IV, IM)</li><li>Colostomy, Tracheostomy, and Catheter care</li><li>Emergency response and critical situation management</li></ul>'
    },
    'elder-care': {
        title: 'Elder Care',
        icon: 'fas fa-blind',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200',
        description: 'Aging with dignity is a fundamental right. Our compassionate caretakers are dedicated to assisting seniors with their daily routines while providing much-needed companionship. We tailor our approach to meet the unique physical and emotional needs of every elder, ensuring they feel safe, respected, and engaged.',
        details: '<ul><li>Assistance with daily activities (ADLs) such as bathing and dressing</li><li>Meaningful companionship and emotional support</li><li>Fall prevention strategies and mobility assistance</li><li>Personal hygiene care and grooming</li><li>Nutritious meal preparation and feeding assistance</li><li>Medication reminders and accompanying to doctor appointments</li></ul>'
    },
    'icu-setup': {
        title: 'ICU Home Setup',
        icon: 'fas fa-procedures',
        image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=1200',
        description: 'Transitioning a critically ill patient from the hospital to home requires advanced medical infrastructure. We provide a complete, hospital-grade ICU setup at home, complete with state-of-the-art life support equipment and specialized monitoring, supervised by ICU-trained clinical staff available around the clock.',
        details: '<ul><li>Advanced Ventilator, BiPAP, and CPAP support</li><li>Oxygen therapy with high-capacity concentrators and cylinders</li><li>Regular suctioning and continuous pulse oximetry</li><li>Multi-parameter cardiac and vital sign monitors</li><li>Specialized motorized ICU beds and air mattresses</li><li>24/7 care by professional ICU-trained nurses and technicians</li></ul>'
    },
    'post-op-care': {
        title: 'Post-Operative Care',
        icon: 'fas fa-heartbeat',
        image: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&q=80&w=1200',
        description: 'The period immediately following surgery is critical for a full recovery. Our specialized post-operative care team provides professional medical assistance, pain management, and physical rehabilitation support at home to ensure a smooth, infection-free, and accelerated healing process.',
        details: '<ul><li>Comprehensive pain management and medication scheduling</li><li>Expert dressing changes and surgical suture care</li><li>Guided physical therapy assistance for mobility recovery</li><li>Strict nutrition and hydration monitoring tailored to recovery needs</li><li>Vigilant monitoring for signs of infection or complications</li><li>Coordination with the primary surgeon regarding recovery progress</li></ul>'
    },
    'specialized-care': {
        title: 'Specialized Patient Care',
        icon: 'fas fa-wheelchair',
        image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200',
        description: 'Patients facing chronic illnesses, neurological disorders, or those who are bed-ridden require specialized, long-term care plans. We focus on enhancing the patient\'s quality of life through meticulous medical support, rehabilitation, and maximizing their comfort in a familiar home environment.',
        details: '<ul><li>Proactive bed-sore (decubitus ulcer) prevention and treatment</li><li>Dedicated physiotherapy and occupational therapy support</li><li>Comprehensive neurological rehabilitation (Stroke, Parkinson\'s, etc.)</li><li>Safe tube feeding management (NG tube, PEG tube)</li><li>Indwelling and external catheter insertion and care</li><li>Palliative care focusing on comfort and symptom relief</li></ul>'
    },
    'injection-visit': {
        title: 'Injection Visit',
        icon: 'fas fa-syringe',
        image: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&q=80&w=1200',
        description: 'Avoid the hassle of traveling to a clinic for routine injections or fluid therapies. Our qualified nursing staff provides safe, hygienic, and professional injection services right at your doorstep. We adhere to strict medical protocols to ensure patient safety and comfort during every visit.',
        details: '<ul><li>Safe administration of IV (Intravenous), IM (Intramuscular), and SC (Subcutaneous) injections</li><li>Setup and monitoring of IV fluid administration at home</li><li>Timely, scheduled visits aligned with your prescription</li><li>Strict adherence to hygiene, sterilization, and medical protocols</li><li>Qualified, registered nursing staff for every visit</li><li>Emergency back-up support and adverse reaction monitoring</li></ul>'
    }
};

const urlParams = new URLSearchParams(window.location.search);
const serviceKey = urlParams.get('service');
const data = servicesData[serviceKey];

const titleEl = document.getElementById('service-title');
const descEl = document.getElementById('service-description');
const detailsEl = document.getElementById('service-details');
const imageEl = document.getElementById('service-image');
const imageBox = document.getElementById('service-image-box');

if (data) {
    if (titleEl) titleEl.innerText = data.title;
    if (descEl) descEl.innerText = data.description;
    if (detailsEl) detailsEl.innerHTML = `<h4 class="text-white text-xl font-bold mb-6">What we provide:</h4>` + data.details;
    
    if (imageEl && data.image) {
        imageEl.src = data.image;
        if (imageBox) imageBox.style.display = 'block';
    }
    
    document.title = `${data.title} - Maasewa Healthcare`;
} else {
    if (titleEl) titleEl.innerText = 'Service Not Found';
    if (descEl) descEl.innerText = 'The requested service details could not be found.';
}

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

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"], a[href^="index.html#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // If it's a same-page anchor
        if (href !== '#' && href.startsWith('#')) {
            const target = document.querySelector(href);
            const appWrapper = document.querySelector('.app-wrapper');
            
            if (target && appWrapper) {
                e.preventDefault();
                // Close mobile menu
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
        // If it's a link to home page anchor from this page
        else if (href.startsWith('index.html#')) {
            // Close mobile menu before navigating
            const menu = document.getElementById('mobileMenu');
            const toggle = document.getElementById('menuToggle');
            if (menu && menu.classList.contains('active')) {
                menu.classList.remove('active');
                toggle.classList.remove('active');
            }
            // Let the default navigation happen
        }
    });
});
