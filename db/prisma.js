const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.$connect();
  } catch (e) {
    console.log(e);
  }
})();

module.exports = prisma;
