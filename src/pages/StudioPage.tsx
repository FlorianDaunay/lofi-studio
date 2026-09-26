import { PageHeader } from "@/components/layout/PageHeader";
import { AdvancedPanels } from "@/components/studio/AdvancedPanels";
import { Ambience } from "@/components/studio/Ambience";
import { PinnedSongs } from "@/components/studio/PinnedSongs";
import { Transport } from "@/components/studio/Transport";

export function StudioPage() {
  return (
    <>
      <PageHeader title="Studio" description="Press play, pick a mood, then tweak as deep as you like." />
      <Transport />
      <PinnedSongs />
      <Ambience />
      <AdvancedPanels />
    </>
  );
}
