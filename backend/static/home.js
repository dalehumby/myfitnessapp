// backend/static/home.js

document.addEventListener('DOMContentLoaded', () => {
    const userNameSpan = document.getElementById('user-name'); // Placeholder

    // Removed references to startWorkoutHeader and startWorkoutDetails
    // Removed startWorkoutCard class toggling and display: none logic

    const programSelect = document.getElementById('program-select');
    const daySelect = document.getElementById('day-select');
    const startSessionButton = document.getElementById('start-session-button');
    const recentWorkoutsList = document.getElementById('recent-workouts-list');

    let selectedProgramId = null;
    let selectedDayId = null;

    // --- Start Workout Section Logic ---

    // Removed: startWorkoutHeader.addEventListener('click', ...)

    // Fetch programs and populate the program select dropdown
    async function fetchPrograms() {
        try {
            const response = await fetch('/api/programs');
            const programs = await response.json();
            programSelect.innerHTML = '<option value="">Program</option>'; // Updated placeholder
            programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program.id;
                option.textContent = program.title;
                programSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching programs:', error);
             programSelect.innerHTML = '<option value="">Error loading programs</option>'; // Updated placeholder
        }
    }

    // Fetch days for the selected program and populate the day select dropdown
    async function fetchDaysForProgram(programId) {
        daySelect.innerHTML = '<option value="">Day</option>'; // Updated placeholder
        daySelect.disabled = true;

        if (!programId) {
            return;
        }

        try {
            const response = await fetch(`/api/program/${programId}/days`);
             if (!response.ok) {
                 console.warn(`Program ${programId} has no days or not found.`);
                 daySelect.innerHTML = '<option value="">No days available</option>'; // Updated placeholder
                 return;
             }
            const days = await response.json();
            days.forEach(day => {
                const option = document.createElement('option');
                option.value = day.id;
                option.textContent = day.title;
                daySelect.appendChild(option);
            });
            daySelect.disabled = false;
        } catch (error) {
            console.error('Error fetching days:', error);
             daySelect.innerHTML = '<option value="">Error loading days</option>'; // Updated placeholder
        } finally {
            checkStartButtonStatus();
        }
    }

    // Event listener for program selection change
    programSelect.addEventListener('change', (event) => {
        selectedProgramId = event.target.value;
        selectedDayId = null;
        daySelect.value = "";
        fetchDaysForProgram(selectedProgramId);
        checkStartButtonStatus();
    });

    // Event listener for day selection change
    daySelect.addEventListener('change', (event) => {
        selectedDayId = event.target.value;
        checkStartButtonStatus();
    });

    // Check if both program and day are selected to enable/disable the start button
    function checkStartButtonStatus() {
        startSessionButton.disabled = !(selectedProgramId && selectedDayId);
    }

    // Event listener for starting a session (remains the same)
    startSessionButton.addEventListener('click', async () => {
        if (!selectedProgramId || !selectedDayId) {
            alert('Please select both a Program and a Day.');
            return;
        }

        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ day_id: selectedDayId })
            });
            const data = await response.json();
            if (response.ok) {
                console.log('New Session created:', data.session_id);
                // Redirect to the first exercise of the new session
                 const exercisesResponse = await fetch(`/api/session/${data.session_id}/exercises`);
                 const exercises = await exercisesResponse.json();

                 if (exercises && exercises.length > 0) {
                     const firstExerciseId = exercises[0].exercise_id;
                     window.location.href = `/session/${data.session_id}/exercise/${firstExerciseId}`;
                 } else {
                     alert('Session created, but no exercises found for this day.');
                      window.location.reload();
                 }


            } else {
                alert('Error creating session: ' + data.error);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            alert('An error occurred while creating the session.');
        }
    });


    // --- Recent Workouts Section Logic ---

    // Function to redirect to the first exercise of a given session (remains the same)
    async function redirectToFirstExercise(sessionId) {
         try {
             const exercisesResponse = await fetch(`/api/session/${sessionId}/exercises`);
             const exercises = await exercisesResponse.json();

             if (exercises && exercises.length > 0) {
                 const firstExerciseId = exercises[0].exercise_id;
                 window.location.href = `/session/${sessionId}/exercise/${firstExerciseId}`;
             } else {
                 alert('Session found, but no exercises linked to this day.');
             }
         } catch (error) {
              console.error('Error fetching exercises for session:', sessionId, error);
              alert('An error occurred while loading session exercises.');
         }
    }


    // Fetch and display recent workouts - MODIFIED DATE REFERENCE
    async function fetchRecentWorkouts() {
        try {
            const response = await fetch('/api/sessions/recent');
            const recentWorkouts = await response.json();

            recentWorkoutsList.innerHTML = ''; // Clear "Loading..."

            if (recentWorkouts.length === 0) {
                recentWorkoutsList.innerHTML = '<li>No recent workouts found.</li>';
                return;
            }

            recentWorkouts.forEach(workout => {
                const listItem = document.createElement('li');
                listItem.dataset.sessionId = workout.session_id;

                // Use session_date_display from the backend for formatting
                const workoutDate = new Date(workout.session_date_display + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });


                // Updated structure to match mockup: Date Program - Day
                listItem.innerHTML = `
                    <div class="recent-workout-header">
                        <span class="recent-workout-date">${workoutDate}</span>
                        <span class="recent-workout-program">${workout.program_title}</span> –
                        <span class="recent-workout-day">${workout.day_title}</span>
                    </div>
                    <div class="recent-workout-exercises">${workout.exercise_summary || 'No exercises recorded'}</div>
                `;
                 listItem.addEventListener('click', () => {
                     const clickedSessionId = listItem.dataset.sessionId;
                     if (clickedSessionId) {
                         redirectToFirstExercise(clickedSessionId);
                     }
                 });


                recentWorkoutsList.appendChild(listItem);
            });

        } catch (error) {
            console.error('Error fetching recent workouts:', error);
            recentWorkoutsList.innerHTML = '<li>Error loading recent workouts.</li>';
        }
    }


    // --- Initial Load ---

    // Fetch data when the page loads
    fetchPrograms();
    fetchRecentWorkouts();
});
