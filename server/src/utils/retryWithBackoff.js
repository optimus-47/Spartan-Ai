async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 1500) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err?.statusCode ?? err?.status ?? err?.response?.status;
      const message =
        typeof err?.message === "string" ? err.message.toLowerCase() : "";
      const isRetryable =
        status === 503 || /\b503\b/.test(message) || message.includes("overloaded");
      if (!isRetryable || attempt === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `Gemini unavailable, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

module.exports = retryWithBackoff;