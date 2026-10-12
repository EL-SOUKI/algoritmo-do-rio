import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./index.css";
import LoginPage from "./components/LoginPage";
import {
  clearStoredToken,
  getMe,
  getStoredToken,
} from "./lib/auth";
import type {
  AuthUser,
} from "./lib/auth";
import CompanyPanel from "./components/CompanyPanel";
import OperatorPanel from "./components/OperatorPanel";

type View =
  | "dashboard"
  | "recycle"
  | "operator"
  | "company"
  | "history"
  | "wallet";

type HistoryItem = {
  id: string;
  publicId: string;
  materialType: string;
  weightGrams: number;
  recIssued: number;
  collectionPoint: string;
  campaign: string | null;
  solanaSignature: string | null;
  recordedOnchainAt: string | null;
};

type ImpactData = {
  recycler: {
    id: string;
    name: string;
    walletAddress: string;
  };
  impact: {
    totalWeightGrams: number;
    totalWeightKg: number;
    totalRecIssued: number;
    currentRecBalance: string;
    onchainEvents: number;
  };
  solana: {
    network: string;
    recMint: string;
    recTokenAccount: string;
  };
  history: HistoryItem[];
};

type CollectionPoint = {
  id: string;
  name: string;
  address: string;
  supportedMaterials: string[];
  status: string;
};

type Campaign = {
  id: string;
  name: string;
  materialType: string;
  rewardRecPerKg: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

type CreatedEvent = {
  id: string;
  publicId: string;
  status: string;
  weightGrams: number;
  campaignId: string;
};

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3333/api/v1";

function shortAddress(value: string) {
  if (value.length <= 16) return value;
  return `${value.slice(0, 7)}...${value.slice(-6)}`;
}

function materialLabel(material: string) {
  const labels: Record<string, string> = {
    PET_PLASTIC: "PET Plastic",
    OTHER_PLASTIC: "Other Plastics",
    ALUMINUM: "Aluminum",
    GLASS: "Glass",
    PAPER: "Paper",
    CARDBOARD: "Cardboard",
    ELECTRONICS: "Electronics",
  };

  return labels[material] ?? material;
}

function App() {
  const [token, setToken] =
    useState(
      () => getStoredToken() ?? "",
    );

  const [authUser, setAuthUser] =
    useState<AuthUser | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [view, setView] =
    useState<View>("dashboard");

  const [impact, setImpact] =
    useState<ImpactData | null>(null);

  const [points, setPoints] =
    useState<CollectionPoint[]>([]);

  const [campaigns, setCampaigns] =
    useState<Campaign[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedPoint, setSelectedPoint] =
    useState("");

  const [selectedCampaign, setSelectedCampaign] =
    useState("");

  const [material, setMaterial] =
    useState("PET_PLASTIC");

  const [weightKg, setWeightKg] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [createdEvent, setCreatedEvent] =
    useState<CreatedEvent | null>(null);

  const [formError, setFormError] =
    useState<string | null>(null);

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const user =
          await getMe(token);

        setAuthUser(user);
      } catch {
        clearStoredToken();
        setToken("");
        setAuthUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    void restoreSession();
  }, [token]);

  useEffect(() => {
    if (
      !token ||
      !authUser ||
      authUser.role !== "USER"
    ) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [
          impactResponse,
          pointsResponse,
          campaignsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/me/impact`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          ),
          fetch(
            `${API_URL}/collection-points`,
          ),
          fetch(
            `${API_URL}/campaigns`,
          ),
        ]);

        if (
          !impactResponse.ok ||
          !pointsResponse.ok ||
          !campaignsResponse.ok
        ) {
          throw new Error(
            "Could not load data from the API.",
          );
        }

        const impactJson =
          await impactResponse.json();

        const pointsJson =
          await pointsResponse.json();

        const campaignsJson =
          await campaignsResponse.json();

        setImpact(
          impactJson.data,
        );

        setPoints(
          pointsJson.data,
        );

        setCampaigns(
          campaignsJson.data,
        );

        if (
          pointsJson.data.length > 0
        ) {
          setSelectedPoint(
            pointsJson.data[0].id,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, authUser]);

  const availableCampaigns = useMemo(() => {
    const now = Date.now();

    return campaigns.filter(
      (campaign) =>
        campaign.active &&
        campaign.materialType === material &&
        new Date(campaign.startsAt).getTime() <= now &&
        new Date(campaign.endsAt).getTime() >= now,
    );
  }, [campaigns, material]);

  useEffect(() => {
    const stillAvailable =
      availableCampaigns.some(
        (campaign) =>
          campaign.id === selectedCampaign,
      );

    if (!stillAvailable) {
      setSelectedCampaign(
        availableCampaigns[0]?.id ?? "",
      );
    }
  }, [
    availableCampaigns,
    selectedCampaign,
  ]);

  const selectedCampaignData =
    availableCampaigns.find(
      (campaign) =>
        campaign.id === selectedCampaign,
    );

  const estimatedRec = useMemo(() => {
    const weight = Number(weightKg);

    if (
      !Number.isFinite(weight) ||
      weight <= 0 ||
      !selectedCampaignData
    ) {
      return 0;
    }

    const grams = Math.round(weight * 1000);

    return Math.max(
      Math.floor(
        (
          grams *
            selectedCampaignData.rewardRecPerKg +
          500
        ) / 1000,
      ),
      1,
    );
  }, [
    weightKg,
    selectedCampaignData,
  ]);

  async function createRecyclingEvent(
    event: FormEvent,
  ) {
    event.preventDefault();

    setFormError(null);
    setCreatedEvent(null);

    const weight = Number(weightKg);

    if (!selectedPoint) {
      setFormError(
        "Select a collection point.",
      );
      return;
    }

    if (!selectedCampaign) {
      setFormError(
        "No active campaign is available.",
      );
      return;
    }

    if (
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      setFormError(
        "Enter a valid weight.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/me/recycling-events`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            collectionPointId:
              selectedPoint,
            campaignId:
              selectedCampaign,
            materialType: material,
            weightGrams:
              Math.round(weight * 1000),
            metadata: {
              source:
                "recycler-web-app",
            },
          }),
        },
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ??
            json?.error ??
            `HTTP error ${response.status}`,
        );
      }

      setCreatedEvent(json.data);
      setWeightKg("");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to register recycling.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    clearStoredToken();
    setToken("");
    setAuthUser(null);
    setImpact(null);
    setView("dashboard");
  }

  if (authLoading) {
    return (
      <main className="state-page">
        <div className="loader" />
        <p>Loading session...</p>
      </main>
    );
  }

  if (!token || !authUser) {
    return (
      <LoginPage
        onLogin={(
          nextToken,
          user,
        ) => {
          setToken(nextToken);
          setAuthUser(user);
        }}
      />
    );
  }

  if (authUser.role === "COMPANY") {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              AR
            </div>

            <div>
              <strong>
                Algoritmo do Rio
              </strong>

              <span>
                DePIN / ReFi Amazon
              </span>
            </div>
          </div>

          <nav>
            <button
              className="nav-item active"
            >
              Company
            </button>
          </nav>

          <div className="session-card">
            <span>
              {authUser.name}
            </span>

            <small>
              {authUser.role}
            </small>

            <button
              className="logout-button"
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="content">
          <CompanyPanel
            token={token}
          />
        </main>
      </div>
    );
  }

  if (
    authUser.role === "OPERATOR" ||
    authUser.role === "ADMIN"
  ) {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              AR
            </div>

            <div>
              <strong>
                Algoritmo do Rio
              </strong>

              <span>
                DePIN / ReFi Amazon
              </span>
            </div>
          </div>

          <nav>
            <button
              className="nav-item active"
            >
              Operator
            </button>
          </nav>

          <div className="session-card">
            <span>
              {authUser.name}
            </span>

            <small>
              {authUser.role}
            </small>

            <button
              className="logout-button"
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="content">
          <OperatorPanel
            token={token}
          />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="state-page">
        <div className="loader" />
        <p>Loading...</p>
      </main>
    );
  }

  if (error || !impact) {
    return (
      <main className="state-page">
        <h1>Failed to load</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            AR
          </div>

          <div>
            <strong>
              Algoritmo do Rio
            </strong>
            <span>
              DePIN / ReFi Amazon
            </span>
          </div>
        </div>

        <nav>
          <button
            className={`nav-item ${
              view === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setView("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            className={`nav-item ${
              view === "recycle"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setView("recycle")
            }
          >
            Recycle
          </button>





          <button
            className={`nav-item ${
              view === "history"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setView("history")
            }
          >
            History
          </button>

          <button
            className={`nav-item ${
              view === "wallet"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setView("wallet")
            }
          >
            Wallet
          </button>
        </nav>

        <button
          className="logout-button"
          onClick={logout}
        >
          Sign out
        </button>

        <div className="network-card">
          <span className="status-dot" />

          <div>
            <strong>Solana</strong>
            <small>
              {impact.solana.network}
            </small>
          </div>
        </div>
      </aside>

      <main className="content">
        {view === "dashboard" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">
                  ENVIRONMENTAL IMPACT
                </p>

                <h1>
                  Hello, {impact.recycler.name}
                </h1>

                <p className="subtitle">
                  Your impact is recorded
                  and auditable on Solana.
                </p>
              </div>

              <div className="wallet-pill">
                <span>Wallet</span>
                <strong>
                  {shortAddress(
                    impact.recycler
                      .walletAddress,
                  )}
                </strong>
              </div>
            </header>

            <section className="stats-grid">
              <article className="stat-card featured">
                <span className="stat-label">
                  Total recycled
                </span>

                <strong className="stat-value">
                  {impact.impact.totalWeightKg}
                  <small> kg</small>
                </strong>

                <p>
                  Material verified by
                  collection points.
                </p>
              </article>

              <article className="stat-card">
                <span className="stat-label">
                  REC balance
                </span>

                <strong className="stat-value">
                  {
                    impact.impact
                      .currentRecBalance
                  }
                  <small> REC</small>
                </strong>

                <p>
                  Environmental tokens in your
                  wallet.
                </p>
              </article>

              <article className="stat-card">
                <span className="stat-label">
                  REC issued
                </span>

                <strong className="stat-value">
                  {
                    impact.impact
                      .totalRecIssued
                  }
                </strong>

                <p>
                  Rewards generated through
                  recycling.
                </p>
              </article>

              <article className="stat-card">
                <span className="stat-label">
                  On-chain records
                </span>

                <strong className="stat-value">
                  {
                    impact.impact
                      .onchainEvents
                  }
                </strong>

                <p>
                  Verifiable proofs on
                  Solana.
                </p>
              </article>
            </section>
          </>
        )}

        {view === "recycle" && (
          <section className="page-section">
            <p className="eyebrow">
              NEW RECYCLING EVENT
            </p>

            <h1>Register recycling</h1>

            <p className="subtitle">
              Register the material delivered
              at a collection point.
            </p>

            <div className="recycle-layout">
              <form
                className="panel recycle-form"
                onSubmit={
                  createRecyclingEvent
                }
              >
                <label>
                  Collection point

                  <select
                    value={selectedPoint}
                    onChange={(event) =>
                      setSelectedPoint(
                        event.target.value,
                      )
                    }
                  >
                    {points.map((point) => (
                      <option
                        key={point.id}
                        value={point.id}
                      >
                        {point.name} —{" "}
                        {point.address}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Material

                  <select
                    value={material}
                    onChange={(event) =>
                      setMaterial(
                        event.target.value,
                      )
                    }
                  >
                    <option value="PET_PLASTIC">
                      PET Plastic
                    </option>

                    <option value="OTHER_PLASTIC">
                      Other Plastics
                    </option>

                    <option value="ALUMINUM">
                      Aluminum
                    </option>

                    <option value="GLASS">
                      Glass
                    </option>

                    <option value="PAPER">
                      Paper
                    </option>

                    <option value="CARDBOARD">
                      Cardboard
                    </option>

                    <option value="ELECTRONICS">
                      Electronics
                    </option>
                  </select>
                </label>

                <label>
                  Campaign

                  <select
                    value={
                      selectedCampaign
                    }
                    onChange={(event) =>
                      setSelectedCampaign(
                        event.target.value,
                      )
                    }
                  >
                    {availableCampaigns.length ===
                    0 ? (
                      <option value="">
                        No campaign
                        available
                      </option>
                    ) : (
                      availableCampaigns.map(
                        (campaign) => (
                          <option
                            key={campaign.id}
                            value={
                              campaign.id
                            }
                          >
                            {campaign.name} —{" "}
                            {
                              campaign.rewardRecPerKg
                            }{" "}
                            REC/kg
                          </option>
                        ),
                      )
                    )}
                  </select>
                </label>

                <label>
                  Weight in kg

                  <input
                    type="number"
                    min="0.001"
                    max="500"
                    step="0.001"
                    placeholder="e.g. 2.4"
                    value={weightKg}
                    onChange={(event) =>
                      setWeightKg(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <div className="reward-preview">
                  <span>
                    Estimated reward
                  </span>

                  <strong>
                    {estimatedRec} REC
                  </strong>
                </div>

                {formError && (
                  <div className="form-error">
                    {formError}
                  </div>
                )}

                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedCampaign
                  }
                >
                  {submitting
                    ? "Registering..."
                    : "Register recycling event"}
                </button>
              </form>

              <aside className="panel process-card">
                <p className="eyebrow">
                  HOW IT WORKS
                </p>

                <h2>
                  From collection to blockchain
                </h2>

                <ol>
                  <li>
                    You register the recycling event.
                  </li>
                  <li>
                    The collection point verifies
                    weight and material.
                  </li>
                  <li>
                    The operator approves the proof.
                  </li>
                  <li>
                    The protocol records it on
                    Solana.
                  </li>
                  <li>
                    REC is sent to your
                    wallet.
                  </li>
                </ol>
              </aside>
            </div>

            {createdEvent && (
              <div className="success-card">
                <div>
                  <p className="eyebrow">
                    RECYCLING EVENT REGISTERED
                  </p>

                  <h2>
                    {createdEvent.publicId}
                  </h2>

                  <p>
                    The event was created and is
                    awaiting validation by the
                    operator.
                  </p>
                </div>

                <span className="pending-badge">
                  {createdEvent.status}
                </span>
              </div>
            )}
          </section>
        )}

        {view === "operator" && (
          <OperatorPanel token={token} />
        )}

        {view === "company" && (
          <CompanyPanel
            token={token}
          />
        )}

        {view === "history" && (
          <section className="page-section">
            <p className="eyebrow">
              PROOF OF RECYCLING
            </p>

            <h1>History</h1>

            <div className="panel history-panel">
              <div className="history-list">
                {impact.history.map(
                  (event) => (
                    <article
                      className="history-item"
                      key={event.id}
                    >
                      <div className="history-main">
                        <div className="material-icon">
                          ♻
                        </div>

                        <div>
                          <strong>
                            {materialLabel(
                              event.materialType,
                            )}
                          </strong>

                          <span>
                            {event.publicId}
                          </span>
                        </div>
                      </div>

                      <div className="history-metric">
                        <span>Weight</span>
                        <strong>
                          {event.weightGrams /
                            1000}{" "}
                          kg
                        </strong>
                      </div>

                      <div className="history-metric">
                        <span>REC</span>
                        <strong>
                          +{event.recIssued}
                        </strong>
                      </div>

                      <div className="history-metric">
                        <span>Collection point</span>
                        <strong>
                          {
                            event.collectionPoint
                          }
                        </strong>
                      </div>

                      <div className="history-proof">
                        <span>Solana</span>
                        <code>
                          {event.solanaSignature
                            ? shortAddress(
                                event.solanaSignature,
                              )
                            : "-"}
                        </code>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </div>
          </section>
        )}

        {view === "wallet" && (
          <section className="page-section">
            <p className="eyebrow">
              SOLANA
            </p>

            <h1>Your wallet</h1>

            <div className="blockchain-grid">
              <article className="panel">
                <p className="eyebrow">
                  WALLET
                </p>

                <h2>
                  Public address
                </h2>

                <code className="address">
                  {
                    impact.recycler
                      .walletAddress
                  }
                </code>
              </article>

              <article className="panel">
                <p className="eyebrow">
                  BALANCE
                </p>

                <h2>
                  {
                    impact.impact
                      .currentRecBalance
                  }{" "}
                  REC
                </h2>
              </article>

              <article className="panel">
                <p className="eyebrow">
                  REC MINT
                </p>

                <code className="address">
                  {impact.solana.recMint}
                </code>
              </article>

              <article className="panel">
                <p className="eyebrow">
                  TOKEN ACCOUNT
                </p>

                <code className="address">
                  {
                    impact.solana
                      .recTokenAccount
                  }
                </code>
              </article>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
