-- CreateTable
CREATE TABLE "LiveSessionTag" (
    "liveSessionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveSessionTag_pkey" PRIMARY KEY ("liveSessionId","tagId")
);

-- AddForeignKey
ALTER TABLE "LiveSessionTag" ADD CONSTRAINT "LiveSessionTag_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessionTag" ADD CONSTRAINT "LiveSessionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
