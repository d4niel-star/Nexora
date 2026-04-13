import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";

/**
 * Server component that fetches the active store info and renders the topbar name.
 */
export async function ActiveStoreBadge() {
  const store = await getActiveStoreInfo();
  const initials = store.name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <h2 className="text-sm font-medium text-gray-400">
        Tienda activa:{" "}
        <span className="font-bold text-[#111111]">{store.name}</span>
      </h2>
      {/* Hidden data attribute for the avatar — read by the client layout */}
      <span data-store-initials={initials} data-store-name={store.name} className="hidden" />
    </>
  );
}
