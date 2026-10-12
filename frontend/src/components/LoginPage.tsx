import { useState } from "react";
import type {
  FormEvent,
} from "react";

import {
  loginUser,
  setStoredToken,
} from "../lib/auth";

import type {
  AuthUser,
} from "../lib/auth";

type Props = {
  onLogin: (
    token: string,
    user: AuthUser,
  ) => void;
};

export default function LoginPage({
  onLogin,
}: Props) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const result =
        await loginUser(
          email,
          password,
        );

      setStoredToken(
        result.token,
      );

      onLogin(
        result.token,
        result.user,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao entrar.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            AR
          </div>

          <div>
            <strong>
              Algoritmo do Rio
            </strong>

            <span>
              DePIN / ReFi Amazônia
            </span>
          </div>
        </div>

        <div className="login-heading">
          <p className="eyebrow">
            ACESSO AO PROTOCOLO
          </p>

          <h1>Entrar</h1>

          <p>
            Acesse seu impacto e suas
            operações registradas na
            Solana.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={submit}
        >
          <label>
            Email

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="seu@email.com"
            />
          </label>

          <label>
            Senha

            <input
              type="password"
              required
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Sua senha"
            />
          </label>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            disabled={loading}
            type="submit"
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
