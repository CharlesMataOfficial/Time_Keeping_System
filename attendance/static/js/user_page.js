/**
 * Updates the clock display with the current time.
 */
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

/**
 * Pads a number with a leading zero if it's less than 10.
 * @param {number} num The number to pad.
 * @returns {string} The padded number as a string.
 */
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

/**
 * Captures an image from the video stream.
 * @returns {string} The captured image as a data URL.
 */
function captureImage() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.5); // Low quality image
}

/**
 * Uploads an image to the server.
 * @param {string} imageData The image data as a data URL.
 * @param {string} employeeId The employee ID.
 * @returns {Promise<string>} A promise that resolves with the file path of the uploaded image.
 */
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

/**
 * Converts a data URI to a Blob object.
 * @param {string} dataURI The data URI to convert.
 * @returns {Blob} The Blob object.
 */
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

/**
 * Adds an attendance item to the attendance list.
 * @param {object} data The attendance data.
 */
function addAttendanceItem(data) {
  const tbody = document.getElementById("attendance-items");

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
}

/**
 * Updates the attendance list with new data.
 * @param {array} attendanceList The new attendance data.
 */
function updateAttendanceList(attendanceList) {
  const tbody = document.getElementById("attendance-items");
  tbody.innerHTML = "";

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

/**
 * Gets the CSRF token from the cookies.
 * @param {string} name The name of the cookie.
 * @returns {string|null} The value of the cookie, or null if not found.
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
const csrftoken = getCookie("csrftoken");

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

const clockInForm = document.getElementById("clockInForm");
const clockOutForm = document.getElementById("clockOutForm");

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
    body: JSON.stringify({
      employee_id,
      pin,
      first_login_check: true,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.success && data.error !== "first_login") {
        alert("Clock In Error: " + data.error);
        return;
      }

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
                } else {
                  alert("Error: " + data.error);
                }
              })
              .catch((error) => {
                console.error("Error:", error);
                alert("Error: " + error.message);
              });
          }
        };
        return;
      }

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
          if (!data.success) {
            alert("Clock In Error: " + data.error);
            return;
          }
          addAttendanceItem(data);
          alert("Clock In successful!");
          updatePartnerLogo(data.new_logo);
          clockInModal.style.display = "none";
          clockInForm.reset();
          updateAttendanceList(data.attendance_list);
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("Error: " + error.message);
        });
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error: " + error.message);
    });
});

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
        updatePartnerLogo(data.new_logo);
        clockOutModal.style.display = "none";
        clockOutForm.reset();
        updateAttendanceList(data.attendance_list);
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

/**
 * Updates the partner logo on the page.
 * @param {string} newLogo The filename of the new logo.
 */
function updatePartnerLogo(newLogo) {
  const partnerLogo = document.getElementById("partnerLogo");
  partnerLogo.src = `/static/images/logos/${newLogo}`;
}

/**
 * Fetches and updates the attendance entries.
 */
function fetchAndUpdateEntries() {
  fetch("/get_todays_entries/")
    .then((response) => response.json())
    .then((data) => {
      const tbody = document.getElementById("attendance-items");
      tbody.innerHTML = "";
      data.entries.forEach((entry) => addAttendanceItem(entry));

      console.log("Time entries refreshed at", new Date().toLocaleTimeString());
    })
    .catch((error) => console.error("Error loading entries:", error));
}

document.addEventListener("DOMContentLoaded", function () {
  fetchAndUpdateEntries();

  const refreshInterval = setInterval(fetchAndUpdateEntries, 30000);

  window.entriesRefreshInterval = refreshInterval;

  fetch("/announcements/posted/")
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("posted-announcements");
      container.innerHTML = "";

      if (data.length === 0) {
        container.innerHTML = "<p></p>";
        return;
      }

      const table = document.createElement('table');
      table.classList.add('announcements-table');

      const tbody = document.createElement('tbody');

      data.forEach((ann) => {
        const fullText = ann.content;
        const truncatedText =
          fullText.length > 30 ? fullText.substring(0, 30) + "..." : fullText;

        const tr = document.createElement('tr');
        const td = document.createElement('td');

        const span = document.createElement("span");
        span.textContent = truncatedText;
        td.appendChild(span);

        if (fullText.length > 30) {
          const seeMore = document.createElement('a');
          seeMore.href = '#';
          seeMore.style.marginLeft = '5px';
          seeMore.style.color = 'red';
          seeMore.style.textDecoration = 'none';
          seeMore.style.cursor = 'pointer';
          seeMore.textContent = '[See more]';

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

  const timeInBtn = document.getElementById("timeInBtn");
  const timeOutBtn = document.getElementById("timeOutBtn");

  timeInBtn.addEventListener("click", function () {
    clockInModal.style.display = "block";
  });

  timeOutBtn.addEventListener("click", function () {
    clockOutModal.style.display = "block";
  });

  const employeeIdIn = document.getElementById("employeeIdIn");
  const pinIn = document.getElementById("pinIn");
  const employeeIdOut = document.getElementById("employeeIdOut");
  const pinOut = document.getElementById("pinOut");

  employeeIdIn.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      pinIn.focus();
    }
  });

  employeeIdOut.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      pinOut.focus();
    }
  });

  if (document.getElementById("newPin")) {
    const newPinField = document.getElementById("newPin");
    newPinField.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("newPinForm").dispatchEvent(new Event("submit"));
      }
    });
  }

  timeInBtn.setAttribute("tabindex", "0");
  timeOutBtn.setAttribute("tabindex", "0");

  timeInBtn.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      openClockInModal();
    }
  });

  timeOutBtn.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      openClockOutModal();
    }
  });
});

/**
 * Updates the Birthdays panel with a list of birthdays.
 * @param {array} birthdays An array of user objects with birthday information.
 */
function updateBirthdays(birthdays) {
  const birthdayPanel = document.querySelector(".birthdays .panel .note");
  if (!birthdayPanel) return;

  if (birthdays.length > 0) {
    const table = document.createElement('table');
    table.classList.add('announcements-table');

    const tbody = document.createElement('tbody');

    birthdays.forEach((user) => {
      const fullText = `${user.first_name} ${user.surname}'s birthday! 🥳`;
      const truncatedText =
        fullText.length > 60 ? fullText.substring(0, 60) + "..." : fullText;

      const tr = document.createElement('tr');
      const td = document.createElement('td');

      const span = document.createElement("span");
      span.textContent = truncatedText;
      td.appendChild(span);

      if (fullText.length > 60) {
        const seeMore = document.createElement('a');
        seeMore.href = '#';
        seeMore.style.marginLeft = '5px';
        seeMore.style.color = 'red';
        seeMore.style.textDecoration = 'none';
        seeMore.style.cursor = 'pointer';
        seeMore.textContent = '[See more]';

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

/**
 * Updates the Milestones panel with a list of milestones.
 * @param {array} milestones An array of user objects with milestone information.
 */
function updateMilestones(milestones) {
  const milestonePanel = document.querySelector(".milestones .panel .note");
  if (!milestonePanel) return;

  if (milestones.length > 0) {
    const table = document.createElement('table');
    table.classList.add('announcements-table');

    const tbody = document.createElement('tbody');

    milestones.forEach((user) => {
      const fullText = `${user.first_name} ${user.surname} \n${user.years} year${user.years > 1 ? "s" : ""} 🎉`;
      const truncatedText =
        fullText.length > 60 ? fullText.substring(0, 60) + "..." : fullText;

      const tr = document.createElement('tr');
      const td = document.createElement('td');

      const span = document.createElement("span");
      span.textContent = truncatedText;
      span.style.whiteSpace = "pre-line";
      td.appendChild(span);

      if (fullText.length > 60) {
        const seeMore = document.createElement('a');
        seeMore.href = '#';
        seeMore.style.marginLeft = '5px';
        seeMore.style.color = 'red';
        seeMore.style.textDecoration = 'none';
        seeMore.style.cursor = 'pointer';
        seeMore.textContent = '[See more]';

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
  const isClockInOpen = clockInModal.style.display === "block";
  const isClockOutOpen = clockOutModal.style.display === "block";
  const isNewPinOpen = newPinModal.style.display === "block";

  if (isClockInOpen || isClockOutOpen || isNewPinOpen) {
    if (event.key === "Escape") {
      if (isClockInOpen) clockInModal.style.display = "none";
      if (isClockOutOpen) clockOutModal.style.display = "none";
      if (isNewPinOpen) newPinModal.style.display = "none";
    }
    return;
  }

  if (event.key.toLowerCase() === "i") {
    openClockInModal();
  } else if (event.key.toLowerCase() === "o") {
    openClockOutModal();
  }
});

/**
 * Opens the clock-in modal and focuses on the employee ID field.
 */
function openClockInModal() {
  clockInModal.style.display = "block";
  setTimeout(() => document.getElementById("employeeIdIn").focus(), 100);
}

/**
 * Opens the clock-out modal and focuses on the employee ID field.
 */
function openClockOutModal() {
  clockOutModal.style.display = "block";
  setTimeout(() => document.getElementById("employeeIdOut").focus(), 100);
}