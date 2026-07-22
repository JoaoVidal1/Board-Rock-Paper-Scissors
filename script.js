const BOARD_SIZE = 9;
const TYPES = { ROCK: '🪨', PAPER: '📄', SCISSORS: '✂️' };
const PLAYERS = { BLUE: 'blue', RED: 'red' };

let board = []; 
let pieces = [];
let currentPlayer = PLAYERS.BLUE;
let totalTurns = 0;
let movesRemaining = 1;
let selectedPiece = null;
let activePieceId = null; 
let lastMove = null; 
let gameOver = false;

const boardEl = document.getElementById('board');
const movePatternEl = document.getElementById('movePattern');
const splashCaptureEl = document.getElementById('splashCapture');
const lockTerritoryEl = document.getElementById('lockTerritory');
const captureTargetSquareEl = document.getElementById('captureTargetSquare');
const enforceAdjacencyEl = document.getElementById('enforceAdjacency');
const allowDoubleMoveEl = document.getElementById('allowDoubleMove');
const botDiffSlider = document.getElementById('botDifficulty');
const botDiffValue = document.getElementById('botDiffValue');
const darkModeToggle = document.getElementById('darkModeToggle');

darkModeToggle.addEventListener('click', () => document.body.classList.toggle('dark-mode'));

botDiffSlider.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if (val === 0) botDiffValue.innerText = "0 (PvP)";
    else if (val < 35) botDiffValue.innerText = `${val} (Easy)`;
    else if (val < 85) botDiffValue.innerText = `${val} (Medium)`;
    else botDiffValue.innerText = `${val} (Hard)`;
});

function initGame() {
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    pieces = [];
    currentPlayer = PLAYERS.BLUE;
    totalTurns = 0;
    movesRemaining = 1;
    selectedPiece = null;
    activePieceId = null;
    lastMove = null;
    gameOver = false;
    document.getElementById('winnerMessage').classList.add('hidden');
    document.getElementById('turnIndicator').innerText = "Current Turn: Blue";
    
    addPiece(3, 1, PLAYERS.BLUE, TYPES.ROCK);
    addPiece(3, 2, PLAYERS.BLUE, TYPES.ROCK);
    addPiece(4, 1, PLAYERS.BLUE, TYPES.PAPER);
    addPiece(4, 2, PLAYERS.BLUE, TYPES.PAPER);
    addPiece(5, 1, PLAYERS.BLUE, TYPES.SCISSORS);
    addPiece(5, 2, PLAYERS.BLUE, TYPES.SCISSORS);
    
    addPiece(3, 6, PLAYERS.RED, TYPES.SCISSORS);
    addPiece(3, 7, PLAYERS.RED, TYPES.SCISSORS);
    addPiece(4, 6, PLAYERS.RED, TYPES.PAPER);
    addPiece(4, 7, PLAYERS.RED, TYPES.PAPER);
    addPiece(5, 6, PLAYERS.RED, TYPES.ROCK);
    addPiece(5, 7, PLAYERS.RED, TYPES.ROCK);

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
    if (!enforceAdjacencyEl.checked) return false;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dr === 0) continue;
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                let p = getPieceAt(nr, nc);
                if (p && p.player !== player && p.type === type) return true;
            }
        }
    }
    return false;
}

function getValidMoves(piece) {
    let moves = new Set();
    const allowDouble = allowDoubleMoveEl.checked;
    
    function getKingMoves(startR, startC) {
        let valid = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dr === 0) continue;
                let nr = startR + dr, nc = startC + dc;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
                
                let targetPiece = getPieceAt(nr, nc);
                if (targetPiece && targetPiece.player === piece.player) continue;
                if (targetPiece && !canCapture(piece.type, targetPiece.type)) continue;
                if (isOppositionBlocked(nr, nc, piece.player, piece.type)) continue;
                valid.push({ r: nr, c: nc });
            }
        }
        return valid;
    }

    let step1Moves = getKingMoves(piece.r, piece.c);
    step1Moves.forEach(m => {
        // Respect territory lock rule: cannot step onto already claimed enemy territory if locked
        if (lockTerritoryEl.checked && board[m.r][m.c] !== null && board[m.r][m.c] !== piece.player && !getPieceAt(m.r, m.c)) {
            return;
        }
        moves.add(`${m.r},${m.c}`);
    });

    if (allowDouble) {
        step1Moves.forEach(m1 => {
            if (board[m1.r][m1.c] === piece.player && !getPieceAt(m1.r, m1.c)) {
                let step2Moves = getKingMoves(m1.r, m1.c);
                step2Moves.forEach(m2 => {
                    if (m2.r !== piece.r || m2.c !== piece.c) {
                        if (lockTerritoryEl.checked && board[m2.r][m2.c] !== null && board[m2.r][m2.c] !== piece.player && !getPieceAt(m2.r, m2.c)) {
                            return;
                        }
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
    let difficulty = parseInt(botDiffSlider.value);
    if (gameOver || (currentPlayer === PLAYERS.RED && difficulty > 0)) return;

    let clickedPiece = getPieceAt(r, c);

    if (clickedPiece && clickedPiece.player === currentPlayer) {
        if (movePatternEl.value === '122-same' && movesRemaining === 1 && activePieceId && clickedPiece.id !== activePieceId) return;
        selectedPiece = clickedPiece;
        render();
        return;
    }

    if (selectedPiece) {
        let moves = getValidMoves(selectedPiece);
        if (moves.some(m => m.r === r && m.c === c)) {
            executeMove(selectedPiece, r, c);
        } else {
            if (!(movePatternEl.value === '122-same' && movesRemaining === 1 && activePieceId)) {
                selectedPiece = null;
                render();
            }
        }
    }
}

function executeMove(piece, r, c) {
    let fromR = piece.r, fromC = piece.c;
    lastMove = { fromR, fromC, toR: r, toC: c };
    activePieceId = piece.id;

    let targetPiece = getPieceAt(r, c);
    
    if (targetPiece) {
        targetPiece.alive = false;
        
        let splashMode = splashCaptureEl.value;
        if (splashMode !== 'none') {
            let isOrthoAttack = (fromR === r || fromC === c);
            let isDiagAttack = !isOrthoAttack;
            let doOrtho = splashMode === 'all' || splashMode === 'ortho' || (splashMode === 'cond-same' && isOrthoAttack) || (splashMode === 'cond-opp' && isDiagAttack);
            let doDiag = splashMode === 'all' || splashMode === 'diag' || (splashMode === 'cond-same' && isDiagAttack) || (splashMode === 'cond-opp' && isOrthoAttack);

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dr === 0) continue;
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                        let isOrtho = (dr === 0 || dc === 0);
                        if ((isOrtho && doOrtho) || (!isOrtho && doDiag)) {
                            if (!lockTerritoryEl.checked || board[nr][nc] === null) {
                                board[nr][nc] = piece.player;
                            }
                        }
                    }
                }
            }
        }

        if (captureTargetSquareEl.checked) {
            if (!lockTerritoryEl.checked || board[r][c] === null) {
                board[r][c] = piece.player;
            }
        }
    } else if (board[r][c] === null) {
        board[r][c] = piece.player;
    }

    piece.r = r; piece.c = c;
    movesRemaining--;

    if (checkEndGame()) return;

    if (movesRemaining <= 0) {
        endTurn();
    } else {
        if (movePatternEl.value === '122-same') {
            if (getValidMoves(piece).length === 0) {
                endTurn();
                return;
            }
            selectedPiece = piece; 
        } else {
            selectedPiece = null;
        }
        
        render();
        updateStatus();

        let difficulty = parseInt(botDiffSlider.value);
        if (currentPlayer === PLAYERS.RED && difficulty > 0 && !gameOver) {
            setTimeout(playBotTurn, 400); 
        }
    }
}

function endTurn() {
    activePieceId = null;
    selectedPiece = null;
    currentPlayer = currentPlayer === PLAYERS.BLUE ? PLAYERS.RED : PLAYERS.BLUE;
    totalTurns++;
    
    let pattern = movePatternEl.value;
    if (pattern.startsWith('122') && totalTurns > 0) {
        movesRemaining = 2;
    } else {
        movesRemaining = 1;
    }

    render();
    updateStatus();

    let difficulty = parseInt(botDiffSlider.value);
    if (currentPlayer === PLAYERS.RED && difficulty > 0 && !gameOver) {
        setTimeout(playBotTurn, 400);
    }
}

async function playBotTurn() {
    if (gameOver || currentPlayer !== PLAYERS.RED) return;
    let difficulty = parseInt(botDiffSlider.value);
    if (difficulty === 0) return;

    if (difficulty > 70) {
        document.getElementById('turnIndicator').innerText = "Bot is thinking...";
        await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    let rules = {
        movePattern: movePatternEl.value,
        splashCapture: splashCaptureEl.value,
        lockTerritory: lockTerritoryEl.checked,
        captureTargetSquare: captureTargetSquareEl.checked,
        enforceAdjacency: enforceAdjacencyEl.checked,
        allowDoubleMove: allowDoubleMoveEl.checked
    };

    let state = {
        board: board, pieces: pieces, currentPlayer: currentPlayer, 
        movesRemaining: movesRemaining, activePieceId: activePieceId, 
        totalTurns: totalTurns, gameOver: gameOver
    };

    let bestMove = BotAI.getBestMove(state, rules, difficulty);

    if (bestMove) {
        let pieceToMove = pieces.find(p => p.id === bestMove.pieceId);
        executeMove(pieceToMove, bestMove.toR, bestMove.toC);
    } else {
        endTurn();
    }
}

function checkEndGame() {
    let emptySquares = 0, blueSquares = 0, redSquares = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === null) emptySquares++;
            else if (board[r][c] === PLAYERS.BLUE) blueSquares++;
            else if (board[r][c] === PLAYERS.RED) redSquares++;
        }
    }

    let blueAlive = pieces.some(p => p.player === PLAYERS.BLUE && p.alive);
    let redAlive = pieces.some(p => p.player === PLAYERS.RED && p.alive);

    let lockActive = lockTerritoryEl.checked;
    let instantWinTriggered = lockActive && (blueSquares >= 41 || redSquares >= 41);

    if (emptySquares === 0 || !blueAlive || !redAlive || instantWinTriggered) {
        gameOver = true;
        let msg = "";
        if (blueSquares >= 41) msg = "Blue Wins (41+ Squares)!";
        else if (redSquares >= 41) msg = "Red Wins (41+ Squares)!";
        else if (blueSquares > redSquares) msg = "Blue Wins!";
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
            
            if (lastMove && ((r === lastMove.fromR && c === lastMove.fromC) || (r === lastMove.toR && c === lastMove.toC))) {
                cell.classList.add('last-move');
            }
            if (validMoves.some(m => m.r === r && m.c === c)) {
                cell.classList.add('highlight');
            }

            cell.onclick = () => handleSquareClick(r, c);

            let piece = getPieceAt(r, c);
            if (piece) {
                let pSpan = document.createElement('span');
                pSpan.innerText = piece.type;
                pSpan.className = `piece ${piece.player}-piece`;
                if (piece === selectedPiece) pSpan.style.borderBottom = "3px solid var(--text-color)";
                cell.appendChild(pSpan);
            }

            boardEl.appendChild(cell);
        }
    }
}

function updateStatus() {
    if (gameOver) return;
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
initGame();
