window.AIViceSprite = (function () {
  var TOP = [
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    '.hehhhhhheh.',
    '.hhhhhhhhhh.',
    '..bbbbbbbb..',
    '.bbbabbabbb.',
    '.bbbbbbbbbb.'
  ];
  var LEGS_A = [
    '..ppp..ppp..',
    '..ppp..ppp..',
    '..fff..fff..'
  ];
  var LEGS_B = [
    '..pppppppp..',
    '.ppp....ppp.',
    '.fff....fff.'
  ];
  var DARK = '#160b2e';

  function draw(ctx, colors, frame, x, y, px) {
    var rows = TOP.concat(frame === 1 ? LEGS_B : LEGS_A);
    px = px || 4;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      for (var c = 0; c < row.length; c++) {
        var ch = row[c], col = null;
        if (ch === 'h') col = colors.body;
        else if (ch === 'e') col = colors.accent;
        else if (ch === 'b') col = colors.accent;
        else if (ch === 'a') col = colors.body;
        else if (ch === 'p') col = DARK;
        else if (ch === 'f') col = colors.body;
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x + c * px, y + r * px, px, px);
      }
    }
  }

  function drawPortrait(ctx, colors, size) {
    var px = size / 12;
    draw(ctx, colors, 0, 0, px * 0.6, px);
  }

  return { draw: draw, drawPortrait: drawPortrait, W: 12, H: 10 };
})();
