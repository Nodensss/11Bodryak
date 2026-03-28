-- CreateTable
CREATE TABLE "custom_venues" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "address" VARCHAR(200) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "created_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_venues_pkey" PRIMARY KEY ("id")
);
