import { OperationsPage } from "@/components/admin/operations/OperationsPage";

export const metadata = {
  title: "Operaciones | Nexora",
};

export default function Operations() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <OperationsPage />
    </div>
  );
}
