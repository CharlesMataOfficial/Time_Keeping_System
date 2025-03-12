let logPage = 1;
const logsPerPage = 50;
let isLoadingLogs = false;
let hasMoreLogs = true;

// Add these at the top of your custom_admin_page.js file
let attendancePage = 1;
const attendancePerPage = 50;
let isLoadingAttendance = false;
let hasMoreAttendance = true;

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

// Add this helper function at the beginning of your file
function formatMinutesToHoursMinutes(totalMinutes) {
  const minutes = Math.abs(Math.round(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    if (mins > 0) {
      return `${hours} hr ${mins} min`;
    } else {
      return `${hours} hr`;
    }
  } else {
    return `${mins} min`;
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
          const formattedTime = formatMinutesToHoursMinutes(minutes);
          lateEmployeesList.innerHTML += `
            <tr>
              <td>${employee.name}</td>
              <td class="minutes late" data-minutes="${minutes}" data-formatted="${formattedTime}">
                ${formattedTime}
              </td>
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
          const formattedTime = formatMinutesToHoursMinutes(minutes);
          earlyBirdsList.innerHTML += `
            <tr>
              <td>${employee.name}</td>
              <td class="minutes early" data-minutes="${minutes}" data-formatted="${formattedTime}">
                ${formattedTime}
              </td>
            </tr>
          `;
        });
      }

      // Add click handlers after the tables are populated
      addTimeFormatToggleHandlers();
    })
    .catch((error) => {
      console.error("Error loading dashboard data:", error);
    });
}

// Add this function to handle the toggle functionality
function addTimeFormatToggleHandlers() {
  // Add click handlers to all time display cells
  document.querySelectorAll(".minutes").forEach(cell => {
    cell.style.cursor = "pointer"; // Show as clickable
    cell.title = "Click to toggle format"; // Add tooltip

    // Track toggle state with a custom data attribute
    cell.dataset.showingRawMinutes = "false";

    cell.addEventListener("click", function() {
      const minutes = this.dataset.minutes;
      const formatted = this.dataset.formatted;

      // Check the current toggle state
      if (this.dataset.showingRawMinutes === "false") {
        // Currently showing formatted time, switch to raw minutes
        this.textContent = `${minutes} mins`;
        this.dataset.showingRawMinutes = "true";
      } else {
        // Currently showing raw minutes, switch to formatted time
        this.textContent = `${formatted}`;
        this.dataset.showingRawMinutes = "false";
      }
    });
  });
}

// Function to load and filter log data with pagination
function loadLogData(filtered = false, reset = false) {
  if (isLoadingLogs && !reset) return;

  // Reset pagination if requested or if filtering
  if (reset || filtered) {
    logPage = 1;
    hasMoreLogs = true;
    document.getElementById("log_rectangle").innerHTML = "";
  }

  if (!hasMoreLogs) return;

  isLoadingLogs = true;

  // Show loading indicator
  let loadingSpinner = document.getElementById("log-loading-spinner");
  if (!loadingSpinner) {
    loadingSpinner = document.createElement("div");
    loadingSpinner.id = "log-loading-spinner";
    loadingSpinner.className = "loading-spinner";
    loadingSpinner.innerHTML = "Loading more data...";
    document.getElementById("log_rectangle").appendChild(loadingSpinner);
  }
  loadingSpinner.classList.add("visible");

  let url = `/get_logs/?page=${logPage}&limit=${logsPerPage}`;

  if (filtered) {
    const searchQuery = document.getElementById("log-search").value;
    const actionType = document.getElementById("log-action").value;
    const dateRange = document.getElementById("log-date").value;

    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (actionType && actionType !== "all") params.append("action", actionType);
    if (dateRange && dateRange !== "all") params.append("date_range", dateRange);

    url += "&" + params.toString();
  }

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("log_rectangle");
      if (!container) return;

      // Create or find existing table
      let table = container.querySelector(".log-table");
      if (!table && data.logs && data.logs.length > 0) {
        // Create table with consistent structure
        table = document.createElement("table");
        table.className = "log-table";

        // Create table header with sticky positioning
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Timestamp", "User", "Action", "Description", "IP Address"].forEach(headerText => {
          const th = document.createElement("th");
          th.textContent = headerText;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create tbody for scrollable content
        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        container.appendChild(table);
      }

      // If no logs found on first load
      if (logPage === 1 && (!data.logs || data.logs.length === 0)) {
        container.innerHTML = "<p>No logs found.</p>";
        hasMoreLogs = false;
        isLoadingLogs = false;
        return;
      }

      // Append new logs to existing tbody
      if (data.logs && data.logs.length > 0) {
        const tbody = table.querySelector("tbody");
        data.logs.forEach(log => {
          const row = document.createElement("tr");

          // Add cells for each column without inline styles
          [log.timestamp, `${log.user} (${log.employee_id})`, log.action,
           log.description, log.ip_address || "Unknown"].forEach(cellText => {
            const cell = document.createElement("td");
            cell.textContent = cellText;
            row.appendChild(cell);
          });

          tbody.appendChild(row);
        });

        // Check if there's more data to load
        hasMoreLogs = data.logs.length === logsPerPage;

        // Increment page for next load
        logPage++;
      } else {
        hasMoreLogs = false;
      }

      // Hide loading indicator
      loadingSpinner.classList.remove("visible");
      isLoadingLogs = false;
    })
    .catch((error) => {
      console.error("Error loading log data:", error);
      isLoadingLogs = false;
      // Hide loading indicator
      const loadingSpinner = document.getElementById("log-loading-spinner");
      if (loadingSpinner) loadingSpinner.classList.remove("visible");
    });
}

// Function to apply filters to logs
function filterLogs() {
  loadLogData(true, true); // true for filtered, true for reset
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

      // Add each announcement with zebra striping
      data.forEach((announcement, index) => {
        const li = document.createElement("li");
        li.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9f9f9";
        li.className = "announcement-item";
        li.setAttribute("data-id", announcement.id);

        // Format the announcement content
        const fullText = announcement.content;
        const truncatedText = fullText.length > 60 ? fullText.substring(0, 60) + "..." : fullText;

        li.innerHTML = `
          <input type="checkbox" class="announcement-checkbox" data-id="${announcement.id}">
          <div class="announcement-content-wrapper">
            <span class="announcement-text" title="${fullText}" data-full-text="${fullText}" data-truncated-text="${truncatedText}">${truncatedText}</span>
            ${fullText.length > 60 ?
              '<a href="#" class="read-more-link">[Read more]</a>' : ''}
          </div>
        `;

        // Make the entire row clickable for checkbox toggle
        li.addEventListener("click", function(e) {
          // Avoid toggling if clicking on the read more link
          if (e.target.classList.contains("read-more-link")) {
            return;
          }

          const checkbox = this.querySelector(".announcement-checkbox");
          checkbox.checked = !checkbox.checked;

          // Visual feedback for selection
          if (checkbox.checked) {
            this.classList.add("selected");
          } else {
            this.classList.remove("selected");
          }
        });

        // Prevent clicks on the checkbox from triggering the li's click handler
        const checkbox = li.querySelector(".announcement-checkbox");
        checkbox.addEventListener("click", function(e) {
          e.stopPropagation();

          // Visual feedback for selection
          if (this.checked) {
            li.classList.add("selected");
          } else {
            li.classList.remove("selected");
          }
        });

        // Add click handler for read more link
        const readMoreLink = li.querySelector(".read-more-link");
        if (readMoreLink) {
          readMoreLink.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent triggering the li click handler

            const textSpan = li.querySelector(".announcement-text");
            const fullText = textSpan.getAttribute("data-full-text");
            const truncatedText = textSpan.getAttribute("data-truncated-text");

            if (this.textContent === "[Read more]") {
              textSpan.textContent = fullText;
              this.textContent = "[Read less]";
            } else {
              textSpan.textContent = truncatedText;
              this.textContent = "[Read more]";
            }
          });
        }

        // Add hover effect
        li.addEventListener("mouseenter", function() {
          this.style.backgroundColor = "#f0f0f0";
        });

        li.addEventListener("mouseleave", function() {
          this.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9f9f9";
          // Keep selected items highlighted
          if (this.classList.contains("selected")) {
            this.style.backgroundColor = "#e3f2fd";
          }
        });

        announcementList.appendChild(li);
      });

      // If no announcements, show a message
      if (data.length === 0) {
        const emptyLi = document.createElement("li");
        emptyLi.style.textAlign = "center";
        emptyLi.style.padding = "20px";
        emptyLi.textContent = "No announcements available";
        announcementList.appendChild(emptyLi);
      }
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

document.addEventListener('DOMContentLoaded', function() {
  // Open modal when the main export button is clicked
  const exportExcelButton = document.getElementById('export_excel_button');
  exportExcelButton.addEventListener('click', function() {
    document.getElementById('modal_export_excel').style.display = 'block';
    // Default to Single Date option
    showSingleDateSection();
  });
  
  // Close modal when the close icon is clicked
  document.getElementById('modal_export_close').addEventListener('click', function () {
    document.getElementById('modal_export_excel').style.display = 'none';
  });
  
  // Optional: Close modal if user clicks outside the modal content
  window.addEventListener('click', function (event) {
    const modal = document.getElementById('modal_export_excel');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Option toggling: Single Date vs. Date Range
  const optionSingleDate = document.getElementById('option_single_date');
  const optionDateRange = document.getElementById('option_date_range');
  
  optionSingleDate.addEventListener('click', showSingleDateSection);
  optionDateRange.addEventListener('click', showDateRangeSection);
  
  function showSingleDateSection() {
    optionSingleDate.classList.add('active');
    optionDateRange.classList.remove('active');
    document.getElementById('modal_export_by_date_section').style.display = 'block';
    document.getElementById('modal_export_by_date_range_section').style.display = 'none';
  }
  
  function showDateRangeSection() {
    optionDateRange.classList.add('active');
    optionSingleDate.classList.remove('active');
    document.getElementById('modal_export_by_date_section').style.display = 'none';
    document.getElementById('modal_export_by_date_range_section').style.display = 'block';
  }
  
  // Attach remove event for excluded date buttons
  function attachRemoveListener(button) {
    button.addEventListener('click', function() {
      this.parentElement.remove();
    });
  }
  document.querySelectorAll('.remove_excluded_date').forEach(button => {
    attachRemoveListener(button);
  });
  
  // Add new excluded date input for Date Range export
  const addExcludedDateBtn = document.getElementById('add_excluded_date');
  if (addExcludedDateBtn) {
    addExcludedDateBtn.addEventListener('click', function() {
      const container = document.getElementById('modal_excluded_dates_container');
      const newInputDiv = document.createElement('div');
      newInputDiv.className = 'excluded-date';
      newInputDiv.innerHTML = `
        <input type="date" class="modal_export_excluded_date">
        <button class="remove_excluded_date" type="button">&times;</button>
      `;
      container.appendChild(newInputDiv);
      attachRemoveListener(newInputDiv.querySelector('.remove_excluded_date'));
    });
  }
  
  // Submit handler for Single Date Export
  const exportDateSubmit = document.getElementById('modal_export_date_submit');
exportDateSubmit.addEventListener('click', function () {
  const dateValue = document.getElementById('modal_export_date').value;
  if (!dateValue) {
    alert("Please select a date.");
    return;
  }
  const employeeId = document.getElementById('modal_export_employee_id').value.trim();
  let url = `/export_time_entries_by_date/?date=${encodeURIComponent(dateValue)}`;
  if (employeeId) {
    url += `&employee_id=${encodeURIComponent(employeeId)}`;
  }
  window.location.href = url;
});
  
  // Submit handler for Date Range Export
  const exportDateRangeSubmit = document.getElementById('modal_export_date_range_submit');
  exportDateRangeSubmit.addEventListener('click', function () {
    const startDate = document.getElementById('modal_export_date_start').value;
    const endDate = document.getElementById('modal_export_date_end').value;
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }
    
    // Gather excluded dates (if any)
    const excludedInputs = document.getElementsByClassName('modal_export_excluded_date');
    let excludedDates = [];
    for (let input of excludedInputs) {
      if (input.value) {
        excludedDates.push(input.value);
      }
    }
    
    const employeeId = document.getElementById('modal_export_employee_id').value.trim();
    
    let url = `/export_time_entries_range/?date_start=${encodeURIComponent(startDate)}&date_end=${encodeURIComponent(endDate)}`;
    excludedDates.forEach(date => {
      url += `&exclude_date=${encodeURIComponent(date)}`;
    });
    if (employeeId) {
      url += `&employee_id=${encodeURIComponent(employeeId)}`;
    }
    
    window.location.href = url;
  });
});

// Function to load pending leaves
function loadPendingLeaves() {
  fetch('/leaves/pending/')
      .then(response => response.json())
      .then(data => {
          const container = document.getElementById('leave-approval_rectangle');

          if (!data.leaves || data.leaves.length === 0) {
              container.innerHTML = '<p>No pending leave requests</p>';
              return;
          }

          const table = document.createElement('table');
          table.classList.add('leave-table');

          table.innerHTML = `
              <thead>
                  <tr>
                      <th>Employee</th>
                      <th>Duration</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  ${data.leaves.map(leave => `
                      <tr>
                          <td>${leave.employee_name}</td>
                          <td>${leave.start_date} to ${leave.end_date} (${leave.duration} days)</td>
                          <td>${leave.leave_type}</td>
                          <td>${leave.reason}</td>
                          <td>
                              <button onclick="processLeave(${leave.id}, 'approve')" class="approve-btn">
                                  Approve
                              </button>
                              <button onclick="showRejectDialog(${leave.id})" class="reject-btn">
                                  Reject
                              </button>
                          </td>
                      </tr>
                  `).join('')}
              </tbody>
          `;

          container.innerHTML = '';
          container.appendChild(table);
      })
      .catch(error => {
          console.error('Error loading leaves:', error);
      });
}

function processLeave(leaveId, action, rejectionReason = '') {
  const formData = new FormData();
  formData.append('leave_id', leaveId);
  formData.append('action', action);

  if (rejectionReason) {
      formData.append('rejection_reason', rejectionReason);
  }

  fetch('/leaves/process/', {
      method: 'POST',
      headers: {
          'X-CSRFToken': getCookie('csrftoken')
      },
      body: formData
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          // Refresh the list
          loadPendingLeaves();
      } else {
          alert('Error: ' + data.message);
      }
  })
  .catch(error => {
      console.error('Error processing leave:', error);
  });
}

function showRejectDialog(leaveId) {
  const reason = prompt('Please enter rejection reason:');
  if (reason !== null) {
      processLeave(leaveId, 'reject', reason);
  }
}

// Load pending leaves when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the admin page with the leave approval section
  if (document.getElementById('leave-approval_rectangle')) {
      loadPendingLeaves();
  }
});

// Add scroll event listener for lazy loading logs
document.addEventListener("DOMContentLoaded", function() {
  const logContainer = document.getElementById("log_rectangle");
  if (logContainer) {
    logContainer.addEventListener("scroll", function() {
      // Load more logs when scrolled near the bottom (within 200px)
      if (this.scrollHeight - this.scrollTop - this.clientHeight < 200) {
        loadLogData(false, false); // Continue with existing filters without resetting
      }
    });
  }
});

// Function to filter and load attendance data with pagination
function filterAttendance(reset = false) {
  // Reset pagination if requested
  if (reset) {
    attendancePage = 1;
    hasMoreAttendance = true;
    document.getElementById("attendance_rectangle").innerHTML = "";
  }

  if (isLoadingAttendance || !hasMoreAttendance) return;

  isLoadingAttendance = true;

  // Show loading indicator
  let loadingSpinner = document.getElementById("attendance-loading-spinner");
  if (!loadingSpinner) {
    loadingSpinner = document.createElement("div");
    loadingSpinner.id = "attendance-loading-spinner";
    loadingSpinner.className = "loading-spinner";
    loadingSpinner.innerHTML = "Loading more data...";
    document.getElementById("attendance_rectangle").appendChild(loadingSpinner);
  }
  loadingSpinner.classList.add("visible");

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

  // Build query parameters
  const params = new URLSearchParams({
    attendance_type: typeElem.value,
    attendance_company: companyElem.value,
    attendance_department: departmentElem.value,
    search: searchElem.value,
    page: attendancePage,
    limit: attendancePerPage
  });

  fetch(`/attendance_list_json/?${params}`)
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not OK");
      }
      return response.json();
    })
    .then(data => {
      const container = document.getElementById("attendance_rectangle");
      if (!container) {
        console.error("Container with ID 'attendance_rectangle' not found.");
        return;
      }

      // Create table if it doesn't exist
      let table = container.querySelector("table");

      if (!table && data.attendance_list && data.attendance_list.length > 0) {
        // Create table with consistent structure
        table = document.createElement("table");
        table.classList.add("attendance-table");

        // Create table header with sticky positioning
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
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create tbody for scrollable content
        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        container.appendChild(table);
      }

      // Show "no records" message on first load if empty
      if (attendancePage === 1 && (!data.attendance_list || data.attendance_list.length === 0)) {
        container.innerHTML = "<p>No records found.</p>";
        isLoadingAttendance = false;
        hasMoreAttendance = false;
        loadingSpinner.classList.remove("visible");
        return;
      }

      // Append data to existing table
      if (data.attendance_list && data.attendance_list.length > 0) {
        const tbody = table.querySelector("tbody");

        data.attendance_list.forEach(item => {
          const row = document.createElement("tr");

          if (data.attendance_type === "time-log") {
            // Create cells for time log entries
            const cellEmployee = document.createElement("td");
            cellEmployee.textContent = item.employee_id;
            row.appendChild(cellEmployee);

            const cellName = document.createElement("td");
            cellName.textContent = item.name;
            row.appendChild(cellName);

            const cellTimeIn = document.createElement("td");
            cellTimeIn.textContent = item.time_in;
            row.appendChild(cellTimeIn);

            const cellTimeOut = document.createElement("td");
            cellTimeOut.textContent = item.time_out;
            row.appendChild(cellTimeOut);

            const cellHours = document.createElement("td");
            cellHours.textContent = item.hours_worked;
            row.appendChild(cellHours);
          } else {
            // Create cells for user entries
            const cellEmployee = document.createElement("td");
            cellEmployee.textContent = item.employee_id;
            row.appendChild(cellEmployee);

            const cellName = document.createElement("td");
            cellName.textContent = item.name;
            row.appendChild(cellName);
          }

          tbody.appendChild(row);
        });

        // Update pagination state
        hasMoreAttendance = data.attendance_list.length === attendancePerPage;
        attendancePage++;
      } else {
        hasMoreAttendance = false;
      }

      // Hide loading indicator
      loadingSpinner.classList.remove("visible");
      isLoadingAttendance = false;
    })
    .catch(error => {
      console.error("Error fetching attendance data:", error);
      isLoadingAttendance = false;
      loadingSpinner.classList.remove("visible");
    });
}

// Add scroll event listener for attendance lazy loading
document.addEventListener("DOMContentLoaded", function() {
  const attendanceContainer = document.getElementById("attendance_rectangle");
  if (attendanceContainer) {
    attendanceContainer.addEventListener("scroll", function() {
      // Load more attendance records when scrolled near the bottom
      if (this.scrollHeight - this.scrollTop - this.clientHeight < 200) {
        filterAttendance(false); // Continue with existing filters without resetting
      }
    });
  }

  // Reset pagination when filters change
  const filterElements = document.querySelectorAll(
    "#attendance-type, #attendance-company, #attendance-department, #attendance-search"
  );

  filterElements.forEach(element => {
    element.addEventListener("change", () => {
      filterAttendance(true); // Reset and reload with new filters
    });
  });
});