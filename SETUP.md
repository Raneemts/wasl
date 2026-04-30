# 🚀 Quick Start Guide - Wasl Platform

## Prerequisites
- Python 3.8+ 
- Node.js 16+
- MySQL 8.0+

## Step 1: Setup Database 🗄️

```bash
# Open MySQL
mysql -u root -p

# Run the database script
source back-end/db.ql
```

Or directly:
```bash
mysql -u root -p wasl_db < back-end/db.ql
```

## Step 2: Setup Backend 🔧

```bash
cd back-end

# Install dependencies
pip install -r requirements.txt

# Create .env file (already created)
# Edit .env with your database credentials if needed

# Run the server
python app.py
```

Server will be on: **http://localhost:5000**

### Available Endpoints:
- `GET /health` - Health check
- `GET /stats` - Platform statistics
- `GET /requests` - Get blood requests
- `POST /requests` - Create new request
- `GET /donors` - Find donors
- `POST /donors` - Register donor
- And more...

## Step 3: Setup Frontend 🎨

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be on: **http://localhost:5173**

## Testing the App 🧪

### 1. Create a Blood Request
```bash
curl -X POST http://localhost:5000/requests \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "محمد العتيبي",
    "hospital": "مستشفى الملك فهد",
    "city": "الرياض",
    "blood_type": "+A",
    "bags_needed": 4
  }'
```

### 2. Add a Donor
```bash
curl -X POST http://localhost:5000/donors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد علي",
    "phone": "0501234567",
    "city": "الرياض",
    "blood_type": "+A"
  }'
```

### 3. Get Active Requests
```bash
curl http://localhost:5000/requests?status=open
```

## Project Structure

```
wasl/
├── back-end/
│   ├── app.py              # Flask API server
│   ├── db.ql              # Database schema
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Environment variables
│   └── __pycache__/       # Python cache
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main component
│   │   ├── App.css        # Minimalist styles
│   │   ├── api.js         # API utilities
│   │   ├── utils.js       # Helper functions
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── public/            # Static files
│   ├── package.json       # Dependencies
│   ├── vite.config.js     # Vite configuration
│   └── node_modules/      # Installed packages
│
├── Stage1/
├── Stage 2/
├── Stage3/
├── Stage4/
├── IMPROVEMENTS.md        # Summary of changes
├── SETUP.md              # This file
└── README.md             # Project overview
```

## Common Issues & Solutions

### Issue: MySQL Connection Error
```
Solution: Check .env file database credentials
- DB_HOST: localhost
- DB_USER: root
- DB_PASS: your_password
- DB_NAME: wasl_db
```

### Issue: Port Already in Use
```bash
# Backend (change port)
python app.py --port 5001

# Frontend (change port)
npm run dev -- --port 5174
```

### Issue: Module Not Found
```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### Issue: CORS Error
```
The backend already has CORS enabled.
Make sure backend is running on http://localhost:5000
```

## Features 🌟

✅ **Roles:**
- Donor (متبرع)
- Patient Family (قريب مريض)
- Hospital (مستشفى)

✅ **Core Functions:**
- Search and filter blood requests
- Register as donor
- Create blood requests
- View donation history
- Hospital dashboard
- Points/rewards system

✅ **Design:**
- Minimalist and compact
- Full Arabic (RTL) support
- Mobile-responsive
- Fast and lightweight

## Development Tips 💡

### Hot Reload
- Frontend: Vite automatically reloads on changes
- Backend: Use `FLASK_DEBUG=True` in .env

### Database Changes
If you modify db.ql, recreate the database:
```bash
mysql -u root -p
DROP DATABASE wasl_db;
source back-end/db.ql
```

### API Testing
Use Postman or curl to test endpoints:
```bash
# Get all donors
curl http://localhost:5000/donors

# Get requests with filter
curl "http://localhost:5000/requests?blood_type=+A&city=الرياض"
```

## Deployment 🌐

### Docker (Future)
```bash
# Build containers
docker-compose build

# Run
docker-compose up
```

### Cloud (Future)
- Frontend: Vercel, Netlify
- Backend: Heroku, AWS, DigitalOcean
- Database: AWS RDS, Linode

## Support 📞

For issues or questions, check:
1. IMPROVEMENTS.md - What's been changed
2. Back-end/app.py - API documentation
3. GitHub Issues (if applicable)

Happy coding! 🎉
