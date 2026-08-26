// js/ai-engine.js
// A self-contained chess AI built on top of chess.js. Runs synchronously on
// the main thread; searches are time-boxed per difficulty so the UI never
// locks up for long.
window.App = window.App || {};

(function () {
  const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  // Simple piece-square tables (from white's perspective, rank8 -> rank1 rows)
  // encourage central control and reasonable king safety without being fancy.
  const PAWN_PST = [
    [0,0,0,0,0,0,0,0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],
    [0,0,0,20,20,0,0,0],
    [5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],
    [0,0,0,0,0,0,0,0]
  ];
  const KNIGHT_PST = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ];
  const CENTER_BIAS = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,0,5,5,5,5,0,-10],
    [-10,0,0,0,0,0,0,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ];

  function pstValue(type, color, rIdx, fIdx) {
    const row = color === 'w' ? rIdx : 7 - rIdx;
    if (type === 'p') return PAWN_PST[row][fIdx];
    if (type === 'n') return KNIGHT_PST[row][fIdx];
    if (type === 'b' || type === 'q') return CENTER_BIAS[row][fIdx];
    return 0;
  }

  function evaluateBoard(chess) {
    if (chess.in_checkmate()) return chess.turn() === 'w' ? -Infinity : Infinity;
    if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) return 0;

    const board = chess.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p) continue;
        const base = PIECE_VALUE[p.type];
        const pst = pstValue(p.type, p.color, r, f);
        score += (p.color === 'w' ? 1 : -1) * (base + pst);
      }
    }
    return score;
  }

  // MVV-LVA-ish ordering: try captures (higher value victim, lower value
  // attacker first) and promotions before quiet moves, to help alpha-beta
  // prune earlier.
  function orderMoves(moves) {
    return moves.slice().sort((a, b) => {
      const score = (m) => {
        let s = 0;
        if (m.captured) s += PIECE_VALUE[m.captured] * 10 - (PIECE_VALUE[m.piece] || 0);
        if (m.promotion) s += PIECE_VALUE[m.promotion];
        return s;
      };
      return score(b) - score(a);
    });
  }

  function minimax(chess, depth, alpha, beta, maximizing, deadline) {
    if (performance.now() > deadline) throw new Error('TIME_UP');
    if (depth === 0 || chess.game_over()) return evaluateBoard(chess);

    const moves = orderMoves(chess.moves({ verbose: true }));
    if (maximizing) {
      let best = -Infinity;
      for (const m of moves) {
        chess.move(m);
        const val = minimax(chess, depth - 1, alpha, beta, false, deadline);
        chess.undo();
        best = Math.max(best, val);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        chess.move(m);
        const val = minimax(chess, depth - 1, alpha, beta, true, deadline);
        chess.undo();
        best = Math.min(best, val);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function searchBestMove(chess, maxDepth, timeMs) {
    const deadline = performance.now() + timeMs;
    const maximizing = chess.turn() === 'w';
    let bestMove = null;
    let bestDepthReached = 0;

    try {
      for (let depth = 1; depth <= maxDepth; depth++) {
        const moves = orderMoves(chess.moves({ verbose: true }));
        let currentBest = null;
        let currentBestScore = maximizing ? -Infinity : Infinity;

        for (const m of moves) {
          chess.move(m);
          const val = minimax(chess, depth - 1, -Infinity, Infinity, !maximizing, deadline);
          chess.undo();

          if (maximizing ? val > currentBestScore : val < currentBestScore) {
            currentBestScore = val;
            currentBest = m;
          }
        }

        if (currentBest) {
          bestMove = currentBest;
          bestDepthReached = depth;
        }
        if (performance.now() > deadline) break;
      }
    } catch (e) {
      // Time ran out mid-search; fall back to the best move found at the
      // last fully completed depth.
    }

    return bestMove || orderMoves(chess.moves({ verbose: true }))[0] || null;
  }

  const DIFFICULTIES = {
    easy:   { maxDepth: 1, timeMs: 250,  randomness: 0.65 },
    mid:    { maxDepth: 2, timeMs: 500,  randomness: 0.25 },
    hard:   { maxDepth: 3, timeMs: 1200, randomness: 0.05 },
    expert: { maxDepth: 5, timeMs: 2500, randomness: 0 }
  };

  App.AI = {
    DIFFICULTIES,

    // Returns { from, to, promotion } chosen for the side to move, or null
    // if there are no legal moves.
    chooseMove(chess, difficultyKey) {
      const config = DIFFICULTIES[difficultyKey] || DIFFICULTIES.mid;
      const legalMoves = chess.moves({ verbose: true });
      if (legalMoves.length === 0) return null;

      if (Math.random() < config.randomness) {
        const pool = config.maxDepth <= 1
          ? legalMoves
          : orderMoves(legalMoves).slice(0, Math.min(3, legalMoves.length));
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return { from: pick.from, to: pick.to, promotion: pick.promotion || 'q' };
      }

      const best = searchBestMove(chess, config.maxDepth, config.timeMs);
      if (!best) return null;
      return { from: best.from, to: best.to, promotion: best.promotion || 'q' };
    }
  };
})();