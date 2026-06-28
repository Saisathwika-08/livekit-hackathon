"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CallUI from "@/components/CallUI";

function CallPageInner() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room");

  const [token, setToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [callId, setCallId] = useState(0);
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem("livekit_token");
    const url = sessionStorage.getItem("livekit_url");
    const id = sessionStorage.getItem("call_id");
    const user = sessionStorage.getItem("username");

    if (t && url && id && user) {
      setToken(t);
      setLivekitUrl(url);
      setCallId(parseInt(id));
      setUsername(user);
      setReady(true);
    } else {
      window.location.href = "/";
    }
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Connecting to Clara...</p>
        </div>
      </div>
    );
  }

  return (
    <CallUI
      token={token}
      livekitUrl={livekitUrl}
      roomName={room || ""}
      callId={callId}
      username={username}
    />
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CallPageInner />
    </Suspense>
  );
}