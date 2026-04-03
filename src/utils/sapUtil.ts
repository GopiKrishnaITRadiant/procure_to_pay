// Retry with delay
export const retry = async <T>(
  fn: Function,
  retries = 2,
  delay = 2000,
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise((res) => setTimeout(res, delay));
    return retry(fn, retries - 1, delay);
  }
};

// Timeout wrapper
export const withTimeout = (promise: Promise<any>, ms = 30000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms),
    ),
  ]);
};

// Frequency checker
export const checkIfDue = (lastSyncedAt: Date, frequency: string) => {
  if (!lastSyncedAt) return true;

  const diff = Date.now() - new Date(lastSyncedAt).getTime();
  console.log("diff", diff);

  const map: any = {
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
  };

  return diff >= (map[frequency] || map["15m"]);
};
