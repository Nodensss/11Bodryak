-- CreateTable
CREATE TABLE "venue_votes" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "normalized_full_name" VARCHAR(100) NOT NULL,
    "venue_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_images" (
    "id" SERIAL NOT NULL,
    "venue_id" VARCHAR(50) NOT NULL,
    "image_data" TEXT NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venue_votes_normalized_full_name_key" ON "venue_votes"("normalized_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "venue_images_venue_id_key" ON "venue_images"("venue_id");
