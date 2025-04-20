// frontend/session_exercises.js

document.addEventListener('DOMContentLoaded', () => {
    const sessionTitle = document.getElementById('session-title');
    const exerciseList = document.getElementById('exercise-list');

    // Get the session ID from the URL (you'll need to pass it here)
    // Example: /session/1/exercises -> sessionId = 1
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[2]; // Assuming URL is /session/<session_id>/exercises

    if (!sessionId) {
        sessionTitle.textContent = 'Session ID not provided in URL.';
        return;
    }

    sessionTitle.textContent = `Session ${sessionId} Exercises`; // Placeholder

    // Fetch exercises for the session
    async function fetchSessionExercises(sessionId) {
        try {
            const response = await fetch(`/api/session/${sessionId}/exercises`);
            const exercises = await response.json();
            if (exercises.length === 0) {
                exerciseList.innerHTML = '<li>No exercises found for this session.</li>';
                return;
            }
            exercises.forEach(exercise => {
                const listItem = document.createElement('li');
                // Link to the exercise detail page
                listItem.innerHTML = `<a href="/session/${sessionId}/exercise/${exercise.exercise_id}">${exercise.title}</a>`;
                exerciseList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error fetching session exercises:', error);
            exerciseList.innerHTML = '<li>Error loading exercises.</li>';
        }
    }

    // Fetch exercises when the page loads
    fetchSessionExercises(sessionId);
});
