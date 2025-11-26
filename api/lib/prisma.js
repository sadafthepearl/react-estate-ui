import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();
console.log("DB URL:", process.env.DATABASE_URL);

export default prisma;
