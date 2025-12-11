(function () {
  const menu = document.querySelector('[data-global-menu]');
  const menuButton = document.querySelector('.global-bar__menu');
  if (!menu || !menuButton) {
    return;
  }

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];

  let lastFocusedElement = null;

  function getFocusableElements() {
    return menu.querySelectorAll(focusableSelectors.join(','));
  }

  function openMenu() {
    if (menu.classList.contains('is-open')) {
      return;
    }

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-menu-open');

    const focusTarget = menu.querySelector('[data-menu-initial]');
    const focusable = focusTarget || getFocusableElements()[0];
    if (focusable instanceof HTMLElement) {
      focusable.focus();
    }
  }

  function closeMenu() {
    if (!menu.classList.contains('is-open')) {
      return;
    }

    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-menu-open');

    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    } else {
      menuButton.focus();
    }
  }

  function handleToggle() {
    if (menu.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  menuButton.addEventListener('click', handleToggle);

  menu.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.hasAttribute('data-menu-dismiss')) {
      event.preventDefault();
      closeMenu();
      return;
    }

    const link = target.closest('a');
    if (link && menu.contains(link)) {
      closeMenu();
    }
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = Array.from(getFocusableElements());
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement);
      let nextIndex = currentIndex;

      if (event.shiftKey) {
        nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
      }

      focusable[nextIndex].focus();
      event.preventDefault();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      event.preventDefault();
      closeMenu();
    }
  });
})();
