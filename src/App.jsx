import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, get, remove, set } from 'firebase/database';
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
      roomId: initialRoom
    };
  });

  const [hostName, setHostName] = useState('');

  useEffect(() => {
    if (!userData.roomId) return;
    const roomRef = ref(db, `rooms/${userData.roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Room implies it got deleted, force return to home
        if (currentPage !== 'home') {
          setCurrentPage('home');
          setUserData(prev => ({ ...prev, roomId: '', team: null }));
          window.location.hash = '';
        }
        return;
      }

      const data = snapshot.val();
      setHostName(data.host || '');

      if (data.status === 'auction') {
        setCurrentPage(prev => prev !== 'auction' ? 'auction' : prev);
      }

      const users = data.users || {};

      // Dynamic Host Reassignment
      // If the registered host no longer exists in the users map, the next alphabetical user claims host
      if (data.host && !users[data.host] && users[userData.name]) {
        const remaining = Object.keys(users).sort();
        if (remaining[0] === userData.name) {
          set(ref(db, `rooms/${userData.roomId}/host`), userData.name);
        }
      }
    });
    return () => unsubscribe();
  }, [userData.roomId, userData.name, currentPage]);

  const leaveRoom = async () => {
    if (!userData.roomId || !userData.name) {
      setCurrentPage('home');
      return;
    }
    const rId = userData.roomId;
    const uName = userData.name;
    const hostCheck = hostName;

    // UI Cleanup
    setUserData(prev => ({ ...prev, roomId: '', team: null }));
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
          <div className="flex items-center" style={{ gap: '1rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
            {isHost && (
              <button className="btn-solid-orange start-btn" onClick={() => set(ref(db, `rooms/${userData.roomId}/status`), 'auction')}>
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
            <div className="flex items-center" style={{ gap: '0.75rem' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Room: <span className="room-code" style={{ marginLeft: 0 }}>{userData.roomId}</span></span>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div className="online-dot" style={{ width: '6px', height: '6px' }}></div>
              </div>
              <button className="icon-btn green" style={{ padding: '0.25rem 0.5rem', height: 'auto' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></button>
              <button className="icon-btn outline" style={{ padding: '0.25rem 0.5rem', height: 'auto' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            </div>

            <div className="flex items-center" style={{ gap: '0.75rem' }}>
              {isHost && (
                <>
                  <button className="btn-outline-yellow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause</button>
                  <button className="btn-outline-red" onClick={leaveRoom}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="12" cy="12" r="3"></circle></svg> End</button>
                </>
              )}
              <button className="icon-btn outline" style={{ padding: '0.5rem', borderRadius: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg></button>
              <button className="btn-outline-purple"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 3.86-12 2 2 0 0 1 2.9 0 22 22 0 0 1-12 3.86z"></path><path d="m15 12 3-3a22 22 0 0 0 12-3.86 2 2 0 0 0 0-2.9 22 22 0 0 0-3.86 12z"></path></svg> Play Sim</button>
              <button className="btn-outline-pink"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> Support</button>
            </div>
          </div>
        </header>
      )}

      <main className="main-content">
        {currentPage === 'home' ? (
          <Home
            userData={userData}
            setUserData={setUserData}
            onJoin={() => setCurrentPage('room')}
          />
        ) : currentPage === 'room' ? (
          <Room userData={userData} />
        ) : (
          <Auction userData={userData} onEnd={() => setCurrentPage('home')} />
        )}
      </main>

      {currentPage === 'home' && (
        <footer className="footer-container">
          <div className="footer-social-row">
            <span>Made with ❤️ by Dhiva</span>
            <span>•</span>
            <div className="social-icons">
              <a href="#" className="social-icon" title="X (Twitter)"><svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="18px" width="18px" xmlns="http://www.w3.org/2000/svg"><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path></svg></a>
              <a href="#" className="social-icon"><svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="18px" width="18px" xmlns="http://www.w3.org/2000/svg"><path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"></path></svg></a>
              <a href="#" className="social-icon"><svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="18px" width="18px" xmlns="http://www.w3.org/2000/svg"><path d="M440.3 203.5c-15 0-28.2 6.2-37.9 15.9-35.7-24.7-83.8-40.6-137.1-42.3L293 52.3l88.2 19.8c0 21.6 17.6 39.2 39.2 39.2 22 0 39.7-18.1 39.7-39.7s-17.6-39.7-39.7-39.7c-15.4 0-28.7 9.3-35.3 22l-97.4-21.6c-4.9-1.3-9.7 2.2-11 7.1L246.3 177c-52.9 2.2-100.5 18.1-136.3 42.8-9.7-10.1-23.4-16.3-38.4-16.3-55.6 0-73.8 74.6-22.9 100.1-1.8 7.9-2.6 16.3-2.6 24.7 0 83.8 94.4 151.7 210.3 151.7 116.4 0 210.8-67.9 210.8-151.7 0-8.4-.9-17.2-3.1-25.1 49.9-25.6 31.5-99.7-23.8-99.7z"></path></svg></a>
              <a href="#" className="social-icon"><svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" height="18px" width="18px" xmlns="http://www.w3.org/2000/svg"><path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"></path></svg></a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
