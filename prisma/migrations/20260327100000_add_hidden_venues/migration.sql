-- CreateTable
CREATE TABLE "hidden_venues" (
    "id" SERIAL NOT NULL,
    "venue_id" VARCHAR(50) NOT NULL,

    CONSTRAINT "hidden_venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hidden_venues_venue_id_key" ON "hidden_venues"("venue_id");
