"use client";

import { getAgentStateColor, getAgentStateLabel } from "@/lib/livekit";

interface AgentStatusProps {
  agentState: string;
  intent: string | null;
  action: string | null;
  status: string;
  appointment?: {
    name: string | null;
    reason: string | null;
    date: string | null;
    time: string | null;
    contact: string | null;
  };
}

export default function AgentStatus({
  agentState,
  intent,
  action,
  status,
  appointment,
}: AgentStatusProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">

      {/* Header */}
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        🤖 Agent Status
      </h3>

      {/* Current State */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-3 h-3 rounded-full ${getAgentStateColor(agentState)} animate-pulse`}
        ></div>
        <span className="text-white font-medium">
          {getAgentStateLabel(agentState)}
        </span>
      </div>

      {/* Call Status */}
      <div className="mb-3">
        <span className="text-gray-400 text-xs uppercase tracking-wide">
          Call Status
        </span>
        <div className={`mt-1 inline-block px-3 py-1 rounded-full text-xs font-semibold ${
          status === "connected" ? "bg-green-900 text-green-300" :
          status === "taken-over" ? "bg-purple-900 text-purple-300" :
          status === "transferring" ? "bg-orange-900 text-orange-300" :
          status === "ended" ? "bg-red-900 text-red-300" :
          "bg-gray-800 text-gray-400"
        }`}>
          {status?.toUpperCase() || "UNKNOWN"}
        </div>
      </div>

      {/* Detected Intent */}
      {intent && (
        <div className="mb-3">
          <span className="text-gray-400 text-xs uppercase tracking-wide">
            Detected Intent
          </span>
          <p className="text-yellow-400 text-sm mt-1 font-medium">
            {intent === "booking" ? "📅 Appointment Booking" :
             intent === "warm_transfer" ? "📞 Warm Transfer" :
             intent === "cancel" ? "❌ Cancellation" :
             intent}
          </p>
        </div>
      )}

      {/* Current Action */}
      {action && (
        <div className="mb-4">
          <span className="text-gray-400 text-xs uppercase tracking-wide">
            Current Action
          </span>
          <p className="text-blue-400 text-sm mt-1">
            ⚡ {action}
          </p>
        </div>
      )}

      {/* Collected Appointment Info */}
      {appointment && (
        <div className="border-t border-gray-800 pt-4">
          <span className="text-gray-400 text-xs uppercase tracking-wide">
            Collected Info
          </span>
          <div className="mt-2 space-y-2">
            <InfoRow label="Name" value={appointment.name} />
            <InfoRow label="Reason" value={appointment.reason} />
            <InfoRow label="Date" value={appointment.date} />
            <InfoRow label="Time" value={appointment.time} />
            <InfoRow label="Contact" value={appointment.contact} />
          </div>
        </div>
      )}

    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-xs font-medium ${value ? "text-green-400" : "text-gray-600"}`}>
        {value || "Not collected"}
      </span>
    </div>
  );
}