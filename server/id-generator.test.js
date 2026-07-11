import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

describe('id-generator', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NODE_ID;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a BigInt', async () => {
    const { generate } = await import('./id-generator.js');
    expect(typeof generate()).toBe('bigint');
  });

  it('encodes the millisecond timestamp relative to the custom epoch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(EPOCH_MS + 5000);
    const { generate } = await import('./id-generator.js');
    const id = generate();
    const timestampBits = id >> 22n;
    expect(timestampBits).toBe(5000n);
  });

  it('defaults NODE_ID to 0 when unset', async () => {
    const { generate } = await import('./id-generator.js');
    const id = generate();
    const nodeBits = (id >> 12n) & 0x3ffn;
    expect(nodeBits).toBe(0n);
  });

  it('reflects NODE_ID in the node bits when set', async () => {
    process.env.NODE_ID = '7';
    const { generate } = await import('./id-generator.js');
    const id = generate();
    const nodeBits = (id >> 12n) & 0x3ffn;
    expect(nodeBits).toBe(7n);
  });

  it('increments the sequence for IDs generated in the same millisecond', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(EPOCH_MS + 1000);
    const { generate } = await import('./id-generator.js');
    const a = generate();
    const b = generate();
    expect(b - a).toBe(1n);
  });

  it('produces unique, monotonically increasing IDs under rapid-fire synchronous calls', async () => {
    const { generate } = await import('./id-generator.js');
    const ids = Array.from({ length: 10000 }, () => generate());
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i] > ids[i - 1]).toBe(true);
    }
  });

  it('rolls over to the next millisecond when the sequence overflows within one ms', async () => {
    const dateNow = vi.spyOn(Date, 'now');
    let calls = 0;
    dateNow.mockImplementation(() => {
      calls += 1;
      return EPOCH_MS + (calls > 4097 ? 2001 : 2000);
    });
    const { generate } = await import('./id-generator.js');

    for (let i = 0; i < 4096; i++) generate();
    const overflowId = generate();
    const timestampBits = overflowId >> 22n;
    const sequenceBits = overflowId & 0xfffn;

    expect(timestampBits).toBe(2001n);
    expect(sequenceBits).toBe(0n);
  });
});
