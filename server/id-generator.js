const EPOCH_MS = BigInt(Date.UTC(2026, 0, 1, 0, 0, 0));
const NODE_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n; // 4095
const MAX_NODE_ID = (1n << NODE_BITS) - 1n; // 1023

let lastTimestamp = -1n;
let sequence = 0n;

function computeNodeId() {
  const raw = BigInt(process.env.NODE_ID || '0');
  if (raw < 0n || raw > MAX_NODE_ID) {
    throw new Error(`NODE_ID must be between 0 and ${MAX_NODE_ID}`);
  }
  return raw;
}

// Parsed/validated once at module load time, since NODE_ID isn't expected
// to change at runtime.
const NODE_ID = computeNodeId();

function waitForNextMillis(timestamp) {
  // Real spin-wait: poll the clock until it advances past lastTimestamp.
  let next = BigInt(Date.now()) - EPOCH_MS;
  while (next <= timestamp) {
    next = BigInt(Date.now()) - EPOCH_MS;
  }
  return next;
}

export function generate() {
  const nodeId = NODE_ID;
  let timestamp = BigInt(Date.now()) - EPOCH_MS;

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & MAX_SEQUENCE;
    if (sequence === 0n) {
      timestamp = waitForNextMillis(lastTimestamp);
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = timestamp;

  return (timestamp << 22n) | (nodeId << SEQUENCE_BITS) | sequence;
}
