import React, { useState, useEffect, useCallback } from 'react';
import Icons from './Icons';

/**
 * PhotoCard - Insurance category card with realistic background photograph
 * Dark gradient overlay, hover zoom effect, category badge, CTA button
 */
const PhotoCard = ({
  imageUrl,
  category,
  title,
  description,
  coverage,
  buttonText = 'Explore Policy',
  onClick,
  aspectRatio = '4/3'
}) => {
  const [imageLoaded, setImageLoaded] = useState(true);

  const handleImageError = () => setImageLoaded(false);

  return (
    <div className="photo-card" style={{ aspectRatio }} onClick={onClick}>
      {imageLoaded ? (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #081B33 0%, #1769FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icons.Shield />
        </div>
      )}
      <div className="photo-card-content">
        <div className="photo-card-category">{category}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        {coverage && (
          <div style={{ marginBottom: 20, fontSize: 13, opacity: 0.9 }}>
            <strong>Coverage:</strong> {coverage}
          </div>
        )}
        <button className="photo-card-btn" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
          {buttonText} &rarr;
        </button>
      </div>
    </div>
  );
};

export default PhotoCard;

/**
 * ImageCarousel - Auto-rotating hero carousel with smooth transitions
 * Supports multiple images, manual navigation, and touch-ready
 */
const ImageCarousel = ({
  images,
  aspectRatio = '16/9',
  autoPlay = true,
  interval = 5000,
  showControls = true,
  showIndicators = true
}) => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!autoPlay || isPaused || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [autoPlay, isPaused, images.length, current]);

  const goTo = (index) => setCurrent(index);
  const next = () => setCurrent((prev) => (prev + 1) % images.length);
  const prev = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div
      className="carousel-container"
      style={{ position: 'relative', aspectRatio, overflow: 'hidden', borderRadius: '24px', boxShadow: '0 20px 40px rgba(8, 27, 51, 0.15)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div
        style={{
          display: 'flex',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translateX(-${current * 100}%)`,
          width: '100%',
          height: '100%'
        }}
      >
        {images.map((img, idx) => (
          <div
            key={idx}
            style={{
              flex: '0 0 100%',
              width: '100%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <img
              src={img.url}
              alt={img.alt}
              loading={idx === 0 ? 'eager' : 'lazy'}
              decoding="async"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221600%22 height=%22900%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23081B33%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2240%22 fill=%22%23FFFFFF%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3EImage+Unavailable%3C/text%3E%3C/svg%3E';
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
            {/* Dark gradient overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(8, 27, 51, 0.85) 0%, rgba(15, 42, 74, 0.65) 50%, rgba(23, 105, 255, 0.35) 100%)',
                zIndex: 1
              }}
            />
            {/* Slide content overlay */}
            {img.content && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '60px 48px',
                  color: 'white',
                  maxWidth: '900px',
                  margin: '0 auto'
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    marginBottom: '16px',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  {img.category || 'Insurance'}
                </span>
                <h1
                  style={{
                    fontSize: Math.max(28, Math.min(56, window.innerWidth * 0.05)),
                    fontWeight: 800,
                    lineHeight: 1.15,
                    marginBottom: '16px',
                    letterSpacing: '-0.02em'
                  }}
                >
                  {img.headline}
                </h1>
                <p
                  style={{
                    fontSize: Math.max(16, Math.min(20, window.innerWidth * 0.015)),
                    lineHeight: 1.6,
                    opacity: 0.95,
                    marginBottom: '28px',
                    maxWidth: '600px'
                  }}
                >
                  {img.subheadline}
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); img.onPrimary?.(); }}
                    className="btn btn-primary btn-lg"
                    style={{ padding: '16px 32px', fontSize: '15px', fontWeight: 700 }}
                  >
                    {img.primaryButton || 'Explore Coverage'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); img.onSecondary?.(); }}
                    className="btn btn-ghost"
                    style={{ padding: '16px 32px', fontSize: '15px', fontWeight: 600, color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
                  >
                    {img.secondaryButton || 'Get a Quote'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      {showControls && images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '24px',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              zIndex: 10,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            style={{
              position: 'absolute',
              top: '50%',
              right: '24px',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
              zIndex: 10,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 10
          }}
        >
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); goTo(idx); }}
              style={{
                width: current === idx ? '32px' : '10px',
                height: '10px',
                borderRadius: '5px',
                background: current === idx ? 'white' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { PhotoCard, ImageCarousel };

/**
 * StatCounter - Animated counter with premium styling
 */
const StatCounter = ({ label, value, icon, change, changeType, color = 'primary' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const start = 0;
    const end = typeof value === 'number' ? value : parseInt(value.replace(/[^0-9]/g, '')) || 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(start + (end - start) * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  const iconColors = {
    primary: 'var(--navy-deep)',
    secondary: 'var(--royal-blue)',
    accent: 'var(--cyan-accent)',
    warning: 'var(--warning)',
    success: 'var(--success)'
  };

  return (
    <div className="stat-card-premium" style={{ borderTopColor: color === 'warning' ? 'var(--warning)' : color === 'success' ? 'var(--success)' : color === 'danger' ? 'var(--danger)' : 'var(--royal-blue)' }}>
      <div className="stat-icon" style={{ backgroundColor: `rgba(${color === 'primary' ? '8,27,51' : color === 'secondary' ? '23,105,255' : color === 'accent' ? '0,194,255' : color === 'warning' ? '245,158,11' : '22,163,74'}, 0.1)`, color: iconColors[color] || 'var(--navy-deep)' }}>
        {icon}
      </div>
      <div className="stat-value">{displayValue}{typeof value === 'string' && !value.match(/^\d+$/) ? value.replace(/\d+/g, '') : ''}</div>
      <div className="stat-label">{label}</div>
      {change && (
        <div className={`stat-change ${changeType || 'positive'}`}>
          <span style={{ fontSize: '10px' }}>{changeType === 'positive' ? '&rarr;' : '&larr;'}</span>
          {change}
        </div>
      )}
    </div>
  );
};

export { StatCounter };