import { OperationsPage } from "@/components/admin/operations/OperationsPage";
import { getOperationsCenterData } from "@/lib/operations/queries";

export const metadata = {
  title: "Operaciones | Nexora",
};

export default async function Operations() {
  const data = await getOperationsCenterData();

  return (
    <div className="mx-auto max-w-[1200px]">
      <OperationsPage data={data} />
    </div>
  );
}
