(function () {
  // メニューボタンが無いページには自動生成する
  let menuButton = document.querySelector('.global-bar__menu');
  if (!menuButton) {
    const barInner = document.querySelector('.global-bar__inner');
    if (!barInner) {
      return;
    }
    menuButton = document.createElement('button');
    menuButton.className = 'global-bar__menu';
    menuButton.type = 'button';
    menuButton.setAttribute('aria-label', 'メニューを開く');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.innerHTML =
      '<svg class="global-bar__menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    barInner.appendChild(menuButton);
  }

  // メニューパネルが無いページには自動生成する
  let menu = document.querySelector('[data-global-menu]');
  if (!menu) {
    menu = document.createElement('nav');
    menu.className = 'global-menu';
    menu.id = 'global-menu';
    menu.setAttribute('data-global-menu', '');
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML =
      '<div class="global-menu__backdrop" data-menu-dismiss aria-hidden="true"></div>' +
      '<div class="global-menu__panel" role="dialog" aria-modal="true" aria-labelledby="global-menu-title">' +
      '<div class="global-menu__header">' +
      '<h2 class="global-menu__title" id="global-menu-title">コンテンツ一覧</h2>' +
      '<button class="global-menu__close" type="button" aria-label="メニューを閉じる" data-menu-dismiss data-menu-initial>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button></div>' +
      '<ul class="global-menu__list"></ul>' +
      '<p class="global-menu__footer">ご希望のコンテンツを選択してください。</p>' +
      '<button class="global-menu__close" type="button" data-menu-dismiss>メニューを閉じる</button>' +
      '</div>';
    document.body.appendChild(menu);
    menuButton.setAttribute('aria-controls', 'global-menu');
  }

  // メニュー項目の一元管理：ここを書き換えれば全ページのメニューが更新される
  const MENU_ITEMS = [
    { href: './index.html#contents', title: '🏠 ホーム / コンテンツ一覧', desc: 'SloSea のトップページ。' },
    { href: './surfpoint/index.html', title: '🗾 全国 波情報マップ', desc: '日本地図から波高・うねり・風を5日先までチェック。' },
    { href: './shonanforecast.html', title: '🌊 湘南の波予報', desc: '鎌倉〜平塚エリアのポイント別コンディション。' },
    { href: './namimikuji.html', title: '🎋 波みくじ', desc: '今日のサーフ運を占ってからパドルアウト。' },
    { href: './game.html', title: '🏄 Surf Mini Game', desc: '波を避けてコインを集めるカジュアルゲーム。' },
    { href: './slot.html', title: '🎰 波運スロット', desc: '目押しで波運を試すスロットマシン。' },
    { href: './stickers.html', title: '🔖 スポンサー風ステッカー配布', desc: 'ボードを“盛る”ジョーク系ロゴ素材を無料配布。' },
    { href: './surfboard-guide.html', title: '📖 サーフボード選び【保存版】', desc: '診断つき。初めての1本の選び方ガイド。' },
    { href: './beginner-gear.html', title: '🎒 初心者が揃える道具一式', desc: '最初に必要なギアと予算感をまるっと解説。' },
    { href: './about.html', title: '⛵ SloSea について', desc: 'サイトのコンセプトと運営者情報。' },
    { href: './policy.html', title: '📄 ポリシー / プライバシー', desc: '安心して使っていただくために。' }
  ];

  const list = menu.querySelector('.global-menu__list');
  if (list) {
    list.innerHTML = MENU_ITEMS.map((item) => (
      '<li class="global-menu__item"><a href="' + item.href + '">' + item.title + '</a><p>' + item.desc + '</p></li>'
    )).join('');
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
