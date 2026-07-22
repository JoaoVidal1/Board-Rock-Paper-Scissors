const BOARD_SIZE = 9;
const TYPES = { ROCK: '🪨', PAPER: '📄', SCISSORS: '✂️' };
const PLAYERS = { BLUE: 'blue', RED: 'red' };

let board = []; // Tracks territory: null, 'blue', 'red'
let pieces = []; // Tracks piece objects
let currentPlayer = PLAYERS.BLUE;
let totalTurns = 0;
let movesRemaining = 1;
let selectedPiece = null;
let gameOver = false;

// UI Elements
const boardEl = document.getElementById('board');
const movePatternEl = document.getElementById('movePattern');
const allowDoubleMoveEl = document.getElementById('allowDoubleMove');
const allowRecaptureEl = document.getElementById('allowRecapture');
const botDifficultyEl = document.getElementById('botDifficulty');

function initGame() {
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    pieces = [];
    currentPlayer = PLAYERS.BLUE;
    totalTurns = 0;
    movesRemaining = 1;
    selectedPiece = null;
    gameOver = false;
    document.getElementById('winnerMessage').classList.add('hidden');
    
    // Setup matching image_a639c6.png
    // Blue setup (Cols 1,2)
    addPiece(3, 1, PLAYERS.BLUE, TYPES.ROCK);
    addPiece(3, 2, PLAYERS.BLUE, TYPES.ROCK);
    addPiece(4, 1, PLAYERS.BLUE, TYPES.PAPER);
    addPiece(4, 2, PLAYERS.BLUE, TYPES.PAPER);
    addPiece(5, 1, PLAYERS.BLUE, TYPES.SCISSORS);
    addPiece(5, 2, PLAYERS.BLUE, TYPES.SCISSORS);
    
    // Red setup (Cols 6,7) - Flipped vertically in the image
    addPiece(3, 6, PLAYERS.RED, TYPES.SCISSORS);
    addPiece(3, 7, PLAYERS.RED, TYPES.SCISSORS);
    addPiece(4, 6, PLAYERS.RED, TYPES.PAPER);
    addPiece(4, 7, PLAYERS.RED, TYPES.PAPER);
    addPiece(5, 6, PLAYERS.RED, TYPES.ROCK);
    addPiece(5, 7, PLAYERS.RED, TYPES.ROCK);

    // Initial square capture for starting positions
    pieces.forEach(p => board[p.r][p.c] = p.player);

    render();
    updateStatus();
}

function addPiece(r, c, player, type) {
    pieces.push({ id: Math.random().toString(36).substring(7), r, c, player, type, alive: true });
}

function getPieceAt(r, c) {
    return pieces.find(p => p.r === r && p.c === c && p.alive) || null;
}

function canCapture(attackerType, defenderType) {
    if (attackerType === TYPES.ROCK && defenderType === TYPES.SCISSORS) return true;
    if (attackerType === TYPES.SCISSORS && defenderType === TYPES.PAPER) return true;
    if (attackerType === TYPES.PAPER && defenderType === TYPES.ROCK) return true;
    return false;
}

function isOppositionBlocked(r, c, player, type) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                let p = getPieceAt(nr, nc);
                // Cannot move next to enemy piece of same type
                if (p && p.player !== player && p.type === type) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getValidMoves(piece) {
    let moves = new Set();
    const allowDouble = allowDoubleMoveEl.checked;
    
    // Helper to add standard king moves
    function getKingMoves(startR, startC) {
        let valid = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                let nr = startR + dr, nc = startC + dc;
                
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
                
                let targetPiece = getPieceAt(nr, nc);
                if (targetPiece && targetPiece.player === piece.player) continue; // Blocked by ally
                if (targetPiece && !canCapture(piece.type, targetPiece.type)) continue; // Invalid capture
                if (isOppositionBlocked(nr, nc, piece.player, piece.type)) continue; // Blocked by opposition
                
                valid.push({ r: nr, c: nc });
            }
        }
        return valid;
    }

    // Step 1: Normal moves
    let step1Moves = getKingMoves(piece.r, piece.c);
    step1Moves.forEach(m => moves.add(`${m.r},${m.c}`));

    // Step 2: Double moves through owned territory
    if (allowDouble) {
        step1Moves.forEach(m1 => {
            // Must step onto owned, empty territory to trigger double move
            if (board[m1.r][m1.c] === piece.player && !getPieceAt(m1.r, m1.c)) {
                let step2Moves = getKingMoves(m1.r, m1.c);
                step2Moves.forEach(m2 => {
                    // Prevent returning to start
                    if (m2.r !== piece.r || m2.c !== piece.c) {
                        moves.add(`${m2.r},${m2.c}`);
                    }
                });
            }
        });
    }

    return Array.from(moves).map(str => {
        let [r, c] = str.split(',').map(Number);
        return { r, c };
    });
}

function handleSquareClick(r, c) {
    if (gameOver || (currentPlayer === PLAYERS.RED && botDifficultyEl.value !== "0")) return;

    let clickedPiece = getPieceAt(r, c);

    // Select piece
    if (clickedPiece && clickedPiece.player === currentPlayer) {
        selectedPiece = clickedPiece;
        render();
        return;
    }

    // Move piece
    if (selectedPiece) {
        let moves = getValidMoves(selectedPiece);
        if (moves.some(m => m.r === r && m.c === c)) {
            executeMove(selectedPiece, r, c);
        } else {
            selectedPiece = null;
            render();
        }
    }
}

function executeMove(piece, r, c) {
    let targetPiece = getPieceAt(r, c);
    
    // Handle Capture
    if (targetPiece) {
        targetPiece.alive = false;
        if (allowRecaptureEl.checked) {
            board[r][c] = piece.player;
        }
    } else if (board[r][c] === null) {
        // Capture blank territory
        board[r][c] = piece.player;
    }

    // Update position
    piece.r = r;
    piece.c = c;
    selectedPiece = null;
    movesRemaining--;

    if (checkEndGame()) return;

    if (movesRemaining <= 0) {
        endTurn();
    } else {
        render();
        updateStatus();
    }
}

function endTurn() {
    currentPlayer = currentPlayer === PLAYERS.BLUE ? PLAYERS.RED : PLAYERS.BLUE;
    totalTurns++;
    
    // Determine moves for new turn
    let pattern = movePatternEl.value; // '111' or '122'
    if (pattern === '122' && totalTurns > 0) {
        movesRemaining = 2;
    } else {
        movesRemaining = 1;
    }

    render();
    updateStatus();

    // Trigger Bot
    if (currentPlayer === PLAYERS.RED && botDifficultyEl.value !== "0" && !gameOver) {
        setTimeout(playBotTurn, 500);
    }
}

// Bot Logic
function playBotTurn() {
    if (gameOver || currentPlayer !== PLAYERS.RED) return;
    
    let difficulty = parseInt(botDifficultyEl.value);
    let myPieces = pieces.filter(p => p.player === PLAYERS.RED && p.alive);
    let allPossibleMoves = [];

    myPieces.forEach(p => {
        let moves = getValidMoves(p);
        moves.forEach(m => allPossibleMoves.push({ piece: p, r: m.r, c: m.c }));
    });

    if (allPossibleMoves.length === 0) {
        endTurn(); // Bot passes if no moves
        return;
    }

    let chosenMove = null;

    if (difficulty === 1) {
        // Random
        chosenMove = allPossibleMoves[Math.floor(Math.random() * allPossibleMoves.length)];
    } else {
        // Greedy & Smart Greedy Evaluation
        let bestScore = -Infinity;
        allPossibleMoves.forEach(m => {
            let score = 0;
            let targetPiece = getPieceAt(m.r, m.c);
            
            if (targetPiece) score += 50; // Capture
            if (board[m.r][m.c] === null) score += 10; // Territory
            
            if (difficulty === 3) {
                // Hard: avoid moving to squares where we can be captured immediately
                // Simple heuristic: check if enemy can capture this square next turn
                let enemyPieces = pieces.filter(p => p.player === PLAYERS.BLUE && p.alive);
                let danger = false;
                for (let ep of enemyPieces) {
                    // Simulate bot move
                    if (Math.abs(ep.r - m.r) <= 1 && Math.abs(ep.c - m.c) <= 1) {
                        if (canCapture(ep.type, m.piece.type)) {
                            danger = true;
                            break;
                        }
                    }
                }
                if (danger) score -= 100;
            }

            // Tie breaker logic
            score += Math.random(); 

            if (score > bestScore) {
                bestScore = score;
                chosenMove = m;
            }
        });
    }

    if (chosenMove) {
        executeMove(chosenMove.piece, chosenMove.r, chosenMove.c);
    }
    
    if (movesRemaining > 0 && !gameOver) {
        setTimeout(playBotTurn, 500);
    }
}

function checkEndGame() {
    let emptySquares = 0;
    let blueSquares = 0;
    let redSquares = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === null) emptySquares++;
            else if (board[r][c] === PLAYERS.BLUE) blueSquares++;
            else if (board[r][c] === PLAYERS.RED) redSquares++;
        }
    }

    let blueAlive = pieces.some(p => p.player === PLAYERS.BLUE && p.alive);
    let redAlive = pieces.some(p => p.player === PLAYERS.RED && p.alive);

    if (emptySquares === 0 || !blueAlive || !redAlive) {
        gameOver = true;
        let msg = "";
        if (blueSquares > redSquares) msg = "Blue Wins!";
        else if (redSquares > blueSquares) msg = "Red Wins!";
        else msg = "It's a Tie!";
        
        let winnerEl = document.getElementById('winnerMessage');
        winnerEl.innerText = `Game Over! ${msg}`;
        winnerEl.classList.remove('hidden');
        render();
        updateStatus();
        return true;
    }
    return false;
}

function render() {
    boardEl.innerHTML = '';
    let validMoves = selectedPiece ? getValidMoves(selectedPiece) : [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            let cell = document.createElement('div');
            cell.className = 'square';
            
            if (board[r][c] === PLAYERS.BLUE) cell.classList.add('blue-owned');
            if (board[r][c] === PLAYERS.RED) cell.classList.add('red-owned');
            
            if (validMoves.some(m => m.r === r && m.c === c)) {
                cell.classList.add('highlight');
            }

            cell.onclick = () => handleSquareClick(r, c);

            let piece = getPieceAt(r, c);
            if (piece) {
                let pSpan = document.createElement('span');
                pSpan.innerText = piece.type;
                pSpan.className = `piece ${piece.player}-piece`;
                if (piece === selectedPiece) {
                    pSpan.style.borderBottom = "3px solid black";
                }
                cell.appendChild(pSpan);
            }

            boardEl.appendChild(cell);
        }
    }
}

function updateStatus() {
    let blueScore = 0, redScore = 0;
    board.forEach(row => row.forEach(cell => {
        if (cell === PLAYERS.BLUE) blueScore++;
        if (cell === PLAYERS.RED) redScore++;
    }));

    document.getElementById('blueScore').innerText = blueScore;
    document.getElementById('redScore').innerText = redScore;
    
    let turnEl = document.getElementById('turnIndicator');
    turnEl.innerText = `Current Turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
    turnEl.className = `${currentPlayer}-text`;
    
    document.getElementById('movesLeft').innerText = `Moves Left: ${movesRemaining}`;
}

document.getElementById('restartBtn').onclick = initGame;

// Start Game
initGame();
