import { Download, Send, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackupPanel } from "@/components/share/BackupPanel";
import { ExportPanel } from "@/components/share/ExportPanel";
import { ImportPanel } from "@/components/share/ImportPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SharePage() {
  return (
    <>
      <PageHeader title="Share" description="Send songs and playlists to a friend as a file or a short code, add the ones they sent you, or back everything up." />
      <Tabs defaultValue="send" className="flex flex-col gap-5">
        <TabsList aria-label="Direction" className="w-full self-start sm:w-[30rem]">
          <TabsTrigger value="send">
            <Send className="h-4 w-4" aria-hidden />
            Send
          </TabsTrigger>
          <TabsTrigger value="receive">
            <Download className="h-4 w-4" aria-hidden />
            Receive
          </TabsTrigger>
          <TabsTrigger value="backup">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Backup
          </TabsTrigger>
        </TabsList>
        <TabsContent value="send" className="outline-none">
          <ExportPanel />
        </TabsContent>
        <TabsContent value="receive" className="outline-none">
          <ImportPanel />
        </TabsContent>
        <TabsContent value="backup" className="outline-none">
          <BackupPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}
