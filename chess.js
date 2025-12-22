// Chess piece unicode symbols
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Piece values for AI evaluation
const PIECE_VALUES = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900,
    'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900
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
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        
        // Game mode properties
        this.gameMode = null;
        this.aiDifficulty = null;
        this.aiColor = 'black';
        
        // PeerJS properties
        this.peer = null;
        this.connection = null;
        this.peerId = null;
        this. playerColor = null;
        this. isOnlineGame = false;
        this.opponentConnected = false;
        
        this.initWelcomeScreen();
    }

    initWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const gameContainer = document.getElementById('game-container');
        const difficultySelection = document.getElementById('difficulty-selection');
        const gameModeButtons = document.querySelector('.game-mode-buttons');
        
        // Check if this is joining an online game from URL
        const urlParams = new URLSearchParams(window.location.search);
        const opponentId = urlParams.get('peer');
        
        if (opponentId) {
            welcomeScreen.style.display = 'none';
            gameContainer. style.display = 'block';
            this.joinOnlineGame(opponentId);
            return;
        }
        
        // Play vs Computer button
        document.getElementById('play-computer-btn').addEventListener('click', () => {
            gameModeButtons.style.display = 'none';
            difficultySelection.style.display = 'block';
        });
        
        // Play vs Friend button (local)
        document.getElementById('play-friend-btn').addEventListener('click', () => {
            welcomeScreen.style.display = 'none';
            gameContainer. style.display = 'block';
            this.startLocalGame();
        });
        
        // Play Online button
        document.getElementById('play-online-btn').addEventListener('click', () => {
            welcomeScreen.style.display = 'none';
            gameContainer. style.display = 'block';
            this.createOnlineGame();
        });
        
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.level;
                welcomeScreen.style.display = 'none';
                gameContainer. style.display = 'block';
                this.startComputerGame(difficulty);
            });
        });
        
        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            difficultySelection.style.display = 'none';
            gameModeButtons.style.display = 'flex';
        });
        
        // Menu button
        document.getElementById('menu-btn').addEventListener('click', () => {
            if (confirm('Return to main menu?  Current game will be lost.')) {
                if (this.connection) {
                    this.connection.close();
                }
                if (this.peer) {
                    this.peer.destroy();
                }
                location.reload();
            }
        });
    }

    // Create a new online game with PeerJS
    createOnlineGame() {
        this.gameMode = 'online';
        this.isOnlineGame = true;
        this.playerColor = 'white';
        
        this.showStatus('🔄 Initializing connection...');
        this.updateConnectionStatus(false);
        
        // Initialize PeerJS
        this.peer = new Peer({
            config: {
                iceServers: [
                    { urls:  'stun:stun. l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        
        this.peer.on('open', (id) => {
            this.peerId = id;
            console.log('My peer ID is:  ' + id);
            
            const indicator = document.getElementById('game-mode-indicator');
            indicator.textContent = '🌐 Online Game - Waiting for opponent... ';
            indicator.classList.add('online');
            
            // Show share button and auto-open modal
            document.getElementById('share-btn').style.display = 'block';
            document.getElementById('share-btn').click();
            
            this.showStatus('✅ Ready!  Share the link with your friend.');
        });
        
        this.peer.on('connection', (conn) => {
            this. connection = conn;
            this. setupConnectionHandlers();
            
            this.opponentConnected = true;
            this.updateConnectionStatus(true);
            this.showStatus('🎉 Opponent connected! Game started.');
            
            const indicator = document.getElementById('game-mode-indicator');
            indicator. textContent = `🌐 Online Game - You are White`;
            
            // Send initial game state
            this.sendGameState();
        });
        
        this.peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            this.showStatus('❌ Connection error. Please refresh and try again.');
        });
        
        this.init();
    }

    // Join an existing online game
    joinOnlineGame(opponentPeerId) {
        this.gameMode = 'online';
        this.isOnlineGame = true;
        this.playerColor = 'black';
        
        this.showStatus('🔄 Connecting to opponent...');
        this.updateConnectionStatus(false);
        
        // Initialize PeerJS
        this.peer = new Peer({
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google. com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        
        this.peer. on('open', (id) => {
            this.peerId = id;
            console.log('My peer ID is: ' + id);
            
            // Connect to opponent
            this.connection = this.peer.connect(opponentPeerId, {
                reliable: true
            });
            
            this.setupConnectionHandlers();
            
            this.connection.on('open', () => {
                this.opponentConnected = true;
                this.updateConnectionStatus(true);
                this.showStatus('🎉 Connected!  You are playing as Black.');
                
                const indicator = document.getElementById('game-mode-indicator');
                indicator. textContent = `🌐 Online Game - You are Black`;
                indicator.classList.add('online');
                
                // Request game state
                this.connection.send({
                    type: 'request_state'
                });
            });
        });
        
        this.peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            this.showStatus('❌ Failed to connect. Please check the link and try again.');
        });
        
        this.init();
    }

    // Setup connection event handlers
    setupConnectionHandlers() {
        this.connection.on('data', (data) => {
            console.log('Received:', data);
            
            switch(data.type) {
                case 'move':
                    this.receiveMove(data.move);
                    break;
                case 'game_state':
                    this.receiveGameState(data.state);
                    break;
                case 'request_state':
                    this. sendGameState();
                    break;
                case 'chat': 
                    this.showStatus(`Opponent: ${data.message}`);
                    break;
                case 'reset':
                    if (confirm('Opponent wants to start a new game. Accept?')) {
                        this. resetGame();
                        this.connection.send({ type: 'reset_accepted' });
                    }
                    break;
            }
        });
        
        this.connection.on('close', () => {
            this. opponentConnected = false;
            this.updateConnectionStatus(false);
            this.showStatus('❌ Opponent disconnected.');
        });
        
        this.connection.on('error', (err) => {
            console.error('Connection error:', err);
            this.showStatus('❌ Connection error occurred.');
        });
    }

    // Send game state to opponent
    sendGameState() {
        if (!this.connection || !this.opponentConnected) return;
        
        this.connection.send({
            type: 'game_state',
            state: {
                board:  this.board,
                currentPlayer: this.currentPlayer,
                moveHistory: this.moveHistory,
                capturedPieces: this.capturedPieces,
                gameOver: this.gameOver
            }
        });
    }

    // Receive game state from opponent
    receiveGameState(state) {
        this.board = state.board;
        this. currentPlayer = state.currentPlayer;
        this.moveHistory = state.moveHistory;
        this. capturedPieces = state. capturedPieces;
        this.gameOver = state.gameOver;
        
        this.renderBoard();
        this.updateTurnIndicator();
        this.updateCapturedPieces();
        this.rebuildMoveHistory();
    }

    // Send move to opponent
    sendMove(fromRow, fromCol, toRow, toCol) {
        if (!this.connection || !this.opponentConnected) return;
        
        this.connection.send({
            type: 'move',
            move: {
                from: [fromRow, fromCol],
                to: [toRow, toCol]
            }
        });
    }

    // Receive move from opponent
    receiveMove(move) {
        const [fromRow, fromCol] = move.from;
        const [toRow, toCol] = move.to;
        
        // Execute the move
        this.makeMove(fromRow, fromCol, toRow, toCol, true);
        this.renderBoard();
        this.highlightSquares();
    }

    // Update connection status UI
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        const opponentStatus = document.getElementById('opponent-status');
        
        if (this.isOnlineGame) {
            statusEl.style.display = 'flex';
            
            if (connected) {
                statusEl.classList.add('connected');
                statusEl.classList.remove('disconnected');
                statusText.textContent = 'Connected ✓';
                if (opponentStatus) opponentStatus.textContent = 'Connected ✓';
            } else {
                statusEl.classList. remove('connected');
                statusText.textContent = 'Waiting for opponent...';
                if (opponentStatus) opponentStatus.textContent = 'Waiting... ';
            }
        }
    }

    setupMultiplayer() {
        const shareBtn = document.getElementById('share-btn');
        const modal = document.getElementById('share-modal');
        const closeBtn = document.querySelector('.close');
        const copyBtn = document.getElementById('copy-link-btn');
        
        shareBtn.addEventListener('click', () => {
            this.showShareModal();
        });
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e. target === modal) {
                modal.style.display = 'none';
            }
        });
        
        copyBtn.addEventListener('click', () => {
            const linkInput = document.getElementById('game-link');
            linkInput.select();
            linkInput.setSelectionRange(0, 99999);
            
            navigator.clipboard.writeText(linkInput.value).then(() => {
                copyBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            }).catch(() => {
                document.execCommand('copy');
                copyBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            });
        });
        
        // Social share buttons
        document.getElementById('share-whatsapp').addEventListener('click', () => {
            const link = document.getElementById('game-link').value;
            const text = `🎮 Join me for a chess game! Click here: ${link}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        });
        
        document.getElementById('share-telegram').addEventListener('click', () => {
            const link = document.getElementById('game-link').value;
            const text = `🎮 Join me for a chess game! `;
            window.open(`https://t.me/share/url? url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
        });
        
        document.getElementById('share-email').addEventListener('click', () => {
            const link = document.getElementById('game-link').value;
            const subject = '♔ Chess Game Invitation';
            const body = `Hi!\n\nI'd like to play chess with you online. Click this link to join the game:\n\n${link}\n\nSee you on the board!`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        });
    }

    showShareModal() {
        const modal = document.getElementById('share-modal');
        const baseUrl = window.location.origin + window.location.pathname;
        const gameLink = `${baseUrl}?peer=${this.peerId}`;
        
        document.getElementById('game-link').value = gameLink;
        document.getElementById('your-color').textContent = 
            this.playerColor. charAt(0).toUpperCase() + this.playerColor.slice(1);
        document.getElementById('peer-id').textContent = this.peerId;
        
        // Generate QR Code
        const qrContainer = document.getElementById('qr-code-container');
        qrContainer. innerHTML = '';
        
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: gameLink,
                width: 200,
                height: 200,
                colorDark: "#667eea",
                colorLight:  "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            qrContainer.innerHTML = '<p style="color: #999;">QR Code library not loaded</p>';
        }
        
        modal.style.display = 'block';
    }

    rebuildMoveHistory() {
        const movesList = document.getElementById('moves-list');
        movesList.innerHTML = '';
        
        this.moveHistory.forEach((move) => {
            const li = document.createElement('li');
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const from = `${files[move.from[1]]}${8 - move.from[0]}`;
            const to = `${files[move.to[1]]}${8 - move.to[0]}`;
            const captureSymbol = move.captured ? 'x' : '-';
            li.textContent = `${PIECES[move.piece]} ${from} ${captureSymbol} ${to}`;
            movesList.appendChild(li);
        });
    }

    startComputerGame(difficulty) {
        this.gameMode = 'computer';
        this.aiDifficulty = difficulty;
        this.aiColor = 'black';
        
        const indicator = document.getElementById('game-mode-indicator');
        indicator. textContent = `🤖 Playing vs Computer (${difficulty. charAt(0).toUpperCase() + difficulty.slice(1)})`;
        indicator.classList.add('computer');
        
        this.init();
    }

    startLocalGame() {
        this.gameMode = 'local';
        
        const indicator = document.getElementById('game-mode-indicator');
        indicator.textContent = '👥 Local Multiplayer';
        
        this.init();
    }

    init() {
        this.renderBoard();
        this.attachEventListeners();
        this.updateTurnIndicator();
        if (this.isOnlineGame) {
            this.setupMultiplayer();
        }
    }

    // AI Move Logic
    makeAIMove() {
        if (this.gameOver || this.currentPlayer !== this.aiColor) return;
        
        this.showStatus('🤖 Computer is thinking...');
        
        setTimeout(() => {
            let move;
            
            switch(this.aiDifficulty) {
                case 'easy':
                    move = this. getRandomMove();
                    break;
                case 'medium': 
                    move = this.getMediumMove();
                    break;
                case 'hard': 
                    move = this.getBestMove();
                    break;
            }
            
            if (move) {
                this. makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);
                this.renderBoard();
                this. highlightSquares();
            }
        }, 500);
    }

    getRandomMove() {
        const allMoves = this.getAllValidMoves(this.aiColor);
        if (allMoves.length === 0) return null;
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    getMediumMove() {
        const allMoves = this.getAllValidMoves(this.aiColor);
        if (allMoves.length === 0) return null;
        
        const captureMoves = allMoves.filter(move => 
            this.board[move.to[0]][move.to[1]] !== ''
        );
        
        if (captureMoves.length > 0 && Math.random() > 0.3) {
            return captureMoves[Math.floor(Math. random() * captureMoves.length)];
        }
        
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    getBestMove() {
        const allMoves = this.getAllValidMoves(this.aiColor);
        if (allMoves.length === 0) return null;
        
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const move of allMoves) {
            const score = this. evaluateMove(move);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    evaluateMove(move) {
        let score = 0;
        const capturedPiece = this.board[move.to[0]][move.to[1]];
        
        if (capturedPiece) {
            score += PIECE_VALUES[capturedPiece];
        }
        
        score += Math.random() * 5;
        
        return score;
    }

    getAllValidMoves(color) {
        const moves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && ((color === 'white' && piece === piece.toUpperCase()) ||
                              (color === 'black' && piece === piece.toLowerCase()))) {
                    const validMoves = this.getValidMoves(row, col);
                    for (const [toRow, toCol] of validMoves) {
                        moves. push({ from: [row, col], to:  [toRow, toCol] });
                    }
                }
            }
        }
        
        return moves;
    }

    renderBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = PIECES[piece];
                    if (this.isPieceOwnedByCurrentPlayer(piece)) {
                        const testMoves = this.getValidMoves(row, col);
                        if (testMoves.length > 0) {
                            square. classList.add('can-move');
                        }
                    }
                }

                square.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleSquareClick(row, col);
                });

                square.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleSquareClick(row, col);
                }, { passive: false });

                chessboard.appendChild(square);
            }
        }
    }

    handleSquareClick(row, col) {
        if (this.gameOver) {
            this.showStatus('Game Over!  Click "New Game" to play again.');
            return;
        }

        // In computer mode, don't allow moves during AI's turn
        if (this. gameMode === 'computer' && this.currentPlayer === this.aiColor) {
            return;
        }

        // In online game, check if opponent is connected and it's your turn
        if (this.isOnlineGame) {
            if (! this.opponentConnected) {
                this.showStatus('Waiting for opponent to connect...');
                return;
            }
            if (this.playerColor !== this.currentPlayer) {
                this.showStatus(`Wait for ${this.currentPlayer}'s turn! `);
                return;
            }
        }

        const piece = this.board[row][col];

        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this. selectedSquare;
            
            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.selectedSquare = null;
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
        
        if (this.validMoves.length === 0) {
            this. showStatus('This piece has no valid moves!');
            this.selectedSquare = null;
        } else {
            this.showStatus(`Selected ${PIECES[this.board[row][col]]} - Click a highlighted square to move`);
        }
    }

    isPieceOwnedByCurrentPlayer(piece) {
        return (this.currentPlayer === 'white' && piece === piece.toUpperCase()) ||
               (this. currentPlayer === 'black' && piece === piece.toLowerCase());
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

        if (this.isInBounds(row + direction, col) && ! this.board[row + direction][col]) {
            moves.push([row + direction, col]);
            
            if (row === startRow && ! this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }

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
                if (! target || !this.isPieceSameColor(this.board[row][col], target)) {
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

    makeMove(fromRow, fromCol, toRow, toCol, isRemoteMove = false) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            captured: capturedPiece,
            board: JSON.parse(JSON.stringify(this.board))
        });

        if (capturedPiece) {
            const color = capturedPiece === capturedPiece.toUpperCase() ? 'white' : 'black';
            this.capturedPieces[color]. push(capturedPiece);
            this.updateCapturedPieces();
        }

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = '';

        if (piece. toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
            this.board[toRow][toCol] = piece === piece.toUpperCase() ? 'Q' : 'q';
        }

        this.addMoveToHistory(fromRow, fromCol, toRow, toCol, piece, capturedPiece);

        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Send move to opponent if online game and not a remote move
        if (this. isOnlineGame && !isRemoteMove) {
            this. sendMove(fromRow, fromCol, toRow, toCol);
        }
        
        if (this.isCheckmate()) {
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            this.showStatus(`🎉 Checkmate! ${winner} wins! `);
            this.gameOver = true;
        } else if (this.isInCheck(this.currentPlayer)) {
            this.showStatus('⚠️ Check! ');
        } else {
            this.showStatus('');
        }

        this.updateTurnIndicator();
        
        // Trigger AI move if needed
        if (this.gameMode === 'computer' && ! this.gameOver && ! isRemoteMove) {
            setTimeout(() => this.makeAIMove(), 300);
        }
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = '';

        const inCheck = this.isInCheck(this.currentPlayer);

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
        const squares = document.querySelectorAll('. square');
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
            this.capturedPieces. white.map(p => PIECES[p]).join(' ');
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
        const resetBtn = document.getElementById('reset-btn');
        const undoBtn = document.getElementById('undo-btn');

        resetBtn.addEventListener('click', () => this.resetGame());
        undoBtn.addEventListener('click', () => this.undoMove());

        resetBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.resetGame();
        }, { passive: false });

        undoBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.undoMove();
        }, { passive: false });
    }

    resetGame() {
        if (this.isOnlineGame && this.opponentConnected) {
            if (confirm('Request new game from opponent?')) {
                this. connection.send({ type: 'reset' });
            }
            return;
        }
        
        this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white:  [], black: [] };
        this.gameOver = false;
        
        document.getElementById('moves-list').innerHTML = '';
        document.getElementById('captured-white').textContent = '';
        document.getElementById('captured-black').textContent = '';
        this.showStatus('');
        this.renderBoard();
        this.updateTurnIndicator();
        
        if (this.isOnlineGame && this.opponentConnected) {
            this.sendGameState();
        }
    }

    undoMove() {
        if (this.moveHistory. length === 0) {
            this.showStatus('No moves to undo! ');
            return;
        }

        if (this.isOnlineGame) {
            this.showStatus('Cannot undo in online games! ');
            return;
        }

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

        this.showStatus('Move undone! ');
        this.renderBoard();
        this.updateTurnIndicator();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
