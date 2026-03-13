import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, get, remove, set, update, push, onDisconnect, serverTimestamp } from 'firebase/database';
import './App.css';
import Home from './Home';
import Room from './Room';
import Auction from './Auction';
import { useVersionCheck } from './useVersionCheck';

function ScriptTag({ src, async = true }) {
  useEffect(() => {
    if (!src) return;
    if (document.querySelector(`script[data-ad-src="${src}"]`)) return;

    const s = document.createElement('script');
    s.src = src;
    s.async = async;
    s.setAttribute('data-ad-src', src);
    document.body.appendChild(s);

    return () => {
      // Keep scripts loaded to avoid re-requesting on page switches.
    };
  }, [src, async]);

  return null;
}

function NativeBanner({ refreshTrigger }) {
  const containerRef = useRef(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCount(c => c + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Provider: effectivegatecpm native container
  useEffect(() => {
    let cancelled = false;
    const src = 'https://pl28898574.effectivegatecpm.com/1d774fb35f73e6f7eb66b8b54ca74a28/invoke.js';
    
    // Clear previous ad markup
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const s = document.createElement('script');
    s.async = true;
    s.dataset.cfasync = 'false';
    const bustSrc = `${src}?t=${Date.now()}`;
    s.src = bustSrc;
    s.setAttribute('data-ad-src', bustSrc);
    s.setAttribute('data-ad-native', 'effectivegatecpm');
    
    if (containerRef.current && !cancelled) {
        containerRef.current.appendChild(s);
    }

    return () => {
      cancelled = true;
      try { s.remove(); } catch { /* noop */ }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [refreshTrigger, refreshCount]);

  return <div id="container-1d774fb35f73e6f7eb66b8b54ca74a28" ref={containerRef} style={{ width: '100%', minHeight: '50px' }} />;
}

function AtIframeBanner({ adKey, width, height, refreshTrigger }) {
  const containerRef = useRef(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCount(c => c + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!adKey || !width || !height) return;
    if (!containerRef.current) return;

    let cancelled = false;

    const enqueue = (task) => {
      window.__atAdQueue = (window.__atAdQueue || Promise.resolve()).then(task, task);
      return window.__atAdQueue;
    };

    enqueue(
      () =>
        new Promise((resolve) => {
          if (cancelled) return resolve();

          const container = containerRef.current;
          if (!container) return resolve();

          // Clear previous ad markup if any (useful on remounts).
          container.innerHTML = '';

          // This network expects a global `atOptions` right before its invoke.js executes.
          window.atOptions = {
            key: adKey,
            format: 'iframe',
            height,
            width,
            params: {}
          };

          const src = `https://www.highperformanceformat.com/${adKey}/invoke.js`;
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          s.setAttribute('data-ad-src', src);

          const done = () => resolve();
          const timeoutId = setTimeout(done, 3000);
          s.onload = () => {
            clearTimeout(timeoutId);
            done();
          };
          s.onerror = () => {
            clearTimeout(timeoutId);
            done();
          };

          container.appendChild(s);
        })
    );

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [adKey, width, height, refreshTrigger, refreshCount]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        margin: '0.5rem auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    />
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const deviceIdRef = useRef(null);
  const { updateAvailable, refresh } = useVersionCheck(2 * 60 * 1000); // poll every 2 min
  const [adRefreshTrigger, setAdRefreshTrigger] = useState(0);
  const prevEventKeyRef = useRef('');

  if (!deviceIdRef.current) {
    let did = localStorage.getItem('auctionDeviceId');
    if (!did) {
      did = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('auctionDeviceId', did);
    }
    deviceIdRef.current = did;
  }

  const [userData, setUserData] = useState(() => {
    const savedData = localStorage.getItem('auctionUserData');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('Failed to parse saved user data', e);
      }
    }

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

  // Persist until explicit Leave Room (supports resume after close)
  useEffect(() => {
    if (userData.hasJoined && userData.name && userData.roomId) {
      localStorage.setItem('auctionUserData', JSON.stringify(userData));
      // Auto-update URL hash so the user can easily copy/paste the link
      window.location.hash = `#room=${userData.roomId}`;
    }
  }, [userData]);

  const [hostName, setHostName] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  // Presence: multiple tabs supported via connections
  useEffect(() => {
    if (!userData.roomId || !userData.hasJoined || !userData.name) return;

    const name = userData.name;
    const roomId = userData.roomId;
    const connectionsListRef = ref(db, `rooms/${roomId}/presence/${name}/connections`);
    const lastSeenRef = ref(db, `rooms/${roomId}/presence/${name}/lastSeen`);
    const leftAtRef = ref(db, `rooms/${roomId}/users/${name}/leftAt`);

    const connRef = push(connectionsListRef);
    set(connRef, { deviceId: deviceIdRef.current, at: serverTimestamp() });
    onDisconnect(connRef).remove();
    onDisconnect(lastSeenRef).set(serverTimestamp());

    // Mark as not-left on active session
    set(leftAtRef, null);
    set(lastSeenRef, serverTimestamp());

    const ping = setInterval(() => {
      set(lastSeenRef, serverTimestamp());
    }, 20000);

    return () => {
      clearInterval(ping);
      try { remove(connRef); } catch { /* noop */ }
    };
  }, [userData.roomId, userData.hasJoined, userData.name]);

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

      // Track game events to trigger ad refresh
      if (data.auctionState) {
        const { isSold, currentPlayerIndex, isSetTransition } = data.auctionState;
        const currentEventKey = `${currentPlayerIndex}_${isSold}_${isSetTransition}`;
        if (prevEventKeyRef.current !== currentEventKey) {
            prevEventKeyRef.current = currentEventKey;
            setAdRefreshTrigger(c => c + 1);
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
    localStorage.removeItem('auctionUserData');

    // Backend Cleanup
    const roomRef = ref(db, `rooms/${rId}`);
    try {
      const snap = await get(roomRef);
      if (snap.exists()) {
        const data = snap.val();
        const users = data.users || {};
        // Store in leftUsers for display, then remove from active users
        const leftUserData = users[uName] || { team: null };
        await set(ref(db, `rooms/${rId}/leftUsers/${uName}`), { ...leftUserData, leftAt: Date.now() });
        delete users[uName];

        const remaining = Object.keys(users);
        if (remaining.length === 0) {
          // Last player: delete entire room
          await remove(roomRef);
        } else {
          // Just remove self
          await remove(ref(db, `rooms/${rId}/users/${uName}`));
          await remove(ref(db, `rooms/${rId}/presence/${uName}`));
          // Provide a manual fallback for host change if the client leaves explicitly
          if (data.host === uName) {
            await set(ref(db, `rooms/${rId}/host`), remaining.sort()[0]);
          }
        }
      }
    } catch (e) { console.error('Error leaving room', e); }
  };

  const handleEndRoom = async () => {
    if (!userData.roomId) return;
    if (window.confirm("Are you sure you want to completely delete this room and all its data? This will kick all players and cannot be undone.")) {
      try {
        await remove(ref(db, `rooms/${userData.roomId}`));
        setUserData(prev => ({ ...prev, roomId: '', team: null, hasJoined: false }));
        setCurrentPage('home');
        window.location.hash = '';
      } catch (e) {
        console.error('Error deleting room', e);
      }
    }
  };

  const isHost = !!(userData.name && hostName === userData.name);

  return (
    <div className={`app-container ${userData.mode === 'football' ? 'theme-football' : ''}`}>
      {/* Social bar (global) */}
      <ScriptTag src="https://pl28898581.effectivegatecpm.com/27/b2/44/27b244a27efdef8cdcfed8a6489a22a5.js" />

      {/* Top banner 468x60 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
        <AtIframeBanner adKey="bbee66b578bab2bab6b8c7b4a0ff710f" width={468} height={60} refreshTrigger={adRefreshTrigger} />
      </div>

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
              <button className="btn-outline-red" onClick={leaveRoom}>
                Leave
              </button>
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
        <>
          <Home
            userData={userData}
            setUserData={setUserData}
            onJoin={() => setCurrentPage('room')}
          />

          {/* Native banner (home) */}
          <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'center' }}>
            <NativeBanner refreshTrigger={adRefreshTrigger} />
          </div>
        </>
      ) : (
        <main className="main-content">
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            {currentPage === 'room' ? (
              <Room userData={userData} setUserData={setUserData} isHost={isHost} />
            ) : (
              <Auction userData={userData} onEnd={handleEndRoom} />
            )}

            {/* Native banner (below content; avoids rendering as a flex-side column) */}
            <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'center' }}>
              <NativeBanner refreshTrigger={adRefreshTrigger} />
            </div>
          </div>
        </main>
      )}

      {/* Bottom sticky 320x50 (mobile) */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          padding: '6px 0',
          pointerEvents: 'none'
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <AtIframeBanner adKey="537b7057e12f7e23c1b3b271192e137f" width={320} height={50} refreshTrigger={adRefreshTrigger} />
        </div>
      </div>

      {/* ── Version update banner ── */}
      {updateAvailable && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            background: 'linear-gradient(135deg, #0f1923 0%, #1a2535 100%)',
            border: '1px solid rgba(245,158,11,0.6)',
            borderRadius: '14px',
            padding: '0.85rem 1.1rem',
            boxShadow: '0 0 0 1px rgba(245,158,11,0.15), 0 12px 40px rgba(0,0,0,0.65)',
            maxWidth: 'calc(100vw - 2rem)',
            width: 'max-content',
            animation: 'slideUpFadeIn 0.3s ease both'
          }}
        >
          {/* Lightning icon */}
          <span style={{ fontSize: '1.3rem', flexShrink: 0, lineHeight: 1 }}>⚡</span>

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              New update available
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 500 }}>
              Refresh to get the latest version
            </span>
          </div>

          {/* CTA button */}
          <button
            id="version-refresh-btn"
            onClick={refresh}
            style={{
              flexShrink: 0,
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#fff',
              border: 'none',
              borderRadius: '9px',
              padding: '0.45rem 1rem',
              fontWeight: 900,
              fontSize: '0.8rem',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(234,88,12,0.35)'
            }}
          >
            Refresh Game
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
