document.getElementById('login-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent page reload

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ username, password }),
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = '../index_dboard.html'; // Redirect to the dashboard
        } else {
            alert(result.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
});
