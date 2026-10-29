(function () {
  var base = document.currentScript.src.replace(/[^/]*$/, '');
  var files = [
    'config.js',
    'wallet.js',
    'sprite.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
    'leaderboard.js',
    'https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js',
    'music.js'
  ];
  var out = files.map(function (f) {
    var src = f.indexOf('http') === 0 ? f : base + f;
    return '<script src="' + src + '"><\/script>';
  });
  out.push('<script>(function(){window.AIVice=window.AIVice||{};window.AIVice.ready=true;' +
    'setTimeout(function(){document.dispatchEvent(new CustomEvent("aivice:ready"));},0);})();<\/script>');
  document.write(out.join('\n'));
})();
