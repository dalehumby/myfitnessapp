# backend/app.py
from flask import Flask, request, jsonify, g, render_template, redirect, url_for
from .database import get_db, close_db, init_db, query_db, insert_db
import click
import datetime
import sqlite3

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


# --- Helper function to populate previous session data ---
# Renamed function for consistency
def populate_previous_session_data_for_session(session_id):
    """
    Finds previous session data for exercises in the given session
    and populates the new session's sets.
    Assumes 'set_number' column in exercise_set is the set number (1, 2, ...).
    """
    db = get_db()  # Get database connection

    # Get the exercises for the newly created session (ordered by day_exercise.exercise_sequence)
    session_exercises = query_db(
        """
        SELECT de.exercise_id, de.exercise_sequence
        FROM day_exercise de
        JOIN session s ON de.day_id = s.day_id
        WHERE s.id = ?
        ORDER BY de.exercise_sequence
    """,
        (session_id,),
    )

    for session_exercise in session_exercises:
        exercise_id = session_exercise["exercise_id"]
        # exercise_sequence_in_day is not needed for set matching

        # Find the most recent previous session ID for this exercise
        # Join exercise_set with session and order sessions by start_time descending.
        # Exclude the current session.
        last_session = query_db(
            """
            SELECT es.session_id
            FROM exercise_set es
            JOIN session s ON es.session_id = s.id
            WHERE es.exercise_id = ? AND s.id != ? -- Exclude current session
            ORDER BY s.start_time DESC
            LIMIT 1
        """,
            (exercise_id, session_id),
            one=True,
        )

        if last_session:
            last_session_id = last_session["session_id"]

            # Get all set data for this exercise from that last session, ordered by set number
            # Renamed variable for consistency
            last_session_sets = query_db(
                """
                SELECT set_number, set_type, weight, reps
                FROM exercise_set
                WHERE session_id = ? AND exercise_id = ?
                ORDER BY set_number -- Order by set number
            """,
                (last_session_id, exercise_id),
            )

            # Get the sets for the *current* session's exercise
            current_session_sets = query_db(
                """
                SELECT id, set_number, set_type, weight, reps
                FROM exercise_set
                WHERE session_id = ? AND exercise_id = ?
            """,
                (session_id, exercise_id),
            )

            # Now, iterate through the previous sets and update the matching current sets
            for prev_set in last_session_sets:  # Renamed variable
                # Find the matching set in the current session by set type and set number
                matching_current_set = next(
                    (
                        item
                        for item in current_session_sets
                        if item["set_type"] == prev_set["set_type"]
                        and item["set_number"] == prev_set["set_number"]
                    ),
                    None,
                )

                if matching_current_set:
                    # Found a match, update the weight and reps in the current session's set
                    update_fields = {}
                    if prev_set["weight"] is not None:
                        # Apply progressive overload here if desired
                        # For now, just copy the previous weight
                        update_fields["weight"] = prev_set["weight"]
                        # Example Progressive Overload:
                        # if prev_set['set_type'] == 'working':
                        #     # Ensure previous weight is treated as a number (handle None/zero)
                        #     update_fields['weight'] = (prev_set['weight'] or 0) + 2.5 # Add 2.5kg

                    if prev_set["reps"] is not None:
                        # For now, just copy the previous reps
                        update_fields["reps"] = prev_set["reps"]

                    if update_fields:
                        try:
                            # Update the database for this specific set
                            update_query = (
                                "UPDATE exercise_set SET "
                                + ", ".join(
                                    [f"{field} = ?" for field in update_fields.keys()]
                                )
                                + " WHERE id = ?"
                            )
                            update_args = list(update_fields.values()) + [
                                matching_current_set["id"]
                            ]
                            db.execute(update_query, update_args)
                            # No commit here, commit will be done in create_session after populating all exercises

                        except sqlite3.Error as e:
                            print(
                                f"Database error updating set {matching_current_set['id']}: {e}"
                            )
                            # Handle error as appropriate for your app

    # db.commit() is handled by the caller (create_session)
    # db connection is managed by Flask's appcontext teardown
    pass  # Helper function finishes


# --- Routes to serve HTML pages ---


@app.route("/")
def index():
    return render_template("index.html")


# Route for starting a session (unchanged)
@app.route("/start-session")
def start_session_page():
    return render_template("start_session.html")


# Route for viewing exercises within a session (unchanged)
@app.route("/session/<int:session_id>/exercises")
def session_exercises_page(session_id):
    session = query_db("SELECT id FROM session WHERE id = ?", (session_id,), one=True)
    if session is None:
        return "Session not found", 404
    return render_template("session_exercises.html")


# Route for viewing a specific exercise within a session (unchanged)
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


# Route for workout complete page, accepting session_id
# Renamed from /workout-complete
@app.route("/session/<int:session_id>/complete")
def session_complete_page(session_id):
    # Optionally check if session exists and is completed before rendering
    session = query_db("SELECT id FROM session WHERE id = ?", (session_id,), one=True)
    if session is None:
        return "Session not found", 404

    # Could add logic here to mark session as completed in DB if desired

    return render_template(
        "workout_complete.html", session_id=session_id
    )  # Pass session_id to template


# --- API Endpoints ---


# Get all programs (unchanged)
@app.route("/api/programs", methods=["GET"])
def get_programs():
    programs = query_db("SELECT * FROM program")
    return jsonify([dict(p) for p in programs])


# Get days for a specific program (unchanged)
@app.route("/api/program/<int:program_id>/days", methods=["GET"])
def get_days_for_program(program_id):
    days = query_db("SELECT * FROM day WHERE program_id = ?", (program_id,))
    if not days:
        return jsonify({"error": "Program not found or has no days"}), 404
    return jsonify([dict(d) for d in days])


# Create a new session (calls renamed helper function)
# Renamed sets_created_info to session_sets_created_info for consistency
@app.route("/api/sessions", methods=["POST"])
def create_session():
    data = request.json
    day_id = data.get("day_id")

    if not day_id:
        return jsonify({"error": "Missing day_id"}), 400

    day = query_db("SELECT * FROM day WHERE id = ?", (day_id,), one=True)
    if not day:
        return jsonify({"error": "Day not found"}), 404

    db = get_db()

    try:
        # Create the session
        cursor = db.execute("INSERT INTO session (day_id) VALUES (?)", (day_id,))
        session_id = cursor.lastrowid

        # Get the exercises for this day, in their correct sequence (day_exercise.exercise_sequence)
        day_exercises = query_db(
            "SELECT exercise_id, exercise_sequence FROM day_exercise WHERE day_id = ? ORDER BY exercise_sequence",
            (day_id,),
        )

        session_sets_created_info = []  # Renamed variable

        for day_exercise in day_exercises:
            exercise_id = day_exercise["exercise_id"]
            exercise = query_db(
                "SELECT * FROM exercise WHERE id = ?", (exercise_id,), one=True
            )

            if exercise:
                for i in range(exercise["warmup_sets"] or 0):
                    set_number = i + 1
                    set_id = db.execute(
                        """INSERT INTO exercise_set (session_id, exercise_id, set_number, set_type, weight, reps, completed)
                                         VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (
                            session_id,
                            exercise_id,
                            set_number,
                            "warmup",
                            None,
                            None,
                            False,
                        ),
                    ).lastrowid
                    session_sets_created_info.append(
                        {
                            "id": set_id,
                            "exercise_id": exercise_id,
                            "set_type": "warmup",
                            "set_number": set_number,
                        }
                    )

                for i in range(exercise["working_sets"] or 0):
                    set_number = i + 1
                    set_id = db.execute(
                        """INSERT INTO exercise_set (session_id, exercise_id, set_number, set_type, weight, reps, completed)
                                         VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (
                            session_id,
                            exercise_id,
                            set_number,
                            "working",
                            None,
                            None,
                            False,
                        ),
                    ).lastrowid
                    session_sets_created_info.append(
                        {
                            "id": set_id,
                            "exercise_id": exercise_id,
                            "set_type": "working",
                            "set_number": set_number,
                        }
                    )

        # Populate with previous session data using the renamed helper
        populate_previous_session_data_for_session(session_id)

        db.commit()

        return (
            jsonify(
                {
                    "message": "Session created",
                    "session_id": session_id,
                    "session_sets_created_info": session_sets_created_info,
                }
            ),
            201,
        )  # Renamed key

    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error creating session: {e}")
        return jsonify({"error": "Database error creating session"}), 500
    finally:
        pass


# Get exercises for a specific session (unchanged, uses correct names)
@app.route("/api/session/<int:session_id>/exercises", methods=["GET"])
def get_exercises_for_session(session_id):
    session = query_db(
        "SELECT day_id FROM session WHERE id = ?", (session_id,), one=True
    )
    if not session:
        return jsonify({"error": "Session not found"}), 404

    day_id = session["day_id"]

    day_exercises = query_db(
        """
        SELECT de.exercise_id, e.title, de.exercise_sequence
        FROM day_exercise de
        JOIN exercise e ON de.exercise_id = e.id
        WHERE de.day_id = ?
        ORDER BY de.exercise_sequence
    """,
        (day_id,),
    )

    return jsonify([dict(de) for de in day_exercises])


# Get details and sets for a specific exercise within a session (unchanged, uses correct names)
@app.route("/api/session/<int:session_id>/exercise/<int:exercise_id>", methods=["GET"])
def get_session_exercise_details_api(session_id, exercise_id):
    exercise = query_db("SELECT * FROM exercise WHERE id = ?", (exercise_id,), one=True)
    if not exercise:
        return jsonify({"error": "Exercise not found"}), 404

    sets = query_db(
        """
        SELECT id, session_id, exercise_id, set_number, set_type, weight, reps, completed, start_time, end_time
        FROM exercise_set
        WHERE session_id = ? AND exercise_id = ?
        ORDER BY set_number
    """,
        (session_id, exercise_id),
    )

    return jsonify({"exercise": dict(exercise), "sets": [dict(s) for s in sets]})


# Update a set (unchanged, uses correct table name)
@app.route("/api/sets/<int:set_id>", methods=["PUT"])
def update_set(set_id):
    data = request.json
    update_fields = {}
    if "weight" in data:
        try:
            update_fields["weight"] = (
                float(data["weight"]) if data["weight"] != "" else None
            )
        except ValueError:
            return jsonify({"error": "Invalid weight value"}), 400

    if "reps" in data:
        try:
            update_fields["reps"] = int(data["reps"]) if data["reps"] != "" else None
        except ValueError:
            return jsonify({"error": "Invalid reps value"}), 400

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
    try:
        cursor = db.execute(query, args)
        db.commit()
        row_count = cursor.rowcount
        cursor.close()

        if row_count == 0:
            return jsonify({"error": "Set not found"}), 404

        return jsonify({"message": "Set updated"})
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error updating set {set_id}: {e}")
        return jsonify({"error": "Database error updating set"}), 500


# Get recent sessions (unchanged, uses correct names)
@app.route("/api/sessions/recent", methods=["GET"])
def get_recent_sessions():
    recent_sessions = query_db(
        """
        SELECT
            s.id AS session_id,
            s.start_time AS session_start_time,
            DATE(s.start_time) AS session_date_display,
            d.title AS day_title,
            p.title AS program_title,
            GROUP_CONCAT(e.title, ', ' ORDER BY de.exercise_sequence) AS exercise_summary
        FROM session s
        JOIN day d ON s.day_id = d.id
        JOIN program p ON d.program_id = p.id
        JOIN day_exercise de ON d.id = de.day_id
        JOIN exercise e ON de.exercise_id = e.id
        GROUP BY s.id, s.start_time, DATE(s.start_time), d.title, p.title
        ORDER BY s.start_time DESC, s.id DESC
        LIMIT 10
    """
    )

    return jsonify([dict(row) for row in recent_sessions])


# New API endpoint for completed session message, accepts session_id
# Renamed from /api/motivational-message
@app.route("/api/session/<int:session_id>/completed-message", methods=["GET"])
def get_completed_session_message(session_id):
    # In the future, this could use the session_id to fetch session data
    # and generate a dynamic message based on performance.
    # For now, return a static message.
    message = {
        "message": "Dale, you crushed today’s workout—tripling your deadlift from 6 kg to 45 kg and powering through 3 full sets at that weight shows insane progress and unstoppable momentum! 💪🔥"
        # You could potentially fetch session data here like:
        # session_data = query_db('SELECT * FROM session WHERE id = ?', (session_id,), one=True)
        # And use it to personalize the message.
    }
    return jsonify(message)


if __name__ == "__main__":
    # This block is executed when the script is run directly
    app.run(debug=True)
