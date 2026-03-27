/* ============================================
   WALLET MOCKUP - Interactive Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initBalanceCounter();
  initDotsInteraction();
  initActionButtonRipple();
  initNavInteraction();
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

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
}
