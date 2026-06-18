import { prisma } from "../index";
import { resetDemoData } from "./demo-data";

try {
  await resetDemoData();
  console.log("ClaimFlow AI demo data reset.");
} catch (error) {
  console.error("Demo reset failed.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
