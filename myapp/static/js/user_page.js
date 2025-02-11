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

function addAttendanceItem(data) {
  const list = document.getElementById("attendance-items");

  // Extract values safely
  const employeeId = data.employee_id || "N/A";
  const firstName = data.first_name || "N/A";
  const surname = data.surname || "N/A";
  const company = data.company || "N/A";
  const timeIn = data.time_in || "N/A";
  const timeOut = data.time_out ? data.time_out : "N/A"; // Handle null time_out

  // Find all existing records for this employee
  const existingItems = document.querySelectorAll(
    `li[data-employee-id="${employeeId}"]`
  );

  if (existingItems.length > 0 && timeOut !== "N/A") {
    // ✅ Update the most recent clock-in with time_out
    const lastEntry = existingItems[0]; // Latest entry (since prepend() adds newest first)
    lastEntry.textContent = `${employeeId} - ${firstName} ${surname} (${company}) | Time In: ${timeIn} | Time Out: ${timeOut}`;
  } else {
    // ✅ Add a new record for clock-in
    const listItem = document.createElement("li");
    listItem.setAttribute("data-employee-id", employeeId);
    listItem.textContent = `${employeeId} - ${firstName} ${surname} (${company}) | Time In: ${timeIn} | Time Out: ${timeOut}`;
    list.prepend(listItem);
  }
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

const clockInModal = document.getElementById("clockInModal");
const clockOutModal = document.getElementById("clockOutModal");
const timeInBtn = document.getElementById("timeInBtn");
const timeOutBtn = document.getElementById("timeOutBtn");
const closeClockIn = document.getElementById("closeClockIn");
const closeClockOut = document.getElementById("closeClockOut");

timeInBtn.addEventListener("click", () => {
  clockInModal.style.display = "block";
});

timeOutBtn.addEventListener("click", () => {
  clockOutModal.style.display = "block";
});

closeClockIn.addEventListener("click", () => {
  clockInModal.style.display = "none";
});
closeClockOut.addEventListener("click", () => {
  clockOutModal.style.display = "none";
});

// Close modal if user clicks outside of modal content
window.addEventListener("click", (e) => {
  if (e.target === clockInModal) {
    clockInModal.style.display = "none";
  }
  if (e.target === clockOutModal) {
    clockOutModal.style.display = "none";
  }
});

// --- Handling Clock In form submission ---
const clockInForm = document.getElementById("clockInForm");
clockInForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const employee_id = document.getElementById("employeeIdIn").value;
  const pin = document.getElementById("pinIn").value;

  fetch("/clock_in/", {
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
        // Update attendance list in the UI
        addAttendanceItem(data);
        alert("Clock In successful!");
      } else {
        alert("Error: " + data.error);
      }
      clockInModal.style.display = "none";
      clockInForm.reset();
    })
    .catch((error) => {
      console.error("Error during Clock In:", error);
      alert("There was an error. Please try again.");
    });
});

// --- Handling Clock Out form submission ---
const clockOutForm = document.getElementById("clockOutForm");
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
        // Optionally update the attendance list or UI
        addAttendanceItem(data);
        alert("Clock Out successful!");
      } else {
        alert("Error: " + data.error);
      }
      clockOutModal.style.display = "none";
      clockOutForm.reset();
    })
    .catch((error) => {
      console.error("Error during Clock Out:", error);
      alert("There was an error. Please try again.");
    });
});

// Fetch today's entries when the page loads
document.addEventListener("DOMContentLoaded", function () {
  fetch("/get_todays_entries/") // You'll need to create this endpoint
    .then((response) => response.json())
    .then((data) => {
      data.entries.reverse().forEach((entry) => addAttendanceItem(entry));
    })
    .catch((error) => console.error("Error loading entries:", error));
});

// 