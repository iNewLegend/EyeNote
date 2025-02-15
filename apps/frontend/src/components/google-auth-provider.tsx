import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useState } from "react";

interface GoogleAuthProviderProps {
  children: React.ReactNode;
}

export function GoogleAuthProvider({ children }: GoogleAuthProviderProps) {
  const [clientId, setClientId] = useState<string>("");

  useEffect(() => {
    // Get the client ID from the manifest
    const manifestData = chrome.runtime.getManifest();
    const clientId = manifestData.oauth2?.client_id;

    if (!clientId) {
      console.error("Google OAuth client ID not found in manifest");
      return;
    }

    setClientId(clientId);
  }, []);

  if (!clientId) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
  );
}
