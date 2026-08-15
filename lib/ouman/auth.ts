import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

export function decodeJwtExp(jwt: string): number {
  const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
  return payload.exp as number;
}

// amazon-cognito-identity-js expects a browser-like global environment. In a
// headless Node runtime (Homey / tests) it needs a `navigator` stub; global
// `fetch` is provided by Node 18+. These shims run only when srpLogin is called.
function ensureShims(): void {
  const g = globalThis as any;
  if (typeof g.navigator === "undefined") g.navigator = { userAgent: "node" };
}

/**
 * Log in with e-mail + password using Cognito SRP (USER_SRP_AUTH). Runs only
 * during Homey pairing. Returns the long-lived refresh token plus the first
 * idToken so the caller can start reads immediately.
 */
export function srpLogin(opts: {
  userPoolId: string;
  clientId: string;
  email: string;
  password: string;
}): Promise<{ refreshToken: string; idToken: string; idTokenExp: number }> {
  ensureShims();
  const pool = new CognitoUserPool({ UserPoolId: opts.userPoolId, ClientId: opts.clientId });
  const user = new CognitoUser({ Username: opts.email, Pool: pool });
  const details = new AuthenticationDetails({ Username: opts.email, Password: opts.password });

  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken().getJwtToken();
        resolve({
          refreshToken: session.getRefreshToken().getToken(),
          idToken,
          idTokenExp: decodeJwtExp(idToken),
        });
      },
      onFailure: (err: Error) => reject(new Error(`SRP login failed: ${err.message || err}`)),
    });
  });
}

/** Mint a fresh idToken from the long-lived refresh token (REFRESH_TOKEN_AUTH). */
export async function refreshIdToken(
  opts: { region: string; clientId: string; refreshToken: string },
  fetchFn: typeof fetch = fetch,
): Promise<{ idToken: string; idTokenExp: number }> {
  const res = await fetchFn(`https://cognito-idp.${opts.region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: opts.clientId,
      AuthParameters: { REFRESH_TOKEN: opts.refreshToken },
    }),
  });
  const data = (await res.json()) as any;
  const idToken = data?.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error(`refresh failed: ${JSON.stringify(data).slice(0, 200)}`);
  return { idToken, idTokenExp: decodeJwtExp(idToken) };
}
