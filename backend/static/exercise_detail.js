// frontend/static/exercise_detail.js

document.addEventListener('DOMContentLoaded', () => {
    const exerciseTitle = document.getElementById('exercise-title');
    const exerciseTarget = document.getElementById('exercise-target');
    const warmupSetsDiv = document.getElementById('warmup-sets');
    const workingSetsDiv = document.getElementById('working-sets');
    const addSetButtons = document.querySelectorAll('.add-set-button');
    const prevExerciseButton = document.getElementById('prev-exercise');
    const nextExerciseButton = document.getElementById('next-exercise');
    const viewPreviousButton = document.getElementById('view-previous');


    // Get session and exercise ID from the URL
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[2];
    const exerciseId = pathParts[4]; // Assuming URL is /session/<session_id>/exercise/<exercise_id>

    if (!sessionId || !exerciseId) {
        exerciseTitle.textContent = 'Session or Exercise ID not provided in URL.';
        return;
    }

    let sessionExercises = [];
    let currentExerciseIndex = -1;


    // Function to fetch the list of exercises for the session (for navigation)
    async function fetchSessionExercisesForNavigation(sessionId) {
         try {
            const response = await fetch(`/api/session/${sessionId}/exercises`);
            sessionExercises = await response.json();
            // Find the index of the current exercise
            currentExerciseIndex = sessionExercises.findIndex(ex => ex.exercise_id == exerciseId);
            updateNavigationButtons();
        } catch (error) {
            console.error('Error fetching session exercises for navigation:', error);
        }
    }


    // Function to fetch exercise details and sets
    async function fetchExerciseDetails(sessionId, exerciseId) {
        try {
            const response = await fetch(`/api/session/${sessionId}/exercise/${exerciseId}`);
            const data = await response.json();
            if (response.ok) {
                displayExercise(data.exercise, data.sets);
            } else {
                exerciseTitle.textContent = 'Error loading exercise: ' + data.error;
                 warmupSetsDiv.innerHTML = '';
                 workingSetsDiv.innerHTML = '';
            }

        } catch (error) {
            console.error('Error fetching exercise details:', error);
             exerciseTitle.textContent = 'Error loading exercise.';
             warmupSetsDiv.innerHTML = '';
             workingSetsDiv.innerHTML = '';
        }
    }

    // Function to display exercise data and sets
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

    // Function to create the HTML for a single set
    function createSetElement(set) {
        const setDiv = document.createElement('div');
        setDiv.classList.add('set-item');
        setDiv.dataset.setId = set.id; // Store set ID

        // Create and configure weight input
        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.value = set.weight;
        weightInput.placeholder = 'Weight';
        weightInput.dataset.setId = set.id;
        weightInput.addEventListener('change', handleSetInputChange); // Add event listener

        // Create the 'kg' text element
        const kgText = document.createElement('span');
        kgText.textContent = ' kg ';

        // Create and configure reps input
        const repsInput = document.createElement('input');
        repsInput.type = 'number';
        repsInput.value = set.reps;
        repsInput.placeholder = 'Reps';
        repsInput.dataset.setId = set.id;
        repsInput.addEventListener('change', handleSetInputChange); // Add event listener

         // Create the 'reps' text element
        const repsText = document.createElement('span');
        repsText.textContent = ' reps';


        // Append inputs and text spans to the setDiv
        setDiv.appendChild(weightInput);
        setDiv.appendChild(kgText);
        setDiv.appendChild(repsInput);
        setDiv.appendChild(repsText);


        // Create actions div
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('set-actions');

        // Create the complete button
        const completeButton = document.createElement('button');
        completeButton.classList.add('complete-set-button');
        completeButton.dataset.setId = set.id;
        completeButton.textContent = set.completed ? '✔️' : '□';
        completeButton.addEventListener('click', handleCompleteSet);

        // Append the complete button to the actions div
        actionsDiv.appendChild(completeButton);

        // Append the actions div to the setDiv
        setDiv.appendChild(actionsDiv);


        return setDiv;
    }

    // Event handler for input changes (weight/reps) - sends update to backend
    async function handleSetInputChange(event) {
        console.log('handleSetInputChange called', event.target.dataset.setId, event.target.placeholder, event.target.value);
        const setId = event.target.dataset.setId;
        const field = event.target.placeholder.toLowerCase(); // 'weight' or 'reps'
        const value = event.target.value;

         try {
            const response = await fetch(`/api/sets/${setId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [field]: value })
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


    // Event handler for completing/uncompleting a set (toggles the status and saves weight/reps)
    async function handleCompleteSet(event) {
        const completeButton = event.target;
        const setId = completeButton.dataset.setId;
        const isCurrentlyCompleted = completeButton.textContent === '✔️';
        const newState = !isCurrentlyCompleted; // Toggle the state

        // Find the parent .set-item element for this button
        const setItemElement = completeButton.closest('.set-item');
        if (!setItemElement) {
            console.error('Could not find parent .set-item element for set ID:', setId);
            alert('An error occurred while finding set data.');
            return;
        }

        // Find the weight and reps input fields within this set item
        const weightInput = setItemElement.querySelector('input[placeholder="Weight"]');
        const repsInput = setItemElement.querySelector('input[placeholder="Reps"]');

        // Get the current values from the input fields
        const currentWeight = weightInput ? parseFloat(weightInput.value) : 0; // Use parseFloat for weight
        const currentReps = repsInput ? parseInt(repsInput.value, 10) : 0; // Use parseInt for reps

        // Prepare the data to send to the backend
        const updateData = {
            completed: newState,
            weight: currentWeight,
            reps: currentReps
        };

        try {
            // Send a PUT request to update the 'completed', 'weight', and 'reps' status
            const response = await fetch(`/api/sets/${setId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();
            if (response.ok) {
                // Update the button text in the UI based on the new state
                completeButton.textContent = newState ? '✔️' : '□';
                console.log(`Set ${setId} updated: completed=${newState}, weight=${currentWeight}, reps=${currentReps}`);
            } else {
                console.error('Failed to update set:', data.error);
                alert('Error updating set: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating set:', error);
            alert('An error occurred while updating the set.');
        }
    }


    // Event handler for adding a new set
    async function handleAddSet(event) {
        const setType = event.target.dataset.setType;
        // Need to determine the correct 'order' for the new set.
        // For simplicity initially, let's assume you can only add working sets
        // and the order is just the next number after the last working set.
        // A more robust solution would fetch existing sets to determine the max order for the given type.

         alert("Adding sets functionality needs to be fully implemented.");
        // Example (needs refinement to get the correct order dynamically):
        // const existingSets = Array.from(workingSetsDiv.querySelectorAll('.set-item')); // Get current working sets
        // const newSetOrder = existingSets.length + 1; // Simple guess for order

        // const newSetData = {
        //     session_id: parseInt(sessionId),
        //     exercise_id: parseInt(exerciseId),
        //     set_type: setType, // Should be 'working' if adding from the working sets section
        //     order: newSetOrder,
        //     weight: 0,
        //     reps: 0
        // };
        //
        // try {
        //     const response = await fetch('/api/sets', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify(newSetData)
        //     });
        //     const data = await response.json();
        //     if (response.ok) {
        //         console.log('New set added:', data);
        //         // Re-fetch and display exercises to update the list
        //         fetchExerciseDetails(sessionId, exerciseId);
        //     } else {
        //          console.error('Failed to add set:', data.error);
        //          alert('Error adding set: ' + data.error);
        //     }
        // } catch (error) {
        //     console.error('Error adding set:', error);
        //     alert('An error occurred while adding the set.');
        // }
    }

    addSetButtons.forEach(button => {
        button.addEventListener('click', handleAddSet);
    });


    // Navigation between exercises
    function updateNavigationButtons() {
        prevExerciseButton.disabled = currentExerciseIndex <= 0;
        nextExerciseButton.disabled = currentExerciseIndex >= sessionExercises.length - 1;
    }

    prevExerciseButton.addEventListener('click', () => {
        if (currentExerciseIndex > 0) {
            const prevExercise = sessionExercises[currentExerciseIndex - 1];
            window.location.href = `/session/${sessionId}/exercise/${prevExercise.exercise_id}`;
        }
    });

    nextExerciseButton.addEventListener('click', () => {
         if (currentExerciseIndex < sessionExercises.length - 1) {
            const nextExercise = sessionExercises[currentExerciseIndex + 1];
            window.location.href = `/session/${sessionId}/exercise/${nextExercise.exercise_id}`;
        }
    });

     // Event listener for View Previous button (implement logic later)
    viewPreviousButton.addEventListener('click', () => {
        alert("View Previous functionality needs to be implemented.");
         // This would likely involve fetching historical data for this exercise
         // and displaying it in a modal or new page.
    });


    // Initial fetch of exercise details and sets when the page loads
    fetchExerciseDetails(sessionId, exerciseId);

    // Fetch session exercises for navigation
    fetchSessionExercisesForNavigation(sessionId);
});
