// AI Vice hub bridge: pays Robotics tokens through the shared wallet and links back to the hub.
(function () {
  var KEY = 'mdeanh-robotics-workshop-v1', NEEDED = 4;
  function check() {
    if (!window.AIVice) return;
    try {
      var p = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (p && p.completed && p.completed.length >= NEEDED && AIVice.markComplete('robotics')) AIVice.addTokens('robotics', 50);
    } catch (e) {}
  }
  var b = document.createElement('button');
  b.textContent = '← AI Center';
  b.setAttribute('aria-label', 'Back to AI Center');
  b.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;padding:8px 12px;font:12px monospace;' +
    'background:#152331;color:#f1e6cc;border:2px solid #f1e6cc;cursor:pointer;box-shadow:3px 3px 0 rgba(0,0,0,.5)';
  b.onclick = function () { if (window.AIVice) AIVice.backToHub(); else location.href = '../../index.html'; };
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(b); });
  window.addEventListener('storage', check);
  setInterval(check, 1000);
})();
