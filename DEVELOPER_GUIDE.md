# Developer Guide

This guide provides information for developers working on the NMT Release Management System, including architecture details and recent changes.

## Architecture Overview

### Backend (FastAPI)

The backend follows a layered architecture:

1. **API Layer** (`app/api/v1/endpoints`):
   - REST API endpoints organized by resource
   - Route handlers for HTTP requests
   - Authentication and permission checks

2. **CRUD Layer** (`app/crud`):
   - Database operations for each model
   - Implements Create, Read, Update, Delete operations
   - Handles transaction management

3. **Schema Layer** (`app/schemas`):
   - Pydantic schemas for request/response validation
   - Defines data structures and validation rules
   - Handles data conversion and serialization

4. **Model Layer** (`app/db/models.py`):
   - SQLAlchemy ORM models
   - Defines database tables and relationships
   - Manages constraints and indices

5. **Core Services** (`app/core`):
   - Configuration management
   - Authentication and security
   - Dependency injection

### Frontend (React + TypeScript)

The frontend follows a component-based architecture:

1. **Pages** (`src/pages`):
   - Top-level page components
   - Handle routing and main layout
   - Integrate smaller components

2. **Components** (`src/components`):
   - Reusable UI components
   - Form components for data input
   - Dialog components for modal interactions

3. **Services** (`src/services`):
   - API client for backend communication
   - Authentication and state management
   - Error handling and retry logic

4. **Contexts** (`src/contexts`):
   - React context providers
   - Shared state management
   - Authentication context

5. **Types** (`src/types`):
   - TypeScript interfaces and types
   - Shared type definitions
   - Matches backend schema definitions

## Recent Changes and Improvements

### User Approval System

#### Backend Changes:
- Added `status` field to User model (`active`, `pending`, `rejected`)
- Modified registration endpoint to set status based on role
- Added `/users/pending` endpoint to list pending users
- Implemented `/users/approve/{user_id}` endpoint for user approval
- Enhanced login endpoint to handle pending/rejected user states

#### Frontend Changes:
- Updated User interface to include status field
- Added pending approvals section to User Management page
- Implemented approval/rejection UI with confirmation dialogs
- Enhanced signup form with approval requirement messaging
- Added appropriate error handling for authentication states

### Data Export Functionality

#### Backend Changes:
- Added `/model-versions/export/{lang_pair_id}` endpoint
- Implemented Excel export with pandas and XlsxWriter
- Added Markdown export alternative format
- Enhanced response handling for file downloads
- Fixed CRUD function naming conventions

#### Frontend Changes:
- Added "Export Data" button for admin users
- Implemented export format selection dialog
- Added loading state indicators during export
- Enhanced UI feedback for successful exports

### State Persistence Enhancements

#### Frontend Changes:
- Implemented localStorage for saving selected language pair
- Enhanced URL parameter handling to maintain state
- Modified navigation to preserve relevant parameters
- Added state restoration when returning to Model Versions page
- Improved back navigation from detail pages

## Coding Standards

### Backend
- Follow PEP 8 style guidelines
- Use type hints for function parameters and return values
- Document public functions and classes with docstrings
- Use meaningful variable and function names
- Handle exceptions properly and provide informative error messages

### Frontend
- Follow TypeScript best practices
- Use functional components with hooks
- Properly type all props and state
- Use consistent naming conventions
- Extract reusable logic into custom hooks
- Keep components focused on a single responsibility

## Common Pitfalls

1. **Database Migrations**: When changing the database schema, remember to update:
   - SQLAlchemy models
   - Pydantic schemas
   - CRUD operations
   - API endpoints that use the affected models

2. **Authentication Handling**: When working with authenticated endpoints:
   - Always check appropriate permissions
   - Use the correct dependency for role verification
   - Test with different user roles

3. **Form Validation**: When creating or modifying forms:
   - Update Yup validation schemas
   - Ensure validation errors display correctly
   - Test edge cases and error states

4. **State Management**: When handling state across components:
   - Consider using React Context for shared state
   - Use localStorage for persistent preferences
   - Preserve important state parameters in the URL

## Testing

- Backend tests are located in `backend/tests/`
- Frontend tests are located in `frontend/src/__tests__/`
- Run backend tests with pytest
- Run frontend tests with Jest

## CI/CD

The project uses a simple CI/CD process:
1. Linting and type checking
2. Unit tests
3. Integration tests
4. Build and deployment

## Deployment

See the [Installation Guide](INSTALLATION.md) for detailed deployment instructions.

## Version Control

- Use feature branches for new development
- Create pull requests for code review
- Include tests for new features
- Keep commits focused and descriptive 