import { useEffect, useRef } from 'react';

/**
 * Standard 468×60 banner ad — desktop only (hidden on mobile via CSS).
 */
export function BannerAd468() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    // Inject atOptions config
    const cfg = document.createElement('script');
    cfg.text = `
      atOptions = {
        'key'    : 'bbee66b578bab2bab6b8c7b4a0ff710f',
        'format' : 'iframe',
        'height' : 60,
        'width'  : 468,
        'params' : {}
      };
    `;
    const invoke = document.createElement('script');
    invoke.src = 'https://www.highperformanceformat.com/bbee66b578bab2bab6b8c7b4a0ff710f/invoke.js';

    const container = document.getElementById('ad-banner-468');
    if (container) {
      container.appendChild(cfg);
      container.appendChild(invoke);
    }
  }, []);

  return (
    <div
      id="ad-banner-468"
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
 * Native / in-content banner ad — renders naturally in the page flow.
 */
export function NativeBannerAd() {
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
