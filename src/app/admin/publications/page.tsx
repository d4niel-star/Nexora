import { PublicationsPage } from "@/components/admin/publications/PublicationsPage";

export const metadata = {
  title: "Publicaciones Multicanal | Nexora",
};

export default function Publications() {
  return (
    <div className="mx-auto max-w-6xl">
      <PublicationsPage />
    </div>
  );
}
