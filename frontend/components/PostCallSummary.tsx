"use client";

interface AppointmentInfo {
  name: string | null;
  reason: string | null;
  date: string | null;
  time: string | null;
  contact: string | null;
}

interface PostCallSummaryProps {
  summary: string | null;
  appointment?: AppointmentInfo;
  startedAt?: string;
  endedAt?: string;
  transcriptCount?: number;
}

export default function PostCallSummary({
  summary,
  appointment,
  startedAt,
  endedAt,
  transcriptCount,
}: PostCallSummaryProps) {
  if (!summary) return null;

  const duration = startedAt && endedAt
    ? Math.round(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
      )
    : null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const isBooked = appointment &&
    appointment.name &&
    appointment.date &&
    appointment.time;

  return (
    <div className="bg-gray-900 border border-green-800 rounded-2xl p-5 mt-4">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📋</span>
        <h3 className="text-white font-semibold text-lg">
          Post Call Summary
        </h3>
        <span className="ml-auto bg-green-900 text-green-300 text-xs px-3 py-1 rounded-full font-medium">
          Call Ended
        </span>
      </div>

      {/* Call Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-lg">
            {duration ? formatDuration(duration) : "—"}
          </div>
          <div className="text-gray-400 text-xs mt-1">Duration</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-lg">
            {transcriptCount || 0}
          </div>
          <div className="text-gray-400 text-xs mt-1">Messages</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className={`font-bold text-lg ${isBooked ? "text-green-400" : "text-red-400"}`}>
            {isBooked ? "✅" : "❌"}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {isBooked ? "Booked" : "Not Booked"}
          </div>
        </div>
      </div>

      {/* Appointment Details */}
      {appointment && isBooked && (
        <div className="bg-green-950 border border-green-800 rounded-xl p-4 mb-4">
          <h4 className="text-green-300 font-semibold text-sm mb-3">
            📅 Appointment Confirmed
          </h4>
          <div className="space-y-2">
            <DetailRow label="Patient Name" value={appointment.name} />
            <DetailRow label="Reason" value={appointment.reason} />
            <DetailRow label="Date" value={appointment.date} />
            <DetailRow label="Time" value={appointment.time} />
            <DetailRow label="Contact" value={appointment.contact} />
          </div>
        </div>
      )}

      {/* AI Summary */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h4 className="text-gray-300 font-semibold text-sm mb-2">
          🤖 AI Generated Summary
        </h4>
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {summary}
        </p>
      </div>

      {/* Timestamps */}
      {startedAt && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
          <span>Started: {new Date(startedAt).toLocaleTimeString()}</span>
          {endedAt && (
            <span>Ended: {new Date(endedAt).toLocaleTimeString()}</span>
          )}
        </div>
      )}

    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-white text-xs font-medium">
        {value || "—"}
      </span>
    </div>
  );
}