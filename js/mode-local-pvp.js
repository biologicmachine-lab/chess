// js/mode-local-pvp.js
// Both players share the same device/board. Whoever's turn it is may move
// either color's pieces - no network, no AI, no restrictions.
window.App = window.App || {};
App.Modes = App.Modes || {};

App.Modes.localPvp = function localPvp() {
  return {
    label: 'Player vs Player',
    allowUndo: true,

    canMove() {
      return true;
    },

    afterMove() {
      // no side effects - both sides are local humans
    },

    init(controller) {
      controller.setModeNote('Same device — pass it over after each move.');
      // Rotate Black's pieces 180deg so they read upright to whoever is
      // sitting opposite, since this mode passes one device back and forth.
      document.getElementById('board').classList.add('inward-facing');
    }
  };
};
