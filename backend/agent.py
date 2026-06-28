import os
import asyncio
import aiohttp
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins.groq import STT, LLM
from livekit.plugins.cartesia import TTS
from booking import check_availability, book_appointment

load_dotenv()

SERVER_URL = "http://localhost:8000"

async def notify_server(endpoint: str, data: dict):
    async with aiohttp.ClientSession() as session:
        try:
            await session.post(f"{SERVER_URL}/{endpoint}", json=data)
        except:
            pass

class AppointmentAgent(Agent):
    def __init__(self, room_name: str, call_id: int):
        super().__init__(
            instructions="""
You are a friendly medical receptionist voice agent named Clara.
Your job is to:
1. Greet the caller warmly
2. Collect their details to book an appointment:
   - Full name
   - Reason for visit
   - Preferred date (ask for a specific date)
   - Preferred time (morning/afternoon/evening)
   - Contact number
3. Check availability and confirm the booking
4. If the caller mentions billing, complaints, or wants to talk to a human — initiate a warm transfer

Always be polite, concise, and speak naturally.
Confirm all details before booking.
After booking, read back the confirmation clearly.
"""
        )
        self.room_name = room_name
        self.call_id = call_id
        self.collected = {
            "name": None,
            "reason": None,
            "date": None,
            "time": None,
            "contact": None
        }

    async def on_user_turn_completed(self, turn_ctx, new_message):
        try:
            user_msg = new_message.text_content or str(new_message)
        except:
            user_msg = "..."

        await notify_server("save-transcript", {
            "call_id": self.call_id,
            "room": self.room_name,
            "speaker": "caller",
            "message": user_msg
        })

        transfer_keywords = ["billing", "complaint", "human", "person", "manager", "transfer", "speak to someone"]
        if any(kw in user_msg.lower() for kw in transfer_keywords):
            await notify_server("update-state", {
                "room": self.room_name,
                "agent_state": "transferring",
                "intent": "warm_transfer",
                "action": "Initiating warm transfer to human agent..."
            })
            return

        await notify_server("update-state", {
            "room": self.room_name,
            "agent_state": "thinking",
            "intent": "booking",
            "action": "Processing your request..."
        })

        await super().on_user_turn_completed(turn_ctx, new_message)

    async def on_agent_turn_completed(self, turn_ctx, new_message):
        try:
            agent_msg = new_message.text_content or str(new_message)
        except:
            agent_msg = "..."

        await notify_server("save-transcript", {
            "call_id": self.call_id,
            "room": self.room_name,
            "speaker": "agent",
            "message": agent_msg
        })

        await notify_server("update-state", {
            "room": self.room_name,
            "agent_state": "listening",
            "action": "Waiting for caller..."
        })

        await super().on_agent_turn_completed(turn_ctx, new_message)

    async def handle_booking(self, session: AgentSession):
        info = self.collected
        if all(info.values()):
            await notify_server("update-state", {
                "room": self.room_name,
                "agent_state": "thinking",
                "action": "Checking availability..."
            })

            available = await check_availability(info["date"], info["time"])

            if available:
                await notify_server("update-state", {
                    "room": self.room_name,
                    "action": "Booking appointment..."
                })
                result = await book_appointment(
                    info["name"], info["reason"],
                    info["date"], info["time"], info["contact"]
                )
                await session.say(
                    f"Great! I've booked your appointment. "
                    f"{info['name']}, your appointment for {info['reason']} "
                    f"is confirmed on {info['date']} at {info['time']}. "
                    f"We'll contact you at {info['contact']}. "
                    f"Your booking ID is {result['id']}. Is there anything else I can help you with?"
                )
            else:
                await session.say(
                    f"I'm sorry, {info['time']} on {info['date']} is not available. "
                    f"Could you please suggest another date or time?"
                )
                self.collected["date"] = None
                self.collected["time"] = None

    async def initiate_transfer(self, turn_ctx):
        from transfer import warm_transfer
        await self.session.say(
            "I understand you'd like to speak with a human agent. "
            "Please hold on while I connect you. This will just take a moment."
        )
        await warm_transfer(self.room_name, self.call_id, self.collected)


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    room_name = ctx.room.name

    try:
        call_id = await get_call_id(room_name)
    except:
        call_id = 1

    await notify_server("update-state", {
        "room": room_name,
        "agent_state": "listening",
        "intent": None,
        "action": "Agent connected, waiting for caller..."
    })

    agent = AppointmentAgent(room_name=room_name, call_id=call_id)

    session = AgentSession(
        stt=STT(),
        llm=LLM(model="llama3-8b-8192"),
        tts=TTS(),
    )

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(),
    )
    @session.on("conversation_item_added")
    def on_item_added(item):
        try:
            role = getattr(item, 'role', 'unknown')
            content = getattr(item, 'text_content', '') or getattr(item, 'content', '') or str(item)
            speaker = "agent" if role == "assistant" else "caller"
            asyncio.ensure_future(notify_server("save-transcript", {
                "call_id": call_id,
                "room": room_name,
                "speaker": speaker,
                "message": str(content)
            }))
        except Exception as e:
            print(f"Transcript error: {e}")

    await asyncio.sleep(2)

    await session.say(
        "Hello! Thank you for calling. My name is Clara and I'm here to help you "
        "book an appointment. Could I start with your full name please?"
    )

    await ctx.wait_for_disconnect()

    summary = f"Call ended. Room: {room_name}. Appointment details: {agent.collected}"

    await notify_server("end-call", {
        "room": room_name,
        "call_id": call_id,
        "summary": summary
    })


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )