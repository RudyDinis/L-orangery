// router.js
// Remplace l'ancienne navigation.js (window.location.href = ...) qui rechargeait
// tout le document à chaque clic (= cause du flash blanc).
// Ici on affiche/masque des sections déjà présentes dans le DOM : aucun reload,
// donc aucun flash possible.
//
// Si index.js / mods.js / settings.js exposent une fonction d'init sur window
// (ex: window.initMods = function () {...}), elle sera appelée automatiquement
// la première fois que la vue correspondante est affichée. Sinon, laisse tes
// scripts s'exécuter normalement au chargement : comme les 3 vues existent
// désormais toutes dans le même DOM dès le départ, leurs querySelector/getElementById
// fonctionnent même si la vue est cachée (hidden).

(function () {
  const views = {
    home: document.getElementById('view-home'),
    mods: document.getElementById('view-mods'),
    settings: document.getElementById('view-settings'),
  };

  const initialized = { home: false, mods: false, settings: false };

  function showView(name) {
    if (!views[name]) return;

    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      // .hidden est déjà définie dans mods.css et settings.css
      // (display: none !important), on réutilise cette convention.
      el.classList.toggle('hidden', key !== name);
    });

    document.querySelectorAll('.button[data-view]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });

    // Init différée optionnelle (voir commentaire en haut du fichier)
    if (!initialized[name]) {
      initialized[name] = true;
      const initFn = window['init' + name.charAt(0).toUpperCase() + name.slice(1)];
      if (typeof initFn === 'function') initFn();
    }
  }

  document.querySelectorAll('.button[data-view]').forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.view));
  });

  // Vue par défaut au démarrage
  showView('home');

  // Exposé au cas où tu veux naviguer depuis un autre script (ex: après le login)
  window.showView = showView;
})();