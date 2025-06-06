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
  Chip,
  Typography,
  Toolbar,

  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Tooltip,
  Stack,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,

  Clear as ClearIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';

import { getSQEResults, deleteSQEResult } from '../../services/sqeService';
import { getLanguagePairs } from '../../services/api';
import { SQEResultSummary, PaginatedSQEResults } from '../../types/sqe';
import { LanguagePair } from '../../types';
import LoadingIndicator from '../common/LoadingIndicator';
import ErrorDisplay from '../common/ErrorDisplay';
import ConfirmDialog from '../common/ConfirmDialog';

interface SQEResultsTableProps {
  onEditClick: (result: SQEResultSummary) => void;
  onDataChange: () => void;
  refreshTrigger?: number;
}

const SQEResultsTable: React.FC<SQEResultsTableProps> = ({
  onEditClick,
  onDataChange,
  refreshTrigger
}) => {
  const [data, setData] = useState<PaginatedSQEResults | null>(null);
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination & Filtering
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [languagePairFilter, setLanguagePairFilter] = useState<number | ''>('');
  const [criticalFilter, setCriticalFilter] = useState<string>('');
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SQEResultSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Function definitions moved here to avoid "used before declaration" errors
  const fetchLanguagePairs = async () => {
    try {
      const pairs = await getLanguagePairs();
      setLanguagePairs(pairs);
    } catch (err) {
      console.error('Error fetching language pairs:', err);
    }
  };

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const languagePairId = languagePairFilter || undefined;
      const hasOnePointCase = criticalFilter === '' ? undefined : criticalFilter === 'true';

      const result = await getSQEResults(
        page + 1,
        rowsPerPage,
        languagePairId,
        undefined, // scoreMin removed
        undefined, // scoreMax removed
        hasOnePointCase
      );
      
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SQE results');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, languagePairFilter, criticalFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchLanguagePairs();
  }, []);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchData();
    }
  }, [refreshTrigger, fetchData]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClearFilters = () => {
    setLanguagePairFilter('');
    setCriticalFilter('');
    setPage(0);
  };

  const handleDeleteClick = (result: SQEResultSummary) => {
    setSelectedResult(result);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedResult) return;

    try {
      setDeleting(true);
      await deleteSQEResult(selectedResult.sqe_result_id);
      setDeleteDialogOpen(false);
      setSelectedResult(null);
      onDataChange();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete SQE result');
    } finally {
      setDeleting(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score > 2.5) return '#4caf50'; // Pass: Green
    if (score >= 2.0) return '#ff9800'; // Warning: Orange  
    return '#f44336'; // Fail: Red
  };

  const getScoreChip = (score: number) => (
    <Chip
      label={score.toFixed(3)}
      size="small"
      sx={{
        backgroundColor: getScoreColor(score),
        color: 'white',
        fontWeight: 600,
        minWidth: '80px'
      }}
    />
  );

  const getOverallStatus = (score: number, hasOnePointCase: boolean) => {
    const isPassing = score > 2.5 && !hasOnePointCase;
    return (
      <Chip
        label={isPassing ? 'PASS' : 'FAIL'}
        size="small"
        sx={{
          backgroundColor: isPassing ? '#4caf50' : '#f44336',
          color: 'white',
          fontWeight: 600,
          fontSize: '0.75rem'
        }}
      />
    );
  };

  const getChangeIndicator = (testCasesChanged: boolean, changePercentage: number) => {
    if (!testCasesChanged) {
      return (
        <Tooltip title="No test case changes">
          <RemoveIcon sx={{ color: '#9e9e9e', fontSize: 20 }} />
        </Tooltip>
      );
    }

    const isIncrease = changePercentage > 0;
    return (
      <Tooltip title={`${isIncrease ? 'Increased' : 'Decreased'} by ${Math.abs(changePercentage)}%`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isIncrease ? (
            <TrendingUpIcon sx={{ color: '#2196f3', fontSize: 20 }} />
          ) : (
            <TrendingDownIcon sx={{ color: '#ff9800', fontSize: 20 }} />
          )}
          <Typography variant="caption" sx={{ color: isIncrease ? '#2196f3' : '#ff9800' }}>
            {Math.abs(changePercentage)}%
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && !data) {
    return <LoadingIndicator message="Loading SQE results..." />;
  }

  if (error && !data) {
    return <ErrorDisplay message={error} onRetry={fetchData} />;
  }

  return (
    <Card sx={{ boxShadow: '0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)' }}>
      <CardContent sx={{ p: 0 }}>
        {/* Toolbar */}
        <Toolbar sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <AssessmentIcon sx={{ color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
              SQE Test Results
            </Typography>
            {data && (
              <Chip 
                label={`${data.total} results`} 
                size="small" 
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </Toolbar>

        {/* Filters */}
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          background: 'linear-gradient(195deg, rgba(73, 163, 241, 0.1), rgba(26, 115, 232, 0.1))',
        }}>
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#344767', mr: 1 }}>
              Filters:
            </Typography>
            
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel shrink sx={{ color: '#7b809a', fontSize: '0.875rem' }}>Language Pair</InputLabel>
              <Select
                value={languagePairFilter}
                label="Language Pair"
                onChange={(e) => setLanguagePairFilter(e.target.value as number | '')}
                displayEmpty
                renderValue={(selected) => {
                  // Type assertion to handle Material-UI Select type inference issue
                  const value = selected as number | '';
                  if (value === '' || value == null) {
                    return (
                      <Typography sx={{ fontSize: '0.875rem', color: '#7b809a' }}>
                        All Language Pairs
                      </Typography>
                    );
                  }
                  const selectedPair = languagePairs.find(pair => pair.lang_pair_id === value);
                  return (
                    <Typography sx={{ fontSize: '0.875rem', color: '#344767' }}>
                      {selectedPair ? `${selectedPair.source_language_code} → ${selectedPair.target_language_code}` : 'All Language Pairs'}
                    </Typography>
                  );
                }}
                sx={{
                  borderRadius: '0.5rem',
                  backgroundColor: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0,0,0,0.1)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                    borderWidth: 2,
                  },
                  '& .MuiSelect-select': {
                    color: '#344767',
                    fontSize: '0.875rem',
                  }
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.875rem', color: '#7b809a' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#7b809a' }}>
                      All Language Pairs
                    </Typography>
                  </Box>
                </MenuItem>
                {languagePairs.map((pair) => (
                  <MenuItem 
                    key={pair.lang_pair_id} 
                    value={pair.lang_pair_id}
                    sx={{ fontSize: '0.875rem', color: '#344767' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', color: '#344767' }}>
                        {pair.source_language_code} → {pair.target_language_code}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel shrink sx={{ color: '#7b809a', fontSize: '0.875rem' }}>Critical Issues</InputLabel>
              <Select
                value={criticalFilter}
                label="Critical Issues"
                onChange={(e) => setCriticalFilter(e.target.value as string)}
                displayEmpty
                renderValue={(selected) => {
                  if (selected === '' || selected === null || selected === undefined) {
                    return (
                      <Typography sx={{ fontSize: '0.875rem', color: '#7b809a' }}>
                        All Results
                      </Typography>
                    );
                  }
                  if (selected === 'true') {
                    return (
                      <Typography sx={{ fontSize: '0.875rem', color: '#f44336' }}>
                        Has Critical Issues
                      </Typography>
                    );
                  }
                  if (selected === 'false') {
                    return (
                      <Typography sx={{ fontSize: '0.875rem', color: '#4caf50' }}>
                        No Critical Issues
                      </Typography>
                    );
                  }
                  return (
                    <Typography sx={{ fontSize: '0.875rem', color: '#7b809a' }}>
                      All Results
                    </Typography>
                  );
                }}
                sx={{
                  borderRadius: '0.5rem',
                  backgroundColor: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0,0,0,0.1)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
                    borderWidth: 2,
                  },
                  '& .MuiSelect-select': {
                    color: '#344767',
                    fontSize: '0.875rem',
                  }
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.875rem', color: '#7b809a' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#7b809a' }}>
                      All Results
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="true" sx={{ fontSize: '0.875rem', color: '#f44336' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#f44336' }}>
                      Has Critical Issues
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="false" sx={{ fontSize: '0.875rem', color: '#4caf50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#4caf50' }}>
                      No Critical Issues
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              sx={{ 
                height: 40,
                borderRadius: '0.5rem',
                borderColor: '#e91e63',
                color: '#e91e63',
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'none',
                px: 2,
                '&:hover': {
                  borderColor: '#ad1457',
                  backgroundColor: 'rgba(233, 30, 99, 0.04)',
                },
                '& .MuiButton-startIcon': {
                  marginRight: '6px'
                }
              }}
            >
              Clear Filters
            </Button>
          </Stack>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Model Version</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Language Pair</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Score</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Test Cases</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Changes</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Critical</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Test Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#344767' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((result) => (
                <TableRow key={result.sqe_result_id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#344767' }}>
                      {result.model_version_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#7b809a' }}>
                      {result.language_pair_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getScoreChip(result.average_score)}
                  </TableCell>
                  <TableCell>
                    {getOverallStatus(result.average_score, result.has_one_point_case)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#344767' }}>
                      {result.total_test_cases}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getChangeIndicator(result.test_cases_changed, result.change_percentage)}
                  </TableCell>
                  <TableCell>
                    {result.has_one_point_case ? (
                      <Tooltip title="Has test cases with score 1">
                        <WarningIcon sx={{ color: '#f44336' }} />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                        No
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#7b809a' }}>
                      {formatDate(result.test_date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => onEditClick(result)}
                          sx={{ color: '#1976d2' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(result)}
                          sx={{ color: '#f44336' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {data && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={data.total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
          />
        )}

        {/* No data message */}
        {data && data.items.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <AssessmentIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#7b809a', mb: 1 }}>
              No SQE Results Found
            </Typography>
            <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
              {(languagePairFilter || criticalFilter !== '') 
                ? 'Try adjusting your filters or add a new result.'
                : 'Start by adding your first SQE test result.'
              }
            </Typography>
          </Box>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete SQE Result"
        message={`Are you sure you want to delete the SQE result for "${selectedResult?.model_version_name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedResult(null);
        }}
        isLoading={deleting}
        confirmText="Delete"
        confirmColor="error"
      />

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mx: 3, mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
    </Card>
  );
};

export default SQEResultsTable; 