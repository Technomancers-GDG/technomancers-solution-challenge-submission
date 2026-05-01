import { useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const wait = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

async function requestWithRetry(path, options = {}, retryCount = 1) {
  let attempt = 0;
  let latestError;

  while (attempt <= retryCount) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
        ...options,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    } catch (error) {
      latestError = error;
      if (attempt === retryCount) {
        break;
      }
      await wait(350 * (attempt + 1));
      attempt += 1;
    }
  }

  throw latestError;
}

export function useApi({ retryCount = 1 } = {}) {
  const request = useCallback(
    (path, options = {}) => requestWithRetry(path, options, retryCount),
    [retryCount],
  );

  const get = useCallback((path) => request(path), [request]);

  const post = useCallback(
    (path, payload = {}, options = {}) =>
      request(path, {
        method: "POST",
        body: JSON.stringify(payload),
        ...options,
      }),
    [request],
  );

  const put = useCallback(
    (path, payload = {}, options = {}) =>
      request(path, {
        method: "PUT",
        body: JSON.stringify(payload),
        ...options,
      }),
    [request],
  );

  const del = useCallback((path, options = {}) => request(path, { method: "DELETE", ...options }), [request]);

  return {
    request,
    get,
    post,
    put,
    del,
  };
}
