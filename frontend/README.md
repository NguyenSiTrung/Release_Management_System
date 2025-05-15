# NMT Release Management Frontend

This is the frontend application for the NMT Release Management system, which helps manage, track, and visualize the results of NMT model training across different language pairs.

## Features

- Authentication and role-based access control
- Dashboard with overview of model status
- Management of language pairs
- Model version tracking
- Training results recording and visualization
- Release notes management
- User management (admin only)

## Technology Stack

- React
- TypeScript
- Material-UI
- React Router
- Formik & Yup for form validation
- Axios for API requests
- Recharts for data visualization

## Getting Started

### Prerequisites

- Node.js (v14 or later recommended)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```
   cd frontend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm start
   ```

The application will be available at http://localhost:3000

## Development

The frontend is designed to work with the backend API running at http://localhost:8000. If your backend is running at a different URL, you can update the `baseURL` in `src/services/api.ts`.

## Project Structure

- `src/components`: Reusable UI components
- `src/contexts`: React context providers (e.g., auth)
- `src/pages`: Page-level components for each route
- `src/services`: API service functions
- `src/types`: TypeScript type definitions
- `src/utils`: Utility functions

## Building for Production

To build the application for production:

```
npm run build
```

This creates a `build` folder with optimized, minified production code.
