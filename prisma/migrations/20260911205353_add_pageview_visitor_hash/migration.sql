-- AlterTable
ALTER TABLE "PageView" ADD COLUMN     "visitorHash" TEXT;

-- CreateIndex
CREATE INDEX "PageView_visitorHash_idx" ON "PageView"("visitorHash");
