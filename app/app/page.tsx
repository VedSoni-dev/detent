import Playground from "@/components/Playground";
import { PublikGate } from "@/components/PublikGate";

// The software lives here, behind Sign in with publik. The landing page at / is public.
export const metadata = { title: "detent · your sliders" };

export default function AppPage() {
  return (
    <PublikGate appName="detent">
      <Playground />
    </PublikGate>
  );
}
