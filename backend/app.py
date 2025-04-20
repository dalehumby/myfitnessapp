# backend/app.py
from flask import Flask, request, jsonify, g, render_template, redirect, url_for
from .database import get_db, close_db, init_db, query_db, insert_db
import click
import datetime

app = Flask(__name__)

# Register database closing with the app
app.teardown_appcontext(close_db)


# Add a command to initialize the database
@click.command("init-db")
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo("Initialized the database.")


app.cli.add_command(init_db_command)


# --- Routes to serve HTML pages ---


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/start-session")
def start_session_page():
    return render_template("start_session.html")


@app.route("/session/<int:session_id>/exercises")
def session_exercises_page(session_id):
    session = query_db("SELECT id FROM session WHERE id = ?", (session_id,), one=True)
    if session is None:
        return "Session not found", 404
    return render_template("session_exercises.html")


@app.route("/session/<int:session_id>/exercise/<int:exercise_id>")
def exercise_detail_page(session_id, exercise_id):
    session = query_db("SELECT id FROM session WHERE id = ?", (session_id,), one=True)
    if session is None:
        return "Session not found", 404

    exercise_in_session = query_db(
        """
         SELECT de.exercise_id
         FROM day_exercise de
         JOIN session s ON de.day_id = s.day_id
         WHERE s.id = ? AND de.exercise_id = ?
     """,
        (session_id, exercise_id),
        one=True,
    )

    if exercise_in_session is None:
        return "Exercise not found in this session", 404

    return render_template("exercise_detail.html")


# --- API Endpoints ---


# Get all programs
@app.route("/api/programs", methods=["GET"])
def get_programs():
    programs = query_db("SELECT * FROM program")
    return jsonify([dict(p) for p in programs])


# Get days for a specific program
@app.route("/api/program/<int:program_id>/days", methods=["GET"])
def get_days_for_program(program_id):
    days = query_db("SELECT * FROM day WHERE program_id = ?", (program_id,))
    if not days:
        return jsonify({"error": "Program not found or has no days"}), 404
    return jsonify([dict(d) for d in days])


# Create a new session - MODIFIED INSERT
@app.route("/api/sessions", methods=["POST"])
def create_session():
    data = request.json
    day_id = data.get("day_id")

    if not day_id:
        return jsonify({"error": "Missing day_id"}), 400

    # Check if the day_id exists
    day = query_db("SELECT * FROM day WHERE id = ?", (day_id,), one=True)
    if not day:
        return jsonify({"error": "Day not found"}), 404

    # Create the session - insert into start_time column
    # The default value datetime('now','localtime') will be used automatically
    session_id = insert_db("INSERT INTO session (day_id) VALUES (?)", (day_id,))

    # Now, populate the 'exercise_set' table based on the exercises for this day
    day_exercises = query_db(
        "SELECT * FROM day_exercise WHERE day_id = ? ORDER BY sequence", (day_id,)
    )

    sets_created = []
    for day_exercise in day_exercises:
        exercise_id = day_exercise["exercise_id"]
        exercise = query_db(
            "SELECT * FROM exercise WHERE id = ?", (exercise_id,), one=True
        )

        if exercise:
            # Add warmup sets
            for i in range(exercise["warmup_sets"] or 0):
                set_id = insert_db(
                    """INSERT INTO exercise_set (session_id, exercise_id, sequence, set_type, weight, reps, completed)
                                     VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        session_id,
                        exercise_id,
                        day_exercise["sequence"],
                        "warmup",
                        0,
                        0,
                        False,
                    ),
                )
                sets_created.append(
                    {"id": set_id, "exercise_id": exercise_id, "set_type": "warmup"}
                )

            # Add working sets
            for i in range(exercise["working_sets"] or 0):
                set_id = insert_db(
                    """INSERT INTO exercise_set (session_id, exercise_id, sequence, set_type, weight, reps, completed)
                                     VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        session_id,
                        exercise_id,
                        day_exercise["sequence"],
                        "working",
                        0,
                        0,
                        False,
                    ),
                )
                sets_created.append(
                    {"id": set_id, "exercise_id": exercise_id, "set_type": "working"}
                )

    return (
        jsonify(
            {
                "message": "Session created",
                "session_id": session_id,
                "sets_created": sets_created,
            }
        ),
        201,
    )


# Get exercises for a specific session (no change needed for date column, joining on session_id)
@app.route("/api/session/<int:session_id>/exercises", methods=["GET"])
def get_exercises_for_session(session_id):
    # Get the day_id for the session
    session = query_db(
        "SELECT day_id FROM session WHERE id = ?", (session_id,), one=True
    )
    if not session:
        return jsonify({"error": "Session not found"}), 404

    day_id = session["day_id"]

    # Get the exercises for that day, in order
    day_exercises = query_db(
        """
        SELECT de.exercise_id, e.title, de.sequence
        FROM day_exercise de
        JOIN exercise e ON de.exercise_id = e.id
        WHERE de.day_id = ?
        ORDER BY de.sequence
    """,
        (day_id,),
    )

    return jsonify([dict(de) for de in day_exercises])


# Get details and sets for a specific exercise within a session (no change needed for date column, joining on session_id)
@app.route("/api/session/<int:session_id>/exercise/<int:exercise_id>", methods=["GET"])
def get_session_exercise_details_api(session_id, exercise_id):
    # Get exercise details
    exercise = query_db("SELECT * FROM exercise WHERE id = ?", (exercise_id,), one=True)
    if not exercise:
        return jsonify({"error": "Exercise not found"}), 404

    # Get sets for this exercise in this session
    sets = query_db(
        """
        SELECT * FROM exercise_set
        WHERE session_id = ? AND exercise_id = ?
        ORDER BY sequence
    """,
        (session_id, exercise_id),
    )

    return jsonify({"exercise": dict(exercise), "sets": [dict(s) for s in sets]})


# Update a set (unchanged)
@app.route("/api/sets/<int:set_id>", methods=["PUT"])
def update_set(set_id):
    data = request.json
    update_fields = {}
    if "weight" in data:
        update_fields["weight"] = data["weight"]
    if "reps" in data:
        update_fields["reps"] = data["reps"]
    if "completed" in data:
        update_fields["completed"] = bool(data["completed"])

    if not update_fields:
        return jsonify({"error": "No fields to update"}), 400

    query = (
        "UPDATE exercise_set SET "
        + ", ".join([f"{field} = ?" for field in update_fields.keys()])
        + " WHERE id = ?"
    )
    args = list(update_fields.values()) + [set_id]

    db = get_db()
    cursor = db.execute(query, args)
    db.commit()
    row_count = cursor.rowcount
    cursor.close()

    if row_count == 0:
        return jsonify({"error": "Set not found"}), 404

    return jsonify({"message": "Set updated"})


# Get recent sessions - MODIFIED QUERY
@app.route("/api/sessions/recent", methods=["GET"])
def get_recent_sessions():
    recent_sessions = query_db(
        """
        SELECT
            s.id AS session_id,
            -- Select the full start_time for ordering
            s.start_time AS session_start_time,
            -- Select just the date part for display
            DATE(s.start_time) AS session_date_display,
            d.title AS day_title,
            p.title AS program_title,
            GROUP_CONCAT(e.title, ', ' ORDER BY de.sequence) AS exercise_summary
        FROM session s
        JOIN day d ON s.day_id = d.id
        JOIN program p ON d.program_id = p.id
        JOIN day_exercise de ON d.id = de.day_id
        JOIN exercise e ON de.exercise_id = e.id
        GROUP BY s.id, s.start_time, DATE(s.start_time), d.title, p.title -- Group by session details including start_time and date part
        ORDER BY s.start_time DESC, s.id DESC -- Order by the full start_time
        LIMIT 10
    """
    )

    return jsonify([dict(row) for row in recent_sessions])


if __name__ == "__main__":
    app.run(debug=True)
