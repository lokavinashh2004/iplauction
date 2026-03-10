import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, set, onValue, onDisconnect } from 'firebase/database';

const IPL_TEAMS = ['MI', 'CSK', 'RCB', 'KKR', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'LSG'];

const IPL_LOGOS = {
    MI: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cd/Mumbai_Indians_Logo.svg/200px-Mumbai_Indians_Logo.svg.png',
    CSK: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/Chennai_Super_Kings_Logo.svg/200px-Chennai_Super_Kings_Logo.svg.png',
    RCB: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/14/Royal_Challengers_Bengaluru_logo.png/200px-Royal_Challengers_Bengaluru_logo.png',
    KKR: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4c/Kolkata_Knight_Riders_Logo.svg/200px-Kolkata_Knight_Riders_Logo.svg.png',
    DC: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2f/Delhi_Capitals.svg/200px-Delhi_Capitals.svg.png',
    PBKS: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Punjab_Kings_Logo.svg/200px-Punjab_Kings_Logo.svg.png',
    RR: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/60/Rajasthan_Royals_Logo.svg/200px-Rajasthan_Royals_Logo.svg.png',
    SRH: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/81/Sunrisers_Hyderabad.svg/200px-Sunrisers_Hyderabad.svg.png',
    GT: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Gujarat_Titans_Logo.svg/200px-Gujarat_Titans_Logo.svg.png',
    LSG: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/Lucknow_Super_Giants_IPL_Logo.svg/200px-Lucknow_Super_Giants_IPL_Logo.svg.png'
};

export default function Home({ userData, setUserData, onJoin }) {
    const [joinRoomId, setJoinRoomId] = useState(userData.roomId || '');
    const [takenTeams, setTakenTeams] = useState([]);

    useEffect(() => {
        if (!joinRoomId) {
            setTakenTeams([]);
            return;
        }
        const roomUsersRef = ref(db, `rooms/${joinRoomId}/users`);
        const unsubscribe = onValue(roomUsersRef, (snapshot) => {
            if (snapshot.exists()) {
                const usersData = snapshot.val();
                const taken = Object.values(usersData).map(u => u.team);
                setTakenTeams(taken);
            } else {
                setTakenTeams([]);
            }
        });
        return () => unsubscribe();
    }, [joinRoomId]);


    const handleJoinOrCreate = async (isCreating) => {
        if (!userData.name || !userData.team) {
            alert('Please select your name and a team to play!');
            return;
        }

        const roomId = isCreating ? Math.random().toString(36).substring(2, 7).toUpperCase() : joinRoomId.toUpperCase();

        if (!isCreating && !joinRoomId) {
            alert("Please enter a room code to join!");
            return;
        }

        if (!isCreating && takenTeams.includes(userData.team)) {
            alert("Team already taken in this room!");
            return;
        }

        try {
            const userRef = ref(db, `rooms/${roomId}/users/${userData.name}`);

            await set(userRef, {
                team: userData.team,
                joinedAt: Date.now()
            });

            // Automatically clean up this user if they disconnect or close the browser
            await onDisconnect(userRef).remove();

            if (isCreating) {
                await set(ref(db, `rooms/${roomId}/status`), 'waiting');
                await set(ref(db, `rooms/${roomId}/host`), userData.name);
                window.location.hash = `room=${roomId}`;
            }

            setUserData({ ...userData, roomId });
            onJoin();
        } catch (error) {
            console.error(error);
            alert("Could not connect to room!");
        }
    };

    return (
        <div className="center-panel">
            <div className="badge-pill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                IPL 2026 Auction Ready
            </div>

            <h1 className="hero-title animate-fade-in">
                Play IPL Auction<br />
                <span className="hero-subtitle">with Friends</span>
            </h1>

            <div className="banner-list animate-fade-in">
                <div className="banner-item orange">
                    <span className="flex items-center" style={{ gap: '0.5rem' }}>
                        <span style={{ color: '#f59e0b' }}>🔥</span> 2026 Official List • 350 players
                    </span>
                    <span className="banner-tag bg-orange">NEW</span>
                </div>
                <div className="banner-item purple">
                    <span className="flex items-center" style={{ gap: '0.5rem' }}>
                        <span style={{ color: '#a855f7' }}>🚀</span> Play IPL Simulation Game!
                    </span>
                    <span className="banner-tag bg-neutral">LIVE</span>
                </div>
                <div className="banner-item green">
                    <span className="flex items-center" style={{ gap: '0.5rem' }}>
                        <span style={{ color: '#10b981' }}>☕</span> Enjoyed it? Buy us a coffee!
                    </span>
                    <span className="banner-tag bg-green">Support</span>
                </div>
            </div>

            <div className="interactive-card animate-fade-in" style={{ animationDelay: '0.1s' }}>

                <div className="form-group">
                    <label className="form-label">Your Name</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter your name"
                        value={userData.name}
                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Choose Your Team</label>
                    <div className="team-grid">
                        {IPL_TEAMS.map(t => {
                            const isTaken = takenTeams.includes(t);
                            return (
                                <button
                                    key={t}
                                    className={`team-btn team-logo-btn ${userData.team === t ? 'selected' : ''}`}
                                    onClick={() => !isTaken && setUserData({ ...userData, team: t })}
                                    title={isTaken ? `${t} (Taken)` : t}
                                    disabled={isTaken}
                                    style={{
                                        backgroundColor: 'white',
                                        overflow: 'hidden',
                                        padding: '0.2rem',
                                        opacity: isTaken ? 0.3 : 1,
                                        cursor: isTaken ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <img src={IPL_LOGOS[t]} alt={t} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="form-group">
                    <div className="privacy-toggle" style={{ gridTemplateColumns: '1fr' }}>
                        <button
                            className={`privacy-btn selected`}
                            onClick={() => setUserData({ ...userData, privacy: 'private' })}
                        >
                            <div className="privacy-btn-title">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                                Private
                            </div>
                            <div className="privacy-btn-desc">Only people you invite can join</div>
                        </button>
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">Join Existing Room</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter 6-character Room Code"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        autoCapitalize="characters"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        style={{ textTransform: 'uppercase' }}
                    />
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <div className="flex" style={{ gap: '1rem' }}>
                        <button className="btn-primary" onClick={() => handleJoinOrCreate(true)} style={{ flex: 1 }}>
                            Create Room
                        </button>
                        <button className="btn-secondary" onClick={() => handleJoinOrCreate(false)} style={{ flex: 1, border: '1px solid #10b981', color: '#10b981' }}>
                            Join Room
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
