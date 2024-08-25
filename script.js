const API_KEY = 'AIzaSyDfGOC10awrLoJJZnDxexGNqEp5Tac7Eyk';
const SHEET_ID = '1DQxmGwWePpeKlU8nQ-IW9R1C4d_vR2Gn6utKtdC653s';
const SHEET_NAME = 'science_lab';
const ADMIN_SHEET_NAME = 'admin';
const HISTORY_SHEET_NAME = 'history';
const Deployment_ID = 'AKfycbxZCPP8V3vbJYIbDqLJaWcTm6EYNlxJT1O5DLFJ5lmX0K0Rwdn5dUPHFfvzSAs26xOE';
const SHEET_URL = `https://script.google.com/macros/s/${Deployment_ID}/exec`;

const roomBookings = [
    { room: 'Science Lab', bookings: [] },
];

let bookedIctLabs = [];
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    setMinDate();
    renderBookingTable();
    loadSheetData();
    checkAdmin();
    cleanUpOldBookings();  // Automatically clean up old bookings on page load
});

function loadSheetData() {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            console.log('Fetched data:', data);
            const rows = data.values;
            if (rows && rows.length > 1) {
                bookedIctLabs = []; // Clear old data
                rows.slice(1).forEach(row => { // Skip header row
                    const [name, room, date, period] = row;
                    if (name && room && date && period) {
                        bookedIctLabs.push({ name, room, date: formatDate(date), period });
                    }
                });
                console.log('Booked ICT Labs:', bookedIctLabs);
                renderBookedTable();
                renderBookingTable(); // Update availability after loading data
            }
        })
        .catch(error => {
            console.error('Error loading data from the sheet:', error);
        });
}

function checkAdmin() {
    const urlParams = new URLSearchParams(window.location.search);
    const userName = urlParams.get('user_name');
    const pass = urlParams.get('pass');

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${ADMIN_SHEET_NAME}?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            const rows = data.values;
            if (rows && rows.length > 1) {
                rows.slice(1).forEach(row => { // Skip header row
                    const [number, adminUserName, adminPass] = row;
                    if (adminUserName === userName && adminPass === pass) {
                        isAdmin = true;
                    }
                });
                renderBookedTable();
            }
        })
        .catch(error => {
            console.error('Error checking admin credentials:', error);
        });
}

function setMinDate() {
    const dateInput = document.getElementById('date');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    dateInput.setAttribute('min', today);
}

function saveToSheet(name, room, date, period, action, sheetName = SHEET_NAME) {
    const data = new URLSearchParams();
    data.append('name', name);
    data.append('room', room);
    data.append('date', date);
    data.append('period', period);
    data.append('status', action);
    data.append('sheet', sheetName);

    fetch(SHEET_URL, {
        method: 'POST',
        body: data
    }).then(response => response.json())
      .then(result => {
          console.log(`Data saved to ${sheetName}:`, result);
          if (action === 'active' && sheetName === SHEET_NAME) {
              showNotification(`The Science Lab has been successfully booked for ${getDayOfWeek(date)}, Period(s): ${period}.`);
              sendEmailNotification(name, room, date, period);
          }
      }).catch(error => {
          console.error('Error saving data to sheet:', error);
      });
}

function showNotification(message) {
    const notificationDiv = document.getElementById('notification');
    notificationDiv.innerHTML = message;
    notificationDiv.style.display = 'block';
    notificationDiv.style.color = 'green';
    notificationDiv.style.fontWeight = 'bold';
    notificationDiv.style.fontSize = '1em';
    notificationDiv.style.marginTop = '15px';
    notificationDiv.style.textAlign = 'center';

    // Optionally, hide the notification after a few seconds
    setTimeout(() => {
        notificationDiv.style.display = 'none';
    }, 5000); // Hide after 5 seconds
}

function sendEmailNotification(name, room, date, period) {
    const dayOfWeek = getDayOfWeek(date);

    const emailParams = {
        to_name: name,
        room: room,
        day: dayOfWeek,
        date: formatDate(date),
        period: period
    };

    emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', emailParams)
        .then(response => {
            console.log('Email sent successfully!', response.status, response.text);
        }, error => {
            console.error('Failed to send email:', error);
        });
}

function removeFromSheet(name, room, date, period) {
    // Get the row index of the booking in the sheet
    const rowIndex = bookedIctLabs.findIndex(b => b.name === name && b.room === room && b.date === date && b.period === period);
    if (rowIndex > -1) {
        bookedIctLabs.splice(rowIndex, 1); // Remove from in-memory array
        const rowNumber = rowIndex + 2; // Account for the header row
        deleteRowFromSheet(rowNumber); // Delete the row from the Google Sheet
    }
}

function deleteRowFromSheet(rowNumber) {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: SHEET_NAME, // Update this with the sheetId for your "science_lab" sheet
                            dimension: "ROWS",
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber
                        }
                    }
                }
            ]
        })
    }).then(response => response.json())
      .then(result => {
          console.log(`Row ${rowNumber} deleted successfully:`, result);
      }).catch(error => {
          console.error(`Error deleting row ${rowNumber}:`, error);
      });
}

function renderBookingTable() {
    const bookingTable = document.getElementById('bookingTable');
    bookingTable.innerHTML = '';

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    roomBookings.forEach(room => {
        const row = document.createElement('tr');
        const roomCell = document.createElement('td');
        roomCell.textContent = room.room;
        row.appendChild(roomCell);

        daysOfWeek.forEach(day => {
            const dayCell = document.createElement('td');
            const bookings = bookedIctLabs.filter(booking => booking.room === room.room && getDayOfWeek(booking.date) === day);
            if (bookings.length === 0) {
                dayCell.textContent = 'Available';
            } else {
                dayCell.innerHTML = `Booked<br>Periods: ${bookings.map(b => b.period).join(', ')}`;
            }
            row.appendChild(dayCell);
        });

        bookingTable.appendChild(row);
    });
}

function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
}

function bookIctLab(room, date, period, name) {
    const formattedDate = formatDate(date);

    if (bookedIctLabs.some(booking => booking.room === room && booking.date === formattedDate && booking.period === period)) {
        alert(`${room} is not available for the selected day and period.`);
        return;
    }

    bookedIctLabs.push({ room, date: formattedDate, period, name });
    renderBookingTable();
    renderBookedTable();
    saveToSheet(name, room, formattedDate, period, 'active');
}

function getDayOfWeek(date) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(date);
    return daysOfWeek[d.getDay()];
}

function renderBookedTable() {
    const bookedTable = document.getElementById('bookedTable').getElementsByTagName('tbody')[0];
    bookedTable.innerHTML = '';

    bookedIctLabs.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.name}</td>
            <td>${booking.room}</td>
            <td>${booking.date}</td>
            <td>${booking.period}</td>
            <td>
                <button class="cancelButton ${isAdmin ? '' : 'disabled'}" onclick="cancelBooking('${booking.name}', '${booking.room}', '${booking.date}', '${booking.period}')">
                    Cancel
                </button>
            </td>
        `;
        bookedTable.appendChild(row);
    });

    const cancelButtons = bookedTable.getElementsByClassName('cancelButton');
    for (let button of cancelButtons) {
        if (!isAdmin) {
            button.disabled = true;
            button.title = 'You do not have permission to cancel this booking';
        }
    }
}

function cleanUpOldBookings() {
    const now = new Date();

    // Define the end time for each period based on the image you provided
    const periodEndTimes = {
        1: "08:30",
        2: "09:05",
        3: "09:40",
        4: "10:30",
        5: "11:05",
        6: "13:25",
        7: "14:00",
        8: "14:50",
        9: "15:25"
    };

    bookedIctLabs.forEach(booking => {
        const bookingDate = new Date(booking.date);

        // Assuming periods are in the format "1-2", "3-4", etc., split and parse to check the period
        const periods = booking.period.split('-').map(Number);
        const bookingEndPeriod = periods[1]; // End period

        // Get the end time string for the booking period
        const bookingEndTimeString = periodEndTimes[bookingEndPeriod];

        // Create a full date-time object for the end of the booking period
        const [endHour, endMinute] = bookingEndTimeString.split(':').map(Number);
        const bookingEndTime = new Date(bookingDate);
        bookingEndTime.setHours(endHour, endMinute, 0);

        // If the booking end time is before now, move it to history
        if (bookingEndTime < now) {
            saveToSheet(booking.name, booking.room, booking.date, booking.period, 'active', HISTORY_SHEET_NAME);
            removeFromSheet(booking.name, booking.room, booking.date, booking.period);
        }
    });

    // Clean up the in-memory array by removing past bookings
    bookedIctLabs = bookedIctLabs.filter(booking => {
        const bookingDate = new Date(booking.date);
        const periods = booking.period.split('-').map(Number);
        const bookingEndPeriod = periods[1];
        const bookingEndTimeString = periodEndTimes[bookingEndPeriod];
        const [endHour, endMinute] = bookingEndTimeString.split(':').map(Number);
        const bookingEndTime = new Date(bookingDate);
        bookingEndTime.setHours(endHour, endMinute, 0);
        return bookingEndTime >= now;
    });

    renderBookingTable();
    renderBookedTable();
}

document.getElementById('bookingForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const date = document.getElementById('date').value;
    const period = document.getElementById('period').value;

    // Validate form data
    if (!name || !date || !period) {
        alert('Please fill in all fields.');
        return;
    }

    bookIctLab('Science Lab', date, period, name);
});
