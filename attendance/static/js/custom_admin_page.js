// Toggle Menu
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.left = menu.style.left === "0px" ? "-300px" : "0px";
}

// Define the ordered menu navigation (matches sidebar order)
const menuOrder = [
  "dashboard",
  "log",
  "attendance-list",
  "announcement",
  "export-excel",
  "leave-approval",
  "about",
];

// Store the currently active screen
let currentScreen = "dashboard"; // Default to dashboard

// Function to navigate to a screen
function navigateTo(screenId) {
  if (!menuOrder.includes(screenId)) return; // Prevent errors if an invalid screen ID is passed

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.style.display = "none";
  });

  const activeScreen = document.getElementById(screenId);
  if (activeScreen) {
    activeScreen.style.display = "flex";
    currentScreen = screenId;
  }

  document.getElementById("menu").style.left = "-300px";

  if (screenId === "announcement") {
    fetchAnnouncements();
  } else if (screenId === "dashboard") {
    loadDashboardData();
  } else if (screenId === "log") {
    loadLogData(); // Load logs when navigating to log screen
  }
}

// Add this function to load dashboard data
function loadDashboardData() {
  fetch("/dashboard-data/")
    .then((response) => response.json())
    .then((data) => {
      // Display total counts
      document.getElementById("total-time-in").textContent = data.today_entries.length;

      const timeOutCount = data.today_entries.filter(entry => entry.time_out).length;
      document.getElementById("total-time-out").textContent = timeOutCount;

      // Display late count
      document.getElementById("total-late-count").textContent = data.late_count;

      // Display late employees in table format
      const lateEmployeesList = document.querySelector(".late-employees-list");
      lateEmployeesList.innerHTML = "";

      if (data.top_late.length === 0) {
        lateEmployeesList.innerHTML = "<tr><td colspan='2'></td></tr>";
      } else {
        data.top_late.forEach((employee) => {
          const minutes = Math.abs(Math.round(employee.minutes_diff || 0));
          lateEmployeesList.innerHTML += `
            <tr>
              <td>${employee.name}</td>
              <td class="minutes late">${minutes} mins</td>
            </tr>
          `;
        });
      }

      // Display early birds in table format
      const earlyBirdsList = document.querySelector(".early-birds-list");
      earlyBirdsList.innerHTML = "";

      if (data.top_early.length === 0) {
        earlyBirdsList.innerHTML = "<tr><td colspan='2'></td></tr>";
      } else {
        data.top_early.forEach((employee) => {
          const minutes = Math.abs(Math.round(employee.minutes_diff || 0));
          earlyBirdsList.innerHTML += `
            <tr>
              <td>${employee.name}</td>
              <td class="minutes early">${minutes} mins</td>
            </tr>
          `;
        });
      }
    })
    .catch((error) => {
      console.error("Error loading dashboard data:", error);
    });
}

// Function to load and filter log data
function loadLogData(filtered = false) {
  let url = "/get_logs/";

  // Add filter parameters if filtering is requested
  if (filtered) {
    const searchQuery = document.getElementById("log-search").value;
    const actionType = document.getElementById("log-action").value;
    const dateRange = document.getElementById("log-date").value;

    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (actionType && actionType !== "all") params.append("action", actionType);
    if (dateRange && dateRange !== "all") params.append("date_range", dateRange);

    url += "?" + params.toString();
  }

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("log_rectangle");
      if (!container) return;

      container.innerHTML = ""; // Clear previous content

      if (!data.logs || data.logs.length === 0) {
        container.innerHTML = "<p>No logs found.</p>";
        return;
      }

      // Create a table to display the logs
      const table = document.createElement("table");
      table.className = "log-table";
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";

      // Create table header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      ["Timestamp", "User", "Action", "Description", "IP Address"].forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        th.style.border = "1px solid #ddd";
        th.style.padding = "8px";
        th.style.backgroundColor = "#f2f2f2";
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create table body
      const tbody = document.createElement("tbody");
      data.logs.forEach(log => {
        const row = document.createElement("tr");

        // Add cells for each column
        [log.timestamp, `${log.user} (${log.employee_id})`, log.action,
         log.description, log.ip_address || "Unknown"].forEach(cellText => {
          const cell = document.createElement("td");
          cell.textContent = cellText;
          cell.style.border = "1px solid #ddd";
          cell.style.padding = "8px";
          row.appendChild(cell);
        });

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      container.appendChild(table);
    })
    .catch((error) => {
      console.error("Error loading log data:", error);
    });
}

// Function to apply filters to logs
function filterLogs() {
  loadLogData(true);
}

// Keyboard Shortcut: Left Arrow (`←`) and Right Arrow (`→`) to navigate
document.addEventListener("keydown", function (event) {
  let currentIndex = menuOrder.indexOf(currentScreen);

  if (event.key === "ArrowLeft" && currentIndex > 0) {
    navigateTo(menuOrder[currentIndex - 1]); // Move left (previous page)
  } else if (event.key === "ArrowRight" && currentIndex < menuOrder.length - 1) {
    navigateTo(menuOrder[currentIndex + 1]); // Move right (next page)
  }
});

document.addEventListener("DOMContentLoaded", function () {
  navigateTo("dashboard"); // Ensure dashboard loads first

  const leftArrow = document.getElementById("left-arrow");
  const rightArrow = document.getElementById("right-arrow");

  if (leftArrow) {
    leftArrow.addEventListener("click", function () {
      let currentIndex = menuOrder.indexOf(currentScreen);
      if (currentIndex > 0) {
        navigateTo(menuOrder[currentIndex - 1]);
      }
    });
  }

  if (rightArrow) {
    rightArrow.addEventListener("click", function () {
      let currentIndex = menuOrder.indexOf(currentScreen);
      if (currentIndex < menuOrder.length - 1) {
        navigateTo(menuOrder[currentIndex + 1]);
      }
    });
  }

  if (currentScreen === "dashboard") {
    loadDashboardData();
  }
});

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
    const lastItem = listItems[0];
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

// Fix for filterAttendance function in custom_admin_page.js
function filterAttendance() {
  // Get filter values from dropdowns and search field
  const typeElem = document.getElementById("attendance-type");
  const companyElem = document.getElementById("attendance-company");
  const departmentElem = document.getElementById("attendance-department");
  const searchElem = document.getElementById("attendance-search");

  // Ensure these elements exist
  if (!typeElem || !companyElem || !departmentElem || !searchElem) {
    console.error("One or more filter elements not found.");
    return;
  }

  const type = typeElem.value;
  const company = companyElem.value;
  const department = departmentElem.value;
  const search = searchElem.value;

  // Build query parameters (including search)
  const params = new URLSearchParams({
    attendance_type: type,
    attendance_company: company,
    attendance_department: department,
    search: search
  });

  // Log the request URL for debugging
  const requestUrl = '/attendance_list_json/?' + params.toString();
  console.log('Requesting:', requestUrl);

  fetch(requestUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not OK");
      }
      return response.json();
    })
    .then(data => {
      console.log("Fetched data:", data);

      // Get the container element for the table
      const container = document.getElementById("attendance_rectangle");
      if (!container) {
        console.error("Container with ID 'attendance_rectangle' not found.");
        return;
      }
      container.innerHTML = "";

      // Check if data exists
      if (!data.attendance_list || data.attendance_list.length === 0) {
        container.innerHTML = "<p>No records found.</p>";
        return;
      }

      // Create a table to display the attendance data
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "10px";

      // Create table header based on attendance type
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      let headers = [];

      if (data.attendance_type === "time-log") {
        headers = ["Employee ID", "Name", "Time In", "Time Out", "Hours Worked"];
      } else {
        headers = ["Employee ID", "Name"];
      }

      headers.forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        th.style.border = "1px solid #ddd";
        th.style.padding = "8px";
        th.style.backgroundColor = "#f2f2f2";
        th.style.textAlign = "center";
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create table body with returned attendance data
      const tbody = document.createElement("tbody");
      data.attendance_list.forEach(item => {
        const row = document.createElement("tr");

        if (data.attendance_type === "time-log") {
          const cellEmployee = document.createElement("td");
          cellEmployee.textContent = item.employee_id;
          cellEmployee.style.border = "1px solid #ddd";
          cellEmployee.style.padding = "8px";
          row.appendChild(cellEmployee);

          const cellName = document.createElement("td");
          cellName.textContent = item.name;
          cellName.style.border = "1px solid #ddd";
          cellName.style.padding = "8px";
          row.appendChild(cellName);

          const cellTimeIn = document.createElement("td");
          cellTimeIn.textContent = item.time_in;
          cellTimeIn.style.border = "1px solid #ddd";
          cellTimeIn.style.padding = "8px";
          row.appendChild(cellTimeIn);

          const cellTimeOut = document.createElement("td");
          cellTimeOut.textContent = item.time_out;
          cellTimeOut.style.border = "1px solid #ddd";
          cellTimeOut.style.padding = "8px";
          row.appendChild(cellTimeOut);

          const cellHours = document.createElement("td");
          cellHours.textContent = item.hours_worked;
          cellHours.style.border = "1px solid #ddd";
          cellHours.style.padding = "8px";
          row.appendChild(cellHours);
        } else {
          const cellEmployee = document.createElement("td");
          cellEmployee.textContent = item.employee_id;
          cellEmployee.style.border = "1px solid #ddd";
          cellEmployee.style.padding = "8px";
          row.appendChild(cellEmployee);

          const cellName = document.createElement("td");
          cellName.textContent = item.name;
          cellName.style.border = "1px solid #ddd";
          cellName.style.padding = "8px";
          row.appendChild(cellName);
        }
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      container.appendChild(table);
    })
    .catch(error => console.error("Error fetching attendance data:", error));
}

// Apply the gray styling for unselected options
document.addEventListener("DOMContentLoaded", function () {
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

  // Apply initial gray color to options when the page loads
  dropdowns.forEach((select) => {
    let options = select.options;
    for (let i = 0; i < options.length; i++) {
      options[i].style.color = "gray"; // Make all options gray initially
    }
    // Set the selected option color to black
    const selectedOption = select.querySelector("option:checked");
    if (selectedOption) {
      selectedOption.style.color = "black";
    }
  });
});

function superadmin_redirect() {
  window.location.href = "{% url 'superadmin_redirect' %}";
}

// Function to open the export Excel modal
function openModalExportExcel() {
  document.getElementById('modal_export_excel').style.display = 'block';
}

// Close modal when the user clicks on the close button
document.getElementById('modal_export_close').addEventListener('click', function () {
  document.getElementById('modal_export_excel').style.display = 'none';
});

// Toggle sections based on modal button clicks inside the modal
document.getElementById('modal_export_by_date_btn').addEventListener('click', function () {
  document.getElementById('modal_export_by_date_section').style.display = 'block';
  document.getElementById('modal_export_by_employee_section').style.display = 'none';
});

document.getElementById('modal_export_by_employee_btn').addEventListener('click', function () {
  document.getElementById('modal_export_by_employee_section').style.display = 'block';
  document.getElementById('modal_export_by_date_section').style.display = 'none';
});

// Optional: Close modal if user clicks outside the modal content
window.addEventListener('click', function (event) {
  const modal = document.getElementById('modal_export_excel');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// Bind export screen buttons to open the modal and auto-select the section
document.getElementById('export_date_button').addEventListener('click', function () {
  openModalExportExcel();
  // Automatically display the "Export by Date" section
  document.getElementById('modal_export_by_date_section').style.display = 'block';
  document.getElementById('modal_export_by_employee_section').style.display = 'none';
});

document.getElementById('export_employee_button').addEventListener('click', function () {
  openModalExportExcel();
  // Automatically display the "Export by Employee ID" section
  document.getElementById('modal_export_by_employee_section').style.display = 'block';
  document.getElementById('modal_export_by_date_section').style.display = 'none';
});

// Instead, attach the export date check to the submit button inside the modal
document.getElementById('modal_export_date_submit').addEventListener('click', function () {
  const exportDate = document.getElementById('modal_export_date').value;
  if (!exportDate) {
    alert("Please select a date.");
    return;
  }
  // Trigger your export functionality, e.g., redirect to export URL or call AJAX
  window.location.href = `/export_time_entries_by_date/?export_date=${exportDate}`;
});

document.getElementById('modal_export_employee_submit').addEventListener('click', function () {
  const employeeId = document.getElementById('modal_export_employee_id').value;
  if (!employeeId) {
    alert("Please enter an Employee ID.");
    return;
  }
  // Construct the URL to trigger the export view
  window.location.href = `/export_time_entries_by_employee/?employee_id=${employeeId}`;
});