import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  getLanguagePairs,
  createLanguagePair,
  updateLanguagePair,
  deleteLanguagePair,
} from '../services/api';
import { LanguagePair } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/common/PageHeader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';
import ConfirmDialog from '../components/common/ConfirmDialog';

// Validation schema for language pair form
const validationSchema = Yup.object({
  source_language_code: Yup.string()
    .required('Source language code is required')
    .max(10, 'Source language code must be 10 characters or less'),
  target_language_code: Yup.string()
    .required('Target language code is required')
    .max(10, 'Target language code must be 10 characters or less'),
  description: Yup.string(),
});

const LanguagePairsPage: React.FC = () => {
  const { isReleaseManager } = useAuth();
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [filteredPairs, setFilteredPairs] = useState<LanguagePair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedPair, setSelectedPair] = useState<LanguagePair | null>(null);
  
  // Confirm dialog state
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [pairToDelete, setPairToDelete] = useState<LanguagePair | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch language pairs data
  const fetchLanguagePairs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getLanguagePairs();
      setLanguagePairs(data);
      setFilteredPairs(data);
    } catch (err) {
      console.error('Error fetching language pairs:', err);
      setError('Failed to load language pairs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLanguagePairs();
  }, []);

  // Filter language pairs based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPairs(languagePairs);
    } else {
      const filtered = languagePairs.filter(
        (pair) =>
          pair.source_language_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pair.target_language_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (pair.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
      setFilteredPairs(filtered);
    }
    setPage(0);
  }, [searchTerm, languagePairs]);

  // Formik setup for language pair form
  const formik = useFormik({
    initialValues: {
      source_language_code: '',
      target_language_code: '',
      description: '',
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        if (dialogMode === 'create') {
          await createLanguagePair(values);
        } else if (dialogMode === 'edit' && selectedPair) {
          await updateLanguagePair(selectedPair.lang_pair_id, {
            description: values.description,
          });
        }
        
        handleCloseDialog();
        resetForm();
        await fetchLanguagePairs();
      } catch (err) {
        console.error('Error saving language pair:', err);
        setError('Failed to save language pair. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Open dialog for creating a new language pair
  const handleOpenCreateDialog = () => {
    formik.resetForm();
    setDialogMode('create');
    setOpenDialog(true);
  };

  // Open dialog for editing a language pair
  const handleOpenEditDialog = (pair: LanguagePair) => {
    formik.setValues({
      source_language_code: pair.source_language_code,
      target_language_code: pair.target_language_code,
      description: pair.description || '',
    });
    setSelectedPair(pair);
    setDialogMode('edit');
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPair(null);
    formik.resetForm();
  };

  // Open confirm dialog for deleting a language pair
  const handleOpenDeleteDialog = (pair: LanguagePair) => {
    setPairToDelete(pair);
    setOpenConfirmDialog(true);
  };

  // Delete language pair
  const handleDeleteLanguagePair = async () => {
    if (!pairToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteLanguagePair(pairToDelete.lang_pair_id);
      await fetchLanguagePairs();
      setOpenConfirmDialog(false);
      setPairToDelete(null);
    } catch (err) {
      console.error('Error deleting language pair:', err);
      setError('Failed to delete language pair. It may be in use by model versions.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle pagination changes
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading language pairs..." />;
  }

  // Log outside the JSX
  console.log('LanguagePairs Page: isReleaseManager =', isReleaseManager);

  return (
    <Box>
      <PageHeader
        title="Language Pairs"
        action={
          isReleaseManager
            ? {
                text: 'Add New Language Pair',
                onClick: handleOpenCreateDialog,
                disabled: false,
              }
            : undefined
        }
      />

      {error && (
        <ErrorDisplay 
          message={error} 
          onRetry={fetchLanguagePairs} 
        />
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by source code, target code, or description"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Source Code</TableCell>
                <TableCell>Target Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Created At</TableCell>
                {isReleaseManager && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPairs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReleaseManager ? 6 : 5} align="center">
                    No language pairs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPairs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((pair, index) => (
                    <TableRow key={pair.lang_pair_id}>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>{pair.source_language_code}</TableCell>
                      <TableCell>{pair.target_language_code}</TableCell>
                      <TableCell>{pair.description || '-'}</TableCell>
                      <TableCell>
                        {new Date(pair.created_at).toLocaleDateString()}
                      </TableCell>
                      {isReleaseManager && (
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEditDialog(pair)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDeleteDialog(pair)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredPairs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Language Pair Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {dialogMode === 'create' ? 'Add New Language Pair' : 'Edit Language Pair'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="source_language_code"
                  name="source_language_code"
                  label="Source Language Code"
                  value={formik.values.source_language_code}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.source_language_code &&
                    Boolean(formik.errors.source_language_code)
                  }
                  helperText={
                    formik.touched.source_language_code &&
                    formik.errors.source_language_code
                  }
                  disabled={dialogMode === 'edit'}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="target_language_code"
                  name="target_language_code"
                  label="Target Language Code"
                  value={formik.values.target_language_code}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.target_language_code &&
                    Boolean(formik.errors.target_language_code)
                  }
                  helperText={
                    formik.touched.target_language_code &&
                    formik.errors.target_language_code
                  }
                  disabled={dialogMode === 'edit'}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="description"
                  name="description"
                  label="Description"
                  multiline
                  rows={4}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.description && Boolean(formik.errors.description)
                  }
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting
                ? 'Saving...'
                : dialogMode === 'create'
                ? 'Create'
                : 'Save Changes'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Language Pair"
        message={`Are you sure you want to delete the language pair "${
          pairToDelete?.source_language_code || ''
        } -> ${
          pairToDelete?.target_language_code || ''
        }"? All model versions, training results, and release notes related to this language pair will also be deleted.`}
        onConfirm={handleDeleteLanguagePair}
        onCancel={() => {
          setOpenConfirmDialog(false);
          setPairToDelete(null);
        }}
        isLoading={isDeleting}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default LanguagePairsPage; 