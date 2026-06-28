"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/livekit";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinCall = async () => {
    if (!username.trim()) {
      setError("Please enter your name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getToken(username);
      sessionStorage.setItem("livekit_token", data.token);
      sessionStorage.setItem("livekit_url", data.livekit_url);
      sessionStorage.setItem("room_name", data.room);
      sessionStorage.setItem("call_id", data.call_id.toString());
      sessionStorage.setItem("username", username);
      router.push(`/call?room=${data.room}`);
    } catch (e) {
      setError("Failed to connect. Please try again.");
      setLoading(false);
    }
  };

  const handleMonitor = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🎙️</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Voice Assistant</h2>
          <p className="text-gray-400">Book an appointment by talking to Clara, our AI receptionist</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          <h3 className="text-white font-semibold mb-4">Start a Call</h3>
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-1 block">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinCall()}
              placeholder="Enter your name..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            onClick={handleJoinCall}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Connecting...
              </>
            ) : (
              <>📞 Join Call with Clara</>
            )}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-2">🖥️ Monitor Dashboard</h3>
          <p className="text-gray-400 text-sm mb-4">Watch live calls, view transcripts, and take over if needed</p>
          <button
            onClick={handleMonitor}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Open Dashboard →
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="text-2xl mb-1">🤖</div>
            <div className="text-gray-400 text-xs">AI Receptionist</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-gray-400 text-xs">Book Appointments</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="text-2xl mb-1">🔄</div>
            <div className="text-gray-400 text-xs">Live Transfer</div>
          </div>
        </div>
      </div>
    </div>
  );
}
