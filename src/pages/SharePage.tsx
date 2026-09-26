import { PageHeader } from "@/components/layout/PageHeader";
import { ExportPanel } from "@/components/share/ExportPanel";
import { ImportPanel } from "@/components/share/ImportPanel";

export function SharePage() {
  return (
    <>
      <PageHeader title="Import / Export" description="Send a song to a friend, or add one they sent you." />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ExportPanel />
        <ImportPanel />
      </div>
    </>
  );
}
