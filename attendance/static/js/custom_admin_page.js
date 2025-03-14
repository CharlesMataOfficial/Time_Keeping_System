let logPage = 1;
const logsPerPage = 50;
let isLoadingLogs = false;
let hasMoreLogs = true;

let attendancePage = 1;
const attendancePerPage = 50;
let isLoadingAttendance = false;
let hasMoreAttendance = true;

/**
 * Toggles the visibility of the menu.
 */
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

/**
 * Navigates to a specific screen within the admin panel.
 * @param {string} screenId - The ID of the screen to navigate to.
 */
function navigateTo(screenId) {
  if (!menuOrder.includes(screenId)) return;

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
    loadLogData();
  }
}

/**
 * Formats total minutes into a human-readable string (e.g., "1 hr 30 min").
 * @param {number} totalMinutes - The total minutes to format.
 * @returns {string} - The formatted time string.
 */
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

/**
 * Loads data for the admin dashboard, including time entries, late employees, and early birds.
 */
function loadDashboardData() {
  fetch("/dashboard-data/")
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("total-time-in").textContent =
        data.today_entries.length;

      const timeOutCount = data.today_entries.filter(
        (entry) => entry.time_out
      ).length;
      document.getElementById("total-time-out").textContent = timeOutCount;

      document.getElementById("total-late-count").textContent = data.late_count;

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

      addTimeFormatToggleHandlers();
    })
    .catch((error) => {
      console.error("Error loading dashboard data:", error);
    });
}

/**
 * Adds click handlers to toggle between formatted time and raw minutes on dashboard tables.
 */
function addTimeFormatToggleHandlers() {
  document.querySelectorAll(".minutes").forEach((cell) => {
    cell.style.cursor = "pointer";
    cell.title = "Click to toggle format";

    cell.dataset.showingRawMinutes = "false";

    cell.addEventListener("click", function () {
      const minutes = this.dataset.minutes;
      const formatted = this.dataset.formatted;

      if (this.dataset.showingRawMinutes === "false") {
        this.textContent = `${minutes} mins`;
        this.dataset.showingRawMinutes = "true";
      } else {
        this.textContent = `${formatted}`;
        this.dataset.showingRawMinutes = "false";
      }
    });
  });
}

/**
 * Loads log data with filtering and pagination.
 * @param {boolean} filtered - Whether the data should be filtered.
 * @param {boolean} reset - Whether to reset pagination.
 */
function loadLogData(filtered = false, reset = false) {
  if (isLoadingLogs && !reset) return;

  if (reset || filtered) {
    logPage = 1;
    hasMoreLogs = true;
    document.getElementById("log_rectangle").innerHTML = "";
  }

  if (!hasMoreLogs) return;

  isLoadingLogs = true;

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
    if (dateRange && dateRange !== "all")
      params.append("date_range", dateRange);

    url += "&" + params.toString();
  }

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("log_rectangle");
      if (!container) return;

      let table = container.querySelector(".log-table");
      if (!table && data.logs && data.logs.length > 0) {
        table = document.createElement("table");
        table.className = "log-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Timestamp", "User", "Action", "Description", "IP Address"].forEach(
          (headerText) => {
            const th = document.createElement("th");
            th.textContent = headerText;
            headerRow.appendChild(th);
          }
        );
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        container.appendChild(table);
      }

      if (logPage === 1 && (!data.logs || data.logs.length === 0)) {
        container.innerHTML = "<p>No logs found.</p>";
        hasMoreLogs = false;
        isLoadingLogs = false;
        return;
      }

      if (data.logs && data.logs.length > 0) {
        const tbody = table.querySelector("tbody");
        data.logs.forEach((log) => {
          const row = document.createElement("tr");

          [
            log.timestamp,
            `${log.user} (${log.employee_id})`,
            log.action,
            log.description,
            log.ip_address || "Unknown",
          ].forEach((cellText) => {
            const cell = document.createElement("td");
            cell.textContent = cellText;
            row.appendChild(cell);
          });

          tbody.appendChild(row);
        });

        hasMoreLogs = data.logs.length === logsPerPage;

        logPage++;
      } else {
        hasMoreLogs = false;
      }

      loadingSpinner.classList.remove("visible");
      isLoadingLogs = false;
    })
    .catch((error) => {
      console.error("Error loading log data:", error);
      isLoadingLogs = false;
      const loadingSpinner = document.getElementById("log-loading-spinner");
      if (loadingSpinner) loadingSpinner.classList.remove("visible");
    });
}

/**
 * Applies filters to the log data.
 */
function filterLogs() {
  loadLogData(true, true);
}

/**
 * Keyboard Shortcut: Left Arrow (`←`) and Right Arrow (`→`) to navigate
 */
document.addEventListener("keydown", function (event) {
  let currentIndex = menuOrder.indexOf(currentScreen);

  if (event.key === "ArrowLeft" && currentIndex > 0) {
    navigateTo(menuOrder[currentIndex - 1]);
  } else if (
    event.key === "ArrowRight" &&
    currentIndex < menuOrder.length - 1
  ) {
    navigateTo(menuOrder[currentIndex + 1]);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  navigateTo("dashboard");

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

/**
 * Updates the attendance header text based on selected filters.
 */
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

  attendanceHeaderText = `${typeText} > ${companyText}`;
}

/**
 * Utility: Get CSRF token (if needed)
 * @param {string} name - The name of the cookie.
 * @returns {string|null} - The value of the cookie, or null if not found.
 */
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

document.addEventListener("DOMContentLoaded", fetchAnnouncements);

/**
 * Fetches announcements from the server and displays them in the announcement list.
 */
function fetchAnnouncements() {
  fetch("/announcements/")
    .then((response) => response.json())
    .then((data) => {
      const announcementList = document.getElementById("announcement-list");
      announcementList.innerHTML = "";

      data.forEach((announcement, index) => {
        const li = document.createElement("li");
        li.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9f9f9";
        li.className = "announcement-item";
        li.setAttribute("data-id", announcement.id);

        const fullText = announcement.content;
        const truncatedText =
          fullText.length > 60 ? fullText.substring(0, 60) + "..." : fullText;

        li.innerHTML = `
          <input type="checkbox" class="announcement-checkbox" data-id="${
            announcement.id
          }">
          <div class="announcement-content-wrapper">
            <span class="announcement-text" title="${fullText}" data-full-text="${fullText}" data-truncated-text="${truncatedText}">${truncatedText}</span>
            ${
              fullText.length > 60
                ? '<a href="#" class="read-more-link">[Read more]</a>'
                : ""
            }
          </div>
        `;

        li.addEventListener("click", function (e) {
          if (e.target.classList.contains("read-more-link")) {
            return;
          }

          const checkbox = this.querySelector(".announcement-checkbox");
          checkbox.checked = !checkbox.checked;

          if (checkbox.checked) {
            this.classList.add("selected");
          } else {
            this.classList.remove("selected");
          }
        });

        const checkbox = li.querySelector(".announcement-checkbox");
        checkbox.addEventListener("click", function (e) {
          e.stopPropagation();

          if (this.checked) {
            li.classList.add("selected");
          } else {
            li.classList.remove("selected");
          }
        });

        const readMoreLink = li.querySelector(".read-more-link");
        if (readMoreLink) {
          readMoreLink.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

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

        li.addEventListener("mouseenter", function () {
          this.style.backgroundColor = "#f0f0f0";
        });

        li.addEventListener("mouseleave", function () {
          this.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9f9f9";
          if (this.classList.contains("selected")) {
            this.style.backgroundColor = "#e3f2fd";
          }
        });

        announcementList.appendChild(li);
      });

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

/**
 * Saves a new announcement to the database.
 */
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
      fetchAnnouncements();
    })
    .catch((error) => {
      console.error("Error saving announcement:", error);
      alert("Error saving announcement.");
    });
}

/**
 * Deletes selected announcements from the database.
 */
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

/**
 * Posts selected announcements.
 */
function postAnnouncement() {
  const checkedItems = document.querySelectorAll(
    ".announcement-checkbox:checked"
  );
  if (checkedItems.length === 0) {
    alert("Please select an announcement to post.");
    return;
  }

  const postPromises = [];
  checkedItems.forEach((checkbox) => {
    const announcementId = checkbox.getAttribute("data-id");
    const promise = fetch(`/announcements/${announcementId}/post/`, {
      method: "POST",
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    }).then((res) => res.json());
    postPromises.push(promise);
  });

  Promise.all(postPromises)
    .then(() => {
      alert("Selected announcement(s) posted.");
    })
    .catch((error) => console.error("Error posting announcements:", error));
}

/**
 * Filters announcements based on the selected view option.
 */
function viewAnnouncements() {
  const viewOption = document.getElementById("post-options").value;
  const listItems = document.querySelectorAll("#announcement-list li");

  if (listItems.length === 0) {
    console.log("No saved announcements available.");
    return;
  }

  listItems.forEach((li) => {
    li.style.display = "none";
  });

  if (viewOption === "recent") {
    const lastItem = listItems[0];
    if (lastItem) {
      lastItem.style.display = "flex";
    }
  } else if (viewOption === "selected") {
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
    listItems.forEach((li) => {
      li.style.display = "flex";
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const dropdowns = document.querySelectorAll("select");

  dropdowns.forEach((select) => {
    select.addEventListener("change", function () {
      let options = this.options;
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          options[i].style.color = "black";
        } else {
          options[i].style.color = "gray";
        }
      }
    });
  });

  dropdowns.forEach((select) => {
    let options = select.options;
    for (let i = 0; i < options.length; i++) {
      options[i].style.color = "gray";
    }
    const selectedOption = select.querySelector("option:checked");
    if (selectedOption) {
      selectedOption.style.color = "black";
    }
  });
});

function superadmin_redirect() {
  window.location.href = "{% url 'superadmin_redirect' %}";
}

document.addEventListener("DOMContentLoaded", function () {
  const exportExcelButton = document.getElementById("export_excel_button");
  exportExcelButton.addEventListener("click", function () {
    document.getElementById("modal_export_excel").style.display = "block";
    showSingleDateSection();
  });

  document
    .getElementById("modal_export_close")
    .addEventListener("click", function () {
      document.getElementById("modal_export_excel").style.display = "none";
    });

  window.addEventListener("click", function (event) {
    const modal = document.getElementById("modal_export_excel");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  const optionSingleDate = document.getElementById("option_single_date");
  const optionDateRange = document.getElementById("option_date_range");

  optionSingleDate.addEventListener("click", showSingleDateSection);
  optionDateRange.addEventListener("click", showDateRangeSection);

  function showSingleDateSection() {
    optionSingleDate.classList.add("active");
    optionDateRange.classList.remove("active");
    document.getElementById("modal_export_by_date_section").style.display =
      "block";
    document.getElementById(
      "modal_export_by_date_range_section"
    ).style.display = "none";
  }

  function showDateRangeSection() {
    optionDateRange.classList.add("active");
    optionSingleDate.classList.remove("active");
    document.getElementById("modal_export_by_date_section").style.display =
      "none";
    document.getElementById(
      "modal_export_by_date_range_section"
    ).style.display = "block";
  }

  function attachRemoveListener(button) {
    button.addEventListener("click", function () {
      this.parentElement.remove();
    });
  }
  document.querySelectorAll(".remove_excluded_date").forEach((button) => {
    attachRemoveListener(button);
  });

  const addExcludedDateBtn = document.getElementById("add_excluded_date");
  if (addExcludedDateBtn) {
    addExcludedDateBtn.addEventListener("click", function () {
      const container = document.getElementById(
        "modal_excluded_dates_container"
      );
      const newInputDiv = document.createElement("div");
      newInputDiv.className = "excluded-date";
      newInputDiv.innerHTML = `
          <input type="date" class="modal_export_excluded_date">
          <button class="remove_excluded_date" type="button">&times;</button>
        `;
      container.appendChild(newInputDiv);
      attachRemoveListener(newInputDiv.querySelector(".remove_excluded_date"));
    });
  }

  const exportDateSubmit = document.getElementById("modal_export_date_submit");
  exportDateSubmit.addEventListener("click", function () {
    const dateValue = document.getElementById("modal_export_date").value;
    if (!dateValue) {
      alert("Please select a date.");
      return;
    }
    const employeeId = document
      .getElementById("modal_export_employee_id")
      .value.trim();
    let url = `/export_time_entries_by_date/?date=${encodeURIComponent(
      dateValue
    )}`;
    if (employeeId) {
      url += `&employee_id=${encodeURIComponent(employeeId)}`;
    }
    window.location.href = url;
  });

  const exportDateRangeSubmit = document.getElementById(
    "modal_export_date_range_submit"
  );
  exportDateRangeSubmit.addEventListener("click", function () {
    const startDate = document.getElementById("modal_export_date_start").value;
    const endDate = document.getElementById("modal_export_date_end").value;
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const excludedInputs = document.getElementsByClassName(
      "modal_export_excluded_date"
    );
    let excludedDates = [];
    for (let input of excludedInputs) {
      if (input.value) {
        excludedDates.push(input.value);
      }
    }

    const employeeId = document
      .getElementById("modal_export_employee_id")
      .value.trim();

    let url = `/export_time_entries_range/?date_start=${encodeURIComponent(
      startDate
    )}&date_end=${encodeURIComponent(endDate)}`;
    excludedDates.forEach((date) => {
      url += `&exclude_date=${encodeURIComponent(date)}`;
    });
    if (employeeId) {
      url += `&employee_id=${encodeURIComponent(employeeId)}`;
    }

    window.location.href = url;
  });
});

function loadPendingLeaves() {
  fetch("/leaves/pending/")
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("leave-approval_rectangle");

      if (!data.leaves || data.leaves.length === 0) {
        container.innerHTML = "<p>No pending leave requests</p>";
        return;
      }

      const table = document.createElement("table");
      table.classList.add("leave-table");

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
                    ${data.leaves
                      .map(
                        (leave) => `
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
                    `
                      )
                      .join("")}
                </tbody>
            `;

      container.innerHTML = "";
      container.appendChild(table);
    })
    .catch((error) => {
      console.error("Error loading leaves:", error);
    });
}

function processLeave(leaveId, action, rejectionReason = "") {
  const formData = new FormData();
  formData.append("leave_id", leaveId);
  formData.append("action", action);

  if (rejectionReason) {
    formData.append("rejection_reason", rejectionReason);
  }

  fetch("/leaves/process/", {
    method: "POST",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        loadPendingLeaves();
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch((error) => {
      console.error("Error processing leave:", error);
    });
}

function showRejectDialog(leaveId) {
  const reason = prompt("Please enter rejection reason:");
  if (reason !== null) {
    processLeave(leaveId, "reject", reason);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("leave-approval_rectangle")) {
    loadPendingLeaves();
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const logContainer = document.getElementById("log_rectangle");
  if (logContainer) {
    logContainer.addEventListener("scroll", function () {
      if (this.scrollHeight - this.scrollTop - this.clientHeight < 200) {
        loadLogData(false, false);
      }
    });
  }
});

function filterAttendance(reset = false) {
  if (reset) {
    attendancePage = 1;
    hasMoreAttendance = true;
    document.getElementById("attendance_rectangle").innerHTML = "";
  }

  if (isLoadingAttendance || !hasMoreAttendance) return;

  isLoadingAttendance = true;

  let loadingSpinner = document.getElementById("attendance-loading-spinner");
  if (!loadingSpinner) {
    loadingSpinner = document.createElement("div");
    loadingSpinner.id = "attendance-loading-spinner";
    loadingSpinner.className = "loading-spinner";
    loadingSpinner.innerHTML = "Loading more data...";
    document.getElementById("attendance_rectangle").appendChild(loadingSpinner);
  }
  loadingSpinner.classList.add("visible");

  const typeElem = document.getElementById("attendance-type");
  const companyElem = document.getElementById("attendance-company");
  const departmentElem = document.getElementById("attendance-department");
  const searchElem = document.getElementById("attendance-search");

  if (!typeElem || !companyElem || !departmentElem || !searchElem) {
    console.error("One or more filter elements not found.");
    return;
  }

  const params = new URLSearchParams({
    attendance_type: typeElem.value,
    attendance_company: companyElem.value,
    attendance_department: departmentElem.value,
    search: searchElem.value,
    page: attendancePage,
    limit: attendancePerPage,
  });

  fetch(`/attendance_list_json/?${params}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not OK");
      }
      return response.json();
    })
    .then((data) => {
      const container = document.getElementById("attendance_rectangle");
      if (!container) {
        console.error("Container with ID 'attendance_rectangle' not found.");
        return;
      }

      let table = container.querySelector("table");

      if (!table && data.attendance_list && data.attendance_list.length > 0) {
        table = document.createElement("table");
        table.classList.add("attendance-table");

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        let headers = [];

        if (data.attendance_type === "time-log") {
          headers = [
            "Employee ID",
            "Name",
            "Time In",
            "Time Out",
            "Hours Worked",
          ];
        } else {
          headers = ["Employee ID", "Name"];
        }

        headers.forEach((headerText) => {
          const th = document.createElement("th");
          th.textContent = headerText;
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        container.appendChild(table);
      }

      if (
        attendancePage === 1 &&
        (!data.attendance_list || data.attendance_list.length === 0)
      ) {
        container.innerHTML = "<p>No records found.</p>";
        isLoadingAttendance = false;
        hasMoreAttendance = false;
        loadingSpinner.classList.remove("visible");
        return;
      }

      if (data.attendance_list && data.attendance_list.length > 0) {
        const tbody = table.querySelector("tbody");

        data.attendance_list.forEach((item) => {
          const row = document.createElement("tr");

          if (data.attendance_type === "time-log") {
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
            const cellEmployee = document.createElement("td");
            cellEmployee.textContent = item.employee_id;
            row.appendChild(cellEmployee);

            const cellName = document.createElement("td");
            cellName.textContent = item.name;
            row.appendChild(cellName);
          }

          tbody.appendChild(row);
        });

        hasMoreAttendance = data.attendance_list.length === attendancePerPage;
        attendancePage++;
      } else {
        hasMoreAttendance = false;
      }

      loadingSpinner.classList.remove("visible");
      isLoadingAttendance = false;
    })
    .catch((error) => {
      console.error("Error fetching attendance data:", error);
      isLoadingAttendance = false;
      loadingSpinner.classList.remove("visible");
    });
}

document.addEventListener("DOMContentLoaded", function () {
  const attendanceContainer = document.getElementById("attendance_rectangle");
  if (attendanceContainer) {
    attendanceContainer.addEventListener("scroll", function () {
      if (this.scrollHeight - this.scrollTop - this.clientHeight < 200) {
        filterAttendance(false);
      }
    });
  }

  const filterElements = document.querySelectorAll(
    "#attendance-type, #attendance-company, #attendance-department, #attendance-search"
  );

  filterElements.forEach((element) => {
    element.addEventListener("change", () => {
      filterAttendance(true);
    });
  });
});
