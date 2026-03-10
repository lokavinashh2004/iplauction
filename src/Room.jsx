import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue } from 'firebase/database';

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

export default function Room({ userData }) {
    const [activeTab, setActiveTab] = useState('settings');
    const [timer, setTimer] = useState('10s');
    const [users, setUsers] = useState({});

    useEffect(() => {
        if (!userData.roomId) return;
        const usersRef = ref(db, `rooms/${userData.roomId}/users`);
        const unsubscribe = onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                setUsers(snapshot.val());
            } else {
                setUsers({});
            }
        });
        return () => unsubscribe();
    }, [userData.roomId]);

    const TEAMS = ['MI', 'CSK', 'RCB', 'KKR', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'LSG'];

    const inviteUrl = `${window.location.origin}/#room=${userData.roomId}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteUrl).then(() => {
            alert("Link copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy link: ", err);
        });
    };

    const handleShareLink = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Join my IPL Auction Room',
                text: 'Click the link to join my IPL Auction room!',
                url: inviteUrl
            }).catch(err => {
                console.error("Failed to share link: ", err);
            });
        } else {
            handleCopyLink();
        }
    };

    return (
        <div className="center-panel">
            {/* Invite Links */}
            <div className="room-card mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="card-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    <span className="card-title">Invite Friends</span>
                </div>
                <div className="invite-row">
                    <input type="text" className="invite-input" value={inviteUrl} readOnly />
                    <button className="icon-btn outline" onClick={handleCopyLink} title="Copy Link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button className="icon-btn green" onClick={() => window.open(`https://wa.me/?text=Join my IPL Auction room: ${encodeURIComponent(inviteUrl)}`, '_blank')} title="Share via WhatsApp">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </button>
                    <button className="btn-solid-orange" onClick={handleShareLink}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        Share
                    </button>
                </div>
            </div>

            {/* Team Selection */}
            <div className="room-card mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="card-header justify-between">
                    <div className="flex items-center" style={{ gap: '0.5rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span className="card-title">Select Your Team</span>
                    </div>
                    <div className="team-badge-small" style={{ backgroundColor: 'white', padding: '0.1rem', borderRadius: '4px' }}>
                        <span className={`team-btn-mini ${userData.team ? userData.team.toLowerCase() : 'mi'}`} style={{ backgroundColor: 'white', overflow: 'hidden' }}>
                            <img src={IPL_LOGOS[userData.team || 'MI']} alt={userData.team || 'MI'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </span>
                        <span style={{ color: '#111827', padding: '0 0.5rem' }}>{userData.team || 'MI'}</span>
                    </div>
                </div>
                <div className="team-rect-grid">
                    {TEAMS.map(t => {
                        const userEntry = Object.entries(users).find(([n, u]) => u.team === t);
                        const isSelected = !!userEntry;
                        const userName = isSelected ? userEntry[0] : '';

                        return (
                            <div key={t} className={`team-rect ${isSelected ? 'selected' : ''}`}>
                                <div className={`team-circle ${t.toLowerCase()}`} title={t} style={{ backgroundColor: 'white', overflow: 'hidden', padding: '0.15rem' }}>
                                    <img src={IPL_LOGOS[t]} alt={t} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </div>
                                {isSelected && <div className="team-rect-name">{userName}</div>}
                            </div>
                        );
                    })}
                </div>
            </div>


            {/* Banner */}
            <div className="banner-item purple mb-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex-col">
                    <span className="flex items-center" style={{ gap: '0.5rem', fontWeight: 700 }}>
                        <span style={{ color: '#a855f7' }}>🚀</span> Play IPL Simulation Game! <span className="banner-tag bg-green">LIVE</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        24/7 cricket simulation • Play now at cricketdirector.com
                    </span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 3.86-12 2 2 0 0 1 2.9 0 22 22 0 0 1-12 3.86z"></path><path d="m15 12 3-3a22 22 0 0 0 12-3.86 2 2 0 0 0 0-2.9 22 22 0 0 0-3.86 12z"></path></svg>
            </div>

            {/* Tabs View */}
            <div className="room-card tabbed-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="room-tabs">
                    <button className={`room-tab ${activeTab === 'players' ? 'active-neutral' : ''}`} onClick={() => setActiveTab('players')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Players <span className="tab-badge">{Object.keys(users).length}/10</span>
                    </button>
                    <button className={`room-tab ${activeTab === 'chat' ? 'active-orange' : ''}`} onClick={() => setActiveTab('chat')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Chat
                    </button>
                    <button className={`room-tab ${activeTab === 'settings' ? 'active-purple' : ''}`} onClick={() => setActiveTab('settings')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Settings
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'settings' && (
                        <div className="settings-panel">
                            <div className="settings-row flex-col-start">
                                <div className="flex items-center" style={{ gap: '0.5rem', color: '#fff', fontWeight: 600 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    Bid Timer
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.25rem 0 0.75rem' }}>
                                    Time allowed for each player auction
                                </div>
                                <div className="timer-grid">
                                    {['5s', '10s', '15s', '20s', '25s'].map(t => (
                                        <button
                                            key={t}
                                            className={`timer-btn ${timer === t ? 'active' : ''}`}
                                            onClick={() => setTimer(t)}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-row justify-between">
                                <span>Auction Mode</span>
                                <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.875rem' }}>Mini 2026</span>
                            </div>

                            <div className="settings-row justify-between border-none">
                                <span>Starting Purse</span>
                                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.875rem' }}>₹0 Cr</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div className="chat-panel">
                            <div className="chat-history">
                                <div className="chat-msg">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>{userData.name || 'Bot'}</span> joined
                                </div>
                                <div className="chat-msg">
                                    <span className={`chat-team-mini ${userData.team ? userData.team.toLowerCase() : 'mi'}`}>{userData.team || 'MI'}</span>
                                    <span style={{ fontWeight: 600 }}>{userData.name || 'Bot'}</span> selected <span style={{ color: '#3b82f6' }}>Mumbai</span>
                                </div>
                            </div>
                            <input type="text" className="chat-input" placeholder="Say something..." />
                        </div>
                    )}

                    {activeTab === 'players' && (
                        <div className="players-panel">
                            {Object.entries(users).map(([name, data]) => (
                                <div className="player-row" key={name}>
                                    <div className="flex items-center" style={{ gap: '0.75rem' }}>
                                        <span className={`team-rect-small ${data.team ? data.team.toLowerCase() : 'mi'}`}>{data.team || 'MI'}</span>
                                        <span style={{ fontWeight: 600 }}>{name}</span>
                                        {name === userData.name && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>(You)</span>}
                                    </div>
                                    <div className="online-dot" title="Online"></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
