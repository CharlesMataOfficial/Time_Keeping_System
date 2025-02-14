// Toggle Menu
function toggleMenu() {
  const menu = document.getElementById('menu');
  if (menu.style.left === '0px') {
    menu.style.left = '-300px';
  } else {
    menu.style.left = '0px';
  }
}


function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });

    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.style.display = 'flex';
    }

    // Update the last visited section
    lastVisitedSection = screenId;

    // Hide menu if open
    document.getElementById('menu').style.left = '-300px';

}

// Show Dashboard on page load
document.addEventListener("DOMContentLoaded", function () {
  const dropdowns = document.querySelectorAll("select");

  dropdowns.forEach(select => {
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
});


// Define the ordered menu navigation (matches sidebar order)
const menuOrder = [
  "dashboard",
  "log",
  "attendance-list",
  "work-hours",
  "announcement",
  "export-excel",
  "leave-approval",
  "about"
];

// Store the currently active screen
let currentScreen = "dashboard"; // Default to dashboard

// Function to navigate to a screen
function navigateTo(screenId) {
  // Hide all screens first
  document.querySelectorAll('.screen').forEach(screen => {
      screen.style.display = 'none';
  });

  // Show the selected screen
  const activeScreen = document.getElementById(screenId);
  if (activeScreen) {
      activeScreen.style.display = 'flex';
      currentScreen = screenId; // Update the current screen
  }

  // Hide menu when a screen is selected
  document.getElementById('menu').style.left = '-300px';

  // Always show the back and forward buttons
  const dashboardShortcut = document.getElementById('dashboard-shortcut');
  dashboardShortcut.style.display = 'block'; // Always show on all screens
}

// Function to handle back navigation based on menu order
document.getElementById('left-arrow').addEventListener('click', function () {
  let currentIndex = menuOrder.indexOf(currentScreen);
  
  if (currentIndex > 0) {
      let previousScreen = menuOrder[currentIndex - 1]; // Get the previous screen in the list
      navigateTo(previousScreen);
  }
});

// Function to handle forward navigation based on menu order
document.getElementById('right-arrow').addEventListener('click', function () {
  let currentIndex = menuOrder.indexOf(currentScreen);
  
  if (currentIndex < menuOrder.length - 1) {
      let nextScreen = menuOrder[currentIndex + 1]; // Get the next screen in the list
      navigateTo(nextScreen);
  }
});

// Show Dashboard on page load
document.addEventListener("DOMContentLoaded", function () {
  navigateTo("dashboard");
});



// Update the attendance header when dropdown selections change
document.getElementById("attendance-type").addEventListener("change", updateAttendanceHeader);
document.getElementById("attendance-company").addEventListener("change", updateAttendanceHeader);

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

// Function to save announcement
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

// Function to post announcement
function postAnnouncement() {
    const selectedOption = document.getElementById("post-options").value;
    const savedAnnouncements = document.getElementById("saved-announcements").value.trim().split("\n\n");

    if (!savedAnnouncements.length || savedAnnouncements[0] === "") {
        alert("No saved announcements available.");
        return;
    }

    if (selectedOption === "recent") {
        // Store only the most recent announcement
        latestPostedAnnouncement = savedAnnouncements[savedAnnouncements.length - 1];

    } else if (selectedOption === "selected") {
        // Store only the selected text
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            alert("Please select an announcement to post.");
            return;
        }
        latestPostedAnnouncement = selectedText;

    } else if (selectedOption === "all") {
        // Store all announcements
        latestPostedAnnouncement = savedAnnouncements.join("\n\n");
    }

    // Keep the prompt the same
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
      // Replace only the selected text with an empty string
      savedAnnouncements.value = savedAnnouncements.value.replace(selectedText, "").trim();
      alert("Selected announcement deleted.");
  }
}

// Function to view announcements (only shows the latest posted one)
function viewAnnouncements() {
  if (!latestPostedAnnouncement) {
      alert("No saved announcements to view.");
      return;
  }

  alert(`Saved Announcements:\n\n${latestPostedAnnouncement}`);
}


// Store the header text without displaying it in the HTML
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

// Ensure dropdown selections update the stored header text
document.getElementById("attendance-type").addEventListener("change", updateAttendanceHeader);
document.getElementById("attendance-company").addEventListener("change", updateAttendanceHeader);

// Update the filter function to show the selected options in a prompt with the correct format
function filterAttendance() {
  const type = document.getElementById("attendance-type").value; // Correctly get the type
  const company = document.getElementById("attendance-company").value; // Get the company value
  const department = document.getElementById("attendance-department").value; // Get the department value
  
  // Define the options for each dropdown
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

  // Get the selected text for each dropdown option
  const selectedType = typeOptions[type] || "Time Log";
  const selectedCompany = companyOptions[company] || "All companies";
  const selectedDepartment = departmentOptions[department] || "All departments";
  
  // Generate the filter text
  const filterText = `Filtering attendance for:\n${selectedType} > ${selectedCompany} > ${selectedDepartment}`;

  // Show the filter information in a prompt
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

