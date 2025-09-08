-- CreateTable
CREATE TABLE "public"."Recording" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "playUrl" TEXT,
    "recordingType" TEXT NOT NULL,
    "duration" INTEGER,
    "recordingStart" TIMESTAMP(3),
    "recordingEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recording_meetingId_idx" ON "public"."Recording"("meetingId");

-- CreateIndex
CREATE INDEX "Recording_fileType_idx" ON "public"."Recording"("fileType");

-- AddForeignKey
ALTER TABLE "public"."Recording" ADD CONSTRAINT "Recording_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
