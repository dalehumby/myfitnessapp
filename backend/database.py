# backend/database.py
import sqlite3
from flask import g, current_app
import os # Import os for path manipulation and directory creation

# Updated database path to be inside the mounted volume directory
DATABASE = '/app/data/database.sqlite'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        # Ensure the directory exists before trying to connect/create the database file
        # This is important because the bind mount might create the last directory in the path,
        # but not intermediate ones if the host path didn't exist fully.
        # However, Flask's open_resource() might handle the directory creation if the parent exists.
        # Let's add a check in init_db for robustness.
        db = g._database = sqlite3.connect(DATABASE)
    # Enable foreign key support
    db.execute('PRAGMA foreign_keys = ON;')
    # Configure row_factory to return rows as dictionaries
    db.row_factory = sqlite3.Row
    return db

def close_db(e=None):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    # Ensure the directory for the database file exists before initializing
    db_dir = os.path.dirname(DATABASE)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        print(f"Created database directory: {db_dir}") # Log for debugging
    db = get_db()
    with current_app.open_resource('schema.sql', mode='r') as f:
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
