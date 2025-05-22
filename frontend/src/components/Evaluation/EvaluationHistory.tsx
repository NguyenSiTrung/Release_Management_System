import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { EvaluationJob, EvaluationStatus } from '../../types';
import { getEvaluationJobs } from '../../services/evaluationService';

interface EvaluationHistoryProps {
  versionId: number;
  onViewJob: (jobId: number) => void;
}

const EvaluationHistory: React.FC<EvaluationHistoryProps> = ({ versionId, onViewJob }) => {
  const [jobs, setJobs] = useState<EvaluationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const result = await getEvaluationJobs({ version_id: versionId });
        setJobs(result);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch evaluation jobs:', err);
        setError(err.response?.data?.detail || 'Failed to load evaluation history');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [versionId]);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography>Loading evaluation history...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (jobs.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No evaluation jobs found for this model version.
      </Alert>
    );
  }

  return (
    <Paper variant="outlined" sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
        Evaluation History
      </Typography>
      
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job ID</TableCell>
              <TableCell>Testset</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Model Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>BLEU</TableCell>
              <TableCell>COMET</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.job_id}>
                <TableCell>{job.job_id}</TableCell>
                <TableCell>{job.testset_name || `-`}</TableCell>
                <TableCell>{job.mode_type || 'Default'}</TableCell>
                <TableCell>
                  {job.evaluation_model_type === 'finetuned' ? 'Finetuned' :
                   job.evaluation_model_type === 'base' ? 'Base' :
                   job.evaluation_model_type === 'both' ? 'Both' :
                   'Finetuned'}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={job.status} 
                    color={getStatusColor(job.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {job.bleu_score !== null && job.bleu_score !== undefined 
                    ? job.bleu_score.toFixed(2) 
                    : '-'}
                </TableCell>
                <TableCell>
                  {job.comet_score !== null && job.comet_score !== undefined 
                    ? job.comet_score.toFixed(4) 
                    : '-'}
                </TableCell>
                <TableCell>
                  {new Date(job.requested_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => onViewJob(job.job_id)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default EvaluationHistory; 