/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * /local/{city} is not a feature: outside a development preview every id,
 * configured or not, must produce a real 404 from both the page and its
 * metadata. No stub, no "coming soon", no `?v=new` pointer.
 */

const notFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
jest.mock('next/navigation', () => ({ notFound: () => notFound() }));
jest.mock('@/components/local/LocalCouncilPage', () => ({
  LocalCouncilPage: () => null,
}));

import LocalCouncilRoute, { generateMetadata } from '@/app/(civic)/local/[municipalityId]/page';

const params = (municipalityId: string) => ({ params: Promise.resolve({ municipalityId }) });

describe('/local/[municipalityId]', () => {
  const originalFlag = process.env.NEXT_PUBLIC_CIVIQ_V;

  beforeEach(() => {
    notFound.mockClear();
    delete process.env.NEXT_PUBLIC_CIVIQ_V;
  });

  afterAll(() => {
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_CIVIQ_V;
    else process.env.NEXT_PUBLIC_CIVIQ_V = originalFlag;
  });

  it.each(['detroit', 'chicago', 'notacity', '../etc'])(
    'calls notFound() for %s in the page and its metadata',
    async id => {
      await expect(LocalCouncilRoute(params(id))).rejects.toThrow('NEXT_NOT_FOUND');
      await expect(generateMetadata(params(id))).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalledTimes(2);
    }
  );

  it('renders a configured city only under the development preview flag', async () => {
    process.env.NEXT_PUBLIC_CIVIQ_V = 'new';
    await expect(LocalCouncilRoute(params('detroit'))).resolves.toBeTruthy();
    const meta = await generateMetadata(params('detroit'));
    expect(meta.robots).toEqual({ index: false, follow: false });
    await expect(LocalCouncilRoute(params('notacity'))).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
