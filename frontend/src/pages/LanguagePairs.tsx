import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
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
  Typography,
  Chip,
  Avatar,
  Stack,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Language as LanguageIcon,
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

  return (
    <Box sx={{ p: 0 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#344767',
                fontWeight: 600,
                mb: 0.5
              }}
            >
              Language Pairs
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#67748e',
                fontSize: '0.875rem'
              }}
            >
              Manage translation language pairs for your NMT models
            </Typography>
          </Box>
          
          {isReleaseManager && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              sx={{
                background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
                boxShadow: '0 3px 5px -1px rgba(94,114,228,.2), 0 6px 10px 0 rgba(94,114,228,.14), 0 1px 18px 0 rgba(94,114,228,.12)',
                borderRadius: '0.5rem',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                '&:hover': {
                  background: 'linear-gradient(90deg, rgba(84,104,218,1) 0%, rgba(120,84,218,1) 100%)',
                }
              }}
            >
              Add Language Pair
            </Button>
          )}
        </Stack>
        
        {error && (
          <ErrorDisplay 
            message={error} 
            onRetry={fetchLanguagePairs} 
          />
        )}
      </Box>

      {/* Main Content Card */}
      <Card
        sx={{
          borderRadius: '1rem',
          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
          border: '0px',
          background: '#fff',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Search Bar */}
          <Box sx={{ p: 3, pb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by source code, target code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#8392ab' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.5rem',
                  '& fieldset': {
                    borderColor: 'rgba(0,0,0,0.1)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(94,114,228,0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(94,114,228,0.8)',
                  },
                },
              }}
            />
          </Box>

          <Divider />

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    #
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    Language Pair
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    Description
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#8392ab', 
                      fontWeight: 600, 
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      py: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    Created
                  </TableCell>
                  {isReleaseManager && (
                    <TableCell 
                      align="right"
                      sx={{ 
                        color: '#8392ab', 
                        fontWeight: 600, 
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        py: 2,
                        borderBottom: '1px solid rgba(0,0,0,0.05)'
                      }}
                    >
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPairs.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={isReleaseManager ? 5 : 4} 
                      align="center"
                      sx={{ py: 6, color: '#8392ab' }}
                    >
                      <Stack alignItems="center" spacing={2}>
                        <LanguageIcon sx={{ fontSize: 48, color: '#dee2e6' }} />
                        <Typography variant="body1" sx={{ color: '#8392ab' }}>
                          No language pairs found
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPairs
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((pair, index) => (
                      <TableRow 
                        key={pair.lang_pair_id}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(94,114,228,0.03)',
                          },
                        }}
                      >
                        <TableCell 
                          sx={{ 
                            color: '#344767', 
                            fontWeight: 500,
                            py: 2,
                            borderBottom: '1px solid rgba(0,0,0,0.05)'
                          }}
                        >
                          {page * rowsPerPage + index + 1}
                        </TableCell>
                        <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                background: 'linear-gradient(90deg, rgba(94,114,228,0.1) 0%, rgba(130,94,228,0.1) 100%)',
                                color: 'rgba(94,114,228,1)',
                              }}
                            >
                              <LanguageIcon sx={{ fontSize: 16 }} />
                            </Avatar>
                            <Box>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: '#344767', 
                                  fontWeight: 600,
                                  fontSize: '0.875rem'
                                }}
                              >
                                {pair.source_language_code} → {pair.target_language_code}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: '#67748e',
                                  fontSize: '0.75rem'
                                }}
                              >
                                Language Pair ID: {pair.lang_pair_id}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#344767',
                              fontSize: '0.875rem'
                            }}
                          >
                            {pair.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <Chip
                            label={new Date(pair.created_at).toLocaleDateString()}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(94,114,228,0.1)',
                              color: 'rgba(94,114,228,1)',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        {isReleaseManager && (
                          <TableCell 
                            align="right" 
                            sx={{ py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditDialog(pair)}
                              sx={{
                                color: '#5e72e4',
                                '&:hover': {
                                  backgroundColor: 'rgba(94,114,228,0.1)',
                                }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDeleteDialog(pair)}
                              sx={{
                                color: '#f5365c',
                                ml: 1,
                                '&:hover': {
                                  backgroundColor: 'rgba(245,54,92,0.1)',
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ p: 2, pt: 1 }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredPairs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                '& .MuiTablePagination-toolbar': {
                  color: '#8392ab',
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  color: '#8392ab',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Language Pair Form Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '1rem',
            boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
          }
        }}
      >
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle sx={{ 
            color: '#344767', 
            fontWeight: 600,
            borderBottom: '1px solid rgba(0,0,0,0.05)'
          }}>
            {dialogMode === 'create' ? 'Add New Language Pair' : 'Edit Language Pair'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={3}>
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                    },
                  }}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                    },
                  }}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '0.5rem',
                    },
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{
                color: '#8392ab',
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={formik.isSubmitting}
              sx={{
                background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '0.5rem',
                px: 3,
              }}
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
        } → ${
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