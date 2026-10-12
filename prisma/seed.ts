import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEMO_RECYCLER_ID = "11111111-1111-4111-8111-111111111111";
const DEMO_OPERATOR_ID = "22222222-2222-4222-8222-222222222222";
const DEMO_POINT_ID = "33333333-3333-4333-8333-333333333333";

async function main() {
  const recycler = await prisma.user.upsert({
    where: { id: DEMO_RECYCLER_ID },
    update: {},
    create: {
      id: DEMO_RECYCLER_ID,
      name: "Demo Recycler",
      email: "recycler@recychain.local",
      role: "USER",
    },
  });

  const operator = await prisma.user.upsert({
    where: { id: DEMO_OPERATOR_ID },
    update: { role: "OPERATOR" },
    create: {
      id: DEMO_OPERATOR_ID,
      name: "Demo Operator",
      email: "operator@recychain.local",
      role: "OPERATOR",
    },
  });

  const point = await prisma.collectionPoint.upsert({
    where: { id: DEMO_POINT_ID },
    update: {},
    create: {
      id: DEMO_POINT_ID,
      name: "RecyChain Demo Point",
      address: "Demo collection point",
      latitude: -1.4558,
      longitude: -48.4902,
      supportedMaterials: ["PET_PLASTIC", "ALUMINUM", "GLASS", "PAPER"],
    },
  });

  await prisma.operatorAssignment.upsert({
    where: {
      operatorId_collectionPointId: {
        operatorId: operator.id,
        collectionPointId: point.id,
      },
    },
    update: {},
    create: {
      operatorId: operator.id,
      collectionPointId: point.id,
    },
  });

  console.log({ recycler, operator, collectionPoint: point });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
