import { SourcingPage } from "@/components/admin/sourcing/SourcingPage";
import { getProvidersAction, getConnectedProvidersAction, getImportedProductsAction } from "@/lib/sourcing/actions";
// Wait, looking at other pages they usually just pass things or let the client component fetch.
// I will let SourcingPage fetch via Server Actions to match existing patterns.

export const metadata = {
  title: "Abastecimiento | Nexora",
};

export default function Sourcing() {
  return (
    <div className="mx-auto max-w-6xl">
      <SourcingPage />
    </div>
  );
}
