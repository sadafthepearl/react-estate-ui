import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log("Deleting all posts...");

    const deleted = await prisma.post.deleteMany({});

    console.log(`✅ Deleted ${deleted.count} posts`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
