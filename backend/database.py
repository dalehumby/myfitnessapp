# backend/database.py
import sqlite3
from flask import g, current_app
import os

# Get the database path from an environment variable,
# defaulting to a local path relative to the project root if not set.
DATABASE = os.getenv("DATABASE_PATH", "./data/database.sqlite")


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
    db.execute("PRAGMA foreign_keys = ON;")
    db.row_factory = sqlite3.Row
    return db


def close_db(e=None):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    # Ensure the directory for the database file exists before initializing
    db_dir = os.path.dirname(DATABASE)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        print(f"Created database directory: {db_dir}")  # Log for debugging
    db = get_db()
    with current_app.open_resource("schema.sql", mode="r") as f:
        db.cursor().executescript(f.read())
    db.commit()


def query_db(query, args=(), one=False):
    db = get_db()
    cur = db.execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv


def insert_db(query, args=()):
    db = get_db()
    cur = db.execute(query, args)
    db.commit()
    lastrowid = cur.lastrowid
    cur.close()
    return lastrowid


# You'll need to register these with your Flask app
# app.teardown_appcontext(close_db)
# app.cli.add_command(init_db_command)
