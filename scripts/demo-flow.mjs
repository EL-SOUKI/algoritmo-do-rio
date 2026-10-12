const API = process.env.API_URL ?? "http://localhost:3333/api/v1";
const recyclerId = "11111111-1111-4111-8111-111111111111";
const operatorId = "22222222-2222-4222-8222-222222222222";
const collectionPointId = "33333333-3333-4333-8333-333333333333";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body.data;
}

console.log("1. Creating a 2.4kg PET recycling event...");
const event = await request("/recycling-events", {
  method: "POST",
  body: JSON.stringify({
    recyclerId,
    collectionPointId,
    materialType: "PET_PLASTIC",
    weightGrams: 2400,
  }),
});
console.log({ id: event.id, publicId: event.publicId, status: event.status });

console.log("2. Operator verifies the event...");
const verified = await request(`/recycling-events/${event.id}/verify`, {
  method: "POST",
  body: JSON.stringify({ operatorId }),
});
console.log({
  status: verified.status,
  rewardPoints: verified.rewardPoints,
  proofHash: verified.proofHash,
});

console.log("3. Recording through the configured blockchain gateway...");
const recorded = await request(`/recycling-events/${event.id}/record-onchain`, {
  method: "POST",
});
console.log({
  status: recorded.event.status,
  signature: recorded.event.solanaSignature,
  network: recorded.blockchain.network,
});

if (recorded.blockchain.network === "mock") {
  console.log("NOTE: mock mode does not submit a real Solana transaction.");
}
