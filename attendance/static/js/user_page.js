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
  formData.append("image", dataURItoBlob(imageData), "clock_in_image.jpg");
  formData.append("employee_id", employeeId);

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
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
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

  attendanceList.forEach((data) => {
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
      first_login_check: true,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
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
                new_pin: newPin,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  alert(
                    "PIN successfully changed! Please proceed with clock in using your new PIN."
                  );
                  newPinModal.style.display = "none";
                  newPinForm.reset();
                  clockInForm.reset();
                }
              })
              .catch((error) => {
                console.error("Error:", error);
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
                image_path: filePath,
              }),
            });
          })
          .then((response) => response.json())
          .then((data) => {
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

  fetch("/announcements/posted/")
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("posted-announcements");
      container.innerHTML = "";

      if (data.length === 0) {
        container.innerHTML = "<p>No posted announcements at this time.</p>";
        return;
      }

      // Create a table element
      const table = document.createElement('table');
      table.classList.add('announcements-table');

      // Create the table body (no header needed)
      const tbody = document.createElement('tbody');

      data.forEach((ann) => {
        const fullText = ann.content;
        const truncatedText =
          fullText.length > 30 ? fullText.substring(0, 30) + "..." : fullText;

        // Create a table row for each announcement
        const tr = document.createElement('tr');
        const td = document.createElement('td');

        // Create a span for the announcement text
        const span = document.createElement("span");
        span.textContent = truncatedText;
        td.appendChild(span);

        // Add a "See more/See less" link if needed
        if (fullText.length > 30) {
          const seeMore = document.createElement('a');
          seeMore.href = '#';
          seeMore.style.marginLeft = '5px';
          seeMore.style.color = 'red';
          seeMore.style.textDecoration = 'none';
          seeMore.style.cursor = 'pointer';
          seeMore.textContent = '[See more]';

          // Toggle between truncated and full text on click
          seeMore.addEventListener("click", (e) => {
            e.preventDefault();
            if (seeMore.textContent === "[See more]") {
              span.textContent = fullText;
              seeMore.textContent = "[See less]";
            } else {
              span.textContent = truncatedText;
              seeMore.textContent = "[See more]";
            }
            td.appendChild(seeMore);
          });

          td.appendChild(seeMore);
        }

        tr.appendChild(td);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      container.appendChild(table);
    })
    .catch((error) => {
      console.error("Error fetching posted announcements:", error);
    });

  fetch("/get_special_dates/")
    .then((response) => response.json())
    .then((data) => {
      updateBirthdays(data.birthdays);
      updateMilestones(data.milestones);
    })
    .catch((error) => console.error("Error loading special dates:", error));

  // Get button and modal elements
  const timeInBtn = document.getElementById("timeInBtn");
  const timeOutBtn = document.getElementById("timeOutBtn");
  const clockInModal = document.getElementById("clockInModal");
  const clockOutModal = document.getElementById("clockOutModal");

  // Time In button click handler
  timeInBtn.addEventListener("click", function () {
    clockInModal.style.display = "block";
  });

  // Time Out button click handler
  timeOutBtn.addEventListener("click", function () {
    clockOutModal.style.display = "block";
  });
});

// Function to update the Birthdays panel
function updateBirthdays(birthdays) {
  const birthdayPanel = document.querySelector(".birthdays .panel .note");
  if (!birthdayPanel) return;

  if (birthdays.length > 0) {
    // Create a table element
    const table = document.createElement('table');
    table.classList.add('announcements-table'); // Use the same class as announcements

    // Create the table body (no header needed)
    const tbody = document.createElement('tbody');

    birthdays.forEach((user) => {
      const fullText = `${user.first_name} ${user.surname}'s birthday! 🥳`;
      const truncatedText =
        fullText.length > 60 ? fullText.substring(0, 60) + "..." : fullText;

      // Create a table row for each birthday
      const tr = document.createElement('tr');
      const td = document.createElement('td');

      // Create a span for the birthday text
      const span = document.createElement("span");
      span.textContent = truncatedText;
      td.appendChild(span);

      // Add a "See more/See less" link if needed
      if (fullText.length > 60) {
        const seeMore = document.createElement('a');
        seeMore.href = '#';
        seeMore.style.marginLeft = '5px';
        seeMore.style.color = 'red';
        seeMore.style.textDecoration = 'none';
        seeMore.style.cursor = 'pointer';
        seeMore.textContent = '[See more]';

        // Toggle between truncated and full text on click
        seeMore.addEventListener("click", (e) => {
          e.preventDefault();
          if (seeMore.textContent === "[See more]") {
            span.textContent = fullText;
            seeMore.textContent = "[See less]";
          } else {
            span.textContent = truncatedText;
            seeMore.textContent = "[See more]";
          }
          td.appendChild(seeMore);
        });

        td.appendChild(seeMore);
      }

      tr.appendChild(td);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    birthdayPanel.innerHTML = '';
    birthdayPanel.appendChild(table);
  } else {
    birthdayPanel.innerHTML = "<p></p>";
  }
}

// Function to update the Milestones panel
function updateMilestones(milestones) {
  const milestonePanel = document.querySelector(".milestones .panel .note");
  if (!milestonePanel) return;

  if (milestones.length > 0) {
    // Create a table element
    const table = document.createElement('table');
    table.classList.add('announcements-table'); // Use the same class as announcements

    // Create the table body (no header needed)
    const tbody = document.createElement('tbody');

    milestones.forEach((user) => {
      const fullText = `${user.first_name} ${user.surname} \n${user.years} year${user.years > 1 ? "s" : ""} 🎉`;
      const truncatedText =
        fullText.length > 60 ? fullText.substring(0, 60) + "..." : fullText;

      // Create a table row for each milestone
      const tr = document.createElement('tr');
      const td = document.createElement('td');

      // Create a span for the milestone text
      const span = document.createElement("span");
      span.textContent = truncatedText;
      span.style.whiteSpace = "pre-line";
      td.appendChild(span);

      // Add a "See more/See less" link if needed
      if (fullText.length > 60) {
        const seeMore = document.createElement('a');
        seeMore.href = '#';
        seeMore.style.marginLeft = '5px';
        seeMore.style.color = 'red';
        seeMore.style.textDecoration = 'none';
        seeMore.style.cursor = 'pointer';
        seeMore.textContent = '[See more]';

        // Toggle between truncated and full text on click
        seeMore.addEventListener("click", (e) => {
          e.preventDefault();
          if (seeMore.textContent === "[See more]") {
            span.textContent = fullText;
            seeMore.textContent = "[See less]";
          } else {
            span.textContent = truncatedText;
            seeMore.textContent = "[See more]";
          }
          td.appendChild(seeMore);
        });

        td.appendChild(seeMore);
      }

      tr.appendChild(td);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    milestonePanel.innerHTML = '';
    milestonePanel.appendChild(table);
  } else {
    milestonePanel.innerHTML = "<p></p>";
  }
}

document.addEventListener("keydown", (event) => {
  // Check if any modal is open
  const isClockInOpen = clockInModal.style.display === "block";
  const isClockOutOpen = clockOutModal.style.display === "block";
  const isNewPinOpen = newPinModal.style.display === "block";

  if (isClockInOpen || isClockOutOpen || isNewPinOpen) {
    // If Escape key is pressed, close the open modal
    if (event.key === "Escape") {
      if (isClockInOpen) clockInModal.style.display = "none";
      if (isClockOutOpen) clockOutModal.style.display = "none";
      if (isNewPinOpen) newPinModal.style.display = "none";
    }
    return; // Stop processing 'i' and 'o' when a modal is open
  }

  // Allow 'i' and 'o' shortcuts only when no modal is open
  if (event.key.toLowerCase() === "i") {
    openClockInModal();
  } else if (event.key.toLowerCase() === "o") {
    openClockOutModal();
  }
});

// Function to open the clock-in modal
function openClockInModal() {
  clockInModal.style.display = "block";
}

// Function to open the clock-out modal
function openClockOutModal() {
  clockOutModal.style.display = "block";
}