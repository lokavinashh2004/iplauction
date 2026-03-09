import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, set, get } from 'firebase/database';
import { PLAYERS_DATA } from './Players/playersData';

const TEAM_COLORS = {
    MI: '#004BA0',
    CSK: '#FCCA06',
    RCB: '#DA1818',
    KKR: '#3A225D',
    DC: '#004C93',
    PBKS: '#ED1B24',
    RR: '#EA1A85',
    SRH: '#FF822A',
    GT: '#1B2133',
    LSG: '#00AEEF'
};

const TEAM_FULL_NAMES = {
    MI: 'Mumbai Indians',
    CSK: 'Chennai Super Kings',
    RCB: 'Royal Challengers Bengaluru',
    KKR: 'Kolkata Knight Riders',
    DC: 'Delhi Capitals',
    PBKS: 'Punjab Kings',
    RR: 'Rajasthan Royals',
    SRH: 'Sunrisers Hyderabad',
    GT: 'Gujarat Titans',
    LSG: 'Lucknow Super Giants'
};

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

export default function Auction({ userData, onEnd }) {
    const [activeTab, setActiveTab] = useState('activity');

    // Synced State
    const [auctionState, setAuctionState] = useState({
        activePlayer: PLAYERS_DATA[0],
        currentPlayerIndex: 0,
        currentBid: 0,
        currentBidTeam: null,
        timer: 15,
        isSold: false,
        soldTo: null
    });

    const [isHost, setIsHost] = useState(false);
    const [roomUsers, setRoomUsers] = useState({});

    // Sync auction state from Firebase
    useEffect(() => {
        if (!userData.roomId) return;

        // Setup Auction State Node if Host and it doesn't exist
        const roomRef = ref(db, `rooms/${userData.roomId}`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                // Determine if we are the host
                const hostStatus = !!(userData.name && data.host === userData.name);
                setIsHost(hostStatus);

                if (data.users) {
                    setRoomUsers(data.users);
                }

                if (data.auctionState) {
                    setAuctionState(data.auctionState);
                } else if (hostStatus) {
                    // Initialize the auction state if it's completely missing
                    const initialPlayer = PLAYERS_DATA[0];
                    set(ref(db, `rooms/${userData.roomId}/auctionState`), {
                        activePlayer: initialPlayer,
                        currentPlayerIndex: 0,
                        currentBid: parseFloat(initialPlayer.basePrice),
                        currentBidTeam: null,
                        timer: 15,
                        isSold: false,
                        soldTo: null
                    });
                }
            }
        });

        return () => unsubscribe();
    }, [userData.roomId, userData.name]);

    // Extracted exactly from global state to fulfill prompt 100%
    const activePlayer = auctionState.activePlayer || PLAYERS_DATA[0];

    // Pick a random team when bidding to demonstrate different team effects
    const handleBidSold = () => {
        if (isHost && !auctionState.isSold) {
            const updatedState = { ...auctionState, isSold: true, soldTo: auctionState.currentBidTeam || 'UNSOLD', timer: 0 };
            set(ref(db, `rooms/${userData.roomId}/auctionState`), updatedState);
        }
    };

    // Host exclusively drives the game clock to prevent client drift
    useEffect(() => {
        if (!isHost || auctionState.isSold) return;

        if (auctionState.timer <= 0) {
            const finalBuyer = auctionState.currentBidTeam || 'UNSOLD';

            // Mark Sold State
            const updatedState = { ...auctionState, isSold: true, soldTo: finalBuyer, timer: 0 };
            set(ref(db, `rooms/${userData.roomId}/auctionState`), updatedState);

            const currentPlayer = PLAYERS_DATA[auctionState.currentPlayerIndex] || PLAYERS_DATA[0];
            const playerSnapshot = {
                id: currentPlayer.id,
                name: `${currentPlayer.firstName} ${currentPlayer.lastName}`,
                role: currentPlayer.role,
                boughtFor: auctionState.currentBid || parseFloat(currentPlayer.basePrice),
                image: currentPlayer.imageUrl
            };

            if (finalBuyer !== 'UNSOLD') {
                // Find user doc by team
                const buyerName = Object.keys(roomUsers).find(name => roomUsers[name].team === finalBuyer);
                if (buyerName) {
                    const currentPurse = roomUsers[buyerName]?.purse !== undefined ? roomUsers[buyerName].purse : 100.0;
                    const newPurse = currentPurse - auctionState.currentBid;

                    // Deduct
                    set(ref(db, `rooms/${userData.roomId}/users/${buyerName}/purse`), newPurse);

                    // Add to Squad
                    get(ref(db, `rooms/${userData.roomId}/squads/${finalBuyer}`)).then(snap => {
                        const currentSquad = snap.val() || [];
                        set(ref(db, `rooms/${userData.roomId}/squads/${finalBuyer}`), [...currentSquad, playerSnapshot]);
                    });
                }
            } else {
                // Add to Unsold List
                get(ref(db, `rooms/${userData.roomId}/unsold`)).then(snap => {
                    const unsoldList = snap.val() || [];
                    set(ref(db, `rooms/${userData.roomId}/unsold`), [...unsoldList, playerSnapshot]);
                });
            }

            // After a 3 second delay, load the next player
            setTimeout(() => {
                const nextIndex = (auctionState.currentPlayerIndex + 1) % PLAYERS_DATA.length;
                const nextPlayer = PLAYERS_DATA[nextIndex];
                set(ref(db, `rooms/${userData.roomId}/auctionState`), {
                    activePlayer: nextPlayer,
                    currentPlayerIndex: nextIndex,
                    currentBid: parseFloat(nextPlayer.basePrice),
                    currentBidTeam: null,
                    timer: 15,
                    isSold: false,
                    soldTo: null
                });
            }, 3000);

            return;
        }

        const interval = setInterval(() => {
            set(ref(db, `rooms/${userData.roomId}/auctionState`), {
                ...auctionState,
                timer: auctionState.timer - 1
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isHost, auctionState.isSold, auctionState.timer, userData.roomId, auctionState, roomUsers]);

    // Play hammer sound effect when player is sold
    useEffect(() => {
        if (auctionState.isSold) {
            setTimeout(() => {
                // Public tool hammer sound
                const hammerAudio = new Audio('https://actions.google.com/sounds/v1/impacts/wood_plank_slap_1.ogg');
                hammerAudio.play().catch(e => console.log('Audio play failed (user may not have interacted)', e));
            }, 400); // Syncs with CSS hammer strike keyframe hitting table
        }
    }, [auctionState.isSold]);

    const buyingTeam = auctionState.soldTo || auctionState.currentBidTeam || 'UNSOLD';

    // We only pass the colors if a team is assigned. If unsold, default to neutral
    const isSold = auctionState.isSold;
    const teamColor = TEAM_COLORS[buyingTeam] || '#666';

    const myPurse = roomUsers[userData.name]?.purse !== undefined ? roomUsers[userData.name].purse : 100.00;
    const nextBidAmount = auctionState.currentBid ? auctionState.currentBid + 0.5 : parseFloat(activePlayer.basePrice);

    // Check if the current user represents a team, and if that team is currently leading the bid
    const isMyTeamLeading = Boolean(userData.team && auctionState.currentBidTeam === userData.team);

    // The user can only bid if they are a team, they aren't currently leading, and they have enough purse
    const canBid = Boolean(userData.team && !isMyTeamLeading && nextBidAmount <= myPurse);

    const handlePlaceBid = () => {
        if (!canBid || isSold) return;

        set(ref(db, `rooms/${userData.roomId}/auctionState`), {
            ...auctionState,
            currentBid: nextBidAmount,
            currentBidTeam: userData.team,
            timer: 15 // Reset the auction countdown so teams can respond
        });
    };

    return (
        <div className="center-panel">
            {/* Player Card */}
            <div className={`auction-card mb-4 animate-fade-in ${isSold ? 'shake' : ''}`} style={{ padding: 0, overflow: 'hidden' }}>
                <div className="timer-progress-bar" style={{ width: `${(auctionState.timer / 15) * 100}%` }}></div>

                <div className="bid-presentation">
                    <div className={`team-bg-overlay ${isSold && buyingTeam !== 'UNSOLD' ? 'show' : ''}`} style={{ backgroundColor: teamColor }}></div>
                    {isSold && buyingTeam !== 'UNSOLD' && (
                        <div className="team-logo-bg show">
                            <img src={IPL_LOGOS[buyingTeam]} alt={buyingTeam} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.5 }} />
                        </div>
                    )}
                    <div className={`stamp-sold flex-col ${isSold ? 'animate' : ''}`} style={{ textAlign: 'center', fontSize: '2.5rem', lineHeight: '1.2' }}>
                        {buyingTeam === 'UNSOLD' ? (
                            <div>UNSOLD</div>
                        ) : (
                            <>
                                <div>SOLD TO {buyingTeam}</div>
                                <div style={{ fontSize: '1.8rem', color: '#fff' }}>FOR ₹{(auctionState.currentBid || 0).toFixed(2)} CR</div>
                            </>
                        )}
                    </div>

                    {isSold && (
                        <div className="hammer-container">
                            <div className="hammer animate">🔨</div>
                            <div className="hammer-hit-effect animate"></div>
                        </div>
                    )}

                    <div className="player-avatar-wrapper">
                        <div className="avatar-shield">
                            <img src={activePlayer.imageUrl} alt={`${activePlayer.firstName} ${activePlayer.lastName}`} className="player-image" />
                        </div>
                    </div>

                    <div className="bid-stats-container">
                        <div className="bid-box skewed left">
                            <div>
                                <div className="bid-label">BASE PRICE</div>
                                <div className="bid-value">₹ {activePlayer.basePrice}Cr</div>
                            </div>
                        </div>

                        <div className="bid-box main-name">
                            <div className="player-first-name">{activePlayer.firstName}</div>
                            <div className="player-last-name">{activePlayer.lastName}</div>
                        </div>

                        <div className="bid-box skewed right">
                            <div>
                                <div className="bid-label">CURRENT BID</div>
                                <div className="bid-value">₹ {(auctionState.currentBid || 0).toFixed(2)}Cr</div>
                                {auctionState.currentBidTeam && (
                                    <div style={{ fontSize: '0.65rem', color: TEAM_COLORS[auctionState.currentBidTeam], fontWeight: 700, marginTop: '2px' }}>
                                        {auctionState.currentBidTeam} leads
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="player-details-strip">
                        <span>{activePlayer.role}</span> <span className="details-separator">|</span>
                        <span>AGE {activePlayer.age}</span> <span className="details-separator">|</span>
                        <span>COUNTRY {activePlayer.country}</span> <span className="details-separator">|</span>
                        <span>PREV TEAM {activePlayer.previousTeam}</span> <span className="details-separator">|</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>IPL STAT {activePlayer.iplStat}</span>
                    </div>

                    <div className="flex items-center w-full px-4 pb-4" style={{ gap: '0.5rem', background: '#121212', paddingTop: '1rem', marginTop: '-1rem', zIndex: 100, position: 'relative' }}>
                        <div className={`timer-box ${auctionState.timer <= 3 ? 'danger' : 'warning'}`}>
                            <span className="timer-num">{auctionState.timer}</span>
                            <span className="timer-text">SEC</span>
                        </div>
                        <div className="flex-col" style={{ marginLeft: 'auto', marginRight: '1rem', alignItems: 'flex-end', flex: 1 }}>
                            {isSold ? (
                                <div style={{ color: buyingTeam === 'UNSOLD' ? '#ef4444' : '#D4AF37', fontSize: '1.25rem', fontWeight: 800 }}>
                                    {buyingTeam === 'UNSOLD' ? 'UNSOLD' : `SOLD TO ${buyingTeam}`}
                                </div>
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Purse: <span style={{ color: nextBidAmount > myPurse ? '#ef4444' : '#10b981', fontWeight: 600 }}>{myPurse.toFixed(2)} Cr</span></span>
                            )}
                        </div>
                        {!isSold && (
                            <button
                                className="btn-bid"
                                style={{
                                    padding: '0.5rem 2rem',
                                    opacity: canBid ? 1 : 0.5,
                                    cursor: canBid ? 'pointer' : 'not-allowed',
                                    background: isMyTeamLeading ? '#4b5563' : '' // Grey out if leading
                                }}
                                onClick={handlePlaceBid}
                                disabled={!canBid}
                            >
                                {isMyTeamLeading ? 'LEADING BID' : `BID ₹ ${nextBidAmount.toFixed(2)}Cr`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Banner */}
            <div className="banner-item purple mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex-col-start">
                    <span className="flex items-center" style={{ gap: '0.5rem', fontWeight: 700 }}>
                        <span style={{ color: '#a855f7' }}>🚀</span> {userData.team ? `Playing as ${userData.team}` : 'Play IPL Simulation Game!'} <span className="banner-tag bg-green">LIVE</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        Play now as {userData.team ? <strong style={{ color: '#fff', fontWeight: 800 }}>{TEAM_FULL_NAMES[userData.team]}</strong> : 'your favorite team'}
                    </span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 3.86-12 2 2 0 0 1 2.9 0 22 22 0 0 1-12 3.86z"></path><path d="m15 12 3-3a22 22 0 0 0 12-3.86 2 2 0 0 0 0-2.9 22 22 0 0 0-3.86 12z"></path></svg>
            </div>

            {/* Interactive Tabs */}
            <div className="room-card tabbed-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="room-tabs flex-wrap">
                    <button className={`room-tab small ${activeTab === 'activity' ? 'active-orange full-bg' : ''}`} onClick={() => setActiveTab('activity')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Activity <span className="tab-badge">9</span>
                    </button>
                    <button className={`room-tab small ${activeTab === 'squad' ? 'active-neutral' : ''}`} onClick={() => setActiveTab('squad')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path></svg>
                        Squad <span className="tab-badge">20</span>
                    </button>
                    <button className={`room-tab small ${activeTab === 'community' ? 'active-neutral' : ''}`} onClick={() => setActiveTab('community')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Community
                    </button>
                    <button className={`room-tab small ${activeTab === 'settings' ? 'active-purple' : ''}`} onClick={() => setActiveTab('settings')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Settings
                    </button>
                </div>

                <div className="tab-content" style={{ minHeight: '300px' }}>
                    {activeTab === 'activity' && (
                        <div className="activity-feed">
                            <div className="flex items-center justify-center h-full w-full" style={{ padding: '2rem 0' }}>
                                <span style={{ color: 'var(--text-tertiary)' }}>No recent activity.</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'squad' && (
                        <div className="squad-panel flex items-center justify-center h-full">
                            <span style={{ color: 'var(--text-tertiary)' }}>No players in squad yet.</span>
                        </div>
                    )}

                    {activeTab === 'community' && (
                        <div className="community-panel flex items-center justify-center h-full">
                            <span style={{ color: 'var(--text-tertiary)' }}>Community features coming soon.</span>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="settings-panel">
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>ROOM SETTINGS</div>
                            <div className="settings-row flex-col-start">
                                <div className="flex justify-between w-full items-center">
                                    <div className="flex items-center" style={{ gap: '0.5rem', color: '#fff', fontWeight: 600 }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        Bid Timer
                                    </div>
                                    <span style={{ color: '#a855f7', fontWeight: 700 }}>10s</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.25rem 0 0.75rem' }}>
                                    Time allowed for each bid round
                                </div>
                                <div className="timer-grid">
                                    {['5s', '10s', '15s', '20s', '25s'].map(t => (
                                        <button key={t} className={`timer-btn ${t === '10s' ? 'active' : ''}`}>{t}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-row flex-col-start">
                                <div className="flex justify-between w-full items-center">
                                    <div className="flex items-center" style={{ gap: '0.5rem', color: '#fff', fontWeight: 600 }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                        Auction Mode
                                    </div>
                                    <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Mini 2026</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Cannot be changed after room creation</div>
                            </div>

                            <div className="settings-row justify-between border-none">
                                <div className="flex items-center" style={{ gap: '0.5rem', color: '#fff', fontWeight: 600 }}>
                                    <span style={{ color: '#f59e0b' }}>₹</span>
                                    Starting Purse
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
