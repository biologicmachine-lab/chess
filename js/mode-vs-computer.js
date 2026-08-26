// js/mode-vs-computer.js
// The human plays one color; the App.AI engine plays the other. The AI move
// runs on a short timeout so the "thinking" status has a chance to paint
// before the (synchronous) search blocks the main thread.
window.App = window.App || {};
App.Modes = App.Modes || {};

App.Modes.vsComputer = function vsComputer({ playerColor, difficulty }) {
  const computerColor = playerColor === 'w' ? 'b' : 'w';
  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  function maybeTriggerComputer(chess, controller) {
    if (chess.game_over()) return;
    if (chess.turn() !== computerColor) return;

    controller.setModeNote('Computer (' + difficultyLabel + ') is thinking…');
    controller.boardUI.setLocked(true);

    setTimeout(() => {
      const move = App.AI.chooseMove(chess, difficulty);
      controller.boardUI.setLocked(false);
      if (move) {
        controller.applyExternalMove(move.from, move.to, move.promotion);
      }
      if (!chess.game_over()) {
        controller.setModeNote('Your move — you are playing ' + (playerColor === 'w' ? 'White' : 'Black') + '.');
      }
    }, 150);
  }

  return {
    label: 'Player vs Computer',
    allowUndo: true,

    canMove(chess) {
      return chess.turn() === playerColor;
    },

    afterMove(move, chess, controller) {
      maybeTriggerComputer(chess, controller);
    },

    afterReset(chess, controller) {
      controller.setModeNote('Your move — you are playing ' + (playerColor === 'w' ? 'White' : 'Black') + '.');
      maybeTriggerComputer(chess, controller);
    },

    init(controller) {
      controller.setModeNote('Your move — you are playing ' + (playerColor === 'w' ? 'White' : 'Black') + '.');
      maybeTriggerComputer(controller.chess, controller);
    }
  };
};
