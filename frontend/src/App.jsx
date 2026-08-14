import React, { useState } from "react";
import ConsentScreen from "./components/ConsentScreen";
import TopNav from "./components/TopNav";
import OfflineBanner from "./components/OfflineBanner";
import DataCollection from "./pages/DataCollection";
import PatientApp from "./pages/PatientApp";
import ClinicianView from "./pages/ClinicianView";
import { useDarkMode } from "./hooks/useDarkMode";
import { getSetting, setSetting } from "./lib/db";

export default function App() {
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [tab, setTab] = useState("collect");
  const { dark, toggle } = useDarkMode();

  React.useEffect(() => {
    (async () => {
      const accepted = await getSetting("consentAccepted", false);
      setConsentGiven(!!accepted);
      setConsentChecked(true);
    })();
  }, []);

  const handleAccept = async () => {
    await setSetting("consentAccepted", true);
    setConsentGiven(true);
  };

  if (!consentChecked) {
    return <div className="min-h-screen w-full bg-[#F7F5F1] dark:bg-[#1C1B18]" />;
  }

  if (!consentGiven) {
    return <ConsentScreen onAccept={handleAccept} />;
  }

  return (
    <div
      className="min-h-screen w-full bg-[#F7F5F1] dark:bg-[#1C1B18] text-[#262624] dark:text-[#EDEAE2]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <TopNav active={tab} onChange={setTab} dark={dark} onToggleDark={toggle} />
      <OfflineBanner />
      {tab === "collect" && <DataCollection />}
      {tab === "patient" && <PatientApp />}
      {tab === "clinician" && <ClinicianView />}
    </div>
  );
}
