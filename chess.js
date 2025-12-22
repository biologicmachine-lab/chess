// Chess piece Unicode characters
const PIECES = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

// Initial board setup
const INITIAL_BOARD = [
    ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
    ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'],
    ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
];

// Game state
let board = [];
let currentPlayer = 'white';
let selectedSquare = null;
let validMoves = [];
let capturedPieces = { white: [], black: [] };
let gameOver = false;

// Initialize the game
function initGame() {
    board = INITIAL_BOARD.map((row, rowIndex) => 
        row.map((piece, colIndex) => {
            if (piece === null) return null;
            const color = rowIndex < 2 ? 'black' : 'white';
            return { type: piece, color: color };
        })
    );
    currentPlayer = 'white';
    selectedSquare = null;
    validMoves = [];
    capturedPieces = { white: [], black: [] };
    gameOver = false;
    renderBoard();
    updateTurnIndicator();
    updateGameStatus();
    renderCapturedPieces();
}

// Create the chess board
function createBoard() {
    const boardElement = document.getElementById('chess-board');
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener('click', () => handleSquareClick(row, col));
            boardElement.appendChild(square);
        }
    }
}

// Render the current board state
function renderBoard() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = board[row][col];
        
        square.classList.remove('selected', 'valid-move');
        
        if (piece) {
            square.innerHTML = `<span class="piece">${PIECES[piece.color][piece.type]}</span>`;
        } else {
            square.innerHTML = '';
        }
        
        if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
            square.classList.add('selected');
        }
        
        if (validMoves.some(move => move.row === row && move.col === col)) {
            square.classList.add('valid-move');
        }
    });
}

// Handle square click
function handleSquareClick(row, col) {
    if (gameOver) return;
    
    const piece = board[row][col];
    
    // If a square is already selected
    if (selectedSquare) {
        // Check if clicked square is a valid move
        const moveIndex = validMoves.findIndex(move => move.row === row && move.col === col);
        
        if (moveIndex !== -1) {
            // Make the move
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
            selectedSquare = null;
            validMoves = [];
            renderBoard();
            
            // Switch player
            currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
            updateTurnIndicator();
            checkGameStatus();
        } else if (piece && piece.color === currentPlayer) {
            // Select a different piece of the same color
            selectedSquare = { row, col };
            validMoves = getValidMoves(row, col);
            renderBoard();
        } else {
            // Deselect
            selectedSquare = null;
            validMoves = [];
            renderBoard();
        }
    } else {
        // Select a piece
        if (piece && piece.color === currentPlayer) {
            selectedSquare = { row, col };
            validMoves = getValidMoves(row, col);
            renderBoard();
        }
    }
}

// Make a move
function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Capture piece if present
    if (capturedPiece) {
        capturedPieces[capturedPiece.color].push(capturedPiece);
        renderCapturedPieces();
    }
    
    // Move the piece
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
}

// Get valid moves for a piece (simplified chess rules)
function getValidMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    const moves = [];
    
    switch (piece.type) {
        case 'pawn':
            moves.push(...getPawnMoves(row, col, piece.color));
            break;
        case 'rook':
            moves.push(...getRookMoves(row, col, piece.color));
            break;
        case 'knight':
            moves.push(...getKnightMoves(row, col, piece.color));
            break;
        case 'bishop':
            moves.push(...getBishopMoves(row, col, piece.color));
            break;
        case 'queen':
            moves.push(...getQueenMoves(row, col, piece.color));
            break;
        case 'king':
            moves.push(...getKingMoves(row, col, piece.color));
            break;
    }
    
    return moves;
}

// Pawn moves
function getPawnMoves(row, col, color) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    // Forward move
    if (isValidSquare(row + direction, col) && !board[row + direction][col]) {
        moves.push({ row: row + direction, col });
        
        // Double move from start
        if (row === startRow && !board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col });
        }
    }
    
    // Capture diagonally
    [-1, 1].forEach(offset => {
        const newRow = row + direction;
        const newCol = col + offset;
        if (isValidSquare(newRow, newCol) && board[newRow][newCol] && board[newRow][newCol].color !== color) {
            moves.push({ row: newRow, col: newCol });
        }
    });
    
    return moves;
}

// Rook moves
function getRookMoves(row, col, color) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    directions.forEach(([dr, dc]) => {
        moves.push(...getLinearMoves(row, col, dr, dc, color));
    });
    
    return moves;
}

// Bishop moves
function getBishopMoves(row, col, color) {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    directions.forEach(([dr, dc]) => {
        moves.push(...getLinearMoves(row, col, dr, dc, color));
    });
    
    return moves;
}

// Queen moves
function getQueenMoves(row, col, color) {
    return [...getRookMoves(row, col, color), ...getBishopMoves(row, col, color)];
}

// King moves
function getKingMoves(row, col, color) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    directions.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol) && (!board[newRow][newCol] || board[newRow][newCol].color !== color)) {
            moves.push({ row: newRow, col: newCol });
        }
    });
    
    return moves;
}

// Knight moves
function getKnightMoves(row, col, color) {
    const moves = [];
    const knightMoves = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];
    
    knightMoves.forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidSquare(newRow, newCol) && (!board[newRow][newCol] || board[newRow][newCol].color !== color)) {
            moves.push({ row: newRow, col: newCol });
        }
    });
    
    return moves;
}

// Get linear moves (for rook, bishop, queen)
function getLinearMoves(row, col, dr, dc, color) {
    const moves = [];
    let newRow = row + dr;
    let newCol = col + dc;
    
    while (isValidSquare(newRow, newCol)) {
        if (board[newRow][newCol]) {
            if (board[newRow][newCol].color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
            break;
        }
        moves.push({ row: newRow, col: newCol });
        newRow += dr;
        newCol += dc;
    }
    
    return moves;
}

// Check if square is valid
function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Update turn indicator
function updateTurnIndicator() {
    const turnIndicator = document.getElementById('current-turn');
    turnIndicator.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
}

// Check game status
function checkGameStatus() {
    const hasWhiteKing = board.some(row => row.some(piece => piece && piece.type === 'king' && piece.color === 'white'));
    const hasBlackKing = board.some(row => row.some(piece => piece && piece.type === 'king' && piece.color === 'black'));
    
    if (!hasWhiteKing) {
        gameOver = true;
        updateGameStatus('Black Wins!');
    } else if (!hasBlackKing) {
        gameOver = true;
        updateGameStatus('White Wins!');
    }
}

// Update game status
function updateGameStatus(message = 'Game in Progress') {
    const gameStatus = document.getElementById('game-status');
    gameStatus.textContent = message;
}

// Render captured pieces
function renderCapturedPieces() {
    const capturedWhiteElement = document.getElementById('captured-white');
    const capturedBlackElement = document.getElementById('captured-black');
    
    capturedWhiteElement.innerHTML = capturedPieces.white
        .map(piece => `<span class="captured-piece">${PIECES[piece.color][piece.type]}</span>`)
        .join('');
    
    capturedBlackElement.innerHTML = capturedPieces.black
        .map(piece => `<span class="captured-piece">${PIECES[piece.color][piece.type]}</span>`)
        .join('');
}

// Reset button handler
document.getElementById('reset-button').addEventListener('click', initGame);

// Initialize the game on page load
createBoard();
initGame();
