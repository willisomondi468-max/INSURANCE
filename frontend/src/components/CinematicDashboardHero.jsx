import React from 'react';

/**
 * CinematicDashboardHero - Premium dashboard hero background
 * Role-specific visual identity with SVG illustration background
 */
const CinematicDashboardHero = ({ title, subtitle, role, actions }) => {
  // Role-specific SVG illustrations
  const roleVisuals = {
    system_admin: {
      bg: '#061321',
      accent: '#1677FF',
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="none">
          <rect width="1200" height="400" fill="#061321"/>
          <path d="M100 300 Q 300 100 500 300 T 900 300" stroke="#00D9FF" stroke-width="2" fill="none" opacity="0.3"/>
          <circle cx="600" cy="200" r="80" fill="#00D9FF" opacity="0.2"/>
          <circle cx="600" cy="200" r="40" fill="#00D9FF" opacity="0.4"/>
          <circle cx="600" cy="200" r="20" fill="#00D9FF"/>
        </svg>
      `
    },
    company_admin: {
      bg: '#0B2035',
      accent: '#D9B76E',
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="none">
          <rect width="1200" height="400" fill="#0B2035"/>
          <path d="M50 350 Q 300 150 550 350 T 1050 350" stroke="#D9B76E" stroke-width="2" fill="none" opacity="0.3"/>
          <circle cx="550" cy="250" r="70" fill="#D9B76E" opacity="0.2"/>
          <circle cx="550" cy="250" r="35" fill="#D9B76E" opacity="0.5"/>
          <circle cx="550" cy="250" r="18" fill="#D9B76E"/>
        </svg>
      `
    },
    department_manager: {
      bg: '#0B2035',
      accent: '#1677FF',
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="none">
          <rect width="1200" height="400" fill="#0B2035"/>
          <path d="M100 320 Q 400 100 700 320 T 1100 320" stroke="#1677FF" stroke-width="2" fill="none" opacity="0.3"/>
          <circle cx="700" cy="220" r="60" fill="#1677FF" opacity="0.2"/>
          <circle cx="700" cy="220" r="30" fill="#1677FF" opacity="0.4"/>
          <circle cx="700" cy="220" r="15" fill="#1677FF"/>
        </svg>
      `
    },
    hr_manager: {
      bg: '#0B2035',
      accent: '#19C58B',
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="none">
          <rect width="1200" height="400" fill="#0B2035"/>
          <circle cx="400" cy="250" r="60" fill="#19C58B" opacity="0.2"/>
          <circle cx="400" cy="250" r="30" fill="#19C58B" opacity="0.5"/>
          <circle cx="400" cy="250" r="15" fill="#19C58B"/>
          <circle cx="800" cy="200" r="50" fill="#19C58B" opacity="0.2"/>
          <circle cx="800" cy="200" r="25" fill="#19C58B" opacity="0.4"/>
          <circle cx="800" cy="200" r="12" fill="#19C58B"/>
        </svg>
      `
    },
    employee: {
      bg: '#0B2035',
      accent: '#1677FF',
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="none">
          <rect width="1200" height="400" fill="#0B2035"/>
          <path d="M200 350 Q 500 100 800 350 T 1150 350" stroke="#1677FF" stroke-width="2" fill="none" opacity="0.25"/>
          <circle cx="500" cy="220" r="50" fill="#1677FF" opacity="0.2"/>
          <circle cx="500" cy="220" r="25" fill="#1677FF" opacity="0.4"/>
          <circle cx="500" cy="220" r="12" fill="#1677FF"/>
        </svg>
      `
    },
    customer: {
      bg: '#061321',
      accent: '#D9B76E',
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="none">
          <rect width="1200" height="400" fill="#061321"/>
          <path d="M150 380 Q 400 120 650 380 T 1100 380" stroke="#D9B76E" stroke-width="2" fill="none" opacity="0.3"/>
          <circle cx="650" cy="260" r="60" fill="#D9B76E" opacity="0.2"/>
          <circle cx="650" cy="260" r="30" fill="#D9B76E" opacity="0.5"/>
          <circle cx="650" cy="260" r="14" fill="#D9B76E"/>
        </svg>
      `
    },
    provider: {
      bg: '#061321',
      accent: '#00D9FF',
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="none">
          <rect width="1200" height="400" fill="#061321"/>
          <path d="M80 360 Q 400 80 720 360 T 1100 360" stroke="#00D9FF" stroke-width="2" fill="none" opacity="0.3"/>
          <circle cx="720" cy="240" r="65" fill="#00D9FF" opacity="0.2"/>
          <circle cx="720" cy="240" r="32" fill="#00D9FF" opacity="0.4"/>
          <circle cx="720" cy="240" r="16" fill="#00D9FF"/>
        </svg>
      `
    },
    default: {
      bg: '#0B2035',
      accent: '#1677FF',
      svg: `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" fill="none">
          <rect width="1200" height="400" fill="#0B2035"/>
          <circle cx="600" cy="200" r="70" fill="#1677FF" opacity="0.2"/>
          <circle cx="600" cy="200" r="35" fill="#1677FF" opacity="0.4"/>
          <circle cx="600" cy="200" r="18" fill="#1677FF"/>
        </svg>
      `
    }
  };

  const visual = roleVisuals[role] || roleVisuals.default;

  return (
    <div className="dashboard-hero" style={{ position: 'relative', overflow: 'hidden', minHeight: '320px' }}>
      {/* Background SVG */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img src={visual.svg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} loading="eager" decoding="async"/>
      </div>
      {/* Subtle gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(135deg, rgba(6, 19, 33, 0.6) 0%, rgba(11, 32, 53, 0.4) 50%, rgba(6, 19, 33, 0.7) 100%)' }} />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: visual.accent, background: `rgba(${visual.accent === '#D9B76E' ? '217,183,110' : visual.accent === '#19C58B' ? '25,197,139' : visual.accent === '#00D9FF' ? '0,217,255' : '22,119,255'}, 0.15)`, padding: '6px 14px', borderRadius: '20px', border: '1px solid', borderColor: `rgba(${visual.accent === '#D9B76E' ? '217,183,110' : visual.accent === '#19C58B' ? '25,197,139' : visual.accent === '#00D9FF' ? '0,217,255' : '22,119,255'}, 0.3)` }}>
            {role.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
        <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px', letterSpacing: '-0.02em' }}>{title}</h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', maxWidth: '600px' }}>{subtitle}</h1>
        {actions && (
          <div style={{ marginTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default CinematicDashboardHero;
