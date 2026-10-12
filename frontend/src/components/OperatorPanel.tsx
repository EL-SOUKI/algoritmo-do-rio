import { useCallback, useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3333/api/v1";

type PendingEvent = {
  id: string;
  publicId: string;
  materialType: string;
  weightGrams: number;
  status: string;

  recycler: {
    name: string;
    walletAddress: string | null;
  };

  collectionPoint: {
    name: string;
    address: string;
  };

  campaign: {
    name: string;
    rewardRecPerKg: number;
  } | null;
};

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

export default function OperatorPanel({
  token,
}: {
  token: string;
}) {
  const [events, setEvents] =
    useState<PendingEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<{
      publicId: string;
      signature: string;
    } | null>(null);

  const loadPending = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/operator/pending-events`,
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
            `HTTP error ${response.status}`,
        );
      }

      setEvents(json.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load events.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPending();
    });
  }, [loadPending]);

  async function approveEvent(
    event: PendingEvent,
  ) {
    setProcessingId(event.id);
    setError(null);
    setSuccess(null);

    try {
      const verifyResponse = await fetch(
        `${API_URL}/operator/recycling-events/${event.id}/verify`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );

      const verifyJson =
        await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(
          verifyJson?.message ??
            verifyJson?.error ??
            `Verification failed: HTTP ${verifyResponse.status}`,
        );
      }

      const blockchainResponse = await fetch(
        `${API_URL}/operator/recycling-events/${event.id}/record-onchain`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );

      const blockchainJson =
        await blockchainResponse.json();

      if (!blockchainResponse.ok) {
        throw new Error(
          blockchainJson?.message ??
            blockchainJson?.error ??
            `Solana transaction failed: HTTP ${blockchainResponse.status}`,
        );
      }

      setSuccess({
        publicId: event.publicId,
        signature:
          blockchainJson.data.blockchain
            .signature,
      });

      await loadPending();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process recycling.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <section className="page-section">
        <p>Loading operator queue...</p>
      </section>
    );
  }

  return (
    <section className="page-section">
      <p className="eyebrow">
        COLLECTION POINT OPERATIONS
      </p>

      <h1>Recycling validation</h1>

      <p className="subtitle">
        Check weight, material and campaign before
        recording the proof on Solana.
      </p>

      <div className="operator-summary">
        <article className="panel">
          <span>Pending events</span>
          <strong>{events.length}</strong>
        </article>

        <article className="panel">
          <span>User role</span>
          <strong>Operator</strong>
        </article>
      </div>

      {success && (
        <div className="operator-success">
          <div>
            <p className="eyebrow">
              RECORDED ON SOLANA
            </p>

            <strong>
              {success.publicId}
            </strong>

            <code>
              {success.signature}
            </code>
          </div>

          <span className="verified-badge">
            ON-CHAIN
          </span>
        </div>
      )}

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="operator-events">
        {events.length === 0 ? (
          <div className="panel empty-queue">
            <h2>Queue empty</h2>
            <p>
              There are no recycling events awaiting
              validation at this collection point.
            </p>
          </div>
        ) : (
          events.map((event) => {
            const estimatedRec =
              event.campaign
                ? Math.max(
                    Math.floor(
                      (
                        event.weightGrams *
                          event.campaign
                            .rewardRecPerKg +
                        500
                      ) /
                        1000,
                    ),
                    1,
                  )
                : 0;

            return (
              <article
                className="operator-event-card"
                key={event.id}
              >
                <div className="operator-event-header">
                  <div>
                    <p className="eyebrow">
                      AWAITING VALIDATION
                    </p>

                    <h2>{event.publicId}</h2>
                  </div>

                  <span className="pending-badge">
                    PENDING
                  </span>
                </div>

                <div className="operator-details">
                  <div>
                    <span>Recycler</span>
                    <strong>
                      {event.recycler.name}
                    </strong>
                  </div>

                  <div>
                    <span>Material</span>
                    <strong>
                      {materialLabel(
                        event.materialType,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Reported weight</span>
                    <strong>
                      {event.weightGrams / 1000} kg
                    </strong>
                  </div>

                  <div>
                    <span>Reward</span>
                    <strong className="rec-value">
                      {estimatedRec} REC
                    </strong>
                  </div>

                  <div>
                    <span>Collection point</span>
                    <strong>
                      {
                        event.collectionPoint
                          .name
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Campaign</span>
                    <strong>
                      {event.campaign?.name ??
                        "—"}
                    </strong>
                  </div>
                </div>

                <div className="operator-warning">
                  Physically confirm the weight and
                  material before approving.
                  After the on-chain record, the
                  proof cannot be duplicated.
                </div>

                <button
                  className="primary-button"
                  disabled={
                    processingId !== null
                  }
                  onClick={() =>
                    void approveEvent(event)
                  }
                >
                  {processingId === event.id
                    ? "Recording on Solana..."
                    : `Approve and issue ${estimatedRec} REC`}
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
