// Blue Mountains District Competition Camp Scorer
// Scoring logic and UI will be extended here.

document.addEventListener('DOMContentLoaded', function () {
  console.log('Competition Camp Scorer loaded.');

  // Burger menu toggle
  const burgerMenu = document.getElementById('burgerMenu');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  burgerMenu.addEventListener('click', function () {
    burgerMenu.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close menu when clicking a link (mobile)
  navLinks.forEach(link => {
    link.addEventListener('click', function () {
      if (window.innerWidth < 768) {
        burgerMenu.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  });

  // Smooth scroll to sections (only on index.html)
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
});
