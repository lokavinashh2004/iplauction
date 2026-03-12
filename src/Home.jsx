import { useState, useEffect } from 'react';
import { ResponsiveAdBanner, NativeAdBanner } from './AdBanner';
import { db } from './firebase';
import { ref, set, onValue, onDisconnect, get } from 'firebase/database';

const IPL_TEAMS = ['MI', 'CSK', 'RCB', 'KKR', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'LSG'];

const IPL_LOGOS = {
    MI: '/MI.png',
    CSK: '/CSK.png',
    RCB: '/RCB.png',
    KKR: '/KKR.png',
    DC: '/DC.png',
    PBKS: '/PBKS.png',
    RR: '/RR.png',
    SRH: '/SRH.png',
    GT: '/GT.png',
    LSG: '/LSG.png'
};

const TEAM_COLORS_MAP = {
    MI: '#004BA0', CSK: '#FCCA06', RCB: '#E4002B', KKR: '#3A225D',
    DC: '#0078BC', PBKS: '#ED1C24', RR: '#E8508A', SRH: '#F7620C',
    GT: '#1D3461', LSG: '#A72056'
};

export default function Home({ userData, setUserData, onJoin }) {
    const [viewMode, setViewMode] = useState(() => (userData.roomId ? 'join' : 'select'));
    const [joinRoomId, setJoinRoomId] = useState(userData.roomId || '');
    const [takenTeams, setTakenTeams] = useState([]);

    useEffect(() => {
        if (!joinRoomId) { setTakenTeams([]); return; }
        const unsubscribe = onValue(ref(db, `rooms/${joinRoomId}/users`), (snap) => {
            setTakenTeams(snap.exists() ? Object.values(snap.val()).map(u => u.team) : []);
        });
        return () => unsubscribe();
    }, [joinRoomId]);

    const handleJoinOrCreate = async (isCreating) => {
        if (!userData.name) { alert('Please enter your name!'); return; }
        if (isCreating && !userData.team) { alert('Please select a team!'); return; }
        const roomId = isCreating ? Math.random().toString(36).substring(2, 7).toUpperCase() : joinRoomId.toUpperCase();
        if (!isCreating && !joinRoomId) { alert('Please enter a room code!'); return; }
        if (!isCreating && takenTeams.includes(userData.team)) { alert('Team already taken!'); return; }

        try {
            const userRef = ref(db, `rooms/${roomId}/users/${userData.name}`);
            await set(userRef, { team: isCreating ? userData.team : null, joinedAt: Date.now() });
            await onDisconnect(userRef).remove();
            if (isCreating) {
                await set(ref(db, `rooms/${roomId}/status`), 'waiting');
                await set(ref(db, `rooms/${roomId}/host`), userData.name);
                window.location.hash = `room=${roomId}`;
            }
            const newLogs = [{ id: Date.now() + 1, type: 'JOIN', timestamp: Date.now() + 1, userName: userData.name }];
            if (isCreating && userData.team) {
                newLogs.unshift({ id: Date.now() + 2, type: 'TEAM_SELECT', team: userData.team, userName: userData.name, timestamp: Date.now() + 2 });
            }
            const logSnap = await get(ref(db, `rooms/${roomId}/activityLog`));
            const existing = logSnap.val() ? (Array.isArray(logSnap.val()) ? logSnap.val() : Object.values(logSnap.val())) : [];
            await set(ref(db, `rooms/${roomId}/activityLog`), [...newLogs, ...existing].slice(0, 50));
            setUserData({ ...userData, roomId, team: isCreating ? userData.team : null, hasJoined: true });
            onJoin();
        } catch (e) { console.error(e); alert('Could not connect to room!'); }
    };

    return (
        <div className="home-hero">
            {/* ── Background image ── */}
            <div className="home-hero-bg" />
            <div className="home-hero-overlay" />

            {/* ── HERO section (always visible) ── */}
            <div className="home-hero-content" style={{ display: viewMode === 'select' ? 'flex' : 'none' }}>
                {/* Badge */}
                <div className="home-badge">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    IPL 2026 Auction Ready
                </div>

                {/* Title */}
                <h1 className="home-hero-title animate-fade-in">
                    Play IPL Auction<br />
                    <span className="home-hero-sub">with Friends</span>
                </h1>

                {/* Player List Banner */}
                <div className="home-list-badge animate-fade-in">
                    <span style={{ color: '#f59e0b' }}>🔥</span>
                    <span>2026 Official List • 350 Players</span>
                </div>

                {/* Buttons */}
                <div className="home-cta-group animate-fade-in">
                    <button className="home-btn-create" onClick={() => setViewMode('create')}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        Create Room
                    </button>
                    <button className="home-btn-join" onClick={() => setViewMode('join')}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                        Join Room
                    </button>
                </div>

                {/* Ads Component */}
                <ResponsiveAdBanner />
            </div>

            {/* ── CREATE ROOM form ── */}
            {viewMode === 'create' && (
                <div className="home-form-overlay animate-fade-in">
                    <div className="home-form-card">
                        <div className="home-form-header">
                            <button className="home-back-btn" onClick={() => setViewMode('select')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                            </button>
                            <span className="home-form-title">Create New Room</span>
                        </div>

                        {/* Top Native Ad for Mobile View */}
                        <NativeAdBanner />

                        <div className="form-group">
                            <label className="form-label">Your Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your name"
                                value={userData.name}
                                onChange={e => setUserData({ ...userData, name: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Choose Your Team</label>
                            <div className="team-grid">
                                {IPL_TEAMS.map(t => {
                                    const tc = TEAM_COLORS_MAP[t];
                                    const isSel = userData.team === t;
                                    return (
                                        <button
                                            key={t}
                                            className={`team-btn team-logo-btn ${isSel ? 'selected' : ''}`}
                                            onClick={() => setUserData({ ...userData, team: t })}
                                            title={t}
                                            style={{
                                                backgroundColor: 'white',
                                                overflow: 'hidden',
                                                padding: '0.2rem',
                                                cursor: 'pointer',
                                                boxShadow: isSel ? `0 0 0 3px ${tc}` : undefined,
                                                borderColor: isSel ? tc : 'transparent'
                                            }}
                                        >
                                            <img src={IPL_LOGOS[t]} alt={t} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => handleJoinOrCreate(true)}>
                            Create Room
                        </button>
                    </div>
                </div>
            )}

            {/* ── JOIN ROOM form ── */}
            {viewMode === 'join' && (
                <div className="home-form-overlay animate-fade-in">
                    <div className="home-form-card">
                        <div className="home-form-header">
                            <button className="home-back-btn" onClick={() => setViewMode('select')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                            </button>
                            <span className="home-form-title">Join a Room</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Your Name</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your name"
                                value={userData.name}
                                onChange={e => setUserData({ ...userData, name: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Room Code</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter 5-character Room Code"
                                value={joinRoomId}
                                onChange={e => setJoinRoomId(e.target.value)}
                                autoCapitalize="characters"
                                autoComplete="off"
                                style={{ textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700, fontSize: '1.1rem' }}
                            />
                        </div>

                        <button
                            className="home-btn-join-submit"
                            style={{ width: '100%', marginTop: '0.5rem' }}
                            onClick={() => handleJoinOrCreate(false)}
                        >
                            Join Room
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
