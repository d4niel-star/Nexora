import type { ReactNode } from "react";
import { MarketingChrome } from "@/components/public/MarketingChrome";

// Layout for everything under /home. Marketing pages (home, pricing) get
// the public header + footer chrome; auth surfaces (login, register,
// check-email, verify-email) skip the chrome and render their own
// split-shell as the entire viewport. The decision lives in
// MarketingChrome (client) so the layout itself stays a server component.
export default function HomeLayout({ children }: { children: ReactNode }) {
  return <MarketingChrome>{children}</MarketingChrome>;
}
