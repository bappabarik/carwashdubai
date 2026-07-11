import { PrismaClient } from "@prisma/client";

export async function updateUserProfile(
  prisma: PrismaClient,
  userId: string,
  data: { name: string; email: string }
) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
    },
    // We only select safe fields to return to the frontend
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    },
  });

  return updatedUser;
}