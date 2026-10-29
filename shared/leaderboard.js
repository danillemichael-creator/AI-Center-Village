(function () {
  var QUEUE_KEY = 'ai-vice-score-queue';
  var GAMES = { 'python-lab': 1, 'robotics': 1, 'dx-lab': 1, 'matrix-motel': 1 };

  var sb = null;
  if (window.supabase && window.supabase.createClient && window.AIVICE_CONFIG) {
    try {
      sb = window.supabase.createClient(AIVICE_CONFIG.SUPABASE_URL, AIVICE_CONFIG.SUPABASE_KEY);
    } catch (e) {
      sb = null;
    }
  }

  function queue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; }
    catch (e) { return []; }
  }

  function setQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
  }

  function enqueue(row) {
    var q = queue();
    q.push(row);
    setQueue(q);
  }

  function flush() {
    if (!sb) return;
    var q = queue();
    if (!q.length) return;
    var rest = [];
    (function next(i) {
      if (i >= q.length) { setQueue(rest); return; }
      sb.from('aivice_scores').insert(q[i]).then(function (res) {
        if (res.error) rest.push(q[i]);
        next(i + 1);
      }).catch(function () {
        rest.push(q[i]);
        next(i + 1);
      });
    })(0);
  }

  AIVice.submitScore = function (gameId, level, points) {
    if (!GAMES[gameId]) return;
    var p = AIVice.getPlayer();
    var row = { player_name: p.name || 'Anonymous', crew_code: p.crew || null,
                game_id: gameId, level: level, points: points };
    if (!sb) { enqueue(row); return; }
    try {
      Promise.resolve(sb.from('aivice_scores').insert(row))
        .then(function (res) { if (res && res.error) enqueue(row); })
        .catch(function () { enqueue(row); });
    } catch (e) {
      enqueue(row);
    }
  };

  AIVice.getLeaderboard = function (opts) {
    opts = opts || {};
    if (!sb) return Promise.resolve([]);
    var q = sb.from('aivice_leaderboard')
      .select('player_name,crew_code,total_points,games_played')
      .order('total_points', { ascending: false })
      .limit(opts.limit || 20);
    if (opts.crewCode) q = q.eq('crew_code', opts.crewCode);
    return Promise.resolve(q)
      .then(function (res) { return res.error ? [] : (res.data || []); })
      .catch(function () { return []; });
  };

  flush();
  setInterval(flush, 30000);
  window.addEventListener('online', flush);
})();
