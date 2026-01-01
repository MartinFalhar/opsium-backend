import fetch from "node-fetch";

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getGoSmsToken() {
  const now = Date.now();

  // znovu použij token, pokud ještě platí
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch("https://app.gosms.eu/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.GOSMS_CLIENT_ID,
      client_secret: process.env.GOSMS_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error("Nepodařilo se získat OAuth token");
  }

  const data = await res.json();
  
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000 - 60_000; // rezerva 1 min

  return cachedToken;
}

