import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoCard, ImageCarousel, StatCounter } from '../components/PhotoComponents';
import api from '../api.js';

/**
 * SVG data URI generator - avoids CORB issues with external images
 */
const svgImage = (text, w = 1600, h = 900) => `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22${w}%22 height=%22${h}%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23061321%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2240%22 fill=%22%23FFFFFF%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;

const svgCardImage = (text, w = 800, h = 600) => `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22${w}%22 height=%22${h}%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%230B2035%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2232%22 fill=%22%23FFFFFF%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;

/**
 * Homepage - Cinematic premium insurance landing page
 */
const HomePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const authToken = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/system/dashboard', authToken);
        if (res.success) setStats(res.data);
      } catch (e) {
        // Fallback
        setStats({
          companies: { cnt: 150, active: 142 },
          usersByRole: { system_admin: 5, company_admin: 23, employee: 450, customer: 12000 },
          tasksByStatus: { completed: 8500, in_progress: 1200, pending_review: 300 },
          attendanceToday: { present: 420, on_break: 45, clocked_out: 380 }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [authToken]);

  const heroImages = [
    {
      url: svgImage('Life & Family Insurance'),
      alt: 'Life Insurance',
      category: 'Life & Family',
      headline: 'Protecting What Matters Most.',
      subheadline: 'From your family and home to your business and investments, InsuraVault delivers protection built around your future.',
      category: 'Life & Family',
      primaryButton: 'Explore Coverage',
      secondaryButton: 'Get a Quote',
      onPrimary: () => navigate('/insurance/life'),
      onSecondary: () => navigate('/quote/life')
    },
    {
      url: svgImage('Motor Insurance'),
      alt: 'Motor Insurance',
      category: 'Motor',
      headline: 'Drive with Complete Confidence.',
      subheadline: 'Comprehensive motor insurance covering accidents, theft, and third-party liability for all vehicle types.',
      category: 'Motor',
      primaryButton: 'View Motor Plans',
      secondaryButton: 'File a Claim',
      onPrimary: () => navigate('/insurance/motor'),
      onSecondary: () => navigate('/claims/motor')
    },
    {
      url: svgImage('Business Insurance'),
      alt: 'Business Insurance',
      category: 'Business',
      headline: 'Safeguard Your Business Future.',
      subheadline: 'Tailored commercial insurance solutions for offices, factories, and entrepreneurs of all sizes.',
      category: 'Business',
      primaryButton: 'Business Plans',
      secondaryButton: 'Request Quote',
      onPrimary: () => navigate('/insurance/business'),
      onSecondary: () => navigate('/quote/business')
    },
    {
      url: svgImage('Aviation Insurance'),
      alt: 'Aviation Insurance',
      category: 'Aviation',
      headline: 'Protected at Every Altitude.',
      subheadline: 'Specialized aviation coverage for passenger aircraft, private jets, and aviation liability.',
      category: 'Aviation',
      primaryButton: 'Aviation Coverage',
      secondaryButton: 'Learn More',
      onPrimary: () => navigate('/insurance/aviation'),
      onSecondary: () => navigate('/insurance/aviation#details')
    }
  ];

  const serviceCards = [
    {
      imageUrl: svgCardImage('Life Insurance'),
      category: 'Life Insurance',
      title: 'Life & Family Protection',
      description: 'Financial security for your loved ones with flexible term and whole life policies.',
      coverage: 'Up to $10M coverage',
      buttonText: 'View Plans',
      onClick: () => navigate('/insurance/life')
    },
    {
      imageUrl: svgCardImage('Motor Insurance'),
      category: 'Motor Insurance',
      title: 'Auto & Motor Coverage',
      description: 'Comprehensive protection for cars, SUVs, and commercial vehicles against accidents and theft.',
      coverage: 'Up to $250K coverage',
      buttonText: 'View Plans',
      onClick: () => navigate('/insurance/motor')
    },
    {
      imageUrl: svgCardImage('Property Insurance'),
      category: 'Property Insurance',
      title: 'Home & Property',
      description: 'Protect your residential home, commercial building, and real estate investments.',
      coverage: 'Up to $10M coverage',
      buttonText: 'View Plans',
      onClick: () => navigate('/insurance/property')
    },
    {
      imageUrl: svgCardImage('Aviation Insurance'),
      category: 'Aviation Insurance',
      title: 'Aviation & Aerospace',
      description: 'Specialized coverage for commercial aircraft, private jets, and aviation liability risks.',
      coverage: 'Custom limits',
      buttonText: 'View Plans',
      onClick: () => navigate('/insurance/aviation')
    },
    {
      imageUrl: svgCardImage('Marine Insurance'),
      category: 'Marine Insurance',
      title: 'Marine & Cargo',
      description: 'Cargo ships, shipping containers, ports, and yachts - protected across international waters.',
      coverage: 'Custom limits',
      buttonText: 'View Plans',
      onClick: () => navigate('/insurance/marine')
    },
    {
      imageUrl: svgCardImage('Health Insurance'),
      category: 'Health Insurance',
      title: 'Health & Medical',
      description: 'Comprehensive healthcare coverage for individuals, families, and corporate groups.',
      coverage: 'Up to $2M coverage',
      buttonText: 'View Plans',
      onClick: () => navigate('/insurance/health')
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Small Business Owner',
      image: svgCardImage('Sarah Chen', 400, 400),
      text: "InsuraVault made getting business insurance effortless. The claims process was transparent and fast - we were back in operation within days after our fire incident."
    },
    {
      name: 'Marcus Johnson',
      role: 'Fleet Manager',
      image: svgCardImage('Marcus Johnson', 400, 400),
      text: "Managing 50+ vehicles used to be a nightmare. InsuraVault's motor insurance platform streamlined everything from quotes to claims."
    },
    {
      name: 'Elena Rodriguez',
      role: 'Homeowner',
      image: svgCardImage('Elena Rodriguez', 400, 400),
      text: "The property insurance policy covered my home renovation completely. Their customer service team guided me through every step."
    }
  ];

  const categories = [
    { name: 'Life Insurance', description: 'Family protection & financial security', image: svgCardImage('Life Insurance', 600, 600) },
    { name: 'Motor Insurance', description: 'Auto, SUV & commercial vehicles', image: svgCardImage('Motor Insurance', 600, 600) },
    { name: 'Property Insurance', description: 'Homes, offices & real estate', image: svgCardImage('Property Insurance', 600, 600) },
    { name: 'Aviation Insurance', description: 'Aircraft & aviation liability', image: svgCardImage('Aviation Insurance', 600, 600) },
    { name: 'Marine Insurance', description: 'Cargo, ships & watercraft', image: svgCardImage('Marine Insurance', 600, 600) },
    { name: 'Health Insurance', description: 'Medical & healthcare coverage', image: svgCardImage('Health Insurance', 600, 600) }
  ];

  const totalPolicies = (stats?.tasksByStatus?.completed || 8500) + (stats?.tasksByStatus?.in_progress || 1200);
  const claimsProcessed = stats?.tasksByStatus?.pending_review || 300;

  return (
    <div className="homepage">
      {!authToken && (
        <div style={{ padding: '16px 24px', background: 'var(--soft-bg)', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <button className="btn btn-outline" onClick={() => navigate('/login')} style={{ padding: '8px 24px', fontSize: '14px', fontWeight: 600 }}>
            Sign In
          </button>
        </div>
      )}
      {/* Hero Carousel */}
      <section className="hero-section">
        <ImageCarousel
          images={heroImages}
          aspectRatio="16/9"
          autoPlay={true}
          interval={10000}
          showControls={true}
          showIndicators={true}
        />
      </section>

      {/* Animated Stats */}
      <section className="stats-section" style={{ padding: '80px 24px', background: 'linear-gradient(180deg, #061321 0%, #0B2035 100%)', color: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Trusted by Thousands</h2>
            <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>InsuraVault protects individuals, families, and businesses across multiple insurance categories worldwide.</p>
          </div>
          <div className="grid-4" style={{ gap: '24px' }}>
            <StatCounter label="Companies Insured" value={stats?.companies?.cnt || 150} icon={<ShieldIcon />} color="secondary" change="+12% YoY" changeType="positive" />
            <StatCounter label="Active Policies" value={totalPolicies} icon={<FileTextIcon />} color="accent" change="+8% YoY" changeType="positive" />
            <StatCounter label="Claims Processed" value={claimsProcessed} icon={<BarChartIcon />} color="warning" change="+15% YoY" changeType="positive" />
            <StatCounter label="Customer Satisfaction" value="94%" icon={<CheckIcon />} color="success" change="+3 pts" changeType="positive" />
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="services-section" style={{ padding: '100px 24px', background: 'var(--soft-bg)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(22, 119, 255, 0.1)', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: 'var(--royal-blue)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Insurance Solutions
            </span>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Choose Your Coverage</h2>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>Comprehensive insurance products designed for every stage of life and business.</p>
          </div>

          <div className="grid-3" style={{ gap: '24px' }}>
            {serviceCards.map((card, idx) => (
              <PhotoCard
                key={idx}
                imageUrl={card.imageUrl}
                category={card.category}
                title={card.title}
                description={card.description}
                coverage={card.coverage}
                buttonText={card.buttonText}
                onClick={card.onClick}
                aspectRatio="4/3"
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/insurance')} style={{ padding: '16px 48px', fontSize: '16px', fontWeight: 700 }}>
              View All Insurance Products &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="categories-section" style={{ padding: '80px 24px', background: 'var(--white)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>All Insurance Categories</h2>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>From personal protection to commercial coverage, we have you covered.</p>
          </div>
          <div className="grid-4" style={{ gap: '20px' }}>
            {categories.map((cat, idx) => (
              <div key={idx} className="category-card" style={{ 
                background: 'var(--white)', 
                border: '1px solid rgba(6,19,33,0.06)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '24px', 
                textAlign: 'center', 
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-4px)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ width: '64px', height: '64px', background: 'rgba(22,119,255,0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', marginBottom: '16px' }}>
                  <img src={cat.image} alt={cat.name} loading="lazy" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{cat.name}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section" style={{ padding: '100px 24px', background: 'linear-gradient(180deg, #F4F7FB 0%, #FFFFFF 100%)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Trusted by Our Customers</h2>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>"Real stories from real people protected by InsuraVault."</p>
          </div>
          <div className="grid-3" style={{ gap: '24px' }}>
            {testimonials.map((t, idx) => (
              <div key={idx} className="card" style={{ padding: '32px', background: 'var(--white)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <img src={t.image} alt={t.name} loading="lazy" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{t.role}</div>
                  </div>
                </div>
                <div style={{ fontSize: '16px', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: '24px' }}>{t.text}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1,2,3,4,5].map((star) => (
                    <svg key={star} width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" style={{ padding: '100px 24px', background: 'linear-gradient(135deg, #061321 0%, #0B2035 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 20% 30%, rgba(22,119,255,0.15) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '34px', fontWeight: 800, color: 'white', marginBottom: '20px', letterSpacing: '-0.02em' }}>Ready to Get Protected?</h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>Join thousands of satisfied customers who trust InsuraVault for their insurance needs.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/quote')} style={{ padding: '18px 48px', fontSize: '17px', fontWeight: 700 }}>
              Get a Free Quote
            </button>
            <button className="btn btn-outline" style={{ padding: '18px 48px', fontSize: '17px', fontWeight: 600, color: 'white', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => navigate('/insurance')}>
              Explore Products
            </button>
            {!authToken && (
              <button className="btn btn-outline" style={{ padding: '18px 48px', fontSize: '17px', fontWeight: 600, color: 'white', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => navigate('/login')}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const FileTextIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const BarChartIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;

export default HomePage;
