import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { api } from "../lib/api";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getPendingCount().then((n) => !cancelled && setPendingCount(n));
    return () => {
      cancelled = true;
    };
  }, [online, justSynced]);

  if (online && pendingCount === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    await api.syncPending();
    setSyncing(false);
    setJustSynced(true);
    setPendingCount(0);
    setTimeout(() => setJustSynced(false), 2500);
  };

  return (
    <div
      className={`w-full text-sm px-4 py-2.5 flex items-center justify-center gap-2 text-center ${
        online
          ? "bg-[#3E6B64]/10 text-[#3E6B64]"
          : "bg-[#FBEEEA] dark:bg-[#3A2A22] text-[#8A3E2A] dark:text-[#E9A88E]"
      }`}
    >
      {!online && (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You're offline — recordings are saving locally and will sync automatically.</span>
        </>
      )}
      {online && pendingCount > 0 && !justSynced && (
        <>
          <RefreshCw className={`w-4 h-4 shrink-0 ${syncing ? "animate-spin" : ""}`} />
          <span>{pendingCount} item{pendingCount === 1 ? "" : "s"} waiting to sync.</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="underline underline-offset-2 font-medium disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </>
      )}
      {online && justSynced && (
        <>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>All caught up.</span>
        </>
      )}
    </div>
  );
}
