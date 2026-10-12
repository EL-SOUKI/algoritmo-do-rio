import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3333/api/v1";

type Certificate = {
  id: string;
  certificateId: string;
  campaignId: string;
  companyWallet: string;
  recBurned: number;
  retiredWeightGrams: number;
  certificatePda: string;
  solanaSignature: string;
  network: string;
  createdOnchainAt: string;

  campaign: {
    id: string;
    name: string;
    materialType: string;
  };
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

type CompanySummary = {
  company: {
    id: string;
    name: string;
    email: string;
    walletAddress: string;
    role: string;
  };

  rec: {
    currentBalance: string;
    totalBurned: number;
  };

  impact: {
    retiredWeightGrams: number;
    retiredWeightKg: number;
    certificateCount: number;
  };

  solana: {
    network: string;
    recMint: string;
    recTokenAccount: string;
  };
};

function shortAddress(value: string) {
  if (value.length <= 20) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

export default function CompanyPanel({
  token,
}: {
  token: string;
}) {
  const [certificates, setCertificates] =
    useState<Certificate[]>([]);

  const [campaigns, setCampaigns] =
    useState<Campaign[]>([]);

  const [summary, setSummary] =
    useState<CompanySummary | null>(null);

  const [campaignId, setCampaignId] =
    useState("");

  const [recAmount, setRecAmount] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [burning, setBurning] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<Certificate | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [
        certificatesResponse,
        campaignsResponse,
        impactResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/company/certificates`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        ),
        fetch(`${API_URL}/campaigns`),
        fetch(
          `${API_URL}/company/summary`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        ),
      ]);

      if (
        !certificatesResponse.ok ||
        !campaignsResponse.ok ||
        !impactResponse.ok
      ) {
        throw new Error(
          "Could not load the company dashboard.",
        );
      }

      const certificatesJson =
        await certificatesResponse.json();

      const campaignsJson =
        await campaignsResponse.json();

      const impactJson =
        await impactResponse.json();

      setCertificates(
        certificatesJson.data,
      );

      setCampaigns(
        campaignsJson.data,
      );

      setSummary(
        impactJson.data,
      );

      const activeCampaigns =
        campaignsJson.data.filter(
          (campaign: Campaign) =>
            campaign.active,
        );

      if (activeCampaigns.length > 0) {
        setCampaignId(
          (current) =>
            current ||
            activeCampaigns[0].id,
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
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData]);

  const totalRecBurned = useMemo(
    () =>
      certificates.reduce(
        (total, certificate) =>
          total + certificate.recBurned,
        0,
      ),
    [certificates],
  );

  const totalRetiredGrams = useMemo(
    () =>
      certificates.reduce(
        (total, certificate) =>
          total +
          certificate.retiredWeightGrams,
        0,
      ),
    [certificates],
  );

  const currentBalance =
    Number(
      summary?.rec.currentBalance ??
        "0",
    );

  async function burnCertificate() {
    setError(null);
    setSuccess(null);

    const amount =
      Number(recAmount);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      setError(
        "Enter a whole number of REC.",
      );
      return;
    }

    if (amount > currentBalance) {
      setError(
        "Insufficient REC balance.",
      );
      return;
    }

    if (!campaignId) {
      setError(
        "Select a campaign.",
      );
      return;
    }

    setBurning(true);

    try {
      const response = await fetch(
        `${API_URL}/company/certificates/burn`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            campaignId,
            recAmount: amount,
          }),
        },
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ??
            json?.error ??
            `HTTP error ${response.status}`,
        );
      }

      setSuccess(
        json.data.certificate,
      );

      setRecAmount("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to issue certificate.",
      );
    } finally {
      setBurning(false);
    }
  }

  if (loading) {
    return (
      <section className="page-section">
        <p>
          Loading company dashboard...
        </p>
      </section>
    );
  }

  return (
    <section className="page-section">
      <p className="eyebrow">
        BURN-TO-CERTIFICATE
      </p>

      <h1>Corporate impact</h1>

      <p className="subtitle">
        Permanently retire REC and
        turn environmental impact into
        verifiable certificates on Solana.
      </p>

      <div className="company-stats">
        <article className="stat-card featured">
          <span className="stat-label">
            REC balance
          </span>

          <strong className="stat-value">
            {currentBalance}
            <small> REC</small>
          </strong>

          <p>
            Available for retirement.
          </p>
        </article>

        <article className="stat-card">
          <span className="stat-label">
            REC burned
          </span>

          <strong className="stat-value">
            {totalRecBurned}
          </strong>

          <p>
            Permanently removed from
            circulation.
          </p>
        </article>

        <article className="stat-card">
          <span className="stat-label">
            Retired impact
          </span>

          <strong className="stat-value">
            {(
              totalRetiredGrams / 1000
            ).toFixed(2)}
            <small> kg</small>
          </strong>

          <p>
            Material linked to certificates.
          </p>
        </article>

        <article className="stat-card">
          <span className="stat-label">
            Certificates
          </span>

          <strong className="stat-value">
            {certificates.length}
          </strong>

          <p>
            Corporate on-chain records.
          </p>
        </article>
      </div>

      <div className="company-layout">
        <article className="panel burn-card">
          <p className="eyebrow">
            RETIRE IMPACT
          </p>

          <h2>
            Issue new certificate
          </h2>

          <p className="company-description">
            Burned REC cannot return
            to circulation.
          </p>

          <label>
            Campaign

            <select
              value={campaignId}
              onChange={(event) =>
                setCampaignId(
                  event.target.value,
                )
              }
            >
              {campaigns
                .filter(
                  (campaign) =>
                    campaign.active,
                )
                .map((campaign) => (
                  <option
                    key={campaign.id}
                    value={campaign.id}
                  >
                    {campaign.name}
                  </option>
                ))}
            </select>
          </label>

          <label>
            REC amount

            <input
              type="number"
              min="1"
              step="1"
              max={currentBalance}
              value={recAmount}
              placeholder="e.g. 5"
              onChange={(event) =>
                setRecAmount(
                  event.target.value,
                )
              }
            />
          </label>

          <div className="burn-warning">
            This operation is irreversible.
            REC will be burned on the
            blockchain.
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            disabled={burning}
            onClick={() =>
              void burnCertificate()
            }
          >
            {burning
              ? "Issuing certificate..."
              : "Burn-to-Certificate"}
          </button>
        </article>

        <article className="panel corporate-wallet">
          <p className="eyebrow">
            COMPANY WALLET
          </p>

          <h2>
            {summary?.company.name ?? "Company"}
          </h2>

          <span className="company-label">
            Solana Wallet
          </span>

          <code>
            {summary?.company.walletAddress}
          </code>

          <span className="company-label">
            Network
          </span>

          <strong>
            {summary?.solana.network}
          </strong>

          <span className="company-label">
            REC available
          </span>

          <strong className="company-rec">
            {currentBalance} REC
          </strong>
        </article>
      </div>

      {success && (
        <div className="certificate-success">
          <div>
            <p className="eyebrow">
              CERTIFICATE ISSUED
            </p>

            <h2>
              Impact retired successfully
            </h2>

            <p>
              {success.recBurned} REC
              burned ·{" "}
              {(
                success.retiredWeightGrams /
                1000
              ).toFixed(3)}{" "}
              kg retired
            </p>
          </div>

          <span className="verified-badge">
            ON-CHAIN
          </span>
        </div>
      )}

      <section className="company-certificates">
        <div className="certificate-title">
          <div>
            <p className="eyebrow">
              PROOF OF IMPACT
            </p>

            <h2>
              Issued certificates
            </h2>
          </div>
        </div>

        {certificates.length === 0 ? (
          <div className="panel">
            No certificates issued.
          </div>
        ) : (
          <div className="certificate-list">
            {certificates.map(
              (certificate) => (
                <article
                  className="certificate-card"
                  key={certificate.id}
                >
                  <div className="certificate-card-header">
                    <div>
                      <span className="certificate-status">
                        ON-CHAIN CERTIFICATE
                      </span>

                      <h3>
                        {
                          certificate.campaign
                            .name
                        }
                      </h3>
                    </div>

                    <strong>
                      {
                        certificate.recBurned
                      }{" "}
                      REC
                    </strong>
                  </div>

                  <div className="certificate-metrics">
                    <div>
                      <span>
                        Retired impact
                      </span>

                      <strong>
                        {(
                          certificate
                            .retiredWeightGrams /
                          1000
                        ).toFixed(3)}{" "}
                        kg
                      </strong>
                    </div>

                    <div>
                      <span>
                        Certificate ID
                      </span>

                      <code>
                        {shortAddress(
                          certificate
                            .certificateId,
                        )}
                      </code>
                    </div>

                    <div>
                      <span>
                        Certificate PDA
                      </span>

                      <code>
                        {shortAddress(
                          certificate
                            .certificatePda,
                        )}
                      </code>
                    </div>

                    <div>
                      <span>
                        Transaction
                      </span>

                      <code>
                        {shortAddress(
                          certificate
                            .solanaSignature,
                        )}
                      </code>
                    </div>
                  </div>

                  <small>
                    {new Date(
                      certificate.createdOnchainAt,
                    ).toLocaleString(
                      "en-US",
                    )}
                  </small>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </section>
  );
}
