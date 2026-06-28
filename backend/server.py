import os
import uuid
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from livekit import api
from booking import init_db, save_call, end_call, save_transcript, get_transcripts
import json

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active connections for monitoring
active_monitors: dict[str, list[WebSocket]] = {}
call_states: dict[str, dict] = {}

@app.on_event("startup")
async def startup():
    await init_db()
    print("✅ Database initialized")

@app.get("/")
async def root():
    return {"status": "LiveKit Hackathon Backend Running"}

# Generate token for caller to join a room
@app.get("/token")
async def get_token(room: str = None, username: str = "caller"):
    room_name = room or f"room-{uuid.uuid4().hex[:8]}"
    
    livekit_api = api.LiveKitAPI(
        os.getenv("LIVEKIT_URL"),
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET")
    )

    # Create room first
    await livekit_api.room.create_room(
        api.CreateRoomRequest(name=room_name)
    )

    # Dispatch agent to the room
    await livekit_api.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(
            agent_name="",
            room=room_name
        )
    )
    await livekit_api.aclose()

    token = api.AccessToken(
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET")
    ).with_grants(
        api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    ).with_identity(username).with_name(username)

    call_id = await save_call(room_name)

    call_states[room_name] = {
        "call_id": call_id,
        "status": "connected",
        "agent_state": "listening",
        "intent": None,
        "action": None,
        "transcript": []
    }

    return {
        "token": token.to_jwt(),
        "room": room_name,
        "call_id": call_id,
        "livekit_url": os.getenv("LIVEKIT_URL")
    }
# Generate token for watcher/monitor
@app.get("/monitor-token")
async def get_monitor_token(room: str, username: str = "monitor"):
    token = api.AccessToken(
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET")
    ).with_grants(
        api.VideoGrants(
            room_join=True,
            room=room,
            can_publish=False,
            can_subscribe=True,
        )
    ).with_identity(username).with_name(username)

    return {
        "token": token.to_jwt(),
        "room": room,
        "livekit_url": os.getenv("LIVEKIT_URL")
    }

# Generate token for watcher to TAKE OVER (can publish)
@app.get("/takeover-token")
async def get_takeover_token(room: str, username: str = "human-agent"):
    token = api.AccessToken(
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET")
    ).with_grants(
        api.VideoGrants(
            room_join=True,
            room=room,
            can_publish=True,
            can_subscribe=True,
        )
    ).with_identity(username).with_name(username)

    # Update call state
    if room in call_states:
        call_states[room]["status"] = "taken-over"
        call_states[room]["agent_state"] = "paused"
        await broadcast_state(room)

    return {
        "token": token.to_jwt(),
        "room": room,
        "livekit_url": os.getenv("LIVEKIT_URL")
    }

# Get call state
@app.get("/call-state/{room}")
async def get_call_state(room: str):
    return call_states.get(room, {"status": "not found"})

# Get transcripts
@app.get("/transcripts/{call_id}")
async def get_call_transcripts(call_id: int):
    transcripts = await get_transcripts(call_id)
    return {"transcripts": transcripts}

# End call + generate summary
@app.post("/end-call")
async def end_call_route(data: dict):
    room = data.get("room")
    summary = data.get("summary", "Call ended.")
    call_id = data.get("call_id")

    if room in call_states:
        call_states[room]["status"] = "ended"
        call_states[room]["summary"] = summary
        await broadcast_state(room)

    if call_id:
        await end_call(call_id, summary)

    return {"status": "ended", "summary": summary}

# Update agent state (called from agent.py)
@app.post("/update-state")
async def update_state(data: dict):
    room = data.get("room")
    if room in call_states:
        call_states[room].update({
            "agent_state": data.get("agent_state", call_states[room]["agent_state"]),
            "intent": data.get("intent", call_states[room]["intent"]),
            "action": data.get("action", call_states[room]["action"]),
        })
        await broadcast_state(room)
    return {"status": "updated"}

# Save transcript entry (called from agent.py)
@app.post("/save-transcript")
async def save_transcript_route(data: dict):
    call_id = data.get("call_id")
    speaker = data.get("speaker")
    message = data.get("message")
    room = data.get("room")

    await save_transcript(call_id, speaker, message)

    if room in call_states:
        call_states[room]["transcript"].append({
            "speaker": speaker,
            "message": message
        })
        await broadcast_state(room)

    return {"status": "saved"}

# WebSocket for live monitoring
@app.websocket("/ws/monitor/{room}")
async def monitor_websocket(websocket: WebSocket, room: str):
    await websocket.accept()

    if room not in active_monitors:
        active_monitors[room] = []
    active_monitors[room].append(websocket)

    try:
        # Send current state immediately on connect
        if room in call_states:
            await websocket.send_text(json.dumps(call_states[room]))

        while True:
            await websocket.receive_text()  # Keep connection alive

    except WebSocketDisconnect:
        active_monitors[room].remove(websocket)

async def broadcast_state(room: str):
    if room in active_monitors:
        state = call_states.get(room, {})
        dead = []
        for ws in active_monitors[room]:
            try:
                await ws.send_text(json.dumps(state))
            except:
                dead.append(ws)
        for ws in dead:
            active_monitors[room].remove(ws)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)