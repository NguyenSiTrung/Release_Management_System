import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogActions,
  LinearProgress,
  Typography,
  Box,
  Button,
  Paper,
  Divider,
  Alert,
  Grid
} from '@mui/material';
import { EvaluationStatus, EvaluationJobStatus } from '../../types';
import { getEvaluationStatus } from '../../services/evaluationService';

interface EvaluationProgressProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
}

const EvaluationProgress: React.FC<EvaluationProgressProps> = ({ 
  open, 
  onClose, 
  jobId 
}) => {
  const [jobStatus, setJobStatus] = useState<EvaluationJobStatus | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Poll for status updates
  useEffect(() => {
    if (!open || !jobId) return;

    const fetchStatus = async () => {
      try {
        const status = await getEvaluationStatus(jobId);
        setJobStatus(status);
        setLoadingError(null);
        
        // Debug logging to check response data
        if (status.status === 'COMPLETED' && status.result) {
          console.log('=== DEBUG: Evaluation completed ===');
          console.log('evaluation_model_type:', status.evaluation_model_type);
          console.log('result object:', status.result);
          console.log('base_model_result:', status.result.base_model_result);
          console.log('Condition check:', status.evaluation_model_type === 'both' && status.result.base_model_result);
        }
      } catch (err: any) {
        console.error('Failed to fetch evaluation status:', err);
        setLoadingError(err.response?.data?.detail || 'Failed to load evaluation status');
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling interval
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000); // Poll every 3 seconds

    // Clean up on unmount or when dialog closes
    return () => {
      clearInterval(interval);
    };
  }, [open, jobId]);

  // Get status message based on current status
  const getStatusMessage = (status: EvaluationStatus) => {
    switch (status) {
      case EvaluationStatus.PENDING:
        return 'Evaluation requested. Waiting to start...';
      case EvaluationStatus.PREPARING_SETUP:
        return 'Preparing setup for evaluation...';
      case EvaluationStatus.PREPARING_ENGINE:
        return 'Setting up translation engine...';
      case EvaluationStatus.RUNNING_ENGINE:
        return 'Running translation engine. This may take several minutes...';
      case EvaluationStatus.CALCULATING_METRICS:
        return 'Calculating BLEU and COMET scores...';
      case EvaluationStatus.COMPLETED:
        return 'Evaluation completed successfully!';
      case EvaluationStatus.FAILED:
        return 'Evaluation failed.';
      default:
        return 'Unknown status';
    }
  };

  const isEvaluationFinished = jobStatus?.status === EvaluationStatus.COMPLETED || 
                              jobStatus?.status === EvaluationStatus.FAILED;

  return (
    <Dialog 
      open={open} 
      onClose={isEvaluationFinished ? onClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Evaluation Progress
        {jobStatus && (
          <Typography variant="subtitle2" color="text.secondary">
            Job ID: {jobId}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent>
        {loadingError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loadingError}
          </Alert>
        )}
        
        {!jobStatus && !loadingError && (
          <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Loading evaluation status...
            </Typography>
            <LinearProgress />
          </Box>
        )}
        
        {jobStatus && (
          <>
            <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  {getStatusMessage(jobStatus.status)}
                </Typography>
                <Typography variant="body2">
                  {jobStatus.progress_percentage}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={jobStatus.progress_percentage} 
                color={jobStatus.status === EvaluationStatus.FAILED ? 'error' : 'primary'}
              />
            </Box>
            
            {jobStatus.status === EvaluationStatus.FAILED && jobStatus.error_message && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Error:</Typography>
                <Typography variant="body2">{jobStatus.error_message}</Typography>
              </Alert>
            )}
            
            {jobStatus.status === EvaluationStatus.COMPLETED && jobStatus.result && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>Results</Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* Display mode type if available */}
                {jobStatus.mode_type && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Mode: {jobStatus.mode_type}
                      {jobStatus.sub_mode_type && ` (${jobStatus.sub_mode_type})`}
                    </Typography>
                  </Box>
                )}
                
                {/* Display model type if available */}
                {jobStatus.evaluation_model_type && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Model Type: {
                        jobStatus.evaluation_model_type === 'finetuned' ? 'Finetuned Model (GRPO+ORPO)' :
                        jobStatus.evaluation_model_type === 'base' ? 'Base Model' :
                        'Both Models (Comparison)'
                      }
                    </Typography>
                  </Box>
                )}
                
                {/* If both models were evaluated, show comparison */}
                {jobStatus.evaluation_model_type === 'both' && jobStatus.result.base_model_result ? (
                  <>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Model Comparison
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper 
                          variant="outlined" 
                          sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}
                        >
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            Base Model
                          </Typography>
                          
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">BLEU Score</Typography>
                            <Typography variant="h5">
                              {jobStatus.result.base_model_result.bleu_score.toFixed(2)}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">COMET Score</Typography>
                            <Typography variant="h5">
                              {jobStatus.result.base_model_result.comet_score.toFixed(2)}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            height: '100%', 
                            bgcolor: 'primary.light', 
                            color: 'primary.contrastText'
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ color: 'inherit' }} gutterBottom>
                            Finetuned Model (GRPO+ORPO)
                          </Typography>
                          
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: 'inherit' }}>BLEU Score</Typography>
                            <Typography variant="h5" sx={{ color: 'inherit' }}>
                              {jobStatus.result.bleu_score.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                              {(jobStatus.result.bleu_score - jobStatus.result.base_model_result.bleu_score).toFixed(2)} points difference
                            </Typography>
                          </Box>
                          
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: 'inherit' }}>COMET Score</Typography>
                            <Typography variant="h5" sx={{ color: 'inherit' }}>
                              {jobStatus.result.comet_score.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                              {(jobStatus.result.comet_score - jobStatus.result.base_model_result.comet_score).toFixed(2)} points difference
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                      
                      {jobStatus.result.added_to_details && (
                        <Grid item xs={12}>
                          <Alert severity="success" sx={{ mt: 1 }}>
                            Results have been added to Training Results
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  </>
                ) : (
                  // Standard single model display
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">BLEU Score</Typography>
                      <Typography variant="h5" color="primary">
                        {jobStatus.result.bleu_score.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">COMET Score</Typography>
                      <Typography variant="h5" color="primary">
                        {jobStatus.result.comet_score.toFixed(2)}
                      </Typography>
                    </Grid>
                    
                    {jobStatus.result.added_to_details && (
                      <Grid item xs={12}>
                        <Alert severity="success" sx={{ mt: 1 }}>
                          Results have been added to Training Results
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Paper>
            )}
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Started: {new Date(jobStatus.requested_at).toLocaleString()}
              </Typography>
              {jobStatus.completed_at && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Completed: {new Date(jobStatus.completed_at).toLocaleString()}
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={!isEvaluationFinished && !loadingError}
        >
          {isEvaluationFinished ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvaluationProgress; 