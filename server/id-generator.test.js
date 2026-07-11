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
    // Uses real wall-clock time deliberately: waitForNextMillis does a real
    // busy-wait poll of Date.now(), which would hang forever against a
    // frozen fake clock (nothing can advance it from within the same
    // synchronous call). No sleep/setTimeout needed — the busy-wait itself
    // provides the wait once we cross into the next real millisecond.
    const { generate } = await import('./id-generator.js');

    // Under system load (e.g. the full suite running many test files at
    // once), the synchronous burst of 4096 calls below can occasionally
    // get preempted and spill past a millisecond boundary on its own
    // (via the plain "else" reset branch) before reaching a true sequence
    // overflow. Retry a few times so the assertion is about the busy-wait
    // path specifically, not a flake under contention.
    let timestampBits;
    let sequenceBits;
    let initialTimestampBits;
    let attempts = 0;
    do {
      attempts += 1;

      // Align to the start of a fresh real millisecond first, so the
      // synchronous burst below has (close to) a full millisecond of
      // wall-clock budget to fit 4096 calls in before crossing the
      // boundary on its own.
      const startMs = Date.now();
      while (Date.now() === startMs) {
        // busy wait for the millisecond to tick over
      }

      const initialId = generate();
      initialTimestampBits = initialId >> 22n;

      // Generate enough additional IDs in the same real millisecond to
      // overflow the 12-bit sequence (4096 total, including initialId).
      for (let i = 0; i < 4095; i++) generate();

      const overflowId = generate();
      timestampBits = overflowId >> 22n;
      sequenceBits = overflowId & 0xfffn;
    } while (sequenceBits !== 0n && attempts < 10);

    expect(timestampBits).toBeGreaterThan(initialTimestampBits);
    expect(sequenceBits).toBe(0n);
  });
});
