import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, get, remove, set, update } from 'firebase/database';
import './App.css';
import Home from './Home';
import Room from './Room';
import Auction from './Auction';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [userData, setUserData] = useState(() => {
    let initialRoom = '';
    if (window.location.hash.startsWith('#room=')) {
      initialRoom = window.location.hash.split('=')[1];
    }
    return {
      name: '',
      team: null,
      mode: 'cricket',
      privacy: 'private',
      club: '',
      roomId: initialRoom,
      hasJoined: false
    };
  });

  const [hostName, setHostName] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!userData.roomId || !userData.hasJoined) return;
    const roomRef = ref(db, `rooms/${userData.roomId}`);

    // Maintain a clean active listener, removed `currentPage` dependency to stop websocket reconnects
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setCurrentPage(prev => {
          if (prev !== 'home') {
            setTimeout(() => {
              setUserData(u => ({ ...u, roomId: '', team: null, hasJoined: false }));
              window.location.hash = '';
            }, 0);
            return 'home';
          }
          return prev;
        });
        return;
      }

      const data = snapshot.val();
      setHostName(data.host || '');

      if (data.status === 'auction' && userData.name) {
        setCurrentPage(prev => prev !== 'auction' ? 'auction' : prev);
      } else if (data.status === 'waiting' && userData.name) {
        setCurrentPage(prev => prev !== 'room' ? 'room' : prev);
      }

      if (data.settings && data.settings.isPaused !== undefined) {
        setIsPaused(data.settings.isPaused);
      } else {
        setIsPaused(false);
      }

      const users = data.users || {};

      if (data.host && !users[data.host] && users[userData.name]) {
        const remaining = Object.keys(users).sort();
        if (remaining[0] === userData.name) {
          set(ref(db, `rooms/${userData.roomId}/host`), userData.name);
        }
      }
    });

    return () => unsubscribe();
  }, [userData.roomId, userData.name, userData.hasJoined]);

  const leaveRoom = async () => {
    if (!userData.roomId || !userData.name) {
      setCurrentPage('home');
      return;
    }
    const rId = userData.roomId;
    const uName = userData.name;
    const hostCheck = hostName;

    // UI Cleanup
    setUserData(prev => ({ ...prev, roomId: '', team: null, hasJoined: false }));
    setCurrentPage('home');
    window.location.hash = '';

    // Backend Cleanup
    const roomRef = ref(db, `rooms/${rId}`);
    try {
      const snap = await get(roomRef);
      if (snap.exists()) {
        const data = snap.val();
        const users = data.users || {};
        delete users[uName];

        const remaining = Object.keys(users);
        if (remaining.length === 0) {
          // Last player: delete entire room
          await remove(roomRef);
        } else {
          // Just remove self
          await remove(ref(db, `rooms/${rId}/users/${uName}`));
          // Provide a manual fallback for host change if the client leaves explicitly
          if (data.host === uName) {
            await set(ref(db, `rooms/${rId}/host`), remaining.sort()[0]);
          }
        }
      }
    } catch (e) { console.error('Error leaving room', e); }
  };

  useEffect(() => {
    const handleUnload = () => {
      if (userData.roomId && userData.name) {
        // Browsers won't reliably await this, so it perfectly compliments our onDisconnect() fallback
        leaveRoom();
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [userData, hostName]);

  const isHost = !!(userData.name && hostName === userData.name);

  return (
    <div className={`app-container ${userData.mode === 'football' ? 'theme-football' : ''}`}>
      {currentPage === 'room' && (
        <header className="room-header">
          <button className="back-btn" onClick={leaveRoom}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <div className="room-title">
            Room: <span className="room-code">{userData.roomId}</span>
          </div>
          <div className="flex items-center" style={{ gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
            {isHost && (
              <button
                className="btn-solid-orange start-btn"
                onClick={() => update(ref(db, `rooms/${userData.roomId}`), { status: 'auction' })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Start
              </button>
            )}
          </div>
        </header>
      )}

      {currentPage === 'auction' && (
        <header className="auction-topbar">
          <div className="topbar-content">
            <div className="flex items-center" style={{ gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Room: <span className="room-code" style={{ marginLeft: 0 }}>{userData.roomId}</span></span>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div className="online-dot" style={{ width: '6px', height: '6px' }}></div>
                <span style={{ color: '#10b981', fontSize: '0.7rem' }}>LIVE</span>
              </div>
            </div>

            <div className="flex items-center" style={{ gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {isHost && (
                <>
                  <button
                    className="btn-outline-yellow"
                    onClick={() => update(ref(db, `rooms/${userData.roomId}/settings`), { isPaused: !isPaused })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {isPaused ? (
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      ) : (
                        <><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></>
                      )}
                    </svg>
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    className="btn-outline-red"
                    onClick={async () => {
                      // Set isAuctionOver so all users see the final squads screen
                      await update(ref(db, `rooms/${userData.roomId}/auctionState`), { isAuctionOver: true, timer: 0 });
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="12" cy="12" r="3"></circle></svg> End
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {currentPage === 'home' ? (
        <Home
          userData={userData}
          setUserData={setUserData}
          onJoin={() => setCurrentPage('room')}
        />
      ) : (
        <main className="main-content">
          {currentPage === 'room' ? (
            <Room userData={userData} setUserData={setUserData} isHost={isHost} />
          ) : (
            <Auction userData={userData} onEnd={() => setCurrentPage('home')} />
          )}
        </main>
      )}
    </div>
  );
}

export default App;
