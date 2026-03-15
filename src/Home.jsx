import { useState, useEffect } from 'react';
import { ResponsiveAdBanner, NativeAdBanner } from './AdBanner';
import { db } from './firebase';
import { ref, set, onValue, get } from 'firebase/database';
import { getServerVersion } from './useVersionCheck';

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

        // ── Version lock guard ────────────────────────────────────────────────
        // Verify the client is running the latest build before entering a room.
        // On mismatch: update localStorage and reload (silent, ~200ms on mobile).
        const LS_KEY = 'app_version_lock';
        const serverVer = await getServerVersion();
        if (serverVer) {
            const storedVer = localStorage.getItem(LS_KEY);
            if (storedVer && storedVer !== serverVer) {
                localStorage.setItem(LS_KEY, serverVer);
                window.location.reload();
                return; // prevent execution while reload is pending
            }
            // Keep localStorage current even when versions match
            localStorage.setItem(LS_KEY, serverVer);
        }
        // ─────────────────────────────────────────────────────────────────────

        const roomId = isCreating ? Math.random().toString(36).substring(2, 7).toUpperCase() : joinRoomId.toUpperCase();
        if (!isCreating && !joinRoomId) { alert('Please enter a room code!'); return; }
        if (!isCreating) {
            const roomSnap = await get(ref(db, `rooms/${roomId}`));
            if (!roomSnap.exists()) { alert('Room not found!'); return; }
        }

        try {
            const userRef = ref(db, `rooms/${roomId}/users/${userData.name}`);
            const userSnap = await get(userRef);
            const existingVal = userSnap.exists() ? userSnap.val() : null;
            const mergedTeam = isCreating ? userData.team : (existingVal?.team ?? null);
            await set(userRef, { ...(existingVal || {}), team: mergedTeam, joinedAt: existingVal?.joinedAt || Date.now(), leftAt: null });
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
            const existingLogs = logSnap.val() ? (Array.isArray(logSnap.val()) ? logSnap.val() : Object.values(logSnap.val())) : [];
            await set(ref(db, `rooms/${roomId}/activityLog`), [...newLogs, ...existingLogs].slice(0, 50));
            setUserData({ ...userData, roomId, team: mergedTeam, hasJoined: true });
            onJoin();
        } catch (e) { console.error(e); alert('Could not connect to room!'); }
    };

    return (
        <div className="home-page-wrapper">
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
                    <span>2026 Official List • 620 Players</span>
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
                    <div className="custom-ad-placeholder"><NativeAdBanner /></div>
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
                    <div className="custom-ad-placeholder"><NativeAdBanner /></div>
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

            {/* ── SEO / LONG CONTENT SECTION ── */}
            <div className="home-seo-container" style={{ backgroundColor: '#050505', color: '#b3b3b3', padding: '4rem 2rem', fontFamily: 'Inter, sans-serif', lineHeight: '1.6', position: 'relative', zIndex: 10 }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h2 style={{ color: '#fff', fontSize: '2rem', marginBottom: '1.5rem', fontWeight: 800 }}>Experience the Ultimate IPL 2026 Mock Auction Setup</h2>
                    <p style={{ marginBottom: '1.5rem', fontSize: '1.05rem' }}>
                        Welcome to the most immersive and interactive <strong>IPL Mock Auction Simulation Game</strong> available online. Whether you are a die-hard cricket fan, a strategic analyst, or just someone looking to have fun with friends, our real-time auction platform gives you the exact thrill of sitting at the actual IPL auction table. Build your dream squad, manage your purse, and outbid your rival franchises in a competitive, fast-paced environment.
                    </p>

                    <h3 style={{ color: '#f59e0b', fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', fontWeight: 700 }}>How the IPL Auction Game Works</h3>
                    <p style={{ marginBottom: '1.5rem' }}>
                        The rules of our virtual IPL auction are designed to closely mirror the real event. You and your friends can create a private room or join an existing one using a 5-character secure room code. Once inside:
                    </p>
                    <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <li><strong>Choose Your Franchise:</strong> Pick from all 10 official IPL teams including CSK, MI, RCB, KKR, and others.</li>
                        <li><strong>Manage Your Purse:</strong> You start with a designated virtual purse (e.g., ₹120 Cr). You must budget wisely to assemble a competitive 25-man squad.</li>
                        <li><strong>Real-time Bidding:</strong> Players appear randomly from distinct sets (Marquee, Batsmen, Bowlers, All-rounders, etc.). Hit the bid button before the timer expires to claim the player.</li>
                        <li><strong>Right to Match (RTM):</strong> Retaining the authentic vibe, the platform includes the RTM rule where the player's previous franchise can match the final winning bid.</li>
                    </ul>

                    <h3 style={{ color: '#f59e0b', fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', fontWeight: 700 }}>Key Features & Rules</h3>
                    <p style={{ marginBottom: '1.5rem' }}>
                        Our IPL Mock Auction platform boasts an extensive database featuring exactly 620 meticulously categorized players for the upcoming 2026 season. The built-in logic naturally enforces IPL squad restrictions:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
                            <h4 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Squad Size Limits</h4>
                            <p style={{ fontSize: '0.9rem', color: '#999' }}>A squad can have a maximum of 25 players. Strategic planning is crucial to not run out of slots before securing key players.</p>
                        </div>
                        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
                            <h4 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Overseas Players</h4>
                            <p style={{ fontSize: '0.9rem', color: '#999' }}>Each franchise is strictly capped at 8 overseas players. Our system actively prevents bidding on foreign athletes if your quota is full.</p>
                        </div>
                        <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
                            <h4 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Base Prices & Increments</h4>
                            <p style={{ fontSize: '0.9rem', color: '#999' }}>Players enter the pool at their authentic base prices. Bids increment dynamically, mimicking the fast-paced bidding wars of a live auction.</p>
                        </div>
                    </div>

                    <h3 style={{ color: '#f59e0b', fontSize: '1.5rem', marginTop: '3rem', marginBottom: '1rem', fontWeight: 700 }}>Frequently Asked Questions (FAQ)</h3>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ color: '#fff', marginBottom: '0.4rem', fontSize: '1.1rem' }}>Is this IPL Mock Auction free to play?</h4>
                        <p style={{ color: '#aaa', fontSize: '0.95rem' }}>Yes, the simulation is completely free. You simply enter a username, select your favorite IPL squad, and jump straight into the bidding action with your friends.</p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ color: '#fff', marginBottom: '0.4rem', fontSize: '1.1rem' }}>How does the host control the auction?</h4>
                        <p style={{ color: '#aaa', fontSize: '0.95rem' }}>The player who creates the room automatically becomes the Host. The host has the exclusive ability to start the game, pause the bidding timer to allow for negotiations, and end the auction to reveal the final team squads on the dashboard.</p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ color: '#fff', marginBottom: '0.4rem', fontSize: '1.1rem' }}>Can I play on mobile devices?</h4>
                        <p style={{ color: '#aaa', fontSize: '0.95rem' }}>Absolutely! The auction interface is fully responsive. The dynamic layouts, countdown timers, player cards, and live chat features are optimized for a smooth experience across both desktop and mobile networks.</p>
                    </div>

                    <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #333', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
                        <p>This is a fan-made simulation and is not officially affiliated with or endorsed by the Board of Control for Cricket in India (BCCI) or the Indian Premier League (IPL). All team logos and player names are the property of their respective owners.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
