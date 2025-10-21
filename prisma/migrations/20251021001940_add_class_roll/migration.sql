-- CreateTable
CREATE TABLE "classRoll" (
    "id" SERIAL NOT NULL,
    "githubName" TEXT NOT NULL,

    CONSTRAINT "classRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Origin" (
    "id" SERIAL NOT NULL,
    "origin" TEXT NOT NULL,

    CONSTRAINT "Origin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classRoll_githubName_key" ON "classRoll"("githubName");

-- CreateIndex
CREATE UNIQUE INDEX "Origin_origin_key" ON "Origin"("origin");
