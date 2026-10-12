import { prisma } from "../src/lib/prisma.js";

async function main() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ role: string }>
  >(
    'SELECT unnest(enum_range(NULL::"UserRole"))::text AS role'
  );

  console.log(
    rows.map((row) => row.role).join("\n")
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
