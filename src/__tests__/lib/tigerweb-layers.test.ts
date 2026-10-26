import { TIGERWEB_SITTING_LAYERS, resolveTigerwebLayer } from '@/lib/tigerweb-layers';

describe('resolveTigerwebLayer', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('finds the sitting 119th Congress layer by name, not layer 0', async () => {
    // The live MapServer since Sept 2026: layer 0 is the 120th Congress.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        layers: [
          { id: 0, name: '120th Congressional Districts' },
          { id: 4, name: '119th Congressional Districts' },
          { id: 8, name: '119th Congressional Districts' },
        ],
      }),
    }) as unknown as typeof fetch;
    const { name, fallback } = TIGERWEB_SITTING_LAYERS.cd;
    expect(name).toBe('119th Congressional Districts');
    await expect(resolveTigerwebLayer(name, fallback)).resolves.toBe(4);
  });
});
