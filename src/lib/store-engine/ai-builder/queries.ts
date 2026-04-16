import { prisma } from "@/lib/db/prisma";

export async function getAIGenerationDraft(storeId: string) {
  const draft = await prisma.aIGenerationDraft.findFirst({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    include: {
      proposals: true,
    },
  });

  return draft;
}
