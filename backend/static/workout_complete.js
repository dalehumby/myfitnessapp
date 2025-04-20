// backend/static/workout_complete.js

document.addEventListener('DOMContentLoaded', () => {
    const motivationalMessageElement = document.getElementById('motivational-message');
    const viewStatsButton = document.getElementById('view-stats-button');
    const returnHomeButton = document.getElementById('return-home-button');

    // Get session_id from the URL path
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[2];

    if (!sessionId) {
        motivationalMessageElement.textContent = 'Session ID not found in URL to fetch message.';
        console.error('Session ID not found in URL.');
        return;
    }


    // --- Fetch and display motivational message ---
    async function fetchMotivationalMessage(sessionId) {
        try {
            // Use the session_id in the API call
            const response = await fetch(`/api/session/${sessionId}/completed-message`);
            if (!response.ok) {
                motivationalMessageElement.textContent = 'Error loading message.';
                console.error('Failed to fetch motivational message:', response.status);
                return;
            }
            const data = await response.json();
            motivationalMessageElement.textContent = data.message; // Display the message
        } catch (error) {
            motivationalMessageElement.textContent = 'Error loading message.';
            console.error('Error fetching motivational message:', error);
        }
    }

    // --- Button Click Listeners ---

    // View Stats button
    viewStatsButton.addEventListener('click', () => {
        // For now, show a placeholder alert
        alert('View Stats functionality needs to be implemented!');
        // In the future, this would navigate to a stats page or show a modal
    });

    // Return Home button
    returnHomeButton.addEventListener('click', () => {
        // Redirect to the home page
        window.location.href = '/';
    });


    // --- Initial Load ---

    // Fetch the motivational message when the page loads, using the sessionId
    fetchMotivationalMessage(sessionId);

     // --- Confetti Animation using canvas-confetti library ---
     // Trigger the confetti animation when the page loads
     // The library exposes a global 'confetti' function after the script is loaded
     confetti({
       particleCount: 100,
       spread: 70,
       origin: { y: 0.6 } // You can adjust the origin and other parameters
     });

     // You could call confetti multiple times for bursts, or customize heavily
     // For example, trigger a burst after a short delay:
     setTimeout(() => {
       confetti({
          particleCount: 100,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: Math.random(),
            // since they fall down, start a bit higher than random
            y: Math.random() - 0.2
          }
        });
      }, 1200); // 500ms delay
});
