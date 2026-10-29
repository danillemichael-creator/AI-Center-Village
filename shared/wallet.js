window.AIVice = (function () {
  var KEY = 'ai-vice-v1';
  var QUEUE_KEY = 'ai-vice-score-queue';

  var CHARACTERS = [
    { id: 'rookie',  name: 'Rookie',  price: 0,   colors: { body: '#eaf6ff', accent: '#2ee6ff' } },
    { id: 'jay',     name: 'Jay',     price: 50,  colors: { body: '#be8c64', accent: '#ff7a3d' } },
    { id: 'michael', name: 'Michael', price: 50,  colors: { body: '#dcaf82', accent: '#2ee6ff' } },
    { id: 'nelson',  name: 'Nelson',  price: 75,  colors: { body: '#aa7850', accent: '#ffd23f' } },
    { id: 'milosz',  name: 'Milosz',  price: 75,  colors: { body: '#e6bea0', accent: '#7a3cff' } },
    { id: 'ophelie', name: 'Ophelie', price: 100, colors: { body: '#f0cdb4', accent: '#ff2fb3' } },
    { id: 'tarik',   name: 'Tarik',   price: 150, colors: { body: '#96643f', accent: '#ff3355' } }
  ];

  function fresh() {
    return { tokens: 0, completed: {}, levels: {}, owned: ['rookie'], active: 'rookie',
             player: { name: '', crew: '' }, muted: false };
  }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (!s || !s.owned) return fresh();
      s.levels = s.levels || {};
      s.player = s.player || { name: '', crew: '' };
      return s;
    } catch (e) {
      return fresh();
    }
  }

  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

  function character(id) {
    for (var i = 0; i < CHARACTERS.length; i++) {
      if (CHARACTERS[i].id === id) return CHARACTERS[i];
    }
    return CHARACTERS[0];
  }

  function enqueueScore(row) {
    try {
      var q = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
      q.push(row);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch (e) {}
  }

  function tokenPopup(n) {
    try {
      var el = document.createElement('div');
      el.textContent = '+' + n + ' TOKENS';
      el.style.cssText = 'position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);' +
        'font-family:\'Press Start 2P\',monospace;font-size:22px;color:#ffd23f;' +
        'text-shadow:0 0 10px #ffd23f,0 0 30px #ff2fb3;z-index:99999;pointer-events:none;' +
        'transition:opacity .4s,transform .8s;opacity:0;';
      document.body.appendChild(el);
      requestAnimationFrame(function () {
        el.style.opacity = '1';
        el.style.transform = 'translate(-50%,-90%)';
      });
      setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 500);
      }, 1400);
    } catch (e) {}
  }

  var api = {
    getTokens: function () { return load().tokens; },

    addTokens: function (gameId, n) {
      var s = load();
      s.tokens += n;
      save(s);
      return s.tokens;
    },

    markComplete: function (gameId) {
      var s = load();
      if (s.completed[gameId]) return false;
      s.completed[gameId] = true;
      save(s);
      return true;
    },

    isComplete: function (gameId) { return !!load().completed[gameId]; },

    getCompleted: function () {
      var s = load(), out = [];
      for (var k in s.completed) if (s.completed[k]) out.push(k);
      return out;
    },

    awardLevel: function (gameId, level, tokens) {
      var s = load();
      s.levels[gameId] = s.levels[gameId] || {};
      var key = String(level);
      if (s.levels[gameId][key]) return false;
      s.levels[gameId][key] = true;
      s.tokens += tokens;
      save(s);
      tokenPopup(tokens);
      try { api.submitScore(gameId, level, tokens); } catch (e) {}
      try { if (api.music && api.music.jingle) api.music.jingle(); } catch (e) {}
      return true;
    },

    getCharacters: function () {
      var s = load();
      return CHARACTERS.map(function (c) {
        return { id: c.id, name: c.name, price: c.price, colors: c.colors,
                 owned: s.owned.indexOf(c.id) !== -1, active: s.active === c.id };
      });
    },

    getActiveCharacter: function () { return character(load().active); },

    buy: function (id) {
      var s = load(), c = character(id);
      if (s.owned.indexOf(id) !== -1) return true;
      if (s.tokens < c.price) return false;
      s.tokens -= c.price;
      s.owned.push(id);
      save(s);
      return true;
    },

    equip: function (id) {
      var s = load();
      if (s.owned.indexOf(id) === -1) return false;
      s.active = id;
      save(s);
      return true;
    },

    setPlayer: function (name, crewCode) {
      var s = load();
      s.player = { name: String(name || '').slice(0, 24), crew: String(crewCode || '').slice(0, 24).toUpperCase() };
      save(s);
      return s.player;
    },

    getPlayer: function () { return load().player; },

    setMuted: function (m) {
      var s = load();
      s.muted = !!m;
      save(s);
    },

    isMuted: function () { return !!load().muted; },

    submitScore: function (gameId, level, points) {
      var p = api.getPlayer();
      enqueueScore({ player_name: p.name || 'Anonymous', crew_code: p.crew || null,
                     game_id: gameId, level: level, points: points });
    },

    getLeaderboard: function () { return Promise.resolve([]); },

    backToHub: function () {
      window.location.href = window.location.pathname.indexOf('/games/') !== -1
        ? '../../index.html'
        : 'index.html';
    },

    reset: function () { save(fresh()); }
  };

  api.characters = CHARACTERS;
  api.redeemCharacter = api.buy;
  api.setActiveCharacter = api.equip;

  window.AIVice = api;
  return api;
})();
