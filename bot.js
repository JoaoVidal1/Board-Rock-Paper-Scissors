/**
 * Advanced AI Engine for RPS Territory Chess
 * Uses Minimax with Alpha-Beta Pruning to look ahead multiple turns.
 */
const BotAI = (function() {
    const TYPES = { ROCK: '🪨', PAPER: '📄', SCISSORS: '✂️' };

    function canCapture(attackerType, defenderType) {
        if (attackerType === TYPES.ROCK && defenderType === TYPES.SCISSORS) return true;
        if (attackerType === TYPES.SCISSORS && defenderType === TYPES.PAPER) return true;
        if (attackerType === TYPES.PAPER && defenderType === TYPES.ROCK) return true;
        return false;
    }

    function getPieceAt(state, r, c) {
        return state.pieces.find(p => p.r === r && p.c === c && p.alive) || null;
    }

    function isOppositionBlocked(state, rules, r, c, player, type) {
        if (!rules.enforceAdjacency) return false;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                    let p = getPieceAt(state, nr, nc);
                    if (p && p.player !== player && p.type === type) return true;
                }
            }
        }
        return false;
    }

    function getKingMoves(state, rules, piece, startR, startC) {
        let valid = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                let nr = startR + dr, nc = startC + dc;
                if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) continue;
                
                let targetPiece = getPieceAt(state, nr, nc);
                if (targetPiece && targetPiece.player === piece.player) continue;
                if (targetPiece && !canCapture(piece.type, targetPiece.type)) continue;
                if (isOppositionBlocked(state, rules, nr, nc, piece.player, piece.type)) continue;
                
                valid.push({ r: nr, c: nc, isCapture: !!targetPiece });
            }
        }
        return valid;
    }

    function getValidMovesForPiece(state, rules, piece) {
        let movesMap = new Map();
        
        let step1Moves = getKingMoves(state, rules, piece, piece.r, piece.c);
        step1Moves.forEach(m => movesMap.set(`${m.r},${m.c}`, m));

        if (rules.allowDoubleMove) {
            step1Moves.forEach(m1 => {
                if (state.board[m1.r][m1.c] === piece.player && !getPieceAt(state, m1.r, m1.c)) {
                    let step2Moves = getKingMoves(state, rules, piece, m1.r, m1.c);
                    step2Moves.forEach(m2 => {
                        if (m2.r !== piece.r || m2.c !== piece.c) {
                            movesMap.set(`${m2.r},${m2.c}`, m2);
                        }
                    });
                }
            });
        }

        return Array.from(movesMap.values()).map(m => ({ pieceId: piece.id, toR: m.r, toC: m.c, isCapture: m.isCapture }));
    }

    function getAllMoves(state, rules, player) {
        let myPieces = state.pieces.filter(p => p.player === player && p.alive);
        if (rules.movePattern === '122-same' && state.movesRemaining === 1 && state.activePieceId) {
            myPieces = myPieces.filter(p => p.id === state.activePieceId);
        }

        let allMoves = [];
        myPieces.forEach(p => {
            allMoves.push(...getValidMovesForPiece(state, rules, p));
        });

        // Alpha-Beta optimization: Evaluate captures first to prune faster
        allMoves.sort((a, b) => (b.isCapture ? 1 : 0) - (a.isCapture ? 1 : 0));
        return allMoves;
    }

    function cloneState(state) {
        return {
            board: state.board.map(row => [...row]),
            pieces: state.pieces.map(p => ({...p})),
            currentPlayer: state.currentPlayer,
            movesRemaining: state.movesRemaining,
            activePieceId: state.activePieceId,
            totalTurns: state.totalTurns,
            gameOver: state.gameOver
        };
    }

    function simulateMove(state, rules, move) {
        let next = cloneState(state);
        let piece = next.pieces.find(p => p.id === move.pieceId);
        let target = getPieceAt(next, move.toR, move.toC);
        
        let fromR = piece.r, fromC = piece.c;
        let r = move.toR, c = move.toC;

        if (target) {
            target.alive = false;
            let splashMode = rules.splashCapture;
            if (splashMode !== 'none') {
                let isOrtho = (fromR === r || fromC === c);
                let isDiag = !isOrtho;
                let doOrtho = splashMode === 'all' || splashMode === 'ortho' || (splashMode === 'cond-same' && isOrtho) || (splashMode === 'cond-opp' && isDiag);
                let doDiag = splashMode === 'all' || splashMode === 'diag' || (splashMode === 'cond-same' && isDiag) || (splashMode === 'cond-opp' && isOrtho);

                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        let nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                            let currIsOrtho = (dr === 0 || dc === 0);
                            if ((currIsOrtho && doOrtho) || (!currIsOrtho && doDiag)) {
                                next.board[nr][nc] = piece.player;
                            }
                        }
                    }
                }
            }
            if (rules.captureTargetSquare) next.board[r][c] = piece.player;
        } else if (next.board[r][c] === null) {
            next.board[r][c] = piece.player;
        }

        piece.r = r; piece.c = c;
        next.activePieceId = piece.id;
        next.movesRemaining--;

        // Check Endgame
        let empty = 0;
        for(let ir=0; ir<9; ir++) for(let ic=0; ic<9; ic++) if(next.board[ir][ic] === null) empty++;
        let blueAlive = next.pieces.some(p => p.player === 'blue' && p.alive);
        let redAlive = next.pieces.some(p => p.player === 'red' && p.alive);
        
        if (empty === 0 || !blueAlive || !redAlive) {
            next.gameOver = true;
            return next;
        }

        // Turn Management
        if (next.movesRemaining <= 0) {
            next.currentPlayer = next.currentPlayer === 'blue' ? 'red' : 'blue';
            next.totalTurns++;
            next.activePieceId = null;
            next.movesRemaining = (rules.movePattern.startsWith('122') && next.totalTurns > 0) ? 2 : 1;
        } else if (rules.movePattern === '122-same') {
            if (getValidMovesForPiece(next, rules, piece).length === 0) {
                next.currentPlayer = next.currentPlayer === 'blue' ? 'red' : 'blue';
                next.totalTurns++;
                next.activePieceId = null;
                next.movesRemaining = rules.movePattern.startsWith('122') ? 2 : 1;
            }
        }

        return next;
    }

    function evaluateBoard(state) {
        if (state.gameOver) {
            let blue = 0, red = 0;
            state.board.forEach(row => row.forEach(cell => {
                if (cell === 'blue') blue++;
                if (cell === 'red') red++;
            }));
            let bAlive = state.pieces.some(p => p.player === 'blue' && p.alive);
            let rAlive = state.pieces.some(p => p.player === 'red' && p.alive);
            if (!bAlive) return 100000;
            if (!rAlive) return -100000;
            if (red > blue) return 100000;
            if (blue > red) return -100000;
            return 0; // tie
        }

        let score = 0;
        let redTerritory = 0, blueTerritory = 0;
        
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (state.board[r][c] === 'red') redTerritory++;
                else if (state.board[r][c] === 'blue') blueTerritory++;
            }
        }
        score += (redTerritory - blueTerritory) * 10;

        let redPieces = 0, bluePieces = 0;
        state.pieces.forEach(p => {
            if (p.alive) {
                if (p.player === 'red') redPieces++;
                else bluePieces++;
            }
        });
        score += (redPieces - bluePieces) * 150;

        // Quick Threat Assessment
        let redP = state.pieces.filter(p => p.alive && p.player === 'red');
        let blueP = state.pieces.filter(p => p.alive && p.player === 'blue');
        
        redP.forEach(rp => {
            blueP.forEach(bp => {
                if (Math.abs(rp.r - bp.r) <= 1 && Math.abs(rp.c - bp.c) <= 1) {
                    if (canCapture(bp.type, rp.type)) score -= 50; // Red in danger
                    if (canCapture(rp.type, bp.type)) score += 40; // Blue in danger
                }
            });
        });

        return score;
    }

    function minimax(state, rules, depth, alpha, beta, isMaximizing, noiseLvl) {
        if (depth === 0 || state.gameOver) {
            let evalScore = evaluateBoard(state);
            let noise = (Math.random() * noiseLvl * 2) - noiseLvl;
            return { score: evalScore + noise };
        }

        let moves = getAllMoves(state, rules, state.currentPlayer);
        
        if (moves.length === 0) {
            let passState = cloneState(state);
            passState.currentPlayer = passState.currentPlayer === 'blue' ? 'red' : 'blue';
            passState.totalTurns++;
            passState.activePieceId = null;
            passState.movesRemaining = (rules.movePattern.startsWith('122') && passState.totalTurns > 0) ? 2 : 1;
            
            let res = minimax(passState, rules, depth - 1, alpha, beta, passState.currentPlayer === 'red', noiseLvl);
            return { score: res.score };
        }

        let bestMove = moves[0];
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of moves) {
                let next = simulateMove(state, rules, move);
                // Depth always decreases by 1 per PLY to prevent infinite multi-move loops
                let res = minimax(next, rules, depth - 1, alpha, beta, next.currentPlayer === 'red', noiseLvl);
                if (res.score > maxEval) {
                    maxEval = res.score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, res.score);
                if (beta <= alpha) break;
            }
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            for (let move of moves) {
                let next = simulateMove(state, rules, move);
                let res = minimax(next, rules, depth - 1, alpha, beta, next.currentPlayer === 'red', noiseLvl);
                if (res.score < minEval) {
                    minEval = res.score;
                    bestMove = move;
                }
                beta = Math.min(beta, res.score);
                if (beta <= alpha) break;
            }
            return { score: minEval, move: bestMove };
        }
    }

    return {
        getBestMove: function(state, rules, difficulty) {
            // Difficulty parsing
            let depth = difficulty < 35 ? 1 : (difficulty < 85 ? 2 : 3);
            let maxNoise = 60; 
            let noiseLevel = ((100 - difficulty) / 100) * maxNoise;

            let result = minimax(state, rules, depth, -Infinity, Infinity, state.currentPlayer === 'red', noiseLevel);
            return result.move;
        }
    };
})();
