function toggleTimeFormat(element) {
    const currentText = element.innerText;
    const formattedText = element.getAttribute('data-formatted');
    const rawText = element.getAttribute('data-raw');

    // Toggle between formatted and raw display
    if (currentText === formattedText) {
        element.innerText = rawText;
    } else {
        element.innerText = formattedText;
    }
}

// Initialize after page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Time format toggle initialized");
});