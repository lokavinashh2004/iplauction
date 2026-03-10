import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, set, get } from 'firebase/database';
import { PLAYERS_DATA } from './Players/playersData';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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

const AnimatedPurse = ({ amount }) => {
    const [prevAmount, setPrevAmount] = useState(amount);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (amount !== prevAmount) {
            setAnimating(true);
            setPrevAmount(amount);
            const t = setTimeout(() => setAnimating(false), 800);
            return () => clearTimeout(t);
        }
    }, [amount, prevAmount]);

    return (
        <span className={animating ? 'purse-deduct-animate' : ''} style={{ display: 'inline-block', transition: 'color 0.3s' }}>
            ₹ {amount.toFixed(2)} Cr
        </span>
    );
};

export default function Auction({ userData, onEnd }) {
    const [activeTab, setActiveTab] = useState('board');

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
    const [activityLog, setActivityLog] = useState([]);
    const [allSquads, setAllSquads] = useState({});
    const [roomTimerSetting, setRoomTimerSetting] = useState(15);
    const [isPaused, setIsPaused] = useState(false);

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        const { source, destination } = result;
        if (source.droppableId !== destination.droppableId) return;

        const teamName = source.droppableId;
        if (teamName.startsWith('unassigned')) return;

        const squad = Array.from(allSquads[teamName] || []);
        const [movedPlayer] = squad.splice(source.index, 1);
        squad.splice(destination.index, 0, movedPlayer);

        set(ref(db, `rooms/${userData.roomId}/squads/${teamName}`), squad);
    };

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

                if (data.activityLog) {
                    const logs = Array.isArray(data.activityLog) ? data.activityLog : Object.values(data.activityLog);
                    setActivityLog(logs.sort((a, b) => b.timestamp - a.timestamp));
                } else {
                    setActivityLog([]);
                }

                if (data.squads) {
                    setAllSquads(data.squads);
                } else {
                    setAllSquads({});
                }

                if (data.settings && data.settings.timer) {
                    setRoomTimerSetting(data.settings.timer);
                }

                if (data.settings && data.settings.isPaused !== undefined) {
                    setIsPaused(data.settings.isPaused);
                } else {
                    setIsPaused(false);
                }

                if (data.auctionState) {
                    setAuctionState(data.auctionState);
                } else if (hostStatus) {
                    // Initialize the auction state if it's completely missing
                    const initialPlayer = PLAYERS_DATA[0];
                    const defaultTimer = data.settings?.timer || 15;
                    set(ref(db, `rooms/${userData.roomId}/auctionState`), {
                        activePlayer: initialPlayer,
                        currentPlayerIndex: 0,
                        currentBid: parseFloat(initialPlayer.basePrice),
                        currentBidTeam: null,
                        timer: defaultTimer,
                        isSold: false,
                        soldTo: null,
                        isRtmPhase: false,
                        isRtmUsedThisPlayer: false,
                        rtmTeam: null
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
        if (!isHost || auctionState.isSold || isPaused || auctionState.isAuctionOver) return;

        if (auctionState.timer <= 0) {
            const originalBuyer = auctionState.currentBidTeam || 'UNSOLD';
            const currentPlayer = PLAYERS_DATA[auctionState.currentPlayerIndex] || PLAYERS_DATA[0];
            const prevTeamName = currentPlayer?.previousTeam;
            const isPrevTeamActive = Object.values(roomUsers).some(u => u.team === prevTeamName);

            if (!auctionState.isRtmPhase && !auctionState.isRtmUsedThisPlayer && originalBuyer !== 'UNSOLD' && isPrevTeamActive && prevTeamName && prevTeamName !== originalBuyer) {
                const prevTeamUser = Object.keys(roomUsers).find(name => roomUsers[name].team === prevTeamName);
                const rtmCount = prevTeamUser && roomUsers[prevTeamUser].rtms !== undefined ? roomUsers[prevTeamUser].rtms : 3;
                const prevPurse = prevTeamUser ? (roomUsers[prevTeamUser].purse !== undefined ? roomUsers[prevTeamUser].purse : 100.0) : 0;
                const prevSquadSize = allSquads[prevTeamName] ? allSquads[prevTeamName].length : 0;
                const prevOverseasCount = allSquads[prevTeamName] ? allSquads[prevTeamName].filter(p => p.country && p.country !== 'IND').length : 0;
                const isPlayerOverseas = currentPlayer.country && currentPlayer.country !== 'IND';

                const canPrevTeamMatch = rtmCount > 0 && prevPurse >= auctionState.currentBid && prevSquadSize < 25 && !(isPlayerOverseas && prevOverseasCount >= 8);

                if (canPrevTeamMatch) {
                    set(ref(db, `rooms/${userData.roomId}/auctionState`), {
                        ...auctionState,
                        isRtmPhase: true,
                        rtmTeam: prevTeamName,
                        timer: 15 // 15 seconds for RTM decision
                    });
                    return;
                }
            }

            const finalBuyer = auctionState.currentBidTeam || 'UNSOLD';

            // Mark Sold State
            const updatedState = { ...auctionState, isSold: true, soldTo: finalBuyer, timer: 0, isRtmPhase: false };
            set(ref(db, `rooms/${userData.roomId}/auctionState`), updatedState);

            const playerSnapshot = {
                id: currentPlayer.id,
                name: `${currentPlayer.firstName} ${currentPlayer.lastName}`,
                role: currentPlayer.role,
                boughtFor: auctionState.currentBid || parseFloat(currentPlayer.basePrice),
                image: currentPlayer.imageUrl,
                country: currentPlayer.country
            };

            if (finalBuyer !== 'UNSOLD') {
                // Find user doc by team
                const buyerName = Object.keys(roomUsers).find(name => roomUsers[name].team === finalBuyer);
                if (buyerName) {
                    const currentPurse = roomUsers[buyerName]?.purse !== undefined ? roomUsers[buyerName].purse : 100.0;
                    const newPurse = currentPurse - auctionState.currentBid;
                    const rtmCount = roomUsers[buyerName]?.rtms !== undefined ? roomUsers[buyerName].rtms : 3;

                    // Deduct
                    set(ref(db, `rooms/${userData.roomId}/users/${buyerName}/purse`), newPurse);
                    if (auctionState.isRtmUsedThisPlayer && finalBuyer === prevTeamName) {
                        set(ref(db, `rooms/${userData.roomId}/users/${buyerName}/rtms`), Math.max(0, rtmCount - 1));
                    }

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

            // Activity log entry
            const logEntry = {
                id: Date.now(),
                timestamp: Date.now(),
                playerName: `${currentPlayer.firstName} ${currentPlayer.lastName}`,
                status: finalBuyer === 'UNSOLD' ? 'UNSOLD' : 'SOLD',
                team: finalBuyer === 'UNSOLD' ? null : finalBuyer,
                price: finalBuyer === 'UNSOLD' ? null : (auctionState.currentBid || parseFloat(currentPlayer.basePrice)),
            };

            get(ref(db, `rooms/${userData.roomId}/activityLog`)).then(snap => {
                const existingLogs = snap.val() ? (Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val())) : [];
                set(ref(db, `rooms/${userData.roomId}/activityLog`), [logEntry, ...existingLogs].slice(0, 50));
            });

            // After a 3 second delay, load the next player
            setTimeout(() => {
                const nextIndex = auctionState.currentPlayerIndex + 1;
                if (nextIndex >= PLAYERS_DATA.length) {
                    set(ref(db, `rooms/${userData.roomId}/auctionState`), {
                        ...auctionState,
                        isAuctionOver: true,
                        timer: 0
                    });
                } else {
                    const nextPlayer = PLAYERS_DATA[nextIndex];
                    get(ref(db, `rooms/${userData.roomId}/settings/timer`)).then(snap => {
                        const currentTimerVal = snap.val() || 15;
                        set(ref(db, `rooms/${userData.roomId}/auctionState`), {
                            activePlayer: nextPlayer,
                            currentPlayerIndex: nextIndex,
                            currentBid: parseFloat(nextPlayer.basePrice),
                            currentBidTeam: null,
                            timer: currentTimerVal,
                            isSold: false,
                            soldTo: null,
                            isRtmPhase: false,
                            isRtmUsedThisPlayer: false,
                            rtmTeam: null
                        });
                    });
                }
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
    }, [isHost, auctionState.isSold, auctionState.timer, userData.roomId, auctionState, roomUsers, isPaused]);

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
    const myRtms = roomUsers[userData.name]?.rtms !== undefined ? roomUsers[userData.name].rtms : 3;
    const nextBidAmount = auctionState.currentBid ? auctionState.currentBid + 0.5 : parseFloat(activePlayer.basePrice);

    const actualMyTeam = roomUsers[userData.name]?.team || userData.team;

    // Check if the current user represents a team, and if that team is currently leading the bid
    const isMyTeamLeading = Boolean(actualMyTeam && auctionState.currentBidTeam === actualMyTeam);

    const mySquadSize = actualMyTeam && allSquads[actualMyTeam] ? allSquads[actualMyTeam].length : 0;
    const isSquadFull = mySquadSize >= 25;

    const myOverseasCount = actualMyTeam && allSquads[actualMyTeam]
        ? allSquads[actualMyTeam].filter(p => p.country && p.country !== 'IND').length
        : 0;
    const isPlayerOverseas = activePlayer.country && activePlayer.country !== 'IND';
    const isOverseasLimitReached = myOverseasCount >= 8 && isPlayerOverseas;

    // The user can only bid if they are a team, they aren't currently leading, they have enough purse, the game isn't paused, the squad isn't full, and the overseas limit isn't reached, and it isn't RTM phase
    const canBid = Boolean(actualMyTeam && !isMyTeamLeading && nextBidAmount <= myPurse && !isPaused && !isSquadFull && !isOverseasLimitReached && !auctionState.isRtmPhase);

    const handlePlaceBid = () => {
        if (!canBid || isSold) return;

        set(ref(db, `rooms/${userData.roomId}/auctionState`), {
            ...auctionState,
            currentBid: nextBidAmount,
            currentBidTeam: userData.team,
            timer: roomTimerSetting // Reset the auction countdown so teams can respond
        });
    };

    const getTeamPurse = (teamName) => {
        const teamUser = Object.keys(roomUsers).find(name => roomUsers[name].team === teamName);
        return teamUser && roomUsers[teamUser].purse !== undefined ? roomUsers[teamUser].purse : 100.00;
    };

    const getTeamRtms = (teamName) => {
        const teamUser = Object.keys(roomUsers).find(name => roomUsers[name].team === teamName);
        return teamUser && roomUsers[teamUser].rtms !== undefined ? roomUsers[teamUser].rtms : 3;
    };

    const handleRtmAccept = () => {
        set(ref(db, `rooms/${userData.roomId}/auctionState`), {
            ...auctionState,
            currentBidTeam: auctionState.rtmTeam,
            isRtmPhase: false,
            isRtmUsedThisPlayer: true,
            timer: 0 // Ends phase and triggers the sale correctly to the new leading team
        });
    };

    const handleRtmDecline = () => {
        set(ref(db, `rooms/${userData.roomId}/auctionState`), {
            ...auctionState,
            isRtmPhase: false,
            timer: 0 // Triggers normal sale to the original bidder
        });
    };

    // Auto-switch to board tab when player is sold so the sliding animation resolves visibly
    useEffect(() => {
        if (auctionState.isSold && buyingTeam !== 'UNSOLD') {
            setActiveTab('board');
        }
    }, [auctionState.isSold, buyingTeam]);

    if (auctionState.isAuctionOver) {
        return (
            <div className="center-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="auction-card animate-fade-in" style={{ width: '100%', maxWidth: '800px', padding: '2rem', textAlign: 'center', overflowY: 'auto', maxHeight: '80vh' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fff', letterSpacing: '2px' }}>AUCTION COMPLETED</h2>
                    <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem' }}>Final Squad Status</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', textAlign: 'left' }}>
                        {Object.keys(TEAM_COLORS).map(teamName => {
                            const squadLen = allSquads[teamName] ? allSquads[teamName].length : 0;
                            const isComplete = squadLen >= 18;
                            return (
                                <div key={teamName} style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', borderLeft: `6px solid ${TEAM_COLORS[teamName]}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <div style={{ width: '24px', height: '24px' }}>
                                            <img src={IPL_LOGOS[teamName]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                        <div style={{ fontWeight: 900, color: TEAM_COLORS[teamName], fontSize: '1.2rem' }}>{teamName}</div>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '0.25rem' }}>Players: <span style={{ color: '#fff', fontWeight: 'bold' }}>{squadLen}/25</span></div>
                                    <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '0.25rem' }}>Overseas: <span style={{ color: '#fff', fontWeight: 'bold' }}>{allSquads[teamName] ? allSquads[teamName].filter(p => p.country && p.country !== 'IND').length : 0}/8</span></div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isComplete ? '#10b981' : '#ef4444' }}>
                                        {isComplete ? '✓ COMPLETE SQUAD' : '⚠ INCOMPLETE SQUAD'}
                                    </div>
                                    {!isComplete && <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.2rem' }}>(Requires Min 18)</div>}
                                </div>
                            );
                        })}
                    </div>

                    {isHost && (
                        <button className="btn-solid-orange" style={{ marginTop: '2.5rem', padding: '0.75rem 2rem', fontSize: '1.1rem' }} onClick={onEnd}>
                            Close Room
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="center-panel" style={{ position: 'relative' }}>
            {auctionState.isRtmPhase && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#111', border: `3px solid ${TEAM_COLORS[auctionState.rtmTeam] || '#B8860B'}`, borderRadius: '12px', padding: '2rem', textAlign: 'center', maxWidth: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <h2 style={{ color: '#D4AF37', marginBottom: '1rem', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '1px' }}>RIGHT TO MATCH AVAILABLE</h2>
                        <div style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '1.1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                            <p style={{ marginBottom: '0.5rem' }}>Player: <span style={{ fontWeight: 800 }}>{`${activePlayer.firstName} ${activePlayer.lastName}`}</span></p>
                            <p style={{ marginBottom: '0.5rem' }}>Previous Team: <span style={{ fontWeight: 800, color: TEAM_COLORS[auctionState.rtmTeam] || '#fff' }}>{auctionState.rtmTeam}</span></p>
                            <p>Final Bid to match: <span style={{ fontWeight: 800, color: '#10b981' }}>₹{auctionState.currentBid.toFixed(2)} Cr</span></p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}>
                            {actualMyTeam === auctionState.rtmTeam ? (
                                myRtms > 0 && myPurse >= auctionState.currentBid && mySquadSize < 25 && !(isPlayerOverseas && myOverseasCount >= 8) ? (
                                    <button className="btn-solid-green" onClick={handleRtmAccept} style={{ flex: 1, padding: '0.8rem', fontSize: '1.1rem', fontWeight: 800 }}>USE RTM</button>
                                ) : (
                                    <button className="btn-solid-green" disabled style={{ flex: 1, padding: '0.8rem', fontSize: '1.1rem', fontWeight: 800, opacity: 0.5, cursor: 'not-allowed', background: '#991b1b' }}>
                                        {myRtms <= 0 ? 'NO RTM CARDS LEFT' :
                                            myPurse < auctionState.currentBid ? 'NOT ENOUGH PURSE' :
                                                mySquadSize >= 25 ? 'SQUAD FULL (25/25)' :
                                                    'OVERSEAS LIMIT REACHED'
                                        }
                                    </button>
                                )
                            ) : (
                                <button className="btn-solid-green" disabled style={{ flex: 1, padding: '0.8rem', fontSize: '1.1rem', fontWeight: 800, opacity: 0.5, cursor: 'not-allowed', background: '#4b5563' }}>USE RTM</button>
                            )}

                            {actualMyTeam === auctionState.rtmTeam ? (
                                <button className="btn-solid-red" onClick={handleRtmDecline} style={{ flex: 1, padding: '0.8rem', fontSize: '1.1rem', fontWeight: 800 }}>DECLINE</button>
                            ) : (
                                <button className="btn-solid-red" disabled style={{ flex: 1, padding: '0.8rem', fontSize: '1.1rem', fontWeight: 800, opacity: 0.5, cursor: 'not-allowed', background: '#4b5563' }}>DECLINE</button>
                            )}
                        </div>

                        {actualMyTeam !== auctionState.rtmTeam && (
                            <div style={{ marginTop: '1rem', color: '#aaa', fontStyle: 'italic', fontSize: '0.9rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                                Waiting for <strong style={{ color: '#fff' }}>{auctionState.rtmTeam}</strong> to make a decision... <span style={{ color: '#D4AF37', fontWeight: 800 }}>({auctionState.timer}s)</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isSold && buyingTeam !== 'UNSOLD' && (
                <div className="animating-plate-overlay">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'linear-gradient(90deg, #E5C370 0%, #FFF5C3 50%, #E5C370 100%)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #B8860B',
                        width: '280px',
                        color: '#1A1A1A',
                        fontWeight: 900
                    }}>
                        <div style={{ fontSize: '0.65rem', width: '25px', color: '#555' }}>
                            {String(activePlayer.id).padStart(3, '0')}
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${activePlayer.firstName} ${activePlayer.lastName}`}</span>
                            {activePlayer.country && activePlayer.country !== 'IND' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#e11d48', borderRadius: '50%', width: '13px', height: '13px', marginLeft: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} title="Overseas Player">
                                    <svg fill="white" viewBox="0 0 24 24" width="9" height="9"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                                </span>
                            )}
                        </div>
                        <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                            <img src={IPL_LOGOS[buyingTeam]} alt={buyingTeam} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Player Card */}
            <div className={`auction-card mb-4 animate-fade-in ${isSold ? 'shake' : ''}`} style={{ padding: 0, overflow: 'hidden' }}>
                <div className="timer-progress-bar" style={{ width: `${Math.min(100, (auctionState.timer / roomTimerSetting) * 100)}%` }}></div>

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

                    {/* Player name + role below avatar */}
                    <div className="player-name-block">
                        <div className="player-full-name">{activePlayer.firstName} {activePlayer.lastName}</div>
                        <div className="player-role-country">
                            {activePlayer.role}<span className="role-dot">•</span>{activePlayer.country === 'IND' ? 'India' : activePlayer.country === 'WI' ? 'West Indies' : activePlayer.country === 'AUS' ? 'Australia' : activePlayer.country === 'ENG' ? 'England' : activePlayer.country === 'SA' ? 'South Africa' : activePlayer.country === 'NZ' ? 'New Zealand' : activePlayer.country === 'AFG' ? 'Afghanistan' : activePlayer.country === 'SL' ? 'Sri Lanka' : activePlayer.country === 'BAN' ? 'Bangladesh' : activePlayer.country === 'PAK' ? 'Pakistan' : activePlayer.country}
                        </div>
                    </div>

                    <div className="bid-stats-container">
                        <div className="bid-box skewed left" style={{ backgroundColor: isSold && buyingTeam !== 'UNSOLD' ? teamColor : undefined, borderColor: isSold && buyingTeam !== 'UNSOLD' ? teamColor : '#55e6d9', transition: 'all 0.5s ease' }}>
                            <div>
                                <div className="bid-label">BASE PRICE</div>
                                <div className="bid-value">₹ {activePlayer.basePrice}Cr</div>
                            </div>
                        </div>

                        <div className="bid-box main-name" style={{ display: 'none' }}>
                            <div className="player-first-name">{activePlayer.firstName}</div>
                            <div className="player-last-name">{activePlayer.lastName}</div>
                        </div>

                        <div className="bid-box skewed right" style={{ backgroundColor: isSold && buyingTeam !== 'UNSOLD' ? teamColor : undefined, borderColor: isSold && buyingTeam !== 'UNSOLD' ? teamColor : '#D4AF37', transition: 'all 0.5s ease' }}>
                            <div>
                                <div className="bid-label">CURRENT BID</div>
                                <div className="bid-value">₹ {(auctionState.currentBid || 0).toFixed(2)} Cr</div>
                                {auctionState.currentBidTeam && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            background: TEAM_COLORS[auctionState.currentBidTeam] || '#FFB800',
                                            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(0,0,0,0.15) 100%)',
                                            borderRadius: '999px',
                                            padding: '3px 16px 3px 3px',
                                            boxShadow: `0 0 12px ${TEAM_COLORS[auctionState.currentBidTeam] || '#FFB800'}, inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3)`,
                                            border: '1px solid rgba(255,255,255,0.3)'
                                        }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                background: '#fff',
                                                borderRadius: '50%',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                                flexShrink: 0
                                            }}>
                                                <img src={IPL_LOGOS[auctionState.currentBidTeam]} alt={auctionState.currentBidTeam} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            </div>
                                            <div style={{
                                                fontSize: '1.05rem',
                                                color: auctionState.currentBidTeam === 'CSK' ? '#0A2342' : '#FFFFFF',
                                                fontWeight: 900,
                                                letterSpacing: '0.5px',
                                                marginLeft: '8px',
                                                textTransform: 'uppercase',
                                                textShadow: auctionState.currentBidTeam === 'CSK' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                                            }}>
                                                {auctionState.currentBidTeam} LEADING
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="player-details-strip">
                        <span>Age {activePlayer.age}</span> <span className="details-separator">|</span>
                        <span>{activePlayer.country}</span> <span className="details-separator">|</span>
                        <span>Prev Team {activePlayer.previousTeam}</span> <span className="details-separator">|</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{activePlayer.iplStat}</span>
                    </div>

                    <div className="flex items-center w-full px-4 pb-4" style={{ gap: '0.5rem', background: '#121212', paddingTop: '1rem', marginTop: '-1rem', zIndex: 100, position: 'relative' }}>
                        <div className={`timer-box ${auctionState.timer <= 3 ? 'danger' : 'warning'}`}>
                            <span className="timer-num" style={{ color: isPaused ? '#a855f7' : '' }}>
                                {isPaused ? '⏸' : auctionState.timer}
                            </span>
                            <span className="timer-text">{isPaused ? 'PAUSED' : 'SEC'}</span>
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
                                    background: (isSquadFull || isOverseasLimitReached) ? '#991b1b' : isMyTeamLeading ? '#4b5563' : isPaused ? '#374151' : ''
                                }}
                                onClick={handlePlaceBid}
                                disabled={!canBid}
                            >
                                {isSquadFull ? 'SQUAD FULL (25/25)' : isOverseasLimitReached ? 'OVERSEAS LIMIT REACHED' : isPaused ? 'PAUSED' : isMyTeamLeading ? 'LEADING BID' : `BID ₹ ${nextBidAmount.toFixed(2)}Cr`}
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
                        Activity <span className="tab-badge">{activityLog.length}</span>
                    </button>
                    <button className={`room-tab small ${activeTab === 'board' ? 'active-neutral full-bg' : ''}`} onClick={() => setActiveTab('board')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        Squad Board
                    </button>
                    <button className={`room-tab small ${activeTab === 'settings' ? 'active-purple' : ''}`} onClick={() => setActiveTab('settings')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Settings
                    </button>
                </div>

                <div className="tab-content" style={{ minHeight: '300px' }}>
                    {activeTab === 'activity' && (
                        <div className="activity-feed" style={{ padding: '0 0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {activityLog.length === 0 ? (
                                <div className="flex items-center justify-center h-full w-full" style={{ padding: '2rem 0' }}>
                                    <span style={{ color: 'var(--text-tertiary)' }}>No recent activity.</span>
                                </div>
                            ) : (
                                <div className="chat-history" style={{ display: 'flex', flexDirection: 'column', background: 'transparent', gap: '0.25rem', paddingTop: '0.5rem' }}>
                                    {activityLog.map(log => (
                                        <div className="chat-msg" key={log.id} style={{ background: 'transparent', padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                            {log.type === 'JOIN' && (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                    <span style={{ color: '#10b981', fontWeight: 600 }}>{log.userName}</span> joined
                                                </>
                                            )}
                                            {log.type === 'TEAM_SELECT' && (
                                                <>
                                                    <span className={`chat-team-mini ${log.team ? log.team.toLowerCase() : 'mi'}`} style={{ fontWeight: 800 }}>{log.team}</span>
                                                    <span style={{ fontWeight: 600 }}>{log.userName}</span> selected <span style={{ color: '#FCCA06' }}>{TEAM_FULL_NAMES[log.team] || log.team}</span>
                                                </>
                                            )}
                                            {log.status === 'SOLD' && (
                                                <>
                                                    <span className={`chat-team-mini ${log.team ? log.team.toLowerCase() : 'mi'}`} style={{ fontWeight: 800 }}>{log.team}</span>
                                                    <span style={{ fontWeight: 600 }}>{log.team}</span> bought <span style={{ color: '#10b981' }}>{log.playerName}</span> for <span style={{ color: '#FCCA06' }}>₹ {log.price?.toFixed(2)} Cr</span>
                                                </>
                                            )}
                                            {log.status === 'UNSOLD' && (
                                                <>
                                                    <span style={{ fontWeight: 600, color: '#ef4444' }}>UNSOLD</span>
                                                    <span style={{ fontWeight: 600 }}>{log.playerName}</span> went unsold
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'board' && (
                        <div className="squad-board-panel" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', padding: '0 0.5rem', maxHeight: '350px' }}>
                            <DragDropContext onDragEnd={handleDragEnd}>
                                {/* My Squad Column */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ background: '#111', padding: '0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px', borderBottom: '2px solid #333' }}>
                                        <div style={{ marginBottom: '0.2rem' }}>MY SQUAD</div>
                                        {userData.team && (
                                            <div className="squad-header-stats" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                                                <span>
                                                    <span style={{ color: '#aaa', fontWeight: 600 }}>PURSE: </span>
                                                    <span style={{ color: '#10b981', fontWeight: 800 }}><AnimatedPurse amount={myPurse} /></span>
                                                </span>
                                                <span style={{ color: '#555' }}>|</span>
                                                <span style={{ color: mySquadSize >= 25 ? '#ef4444' : '#aaa', fontWeight: 600 }}>({mySquadSize}/25)</span>
                                                <span style={{ color: '#555' }}>|</span>
                                                <span style={{ color: myOverseasCount >= 8 ? '#ef4444' : '#aaa', fontWeight: 600 }}>OS: {myOverseasCount}/8</span>
                                                <span style={{ color: '#555' }}>|</span>
                                                <span style={{ color: '#aaa', fontWeight: 600 }}>RTM: <span style={{ color: myRtms > 0 ? '#D4AF37' : '#ef4444', fontWeight: 800 }}>{myRtms}</span></span>
                                            </div>
                                        )}
                                    </div>
                                    <Droppable droppableId={userData.team || 'unassigned_my_squad'}>
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.droppableProps} style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                                                {(!userData.team || !allSquads[userData.team] || allSquads[userData.team].length === 0) ? (
                                                    <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', marginTop: '1rem' }}>No players yet</div>
                                                ) : (
                                                    allSquads[userData.team].map((player, index) => (
                                                        <Draggable key={player.id} draggableId={`my_${player.id}`} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={isSold && player.id === activePlayer.id ? 'newly-sold-highlight' : ''}
                                                                    style={{
                                                                        ...provided.draggableProps.style,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        background: 'linear-gradient(90deg, #E5C370 0%, #FFF5C3 50%, #E5C370 100%)',
                                                                        borderRadius: '4px',
                                                                        padding: '0.25rem 0.5rem',
                                                                        border: '1px solid #B8860B',
                                                                        boxShadow: snapshot.isDragging ? '0 8px 16px rgba(0,0,0,0.6)' : '0 2px 4px rgba(0,0,0,0.4)',
                                                                        marginBottom: '0.4rem',
                                                                        transform: snapshot.isDragging ? 'scale(1.03)' : provided.draggableProps.style?.transform,
                                                                        color: '#1A1A1A',
                                                                        fontWeight: 900
                                                                    }}
                                                                >
                                                                    <div style={{ fontSize: '0.65rem', width: '25px', color: '#555' }}>
                                                                        {String(player.id).padStart(3, '0')}
                                                                    </div>
                                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</span>
                                                                        {player.country && player.country !== 'IND' && (
                                                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#e11d48', borderRadius: '50%', width: '13px', height: '13px', marginLeft: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} title="Overseas Player">
                                                                                <svg fill="white" viewBox="0 0 24 24" width="9" height="9"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                                                                        <img src={IPL_LOGOS[userData.team]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))
                                                )}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>

                                {/* Other Squads Column */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ background: '#111', padding: '0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px', borderBottom: '2px solid #333' }}>
                                        OTHER SQUADS
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                                        {Object.entries(allSquads).filter(([teamName]) => teamName !== userData.team).length === 0 ? (
                                            <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', marginTop: '1rem' }}>No players yet</div>
                                        ) : (
                                            Object.entries(allSquads).filter(([teamName]) => teamName !== userData.team).map(([teamName, squad]) => (
                                                <div key={teamName} style={{ marginBottom: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', borderBottom: `1px solid ${TEAM_COLORS[teamName] || '#555'}`, paddingBottom: '0.2rem' }}>
                                                        <img src={IPL_LOGOS[teamName]} style={{ width: '14px', height: '14px' }} alt="" />
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: TEAM_COLORS[teamName] || '#fff' }}>{teamName}</span>
                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: squad.length >= 25 ? '#ef4444' : '#888', fontWeight: 600 }}>({squad.length}/25)</span>
                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: squad.filter(p => p.country && p.country !== 'IND').length >= 8 ? '#ef4444' : '#888', fontWeight: 600 }}>OS: {squad.filter(p => p.country && p.country !== 'IND').length}/8</span>
                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: getTeamRtms(teamName) === 0 ? '#ef4444' : '#D4AF37', fontWeight: 600 }}>RTM: {getTeamRtms(teamName)}</span>
                                                        <div style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 800, color: '#10b981' }}>
                                                            <AnimatedPurse amount={getTeamPurse(teamName)} />
                                                        </div>
                                                    </div>
                                                    <Droppable droppableId={teamName}>
                                                        {(provided) => (
                                                            <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: '10px' }}>
                                                                {squad.map((player, index) => (
                                                                    <Draggable key={player.id} draggableId={`other_${teamName}_${player.id}`} index={index}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                className={isSold && player.id === activePlayer.id ? 'newly-sold-highlight' : ''}
                                                                                style={{
                                                                                    ...provided.draggableProps.style,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    background: 'linear-gradient(90deg, #E5C370 0%, #FFF5C3 50%, #E5C370 100%)',
                                                                                    borderRadius: '4px',
                                                                                    padding: '0.25rem 0.5rem',
                                                                                    border: '1px solid #B8860B',
                                                                                    boxShadow: snapshot.isDragging ? '0 8px 16px rgba(0,0,0,0.6)' : '0 2px 4px rgba(0,0,0,0.4)',
                                                                                    marginBottom: '0.4rem',
                                                                                    transform: snapshot.isDragging ? 'scale(1.03)' : provided.draggableProps.style?.transform,
                                                                                    color: '#1A1A1A',
                                                                                    fontWeight: 900
                                                                                }}
                                                                            >
                                                                                <div style={{ fontSize: '0.65rem', width: '25px', color: '#555' }}>
                                                                                    {String(player.id).padStart(3, '0')}
                                                                                </div>
                                                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</span>
                                                                                    {player.country && player.country !== 'IND' && (
                                                                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#e11d48', borderRadius: '50%', width: '13px', height: '13px', marginLeft: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} title="Overseas Player">
                                                                                            <svg fill="white" viewBox="0 0 24 24" width="9" height="9"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                                                                                    <img src={IPL_LOGOS[teamName]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </DragDropContext>
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
                                    <span style={{ color: '#a855f7', fontWeight: 700 }}>{roomTimerSetting}s</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.25rem 0 0.75rem' }}>
                                    Time allowed for each bid round
                                </div>
                                <div className="timer-grid">
                                    {[5, 10, 15, 20, 25].map(t => (
                                        <button
                                            key={t}
                                            className={`timer-btn ${roomTimerSetting === t ? 'active' : ''}`}
                                            onClick={() => set(ref(db, `rooms/${userData.roomId}/settings/timer`), t)}
                                        >
                                            {t}s
                                        </button>
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
