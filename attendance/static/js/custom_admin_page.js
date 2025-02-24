// Toggle Menu
function toggleMenu() {
  const menu = document.getElementById("menu");
  if (menu.style.left === "0px") {
    menu.style.left = "-300px";
  } else {
    menu.style.left = "0px";
  }
}
// Define the ordered menu navigation (matches sidebar order)
const menuOrder = [
  "dashboard",
  "log",
  "attendance-list",
  "work-hours",
  "announcement",
  "export-excel",
  "leave-approval",
  "about",
];

// Store the currently active screen
let currentScreen = "dashboard"; // Default to dashboard

// Function to navigate to a screen
function navigateTo(screenId) {
  // Hide all screens
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.style.display = "none";
  });

  // Show the selected screen
  const activeScreen = document.getElementById(screenId);
  if (activeScreen) {
    activeScreen.style.display = "flex";
    currentScreen = screenId; // Update the current screen
  }

  // Hide menu when a screen is selected
  const menu = document.getElementById("menu");
  if (menu) {
    menu.style.left = "-300px";
  }

  // Always show the dashboard shortcut (if the element exists)
  const dashboardShortcut = document.getElementById("dashboard-shortcut");
  if (dashboardShortcut) {
    dashboardShortcut.style.display = "block";
  }
  if (screenId === "announcement") {
    fetchAnnouncements();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Show Dashboard on page load
  navigateTo("dashboard");

  // Setup event listener for left arrow
  const leftArrow = document.getElementById("left-arrow");
  if (leftArrow) {
    leftArrow.addEventListener("click", function () {
      let currentIndex = menuOrder.indexOf(currentScreen);
      if (currentIndex > 0) {
        let previousScreen = menuOrder[currentIndex - 1]; // Get the previous screen in the list
        navigateTo(previousScreen);
      }
    });
  }

  // Setup event listener for right arrow
  const rightArrow = document.getElementById("right-arrow");
  if (rightArrow) {
    rightArrow.addEventListener("click", function () {
      let currentIndex = menuOrder.indexOf(currentScreen);
      if (currentIndex < menuOrder.length - 1) {
        let nextScreen = menuOrder[currentIndex + 1]; // Get the next screen in the list
        navigateTo(nextScreen);
      }
    });
  }

  // Dropdown color change listener
  const dropdowns = document.querySelectorAll("select");
  dropdowns.forEach((select) => {
    select.addEventListener("change", function () {
      let options = this.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          options[i].style.color = "black"; // Selected option turns black
        } else {
          options[i].style.color = "gray"; // Unselected options remain gray
        }
      }
    });
  });

  const attendanceCompany = document.getElementById("attendance-company");
  if (attendanceCompany) {
    attendanceCompany.addEventListener("change", updateAttendanceHeader);
  }
});
// Update the attendance header when dropdown selections change
document
  .getElementById("attendance-type")
  .addEventListener("change", updateAttendanceHeader);
document
  .getElementById("attendance-company")
  .addEventListener("change", updateAttendanceHeader);

// Function to update attendance header text
function updateAttendanceHeader() {
  const type = document.getElementById("attendance-type").value;
  const company = document.getElementById("attendance-company").value;

  let typeText = "Time Log";
  if (type === "users-active") {
    typeText = "Users Active";
  } else if (type === "users-inactive") {
    typeText = "Users Inactive";
  }

  let companyText = "By Company";
  if (company === "lorem-ipsum-1") {
    companyText = "Lorem Ipsum 1";
  } else if (company === "lorem-ipsum-2") {
    companyText = "Lorem Ipsum 2";
  }

  // Store the text instead of updating an HTML element
  attendanceHeaderText = `${typeText} > ${companyText}`;
}

// Filter attendance based on dropdown selections
function filterAttendance() {
  const type = document.getElementById("attendance-type").value; // Correctly get the type
  const company = document.getElementById("attendance-company").value; // Get the company value
  const department = document.getElementById("attendance-department").value; // Get the department value

  // Define the options for each dropdown
  const typeOptions = {
    "time-log": "Time Log",
    "users-active": "Users Active",
    "users-inactive": "Users Inactive",
  };

  const companyOptions = {
    agridom: "Agridom Solutions Corp.",
    farmtech: "Farmtech Agriland Corporation",
    subang: "Subang Farm",
    djas: "DJAS Servitrade Corporation",
    "agri-online": "AGRI Online",
    sunfood: "Sunfood Marketing Inc.",
    all: "All companies",
  };

  const departmentOptions = {
    all: "All departments",
    hr: "Human Resources",
    it: "IT Department",
    finance: "Finance",
  };

  // Get the selected text for each dropdown option
  const selectedType = typeOptions[type] || "Time Log";
  const selectedCompany = companyOptions[company] || "All companies";
  const selectedDepartment = departmentOptions[department] || "All departments";

  // Generate the filter text
  const filterText = `Filtering attendance for:\n${selectedType} > ${selectedCompany} > ${selectedDepartment}`;

  // Show the filter information in a prompt
  alert(filterText);
}

// Work Hours Functions
function addWorkHours() {
  // Collect input values
  let name = document.getElementById("name").value;
  let presetType = document.getElementById("preset-type").value;
  let mondayStart = document.getElementById("monday-start").value;
  let mondayEnd = document.getElementById("monday-end").value;
  let tuesdayStart = document.getElementById("tuesday-start").value;
  let tuesdayEnd = document.getElementById("tuesday-end").value;
  let wednesdayStart = document.getElementById("wednesday-start").value;
  let wednesdayEnd = document.getElementById("wednesday-end").value;
  let thursdayStart = document.getElementById("thursday-start").value;
  let thursdayEnd = document.getElementById("thursday-end").value;
  let fridayStart = document.getElementById("friday-start").value;
  let fridayEnd = document.getElementById("friday-end").value;
  let saturdayStart = document.getElementById("saturday-start").value;
  let saturdayEnd = document.getElementById("saturday-end").value;
  let sundayStart = document.getElementById("sunday-start").value;
  let sundayEnd = document.getElementById("sunday-end").value;

  // Create an object to send (note the fix for Saturday fields)
  let WorkHoursData = {
    name: name,
    presetType: presetType,
    mondayStart: mondayStart,
    mondayEnd: mondayEnd,
    tuesdayStart: tuesdayStart,
    tuesdayEnd: tuesdayEnd,
    wednesdayStart: wednesdayStart,
    wednesdayEnd: wednesdayEnd,
    thursdayStart: thursdayStart,
    thursdayEnd: thursdayEnd,
    fridayStart: fridayStart,
    fridayEnd: fridayEnd,
    saturdayStart: saturdayStart, // fixed
    saturdayEnd: saturdayEnd, // fixed
    sundayStart: sundayStart,
    sundayEnd: sundayEnd,
  };

  // You can now send WorkHoursData via AJAX or further process it
}

// Modal functions
function openScheduleModal() {
  console.log("Opening modal");
  const modal = document.getElementById("setScheduleModal");
  if (modal) {
    modal.style.display = "block";
  } else {
    console.error("Modal element not found");
  }
}

function closeModal() {
  const modal = document.getElementById("setScheduleModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function editWorkHours() {
  alert("Edit Work Hours functionality goes here.");
}

function deleteWorkHours() {
  alert("Delete Work Hours functionality goes here.");
}

function saveWorkHours() {
  const gracePeriod = document.getElementById("grace-period").value;
  if (gracePeriod) {
    alert(`Grace Period of ${gracePeriod} minutes saved.`);
  } else {
    alert("Please enter a grace period.");
  }
}

// Utility: Get CSRF token (if needed)
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// On page load, fetch announcements from the server
document.addEventListener("DOMContentLoaded", fetchAnnouncements);

// Function to fetch announcements from the database and display them
function fetchAnnouncements() {
  fetch("/announcements/")
    .then((response) => response.json())
    .then((data) => {
      const announcementList = document.getElementById("announcement-list");
      announcementList.innerHTML = ""; // Clear current list
      data.forEach((announcement) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <input type="checkbox" class="announcement-checkbox" data-id="${announcement.id}">
          <span>${announcement.content}</span>
        `;
        announcementList.appendChild(li);
      });
    })
    .catch((error) => console.error("Error fetching announcements:", error));
}

// Function to save announcement (saves to the database)
function saveAnnouncement() {
  const announcementText = document
    .getElementById("announcement-text")
    .value.trim();
  if (announcementText === "") {
    alert("Please enter an announcement.");
    return;
  }

  fetch("/announcements/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify({ content: announcementText }),
  })
    .then((response) => response.json())
    .then((data) => {
      alert("Announcement saved successfully.");
      document.getElementById("announcement-text").value = "";
      fetchAnnouncements(); // Refresh the list from the database
    })
    .catch((error) => {
      console.error("Error saving announcement:", error);
      alert("Error saving announcement.");
    });
}

// Function to delete selected announcements (from the database)
function deleteAnnouncement() {
  const checkboxes = document.querySelectorAll(
    ".announcement-checkbox:checked"
  );
  if (checkboxes.length === 0) {
    alert("Please select an announcement to delete.");
    return;
  }

  if (
    !confirm("Are you sure you want to delete the selected announcement(s)?")
  ) {
    return;
  }

  // Delete each selected announcement by calling the DELETE endpoint
  const deletePromises = [];
  checkboxes.forEach((checkbox) => {
    const announcementId = checkbox.getAttribute("data-id");
    const promise = fetch(`/announcements/${announcementId}/delete/`, {
      method: "DELETE",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
      },
    });
    deletePromises.push(promise);
  });

  Promise.all(deletePromises)
    .then(() => {
      alert("Selected announcement(s) deleted.");
      fetchAnnouncements();
    })
    .catch((error) => {
      console.error("Error deleting announcements:", error);
      alert("Error deleting announcements.");
    });
}

// Global variable to store posted announcements text (if needed)
let latestPostedAnnouncement = "";

// Function to post selected announcements (for demonstration, just marks them as posted locally)
function postAnnouncement() {
  const checkedItems = document.querySelectorAll(".announcement-checkbox:checked");
  if (checkedItems.length === 0) {
    alert("Please select an announcement to post.");
    return;
  }

  const postPromises = [];
  checkedItems.forEach(checkbox => {
    const announcementId = checkbox.getAttribute("data-id");
    const promise = fetch(`/announcements/${announcementId}/post/`, {
      method: "POST",
      headers: { "X-CSRFToken": getCookie("csrftoken") }
    }).then(res => res.json());
    postPromises.push(promise);
  });

  Promise.all(postPromises)
    .then(() => {
      alert("Selected announcement(s) posted.");
      // Optionally redirect or refresh
      // window.location.href = "/some-other-page/";
    })
    .catch(error => console.error("Error posting announcements:", error));
}


// Function to view (filter) announcements in the panel based on the dropdown selection
function viewAnnouncements() {
  const viewOption = document.getElementById("post-options").value;
  const listItems = document.querySelectorAll("#announcement-list li");

  // If no announcements exist, exit
  if (listItems.length === 0) {
    console.log("No saved announcements available.");
    return;
  }

  // Hide all items first
  listItems.forEach((li) => {
    li.style.display = "none";
  });

  if (viewOption === "recent") {
    // Show only the most recent (last item in the list)
    const lastItem = listItems[listItems.length - 1];
    if (lastItem) {
      lastItem.style.display = "flex";
    }
  } else if (viewOption === "selected") {
    // Show only checked announcements
    let atLeastOne = false;
    listItems.forEach((li) => {
      const checkbox = li.querySelector(".announcement-checkbox");
      if (checkbox && checkbox.checked) {
        li.style.display = "flex";
        atLeastOne = true;
      }
    });
    if (!atLeastOne) {
      console.log("No announcements were selected.");
    }
  } else if (viewOption === "all") {
    // Show all announcements
    listItems.forEach((li) => {
      li.style.display = "flex";
    });
  }
}

// Store the header text without displaying it in the HTML
let attendanceHeaderText = "Time Log > By Company";

function filterAttendance() {
  // Get the selected filter values
  const attendanceType = document.getElementById('attendance-type').value;
  const attendanceCompany = document.getElementById('attendance-company').value;
  const attendanceDepartment = document.getElementById('attendance-department').value;

  // Build the URL with query parameters
  const url = `/attendance-list-json/?attendance_type=${attendanceType}&attendance_company=${attendanceCompany}&attendance_department=${attendanceDepartment}`;

  // Use Fetch API to get data from the backend
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById('attendance_rectangle');
      container.innerHTML = '';  // Clear previous data

      if (data.attendance_type === 'time-log') {
        // Create table for time-log data
        let table = document.createElement('table');
        table.innerHTML = `
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Hours Worked</th>
            </tr>
          </thead>
        `;
        let tbody = document.createElement('tbody');
        if (data.attendance_list.length) {
          data.attendance_list.forEach(entry => {
            let row = document.createElement('tr');
            row.innerHTML = `
              <td>${entry.employee_id}</td>
              <td>${entry.name}</td>
              <td>${entry.time_in}</td>
              <td>${entry.time_out}</td>
              <td>${entry.hours_worked}</td>
            `;
            tbody.appendChild(row);
          });
        } else {
          tbody.innerHTML = `<tr><td colspan="5">No time entries found.</td></tr>`;
        }
        table.appendChild(tbody);
        container.appendChild(table);
      } else {
        // For users-active or users-inactive, create a list
        let ul = document.createElement('ul');
        if (data.attendance_list.length) {
          data.attendance_list.forEach(user => {
            let li = document.createElement('li');
            li.textContent = `${user.employee_id} - ${user.name}`;
            ul.appendChild(li);
          });
        } else {
          ul.innerHTML = `<li>No users found.</li>`;
        }
        container.appendChild(ul);
      }
    })
    .catch(error => console.error('Error fetching attendance data:', error));
}
document.getElementById("attendance-company").addEventListener("change", function () {
    let selectedOption = this.options[this.selectedIndex];
    let alias = selectedOption.getAttribute("data-alias");

    if (alias) {
        this.value = alias; // Assign alias value if available
    }
});

// CONVERT TO CSS

// // Apply the gray styling for unselected options
// document.addEventListener("DOMContentLoaded", function () {
//   const dropdowns = document.querySelectorAll("select");

//   dropdowns.forEach((select) => {
//     select.addEventListener("change", function () {
//       let options = this.options;
//       for (let i = 0; i < options.length; i++) {
//         if (options[i].selected) {
//           options[i].style.color = "black"; // Selected option turns black
//         } else {
//           options[i].style.color = "gray"; // Unselected options remain gray
//         }
//       }
//     });
//   });

//   // Apply initial gray color to options when the page loads
//   dropdowns.forEach((select) => {
//     let options = select.options;
//     for (let i = 0; i < options.length; i++) {
//       options[i].style.color = "gray"; // Make all options gray initially
//     }
//     // Set the selected option color to black
//     const selectedOption = select.querySelector("option:checked");
//     if (selectedOption) {
//       selectedOption.style.color = "black";
//     }
//   });
// });


function superadmin_redirect() {
  window.location.href = "{% url 'superadmin_redirect' %}";
}