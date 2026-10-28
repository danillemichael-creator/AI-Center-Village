window.AIVice = (function () {
  var KEY = 'ai-vice-v1';

  var CHARACTERS = [
    { id: 'rookie',     name: 'Rookie',      price: 0,   colors: { body: '#eaf6ff', accent: '#2ee6ff' } },
    { id: 'crocket',    name: 'Crocket',     price: 40,  colors: { body: '#ff9ad5', accent: '#ff2fb3' } },
    { id: 'tubbs',      name: 'Tubbs',       price: 40,  colors: { body: '#8beaff', accent: '#2ee6ff' } },
    { id: 'neon-nina',  name: 'Neon Nina',   price: 80,  colors: { body: '#ffb27a', accent: '#ff7a3d' } },
    { id: 'pixel-palm', name: 'Pixel Palm',  price: 80,  colors: { body: '#ffe58b', accent: '#ffd23f' } },
    { id: 'ghost',      name: 'Ghost',       price: 120, colors: { body: '#b08cd9', accent: '#7a3cff' } }
  ];

  function fresh() {
    return { tokens: 0, completed: {}, owned: ['rookie'], active: 'rookie' };
  }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      return s && s.owned ? s : fresh();
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

  return {
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

    backToHub: function () {
      window.location.href = window.location.pathname.indexOf('/games/') !== -1
        ? '../../index.html'
        : 'index.html';
    },

    reset: function () { save(fresh()); }
  };
})();
