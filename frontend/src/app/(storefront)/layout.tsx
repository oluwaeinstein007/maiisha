import { SaleBanner } from "@/components/layout/SaleBanner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SaleBanner />
      <SiteHeader />
      <main id="main-content" className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
