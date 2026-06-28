import aiosqlite
import os
from datetime import datetime

DB_PATH = "appointments.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                reason TEXT NOT NULL,
                preferred_date TEXT NOT NULL,
                preferred_time TEXT NOT NULL,
                contact TEXT NOT NULL,
                status TEXT DEFAULT 'booked',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS calls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_name TEXT NOT NULL,
                started_at TEXT DEFAULT CURRENT_TIMESTAMP,
                ended_at TEXT,
                summary TEXT,
                status TEXT DEFAULT 'active'
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS transcripts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                call_id INTEGER,
                speaker TEXT,
                message TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (call_id) REFERENCES calls(id)
            )
        ''')
        await db.commit()

async def check_availability(date: str, time: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT COUNT(*) FROM appointments WHERE preferred_date=? AND preferred_time=? AND status='booked'",
            (date, time)
        )
        count = await cursor.fetchone()
        return count[0] == 0  # True = available

async def book_appointment(name: str, reason: str, date: str, time: str, contact: str) -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO appointments (name, reason, preferred_date, preferred_time, contact) VALUES (?, ?, ?, ?, ?)",
            (name, reason, date, time, contact)
        )
        await db.commit()
        return {
            "id": cursor.lastrowid,
            "name": name,
            "reason": reason,
            "date": date,
            "time": time,
            "contact": contact,
            "status": "booked"
        }

async def save_call(room_name: str) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO calls (room_name) VALUES (?)", (room_name,)
        )
        await db.commit()
        return cursor.lastrowid

async def end_call(call_id: int, summary: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE calls SET ended_at=?, summary=?, status='ended' WHERE id=?",
            (datetime.now().isoformat(), summary, call_id)
        )
        await db.commit()

async def save_transcript(call_id: int, speaker: str, message: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO transcripts (call_id, speaker, message) VALUES (?, ?, ?)",
            (call_id, speaker, message)
        )
        await db.commit()

async def get_transcripts(call_id: int) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT speaker, message, timestamp FROM transcripts WHERE call_id=? ORDER BY timestamp",
            (call_id,)
        )
        rows = await cursor.fetchall()
        return [{"speaker": r[0], "message": r[1], "timestamp": r[2]} for r in rows]