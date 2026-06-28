import os
from openai import AsyncOpenAI
from dotenv import load_dotenv
from booking import get_transcripts

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_summary(call_id: int, collected_info: dict) -> str:
    """
    Generate a post-call summary using OpenAI
    """
    try:
        # Get full transcript from DB
        transcripts = await get_transcripts(call_id)

        if not transcripts:
            return "No transcript available for this call."

        # Format transcript for LLM
        transcript_text = "\n".join([
            f"{t['speaker'].upper()}: {t['message']}"
            for t in transcripts
        ])

        # Build appointment info string
        name = collected_info.get("name") or "Not collected"
        reason = collected_info.get("reason") or "Not collected"
        date = collected_info.get("date") or "Not collected"
        time = collected_info.get("time") or "Not collected"
        contact = collected_info.get("contact") or "Not collected"

        appointment_info = f"""
Appointment Details Collected:
- Name: {name}
- Reason: {reason}
- Date: {date}
- Time: {time}
- Contact: {contact}
"""

        prompt = f"""
You are a medical receptionist assistant. 
Below is a transcript of a call between an AI voice agent (Clara) and a caller.
Generate a clear, concise post-call summary.

{appointment_info}

TRANSCRIPT:
{transcript_text}

Please provide:
1. A brief summary of the call (2-3 sentences)
2. Appointment status (booked / not booked / transferred)
3. Key details collected
4. Any issues or follow-up needed
5. Overall call outcome

Keep it professional and concise.
"""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful medical receptionist assistant that generates call summaries."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500
        )

        return response.choices[0].message.content

    except Exception as e:
        print(f"Summary generation error: {e}")
        return f"Call completed. Appointment details: Name={collected_info.get('name')}, Reason={collected_info.get('reason')}, Date={collected_info.get('date')}, Time={collected_info.get('time')}"


async def generate_quick_summary(transcript_list: list) -> str:
    """
    Quick summary from a list of transcript dicts (used during live call)
    """
    try:
        if not transcript_list:
            return "No conversation yet."

        transcript_text = "\n".join([
            f"{t['speaker'].upper()}: {t['message']}"
            for t in transcript_list
        ])

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Summarize this call transcript in 2 sentences."
                },
                {
                    "role": "user",
                    "content": transcript_text
                }
            ],
            max_tokens=150
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"Summary unavailable: {e}"