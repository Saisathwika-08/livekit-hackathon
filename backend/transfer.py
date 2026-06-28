import os
from twilio.rest import Client
from dotenv import load_dotenv
import aiohttp
import asyncio

load_dotenv()

SERVER_URL = "http://localhost:8000"

def get_twilio_client():
    return Client(
        os.getenv("TWILIO_ACCOUNT_SID"),
        os.getenv("TWILIO_AUTH_TOKEN")
    )

async def notify_server(endpoint: str, data: dict):
    async with aiohttp.ClientSession() as session:
        try:
            await session.post(f"{SERVER_URL}/{endpoint}", json=data)
        except:
            pass

async def warm_transfer(room_name: str, call_id: int, collected_info: dict):
    client = get_twilio_client()

    from_number = os.getenv("TWILIO_PHONE_NUMBER")
    to_number = os.getenv("TRANSFER_PHONE_NUMBER")

    # Build summary of the call so far
    name = collected_info.get("name") or "Unknown"
    reason = collected_info.get("reason") or "Not specified"
    date = collected_info.get("date") or "Not specified"
    time = collected_info.get("time") or "Not specified"

    summary_message = (
        f"Hello, this is Clara the AI assistant. "
        f"I have a caller on the line named {name}. "
        f"They are calling regarding {reason}. "
        f"They requested an appointment on {date} at {time}. "
        f"They would like to speak with a human agent. "
        f"Press 1 to accept the transfer, or press 2 to decline."
    )

    # TwiML for the call
    twiml_accept = f"""
    <Response>
        <Say>{summary_message}</Say>
        <Gather numDigits="1" action="/twilio/response" method="POST">
        </Gather>
    </Response>
    """

    try:
        # Dial the human agent
        call = client.calls.create(
            to=to_number,
            from_=from_number,
            twiml=twiml_accept
        )

        await notify_server("update-state", {
            "room": room_name,
            "agent_state": "transferring",
            "action": f"Calling human agent at {to_number}... Call SID: {call.sid}"
        })

        # Wait and check call status
        await asyncio.sleep(5)
        call_status = client.calls(call.sid).fetch()

        if call_status.status in ["in-progress", "ringing"]:
            await notify_server("update-state", {
                "room": room_name,
                "agent_state": "transferring",
                "action": "Human agent is being connected..."
            })
            return {
                "status": "transfer_initiated",
                "call_sid": call.sid
            }
        else:
            await notify_server("update-state", {
                "room": room_name,
                "agent_state": "listening",
                "action": "Transfer failed, returning to caller..."
            })
            return {
                "status": "transfer_failed",
                "call_sid": call.sid
            }

    except Exception as e:
        print(f"Transfer error: {e}")
        await notify_server("update-state", {
            "room": room_name,
            "agent_state": "listening",
            "action": "Team unavailable, returning to caller..."
        })
        return {"status": "error", "message": str(e)}


async def handle_transfer_response(digit: str, room_name: str, call_id: int):
    """
    Called when human agent presses 1 (accept) or 2 (decline)
    """
    if digit == "1":
        # Human accepted — connect them
        await notify_server("update-state", {
            "room": room_name,
            "agent_state": "transferred",
            "action": "Human agent accepted. Connecting caller..."
        })
        return {
            "status": "accepted",
            "twiml": "<Response><Say>Connecting you now. Have a great conversation.</Say></Response>"
        }
    else:
        # Human declined
        await notify_server("update-state", {
            "room": room_name,
            "agent_state": "listening",
            "action": "Human agent declined. Returning to caller..."
        })
        return {
            "status": "declined",
            "twiml": "<Response><Say>The agent is unavailable. Returning to the caller.</Say></Response>"
        }