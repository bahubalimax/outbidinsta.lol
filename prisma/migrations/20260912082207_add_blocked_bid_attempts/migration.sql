-- CreateTable
CREATE TABLE "BlockedBidAttempt" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedBidAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockedBidAttempt_createdAt_idx" ON "BlockedBidAttempt"("createdAt");
