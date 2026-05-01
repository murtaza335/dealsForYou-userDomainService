/*
  Warnings:

  - You are about to drop the column `createdAt` on the `AppAdminProfile` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `AppAdminProfile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `AppAdminProfile` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `BrandAdminProfile` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `BrandAdminProfile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `BrandAdminProfile` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `ConsumerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ConsumerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ConsumerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `AppAdminProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `BrandAdminProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `ConsumerProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clerk_user_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `AppAdminProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `AppAdminProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `BrandAdminProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `BrandAdminProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `ConsumerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `ConsumerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clerk_user_id` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('END_USER', 'BRAND_ADMIN', 'APP_ADMIN');

-- DropForeignKey
ALTER TABLE "AppAdminProfile" DROP CONSTRAINT "AppAdminProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "BrandAdminProfile" DROP CONSTRAINT "BrandAdminProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "ConsumerProfile" DROP CONSTRAINT "ConsumerProfile_userId_fkey";

-- DropIndex
DROP INDEX "AppAdminProfile_userId_key";

-- DropIndex
DROP INDEX "BrandAdminProfile_userId_key";

-- DropIndex
DROP INDEX "ConsumerProfile_userId_key";

-- AlterTable
ALTER TABLE "AppAdminProfile" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BrandAdminProfile" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ConsumerProfile" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "brand_id" TEXT,
ADD COLUMN     "clerk_user_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'END_USER',
ADD COLUMN     "tenant_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AppAdminProfile_user_id_key" ON "AppAdminProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "BrandAdminProfile_user_id_key" ON "BrandAdminProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerProfile_user_id_key" ON "ConsumerProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerk_user_id_key" ON "User"("clerk_user_id");

-- CreateIndex
CREATE INDEX "User_clerk_user_id_idx" ON "User"("clerk_user_id");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_tenant_id_idx" ON "User"("tenant_id");

-- AddForeignKey
ALTER TABLE "ConsumerProfile" ADD CONSTRAINT "ConsumerProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAdminProfile" ADD CONSTRAINT "BrandAdminProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppAdminProfile" ADD CONSTRAINT "AppAdminProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
