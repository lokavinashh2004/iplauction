import { useEffect, useRef, useState } from 'react';

/**
 * Standard 468x60 banner ad — desktop only.
 */
export function DesktopBannerAd468({ refreshTrigger }) {
  const containerRef = useRef(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshCount(c => c + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wipe previous ad clean before injecting fresh scripts
    container.innerHTML = '';

    const cfg = document.createElement('script');
    cfg.text = `
      window.atOptions = {
        'key' : 'bbee66b578bab2bab6b8c7b4a0ff710f',
        'format' : 'iframe',
        'height' : 60,
        'width' : 468,
        'params' : {}
      };
    `;

    const invoke = document.createElement('script');
    invoke.src = 'https://www.highperformanceformat.com/bbee66b578bab2bab6b8c7b4a0ff710f/invoke.js?t=' + Date.now();
    invoke.async = true;

    container.appendChild(cfg);
    container.appendChild(invoke);

    return () => {
      container.innerHTML = '';
    };
  }, [refreshTrigger, refreshCount]);

  return (
    <div
      ref={containerRef}
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
export function MobileBannerAd320({ refreshTrigger }) {
  const containerRef = useRef(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefreshCount(c => c + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const cfg = document.createElement('script');
    cfg.text = `
      window.atOptions = {
        'key' : '537b7057e12f7e23c1b3b271192e137f',
        'format' : 'iframe',
        'height' : 50,
        'width' : 320,
        'params' : {}
      };
    `;

    const invoke = document.createElement('script');
    invoke.src = 'https://www.highperformanceformat.com/537b7057e12f7e23c1b3b271192e137f/invoke.js?t=' + Date.now();
    invoke.async = true;

    container.appendChild(cfg);
    container.appendChild(invoke);

    return () => {
      container.innerHTML = '';
    };
  }, [refreshTrigger, refreshCount]);

  return (
    <div
      ref={containerRef}
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
export function ResponsiveAdBanner({ refreshTrigger }) {
  return (
    <div className="responsive-ad-container animate-fade-in">
      <div className="desktop-ad">
        <DesktopBannerAd468 refreshTrigger={refreshTrigger} />
      </div>
      <div className="mobile-ad">
        <MobileBannerAd320 refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}

/**
 * Native / in-content banner ad — full width, subtle design.
 */
export function NativeAdBanner({ refreshTrigger }) {
  const containerRef = useRef(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefreshCount(c => c + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl28898574.effectivegatecpm.com/1d774fb35f73e6f7eb66b8b54ca74a28/invoke.js?t=' + Date.now();

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [refreshTrigger, refreshCount]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', maxWidth: '728px', margin: '0 auto', minHeight: '50px' }}
    />
  );
}

/**
 * Ad2 Sidebar/Mobile placement.
 */
export function Ad2Sidebar({ idSuffix, refreshTrigger }) {
  const containerRef = useRef(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefreshCount(c => c + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://pl28898581.effectivegatecpm.com/27/b2/44/27b244a27efdef8cdcfed8a6489a22a5.js?t=' + Date.now();
    script.async = true;

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [idSuffix, refreshTrigger, refreshCount]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
