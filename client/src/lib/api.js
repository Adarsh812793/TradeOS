/* 1. API Configuration */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* 2. Authentication hooks */
// AuthContext fills these in (see configureAuth). The API client never imports AuthContext itself.
const authHooks = {
  getAccessToken: () => null, // returns the newest access token (read from a ref, never stale)
  onTokenRefreshed: () => {}, // called with the new access token after a successful renewal
  onSessionExpired: () => {}, // called when the refresh token itself is rejected: the login is over
};

// Lets AuthContext give the API client what it needs to attach, renew and give up on the login.
export function configureAuth(hooks) {
  Object.assign(authHooks, hooks);
}

/* 3. Renewing the access token */
// The access token lives 15 minutes. When the server answers 401 with one of these codes, the client renews
// it (using the refresh-token cookie) and repeats the request once, so the user never notices.
const RENEWABLE_ERROR_CODES = ["ACCESS_TOKEN_EXPIRED", "ACCESS_TOKEN_INVALID"];

// Browsers share this lock between tabs, so only one tab renews at a time
const REFRESH_LOCK_NAME = "tradeos-token-refresh";

// The renewal currently in progress, if any. Every request that fails while it runs waits for THIS one
// instead of starting its own, because each refresh token works only once (a second use looks like theft).
let refreshPromise = null;

// Calls the refresh endpoint and hands the new access token to AuthContext before returning it.
async function callRefreshEndpoint() {
  // Plain fetch (not apiRequest) so a failing renewal can never trigger another renewal
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  const data = await readBody(response);

  if (!response.ok) {
    const error = new Error(
      data?.message || `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  const token = data.data.accessToken;

  // Stored immediately (not after a React render), so the retried request already sends the new token
  authHooks.onTokenRefreshed(token);

  return token;
}

// Runs the renewal inside a cross-tab lock when the browser supports it (Web Locks API).
function runRefresh() {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK_NAME, callRefreshEndpoint);
  }

  return callRefreshEndpoint();
}

// Renews the access token. Callers that arrive while a renewal is running all share that one renewal.
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

// Resolves when no renewal is running (logout waits for this, so a late response cannot restore a cleared login).
export function waitForPendingRefresh() {
  return refreshPromise ? refreshPromise.catch(() => {}) : Promise.resolve();
}

// Decides what to do after a request failed with an expired token. Returns true if the request should be repeated.
async function renewAccessToken(tokenUsed) {
  // Another request already renewed the token while this one was in flight: just repeat with the new one
  if (authHooks.getAccessToken() !== tokenUsed) {
    return true;
  }

  try {
    await refreshSession();
    return true;
  } catch (refreshError) {
    // Only a 401 means the login is really over. A 429, a 5xx or a network failure keeps the user logged in
    // (the original request simply fails and can be tried again).
    if (refreshError.status === 401) {
      authHooks.onSessionExpired();
    }

    return false;
  }
}

/* 4. Sending one request */
// Sends the request once with the newest access token. Returns the response and the token it used.
async function sendRequest(path, options) {
  // 4.1 Separate request headers and body from other fetch options.
  const {
    headers = {},
    body,
    ...customOptions
  } = options;

  // 4.2 Retrieve the latest access token before constructing the request.
  const token = authHooks.getAccessToken();

  // 4.3 Build common request options, including cookies and authentication.
  const requestOptions = {
    ...customOptions,
    credentials: "include",
    headers: {
      ...headers,
      ...(token && {
        Authorization: `Bearer ${token}`,
      }),
    },
  };

  // 4.4 Serialize JavaScript request bodies and set their content type.
  if (body instanceof FormData) {
    // File uploads: send as-is. The browser adds the multipart Content-Type (with its boundary) itself.
    requestOptions.body = body;
  } else if (body !== undefined) {
    requestOptions.body =
      typeof body === "string" ? body : JSON.stringify(body);

    if (
      typeof body !== "string" &&
      !requestOptions.headers["Content-Type"]
    ) {
      requestOptions.headers["Content-Type"] = "application/json";
    }
  }

  // 4.5 Send the request to the configured backend.
  const response = await fetch(`${API_BASE_URL}${path}`, requestOptions);

  return { response, tokenUsed: token };
}

// Parses a response body according to its content type (null when there is none).
async function readBody(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

/* 5. Common HTTP Request Handler */
async function apiRequest(path, options = {}) {
  // 5.1 Send the request.
  let { response, tokenUsed } = await sendRequest(path, options);
  let data = await readBody(response);

  // 5.2 Expired access token: renew it and repeat the request ONCE (never loops).
  // Safe for orders too: the server rejects an expired token before doing anything.
  if (
    response.status === 401 &&
    RENEWABLE_ERROR_CODES.includes(data?.errorCode) &&
    (await renewAccessToken(tokenUsed))
  ) {
    ({ response } = await sendRequest(path, options));
    data = await readBody(response);
  }

  // 5.3 Convert unsuccessful HTTP responses into predictable errors.
  if (!response.ok) {
    const error = new Error(
      data?.message || `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  // 5.4 Return the parsed response to the calling feature.
  return data;
}

/* 6. Shared HTTP Methods */
const api = {
  // 6.1 Send GET requests.
  get(path, options = {}) {
    return apiRequest(path, {
      ...options,
      method: "GET",
    });
  },

  // 6.2 Send POST requests with an optional body.
  post(path, body, options = {}) {
    return apiRequest(path, {
      ...options,
      method: "POST",
      body,
    });
  },

  // 6.3 Send PATCH requests with an optional body.
  patch(path, body, options = {}) {
    return apiRequest(path, {
      ...options,
      method: "PATCH",
      body,
    });
  },

  // 6.4 Send DELETE requests.
  delete(path, options = {}) {
    return apiRequest(path, {
      ...options,
      method: "DELETE",
    });
  },
};

/* 7. Export the Shared API Client */
export default api;
