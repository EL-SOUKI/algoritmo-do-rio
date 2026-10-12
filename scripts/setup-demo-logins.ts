import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const RECYCLER_ID =
  "1466eff4-8d51-4bde-a2ab-4842c2e8cb83";

const OPERATOR_ID =
  "8ae63cf6-89bd-4acd-a653-5837b64f7a19";

const RECYCLER_PASSWORD =
  "RioRecycler2026!";

const OPERATOR_PASSWORD =
  "RioOperator2026!";

async function main() {
  const recycler =
    await prisma.user.findUnique({
      where: {
        id: RECYCLER_ID,
      },
    });

  const operator =
    await prisma.user.findUnique({
      where: {
        id: OPERATOR_ID,
      },
    });

  if (!recycler) {
    throw new Error(
      "Recycler demo not found.",
    );
  }

  if (!operator) {
    throw new Error(
      "Operator demo not found.",
    );
  }

  const recyclerHash =
    await bcrypt.hash(
      RECYCLER_PASSWORD,
      12,
    );

  const operatorHash =
    await bcrypt.hash(
      OPERATOR_PASSWORD,
      12,
    );

  const updatedRecycler =
    await prisma.user.update({
      where: {
        id: RECYCLER_ID,
      },
      data: {
        passwordHash:
          recyclerHash,
        role: "USER",
      },
    });

  const updatedOperator =
    await prisma.user.update({
      where: {
        id: OPERATOR_ID,
      },
      data: {
        passwordHash:
          operatorHash,
        role: "OPERATOR",
      },
    });

  console.log(
    "\n=== LOGINS DEMO CONFIGURADOS ===\n",
  );

  console.log(
    "RECICLADOR:",
    updatedRecycler.email,
    "| role:",
    updatedRecycler.role,
  );

  console.log(
    "OPERADOR:",
    updatedOperator.email,
    "| role:",
    updatedOperator.role,
  );

  console.log(
    "\n✅ Password hashes salvos.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
