"use client";

import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import Button from "@/components/ui/Button";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-center gap-3">
        <BrandMark size={48} className="flex-shrink-0 rounded-xl shadow-sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">
            Install GEMS
          </p>
          <p className="text-gray-500 text-xs">
            Get faster access to event attendance and reports, even offline.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleInstall}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            Install
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowPrompt(false)}
            className="rounded-lg px-3 py-1.5 text-xs"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}