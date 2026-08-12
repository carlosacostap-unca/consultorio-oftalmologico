interface AdminRequestOptions {
  fetcher?: typeof fetch;
  getToken: () => Promise<string>;
  invalidateToken: () => void;
  options?: RequestInit;
  url: string;
}

export async function fetchWithAdminAuth({
  fetcher = fetch,
  getToken,
  invalidateToken,
  options = {},
  url,
}: AdminRequestOptions) {
  let token = await getToken();
  let response = await fetchAsAdmin(fetcher, url, options, token);

  if (response.status === 401) {
    invalidateToken();
    token = await getToken();
    response = await fetchAsAdmin(fetcher, url, options, token);
  }

  return response;
}

function fetchAsAdmin(fetcher: typeof fetch, url: string, options: RequestInit, token: string) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetcher(url, {
    ...options,
    headers,
    cache: "no-store",
  });
}
