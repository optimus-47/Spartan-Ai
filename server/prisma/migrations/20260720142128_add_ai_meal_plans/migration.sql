-- CreateTable
CREATE TABLE "AiMealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietType" TEXT,
    "goal" TEXT,
    "generatedPlan" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMealPlan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AiMealPlan" ADD CONSTRAINT "AiMealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
