import { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onFinish }) => {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const visibleTimer = setTimeout(() => setPhase('exit'), 2200);
    const finishTimer = setTimeout(() => onFinish?.(), 2800);

    return () => {
      clearTimeout(visibleTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`zunto-splash ${phase}`}>
      {/* Animated background orbs */}
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-orb splash-orb-3" />

      {/* Particle dots */}
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i} className={`splash-particle splash-particle-${i + 1}`} />
      ))}

      {/* Logo / Brand */}
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <div className="splash-logo-ring" />
          <div className="splash-logo-icon">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" fill="rgba(255,255,255,0.15)" />
              <path
                d="M18 20h24l-14 8 14 8H18"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="30" cy="38" r="5" fill="white" opacity="0.9" />
            </svg>
          </div>
        </div>

        <h1 className="splash-brand">Zunto</h1>
        <p className="splash-tagline">Your Style, Just Around You</p>

        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
