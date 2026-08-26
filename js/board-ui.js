// js/board-ui.js
// Renders an 8x8 board into a container element and reports square clicks.
// Knows nothing about chess rules - purely a view + input layer.
window.App = window.App || {};

App.BoardUI = class BoardUI {
  constructor(containerEl, { onSquareClick } = {}) {
    this.containerEl = containerEl;
    this.onSquareClick = onSquareClick || (() => {});
    this.selected = null;      // square string, e.g. 'e2'
    this.legalTargets = [];    // verbose move objects from the selected square
    this.lastMove = null;      // { from, to }
    this.checkedSquare = null; // square string or null
    this._buildSquares();
  }

  _buildSquares() {
    const { FILES } = App.Pieces;
    this.containerEl.innerHTML = '';
    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const file = FILES[f];
        const sq = file + r;
        const div = document.createElement('div');
        div.className = 'sq ' + ((f + r) % 2 === 0 ? 'light' : 'dark');
        div.dataset.square = sq;

        if (f === 0) {
          const rl = document.createElement('span');
          rl.className = 'rank-label';
          rl.textContent = r;
          div.appendChild(rl);
        }
        if (r === 1) {
          const fl = document.createElement('span');
          fl.className = 'file-label';
          fl.textContent = file;
          div.appendChild(fl);
        }

        div.addEventListener('click', () => this.onSquareClick(sq));
        this.containerEl.appendChild(div);
      }
    }
  }

  setSelection(square, legalTargets) {
    this.selected = square;
    this.legalTargets = legalTargets || [];
  }

  clearSelection() {
    this.selected = null;
    this.legalTargets = [];
  }

  setLastMove(from, to) {
    this.lastMove = from && to ? { from, to } : null;
  }

  setLocked(locked) {
    this.containerEl.classList.toggle('locked', !!locked);
  }

  // chess: a chess.js Chess instance
  render(chess) {
    const { UNICODE, FILES } = App.Pieces;
    const boardState = chess.board(); // [0]=rank8 ... [7]=rank1

    let checkSquare = null;
    if (chess.in_check && chess.in_check()) {
      checkSquare = this._findKing(chess, chess.turn());
    }

    this.containerEl.querySelectorAll('.sq').forEach((sqEl) => {
      const sq = sqEl.dataset.square;
      sqEl.querySelectorAll('.piece,.dot,.ring').forEach((el) => el.remove());
      sqEl.classList.remove('selected', 'last-from', 'last-to', 'check');

      const file = sq[0];
      const rank = parseInt(sq[1], 10);
      const fIdx = FILES.indexOf(file);
      const rIdx = 8 - rank;
      const piece = boardState[rIdx][fIdx];

      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (piece.color === 'w' ? 'white' : 'black');
        span.textContent = UNICODE[piece.color][piece.type];
        sqEl.appendChild(span);
      }

      if (this.selected === sq) sqEl.classList.add('selected');
      if (this.lastMove && this.lastMove.from === sq) sqEl.classList.add('last-from');
      if (this.lastMove && this.lastMove.to === sq) sqEl.classList.add('last-to');
      if (checkSquare === sq) sqEl.classList.add('check');

      const targetMove = this.legalTargets.find((m) => m.to === sq);
      if (targetMove) {
        const marker = document.createElement('span');
        marker.className = targetMove.captured ? 'ring' : 'dot';
        sqEl.appendChild(marker);
      }
    });
  }

  _findKing(chess, color) {
    const { FILES } = App.Pieces;
    const b = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = b[r][f];
        if (p && p.type === 'k' && p.color === color) return FILES[f] + (8 - r);
      }
    }
    return null;
  }
};