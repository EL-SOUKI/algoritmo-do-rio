import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const EMAIL =
  "company-demo@algoritmodorio.local";

const PASSWORD =
  "RioCompany2026!";

const WALLET =
  "7iPWmaBrHYvcDnaXenEdE8JPQFUYAYyEda5rZCT9dK4b";

async function main() {
  const walletOwner =
    await prisma.user.findUnique({
      where: {
        walletAddress: WALLET,
      },
    });

  if (
    walletOwner &&
    walletOwner.email !== EMAIL
  ) {
    throw new Error(
      `Wallet already belongs to ${walletOwner.email}`,
    );
  }

  const passwordHash =
    await bcrypt.hash(
      PASSWORD,
      12,
    );

  const existing =
    await prisma.user.findUnique({
      where: {
        email: EMAIL,
      },
    });

  const company = existing
    ? await prisma.user.update({
        where: {
          id: existing.id,
        },
        data: {
          name: "Empresa Demo",
          walletAddress: WALLET,
          passwordHash,
          role: "COMPANY",
        },
      })
    : await prisma.user.create({
        data: {
          name: "Empresa Demo",
          email: EMAIL,
          walletAddress: WALLET,
          passwordHash,
          role: "COMPANY",
        },
      });

  console.log(
    "\n=== EMPRESA DEMO CONFIGURADA ===\n",
  );

  console.log(
    "ID:",
    company.id,
  );

  console.log(
    "Nome:",
    company.name,
  );

  console.log(
    "Email:",
    company.email,
  );

  console.log(
    "Role:",
    company.role,
  );

  console.log(
    "Wallet:",
    company.walletAddress,
  );

  console.log(
    "\n✅ Usuário COMPANY criado.",
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
