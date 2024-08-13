const API_KEY = 'AIzaSyDfGOC10awrLoJJZnDxexGNqEp5Tac7Eyk';
const SHEET_ID = '1DQxmGwWePpeKlU8nQ-IW9R1C4d_vR2Gn6utKtdC653s';
const SHEET_NAME = 'science_lab';
const ADMIN_SHEET_NAME = 'admin';
const Deployment_ID = 'AKfycbzaDG--hTFVdkR3vSJYmSjwLjKyCVqM4yJKnfYxPBzBKbEf3Jz7U4ocxCxISKg2xORq';
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

function saveToSheet(name, room, date, period, action) {
    const data = new URLSearchParams();
    data.append('name', name);
    data.append('room', room);
    data.append('date', date);
    data.append('period', period);
    data.append('status', action);

    fetch(SHEET_URL, {
        method: 'POST',
        body: data
    }).then(response => response.json())
      .then(result => {
          console.log('Data saved to sheet:', result);
          if (action === 'active') {
              alert('The Science Lab has been successfully booked!');
          }
      }).catch(error => {
          console.error('Error saving data to sheet:', error);
      });
}

function removeFromSheet(name, room, date, period) {
    saveToSheet(name, room, date, period, 'remove');
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

function cancelBooking(name, room, date, period) {
    if (!isAdmin) {
        alert('You do not have permission to cancel this booking.');
        return;
    }

    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    bookedIctLabs = bookedIctLabs.filter(b => !(b.room === room && b.date === date && b.period === period && b.name === name));

    renderBookingTable();
    renderBookedTable();
    removeFromSheet(name, room, date, period);
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
