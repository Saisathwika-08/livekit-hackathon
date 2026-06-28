import os
import json
import asyncio
from fastapi import WebSocket
from typing import Dict, List
from datetime import datetime

# Store all active monitor connections per room
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.room_states: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        self.active_connections[room].append(websocket)
        print(f"✅ Monitor connected to room: {room}")

        # Send current state immediately on connect
        if room in self.room_states:
            await websocket.send_text(json.dumps(self.room_states[room]))

    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.active_connections:
            if websocket in self.active_connections[room]:
                self.active_connections[room].remove(websocket)
        print(f"❌ Monitor disconnected from room: {room}")

    async def broadcast(self, room: str, data: dict):
        self.room_states[room] = data
        if room in self.active_connections:
            dead = []
            for connection in self.active_connections[room]:
                try:
                    await connection.send_text(json.dumps(data))
                except Exception:
                    dead.append(connection)
            for conn in dead:
                self.active_connections[room].remove(conn)

    async def send_personal(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            print(f"Send error: {e}")

    def get_room_state(self, room: str) -> dict:
        return self.room_states.get(room, {})

    def update_room_state(self, room: str, updates: dict):
        if room not in self.room_states:
            self.room_states[room] = {}
        self.room_states[room].update(updates)
        self.room_states[room]["updated_at"] = datetime.now().isoformat()


# Singleton manager instance
manager = ConnectionManager()


class CallMonitor:
    """
    Tracks and broadcasts call state changes
    """
    def __init__(self, room_name: str, call_id: int):
        self.room_name = room_name
        self.call_id = call_id
        self.state = {
            "room": room_name,
            "call_id": call_id,
            "status": "connected",
            "agent_state": "listening",
            "intent": None,
            "action": None,
            "transcript": [],
            "appointment": {
                "name": None,
                "reason": None,
                "date": None,
                "time": None,
                "contact": None
            },
            "started_at": datetime.now().isoformat(),
            "summary": None
        }

    async def update(self, **kwargs):
        self.state.update(kwargs)
        self.state["updated_at"] = datetime.now().isoformat()
        await manager.broadcast(self.room_name, self.state)

    async def add_transcript(self, speaker: str, message: str):
        entry = {
            "speaker": speaker,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        self.state["transcript"].append(entry)
        await manager.broadcast(self.room_name, self.state)

    async def update_appointment(self, field: str, value: str):
        self.state["appointment"][field] = value
        await manager.broadcast(self.room_name, self.state)

    async def set_agent_state(self, state: str, action: str = None, intent: str = None):
        self.state["agent_state"] = state
        if action:
            self.state["action"] = action
        if intent:
            self.state["intent"] = intent
        await manager.broadcast(self.room_name, self.state)

    async def end(self, summary: str):
        self.state["status"] = "ended"
        self.state["agent_state"] = "ended"
        self.state["summary"] = summary
        self.state["ended_at"] = datetime.now().isoformat()
        await manager.broadcast(self.room_name, self.state)

    async def takeover(self):
        self.state["status"] = "taken-over"
        self.state["agent_state"] = "paused"
        self.state["action"] = "Human watcher has taken over the call"
        await manager.broadcast(self.room_name, self.state)