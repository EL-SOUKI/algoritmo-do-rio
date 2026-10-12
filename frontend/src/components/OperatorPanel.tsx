import { useEffect, useState } from "react";

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
    PET_PLASTIC: "Plástico PET",
    OTHER_PLASTIC: "Outros plásticos",
    ALUMINUM: "Alumínio",
    GLASS: "Vidro",
    PAPER: "Papel",
    CARDBOARD: "Papelão",
    ELECTRONICS: "Eletrônicos",
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

  async function loadPending() {
    try {
      setError(null);

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
            `Erro HTTP ${response.status}`,
        );
      }

      setEvents(json.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar eventos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPending();
  }, [token]);

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
            `Falha na verificação: HTTP ${verifyResponse.status}`,
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
            `Falha na Solana: HTTP ${blockchainResponse.status}`,
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
          : "Erro ao processar reciclagem.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <section className="page-section">
        <p>Carregando fila do operador...</p>
      </section>
    );
  }

  return (
    <section className="page-section">
      <p className="eyebrow">
        OPERAÇÃO DO PONTO DE COLETA
      </p>

      <h1>Validação de reciclagem</h1>

      <p className="subtitle">
        Confira peso, material e campanha antes
        de registrar a prova na Solana.
      </p>

      <div className="operator-summary">
        <article className="panel">
          <span>Eventos pendentes</span>
          <strong>{events.length}</strong>
        </article>

        <article className="panel">
          <span>Papel do usuário</span>
          <strong>Operador</strong>
        </article>
      </div>

      {success && (
        <div className="operator-success">
          <div>
            <p className="eyebrow">
              REGISTRADO NA SOLANA
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
            <h2>Fila vazia</h2>
            <p>
              Não há descartes aguardando
              validação neste ponto.
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
                      AGUARDANDO VALIDAÇÃO
                    </p>

                    <h2>{event.publicId}</h2>
                  </div>

                  <span className="pending-badge">
                    PENDING
                  </span>
                </div>

                <div className="operator-details">
                  <div>
                    <span>Reciclador</span>
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
                    <span>Peso informado</span>
                    <strong>
                      {event.weightGrams / 1000} kg
                    </strong>
                  </div>

                  <div>
                    <span>Recompensa</span>
                    <strong className="rec-value">
                      {estimatedRec} REC
                    </strong>
                  </div>

                  <div>
                    <span>Ponto</span>
                    <strong>
                      {
                        event.collectionPoint
                          .name
                      }
                    </strong>
                  </div>

                  <div>
                    <span>Campanha</span>
                    <strong>
                      {event.campaign?.name ??
                        "—"}
                    </strong>
                  </div>
                </div>

                <div className="operator-warning">
                  Confirme fisicamente o peso e
                  o material antes de aprovar.
                  Após o registro on-chain, a
                  prova não poderá ser duplicada.
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
                    ? "Registrando na Solana..."
                    : `Aprovar e emitir ${estimatedRec} REC`}
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
