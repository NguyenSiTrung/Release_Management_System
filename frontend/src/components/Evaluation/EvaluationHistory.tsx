import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,

  Tooltip,
  TablePagination,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,

  Avatar
} from '@mui/material';
import { 
  Download, 
  Compare, 
  Visibility, 
  Delete, 

  DeleteSweep,
  DateRange,
  AdminPanelSettings,
  History as HistoryIcon,

} from '@mui/icons-material';
import { EvaluationJob, EvaluationStatus } from '../../types';
import evaluationService, { PaginatedEvaluationJobs } from '../../services/evaluationService';
import EvaluationComparison from './EvaluationComparison';
import { useAuth } from '../../contexts/AuthContext';

interface EvaluationHistoryProps {
  versionId: number;
  onViewJob: (jobId: number) => void;
}

const EvaluationHistory: React.FC<EvaluationHistoryProps> = ({ versionId, onViewJob }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<EvaluationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingJobId, setDownloadingJobId] = useState<number | null>(null);
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [selectedJobForComparison, setSelectedJobForComparison] = useState<EvaluationJob | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Admin deletion state
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [dateRangeDeleteOpen, setDateRangeDeleteOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result: PaginatedEvaluationJobs = await evaluationService.getEvaluationJobs({
        version_id: versionId,
        page: page + 1, // Convert 0-based to 1-based
        size: rowsPerPage
      });
      
      setJobs(result.items);
      setTotalCount(result.total);
      setError(null);
      
      // Debug logging for both models
      const bothJobs = result.items.filter(job => job.evaluation_model_type === 'both');
      if (bothJobs.length > 0) {
        console.log('=== DEBUG: Jobs with both models ===');
        bothJobs.forEach(job => {
          console.log(`Job ${job.job_id}:`, {
            evaluation_model_type: job.evaluation_model_type,
            bleu_score: job.bleu_score,
            comet_score: job.comet_score,
            base_model_bleu_score: job.base_model_bleu_score,
            base_model_comet_score: job.base_model_comet_score,
            rawJob: job
          });
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch evaluation jobs:', err);
      setError(err.response?.data?.detail || 'Failed to load evaluation history');
    } finally {
      setLoading(false);
    }
  }, [versionId, page, rowsPerPage]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Get status color based on job status
  const getStatusColor = (status: EvaluationStatus) => {
    switch (status) {
      case EvaluationStatus.COMPLETED:
        return 'success';
      case EvaluationStatus.FAILED:
        return 'error';
      case EvaluationStatus.PENDING:
      case EvaluationStatus.PREPARING_SETUP:
      case EvaluationStatus.PREPARING_ENGINE:
      case EvaluationStatus.RUNNING_ENGINE:
      case EvaluationStatus.CALCULATING_METRICS:
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectJob = (jobId: number) => {
    setSelectedJobs(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(id => id !== jobId);
      } else {
        return [...prev, jobId];
      }
    });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedJobs(jobs.map(job => job.job_id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.length === 0) return;
    
    setDeleteLoading(true);
    try {
      const result = await evaluationService.bulkDeleteJobs({
        job_ids: selectedJobs
      });
      
      alert(`Successfully deleted ${result.deleted_count} jobs`);
      setSelectedJobs([]);
      setBulkDeleteOpen(false);
      fetchJobs(); // Refresh the list
    } catch (err: any) {
      console.error('Bulk delete failed:', err);
      alert(`Failed to delete jobs: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDateRangeDelete = async () => {
    if (!startDate || !endDate) return;
    
    setDeleteLoading(true);
    try {
      const result = await evaluationService.dateRangeDeleteJobs({
        start_date: new Date(startDate + 'T00:00:00').toISOString(),
        end_date: new Date(endDate + 'T23:59:59').toISOString(),
        version_id: versionId,
        status: statusFilter || undefined
      });
      
      alert(`Successfully deleted ${result.deleted_count} jobs from date range`);
      setDateRangeDeleteOpen(false);
      setStartDate('');
      setEndDate('');
      setStatusFilter('');
      fetchJobs(); // Refresh the list
    } catch (err: any) {
      console.error('Date range delete failed:', err);
      alert(`Failed to delete jobs: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownload = async (jobId: number, modelType: string = 'finetuned') => {
    setDownloadingJobId(jobId);
    try {
      const blob = await evaluationService.downloadOutputFile(jobId, modelType);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evaluation_output_${modelType}_${jobId}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      setError(err.response?.data?.detail || 'Failed to download file');
    } finally {
      setDownloadingJobId(null);
    }
  };

  const handleViewComparison = (job: EvaluationJob) => {
    setSelectedJobForComparison(job);
    setComparisonVisible(true);
  };



  if (loading) {
    return (
      <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="body1">Loading evaluation history...</Typography>
        </Box>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              background: 'linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%)',
              width: 56,
              height: 56,
              mr: 2
            }}
          >
            <HistoryIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Evaluation History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track and manage all evaluation jobs for this model version
            </Typography>
          </Box>
          
          {isAdmin && (
            <IconButton 
              onClick={(e) => setAdminMenuAnchor(e.currentTarget)}
              sx={{
                backgroundColor: 'warning.light',
                color: 'warning.main',
                '&:hover': {
                  backgroundColor: 'warning.main',
                  color: 'white'
                }
              }}
            >
              <AdminPanelSettings />
            </IconButton>
          )}
          
          <Menu
            anchorEl={adminMenuAnchor}
            open={Boolean(adminMenuAnchor)}
            onClose={() => setAdminMenuAnchor(null)}
          >
            <MenuItem 
              onClick={() => {
                setBulkDeleteOpen(true);
                setAdminMenuAnchor(null);
              }}
              disabled={selectedJobs.length === 0}
            >
              <DeleteSweep sx={{ mr: 1 }} />
              Bulk Delete Selected
            </MenuItem>
            <MenuItem 
              onClick={() => {
                setDateRangeDeleteOpen(true);
                setAdminMenuAnchor(null);
              }}
            >
              <DateRange sx={{ mr: 1 }} />
              Delete by Date Range
            </MenuItem>
          </Menu>
        </Box>
        
        {totalCount === 0 ? (
          <Box 
            sx={{ 
              textAlign: 'center', 
              py: 4,
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 2,
              backgroundColor: 'grey.50'
            }}
          >
            <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography color="text.secondary" variant="body1" sx={{ mb: 1 }}>
              No evaluation jobs found for this model version.
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Start an evaluation to see results here.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ borderRadius: 2, border: '1px solid #e9ecef' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    {isAdmin && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedJobs.length > 0 && selectedJobs.length < jobs.length}
                          checked={jobs.length > 0 && selectedJobs.length === jobs.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 600 }}>Job ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Testset</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Mode</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Model Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>BLEU</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>COMET</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job, index) => (
                    <TableRow 
                      key={job.job_id}
                      sx={{ 
                        '&:hover': { backgroundColor: '#f8f9fa' },
                        '&:last-child td': { border: 0 },
                        backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc'
                      }}
                    >
                      {isAdmin && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedJobs.includes(job.job_id)}
                            onChange={() => handleSelectJob(job.job_id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, backgroundColor: 'primary.main', fontSize: '0.75rem' }}>
                            {job.job_id}
                          </Avatar>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {job.testset_name || `-`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={job.mode_type || 'Default'} 
                          size="small" 
                          variant="outlined"
                          sx={{ borderRadius: 2 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            job.evaluation_model_type === 'finetuned' ? 'Finetuned' :
                            job.evaluation_model_type === 'base' ? 'Base' :
                            job.evaluation_model_type === 'both' ? 'Both' :
                            'Finetuned'
                          }
                          size="small"
                          color={
                            job.evaluation_model_type === 'both' ? 'secondary' :
                            job.evaluation_model_type === 'base' ? 'info' : 'primary'
                          }
                          sx={{ borderRadius: 2, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={job.status} 
                          color={getStatusColor(job.status) as any}
                          size="small"
                          sx={{ borderRadius: 2, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        {job.evaluation_model_type === 'both' ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              <strong>Base:</strong> {job.base_model_bleu_score !== null && job.base_model_bleu_score !== undefined 
                                ? job.base_model_bleu_score.toFixed(2) 
                                : '-'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              <strong>Finetuned:</strong> {job.bleu_score !== null && job.bleu_score !== undefined 
                                ? job.bleu_score.toFixed(2) 
                                : '-'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {job.bleu_score !== null && job.bleu_score !== undefined 
                              ? job.bleu_score.toFixed(2) 
                              : '-'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.evaluation_model_type === 'both' ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              <strong>Base:</strong> {job.base_model_comet_score !== null && job.base_model_comet_score !== undefined 
                                ? job.base_model_comet_score.toFixed(4) 
                                : '-'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              <strong>Finetuned:</strong> {job.comet_score !== null && job.comet_score !== undefined 
                                ? job.comet_score.toFixed(4) 
                                : '-'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {job.comet_score !== null && job.comet_score !== undefined 
                              ? job.comet_score.toFixed(4) 
                              : '-'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {new Date(job.requested_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Button
                            onClick={() => onViewJob(job.job_id)}
                            startIcon={<Visibility />}
                            size="small"
                            variant="outlined"
                            fullWidth
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '0.7rem'
                            }}
                          >
                            View
                          </Button>
                          
                          {job.evaluation_model_type === 'both' ? (
                            // Show separate download buttons for both models
                            <>
                              <Tooltip title="Download base model output">
                                <Button
                                  onClick={() => handleDownload(job.job_id, 'base')}
                                  startIcon={<Download />}
                                  disabled={downloadingJobId === job.job_id}
                                  size="small"
                                  variant="outlined"
                                  fullWidth
                                  color="secondary"
                                  sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.7rem'
                                  }}
                                >
                                  {downloadingJobId === job.job_id ? 'Downloading...' : 'Base'}
                                </Button>
                              </Tooltip>
                              
                              <Tooltip title="Download finetuned model output">
                                <Button
                                  onClick={() => handleDownload(job.job_id, 'finetuned')}
                                  startIcon={<Download />}
                                  disabled={downloadingJobId === job.job_id}
                                  size="small"
                                  variant="outlined"
                                  fullWidth
                                  sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.7rem'
                                  }}
                                >
                                  {downloadingJobId === job.job_id ? 'Downloading...' : 'Finetuned'}
                                </Button>
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip title="Download output file">
                              <Button
                                onClick={() => handleDownload(job.job_id)}
                                startIcon={<Download />}
                                disabled={downloadingJobId === job.job_id}
                                size="small"
                                variant="outlined"
                                fullWidth
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  fontSize: '0.7rem'
                                }}
                              >
                                {downloadingJobId === job.job_id ? 'Downloading...' : 'Download'}
                              </Button>
                            </Tooltip>
                          )}
                          
                          <Tooltip title="Compare output with reference">
                            <Button
                              onClick={() => handleViewComparison(job)}
                              startIcon={<Compare />}
                              size="small"
                              variant="outlined"
                              color="secondary"
                              fullWidth
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.7rem'
                              }}
                            >
                              Compare
                            </Button>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ borderTop: '1px solid #e9ecef', mt: 1 }}
            />
          </>
        )}
      </Box>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #e9ecef' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ backgroundColor: 'error.main' }}>
              <DeleteSweep />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Bulk Delete Confirmation
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography>
              Are you sure you want to delete {selectedJobs.length} selected evaluation jobs?
              This action cannot be undone and will also delete associated output files.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e9ecef', p: 3 }}>
          <Button 
            onClick={() => setBulkDeleteOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleBulkDelete} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : <Delete />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date Range Delete Dialog */}
      <Dialog open={dateRangeDeleteOpen} onClose={() => setDateRangeDeleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #e9ecef' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ backgroundColor: 'warning.main' }}>
              <DateRange />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Delete by Date Range
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status Filter (Optional)</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status Filter (Optional)"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
            <Typography variant="body2">
              This will delete all evaluation jobs for this model version within the specified date range.
              This action cannot be undone.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e9ecef', p: 3 }}>
          <Button 
            onClick={() => setDateRangeDeleteOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDateRangeDelete} 
            color="error" 
            variant="contained"
            disabled={!startDate || !endDate || deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : <DateRange />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comparison Modal */}
      {selectedJobForComparison && (
        <EvaluationComparison
          visible={comparisonVisible}
          onClose={() => {
            setComparisonVisible(false);
            setSelectedJobForComparison(null);
          }}
          jobId={selectedJobForComparison.job_id}
          testsetId={selectedJobForComparison.testset_id}
          jobDetails={{
            model_version_name: selectedJobForComparison.model_version_name,
            testset_name: selectedJobForComparison.testset_name,
            evaluation_model_type: selectedJobForComparison.evaluation_model_type,
            result: {
              bleu_score: selectedJobForComparison.bleu_score,
              comet_score: selectedJobForComparison.comet_score,
              base_model_bleu_score: selectedJobForComparison.base_model_bleu_score,
              base_model_comet_score: selectedJobForComparison.base_model_comet_score
            }
          }}
        />
      )}
    </Card>
  );
};

export default EvaluationHistory; 