// Toggle Menu
function toggleMenu() {
  const menu = document.getElementById('menu');
  if (menu.style.left === '0px') {
    menu.style.left = '-300px';
  } else {
    menu.style.left = '0px';
  }
}

// Navigation history stack for back navigation
let navigationHistory = [];

/**
 * Unified navigateTo function:
 * - Pushes the current screen (if any) into the navigation history (if different)
 * - Hides all screens, then shows the selected one
 * - Closes the menu and updates the back button's visibility
 */
function navigateTo(screenId) {
  const currentScreen = document.querySelector('.screen[style*="display: flex"]');
  if (currentScreen && currentScreen.id !== screenId) {
    navigationHistory.push(currentScreen.id);
  }

  // Hide all screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
  });

  // Show the target screen
  const newScreen = document.getElementById(screenId);
  if (newScreen) {
    newScreen.style.display = 'flex';
  }

  // Hide menu if open
  const menu = document.getElementById('menu');
  if (menu) {
    menu.style.left = '-300px';
  }

  // Update the back button (dashboard shortcut) visibility:
  // If there is history, show the back button; otherwise hide it.
  const dashboardShortcut = document.getElementById('dashboard-shortcut');
  if (dashboardShortcut) {
    dashboardShortcut.style.display = navigationHistory.length > 0 ? 'block' : 'none';
  }
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
    saturdayEnd: saturdayEnd,     // fixed
    sundayStart: sundayStart,
    sundayEnd: sundayEnd
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
  const gracePeriod = document.getElementById('grace-period').value;
  if (gracePeriod) {
    alert(`Grace Period of ${gracePeriod} minutes saved.`);
  } else {
    alert("Please enter a grace period.");
  }
}

// Announcement functions
function saveAnnouncement() {
  const announcementText = document.getElementById("announcement-text").value;
  if (announcementText.trim() === "") {
    alert("Please enter an announcement.");
    return;
  }
  document.getElementById("saved-announcements").value += announcementText + "\n\n";
  document.getElementById("announcement-text").value = ""; // Clear input field
  alert("Announcement saved successfully.");
}

// Store the latest posted announcement
let latestPostedAnnouncement = "";

function postAnnouncement() {
  const selectedOption = document.getElementById("post-options").value;
  const savedAnnouncements = document.getElementById("saved-announcements").value.trim().split("\n\n");

  if (!savedAnnouncements.length || savedAnnouncements[0] === "") {
    alert("No saved announcements available.");
    return;
  }

  if (selectedOption === "recent") {
    latestPostedAnnouncement = savedAnnouncements[savedAnnouncements.length - 1];
  } else if (selectedOption === "selected") {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
      alert("Please select an announcement to post.");
      return;
    }
    latestPostedAnnouncement = selectedText;
  } else if (selectedOption === "all") {
    latestPostedAnnouncement = savedAnnouncements.join("\n\n");
  }
  alert(`Posting announcements: ${selectedOption}`);
}

function deleteAnnouncement() {
  const savedAnnouncements = document.getElementById("saved-announcements");
  const selectedText = window.getSelection().toString(); // Get selected text

  if (!selectedText) {
    alert("Please select an announcement to delete.");
    return;
  }

  if (confirm("Are you sure you want to delete the selected announcement?")) {
    savedAnnouncements.value = savedAnnouncements.value.replace(selectedText, "").trim();
    alert("Selected announcement deleted.");
  }
}

function viewAnnouncements() {
  if (!latestPostedAnnouncement) {
    alert("No saved announcements to view.");
    return;
  }
  alert(`Saved Announcements:\n\n${latestPostedAnnouncement}`);
}

// Attendance header and filter functions
let attendanceHeaderText = "Time Log > By Company";

function updateAttendanceHeader() {
  const type = document.getElementById("attendance-type").value;
  const company = document.getElementById("attendance-company").value;

  let typeText = "Time Log";
  if (type === "users-active") {
    typeText = "Users Active";
  } else if (type === "users-inactive") {
    typeText = "Users Inactive";
  }

  // Use the same company options as in filterAttendance for consistency.
  const companyOptions = {
    "agridom": "Agridom Solutions Corp.",
    "farmtech": "Farmtech Agriland Corporation",
    "subang": "Subang Farm",
    "djas": "DJAS Servitrade Corporation",
    "agri-online": "AGRI Online",
    "sunfood": "Sunfood Marketing Inc.",
    "all": "All companies"
  };
  let companyText = companyOptions[company] || "By Company";

  attendanceHeaderText = `${typeText} > ${companyText}`;
}

function filterAttendance() {
  const type = document.getElementById("attendance-type").value;
  const company = document.getElementById("attendance-company").value;
  const department = document.getElementById("attendance-department").value;

  const typeOptions = {
    "time-log": "Time Log",
    "users-active": "Users Active",
    "users-inactive": "Users Inactive"
  };

  const companyOptions = {
    "agridom": "Agridom Solutions Corp.",
    "farmtech": "Farmtech Agriland Corporation",
    "subang": "Subang Farm",
    "djas": "DJAS Servitrade Corporation",
    "agri-online": "AGRI Online",
    "sunfood": "Sunfood Marketing Inc.",
    "all": "All companies"
  };

  const departmentOptions = {
    "all": "All departments",
    "hr": "Human Resources",
    "it": "IT Department",
    "finance": "Finance"
  };

  const selectedType = typeOptions[type] || "Time Log";
  const selectedCompany = companyOptions[company] || "All companies";
  const selectedDepartment = departmentOptions[department] || "All departments";

  const filterText = `Filtering attendance for:\n${selectedType} > ${selectedCompany} > ${selectedDepartment}`;
  alert(filterText);
}

// Single DOMContentLoaded listener to attach event handlers
document.addEventListener("DOMContentLoaded", function () {
  // --- Dropdown Styling ---
  const dropdowns = document.querySelectorAll("select");
  dropdowns.forEach(select => {
    // Set initial color for all options (gray)
    for (let i = 0; i < select.options.length; i++) {
      select.options[i].style.color = "gray";
    }
    // Set the selected option to black
    const selectedOption = select.querySelector("option:checked");
    if (selectedOption) {
      selectedOption.style.color = "black";
    }
    // Change colors on change event
    select.addEventListener("change", function () {
      for (let i = 0; i < this.options.length; i++) {
        this.options[i].style.color = this.options[i].selected ? "black" : "gray";
      }
    });
  });

  // --- Modal Event Handlers ---
  const addBtn = document.getElementById("addWorkHours");
  if (addBtn) {
    addBtn.addEventListener("click", openScheduleModal);
  } else {
    console.error("Add button not found");
  }

  const closeBtn = document.getElementById("closeScheduleBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  // Close modal if clicking outside of it
  window.onclick = function (event) {
    const modal = document.getElementById("setScheduleModal");
    if (event.target === modal) {
      closeModal();
    }
  };

  // --- Back Button (Dashboard Shortcut) ---
  const dashboardShortcut = document.getElementById('dashboard-shortcut');
  if (dashboardShortcut) {
    dashboardShortcut.addEventListener('click', function () {
      if (navigationHistory.length > 0) {
        const lastPage = navigationHistory.pop();
        navigateTo(lastPage);
      }
    });
  }

  // --- Attendance Dropdowns ---
  const attendanceType = document.getElementById("attendance-type");
  if (attendanceType) {
    attendanceType.addEventListener("change", updateAttendanceHeader);
  }
  const attendanceCompany = document.getElementById("attendance-company");
  if (attendanceCompany) {
    attendanceCompany.addEventListener("change", updateAttendanceHeader);
  }
});
