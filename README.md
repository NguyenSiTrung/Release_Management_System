# NMT Release Management System v1.0.0

## Overview
The NMT (Neural Machine Translation) Release Management System is a comprehensive web application designed to manage the lifecycle of machine translation models. It allows teams to track model versions, training results, release notes, and performance metrics across different language pairs.

## Documentation

- [Installation Guide](INSTALLATION.md) - Detailed setup instructions
- [Quick Start Guide](QUICKSTART.md) - Get up and running quickly
- [Developer Guide](DEVELOPER_GUIDE.md) - Technical details for developers

## Features

### Model Management
- **Language Pairs**: Manage source and target language pairs (e.g., English → Thai)
- **Model Versions**: Create and track different versions of translation models
- **Training Results**: Record BLEU and COMET scores with comparisons between base and fine-tuned models
- **Release Notes**: Document changes and improvements for each model version

### Data Visualization
- Visualize performance metrics across model versions
- Compare scores between different testsets and language pairs
- Track progress and improvements over time

### User Management
- Role-based access control (Admin, Release Manager, Member)
- User approval workflow for higher-privilege accounts
- Secure authentication with JWT tokens

### Export Functionality
- Export model version data in Excel or Markdown formats
- Comprehensive export including training results and performance metrics

## Quick Start

To quickly start both the backend and frontend services:

```bash
# Make the script executable (first time only)
chmod +x run.sh

# Run both services
./run.sh
```

The frontend will be available at http://localhost:3000 and the backend API at http://localhost:8000.

## Tech Stack

### Backend
- FastAPI (Python)
- SQLite database
- JWT authentication
- Pydantic for data validation

### Frontend
- React with TypeScript
- Material-UI components
- Formik and Yup for form validation
- React Router for navigation

## Project Structure
```
/backend
  /app
    /api          - API endpoints
    /core         - Core functionality (auth, config)
    /crud         - Database operations
    /db           - Database models and session management
    /schemas      - Pydantic schemas for validation
  requirements.txt - Python dependencies

/frontend
  /public         - Static assets
  /src
    /components   - React components
    /contexts     - Context providers (auth)
    /pages        - Page components
    /services     - API services
    /types        - TypeScript type definitions
  package.json    - NPM dependencies
```

## User Roles

- **Admin**: Full system access, user management, data export
- **Release Manager**: Create/edit models, add training results and release notes
- **Member**: View-only access to model data and visualizations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author
- trungns_ares

## License
This project is licensed under the MIT License 