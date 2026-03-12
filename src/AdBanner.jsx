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

/**
 * Native / in-content banner ad — full width, subtle design.
 */
export function NativeAdBanner() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src =
      'https://pl28898574.effectivegatecpm.com/1d774fb35f73e6f7eb66b8b54ca74a28/invoke.js';

    const container = document.getElementById(
      'container-1d774fb35f73e6f7eb66b8b54ca74a28'
    );
    if (container) container.appendChild(script);
  }, []);

  return (
    <div
      id="container-1d774fb35f73e6f7eb66b8b54ca74a28"
      style={{ width: '100%', maxWidth: '728px', margin: '0 auto' }}
    />
  );
}

/**
 * Ad2 Sidebar/Mobile placement.
 */
export function Ad2Sidebar({ idSuffix }) {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const script = document.createElement('script');
    script.src = 'https://pl28898581.effectivegatecpm.com/27/b2/44/27b244a27efdef8cdcfed8a6489a22a5.js';

    const container = document.getElementById(`ad2-container-${idSuffix}`);
    if (container) {
      container.appendChild(script);
    }
  }, [idSuffix]);

  return <div id={`ad2-container-${idSuffix}`} style={{ width: '100%', height: '100%' }} />;
}
