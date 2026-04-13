import { ChannelsPage } from "@/components/admin/channels/ChannelsPage";
import { Suspense } from "react";

export const metadata = {
  title: "Canales / OAuth | Nexora",
};

export default function Channels() {
  return (
    <div className="mx-auto max-w-6xl">
       <Suspense fallback={<p>Cargando canales...</p>}>
          <ChannelsPage />
       </Suspense>
    </div>
  );
}
