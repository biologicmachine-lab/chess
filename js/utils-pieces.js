// js/utils-pieces.js
window.App = window.App || {};

App.Pieces = {
  // Both colors use the same solid glyph set — color/metal look is handled
  // entirely by CSS (.piece.white / .piece.black), not by the font's
  // separate "white" outline glyphs, which render hollow in most fonts.
  UNICODE: {
    w: { p:'♟', n:'♞', b:'♝', r:'♜', q:'♛', k:'♚' },
    b: { p:'♟', n:'♞', b:'♝', r:'♜', q:'♛', k:'♚' }
  },
  FILES: ['a','b','c','d','e','f','g','h']
};
