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

  Alert,
  Grid,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Speed as SpeedIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 4
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontWeight: 600,
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <PlayArrowIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Evaluation Progress
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Job ID: {jobId} • Real-time status monitoring
          </Typography>
        </Box>
        {isEvaluationFinished && (
          <Button
            onClick={onClose}
            sx={{ 
              color: 'white', 
              minWidth: 'auto',
              p: 1,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <CloseIcon />
          </Button>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {loadingError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {loadingError}
          </Alert>
        )}
        
        {!jobStatus && !loadingError && (
          <Card sx={{ borderRadius: 3, boxShadow: 2, mb: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Avatar sx={{ 
                width: 56, 
                height: 56, 
                mx: 'auto', 
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              }}>
                <CircularProgress size={30} sx={{ color: 'white' }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Loading Evaluation Status
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fetching real-time progress data...
              </Typography>
            </CardContent>
          </Card>
        )}
        
        {jobStatus && (
          <>
            {/* Status Progress Card */}
            <Card sx={{ borderRadius: 3, boxShadow: 2, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ 
                    backgroundColor: jobStatus.status === EvaluationStatus.FAILED ? 'error.main' :
                                   jobStatus.status === EvaluationStatus.COMPLETED ? 'success.main' : 'info.main'
                  }}>
                    {jobStatus.status === EvaluationStatus.FAILED ? <ErrorIcon /> :
                     jobStatus.status === EvaluationStatus.COMPLETED ? <CheckIcon /> : <SpeedIcon />}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {getStatusMessage(jobStatus.status)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Progress: {jobStatus.progress_percentage}%
                    </Typography>
                  </Box>
                  <Chip 
                    label={`${jobStatus.progress_percentage}%`}
                    color={jobStatus.status === EvaluationStatus.FAILED ? 'error' : 
                           jobStatus.status === EvaluationStatus.COMPLETED ? 'success' : 'primary'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={jobStatus.progress_percentage} 
                  color={jobStatus.status === EvaluationStatus.FAILED ? 'error' : 'primary'}
                  sx={{ 
                    height: 8, 
                    borderRadius: 2,
                    backgroundColor: 'rgba(0,0,0,0.1)'
                  }}
                />
              </CardContent>
            </Card>
            
            {jobStatus.status === EvaluationStatus.FAILED && jobStatus.error_message && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Error Details:
                </Typography>
                <Typography variant="body2">{jobStatus.error_message}</Typography>
              </Alert>
            )}
            
            {jobStatus.status === EvaluationStatus.COMPLETED && jobStatus.result && (
              <Card sx={{ borderRadius: 3, boxShadow: 2, mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar sx={{ 
                      width: 56, 
                      height: 56,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    }}>
                      <AnalyticsIcon sx={{ fontSize: 30 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Evaluation Results
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Performance metrics and analysis
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Configuration Info */}
                  <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    {jobStatus.mode_type && (
                      <Chip 
                        label={`Mode: ${jobStatus.mode_type}${jobStatus.sub_mode_type ? ` (${jobStatus.sub_mode_type})` : ''}`}
                        color="info" 
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                      />
                    )}
                    {jobStatus.evaluation_model_type && (
                      <Chip 
                        label={
                          jobStatus.evaluation_model_type === 'finetuned' ? 'Finetuned Model (GRPO+ORPO)' :
                          jobStatus.evaluation_model_type === 'base' ? 'Base Model' :
                          'Both Models (Comparison)'
                        }
                        color="primary" 
                        sx={{ borderRadius: 2, fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                
                                  {/* If both models were evaluated, show comparison */}
                  {jobStatus.evaluation_model_type === 'both' && jobStatus.result.base_model_result ? (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                        Model Comparison
                      </Typography>
                      
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Card 
                            variant="outlined" 
                            sx={{ 
                              height: '100%', 
                              borderRadius: 3,
                              borderColor: 'grey.300',
                              '&:hover': { 
                                borderColor: 'grey.400',
                                boxShadow: 2 
                              }
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Avatar sx={{ backgroundColor: 'grey.500' }}>
                                  <AssessmentIcon />
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  Base Model
                                </Typography>
                              </Box>
                              
                              <Stack spacing={2}>
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    BLEU Score
                                  </Typography>
                                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                                    {jobStatus.result.base_model_result.bleu_score.toFixed(2)}
                                  </Typography>
                                </Box>
                                
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    COMET Score
                                  </Typography>
                                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                                    {jobStatus.result.base_model_result.comet_score.toFixed(2)}
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card 
                            sx={{ 
                              height: '100%', 
                              borderRadius: 3,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              '&:hover': { 
                                transform: 'translateY(-2px)',
                                boxShadow: 4 
                              },
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                  <AssessmentIcon />
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit' }}>
                                  Finetuned Model (GRPO+ORPO)
                                </Typography>
                              </Box>
                              
                              <Stack spacing={2}>
                                <Box>
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                                    BLEU Score
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'inherit' }}>
                                      {jobStatus.result.bleu_score.toFixed(2)}
                                    </Typography>
                                    {jobStatus.result.bleu_score > jobStatus.result.base_model_result.bleu_score ? (
                                      <TrendingUpIcon sx={{ color: 'success.light' }} />
                                    ) : (
                                      <TrendingDownIcon sx={{ color: 'error.light' }} />
                                    )}
                                  </Box>
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {(jobStatus.result.bleu_score - jobStatus.result.base_model_result.bleu_score).toFixed(2)} points difference
                                  </Typography>
                                </Box>
                                
                                <Box>
                                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1 }}>
                                    COMET Score
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'inherit' }}>
                                      {jobStatus.result.comet_score.toFixed(2)}
                                    </Typography>
                                    {jobStatus.result.comet_score > jobStatus.result.base_model_result.comet_score ? (
                                      <TrendingUpIcon sx={{ color: 'success.light' }} />
                                    ) : (
                                      <TrendingDownIcon sx={{ color: 'error.light' }} />
                                    )}
                                  </Box>
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                    {(jobStatus.result.comet_score - jobStatus.result.base_model_result.comet_score).toFixed(2)} points difference
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      
                        {jobStatus.result.added_to_details && (
                          <Grid item xs={12}>
                            <Alert severity="success" sx={{ borderRadius: 2, mt: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Results have been added to Training Results
                              </Typography>
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </>
                  ) : (
                    // Standard single model display
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                          <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <Avatar sx={{ 
                              backgroundColor: 'info.main', 
                              width: 48, 
                              height: 48, 
                              mx: 'auto', 
                              mb: 2 
                            }}>
                              <AssessmentIcon />
                            </Avatar>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              BLEU Score
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {jobStatus.result.bleu_score.toFixed(2)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                          <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <Avatar sx={{ 
                              backgroundColor: 'success.main', 
                              width: 48, 
                              height: 48, 
                              mx: 'auto', 
                              mb: 2 
                            }}>
                              <AnalyticsIcon />
                            </Avatar>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              COMET Score
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 600, color: 'primary.main' }}>
                              {jobStatus.result.comet_score.toFixed(2)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      {jobStatus.result.added_to_details && (
                        <Grid item xs={12}>
                          <Alert severity="success" sx={{ borderRadius: 2, mt: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Results have been added to Training Results
                            </Typography>
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Timing Information */}
            <Card variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Job Timeline
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Started: {new Date(jobStatus.requested_at).toLocaleString()}
                  </Typography>
                  {jobStatus.completed_at && (
                    <Typography variant="body2" color="text.secondary">
                      Completed: {new Date(jobStatus.completed_at).toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button 
          onClick={onClose}
          disabled={!isEvaluationFinished && !loadingError}
          variant={isEvaluationFinished ? "contained" : "outlined"}
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1.5,
            fontWeight: 600,
            textTransform: 'none',
            ...(isEvaluationFinished && {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                transform: 'translateY(-1px)',
                boxShadow: 3
              }
            })
          }}
        >
          {isEvaluationFinished ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvaluationProgress; 