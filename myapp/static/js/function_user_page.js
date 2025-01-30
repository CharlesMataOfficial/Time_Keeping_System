function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;

    document.getElementById('time').textContent = 
        `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)} ${ampm}`;

    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = daysOfWeek[now.getDay()];

    document.getElementById('date').innerHTML = `<span>${formattedDate}</span> <span>${dayName}</span>`;
}

function padZero(num) {
    return num < 10 ? `0${num}` : num;
}

setInterval(updateClock, 1000);
updateClock();

const video = document.getElementById('video');

navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        video.srcObject = stream;
    })
    .catch((error) => {
        console.error('Error accessing the camera: ', error);
        alert('Unable to access the camera. Please ensure your camera is connected and permissions are granted.');
    });

function addAttendanceItem(name, timestamp) {
    const list = document.getElementById('attendance-items');
    const listItem = document.createElement('li');
    listItem.textContent = `${name} - ${timestamp}`;
    list.appendChild(listItem);
}

addAttendanceItem('John Doe', '10:00 AM, January 25, 2025');
addAttendanceItem('Jane Smith', '10:15 AM, January 25, 2025');

const signOutBtn = document.querySelector('.sign-out-btn');

signOutBtn.addEventListener('click', () => {
    window.location.href = 'index_login.html';
});