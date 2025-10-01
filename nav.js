(function () {
  const yearElements = document.querySelectorAll('[data-current-year]');
  const currentYear = new Date().getFullYear();
  yearElements.forEach((el) => {
    el.textContent = currentYear;
  });

  const menuContainer = document.querySelector('.global-bar__menu-container');
  if (!menuContainer) {
    return;
  }

  const menuButton = menuContainer.querySelector('.global-bar__menu');
  const menuPanel = menuContainer.querySelector('.global-bar__panel');

  if (!menuButton || !menuPanel) {
    return;
  }

  let lastFocusedElement = null;
  const focusableSelectors = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const focusableContent = () => Array.from(menuPanel.querySelectorAll(focusableSelectors));

  menuButton.setAttribute('aria-expanded', 'false');
  menuPanel.setAttribute('hidden', '');

  function openMenu() {
    if (menuContainer.classList.contains('is-open')) {
      return;
    }

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menuContainer.classList.add('is-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuPanel.removeAttribute('hidden');

    const [firstFocusable] = focusableContent();
    if (firstFocusable) {
      window.requestAnimationFrame(() => firstFocusable.focus());
    }

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);
  }

  function closeMenu(restoreFocus = true) {
    if (!menuContainer.classList.contains('is-open')) {
      return;
    }

    menuContainer.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuPanel.setAttribute('hidden', '');

    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleKeydown);

    if (restoreFocus && lastFocusedElement) {
      lastFocusedElement.focus();
    } else if (restoreFocus) {
      menuButton.focus();
    }

    lastFocusedElement = null;
  }

  function handleOutsideClick(event) {
    if (!menuContainer.contains(event.target)) {
      closeMenu(false);
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeMenu();
      return;
    }

    if (event.key === 'Tab' && menuContainer.classList.contains('is-open')) {
      const focusable = focusableContent();
      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }
  }

  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (menuContainer.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuButton.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !menuContainer.classList.contains('is-open')) {
      event.preventDefault();
      openMenu();
    }
  });

  menuPanel.addEventListener('click', (event) => {
    const link = event.target instanceof HTMLElement ? event.target.closest('a[href]') : null;
    if (link) {
      closeMenu(false);
    }
  });
})();
