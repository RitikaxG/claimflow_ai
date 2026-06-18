import { prisma } from "../index";
import { seedDemoData } from "./demo-data";

try {
  const result = await seedDemoData();
  console.log("ClaimFlow AI demo data seeded.");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Demo seed failed.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
