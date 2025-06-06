# Quick Start Guide

This guide provides a brief overview of how to get started with the NMT Release Management System and use its key features.

## Running the Application

### Backend

```bash
cd backend
source venv/bin/activate  # On Linux/Mac
pip install -r requirements.txt  # First time only
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install  # First time only
npm start
```

## Key Features

### 1. User Management

The system has three user roles:
- **Member**: View-only access
- **Release Manager**: Can create and manage models and results
- **Admin**: Full system access including user management

#### User Registration and Approval

- Members are automatically approved
- Release Managers and Admins require approval from an existing admin
- Admins can approve users from the User Management page

### 2. Language Pairs

Language pairs define the source and target languages for translation models.

#### Managing Language Pairs

1. Navigate to the **Language Pairs** page
2. Click **Add New Language Pair** to create a new pair
3. Specify source and target language codes (e.g., en, th)
4. Optionally add a description

### 3. Model Versions

Model versions represent specific translation models for a language pair.

#### Creating and Managing Model Versions

1. Navigate to the **Model Versions** page
2. Select a language pair from the dropdown
3. Click **Add New Model Version**
4. Fill in the version details:
   - Version name
   - Optional release date
   - Optional description

#### Viewing Model Details

1. Click on a model version in the list
2. View or edit the model details
3. Add training results and release notes

### 4. Training Results

Training results record BLEU and COMET scores for model evaluation.

#### Adding Training Results

1. Open a model version's details page
2. Click **Add Training Result**
3. Select a testset
4. Enter base model and fine-tuned model scores
5. Optionally add training notes

### 5. Release Notes

Release notes document changes and improvements for each model version.

#### Managing Release Notes

1. Open a model version's details page
2. Navigate to the **Release Notes** tab
3. Click **Create/Edit Release Note**
4. Add a title and content for the release note

### 6. Visualizations

The system provides visualizations to analyze model performance.

#### Using Visualizations

1. Navigate to the **Visualizations** page
2. Select from available visualization types:
   - Model comparison
   - Progress tracking
   - Testset comparison

### 7. Data Export

Admin users can export model version data for analysis and reporting.

#### Exporting Data

1. Navigate to the **Model Versions** page
2. Select a language pair
3. Click **Export Data**
4. Choose the export format:
   - Excel (.xlsx)
   - Markdown (.md)

## Navigation Tips

- Use the sidebar to navigate between different sections
- Selected states (like language pairs) are preserved when switching between tabs
- Most tables support searching and filtering
- The system provides informative error messages and validations

## Support

For issues or questions, contact the system administrator or refer to the full documentation. 