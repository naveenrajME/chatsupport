import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

pool: asyncpg.Pool = None


async def connect_db():
    global pool
    pool = await asyncpg.create_pool(os.getenv("DATABASE_URL"))

    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                ticket_id VARCHAR(50) UNIQUE NOT NULL,
                issue_description TEXT NOT NULL,
                contact VARCHAR(255) NOT NULL,
                contact_type VARCHAR(50) NOT NULL,
                second_contact VARCHAR(255),
                second_contact_type VARCHAR(50),
                user_name VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Created',
                notes TEXT DEFAULT '',
                attachment_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                closed_at TIMESTAMP
            )
        """)

    print("Connected to PostgreSQL")


async def close_db():
    global pool
    if pool:
        await pool.close()


def get_db() -> asyncpg.Pool:
    return pool
