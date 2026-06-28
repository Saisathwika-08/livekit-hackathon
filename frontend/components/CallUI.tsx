"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { endCall } from "@/lib/livekit";

interface CallUIProps {
  token: string;
  livekitUrl: string;
  roomName: string;
  callId: number;
  username: string;
}

export default function CallUI({
  token,
  livekitUrl,
  roomName,
  callId,
  username,
}: CallUIProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => console.log("Disconnected")}
    >
      <RoomAudioRenderer />
      <CallInterface
        roomName={roomName}
        callId={callId}
        username={username}
      />
    </LiveKitRoom>
  );
}

function CallInterface({
  roomName,
  callId,
  username,
}: {
  roomName: string;
  callId: number;
  username: string;
}) {
  const { state, audioTrack } = useVoiceAssistant();
  const [callDuration, setCallDuration] = useState(0);
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(false);

  // Timer
  useEffect(() => {
  if (ended) return;
  const interval = setInterval(() => {
    setCallDuration((d) => d + 1);
  }, 1000);
  return () => clearInterval(interval);
  }, [ended]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleEndCall = async () => {
    setEnding(true);
    try {
      await endCall(roomName, callId, "Call ended by user.");
      setEnded(true);
    } catch (e) {
      console.error("End call error:", e);
    } finally {
      setEnding(false);
    }
  };

  const getStateColor = () => {
    switch (state) {
      case "listening": return "bg-green-500";
      case "thinking": return "bg-yellow-500";
      case "speaking": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case "listening": return "🎧 Listening to you...";
      case "thinking": return "🤔 Clara is thinking...";
      case "speaking": return "🗣️ Clara is speaking...";
      case "connecting": return "🔄 Connecting...";
      default: return "⚪ Idle";
    }
  };

  if (ended) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-6xl mb-4">📵</div>
        <h2 className="text-white text-2xl font-bold mb-2">Call Ended</h2>
        <p className="text-gray-400 mb-2">
          Duration: {formatDuration(callDuration)}
        </p>
        <p className="text-gray-500 text-sm">
          Thank you for calling. Your appointment has been processed.
        </p>
        <button
          onClick={() => window.location.href = "/"}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">

      {/* Call Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 w-full max-w-sm text-center">

        {/* Avatar */}
        <div className="relative mx-auto mb-6 w-24 h-24">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-4xl">
            🤖
          </div>
          <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${getStateColor()} animate-pulse`}></div>
        </div>

        {/* Agent Name */}
        <h2 className="text-white text-xl font-bold mb-1">Clara</h2>
        <p className="text-gray-400 text-sm mb-4">AI Receptionist · Swades AI</p>

        {/* State */}
        <div className="bg-gray-800 rounded-xl px-4 py-2 mb-6 inline-block">
          <p className="text-gray-300 text-sm">{getStateLabel()}</p>
        </div>

        {/* Voice Visualizer */}
        {audioTrack && (
          <div className="mb-6 h-12">
            <BarVisualizer
              trackRef={audioTrack}
              className="w-full h-full"
              barCount={20}
            />
          </div>
        )}

        {/* Duration */}
        <div className="text-gray-500 text-sm mb-6">
          🕐 {formatDuration(callDuration)}
        </div>

        {/* Caller Info */}
        <div className="bg-gray-800 rounded-xl p-3 mb-6 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Caller</span>
            <span className="text-white font-medium">{username}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-gray-500">Room</span>
            <span className="text-gray-400 font-mono">{roomName}</span>
          </div>
        </div>

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          disabled={ending}
          className="w-16 h-16 bg-red-600 hover:bg-red-700 disabled:bg-red-900 rounded-full flex items-center justify-center mx-auto transition text-2xl"
        >
          {ending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "📵"
          )}
        </button>
        <p className="text-gray-600 text-xs mt-2">End Call</p>

      </div>

      {/* Tip */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-4 max-w-sm w-full">
        <p className="text-gray-400 text-xs text-center">
          💡 Speak naturally with Clara. She can book appointments, check availability, or connect you to a human agent.
        </p>
      </div>

    </div>
  );
}