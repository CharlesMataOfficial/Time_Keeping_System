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
  }
}

// Add this function to load dashboard data
function loadDashboardData() {
  fetch("/dashboard-data/")
    .then((response) => response.json())
    .then((data) => {
      // Update total time in and time out counts
      document.getElementById("total-time-in").textContent = data.today_entries.length;
      const timeOutCount = data.today_entries.filter(entry => entry.time_out).length;
      document.getElementById("total-time-out").textContent = timeOutCount;

      // Update late employees count
      const lateCountElement = document.querySelector(".total-late-employees");
      if (lateCountElement) {
        lateCountElement.innerHTML = `
          <h2>Total Number of Late Employees:</h2>
          <p id="total-late-count">${data.late_count}</p>
        `;
      }

      // Display late employees
      const lateEmployeesList = document.querySelector(".late-employees-list");
      lateEmployeesList.innerHTML = "";

      if (data.top_late.length === 0) {
        lateEmployeesList.innerHTML = "<p>No late employees today</p>";
      } else {
        data.top_late.forEach((employee) => {
          // Use the minutes_diff value from the server
          const minutesLate = Math.abs(Math.round(employee.minutes_diff || 0));
          lateEmployeesList.innerHTML += `<p>${employee.name}: ${minutesLate} mins late</p>`;
        });
      }

      // Display early birds
      const earlyBirdsList = document.querySelector(".early-birds-list");
      earlyBirdsList.innerHTML = "";

      if (data.top_early.length === 0) {
        earlyBirdsList.innerHTML = "<p>No early birds today</p>";
      } else {
        data.top_early.forEach((employee) => {
          // For early birds, the minutes_diff will be negative or 0
          // Take absolute value to show as "minutes early"
          const minutesEarly = Math.abs(Math.round(employee.minutes_diff || 0));
          earlyBirdsList.innerHTML += `<p>${employee.name}: ${minutesEarly} mins early</p>`;
        });
      }
    })
    .catch((error) => {
      console.error("Error loading dashboard data:", error);
    });
}

// Mouse Click - Left Arrow (`<`) Button
document.getElementById("left-arrow")?.addEventListener("click", function () {
  let currentIndex = menuOrder.indexOf(currentScreen);
  if (currentIndex > 0) {
    navigateTo(menuOrder[currentIndex - 1]);
  }
});

// Mouse Click - Right Arrow (`>`) Button
document.getElementById("right-arrow")?.addEventListener("click", function () {
  let currentIndex = menuOrder.indexOf(currentScreen);
  if (currentIndex < menuOrder.length - 1) {
    navigateTo(menuOrder[currentIndex + 1]);
  }
});

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

// Update the company select value to use alias when available
document.getElementById("attendance-company").addEventListener("change", function () {
  let selectedOption = this.options[this.selectedIndex];
  let alias = selectedOption.getAttribute("data-alias");
  if (alias) {
    this.value = alias; // This sends the alias to the backend.
  }
});
// CONVERT TO CSS

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