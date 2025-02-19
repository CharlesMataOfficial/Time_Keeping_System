function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  document.getElementById("time").textContent = `${padZero(hours)}:${padZero(
    minutes
  )}:${padZero(seconds)} ${ampm}`;

  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const formattedDate = now.toLocaleDateString("en-US", dateOptions);

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = daysOfWeek[now.getDay()];

  document.getElementById(
    "date"
  ).innerHTML = `<span>${formattedDate}</span> <span>${dayName}</span>`;
}

function padZero(num) {
  return num < 10 ? `0${num}` : num;
}

setInterval(updateClock, 1000);
updateClock();

const video = document.getElementById("video");

navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((error) => {
    console.error("Error accessing the camera: ", error);
    alert(
      "Unable to access the camera. Please ensure your camera is connected and permissions are granted."
    );
  });

function captureImage() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.5); // Low quality image
}

function uploadImage(imageData, employeeId) {
  const formData = new FormData();
  formData.append('image', dataURItoBlob(imageData), 'clock_in_image.jpg');
  formData.append('employee_id', employeeId);

  return fetch("/upload_image/", {
    method: "POST",
    body: formData,
    headers: {
      "X-CSRFToken": csrftoken,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        return data.file_path;
      } else {
        throw new Error(data.error);
      }
    });
}

function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

function addAttendanceItem(data) {
  const tbody = document.getElementById("attendance-items");

  // Create new row
  const row = document.createElement("tr");
  row.setAttribute("data-employee-id", data.employee_id);

  row.innerHTML = `
    <td>${data.employee_id || ""}</td>
    <td>${data.first_name || ""}</td>
    <td>${data.surname || ""}</td>
    <td>${data.company || ""}</td>
    <td>${data.time_in || ""}</td>
    <td>${data.time_out || ""}</td>
  `;

  tbody.append(row); // Add new row at the top
}

function updateAttendanceList(attendanceList) {
  const tbody = document.getElementById("attendance-items");
  tbody.innerHTML = ""; // Clear existing rows

  attendanceList.forEach(data => {
    const row = document.createElement("tr");
    row.setAttribute("data-employee-id", data.employee_id);

    row.innerHTML = `
      <td>${data.employee_id || ""}</td>
      <td>${data.first_name || ""}</td>
      <td>${data.surname || ""}</td>
      <td>${data.company || ""}</td>
      <td>${data.time_in || ""}</td>
      <td>${data.time_out || ""}</td>
    `;

    tbody.append(row);
  });
}

// Helper to get CSRF token from cookies (if you need it for AJAX)
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      // Does this cookie string begin with the name we want?
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
const csrftoken = getCookie("csrftoken");

// --- Modal handling code ---

// Add new modal references
const clockInModal = document.getElementById("clockInModal");
const clockOutModal = document.getElementById("clockOutModal");
const newPinModal = document.getElementById("newPinModal");

const closeClockIn = document.getElementById("closeClockIn");
const closeClockOut = document.getElementById("closeClockOut");
const closeNewPin = document.getElementById("closeNewPin");

closeClockIn.addEventListener("click", () => {
  clockInModal.style.display = "none";
});

closeClockOut.addEventListener("click", () => {
  clockOutModal.style.display = "none";
});

closeNewPin.addEventListener("click", () => {
  newPinModal.style.display = "none";
});

// Close modal if user clicks outside of modal content
window.addEventListener("click", (e) => {
  if (e.target === clockInModal) {
    clockInModal.style.display = "none";
  }
  if (e.target === clockOutModal) {
    clockOutModal.style.display = "none";
  }
  if (e.target === newPinModal) {
    newPinModal.style.display = "none";
  }
});

// --- Handling Clock In form submission ---
clockInForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const employee_id = document.getElementById("employeeIdIn").value;
  const pin = document.getElementById("pinIn").value;

  // First check for first login without capturing image
  fetch("/clock_in/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({
      employee_id,
      pin,
      first_login_check: true
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.error === "first_login") {
      clockInModal.style.display = "none";
      newPinModal.style.display = "block";

      const newPinForm = document.getElementById("newPinForm");
      newPinForm.onsubmit = (e) => {
        e.preventDefault();
        const newPin = document.getElementById("newPin").value;

        if (newPin && newPin.length === 4 && !isNaN(newPin)) {
          fetch("/clock_in/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrftoken,
            },
            body: JSON.stringify({
              employee_id,
              pin,
              new_pin: newPin
            }),
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              alert("PIN successfully changed! Please proceed with clock in using your new PIN.");
              newPinModal.style.display = "none";
              newPinForm.reset();
              clockInForm.reset();
            }
          })
          .catch(error => {
            console.error('Error:', error);
            alert("Error: " + error.message);
          });
        }
      };
    } else {
      // Regular clock in with image
      const imageData = captureImage();
      uploadImage(imageData, employee_id)
        .then((filePath) => {
          return fetch("/clock_in/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrftoken,
            },
            body: JSON.stringify({
              employee_id,
              pin,
              image_path: filePath
            }),
          });
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            addAttendanceItem(data);
            alert("Clock In successful!");
            updatePartnerLogo(data.new_logo);
            clockInModal.style.display = "none";
            clockInForm.reset();
            updateAttendanceList(data.attendance_list); // Update the attendance list
          }
        });
    }
  });
});

// --- Handling Clock Out form submission ---
clockOutForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const employee_id = document.getElementById("employeeIdOut").value;
  const pin = document.getElementById("pinOut").value;

  fetch("/clock_out/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({ employee_id, pin }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert("Clock Out successful!");
        updatePartnerLogo(data.new_logo); // Update logo on clock out
        clockOutModal.style.display = "none";
        clockOutForm.reset();
        updateAttendanceList(data.attendance_list); // Update the attendance list
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch((error) => {
      console.error("Error during Clock Out:", error);
      alert("There was an error. Please try again.");
      clockOutModal.style.display = "none";
      clockOutForm.reset();
    });
});

// Function to update the partner logo
function updatePartnerLogo(newLogo) {
  const partnerLogo = document.getElementById("partnerLogo");
  partnerLogo.src = `/static/images/logos/${newLogo}`;
}

// Fetch today's entries when the page loads
document.addEventListener("DOMContentLoaded", function () {
  fetch("/get_todays_entries/") // You'll need to create this endpoint
    .then((response) => response.json())
    .then((data) => {
      data.entries.forEach((entry) => addAttendanceItem(entry));
    })
    .catch((error) => console.error("Error loading entries:", error));

  // Get button and modal elements
  const timeInBtn = document.getElementById("timeInBtn");
  const timeOutBtn = document.getElementById("timeOutBtn");
  const clockInModal = document.getElementById("clockInModal");
  const clockOutModal = document.getElementById("clockOutModal");

  // Time In button click handler
  timeInBtn.addEventListener("click", function() {
      clockInModal.style.display = "block";
  });

  // Time Out button click handler
  timeOutBtn.addEventListener("click", function() {
      clockOutModal.style.display = "block";
  });
});

// CONVERT TO CSS

// // Function to adjust notes
// function adjustNotes() {
//   document.querySelectorAll('.note').forEach(note => {
//     let parent = note.closest('.panel');

//     if (!parent.classList.contains('announcements')) {
//       note.style.width = `${parent.clientWidth * 0.9}px`;
//       note.style.height = `${parent.clientHeight * 0.8}px`;
//     }
//   });
// }

// // Adjust notes on window resize
// window.addEventListener('resize', adjustNotes);
// adjustNotes();

// // Function to adjust layout
// function adjustLayout() {
//   let scale = Math.min(window.innerWidth / 1920, 1); // Keep scaling balanced
//   document.querySelector('.container').style.transform = `scale(${scale})`;
// }

// // Adjust layout on window resize
// window.addEventListener('resize', adjustLayout);
// adjustLayout();
