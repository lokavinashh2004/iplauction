import { useState, useEffect } from 'react';

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
    const [timer, setTimer] = useState(10);
    const [isSold, setIsSold] = useState(false);
    const [soldTo, setSoldTo] = useState(null);

    // Pick a random team when bidding to demonstrate different team effects
    const handleBidSold = () => {
        const teams = Object.keys(TEAM_COLORS);
        const randomTeam = teams[Math.floor(Math.random() * teams.length)];
        setSoldTo(randomTeam);
        setIsSold(true);
    };

    // If simulating, prefer the soldTo randomly chosen team to show off animations
    const buyingTeam = soldTo || userData?.team || 'MI';

    // Mock timer countdown for effect
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(prev => (prev > 0 ? prev - 1 : 10));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="center-panel">
            {/* Player Card */}
            <div className="auction-card mb-4 animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="timer-progress-bar" style={{ width: `${(timer / 10) * 100}%` }}></div>

                <div className="bid-presentation">
                    <div className={`team-bg-overlay ${isSold ? 'show' : ''}`} style={{ backgroundColor: TEAM_COLORS[buyingTeam] }}></div>
                    {isSold && (
                        <div className="team-logo-bg show">
                            <img src={IPL_LOGOS[buyingTeam]} alt={buyingTeam} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.5 }} />
                        </div>
                    )}
                    <div className={`stamp-sold ${isSold ? 'animate' : ''}`}>SOLD</div>

                    <div className="player-avatar-wrapper">
                        <div className="avatar-shield">
                            <img src="/rishabh.png" alt="Rishabh Pant" className="player-image" />
                        </div>
                    </div>

                    <div className="bid-stats-container">
                        <div className="bid-box skewed left">
                            <div>
                                <div className="bid-label">BASE PRICE</div>
                                <div className="bid-value">₹ 2.00Cr</div>
                            </div>
                        </div>

                        <div className="bid-box main-name">
                            <div className="player-first-name">RISHABH</div>
                            <div className="player-last-name">PANT</div>
                        </div>

                        <div className="bid-box skewed right">
                            <div>
                                <div className="bid-label">CURRENT BID</div>
                                <div className="bid-value">₹ 19.50Cr</div>
                            </div>
                        </div>
                    </div>

                    <div className="player-details-strip">
                        <span>BATTER</span> <span className="details-separator">|</span>
                        <span>AGE 27</span> <span className="details-separator">|</span>
                        <span>COUNTRY IND</span> <span className="details-separator">|</span>
                        <span>IPL 2024 DC</span> <span className="details-separator">|</span>
                        <span>iplt20.com</span>
                    </div>

                    <div className="flex items-center w-full px-4 pb-4" style={{ gap: '0.5rem', background: '#121212', paddingTop: '1rem', marginTop: '-1rem', zIndex: 100, position: 'relative' }}>
                        <div className={`timer-box ${timer <= 3 ? 'danger' : 'warning'}`}>
                            <span className="timer-num">{timer}</span>
                            <span className="timer-text">SEC</span>
                        </div>
                        <div className="flex-col" style={{ marginLeft: 'auto', marginRight: '1rem', alignItems: 'flex-end', flex: 1 }}>
                            {isSold ? (
                                <div style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 800 }}>SOLD TO {buyingTeam}</div>
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Purse: <span style={{ color: '#10b981', fontWeight: 600 }}>2.75 Cr</span></span>
                            )}
                        </div>
                        {!isSold && (
                            <button className="btn-bid" style={{ padding: '0.5rem 2rem' }} onClick={handleBidSold}>
                                BID ₹ 19.50Cr
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Banner */}
            <div className="banner-item purple mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex-col-start">
                    <span className="flex items-center" style={{ gap: '0.5rem', fontWeight: 700 }}>
                        <span style={{ color: '#a855f7' }}>🚀</span> Play IPL Simulation Game! <span className="banner-tag bg-green">LIVE</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        24/7 cricket simulation • Play now at cricketdirector.com
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
