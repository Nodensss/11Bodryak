-- CreateTable
CREATE TABLE "venue_comments" (
    "id" SERIAL NOT NULL,
    "venue_id" VARCHAR(50) NOT NULL,
    "author_name" VARCHAR(100) NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_comments_pkey" PRIMARY KEY ("id")
);
