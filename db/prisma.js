const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function init() {
  try {
    await prisma.$connect();
    console.log("Connected to DB");
  } catch (e) {
    console.error("Failed to connect to DB", e);
    process.exit(1);
  }
}

init();

module.exports = prisma;
