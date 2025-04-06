
let globalData = {};
let isAuthenticated = false;

// Check authentication
window.addEventListener('load', () => {
  if (!isAuthenticated) {
    document.getElementById('loginModal').style.display = 'block';
  }
});

// Login handling
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  // Simple authentication (replace with proper authentication)
  fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      isAuthenticated = true;
      localStorage.setItem('currentUser', username);
      localStorage.setItem('userRole', data.role);
      document.getElementById('loginModal').style.display = 'none';
      document.querySelector('.user-info').textContent = `Logged in as: ${data.name} (${data.area}) - ${data.role.toUpperCase()}`;
      
      // Hide admin-only elements for distributors
      if (data.role !== 'admin') {
        document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = 'none');
      }
    } else {
      alert('Invalid credentials');
    }
  });
});

document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    button.classList.add('active');
    const pageId = button.getAttribute('data-page');
    document.getElementById(pageId).classList.add('active');
  });
});

const columnHeaders = {
  'customers': ['Sr No', 'Date', 'Name', 'Area', 'LCO Name', 'Box No', 'User Id', 'Plan', 'Amount'],
  'monthly-share': ['Sr No', 'Date', 'LCO Name', 'Total Connections', 'Amount Per Connection', 'Total Amount'],
  'payments': ['Sr No', 'Date', 'LCO Name', 'Amount', 'Payment Mode', 'Reference No'],
  'monthly-report': ['Sr No', 'Date', 'Total Connections', 'Amount Per Connection', 'Total Collection'],
  'payment-report': ['Sr No', 'Date', 'LCO Name', 'Previous Balance', 'Current Month', 'Total', 'Received Amount', 'Balance'],
  'lco-report': ['Sr No', 'Date', 'LCO Name', 'Total Connections', 'Amount', 'Received Amount', 'Balance']
};

document.querySelectorAll('.excel-file').forEach(input => {
  input.addEventListener('change', function() {
    const uploadBtn = this.nextElementSibling;
    uploadBtn.style.display = 'inline-block';
  });
});

document.querySelectorAll(".upload-btn").forEach((btn, index) => {
  btn.addEventListener("click", () => {
    if (!isAuthenticated) {
      alert('Please login first');
      return;
    }

    const fileInput = document.querySelectorAll(".excel-file")[index];
    const file = fileInput.files[0];

    if (!file) {
      alert("Please select a file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      let html = "<table border='1' cellpadding='5'><thead><tr>";
      jsonData[0].forEach(header => {
        html += `<th>${header}</th>`;
      });
      html += "</tr></thead><tbody>";

      for (let i = 1; i < jsonData.length; i++) {
        html += "<tr>";
        jsonData[i].forEach(cell => {
          html += `<td>${cell}</td>`;
        });
        html += "</tr>";
      }

      html += "</tbody></table>";

      document.querySelectorAll(".output")[index].innerHTML = html;
    };
    reader.readAsArrayBuffer(file);
  });
});

document.querySelectorAll('.search').forEach(input => {
  input.addEventListener('input', function() {
    const pageElement = this.closest('.page');
    const pageId = pageElement.id;
    const searchTerm = this.value.toLowerCase();
    
    if (!globalData[pageId]) return;
    
    const filteredData = globalData[pageId].filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm)
      )
    );
    updateTable(filteredData, pageElement, pageId);
  });
});

function updateFilterOptions(headers, pageElement) {
  const select = pageElement.querySelector('.filter');
  select.innerHTML = '<option value="">All Columns</option>';
  headers.forEach(header => {
    select.innerHTML += `<option value="${header}">${header}</option>`;
  });
}

function updateTable(data, pageElement, pageId) {
  const outputDiv = pageElement.querySelector('.output');
  const headers = columnHeaders[pageId];
  
  let html = '<table><thead><tr>';
  headers.forEach(header => {
    html += `<th>${header}</th>`;
  });
  html += '<th>Actions</th></tr></thead><tbody>';

  if (data.length === 0) {
    html += `<tr><td colspan="${headers.length + 1}">No data to display</td></tr>`;
  } else {
    data.forEach((row, index) => {
      html += '<tr>';
      headers.forEach(header => {
        html += `<td>${row[header] || ''}</td>`;
      });
      html += `<td><button class="view-details-btn" onclick="showDetails(${index}, '${pageId}')">
        <i class="fas fa-eye"></i> View
      </button></td>`;
      html += '</tr>';
    });
  }

  html += '</tbody></table>';
  outputDiv.innerHTML = html;
}

function showDetails(index, pageId) {
  const data = globalData[pageId][index];
  const modal = document.getElementById('customerModal');
  const detailsDiv = document.getElementById('customerDetails');
  const customerName = data.Name.replace(/[^a-zA-Z0-9]/g, '_');
  
  let html = '<table>';
  for (const [key, value] of Object.entries(data)) {
    html += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
  }
  html += '</table>';
  
  detailsDiv.innerHTML = html;
  modal.style.display = 'block';
}

// Close modal
document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('customerModal').style.display = 'none';
});

// Export functions
document.getElementById('exportPdf').addEventListener('click', () => {
  // Add PDF export functionality
  alert('PDF export feature coming soon');
});

document.getElementById('exportExcel').addEventListener('click', () => {
  // Add Excel export functionality
  alert('Excel export feature coming soon');
});

window.onclick = (event) => {
  const modal = document.getElementById('customerModal');
  if (event.target == modal) {
    modal.style.display = 'none';
  }
};
