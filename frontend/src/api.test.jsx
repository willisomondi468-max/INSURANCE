import '@testing-library/jest-dom';

// Test API module exports
describe('API Module', () => {
  it('exports expected functions', async () => {
    const api = await import('./api');
    expect(api.default).toBeDefined();
    expect(api.default.get).toBeDefined();
    expect(api.default.post).toBeDefined();
    expect(api.default.put).toBeDefined();
    expect(api.money).toBeDefined();
    expect(api.date).toBeDefined();
    expect(api.statusVariant).toBeDefined();
    expect(api.humanize).toBeDefined();
  });

  it('money formatter works', async () => {
    const { money } = await import('./api');
    expect(money(1000)).toBe('$1,000.00');
    expect(money(0)).toBe('$0.00');
  });

  it('date formatter works', async () => {
    const { date } = await import('./api');
    expect(date('2026-01-15')).toBeDefined();
    expect(date(null)).toBe('—');
  });

  it('statusVariant maps correctly', async () => {
    const { statusVariant } = await import('./api');
    expect(statusVariant('active')).toBe('accent');
    expect(statusVariant('pending')).toBe('warning');
    expect(statusVariant('rejected')).toBe('danger');
  });

  it('humanize converts underscores', async () => {
    const { humanize } = await import('./api');
    expect(humanize('under_review')).toBe('Under Review');
    expect(humanize('customer_details')).toBe('Customer Details');
  });
});
