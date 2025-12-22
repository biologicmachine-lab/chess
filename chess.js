// Chess piece unicode symbols
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Initial board setup
const INITIAL_BOARD = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

class ChessGame {
    constructor() {
        this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this. validMoves = [];
        this. moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        this.gameMode = 'local'; // 'local' or 'computer'
        this.init();
    }

    init() {
        this.renderBoard();
        this.attachEventListeners();
        this.updateTurnIndicator();
    }

    renderBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document. createElement('div');
                square. className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = PIECES[piece];
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                chessboard.appendChild(square);
            }
        }
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;

        const piece = this.board[row][col];

        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this. selectedSquare;
            
            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this. makeMove(selectedRow, selectedCol, row, col);
                this. selectedSquare = null;
                this.validMoves = [];
            } else if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
                this.selectSquare(row, col);
            } else {
                this.selectedSquare = null;
                this.validMoves = [];
            }
        } else if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
            this.selectSquare(row, col);
        }

        this.renderBoard();
        this.highlightSquares();
    }

    selectSquare(row, col) {
        this.selectedSquare = [row, col];
        this.validMoves = this.getValidMoves(row, col);
    }

    isPieceOwnedByCurrentPlayer(piece) {
        return (this.currentPlayer === 'white' && piece === piece.toUpperCase()) ||
               (this.currentPlayer === 'black' && piece === piece.toLowerCase());
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col]. toLowerCase();
        let moves = [];

        switch (piece) {
            case 'p':  moves = this.getPawnMoves(row, col); break;
            case 'r': moves = this.getRookMoves(row, col); break;
            case 'n': moves = this.getKnightMoves(row, col); break;
            case 'b': moves = this.getBishopMoves(row, col); break;
            case 'q': moves = this.getQueenMoves(row, col); break;
            case 'k': moves = this.getKingMoves(row, col); break;
        }

        return moves. filter(([toRow, toCol]) => !this.wouldBeInCheck(row, col, toRow, toCol));
    }

    getPawnMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        const direction = piece === piece.toUpperCase() ? -1 : 1;
        const startRow = piece === piece.toUpperCase() ? 6 : 1;

        // Forward move
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push([row + direction, col]);
            
            // Double move from starting position
            if (row === startRow && ! this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }

        // Capture diagonally
        for (const colOffset of [-1, 1]) {
            const newRow = row + direction;
            const newCol = col + colOffset;
            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target && ! this.isPieceSameColor(piece, target)) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col) {
        return this.getLinearMoves(row, col, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
    }

    getBishopMoves(row, col) {
        return this.getLinearMoves(row, col, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    }

    getQueenMoves(row, col) {
        return this.getLinearMoves(row, col, [
            [0, 1], [0, -1], [1, 0], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]);
    }

    getKnightMoves(row, col) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [rowOffset, colOffset] of offsets) {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (! target || ! this.isPieceSameColor(this.board[row][col], target)) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    getKingMoves(row, col) {
        const moves = [];
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [rowOffset, colOffset] of offsets) {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || !this. isPieceSameColor(this. board[row][col], target)) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    getLinearMoves(row, col, directions) {
        const moves = [];
        const piece = this.board[row][col];

        for (const [rowDir, colDir] of directions) {
            let newRow = row + rowDir;
            let newCol = col + colDir;

            while (this.isInBounds(newRow, newCol)) {
                const target = this. board[newRow][newCol];
                if (!target) {
                    moves.push([newRow, newCol]);
                } else {
                    if (!this.isPieceSameColor(piece, target)) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
                newRow += rowDir;
                newCol += colDir;
            }
        }

        return moves;
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isPieceSameColor(piece1, piece2) {
        return (piece1 === piece1.toUpperCase()) === (piece2 === piece2.toUpperCase());
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        return this.validMoves.some(([r, c]) => r === toRow && c === toCol);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        // Save move to history
        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            captured: capturedPiece,
            board: JSON.parse(JSON.stringify(this.board))
        });

        // Capture piece
        if (capturedPiece) {
            const color = capturedPiece === capturedPiece.toUpperCase() ? 'white' : 'black';
            this.capturedPieces[color].push(capturedPiece);
            this.updateCapturedPieces();
        }

        // Move piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = '';

        // Pawn promotion
        if (piece. toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
            this.board[toRow][toCol] = piece === piece.toUpperCase() ? 'Q' : 'q';
        }

        // Add move to move list
        this.addMoveToHistory(fromRow, fromCol, toRow, toCol, piece, capturedPiece);

        // Check for checkmate or check
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        if (this.isCheckmate()) {
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            this.showStatus(`Checkmate! ${winner} wins! `);
            this.gameOver = true;
        } else if (this.isInCheck(this.currentPlayer)) {
            this.showStatus('Check! ');
        } else {
            this.showStatus('');
        }

        this.updateTurnIndicator();
        
        // If playing against computer and it's computer's turn (black)
        if (this.gameMode === 'computer' && this.currentPlayer === 'black' && !this.gameOver) {
            setTimeout(() => this.makeComputerMove(), 500);
        }
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Simulate move
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = '';

        const inCheck = this.isInCheck(this.currentPlayer);

        // Undo move
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = capturedPiece;

        return inCheck;
    }

    isInCheck(player) {
        const kingPos = this.findKing(player);
        if (!kingPos) return false;

        const [kingRow, kingCol] = kingPos;
        const opponent = player === 'white' ?  'black' : 'white';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && ((opponent === 'white' && piece === piece.toUpperCase()) ||
                              (opponent === 'black' && piece === piece.toLowerCase()))) {
                    const moves = this.getValidMovesWithoutCheckTest(row, col);
                    if (moves.some(([r, c]) => r === kingRow && c === kingCol)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    getValidMovesWithoutCheckTest(row, col) {
        const piece = this.board[row][col]. toLowerCase();
        switch (piece) {
            case 'p': return this.getPawnMoves(row, col);
            case 'r': return this.getRookMoves(row, col);
            case 'n': return this.getKnightMoves(row, col);
            case 'b': return this.getBishopMoves(row, col);
            case 'q': return this.getQueenMoves(row, col);
            case 'k': return this.getKingMoves(row, col);
            default: return [];
        }
    }

    findKing(player) {
        const kingSymbol = player === 'white' ? 'K' : 'k';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === kingSymbol) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    isCheckmate() {
        if (!this.isInCheck(this.currentPlayer)) return false;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this. board[row][col];
                if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) return false;
                }
            }
        }

        return true;
    }

    highlightSquares() {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            square.classList.remove('selected', 'valid-move', 'has-piece', 'check');
        });

        if (this.selectedSquare) {
            const [row, col] = this.selectedSquare;
            const index = row * 8 + col;
            squares[index].classList.add('selected');

            this.validMoves. forEach(([moveRow, moveCol]) => {
                const moveIndex = moveRow * 8 + moveCol;
                squares[moveIndex].classList.add('valid-move');
                if (this.board[moveRow][moveCol]) {
                    squares[moveIndex]. classList.add('has-piece');
                }
            });
        }

        if (this.isInCheck(this.currentPlayer)) {
            const kingPos = this.findKing(this.currentPlayer);
            if (kingPos) {
                const [kingRow, kingCol] = kingPos;
                const kingIndex = kingRow * 8 + kingCol;
                squares[kingIndex].classList.add('check');
            }
        }
    }

    updateTurnIndicator() {
        document.getElementById('current-turn').textContent = 
            this.currentPlayer. charAt(0).toUpperCase() + this.currentPlayer.slice(1);
    }

    updateCapturedPieces() {
        document.getElementById('captured-white').textContent = 
            this.capturedPieces.white.map(p => PIECES[p]).join(' ');
        document.getElementById('captured-black').textContent = 
            this.capturedPieces.black.map(p => PIECES[p]).join(' ');
    }

    addMoveToHistory(fromRow, fromCol, toRow, toCol, piece, captured) {
        const movesList = document.getElementById('moves-list');
        const li = document.createElement('li');
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const from = `${files[fromCol]}${8 - fromRow}`;
        const to = `${files[toCol]}${8 - toRow}`;
        const captureSymbol = captured ? 'x' : '-';
        li.textContent = `${PIECES[piece]} ${from} ${captureSymbol} ${to}`;
        movesList.appendChild(li);
        movesList.parentElement.scrollTop = movesList. parentElement.scrollHeight;
    }

    showStatus(message) {
        document.getElementById('status-message').textContent = message;
    }

    attachEventListeners() {
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('undo-btn').addEventListener('click', () => this.undoMove());
        document.getElementById('invite-btn').addEventListener('click', () => this.invitePlayer());
        document.getElementById('vs-computer-btn').addEventListener('click', () => this.startComputerGame());
    }

    resetGame() {
        this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        document.getElementById('moves-list').innerHTML = '';
        document.getElementById('captured-white').textContent = '';
        document.getElementById('captured-black').textContent = '';
        this.showStatus('');
        this.renderBoard();
        this.updateTurnIndicator();
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;

        const lastMove = this.moveHistory.pop();
        this.board = lastMove.board;
        this. currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.selectedSquare = null;
        this. validMoves = [];
        this.gameOver = false;

        if (lastMove.captured) {
            const color = lastMove.captured === lastMove.captured.toUpperCase() ? 'white' : 'black';
            this.capturedPieces[color].pop();
            this.updateCapturedPieces();
        }

        const movesList = document.getElementById('moves-list');
        if (movesList.lastChild) {
            movesList.removeChild(movesList.lastChild);
        }

        this.showStatus('');
        this.renderBoard();
        this.updateTurnIndicator();
    }

    invitePlayer() {
        // Reset to local multiplayer mode
        this.gameMode = 'local';
        this.resetGame();
        this.updateModeButtons();
        this.showStatus('Local multiplayer mode - Pass the device to play!');
    }

    startComputerGame() {
        // Set computer mode
        this.gameMode = 'computer';
        this.resetGame();
        this.updateModeButtons();
        this.showStatus('Playing against computer - You are White!');
    }

    updateModeButtons() {
        const inviteBtn = document.getElementById('invite-btn');
        const vsComputerBtn = document.getElementById('vs-computer-btn');
        
        if (this.gameMode === 'local') {
            inviteBtn.classList.add('active');
            vsComputerBtn.classList.remove('active');
        } else {
            inviteBtn.classList.remove('active');
            vsComputerBtn.classList.add('active');
        }
    }

    makeComputerMove() {
        if (this.gameOver || this.currentPlayer !== 'black') return;

        // Get all possible moves for black pieces
        const allMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece === piece.toLowerCase()) {
                    const moves = this.getValidMoves(row, col);
                    moves.forEach(([toRow, toCol]) => {
                        allMoves.push({ from: [row, col], to: [toRow, toCol] });
                    });
                }
            }
        }

        // Choose a random move
        if (allMoves.length > 0) {
            const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
            const [fromRow, fromCol] = randomMove.from;
            const [toRow, toCol] = randomMove.to;
            
            this.selectedSquare = null;
            this.validMoves = [];
            this.makeMove(fromRow, fromCol, toRow, toCol);
            this.renderBoard();
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
