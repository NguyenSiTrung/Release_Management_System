import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Link,
  Typography,
  SelectChangeEvent,
  Pagination,
  Stack,
  Chip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  CloudDownload as CloudDownloadIcon,
  Add as AddIcon,
  Code as CodeIcon,
  FilterList as FilterListIcon,
  Settings as SettingsIcon,
  DataUsage as DataUsageIcon,
  FileDownload as FileDownloadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import {
  getLanguagePairs,
  exportModelVersions,
} from '../services/api';
import * as modelVersionService from '../services/modelVersionService';
import { LanguagePair, ModelVersion } from '../types';
import { useAuth } from '../contexts/AuthContext';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ModelVersionForm from '../components/ModelVersion/ModelVersionForm';

// Add a constant for localStorage key
const STORAGE_KEY_LANGUAGE_PAIR = 'nmt_selected_language_pair';

const ModelVersionsPage: React.FC = () => {
  const { isReleaseManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [selectedLangPair, setSelectedLangPair] = useState<number | ''>('');
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [filteredVersions, setFilteredVersions] = useState<ModelVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedVersion, setSelectedVersion] = useState<ModelVersion | null>(null);
  
  // Confirm dialog state
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<ModelVersion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export dialog states
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'markdown'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch language pairs for dropdown
  const fetchLanguagePairs = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getLanguagePairs();
      setLanguagePairs(data);
    } catch (err) {
      console.error('Error fetching language pairs:', err);
      setError('Failed to load language pairs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch model versions when a language pair is selected
  const fetchModelVersions = useCallback(async (langPairId: number) => {
    try {
      setIsLoadingVersions(true);
      setError(null);
      const data = await modelVersionService.getModelVersionsPaginated(langPairId, currentPage);
      setModelVersions(data.items);
      setFilteredVersions(data.items);
      setTotalPages(data.pages);
    } catch (err) {
      console.error('Error fetching model versions:', err);
      setError('Failed to load model versions. Please try again.');
    } finally {
      setIsLoadingVersions(false);
    }
  }, [currentPage]);

  // Parse URL parameters and check localStorage
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const editVersionId = searchParams.get('edit');
    const langPairId = searchParams.get('langPairId');

    const init = async () => {
      await fetchLanguagePairs();
      
      // Try to get language pair ID from URL first, then localStorage if not in URL
      let langPairIdToUse: string | null = langPairId;
      
      if (!langPairIdToUse) {
        // Check localStorage if not in URL
        langPairIdToUse = localStorage.getItem(STORAGE_KEY_LANGUAGE_PAIR);
      }
      
      // If we have a language pair ID from URL or localStorage, select it and load versions
      if (langPairIdToUse) {
        const langPairIdNum = parseInt(langPairIdToUse);
        setSelectedLangPair(langPairIdNum);
        await fetchModelVersions(langPairIdNum);
        
        // If editing a model version, store it to be handled after formik is ready
        if (editVersionId) {
          const versionIdNum = parseInt(editVersionId);
          const versionToEdit = await modelVersionService.getModelVersion(versionIdNum);
          if (versionToEdit) {
            // Store version to edit, it will be handled by the component after formik is ready
            setSelectedVersion(versionToEdit);
            setDialogMode('edit');
            setOpenDialog(true);
            
            // Clear the URL parameters after handling them
            navigate('/model-versions', { replace: true });
          }
        }
      }
    };
    
    init();
  }, [location.search, fetchLanguagePairs, fetchModelVersions, navigate]);

  // Add a new effect to save selected language pair to localStorage when it changes
  useEffect(() => {
    if (selectedLangPair !== '') {
      localStorage.setItem(STORAGE_KEY_LANGUAGE_PAIR, selectedLangPair.toString());
    }
  }, [selectedLangPair]);

  // Refetch when page changes
  useEffect(() => {
    if (selectedLangPair !== '') {
      fetchModelVersions(selectedLangPair as number);
    }
  }, [currentPage, fetchModelVersions, selectedLangPair]);

  // Filter model versions based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredVersions(modelVersions);
    } else {
      const filtered = modelVersions.filter(
        (version) =>
          version.version_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (version.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      );
      setFilteredVersions(filtered);
    }
  }, [searchTerm, modelVersions]);

  // Handle language pair selection change
  const handleLangPairChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;
    setSelectedLangPair(typeof value === 'number' ? value : value === '' ? '' : parseInt(value as string));
    setModelVersions([]);
    setFilteredVersions([]);
    setSearchTerm('');
    setCurrentPage(1);
    
    if (value !== '') {
      fetchModelVersions(typeof value === 'number' ? value : parseInt(value as string));
    }
  };

  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setSelectedVersion(null);
    setOpenDialog(true);
  };

  const handleEditDialogOpen = (version: ModelVersion) => {
    setDialogMode('edit');
    setSelectedVersion(version);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVersion(null);
  };

  const handleFormSuccess = () => {
    handleCloseDialog();
    if (selectedLangPair !== '') {
      fetchModelVersions(selectedLangPair as number);
    }
  };

  const handleOpenDeleteDialog = (version: ModelVersion) => {
    setVersionToDelete(version);
    setOpenConfirmDialog(true);
  };

  const handleDeleteModelVersion = async () => {
    if (!versionToDelete) return;
    
    setIsDeleting(true);
    try {
      await modelVersionService.deleteModelVersion(versionToDelete.version_id);
      setOpenConfirmDialog(false);
      setVersionToDelete(null);
      
      // Refresh the model versions list
      if (selectedLangPair !== '') {
        await fetchModelVersions(selectedLangPair as number);
      }
    } catch (err) {
      console.error('Error deleting model version:', err);
      setError('Failed to delete model version. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewVersion = (versionId: number) => {
    navigate(`/model-versions/${versionId}`);
  };

  const handleOpenExportDialog = () => {
    setOpenExportDialog(true);
  };

  const handleCloseExportDialog = () => {
    setOpenExportDialog(false);
  };

  const handleExportFormatChange = (event: SelectChangeEvent) => {
    setExportFormat(event.target.value as 'excel' | 'markdown');
  };

  const handleExport = async () => {
    if (selectedLangPair === '') {
      setError('Please select a language pair first.');
      return;
    }

    try {
      setIsExporting(true);
      const blob = await exportModelVersions(selectedLangPair as number, exportFormat);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      
      // Set the file name
      const langPair = languagePairs.find(lp => lp.lang_pair_id === selectedLangPair);
      const fileName = `model_versions_${langPair?.source_language_code}_${langPair?.target_language_code}_${new Date().toISOString().split('T')[0]}`;
      a.download = exportFormat === 'excel' ? `${fileName}.xlsx` : `${fileName}.md`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      handleCloseExportDialog();
    } catch (err) {
      console.error('Error exporting model versions:', err);
      setError('Failed to export model versions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <LoadingIndicator message="Loading language pairs..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                width: 56,
                height: 56
              }}
            >
              <SettingsIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 0.5
                }}
              >
                Model Versions
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
              >
                Manage your NMT model versions and releases
              </Typography>
            </Box>
          </Box>
          
          {isReleaseManager && selectedLangPair !== '' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                boxShadow: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
            >
              Add Model Version
            </Button>
          )}
        </Stack>
        
        {error && (
          <ErrorDisplay 
            message={error} 
            onRetry={() => {
              if (selectedLangPair !== '') {
                fetchModelVersions(selectedLangPair as number);
              } else {
                fetchLanguagePairs();
              }
            }} 
          />
        )}
      </Box>

      {/* Language Pair Selection Card */}
      <Card sx={{ borderRadius: 3, boxShadow: 2, mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                width: 48,
                height: 48,
                mr: 2
              }}
            >
              <FilterListIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                Select Language Pair
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a language pair to view and manage model versions
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl sx={{ minWidth: 300, flexGrow: 1 }}>
              <InputLabel id="language-pair-select-label">Language Pair</InputLabel>
              <Select
                labelId="language-pair-select-label"
                id="language-pair-select"
                value={selectedLangPair}
                label="Language Pair"
                onChange={handleLangPairChange}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">
                  <em>Select a language pair</em>
                </MenuItem>
                {languagePairs.map((pair) => (
                  <MenuItem key={pair.lang_pair_id} value={pair.lang_pair_id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, backgroundColor: 'primary.main', fontSize: '0.7rem' }}>
                        {pair.source_language_code.charAt(0).toUpperCase()}
                      </Avatar>
                      {pair.source_language_code} → {pair.target_language_code}
                      {pair.description && ` (${pair.description})`}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedLangPair !== '' && isAdmin && (
              <Button
                variant="outlined"
                startIcon={<CloudDownloadIcon />}
                onClick={handleOpenExportDialog}
                sx={{
                  borderColor: '#17a2b8',
                  color: '#17a2b8',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': {
                    borderColor: '#138496',
                    backgroundColor: 'rgba(23, 162, 184, 0.04)'
                  }
                }}
              >
                Export Data
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Model Versions Table */}
      {selectedLangPair !== '' && (
        <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
          <CardContent sx={{ p: 0 }}>
            {/* Search Bar */}
            <Box sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    background: 'linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%)',
                    width: 48,
                    height: 48,
                    mr: 2
                  }}
                >
                  <DataUsageIcon sx={{ fontSize: 24 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Model Versions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Browse and manage model versions for the selected language pair
                  </Typography>
                </Box>
              </Box>
              
              <TextField
                fullWidth
                placeholder="Search by version name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Box>

            <Divider />

            {isLoadingVersions ? (
              <Box sx={{ p: 6 }}>
                <LoadingIndicator message="Loading model versions..." />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Version</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Release Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Created</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredVersions.length === 0 ? (
                      <TableRow>
                        <TableCell 
                          colSpan={5} 
                          align="center"
                          sx={{ py: 6 }}
                        >
                          <Stack alignItems="center" spacing={2}>
                            <Avatar sx={{ width: 64, height: 64, backgroundColor: 'grey.200' }}>
                              <CodeIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                            </Avatar>
                            <Typography variant="h6" color="text.secondary">
                              No model versions found
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {isReleaseManager ? 'Click "Add Model Version" to create your first model version.' : 'No model versions available for this language pair.'}
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVersions.map((version, index) => (
                        <TableRow 
                          key={version.version_id}
                          sx={{
                            '&:hover': { backgroundColor: '#f8f9fa' },
                            backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc'
                          }}
                        >
                          <TableCell sx={{ py: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Avatar
                                sx={{
                                  width: 40,
                                  height: 40,
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                }}
                              >
                                <CodeIcon sx={{ fontSize: 20 }} />
                              </Avatar>
                              <Box>
                                <Link
                                  component="button"
                                  variant="body1"
                                  onClick={() => handleViewVersion(version.version_id)}
                                  sx={{
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    '&:hover': {
                                      textDecoration: 'underline',
                                    }
                                  }}
                                >
                                  {version.version_name}
                                </Link>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: 'text.secondary',
                                    display: 'block'
                                  }}
                                >
                                  Version ID: {version.version_id}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            {version.release_date ? (
                              <Chip
                                label={new Date(version.release_date).toLocaleDateString()}
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ borderRadius: 2 }}
                              />
                            ) : (
                              <Chip
                                label="Draft"
                                size="small"
                                color="default"
                                variant="outlined"
                                sx={{ borderRadius: 2 }}
                              />
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Typography variant="body2">
                              {version.description || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Chip
                              label={new Date(version.created_at).toLocaleDateString()}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ borderRadius: 2 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ py: 2 }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton
                                size="small"
                                onClick={() => handleViewVersion(version.version_id)}
                                sx={{
                                  color: 'primary.main',
                                  '&:hover': { backgroundColor: 'primary.50' }
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                              {isReleaseManager && (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditDialogOpen(version)}
                                    sx={{
                                      color: 'warning.main',
                                      '&:hover': { backgroundColor: 'warning.50' }
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDeleteDialog(version)}
                                    sx={{
                                      color: 'error.main',
                                      '&:hover': { backgroundColor: 'error.50' }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(event, page) => setCurrentPage(page)}
                  color="primary"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Model Version Form Dialog */}
      <ModelVersionForm
        open={openDialog}
        onClose={handleCloseDialog}
        onSuccess={handleFormSuccess}
        mode={dialogMode}
        langPairId={selectedLangPair as number}
        modelVersion={selectedVersion || undefined}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={openConfirmDialog}
        title="Delete Model Version"
        message={`Are you sure you want to delete the model version "${versionToDelete?.version_name}"? This action cannot be undone.`}
        onConfirm={handleDeleteModelVersion}
        onCancel={() => setOpenConfirmDialog(false)}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />

      {/* Export Dialog */}
      <Dialog 
        open={openExportDialog} 
        onClose={handleCloseExportDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 4
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
          color: 'white',
          fontWeight: 600,
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <CloudDownloadIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Export Model Versions
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Download data for analysis
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 2, color: 'text.primary' }}>
              Export all model versions, training results, and release notes for the selected language pair.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose your preferred format below to download the data.
            </Typography>
          </Box>
          
          <Card sx={{ borderRadius: 2, boxShadow: 1, p: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="export-format-label">Export Format</InputLabel>
              <Select
                labelId="export-format-label"
                id="export-format"
                value={exportFormat}
                label="Export Format"
                onChange={handleExportFormatChange}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="excel">
                  <ListItemIcon>
                    <FileDownloadIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Excel Spreadsheet" 
                    secondary="Complete data with charts and analysis (.xlsx)"
                  />
                </MenuItem>
                <MenuItem value="markdown">
                  <ListItemIcon>
                    <DescriptionIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Markdown Document" 
                    secondary="Human-readable documentation format (.md)"
                  />
                </MenuItem>
              </Select>
            </FormControl>
          </Card>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleCloseExportDialog}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 500,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            variant="contained" 
            disabled={isExporting}
            startIcon={<CloudDownloadIcon />}
            sx={{
              background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 4,
              py: 1.5,
              '&:hover': {
                background: 'linear-gradient(135deg, #138496 0%, #117a8b 100%)',
                transform: 'translateY(-1px)',
                boxShadow: 3
              }
            }}
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ModelVersionsPage; 