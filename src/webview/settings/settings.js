(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- Navigation ----------
  const pages = { home: $('page-home'), settings: $('page-settings') };
  const navButtons = document.querySelectorAll('.sidebar .button[data-page]');

  function showPage(name) {
    Object.entries(pages).forEach(([key, el]) => el.classList.toggle('hidden', key !== name));
    navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.page === name));
    if (name === 'settings') loadSettings();
  }

  navButtons.forEach((btn) => btn.addEventListener('click', () => showPage(btn.dataset.page)));

  // ---------- Éléments ----------
  const ramMin = $('ramMin');
  const ramMax = $('ramMax');
  const logoutBtn = $('logout');

  // ---------- Notification ----------
  let toastTimer;
  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ---------- Affichage ----------
  // La partie colorée du slider passe par une variable CSS (compatible avec la CSP)
  function setFill(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const percent = max > min ? ((input.value - min) / (max - min)) * 100 : 100;
    input.style.setProperty('--fill', percent + '%');
  }

  function updateRamLabels() {
    $('ramMinValue').textContent = ramMin.value + ' Go';
    $('ramMaxValue').textContent = ramMax.value + ' Go';
    setFill(ramMin);
    setFill(ramMax);
  }

  function render(s) {
    ramMin.value = s.ramMin;
    ramMax.value = s.ramMax;
    updateRamLabels();
  }

  async function loadSettings() {
    const { settings, limits, info } = await window.settingsAPI.get();

    // min/max d'abord, sinon la valeur serait rognée par l'ancienne plage
    [ramMin, ramMax].forEach((input) => {
      input.min = limits.min;
      input.max = limits.max;
    });

    $('ramHint').textContent = `Maximum autorisé : ${limits.max} Go (selon la mémoire de ton PC).`;
    $('dataDir').textContent = info.dataDir;
    $('appVersion').textContent = 'v' + info.version;

    render(settings);
  }

  async function save(partial) {
    const updated = await window.settingsAPI.set(partial);
    render(updated);   // le main peut avoir corrigé une valeur
    toast('Enregistré');
  }

  // ---------- RAM ----------
  // Pendant le glissement : on met à jour l'affichage et on garde min <= max
  ramMin.addEventListener('input', () => {
    if (Number(ramMin.value) > Number(ramMax.value)) ramMax.value = ramMin.value;
    updateRamLabels();
  });

  ramMax.addEventListener('input', () => {
    if (Number(ramMax.value) < Number(ramMin.value)) ramMin.value = ramMax.value;
    updateRamLabels();
  });

  // Au relâchement : on sauvegarde
  [ramMin, ramMax].forEach((input) =>
    input.addEventListener('change', () =>
      save({ ramMin: Number(ramMin.value), ramMax: Number(ramMax.value) })
    )
  );

  // ---------- Options ----------
  $('openFolder').addEventListener('click', () => window.settingsAPI.openFolder());

  $('resetSettings').addEventListener('click', async () => {
    render(await window.settingsAPI.reset());
    toast('Paramètres réinitialisés');
  });

  // ---------- Déconnexion (confirmation en 2 clics) ----------
  let confirmTimer;

  function resetLogoutButton() {
    logoutBtn.classList.remove('confirm');
    logoutBtn.textContent = 'Se déconnecter';
  }

  logoutBtn.addEventListener('click', async () => {
    if (!logoutBtn.classList.contains('confirm')) {
      logoutBtn.classList.add('confirm');
      logoutBtn.textContent = 'Clique pour confirmer';
      confirmTimer = setTimeout(resetLogoutButton, 3000);
      return;
    }

    clearTimeout(confirmTimer);
    resetLogoutButton();

    const ok = await window.settingsAPI.logout();
    if (ok) {
      if (typeof refreshProfile === 'function') await refreshProfile();
      toast('Déconnecté');
    } else {
      toast('Impossible pendant le lancement du jeu');
    }
  });

  // Affiche la vraie version dans la sidebar dès le démarrage
  loadSettings();
})();