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

// UI Elements
const boardEl = document.getElementById('board');
const movePatternEl = document.getElementById('movePattern');
const splashCaptureEl = document.getElementById('splashCapture');
const captureTargetSquareEl = document.getElementById('captureTargetSquare');
const enforceAdjacencyEl = document.getElementById('enforceAdjacency');
const allowDoubleMoveEl = document.getElementById('allowDoubleMove');
const botDifficultyEl = document.getElementById('botDifficulty');
const darkModeToggle = document.getElementById('darkModeToggle');

// Dark Mode Toggle
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
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
    
    // Blue setup
    addPiece(3, 1, PLAYERS.BLUE, TYPES.ROCK);
    addPiece(3, 2, PLAYERS.BLUE, TYPES.ROCK);
    addPiece(4, 1, PLAYERS.BLUE, TYPES.PAPER);
    addPiece(4, 2, PLAYERS.BLUE, TYPES.PAPER);
    addPiece(5, 1, PLAYERS.BLUE, TYPES.SCISSORS);
    addPiece(5, 2, PLAYERS.BLUE, TYPES.SCISSORS);
    
    // Red setup
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
            if (dr === 0 && dc === 0) continue;
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
                if (dr === 0 && dc === 0) continue;
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
    step1Moves.forEach(m => moves.add(`${m.r},${m.c}`));

    if (allowDouble) {
        step1Moves.forEach(m1 => {
            if (board[m1.r][m1.c] === piece.player && !getPieceAt(m1.r, m1.c)) {
                let step2Moves = getKingMoves(m1.r, m1.c);
                step2Moves.forEach(m2 => {
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
        
        // Handle Splash Capture
        let splashMode = splashCaptureEl.value;
        if (splashMode !== 'none') {
            let isOrthoAttack = (fromR === r || fromC === c);
            let isDiagAttack = !isOrthoAttack;
            
            let doOrtho = splashMode === 'all' || splashMode === 'ortho' || 
                          (splashMode === 'cond-same' && isOrthoAttack) ||
                          (splashMode === 'cond-opp' && isDiagAttack);
                          
            let doDiag = splashMode === 'all' || splashMode === 'diag' || 
                         (splashMode === 'cond-same' && isDiagAttack) ||
                         (splashMode === 'cond-opp' && isOrthoAttack);

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                        let isOrtho = (dr === 0 || dc === 0);
                        if ((isOrtho && doOrtho) || (!isOrtho && doDiag)) {
                            board[nr][nc] = piece.player;
                        }
                    }
                }
            }
        }

        // Handle target square claim toggle
        if (captureTargetSquareEl.checked) {
            board[r][c] = piece.player;
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

    if (currentPlayer === PLAYERS.RED && botDifficultyEl.value !== "0" && !gameOver) {
        setTimeout(playBotTurn, 600);
    }
}

// Advanced Bot Logic
function getMoveScore(m, difficulty) {
    let score = 0;
    let targetPiece = getPieceAt(m.r, m.c);
    let fromR = m.piece.r, fromC = m.piece.c;
    
    // 1. Scoring Captures and Splash Territory
    if (targetPiece) {
        score += 60; // High priority for killing
        if (captureTargetSquareEl.checked) score += 10;
        
        let splashMode = splashCaptureEl.value;
        if (splashMode !== 'none') {
            let isOrthoAttack = (fromR === m.r || fromC === m.c);
            let isDiagAttack = !isOrthoAttack;
            let doOrtho = splashMode === 'all' || splashMode === 'ortho' || (splashMode === 'cond-same' && isOrthoAttack) || (splashMode === 'cond-opp' && isDiagAttack);
            let doDiag = splashMode === 'all' || splashMode === 'diag' || (splashMode === 'cond-same' && isDiagAttack) || (splashMode === 'cond-opp' && isOrthoAttack);
            
            for(let dr=-1; dr<=1; dr++){
                for(let dc=-1; dc<=1; dc++){
                    if(dr===0 && dc===0) continue;
                    let nr = m.r + dr, nc = m.c + dc;
                    if(nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE){
                        let isOrtho = (dr===0 || dc===0);
                        if((isOrtho && doOrtho) || (!isOrtho && doDiag)){
                            if (board[nr][nc] === PLAYERS.BLUE) score += 10; // Stealing enemy territory
                            else if (board[nr][nc] === null) score += 5; // Claiming empty
                        }
                    }
                }
            }
        }
    } else if (board[m.r][m.c] === null) {
        score += 15; // Claiming blank territory
    }
    
    // 2. Double move positioning (Bouncing off own territory)
    if (allowDoubleMoveEl.checked && board[m.r][m.c] === PLAYERS.RED && !targetPiece) {
         score += 20;
    }

    // 3. Danger Assessment (Medium/Hard)
    if (difficulty >= 2) {
        let enemyPieces = pieces.filter(p => p.player === PLAYERS.BLUE && p.alive);
        let inDanger = false;
        for (let ep of enemyPieces) {
            if (Math.abs(ep.r - m.r) <= 1 && Math.abs(ep.c - m.c) <= 1) {
                if (canCapture(ep.type, m.piece.type)) {
                    inDanger = true;
                    break;
                }
            }
        }
        if (inDanger) {
            score -= (difficulty === 3) ? 100 : 40; // Hard flees danger strongly
        }
    }
    
    return score + Math.random(); // Tiebreaker
}

function playBotTurn() {
    if (gameOver || currentPlayer !== PLAYERS.RED) return;
    
    let difficulty = parseInt(botDifficultyEl.value);
    let myPieces = pieces.filter(p => p.player === PLAYERS.RED && p.alive);

    if (movePatternEl.value === '122-same' && movesRemaining === 1 && activePieceId) {
        myPieces = myPieces.filter(p => p.id === activePieceId);
    }

    let allPossibleMoves = [];
    myPieces.forEach(p => {
        getValidMoves(p).forEach(m => allPossibleMoves.push({ piece: p, r: m.r, c: m.c }));
    });

    if (allPossibleMoves.length === 0) {
        endTurn();
        return;
    }

    let chosenMove = null;

    if (difficulty === 1) {
        chosenMove = allPossibleMoves[Math.floor(Math.random() * allPossibleMoves.length)];
    } else {
        let bestScore = -Infinity;
        allPossibleMoves.forEach(m => {
            let score = getMoveScore(m, difficulty);
            if (score > bestScore) {
                bestScore = score;
                chosenMove = m;
            }
        });
    }

    if (chosenMove) executeMove(chosenMove.piece, chosenMove.r, chosenMove.c);
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

    if (emptySquares === 0 || !blueAlive || !redAlive) {
        gameOver = true;
        let msg = (blueSquares > redSquares) ? "Blue Wins!" : (redSquares > blueSquares) ? "Red Wins!" : "It's a Tie!";
        
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