/**
 * Toggles the display format of time between formatted and raw values.
 * @param {HTMLElement} element - The HTML element whose text content needs to be toggled.
 */
function toggleTimeFormat(element) {
    const currentText = element.innerText;
    const formattedText = element.getAttribute('data-formatted');
    const rawText = element.getAttribute('data-raw');

    if (currentText === formattedText) {
        element.innerText = rawText;
    } else {
        element.innerText = formattedText;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("Time format toggle initialized");
});