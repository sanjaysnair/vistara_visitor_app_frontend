# Frontend - Apartment Visitor Security System

React-based frontend for visitor check-in with camera capture.

## Files

- `visitor-checkin.html` - Standalone HTML check-in form (can be used as static asset)
- `App.js` - React application entry point
- `App.css` - Styling

## Setup

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm start
```

### Build for Production

```bash
npm run build
```

## Features

- Visitor information form
- Camera capture for photo
- Real-time form validation
- Email notifications to flat owners

## Integration with Backend

The frontend communicates with the backend API at:

```
http://localhost:8000/api/visitors
```

Make sure the backend is running before using the frontend.

## Standalone HTML

The `visitor-checkin.html` file can be served directly from the backend as a static file or used independently.
# vistara_visitor_app_frontend
