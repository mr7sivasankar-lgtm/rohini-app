import { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onFinish }) => {
  const [phase, setPhase] = useState('enter'); // enter | exit

  useEffect(() => {
    const visibleTimer = setTimeout(() => setPhase('exit'), 2200);
    const finishTimer  = setTimeout(() => {
      onFinish?.();
      sessionStorage.setItem('splashShown', '1');
    }, 2800);

    return () => {
      clearTimeout(visibleTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`zunto-splash ${phase}`}>
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-orb splash-orb-3" />

      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i} className={`splash-particle splash-particle-${i + 1}`} />
      ))}

      <div className="splash-content">
        <div className="splash-logo-wrap">
          <div className="splash-logo-ring" />
          <div className="splash-logo-img-wrap">
            <img
              src="/sifito-logo.png"
              alt="SIFITO"
              className="splash-logo-img"
            />
          </div>
        </div>

        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
