/*
  Splits the single `Role` enum into two: `GlobalRole` (User.role — one
  identity role per user) and `CarrierRole` (CarrierUser.role — manager vs.
  operator scoped to one carrier). Previously both columns shared `Role`,
  which meant a `CarrierUser` could be typed `ADMIN`/`SELLER` with nothing
  but app-level discipline stopping it. See DESIGN.md.

  `Role` is renamed to `GlobalRole` in place (same members, zero cast, no
  data loss for `User.role`). `CarrierUser.role` is dropped and recreated
  against the new `CarrierRole` enum — safe because no `CarrierUser` rows
  exist yet (the carriers module has no real logic yet).
*/

-- RenameEnum
ALTER TYPE "Role" RENAME TO "GlobalRole";

-- CreateEnum
CREATE TYPE "CarrierRole" AS ENUM ('MANAGER', 'OPERATOR');

-- AlterTable
ALTER TABLE "CarrierUser" DROP COLUMN "role",
ADD COLUMN     "role" "CarrierRole" NOT NULL;
