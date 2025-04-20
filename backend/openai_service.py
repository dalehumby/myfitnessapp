# backend/openai_service.py
import os
from openai import OpenAI

# Optional: load environment variables from a .env file
from dotenv import load_dotenv

# Load environment variables from a .env file if it exists
load_dotenv()

# Ensure the OpenAI API key is available
# The OpenAI client constructor will automatically pick up OPENAI_API_KEY
# from the environment, but checking here provides a clearer error message
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    # In a real app, you might raise a specific exception or log this
    print("Error: OPENAI_API_KEY environment variable not set.")
    # Set client to None if key is missing so we don't try to use it
    client = None
else:
    # Initialize the OpenAI client
    try:
        client = OpenAI()
        # Optional: You could add a small call here to test the API key
        # For example: client.models.list() # Note: this adds startup time
    except Exception as e:
        print(f"Error initializing OpenAI client: {e}")
        client = None  # Set client to None if initialization fails


def get_workout_history_csv_for_ai(current_session_id, query_db_func):
    """
    Fetches working set data for the last few sessions relative to the current one
    and formats it as a CSV string for the OpenAI prompt.
    """
    # Define how many previous sessions to fetch data for
    num_previous_sessions = 4  # Including the current session, this makes it the last 5
    min_session_id = max(1, current_session_id - num_previous_sessions)

    # SQL query to fetch working set data for the last few sessions
    # Order by session_id descending then exercise_set.id descending
    # to get the most recent workouts first in the CSV, and sets within them
    workout_history_data = query_db_func(
        f"""
        SELECT
            session_id,
            s.start_time workout_time,
            e.title exercise,
            es.set_number, -- Use set_number
            es.weight weight_kg, -- Use weight
            es.reps reps
        FROM exercise_set es
        JOIN exercise e ON es.exercise_id = e.id
        JOIN session s ON es.session_id = s.id
        WHERE es.set_type = "working" AND
              s.id BETWEEN {min_session_id} AND {current_session_id} -- Filter for the last few sessions by ID range
        ORDER BY s.start_time DESC, es.id DESC -- Order by session start time (most recent first)
    """
    )

    if not workout_history_data:
        return "No workout history available."  # Return a message if no data

    # Format the data as a CSV string
    csv_lines = [
        "session_id,workout_time,exercise,set_number,weight_kg,reps"
    ]  # Header row

    for row in workout_history_data:
        # Format row values, handle None for weight/reps, enclose exercise in quotes
        formatted_row = [
            str(row["session_id"]),
            str(row["workout_time"]),
            f'"{row["exercise"]}"',  # Enclose exercise title in quotes
            str(row["set_number"]),
            (
                str(row["weight_kg"]) if row["weight_kg"] is not None else ""
            ),  # Use empty string for None
            (
                str(row["reps"]) if row["reps"] is not None else ""
            ),  # Use empty string for None
        ]
        csv_lines.append(",".join(formatted_row))

    return "\n".join(csv_lines)


def generate_motivational_message_for_session(username, session_id, query_db_func):
    """
    Calls the OpenAI API to generate a motivational message for a completed session.
    """
    # Check if the OpenAI client was successfully initialized
    if client is None:
        print("OpenAI client is not initialized. Returning fallback message.")
        return "Failed to connect to AI service. Awesome work today! 💪"

    # Get workout history in CSV format
    workout_history_csv = get_workout_history_csv_for_ai(session_id, query_db_func)

    # Construct the prompt for the AI
    # Using the structure provided by the user
    system_prompt = {
        "role": "system",
        "content": [
            {
                "type": "text",
                "text": "You are a motivational personal trainer. You can be serious, funny, give some tough love but you should keep it upbeat and motivational. Limit your response to one sentence.",
            }  # Keep it to one sentence
        ],
    }

    user_prompt_text = f"""Your client "{username}" has just completed workout number {session_id}.
Generate a short motivational message to congratulate them, highlighting any notable achievements from the provided workout history (including this latest session).

Here are the working sets from recent sessions:

{workout_history_csv}
"""

    user_prompt = {
        "role": "user",
        "content": [{"type": "text", "text": user_prompt_text}],
    }

    messages = [system_prompt, user_prompt]

    # --- Make the API Call ---
    try:
        # Using the standard chat completions endpoint
        response = client.chat.completions.create(
            model=os.getenv(
                "OPENAI_MODEL_NAME", "gpt-4.1-nano"
            ),  # Get model name from env var or use default
            messages=messages,
            temperature=1.0,  # Controls randomness. 1.0 is default.
            max_tokens=150,  # Maximum tokens for the response
            top_p=1.0,  # Controls diversity via nucleus sampling. 1.0 is default.
            frequency_penalty=0.0,  # Controls repetition. 0.0 is default.
            presence_penalty=0.0,  # Controls topic novelty. 0.0 is default.
        )

        # Extract the message from the response
        # Accessing the content from the response object
        if (
            response.choices
            and response.choices[0].message
            and response.choices[0].message.content
        ):
            generated_message = response.choices[0].message.content.strip()
            # Add a fallback if the generated message is empty or problematic
            if not generated_message:
                generated_message = "Great job completing your session!"
        else:
            generated_message = (
                "Couldn't generate a specific message, but great session!"
            )
            print("Warning: OpenAI API returned unexpected response structure.")
            # print(response) # Uncomment for debugging the response structure

        return generated_message

    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        # Return a fallback message in case of API errors
        return "Awesome work today! Keep up the effort. 💪"


# Example usage (for testing the service file directly)
if __name__ == "__main__":
    # This part would only run if you execute openai_service.py directly
    # You would need to set OPENAI_API_KEY and potentially OPENAI_MODEL_NAME
    # and provide a dummy query_db_func and a session ID for testing.
    # print(generate_motivational_message_for_session("TestUser", 1, lambda q, a=(): [])) # Example call
    pass
