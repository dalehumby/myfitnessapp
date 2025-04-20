// frontend/start_session.js

document.addEventListener('DOMContentLoaded', () => {
    const programSelect = document.getElementById('program-select');
    const daySelect = document.getElementById('day-select');
    const startSessionButton = document.getElementById('start-session-button');

    // Fetch programs and populate the program select dropdown
    async function fetchPrograms() {
        try {
            const response = await fetch('/api/programs');
            const programs = await response.json();
            programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program.id;
                option.textContent = program.title;
                programSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching programs:', error);
        }
    }

    // Fetch days for the selected program and populate the day select dropdown
    async function fetchDaysForProgram(programId) {
        try {
            const response = await fetch(`/api/program/${programId}/days`);
            const days = await response.json();
            daySelect.innerHTML = '<option value="">--Select a Day--</option>'; // Clear previous options
            days.forEach(day => {
                const option = document.createElement('option');
                option.value = day.id;
                option.textContent = day.title;
                daySelect.appendChild(option);
            });
            daySelect.disabled = false;
        } catch (error) {
            console.error('Error fetching days:', error);
            daySelect.disabled = true;
            daySelect.innerHTML = '<option value="">--Select a Day--</option>';
        }
    }

    // Event listener for program selection change
    programSelect.addEventListener('change', (event) => {
        const programId = event.target.value;
        if (programId) {
            fetchDaysForProgram(programId);
            startSessionButton.disabled = true; // Disable start button until day is selected
        } else {
            daySelect.disabled = true;
            daySelect.innerHTML = '<option value="">--Select a Day--</option>';
            startSessionButton.disabled = true;
        }
    });

    // Event listener for day selection change
    daySelect.addEventListener('change', (event) => {
        const dayId = event.target.value;
        startSessionButton.disabled = !dayId; // Enable start button if a day is selected
    });

    // Event listener for starting a session
    startSessionButton.addEventListener('click', async () => {
        const dayId = daySelect.value;
        if (!dayId) {
            alert('Please select a day.');
            return;
        }

        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ day_id: dayId })
            });
            const data = await response.json();
            if (response.ok) {
                alert('Session created!');
                // Redirect to the session exercises page or the first exercise
                // For now, let's just log the session ID and maybe redirect to a dummy page
                console.log('New Session ID:', data.session_id);
                // window.location.href = `/session/${data.session_id}/exercises`; // Example redirect
                // For simplicity, let's just reload the programs after creating a session
                 programSelect.innerHTML = '<option value="">--Select a Program--</option>';
                 daySelect.innerHTML = '<option value="">--Select a Day--</option>';
                 daySelect.disabled = true;
                 startSessionButton.disabled = true;
                 fetchPrograms();

            } else {
                alert('Error creating session: ' + data.error);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            alert('An error occurred while creating the session.');
        }
    });

    // Initial fetch of programs when the page loads
    fetchPrograms();
});
