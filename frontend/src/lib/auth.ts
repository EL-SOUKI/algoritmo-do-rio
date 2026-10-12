const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3333/api/v1";

const TOKEN_KEY =
  "algoritmo_do_rio_token";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  walletAddress: string | null;
  role: "USER" | "OPERATOR" | "COMPANY" | "ADMIN";
};

export function getStoredToken() {
  return localStorage.getItem(
    TOKEN_KEY,
  );
}

export function setStoredToken(
  token: string,
) {
  localStorage.setItem(
    TOKEN_KEY,
    token,
  );
}

export function clearStoredToken() {
  localStorage.removeItem(
    TOKEN_KEY,
  );
}

export async function loginUser(
  email: string,
  password: string,
) {
  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      json?.message ??
        "Invalid email or password.",
    );
  }

  return json.data as {
    user: AuthUser;
    token: string;
  };
}

export async function getMe(
  token: string,
) {
  const response = await fetch(
    `${API_URL}/auth/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    },
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      json?.message ??
        "Invalid session.",
    );
  }

  return json.data as AuthUser;
}
