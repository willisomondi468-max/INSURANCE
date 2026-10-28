import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ImageCarousel } from '../components/PhotoComponents';

/**
 * SVG data URI generator - avoids CORB issues with external images
 */
const svgImage = (text, w = 1600, h = 900) => `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22${w}%22 height=%22${h}%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23061321%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2240%22 fill=%22%23FFFFFF%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;

const svgCardImage = (text, w = 800, h = 600) => `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22${w}%22 height=%22${h}%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%230B2035%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2232%22 fill=%22%23FFFFFF%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;

/**
 * InsuranceCategoryPage - Individual insurance category page
 * Supports: motor, property, aviation, life, health, marine, etc.
 * Features photographic hero, coverage options, quote forms, benefits
 */
const CATEGORY_DATA = {
  motor: {
    name: 'Motor Insurance',
    tagline: 'Comprehensive protection for your vehicle',
    heroImages: [
      { url: svgImage('Motor Insurance'), alt: 'Car on road', category: 'Motor', headline: 'Drive with Complete Confidence.', subheadline: 'From accidents to theft, we cover every mile of your journey.', primaryButton: 'Get Motor Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('Vehicle Inspection'), alt: 'Vehicle inspection', category: 'Motor', headline: 'Accident Protection.', subheadline: 'Fast claims processing and approved repair networks nationwide.', primaryButton: 'Start Claim', secondaryButton: 'View Plans', onPrimary: null, onSecondary: null },
      { url: svgImage('Third-Party Liability'), alt: 'Car on scenic road', category: 'Motor', headline: 'Third-Party Liability.', subheadline: 'Legal protection and coverage for damage to other vehicles and property.', primaryButton: 'Learn More', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'Accidental Damage', description: 'Coverage for repairs after collisions, fire, or natural disasters.', icon: '🛡️' },
      { title: 'Theft Protection', description: 'Full replacement value if your vehicle is stolen.', icon: '🔒' },
      { title: 'Third-Party Liability', description: 'Legal and financial protection for damage to others.', icon: '⚖️' },
      { title: 'Personal Injury', description: 'Medical expenses for you and your passengers.', icon: '🚑' },
      { title: 'Roadside Assistance', description: '24/7 towing, battery jump, and tire change.', icon: '🔧' },
      { title: 'Windscreen Cover', description: 'Repair or replacement for cracked glass.', icon: '🪟' }
    ],
    quoteFields: [
      { label: 'Vehicle Make', type: 'text', placeholder: 'e.g., Toyota' },
      { label: 'Vehicle Model', type: 'text', placeholder: 'e.g., Corolla' },
      { label: 'Year of Manufacture', type: 'number', placeholder: '2020' },
      { label: 'Vehicle Value ($)', type: 'number', placeholder: '25000' },
      { label: 'Driver Age', type: 'number', placeholder: '30' },
      { label: 'Driving Experience (Years)', type: 'number', placeholder: '5' },
      { label: 'Previous Claims', type: 'number', placeholder: '0' }
    ]
  },
  property: {
    name: 'Property Insurance',
    tagline: 'Protect your home and real estate',
    heroImages: [
      { url: svgImage('Property Insurance'), alt: 'Modern residential house', category: 'Property', headline: 'Home Protection, Simplified.', subheadline: 'From fire to flood, your home is covered against life\'s unexpected events.', primaryButton: 'Get Property Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('Commercial Property'), alt: 'Commercial glass buildings', category: 'Property', headline: 'Commercial Property.', subheadline: 'Office buildings, retail spaces, and commercial real estate coverage.', primaryButton: 'Commercial Plans', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'Fire & Smoke Damage', description: 'Full coverage for fire, smoke, and explosion damage.', icon: '🔥' },
      { title: 'Natural Disasters', description: 'Protection against storms, floods, and earthquakes.', icon: '🌪️' },
      { title: 'Theft & Burglary', description: 'Coverage for stolen belongings and forced entry.', icon: '🔒' },
      { title: 'Liability Protection', description: 'Legal fees if someone is injured on your property.', icon: '⚖️' },
      { title: 'Temporary Housing', description: 'Living expenses while your home is being repaired.', icon: '🏨' },
      { title: 'Contents Coverage', description: 'Furniture, electronics, and personal belongings.', icon: '📺' }
    ],
    quoteFields: [
      { label: 'Property Type', type: 'select', options: ['House', 'Apartment', 'Condo', 'Commercial Building', 'Rental'] },
      { label: 'Property Value ($)', type: 'number', placeholder: '500000' },
      { label: 'Year Built', type: 'number', placeholder: '2010' },
      { label: 'Square Footage', type: 'number', placeholder: '2000' },
      { label: 'Number of Occupants', type: 'number', placeholder: '4' },
      { label: 'Security System', type: 'select', options: ['None', 'Basic Alarm', 'Monitored System', 'Smart Home'] },
      { label: 'Previous Claims', type: 'number', placeholder: '0' }
    ]
  },
  aviation: {
    name: 'Aviation Insurance',
    tagline: 'Protected at every altitude',
    heroImages: [
      { url: svgImage('Aviation Insurance'), alt: 'Commercial airplane flying', category: 'Aviation', headline: 'Aircraft Coverage, Elevated.', subheadline: 'Specialized insurance for passenger aircraft, private jets, and helicopters.', primaryButton: 'Get Aviation Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('Private Jet'), alt: 'Private jet airport', category: 'Aviation', headline: 'Aviation Liability.', subheadline: 'Third-party liability, passenger protection, and hull coverage.', primaryButton: 'View Plans', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'Hull Coverage', description: 'Physical damage to the aircraft itself.', icon: '✈️' },
      { title: 'Passenger Liability', description: 'Coverage for injuries to passengers onboard.', icon: '👥' },
      { title: 'Third-Party Liability', description: 'Damage to ground property and other aircraft.', icon: '⚖️' },
      { title: 'In-Flight Emergencies', description: 'Emergency landing and search-and-rescue costs.', icon: '🚁' },
      { title: 'Hangar Keepers', description: 'Coverage while aircraft is in storage or maintenance.', icon: '🏢' },
      { title: 'War & Hijacking', description: 'Specialized coverage for political and security risks.', icon: '🛡️' }
    ],
    quoteFields: [
      { label: 'Aircraft Type', type: 'text', placeholder: 'e.g., Cessna 172' },
      { label: 'Aircraft Value ($)', type: 'number', placeholder: '500000' },
      { label: 'Annual Flight Hours', type: 'number', placeholder: '200' },
      { label: 'Pilot Experience (Years)', type: 'number', placeholder: '10' },
      { label: 'Home Airport Code', type: 'text', placeholder: 'e.g., JFK' },
      { label: 'Primary Use', type: 'select', options: ['Personal', 'Business', 'Commercial', 'Training'] },
      { label: 'Previous Claims', type: 'number', placeholder: '0' }
    ]
  },
  life: {
    name: 'Life Insurance',
    tagline: 'Financial security for your loved ones',
    heroImages: [
      { url: svgImage('Life Insurance'), alt: 'Happy family', category: 'Life', headline: 'Family Protection, Guaranteed.', subheadline: 'Term and whole life policies that secure your family\'s future.', primaryButton: 'Get Life Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('Legacy Planning'), alt: 'Elderly couple', category: 'Life', headline: 'Legacy Planning.', subheadline: 'Whole life insurance with cash value and estate protection.', primaryButton: 'View Plans', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'Term Life', description: 'Affordable coverage for a specific period.', icon: '📄' },
      { title: 'Whole Life', description: 'Permanent coverage with cash value.', icon: '💎' },
      { title: 'Critical Illness', description: 'Lump sum on diagnosis of major illness.', icon: '🏥' },
      { title: 'Disability Income', description: 'Monthly benefit if you cannot work.', icon: '♿' },
      { title: 'Funeral Expense', description: 'Cover end-of-life costs.', icon: '🕯️' },
      { title: 'Child Rider', description: 'Coverage for your children.', icon: '👶' }
    ],
    quoteFields: [
      { label: 'Coverage Amount ($)', type: 'number', placeholder: '500000' },
      { label: 'Age', type: 'number', placeholder: '35' },
      { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { label: 'Smoker', type: 'select', options: ['Yes', 'No'] },
      { label: 'Policy Term (Years)', type: 'number', placeholder: '20' },
      { label: 'Annual Income ($)', type: 'number', placeholder: '75000' },
      { label: 'Dependents', type: 'number', placeholder: '2' }
    ]
  },
  health: {
    name: 'Health Insurance',
    tagline: 'Comprehensive healthcare coverage',
    heroImages: [
      { url: svgImage('Health Insurance'), alt: 'Doctor consulting patient', category: 'Health', headline: 'Healthcare, Simplified.', subheadline: 'Individual, family, and group health insurance with nationwide provider network.', primaryButton: 'Get Health Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('Hospital'), alt: 'Hospital corridor', category: 'Health', headline: 'Hospitalization Coverage.', subheadline: 'Inpatient care, surgeries, and emergency treatment covered.', primaryButton: 'View Plans', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'Hospitalization', description: 'Room, board, and nursing care.', icon: '🏥' },
      { title: 'Outpatient Care', description: 'Doctor visits and specialist consultations.', icon: '👨‍⚕️' },
      { title: 'Prescription Drugs', description: 'Medication coverage with co-pay options.', icon: '💊' },
      { title: 'Maternity Care', description: 'Prenatal, delivery, and postnatal care.', icon: '🤱' },
      { title: 'Dental & Vision', description: 'Routine checkups and corrective care.', icon: '🦷' },
      { title: 'Mental Health', description: 'Therapy and counseling sessions.', icon: '🧠' }
    ],
    quoteFields: [
      { label: 'Coverage Amount ($)', type: 'number', placeholder: '200000' },
      { label: 'Age', type: 'number', placeholder: '35' },
      { label: 'Family Members', type: 'number', placeholder: '1' },
      { label: 'Pre-existing Conditions', type: 'select', options: ['None', 'Minor', 'Major'] },
      { label: 'Smoker', type: 'select', options: ['Yes', 'No'] },
      { label: 'Deductible Preference ($)', type: 'number', placeholder: '1000' },
      { label: 'Previous Claims', type: 'number', placeholder: '0' }
    ]
  },
  marine: {
    name: 'Marine Insurance',
    tagline: 'Protected across international waters',
    heroImages: [
      { url: svgImage('Marine Insurance'), alt: 'Cargo ship', category: 'Marine', headline: 'Marine Cargo Protection.', subheadline: 'Coverage for goods in transit across oceans and inland waterways.', primaryButton: 'Get Marine Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('Yacht'), alt: 'Yacht at marina', category: 'Marine', headline: 'Yacht & Pleasure Craft.', subheadline: 'Recreational boats, yachts, and personal watercraft coverage.', primaryButton: 'View Plans', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'Cargo Damage', description: 'Loss or damage to goods during transit.', icon: '📦' },
      { title: 'Hull Insurance', description: 'Physical damage to the vessel.', icon: '⚓' },
      { title: 'Third-Party Liability', description: 'Damage to other vessels or property.', icon: '⚖️' },
      { title: 'General Average', description: 'Proportional loss sharing in emergencies.', icon: '⚖️' },
      { title: 'War & Strikes', description: 'Coverage for political and civil unrest.', icon: '🛡️' },
      { title: 'Freight Protection', description: 'Lost revenue from undelivered cargo.', icon: '💰' }
    ],
    quoteFields: [
      { label: 'Vessel Type', type: 'select', options: ['Cargo Ship', 'Tanker', 'Yacht', 'Fishing Vessel', 'Ferry'] },
      { label: 'Vessel Value ($)', type: 'number', placeholder: '1000000' },
      { label: 'Cargo Value ($)', type: 'number', placeholder: '500000' },
      { label: 'Annual Voyages', type: 'number', placeholder: '12' },
      { label: 'Home Port', type: 'text', placeholder: 'e.g., Rotterdam' },
      { label: 'Navigation Area', type: 'select', options: ['Coastal', 'International', 'Inland Waters'] },
      { label: 'Previous Claims', type: 'number', placeholder: '0' }
    ]
  },
  business: {
    name: 'Business Insurance',
    tagline: 'Safeguard your enterprise',
    heroImages: [
      { url: svgImage('Business Insurance'), alt: 'Modern office building', category: 'Business', headline: 'Business Protection, Elevated.', subheadline: 'Commercial insurance for offices, factories, and entrepreneurs.', primaryButton: 'Get Business Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('Factory Warehouse'), alt: 'Factory warehouse', category: 'Business', headline: 'Commercial Property.', subheadline: 'Building, equipment, and inventory protection.', primaryButton: 'View Plans', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'General Liability', description: 'Third-party bodily injury and property damage.', icon: '⚖️' },
      { title: 'Property Coverage', description: 'Building, equipment, and inventory.', icon: '🏢' },
      { title: 'Business Interruption', description: 'Lost income during forced closure.', icon: '📉' },
      { title: 'Workers Compensation', description: 'Employee injury and illness benefits.', icon: '👷' },
      { title: 'Professional Liability', description: 'Errors and omissions coverage.', icon: '📋' },
      { title: 'Cyber Insurance', description: 'Data breach and cyber attack protection.', icon: '💻' }
    ],
    quoteFields: [
      { label: 'Business Type', type: 'select', options: ['Retail', 'Professional Services', 'Manufacturing', 'Construction', 'Technology', 'Hospitality'] },
      { label: 'Annual Revenue ($)', type: 'number', placeholder: '1000000' },
      { label: 'Number of Employees', type: 'number', placeholder: '25' },
      { label: 'Property Value ($)', type: 'number', placeholder: '500000' },
      { label: 'Years in Business', type: 'number', placeholder: '5' },
      { label: 'Location', type: 'text', placeholder: 'City, State' },
      { label: 'Previous Claims', type: 'number', placeholder: '0' }
    ]
  },
  agricultural: {
    name: 'Agricultural Insurance',
    tagline: 'Protecting farms and livestock',
    heroImages: [
      { url: svgImage('Farm Insurance'), alt: 'Farm tractor', category: 'Agriculture', headline: 'Farm Protection, Rooted in Trust.', subheadline: 'Crop, livestock, and equipment coverage for agricultural businesses.', primaryButton: 'Get Farm Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('Livestock Barn'), alt: 'Livestock barn', category: 'Agriculture', headline: 'Livestock Coverage.', subheadline: 'Protection for cattle, poultry, and other farm animals.', primaryButton: 'View Plans', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'Crop Insurance', description: 'Yield loss from weather, pests, or disease.', icon: '🌾' },
      { title: 'Livestock Mortality', description: 'Death of insured animals.', icon: '🐄' },
      { title: 'Equipment Coverage', description: 'Tractors, combines, and machinery.', icon: '🚜' },
      { title: 'Farm Structures', description: 'Barns, silos, and outbuildings.', icon: '🏠' },
      { title: 'Liability Protection', description: 'Farm visitor and product liability.', icon: '⚖️' },
      { title: 'Transit Coverage', description: 'Products in transit to market.', icon: '🚛' }
    ],
    quoteFields: [
      { label: 'Farm Type', type: 'select', options: ['Crop Farm', 'Livestock Farm', 'Mixed Farm', 'Dairy Farm', 'Poultry Farm'] },
      { label: 'Total Acreage', type: 'number', placeholder: '100' },
      { label: 'Farm Property Value ($)', type: 'number', placeholder: '750000' },
      { label: 'Equipment Value ($)', type: 'number', placeholder: '200000' },
      { label: 'Livestock Count', type: 'number', placeholder: '0' },
      { label: 'Annual Revenue ($)', type: 'number', placeholder: '300000' },
      { label: 'Previous Claims', type: 'number', placeholder: '0' }
    ]
  },
  personal: {
    name: 'Personal Accident Insurance',
    tagline: 'Coverage when accidents happen',
    heroImages: [
      { url: svgImage('Personal Accident'), alt: 'Construction worker safety', category: 'Personal Accident', headline: 'Accident Protection, Guaranteed.', subheadline: 'Financial support when accidents disrupt your life.', primaryButton: 'Get Accident Quote', secondaryButton: 'File a Claim', onPrimary: null, onSecondary: null },
      { url: svgImage('First Aid Kit'), alt: 'First aid kit', category: 'Personal Accident', headline: 'Emergency Assistance.', subheadline: 'Emergency medical evacuation and hospitalization benefits.', primaryButton: 'View Plans', secondaryButton: 'Get Quote', onPrimary: null, onSecondary: null }
    ],
    coverages: [
      { title: 'Accidental Death', description: 'Lump sum benefit to beneficiaries.', icon: '🕯️' },
      { title: 'Permanent Disability', description: 'Benefit based on disability level.', icon: '♿' },
      { title: 'Temporary Disability', description: 'Weekly income during recovery.', icon: '📅' },
      { title: 'Medical Expenses', description: 'Hospitalization and treatment costs.', icon: '🏥' },
      { title: 'Ambulance Services', description: 'Emergency transport coverage.', icon: '🚑' },
      { title: 'Funeral Benefit', description: 'End-of-life expense coverage.', icon: '💐' }
    ],
    quoteFields: [
      { label: 'Coverage Amount ($)', type: 'number', placeholder: '250000' },
      { label: 'Age', type: 'number', placeholder: '35' },
      { label: 'Occupation', type: 'select', options: ['Office Worker', 'Manual Labor', 'Construction', 'Driver', 'Healthcare', 'Other'] },
      { label: 'Smoker', type: 'select', options: ['Yes', 'No'] },
      { label: 'Policy Term (Years)', type: 'number', placeholder: '1' },
      { label: 'Annual Income ($)', type: 'number', placeholder: '60000' },
      { label: 'Previous Claims', type: 'number', placeholder: '0' }
    ]
  }
};

const InsuranceCategoryPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [quoteForm, setQuoteForm] = useState({});
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [quoteResult, setQuoteResult] = useState(null);

  const catData = CATEGORY_DATA[category] || CATEGORY_DATA.motor;

  const handleQuoteChange = (e) => {
    const { name, value, type } = e.target;
    setQuoteForm({ ...quoteForm, [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value });
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    setQuoteSubmitted(true);
    await new Promise(r => setTimeout(r, 1500));
    const basePremium = catData === CATEGORY_DATA.motor ? 1200 :
                       catData === CATEGORY_DATA.property ? 800 :
                       catData === CATEGORY_DATA.life ? 600 :
                       catData === CATEGORY_DATA.health ? 400 :
                       catData === CATEGORY_DATA.aviation ? 2500 :
                       catData === CATEGORY_DATA.marine ? 1800 :
                       catData === CATEGORY_DATA.business ? 1500 :
                       catData === CATEGORY_DATA.personal ? 300 : 500;
    const age = quoteForm.age || 35;
    const ageFactor = age > 50 ? 1.3 : age > 30 ? 1.1 : 1.0;
    const monthlyPremium = Math.round((basePremium * ageFactor) / 12);
    setQuoteResult({
      monthlyPremium,
      annualPremium: monthlyPremium * 12,
      coverage: quoteForm.coverageAmount || catData.coverages[0]?.description || '$250,000',
      category: catData.name
    });
  };

  if (!catData) {
    return (
      <div className="fade-in" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="empty-state-premium">
          <h3>Insurance Category Not Found</h3>
          <p>The category you requested doesn't exist.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Homepage</button>
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      {/* Hero Section */}
      <section className="category-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <ImageCarousel
          images={catData.heroImages}
          aspectRatio="16/9"
          autoPlay={true}
          interval={10000}
          showControls={true}
          showIndicators={true}
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 24px', background: 'linear-gradient(transparent, rgba(6,19,33,0.8))', color: 'white' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '34px', fontWeight: 800, marginBottom: '16px', color: 'white' }}>{catData.name}</h2>
            <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '700px' }}>{catData.tagline}</p>
          </div>
        </div>
      </section>

      {/* Coverage Options */}
      <section style={{ padding: '80px 24px', background: 'var(--soft-bg)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>Coverage Options</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Choose the protection level that fits your needs.</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate(`/quote/${category}`)} style={{ padding: '12px 24px', fontSize: '15px' }}>
              Get Custom Quote
            </button>
          </div>
          <div className="grid-3" style={{ gap: '20px' }}>
            {catData.coverages.map((cov, idx) => (
              <div key={idx} className="card" style={{ padding: '24px', border: '1px solid rgba(6,27,51,0.06)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{cov.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>{cov.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cov.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Calculator */}
      <section style={{ padding: '80px 24px', background: 'var(--white)' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Get a Personalized Quote</h2>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>{quoteSubmitted && quoteResult ? 'Your personalized quote has been calculated.' : 'Fill in your details to get an instant premium estimate.'}</p>
          </div>

          {quoteSubmitted && quoteResult ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center', background: 'linear-gradient(135deg, #061321 0%, #1677FF 100%)', color: 'white' }}>
              <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '16px' }}>Your Monthly Premium</div>
              <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '8px' }}>${quoteResult.monthlyPremium}</div>
              <div style={{ fontSize: '16px', opacity: 0.9 }}>Annual premium: ${quoteResult.annualPremium.toLocaleString()}</div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '12px' }}>Coverage: {quoteResult.coverage}</div>
              <div style={{ marginTop: '24px' }}>
                <button className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', padding: '12px 32px' }} onClick={() => navigate(`/insurance/${category}`)}>
                  Apply for Coverage
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleQuoteSubmit} className="card" style={{ padding: '32px' }}>
              <div className="grid-2" style={{ gap: '20px' }}>
                {catData.quoteFields.map((field, idx) => (
                  <div key={idx} className="form-group">
                    <label className="form-label">{field.label}</label>
                    {field.type === 'select' ? (
                      <select className="form-input" name={field.label.toLowerCase().replace(/\s+/g, '-')} onChange={handleQuoteChange}>
                        <option value="">Select {field.label}</option>
                        {field.options.map((opt, oi) => (
                          <option key={oi} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        className="form-input"
                        name={field.label.toLowerCase().replace(/\s+/g, '-')}
                        placeholder={field.placeholder}
                        onChange={handleQuoteChange}
                        required
                      />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '32px', textAlign: 'center' }}>
                <button className="btn btn-primary btn-lg" style={{ padding: '16px 48px', fontSize: '16px', fontWeight: 700 }} disabled={quoteSubmitted}>
                  {quoteSubmitted ? 'Calculating...' : 'Calculate Premium'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 24px', background: 'var(--soft-bg)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Frequently Asked Questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { q: 'How do I file a claim?', a: 'Log into your account and navigate to the Claims section, or call our 24/7 claims hotline.' },
              { q: 'How long does claim processing take?', a: 'Most claims are processed within 5-10 business days depending on complexity.' },
              { q: 'Can I adjust my coverage?', a: 'Yes, you can modify your coverage limits at any time through your account dashboard.' },
              { q: 'What documents do I need?', a: 'Policy documents, proof of loss, photos, and any relevant receipts or reports.' }
            ].map((faq, idx) => (
              <div key={idx} style={{ borderBottom: '1px solid rgba(6,27,51,0.08)', padding: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => {}}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{faq.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--royal-blue)' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.6 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default InsuranceCategoryPage;
