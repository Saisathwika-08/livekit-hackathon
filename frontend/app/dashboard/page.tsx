"use client";

import { useEffect, useState, useRef } from "react";
import { connectMonitorSocket } from "@/lib/livekit";
import AgentStatus from "@/components/AgentStatus";
import Transcript from "@/components/Transcript";
import TakeoverButton from "@/components/TakeoverButton";
import PostCallSummary from "@/components/PostCallSummary";

export default function DashboardPage() {
  const [roomInput, setRoomInput] = useState("");
  const [room, setRoom] = useState("");
  const [callState, setCallState] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const handleConnect = () => {
    if (!roomInput.trim()) {
      setError("Please enter a room name");
      return;
    }
    setError("");
    setRoom(roomInput.trim());
    const ws = connectMonitorSocket(roomInput.trim(), (data) => {
      setCallState(data);
      setConnected(true);
    });
    ws.onopen = () => setConnected(true);
    ws.onerror = () => setError("Failed to connect to room");
    wsRef.current = ws;
  };

  const handleTakeover = async (token: string, livekitUrl: string) => {
    sessionStorage.setItem("livekit_token", token);
    sessionStorage.setItem("livekit_url", livekitUrl);
    sessionStorage.setItem("room_name", room);
    sessionStorage.setItem("username", "human-agent");
    sessionStorage.setItem("call_id", callState?.call_id?.toString() || "0");
    window.open(`/call?room=${room}`, "_blank");
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white text-2xl font-bold">🖥️ Live Monitoring Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">
          Monitor ongoing calls, view live transcripts, and take over when needed
        </p>
      </div>

      {!connected ? (
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Connect to a Room</h3>
            <p className="text-gray-400 text-sm mb-4">
              Enter the room name from an active call to start monitoring
            </p>
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="e.g. room-abc12345"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition mb-4"
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              onClick={handleConnect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              🔌 Connect to Room
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-green-950 border border-green-800 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm font-medium">
                Monitoring room: <span className="font-mono">{room}</span>
              </span>
            </div>
            <button
              onClick={() => {
                wsRef.current?.close();
                setConnected(false);
                setCallState(null);
                setRoom("");
                setRoomInput("");
              }}
              className="text-gray-500 hover:text-gray-300 text-xs transition"
            >
              Disconnect
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-4">
              <AgentStatus
                agentState={callState?.agent_state || "idle"}
                intent={callState?.intent}
                action={callState?.action}
                status={callState?.status || "unknown"}
                appointment={callState?.appointment}
              />
              <TakeoverButton
                room={room}
                callStatus={callState?.status || "unknown"}
                onTakeover={handleTakeover}
              />
            </div>
            <div className="lg:col-span-2">
              <Transcript transcript={callState?.transcript || []} />
              {callState?.status === "ended" && (
                <PostCallSummary
                  summary={callState?.summary}
                  appointment={callState?.appointment}
                  startedAt={callState?.started_at}
                  endedAt={callState?.ended_at}
                  transcriptCount={callState?.transcript?.length}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}