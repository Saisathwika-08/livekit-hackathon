"use client";

import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/livekit";

interface TranscriptEntry {
  speaker: string;
  message: string;
  timestamp?: string;
}

interface TranscriptProps {
  transcript: TranscriptEntry[];
}

export default function Transcript({ transcript }: TranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          📝 Live Transcript
        </h3>
        <span className="text-gray-500 text-xs">
          {transcript.length} messages
        </span>
      </div>

      {/* Transcript Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-96 pr-1">
        {transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
            <span className="text-3xl mb-2">🎙️</span>
            <p className="text-sm">Waiting for conversation to start...</p>
          </div>
        ) : (
          transcript.map((entry, index) => (
            <MessageBubble key={index} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

    </div>
  );
}

function MessageBubble({ entry }: { entry: TranscriptEntry }) {
  const isAgent = entry.speaker === "agent";

  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[80%] ${isAgent ? "order-2" : "order-1"}`}>

        {/* Speaker Label */}
        <div className={`text-xs mb-1 ${isAgent ? "text-blue-400" : "text-green-400"} flex items-center gap-1`}>
          {isAgent ? (
            <>🤖 Clara (Agent)</>
          ) : (
            <>👤 Caller</>
          )}
          {entry.timestamp && (
            <span className="text-gray-600 ml-1">
              · {formatTime(entry.timestamp)}
            </span>
          )}
        </div>

        {/* Message */}
        <div className={`px-4 py-2 rounded-2xl text-sm ${
          isAgent
            ? "bg-blue-900 text-blue-100 rounded-tl-none"
            : "bg-green-900 text-green-100 rounded-tr-none"
        }`}>
          {entry.message}
        </div>

      </div>
    </div>
  );
}