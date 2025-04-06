
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const upload = multer({ dest: 'uploads/' });
const { distributors } = require('./db.js');

app.use(cors());
app.use(express.static('.'));
app.use(express.json());

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const distributor = distributors[username];
  
  if (distributor && distributor.password === password) {
    res.json({ 
      success: true, 
      name: distributor.name,
      area: distributor.area
    });
  } else {
    res.json({ success: false });
  }
});

// Add authentication middleware
const authenticate = (req, res, next) => {
  const username = req.headers['x-user'];
  if (distributors[username]) {
    req.distributor = distributors[username];
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Filter data based on user role and area
const filterDataForUser = (data, user) => {
  if (user.role === 'admin') return data;
  return data.filter(row => row.LCO_Name === user.name || row['LCO Name'] === user.name);
};

app.post('/upload', upload.single('file'), authenticate, (req, res) => {
  try {
    const user = distributors[req.headers['x-user']];
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get all data including headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty or invalid' });
    }

    // Get headers from first row
    const headers = rawData[0];
    const requiredColumns = ['Sr No', 'Date', 'Name', 'Area', 'LCO Name', 'Box No', 'User Id', 'Plan', 'Amount'];
    
    // Check for missing columns
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid Excel format', 
        message: `Missing columns: ${missingColumns.join(', ')}`
      });
    }

    // Convert data rows to objects using headers
    const data = rawData.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    
    // Clean and validate data
    const cleanedData = data.map(row => {
      const cleanRow = {};
      requiredColumns.forEach(col => {
        cleanRow[col] = row[col] || '';
      });
      return cleanRow;
    });

    // Validate that data exists
    if (cleanedData.length === 0) {
      return res.status(400).json({
        error: 'Empty data',
        message: 'The Excel file contains no data rows'
      });
    }
    
    // Map data according to headers
    const filteredData = filterDataForUser(cleanedData, req.distributor);
    
    const fs = require('fs');
    const path = require('path');
    
    // Create customers directory if it doesn't exist
    const customersDir = path.join(__dirname, 'customers');
    if (!fs.existsSync(customersDir)) {
      fs.mkdirSync(customersDir);
    }

    // Create folder for each customer
    filteredData.forEach(customer => {
      const customerName = customer.Name.replace(/[^a-zA-Z0-9]/g, '_');
      const customerDir = path.join(customersDir, customerName);
      if (!fs.existsSync(customerDir)) {
        fs.mkdirSync(customerDir);
        // Create a JSON file with customer details
        fs.writeFileSync(
          path.join(customerDir, 'details.json'),
          JSON.stringify(customer, null, 2)
        );
      }
    });
    res.json(filteredData);
  } catch (error) {
    console.error('Error processing Excel file:', error);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});
