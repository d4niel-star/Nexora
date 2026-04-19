import { redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { prisma } from "@/lib/db/prisma";
import { PLAN_DEFINITIONS } from "@/lib/billing/plans";
import {
  getAdminReviewCounts,
  listReviewsForAdmin,
  type ReviewStatus,
} from "@/lib/apps/product-reviews/queries";
import { ReviewsModeration } from "@/components/admin/apps/product-reviews/ReviewsModeration";

export const metadata = {
  title: "Reseñas · Moderación",
};

const VALID: ReviewStatus[] = ["pending", "approved", "hidden"];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ReviewsModerationPage({ searchParams }: PageProps) {
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const { status } = await searchParams;
  const filter: ReviewStatus = VALID.includes(status as ReviewStatus)
    ? (status as ReviewStatus)
    : "pending";

  const [sub, reviews, counts] = await Promise.all([
    prisma.storeSubscription.findUnique({
      where: { storeId: store.id },
      include: { plan: true },
    }),
    listReviewsForAdmin(store.id, filter),
    getAdminReviewCounts(store.id),
  ]);

  const planConfig = sub?.plan
    ? PLAN_DEFINITIONS.find((p) => p.code === sub.plan.code)?.config
    : null;
  const planAllows = Boolean(planConfig?.productReviews);

  return (
    <ReviewsModeration
      initialStatus={filter}
      reviews={reviews}
      counts={counts}
      planAllows={planAllows}
    />
  );
}
