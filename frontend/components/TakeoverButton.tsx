"use client";

import { useState } from "react";
import { getTakeoverToken } from "@/lib/livekit";

interface TakeoverButtonProps {
  room: string;
  callStatus: string;
  onTakeover: (token: string, livekitUrl: string) => void;
}

export default function TakeoverButton({
  room,
  callStatus,
  onTakeover,
}: TakeoverButtonProps) {
  const [loading, setLoading] = useState(false);
  const [takenOver, setTakenOver] = useState(false);
  const [error, setError] = useState("");

  const handleTakeover = async () => {
    if (!room) {
      setError("No active room to take over");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getTakeoverToken(room);
      setTakenOver(true);
      onTakeover(data.token, data.livekit_url);
    } catch (e) {
      setError("Failed to take over. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled =
    loading ||
    takenOver ||
    callStatus === "ended" ||
    callStatus === "transferred" ||
    !room;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">

      {/* Header */}
      <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
        🎮 Watcher Controls
      </h3>
      <p className="text-gray-400 text-sm mb-4">
        Take over the call from the AI agent and speak directly with the caller.
      </p>

      {/* Takeover Button */}
      {!takenOver ? (
        <button
          onClick={handleTakeover}
          disabled={isDisabled}
          className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
            isDisabled
              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
              : "bg-orange-600 hover:bg-orange-700 text-white"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Taking over...
            </>
          ) : (
            <>
              🙋 Take Over Call
            </>
          )}
        </button>
      ) : (
        <div className="w-full py-3 rounded-lg font-semibold bg-purple-900 text-purple-300 text-center">
          ✅ You have taken over the call
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}

      {/* Status Info */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Room</span>
          <span className="text-gray-300 font-mono">
            {room || "No active room"}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Call Status</span>
          <span className={`font-medium ${
            callStatus === "connected" ? "text-green-400" :
            callStatus === "taken-over" ? "text-purple-400" :
            callStatus === "ended" ? "text-red-400" :
            "text-gray-400"
          }`}>
            {callStatus?.toUpperCase() || "UNKNOWN"}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Mode</span>
          <span className="text-gray-300">
            {takenOver ? "🧑 Human Agent" : "🤖 AI Agent"}
          </span>
        </div>
      </div>

      {/* Warning */}
      {!takenOver && callStatus === "connected" && (
        <div className="mt-4 bg-orange-950 border border-orange-800 rounded-lg p-3">
          <p className="text-orange-300 text-xs">
            ⚠️ Taking over will pause the AI agent. You will speak directly with the caller.
          </p>
        </div>
      )}

    </div>
  );
}