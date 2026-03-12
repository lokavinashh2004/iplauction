import { useEffect, useRef } from 'react';

/**
 * Standard 468×60 banner ad — desktop only.
 */
export function DesktopBannerAd468() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    // Inject atOptions config
    const cfg = document.createElement('script');
    cfg.text = `
      atOptions = {
        'key' : 'bbee66b578bab2bab6b8c7b4a0ff710f',
        'format' : 'iframe',
        'height' : 60,
        'width' : 468,
        'params' : {}
      };
    `;
    const invoke = document.createElement('script');
    invoke.src = 'https://www.highperformanceformat.com/bbee66b578bab2bab6b8c7b4a0ff710f/invoke.js';

    const container = document.getElementById('ad-banner-desktop');
    if (container) {
      container.appendChild(cfg);
      container.appendChild(invoke);
    }
  }, []);

  return (
    <div
      id="ad-banner-desktop"
      style={{
        width: '468px',
        height: '60px',
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: '6px',
        opacity: 0.92,
      }}
    />
  );
}

/**
 * Mobile 320x50 banner ad — mobile only.
 */
export function MobileBannerAd320() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    // Inject atOptions config
    const cfg = document.createElement('script');
    cfg.text = `
      atOptions = {
        'key' : '537b7057e12f7e23c1b3b271192e137f',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;
    const invoke = document.createElement('script');
    invoke.src = 'https://www.highperformanceformat.com/537b7057e12f7e23c1b3b271192e137f/invoke.js';

    const container = document.getElementById('ad-banner-mobile');
    if (container) {
      container.appendChild(cfg);
      container.appendChild(invoke);
    }
  }, []);

  return (
    <div
      id="ad-banner-mobile"
      style={{
        width: '320px',
        height: '50px',
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: '6px',
        opacity: 0.92,
      }}
    />
  );
}

/**
 * Combined Responsive Ad Component
 */
export function ResponsiveAdBanner() {
    return (
        <div className="responsive-ad-container animate-fade-in">
            <div className="desktop-ad">
                <DesktopBannerAd468 />
            </div>
            <div className="mobile-ad">
                <MobileBannerAd320 />
            </div>
        </div>
    );
}
