import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from './api';

const WS_BASE_URL = 'ws://localhost:8000/api/v1/multiplayer/ws';

/**
 * Custom hook for managing the multiplayer WebSocket lifecycle.
 * Handles matchmaking queue, real-time progress sync, and game over events.
 * Supports multiple game types: sudoku, shikaku, nonogram, pipes, tower.
 */
export function useMultiplayer() {
    const [status, setStatus] = useState('idle'); // idle | connecting | queued | matched | playing | game_over
    const [myUsername, setMyUsername] = useState('');
    const [opponent, setOpponent] = useState(null);
    const [puzzle, setPuzzle] = useState(null);
    const [solution, setSolution] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [gameType, setGameType] = useState('sudoku');
    const [opponentProgress, setOpponentProgress] = useState(0);
    const [winner, setWinner] = useState(null);
    const [gameOverReason, setGameOverReason] = useState(null);
    const [error, setError] = useState(null);
    // Extra data for non-sudoku games
    const [extraData, setExtraData] = useState(null);
    
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const cleanup = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    // Clean up on unmount
    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const connect = useCallback(async () => {
        cleanup();
        setStatus('connecting');
        setError(null);
        
        try {
            // Build WS URL with auth token or guest username
            const token = await api.getToken();
            let url = WS_BASE_URL;
            const params = [];
            if (token) {
                params.push(`token=${encodeURIComponent(token)}`);
            } else {
                const guestName = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
                params.push(`username=${encodeURIComponent(guestName)}`);
            }
            if (params.length > 0) {
                url += '?' + params.join('&');
            }

            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[Multiplayer] WebSocket connected');
                setStatus('idle');
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleMessage(msg);
                } catch (e) {
                    console.error('[Multiplayer] Failed to parse message:', e);
                }
            };

            ws.onerror = (event) => {
                console.error('[Multiplayer] WebSocket error:', event);
                setError('Connection error. Please try again.');
            };

            ws.onclose = (event) => {
                console.log('[Multiplayer] WebSocket closed:', event.code, event.reason);
                wsRef.current = null;
            };
        } catch (e) {
            console.error('[Multiplayer] Failed to connect:', e);
            setError('Failed to connect to multiplayer server.');
            setStatus('idle');
        }
    }, [cleanup]);

    const handleMessage = useCallback((msg) => {
        switch (msg.type) {
            case 'queue_joined':
                setMyUsername(msg.username);
                setStatus('queued');
                break;

            case 'queue_left':
                setStatus('idle');
                break;

            case 'match_found':
                setRoomId(msg.room_id);
                setOpponent(msg.opponent);
                setPuzzle(msg.puzzle);
                setSolution(msg.solution);
                setGameType(msg.game_type || 'sudoku');
                setExtraData(msg.extra_data || null);
                setOpponentProgress(0);
                setWinner(null);
                setGameOverReason(null);
                setStatus('playing');
                break;

            case 'opponent_progress':
                setOpponentProgress(msg.progress);
                break;

            case 'game_over':
                setWinner(msg.winner);
                setGameOverReason(msg.reason);
                setStatus('game_over');
                break;

            default:
                console.log('[Multiplayer] Unknown message type:', msg.type);
        }
    }, []);

    const joinQueue = useCallback((selectedGameType = 'sudoku') => {
        setGameType(selectedGameType);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'join_queue', game_type: selectedGameType }));
        } else {
            setError('Not connected. Reconnecting...');
            connect().then(() => {
                setTimeout(() => {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'join_queue', game_type: selectedGameType }));
                    }
                }, 500);
            });
        }
    }, [connect]);

    const leaveQueue = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'leave_queue' }));
        }
        setStatus('idle');
    }, []);

    const sendProgress = useCallback((progress) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'progress', progress }));
        }
    }, []);

    const sendSolve = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'solve' }));
        }
    }, []);

    const disconnect = useCallback(() => {
        cleanup();
        setStatus('idle');
        setOpponent(null);
        setPuzzle(null);
        setSolution(null);
        setRoomId(null);
        setGameType('sudoku');
        setOpponentProgress(0);
        setWinner(null);
        setGameOverReason(null);
        setError(null);
        setExtraData(null);
    }, [cleanup]);

    const reset = useCallback(() => {
        setOpponent(null);
        setPuzzle(null);
        setSolution(null);
        setRoomId(null);
        setOpponentProgress(0);
        setWinner(null);
        setGameOverReason(null);
        setError(null);
        setExtraData(null);
        setStatus('idle');
    }, []);

    return {
        // State
        status,
        myUsername,
        opponent,
        puzzle,
        solution,
        roomId,
        gameType,
        extraData,
        opponentProgress,
        winner,
        gameOverReason,
        error,
        // Actions
        connect,
        joinQueue,
        leaveQueue,
        sendProgress,
        sendSolve,
        disconnect,
        reset,
    };
}
