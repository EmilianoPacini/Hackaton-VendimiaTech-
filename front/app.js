/* ============================================
   WALLET MOCKUP - Interactive Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initBalanceCounter();
  initDotsInteraction();
  initActionButtonRipple();
  initNavInteraction();
  initFloatingSettingsButton();
});

/* --- Animated Balance Counter --- */
function initBalanceCounter() {
  const balanceEl = document.getElementById('balance-value');
  if (!balanceEl) return;

  const targetValue = 3099015;
  const duration = 1800;
  const startTime = performance.now();

  function formatCurrency(value) {
    return '$' + Math.floor(value).toLocaleString('en-US');
  }

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // EaseOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const currentValue = eased * targetValue;

    balanceEl.textContent = formatCurrency(currentValue);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

/* --- Dots Indicator Interaction --- */
function initDotsInteraction() {
  const dots = document.querySelectorAll('.dot');

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      dots.forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');

      // Slight mascot wobble on dot change
      const mascot = document.querySelector('.mascot-container');
      if (mascot) {
        mascot.style.animation = 'none';
        mascot.offsetHeight; // force reflow
        mascot.style.animation = 'mascot-float 4s ease-in-out infinite';
      }
    });
  });
}

/* --- Action Button Ripple Effect --- */
function initActionButtonRipple() {
  const buttons = document.querySelectorAll('.action-btn-circle');

  buttons.forEach((btn) => {
    btn.addEventListener('click', function (e) {
      const circle = document.createElement('span');
      const diameter = Math.max(btn.clientWidth, btn.clientHeight);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
      circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
      circle.style.position = 'absolute';
      circle.style.borderRadius = '50%';
      circle.style.background = 'rgba(59, 130, 246, 0.18)';
      circle.style.transform = 'scale(0)';
      circle.style.animation = 'ripple-expand 0.5s ease-out forwards';
      circle.style.pointerEvents = 'none';

      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(circle);

      setTimeout(() => circle.remove(), 600);
    });
  });

  // Add ripple keyframes dynamically
  if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
      @keyframes ripple-expand {
        to { transform: scale(4); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/* --- Bottom Nav Interaction --- */
function initNavInteraction() {
  const navItems = document.querySelectorAll('.nav-item');
  const screenContent = document.querySelector('.screen-content');

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      
      // Si es un link válido y no es la página actual
      if (href && !href.startsWith('javascript')) {
        // Solo animar si no está ya activo
        if (!item.classList.contains('active')) {
          e.preventDefault();
          
          // Agregar clase de transición
          if (screenContent) {
            screenContent.style.opacity = '0';
            screenContent.style.transform = 'translateY(8px)';
          }
          
          // Navegar después de la animación
          setTimeout(() => {
            window.location.href = href;
          }, 300);
          
          return;
        }
      }
      
      // Actualizar estado activo del nav
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
  
  // Animar entrada cuando la página carga
  if (screenContent) {
    screenContent.style.opacity = '1';
    screenContent.style.transform = 'translateY(0)';
    screenContent.style.transition = 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }
}

/* --- Floating Settings Button --- */
function initFloatingSettingsButton() {
  const floatingBtn = document.querySelector('.floating-settings-btn');
  if (!floatingBtn) return;

  floatingBtn.addEventListener('click', () => {
    const navElement = document.querySelector('.bottom-nav');
    if (navElement) {
      // Smooth scroll to the nav element
      navElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      
      // Highlight the nav by adding a pulse effect
      navElement.style.animation = 'none';
      navElement.offsetHeight; // force reflow
      navElement.style.animation = 'nav-pulse 0.6s ease-out';
      
      setTimeout(() => {
        navElement.style.animation = 'none';
      }, 600);
    }
  });
}

/* Add nav pulse animation if not already present */
if (!document.getElementById('nav-pulse-style')) {
  const style = document.createElement('style');
  style.id = 'nav-pulse-style';
  style.textContent = `
    @keyframes nav-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      }
    }
  `;
  document.head.appendChild(style);
}

