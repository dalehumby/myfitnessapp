// backend/static/exercise_detail.js

document.addEventListener('DOMContentLoaded', () => {
    const exerciseTitle = document.getElementById('exercise-title');
    const exerciseTarget = document.getElementById('exercise-target');
    const warmupSetsDiv = document.getElementById('warmup-sets');
    const workingSetsDiv = document.getElementById('working-sets');
    const addSetButtons = document.querySelectorAll('.add-set-button');

    const homeButton = document.getElementById('home-button');
    const prevExerciseButton = document.getElementById('prev-exercise');
    const nextExerciseButton = document.getElementById('next-exercise');


    // Get session and exercise ID from the URL
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[2];
    const exerciseId = pathParts[4];

    if (!sessionId || !exerciseId) {
        exerciseTitle.textContent = 'Session or Exercise ID not provided in URL.';
        // Hide navigation buttons if essential IDs are missing
        prevExerciseButton.classList.add('hidden');
        nextExerciseButton.classList.add('hidden');
        return;
    }

    let sessionExercises = []; // Array of exercise objects for the current session
    let currentExerciseIndex = -1; // Index of the current exercise in the sessionExercises array
    let currentExerciseSets = []; // Array of set objects for the current exercise in the current session


    // Function to fetch the list of exercises for the session (for navigation)
    async function fetchSessionExercisesForNavigation(sessionId) {
         try {
            const response = await fetch(`/api/session/${sessionId}/exercises`);
            sessionExercises = await response.json();
            // Find the index of the current exercise based on exercise_id
            currentExerciseIndex = sessionExercises.findIndex(ex => ex.exercise_id == parseInt(exerciseId)); // Ensure exerciseId is treated as a number

            // Update navigation button display (text and visibility)
            updateNavigationButtonDisplay();

        } catch (error) {
            console.error('Error fetching session exercises for navigation:', error);
            // Hide buttons if exercises can't be fetched
            prevExerciseButton.classList.add('hidden');
            nextExerciseButton.classList.add('hidden');
        }
    }


    // Function to fetch exercise details and sets for the current session
    async function fetchExerciseDetails(sessionId, exerciseId) {
        try {
            const response = await fetch(`/api/session/${sessionId}/exercise/${exerciseId}`);
            const data = await response.json();
            if (response.ok) {
                displayExercise(data.exercise, data.sets);
                // Store the fetched sets to check completion status later
                currentExerciseSets = data.sets;
                // After displaying sets, update the state of the "Complete Workout" button
                updateCompleteWorkoutButtonState();

            } else {
                exerciseTitle.textContent = 'Error loading exercise: ' + data.error;
                 warmupSetsDiv.innerHTML = '';
                 workingSetsDiv.innerHTML = '';
                 currentExerciseSets = []; // Clear sets on error
                 updateCompleteWorkoutButtonState(); // Update button state
            }

        } catch (error) {
            console.error('Error fetching exercise details:', error);
             exerciseTitle.textContent = 'Error loading exercise.';
             warmupSetsDiv.innerHTML = '';
             workingSetsDiv.innerHTML = '';
             currentExerciseSets = []; // Clear sets on error
             updateCompleteWorkoutButtonState(); // Update button state
        }
    }


    // Function to display exercise data and sets (remains the same)
    function displayExercise(exercise, sets) {
        exerciseTitle.textContent = exercise.title;
        // exerciseTarget.textContent = `Target: ${exercise.target || 'N/A'}`;

        // Clear existing sets
        warmupSetsDiv.innerHTML = '';
        workingSetsDiv.innerHTML = '';

        // Render sets
        sets.forEach(set => {
            const setElement = createSetElement(set);
            if (set.set_type === 'warmup') {
                warmupSetsDiv.appendChild(setElement);
            } else if (set.set_type === 'working') {
                workingSetsDiv.appendChild(setElement);
            }
        });
    }

    // Function to create the HTML for a single set (remains the same)
    function createSetElement(set) {
        const setDiv = document.createElement('div');
        setDiv.classList.add('set-item');
        setDiv.dataset.setId = set.id;
        setDiv.dataset.setType = set.set_type;
        setDiv.dataset.setNumber = set.set_number;


        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.placeholder = 'Weight';
        weightInput.dataset.setId = set.id;
        weightInput.addEventListener('change', handleSetInputChange);

        const kgText = document.createElement('span');
        kgText.textContent = ' kg ';

        const repsInput = document.createElement('input');
        repsInput.type = 'number';
        repsInput.placeholder = 'Reps';
        repsInput.dataset.setId = set.id;
        repsInput.addEventListener('change', handleSetInputChange);

        const repsText = document.createElement('span');
        repsText.textContent = ' reps';


        setDiv.appendChild(weightInput);
        setDiv.appendChild(kgText);
        setDiv.appendChild(repsInput);
        setDiv.appendChild(repsText);


        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('set-actions');

        const completeButton = document.createElement('button');
        completeButton.classList.add('complete-set-button');
        completeButton.dataset.setId = set.id;
        completeButton.textContent = set.completed ? '✔️' : '□';
        completeButton.addEventListener('click', handleCompleteSet);

        actionsDiv.appendChild(completeButton);

        setDiv.appendChild(actionsDiv);

        weightInput.value = set.weight !== null ? set.weight : '';
        repsInput.value = set.reps !== null ? set.reps : '';

        return setDiv;
    }

    // Event handler for input changes (weight/reps) - remains the same
    async function handleSetInputChange(event) {
        const setId = event.target.dataset.setId;
        const field = event.target.placeholder.toLowerCase();
        const value = event.target.value;

        let typedValue = value;
        if (field === 'weight') {
            typedValue = value !== '' ? parseFloat(value) : null;
             if (value !== '' && (isNaN(typedValue) || !isFinite(typedValue))) {
                 console.error("Invalid input for weight:", value);
                 alert("Please enter a valid number for weight.");
                 event.target.value = '';
                 return;
             }
        } else if (field === 'reps') {
            typedValue = value !== '' ? parseInt(value, 10) : null;
             if (value !== '' && (isNaN(typedValue) || !isFinite(typedValue))) {
                 console.error("Invalid input for reps:", value);
                 alert("Please enter a valid number for reps.");
                 event.target.value = '';
                 return;
             }
        }

         try {
            const response = await fetch(`/api/sets/${setId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [field]: typedValue })
            });
            const data = await response.json();
            if (!response.ok) {
                console.error(`Failed to update ${field}:`, data.error);
                alert(`Error updating ${field}: ${data.error}`);
            } else {
                 console.log(`${field} updated successfully.`);
            }
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
             alert(`An error occurred while updating ${field}.`);
        }
    }


    // Event handler for completing/uncompleting a set - MODIFIED to update button state
    async function handleCompleteSet(event) {
        const completeButton = event.target;
        const setId = completeButton.dataset.setId;
        const isCurrentlyCompleted = completeButton.textContent === '✔️';
        const newState = !isCurrentlyCompleted;

        const setItemElement = completeButton.closest('.set-item');
        if (!setItemElement) {
            console.error('Could not find parent .set-item element for set ID:', setId);
            alert('An error occurred while finding set data.');
            return;
        }

        const weightInput = setItemElement.querySelector('input[placeholder="Weight"]');
        const repsInput = setItemElement.querySelector('input[placeholder="Reps"]');

        const currentWeight = weightInput && weightInput.value !== '' ? parseFloat(weightInput.value) : null;
        const currentReps = repsInput && repsInput.value !== '' ? parseInt(repsInput.value, 10) : null;

         if (weightInput && weightInput.value !== '' && (isNaN(currentWeight) || !isFinite(currentWeight))) {
              alert('Invalid weight value.');
              return;
         }
         if (repsInput && repsInput.value !== '' && (isNaN(currentReps) || !isFinite(currentReps))) {
             alert('Invalid reps value.');
             return;
         }


        const updateData = {
            completed: newState,
            weight: currentWeight,
            reps: currentReps
        };

        try {
            const response = await fetch(`/api/sets/${setId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();
            if (response.ok) {
                completeButton.textContent = newState ? '✔️' : '□';
                console.log(`Set ${setId} updated: completed=${newState}, weight=${currentWeight}, reps=${currentReps}`);

                // Update the completed status in the local currentExerciseSets array
                const setIndex = currentExerciseSets.findIndex(set => set.id == setId);
                if (setIndex !== -1) {
                    currentExerciseSets[setIndex].completed = newState;
                }

                // Check and update the state of the "Complete Workout" button
                updateCompleteWorkoutButtonState();

            } else {
                console.error('Failed to update set:', data.error);
                alert('Error updating set: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating set:', error);
            alert('An error occurred while updating the set.');
        }
    }


    // Event handler for adding a new set (remains the same placeholder)
     async function handleAddSet(event) {
         const setType = event.target.dataset.setType;
          alert("Adding sets functionality needs to be fully implemented.");
     }

    addSetButtons.forEach(button => {
        button.addEventListener('click', handleAddSet);
    });


    // --- Navigation Button Display and Logic ---

    // Function to update navigation button display (text and visibility)
    function updateNavigationButtonDisplay() {
        // Hide previous button if it's the first exercise
        if (currentExerciseIndex <= 0) {
            prevExerciseButton.classList.add('hidden');
        } else {
            prevExerciseButton.classList.remove('hidden');
             // Set text to previous exercise name
             const prevExercise = sessionExercises[currentExerciseIndex - 1];
             prevExerciseButton.textContent = `< ${prevExercise.title}`;
        }

        // Check if it's the last exercise
        if (currentExerciseIndex >= sessionExercises.length - 1) {
            // If it's the last exercise, change text to "Complete Workout"
            nextExerciseButton.textContent = 'Complete Workout';
            nextExerciseButton.classList.add('complete-workout-button'); // Add class for styling
            // The disabled state is handled by updateCompleteWorkoutButtonState
        } else {
             // If not the last exercise, set text to next exercise name
             const nextExercise = sessionExercises[currentExerciseIndex + 1];
             nextExerciseButton.textContent = `${nextExercise.title} >`;
             nextExerciseButton.classList.remove('complete-workout-button'); // Remove class
             nextExerciseButton.disabled = false; // Ensure it's not disabled
        }
         // Note: The click listeners for prev/next don't need to change as they check the index
         // and use window.location.href for navigation.
    }

    // Function to check if all sets for the *current* exercise are completed
    function areAllCurrentExerciseSetsCompleted() {
        // Filter for sets that are *not* completed
        const incompleteSets = currentExerciseSets.filter(set => set.completed !== true);
        // If there are no incomplete sets, then all sets are completed
        return incompleteSets.length === 0;
         // If you only require working sets to be completed:
         // const incompleteWorkingSets = currentExerciseSets.filter(set => set.set_type === 'working' && set.completed !== true);
         // return incompleteWorkingSets.length === 0;
    }

    // Function to update the disabled state of the "Complete Workout" button
    function updateCompleteWorkoutButtonState() {
        // Only apply this logic if the next button is currently the "Complete Workout" button
        if (nextExerciseButton.classList.contains('complete-workout-button')) {
            const allCompleted = areAllCurrentExerciseSetsCompleted();
            nextExerciseButton.disabled = !allCompleted; // Disable if not all are completed
        }
    }


    // Event listener for Previous Exercise button (now in footer) - remains the same
    prevExerciseButton.addEventListener('click', () => {
        if (currentExerciseIndex > 0) {
            const prevExercise = sessionExercises[currentExerciseIndex - 1];
            window.location.href = `/session/${sessionId}/exercise/${prevExercise.exercise_id}`;
        }
    });

    // Event listener for Next Exercise / Complete Workout button - MODIFIED REDIRECT
    nextExerciseButton.addEventListener('click', () => {
         if (nextExerciseButton.classList.contains('complete-workout-button') && !nextExerciseButton.disabled) {
             // If all sets are complete and it's the last exercise, go to workout complete page
             // Use the new route format /session/<sessionId>/complete
             window.location.href = `/session/${sessionId}/complete`; // Updated redirect URL
         } else {
             if (currentExerciseIndex < sessionExercises.length - 1) {
                const nextExercise = sessionExercises[currentExerciseIndex + 1];
                window.location.href = `/session/${sessionId}/exercise/${nextExercise.exercise_id}`;
             }
         }
    });


    // --- Home Button Functionality ---
    // Add event listener for the Home button
    homeButton.addEventListener('click', () => {
        window.location.href = '/'; // Redirect to the home page (index.html)
    });


    // --- Initial Load ---

    // Fetch session exercises for navigation first
    fetchSessionExercisesForNavigation(sessionId);

     // Then fetch exercise details and sets
     fetchExerciseDetails(sessionId, exerciseId);
});
