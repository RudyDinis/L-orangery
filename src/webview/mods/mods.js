(() => {
  const list = document.getElementById('modsList');
  const search = document.getElementById('modsSearch');
  const count = document.getElementById('modsCount');
  const subtitle = document.querySelector('.settings_sub');

  const ICON_DIR = './assets/mods/';
  const DEFAULT_ICON = ICON_DIR + 'default.png';

  let mods = [];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createCard(mod) {
    const card = el('div', 'card mod_card');

    const img = el('img', 'mod_icon');
    img.alt = '';
    img.src = mod.icon ? ICON_DIR + mod.icon : DEFAULT_ICON;
    // Icône introuvable : on met celle par défaut (une seule fois, pas de boucle)
    img.addEventListener('error', () => { img.src = DEFAULT_ICON; }, { once: true });

    const info = el('div', 'mod_info');

    const head = el('div', 'mod_head');
    head.appendChild(el('span', 'mod_name', mod.name || 'Mod sans nom'));
    if (mod.version) head.appendChild(el('span', 'mod_version', 'v' + mod.version));
    info.appendChild(head);

    if (mod.author) info.appendChild(el('p', 'mod_author', 'par ' + mod.author));
    if (mod.description) info.appendChild(el('p', 'mod_desc', mod.description));

    card.append(img, info);
    if (mod.category) card.appendChild(el('span', 'mod_tag', mod.category));

    return card;
  }

  function render() {
    const query = search.value.trim().toLowerCase();

    const filtered = mods.filter((m) =>
      [m.name, m.description, m.category, m.author]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );

    if (filtered.length === 0) {
      list.replaceChildren(el('p', 'mods_empty', mods.length ? 'Aucun mod trouvé.' : 'Aucun mod pour le moment.'));
    } else {
      list.replaceChildren(...filtered.map(createCard));
    }

    count.textContent = `${filtered.length} mod${filtered.length > 1 ? 's' : ''}`;
  }

  async function load() {
    const [loadedMods, instance] = await Promise.all([
      window.modsAPI.get(),
      window.modsAPI.getInstance()
    ]);
    mods = loadedMods;
    if (subtitle) subtitle.textContent = `Les mods inclus dans l'instance ${instance}.`;
    render();
  }

  search.addEventListener('input', render);
  load();
})();
