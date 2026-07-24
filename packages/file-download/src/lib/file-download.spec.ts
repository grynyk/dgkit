import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

import { downloadBlob, isDownloadSupported } from './file-download';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

let createObjectURL: Mock<(obj: Blob | MediaSource) => string>;
let revokeObjectURL: Mock<(url: string) => void>;

beforeEach(() => {
  // jsdom does not implement the Blob URL APIs; stub them for every test.
  // Assertions below use these captured references rather than re-reading
  // `URL.createObjectURL`/`URL.revokeObjectURL`, which ESLint's
  // `unbound-method` rule (correctly) treats as an unsafe method reference.
  createObjectURL = vi.fn(() => 'blob:mock-url');
  revokeObjectURL = vi.fn();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const el of document.querySelectorAll('a[download]')) {
    el.remove();
  }
});

describe('isDownloadSupported', () => {
  it('is true when document and URL.createObjectURL are available', () => {
    expect(isDownloadSupported()).toBe(true);
  });

  it('is false when URL.createObjectURL is missing', () => {
    // @ts-expect-error -- simulate an environment without the Blob URL API
    URL.createObjectURL = undefined;
    expect(isDownloadSupported()).toBe(false);
  });

  it('is false when document is undefined', () => {
    const original = globalThis.document;
    // @ts-expect-error -- simulate a non-DOM environment
    delete globalThis.document;
    try {
      expect(isDownloadSupported()).toBe(false);
    } finally {
      globalThis.document = original;
    }
  });
});

describe('downloadBlob', () => {
  it('throws when downloads are not supported', () => {
    // @ts-expect-error -- simulate an environment without the Blob URL API
    URL.createObjectURL = undefined;
    expect(() => downloadBlob('a.txt', new Blob(['x']))).toThrow(
      /not supported/,
    );
  });

  it('creates an object URL from the blob', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    const blob = new Blob(['hello'], { type: 'text/plain' });
    downloadBlob('report.csv', blob);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('sets the download filename and href, then clicks the link', () => {
    let filename: string | undefined;
    let href: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      const link = document.querySelector<HTMLAnchorElement>('a[download]');
      filename = link?.download;
      href = link?.href;
    });
    downloadBlob('my file.csv', new Blob(['x']));
    expect(filename).toBe('my file.csv');
    expect(href).toContain('mock-url');
  });

  it('removes the link element from the DOM synchronously', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    downloadBlob('x.txt', new Blob(['x']));
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });

  it('revokes the object URL asynchronously, not before click() returns', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    downloadBlob('x.txt', new Blob(['x']));
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await wait(10);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('still removes the link and revokes the URL if click() throws', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked by browser');
    });
    expect(() => downloadBlob('x.txt', new Blob(['x']))).toThrow(
      'blocked by browser',
    );
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    await wait(10);
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
