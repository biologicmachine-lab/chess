// js/game-controller.js
// Ties the chess.js rules engine, the BoardUI view, and the side-panel DOM
// together. Turn-taking policy (who is allowed to move when) and post-move
// side effects (send to peer, trigger AI, etc.) are delegated to a "mode"
// object so this file stays the same across local, computer, and online play.
window.App = window.App || {};

App.GameController = class GameController {
  constructor({ boardUI, dom, mode }) {
    this.chess = new Chess();
    this.boardUI = boardUI;
    this.dom = dom; // { statusEl, turnDot, turnLabel, modeNoteEl, moveListEl,
                     //   capturedByWhiteEl, capturedByBlackEl, promoOverlay, promoChoices }
    this.mode = mode;
    this.pendingPromotion = null;

    this.boardUI.onSquareClick = (sq) => this._onSquareClick(sq);

    if (this.mode.init) this.mode.init(this);
    this._fullRender();
  }

  // --- public API used by mode adapters -----------------------------------

  applyExternalMove(from, to, promotion) {
    const move = this.chess.move({ from, to, promotion: promotion || 'q' });
    if (!move) return null;
    this.boardUI.setLastMove(from, to);
    this.boardUI.clearSelection();
    this._fullRender();
    if (this.mode.afterMove) this.mode.afterMove(move, this.chess, this, { external: true });
    this._checkGameOver();
    return move;
  }

  setModeNote(text) {
    if (this.dom.modeNoteEl) this.dom.modeNoteEl.textContent = text || '';
  }

  reset() {
    this.chess.reset();
    this.boardUI.setLastMove(null, null);
    this.boardUI.clearSelection();
    if (this.mode.afterReset) this.mode.afterReset(this.chess, this);
    this._fullRender();
  }

  undo() {
    if (this.mode.allowUndo === false) return;
    this.chess.undo();
    this.boardUI.setLastMove(null, null);
    this.boardUI.clearSelection();
    this._fullRender();
  }

  // --- internal -------------------------------------------------------------

  _onSquareClick(sq) {
    if (this.pendingPromotion) return;
    if (this.mode.canMove && !this.mode.canMove(this.chess, this)) return;

    const piece = this.chess.get(sq);
    const selected = this.boardUI.selected;

    if (selected) {
      const move = this.boardUI.legalTargets.find((m) => m.to === sq);
      if (move) {
        this._attemptMove(selected, sq, move);
        return;
      }
      if (piece && piece.color === this.chess.turn()) {
        this._selectSquare(sq);
      } else {
        this.boardUI.clearSelection();
        this.boardUI.render(this.chess);
      }
      return;
    }

    if (piece && piece.color === this.chess.turn()) {
      this._selectSquare(sq);
    }
  }

  _selectSquare(sq) {
    const legal = this.chess.moves({ square: sq, verbose: true });
    this.boardUI.setSelection(sq, legal);
    this.boardUI.render(this.chess);
  }

  _attemptMove(from, to, moveObj) {
    const isPromotion = moveObj.flags.indexOf('p') !== -1;
    if (isPromotion) {
      this.pendingPromotion = { from, to };
      this._openPromoDialog();
      return;
    }
    this._commitMove(from, to);
  }

  _commitMove(from, to, promotion) {
    const move = this.chess.move({ from, to, promotion: promotion || 'q' });
    if (!move) return;
    this.boardUI.setLastMove(from, to);
    this.boardUI.clearSelection();
    this._fullRender();
    if (this.mode.afterMove) this.mode.afterMove(move, this.chess, this, { external: false });
    this._checkGameOver();
  }

  _openPromoDialog() {
    const color = this.chess.turn();
    const { UNICODE } = App.Pieces;
    const { promoOverlay, promoChoices } = this.dom;
    promoChoices.innerHTML = '';
    ['q', 'r', 'b', 'n'].forEach((type) => {
      const btn = document.createElement('button');
      btn.textContent = UNICODE[color][type];
      btn.addEventListener('click', () => {
        const { from, to } = this.pendingPromotion;
        this.pendingPromotion = null;
        promoOverlay.classList.remove('open');
        this._commitMove(from, to, type);
      });
      promoChoices.appendChild(btn);
    });
    promoOverlay.classList.add('open');
  }

  _checkGameOver() {
    // Hook point: mode adapters can react to game end (e.g. stop AI, notify peer)
    if (this.chess.game_over() && this.mode.onGameOver) {
      this.mode.onGameOver(this.chess, this);
    }
  }

  _fullRender() {
    this.boardUI.render(this.chess);
    this._updateStatus();
    this._updateHistory();
    this._updateCaptures();
  }

  _updateStatus() {
    const { statusEl, turnDot, turnLabel } = this.dom;
    let text = '';
    let alert = false;

    if (this.chess.in_checkmate()) {
      const winner = this.chess.turn() === 'w' ? 'Black' : 'White';
      text = winner + ' wins by checkmate.';
      alert = true;
    } else if (this.chess.in_stalemate()) {
      text = 'Stalemate — the board is drawn.';
      alert = true;
    } else if (this.chess.in_threefold_repetition()) {
      text = 'Draw by threefold repetition.';
      alert = true;
    } else if (this.chess.insufficient_material()) {
      text = 'Draw — insufficient material.';
      alert = true;
    } else if (this.chess.in_draw()) {
      text = 'Draw by the fifty-move rule.';
      alert = true;
    } else if (this.chess.in_check()) {
      text = (this.chess.turn() === 'w' ? 'White' : 'Black') + ' is in check.';
      alert = true;
    } else {
      text = (this.chess.turn() === 'w' ? 'White' : 'Black') + ' to move.';
    }

    statusEl.textContent = text;
    statusEl.classList.toggle('alert', alert);
    turnLabel.textContent = (this.chess.turn() === 'w' ? 'White' : 'Black') + ' to move';
    turnDot.className = 'turn-dot' + (this.chess.turn() === 'b' ? ' black' : '');
  }

  _updateHistory() {
    const { moveListEl } = this.dom;
    const verbose = this.chess.history({ verbose: true });
    moveListEl.innerHTML = '';
    for (let i = 0; i < verbose.length; i += 2) {
      const li = document.createElement('li');
      const whiteMove = verbose[i] ? verbose[i].san : '';
      const blackMove = verbose[i + 1] ? verbose[i + 1].san : '';
      li.innerHTML = '<b>' + whiteMove + '</b>' + (blackMove ? '  ' + blackMove : '');
      moveListEl.appendChild(li);
    }
    moveListEl.parentElement.scrollTop = moveListEl.parentElement.scrollHeight;
  }

  _updateCaptures() {
    const { UNICODE } = App.Pieces;
    const { capturedByWhiteEl, capturedByBlackEl } = this.dom;
    const verbose = this.chess.history({ verbose: true });
    const takenFromBlack = [];
    const takenFromWhite = [];
    verbose.forEach((m) => {
      if (m.captured) {
        const capturedColor = m.color === 'w' ? 'b' : 'w';
        const glyph = UNICODE[capturedColor][m.captured];
        if (m.color === 'w') takenFromBlack.push(glyph);
        else takenFromWhite.push(glyph);
      }
    });
    capturedByWhiteEl.textContent = takenFromBlack.join(' ') || '—';
    capturedByBlackEl.textContent = takenFromWhite.join(' ') || '—';
  }
};
