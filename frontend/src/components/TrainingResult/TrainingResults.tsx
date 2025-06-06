import React from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button,
  Card,
  Avatar,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { TrainingResult, Testset } from '../../types';

interface TrainingResultsProps {
  versionId: number;
  trainingResults: TrainingResult[];
  testsets?: Testset[];
  onRefresh: () => void;
  onAddClick?: () => void;
}

const TrainingResults: React.FC<TrainingResultsProps> = ({ 
  versionId, 
  trainingResults,
  testsets = [],
  onRefresh,
  onAddClick
}) => {
  // Get testset name from id
  const getTestsetName = (testsetId: number): string => {
    const testset = testsets.find(t => t.testset_id === testsetId);
    return testset ? testset.testset_name : `Testset ID: ${testsetId}`;
  };

  // Compare scores to determine improvement
  const getScoreComparison = (baseScore: number | null, finetunedScore: number | null) => {
    if (baseScore === null || finetunedScore === null) return null;
    return finetunedScore > baseScore ? 'improved' : finetunedScore < baseScore ? 'declined' : 'same';
  };

  const renderScoreCell = (baseScore: number | null, finetunedScore: number | null, decimals: number = 2) => {
    const comparison = getScoreComparison(baseScore, finetunedScore);
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Base: {baseScore !== null ? baseScore.toFixed(decimals) : '-'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Finetuned: {finetunedScore !== null ? finetunedScore.toFixed(decimals) : '-'}
          </Typography>
          {comparison === 'improved' && <TrendingUpIcon fontSize="small" color="success" />}
          {comparison === 'declined' && <TrendingDownIcon fontSize="small" color="error" />}
        </Box>
        {comparison && comparison !== 'same' && (
          <Chip
            label={comparison === 'improved' ? 'Improved' : 'Declined'}
            size="small"
            color={comparison === 'improved' ? 'success' : 'error'}
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        )}
      </Box>
    );
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              width: 56,
              height: 56,
              mr: 2
            }}
          >
            <AssessmentIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Training Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Performance comparison between base and finetuned models
            </Typography>
          </Box>
          {onAddClick && (
            <Button 
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddClick}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: 3
                }
              }}
            >
              Add Training Result
            </Button>
          )}
        </Box>
        
        {trainingResults.length === 0 ? (
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
            <AssessmentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography color="text.secondary" variant="body1">
              No training results available for this model version.
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Add training results to see performance comparisons.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8f9fa' }}>
                    Testset
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8f9fa' }}>
                    BLEU Score
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8f9fa' }}>
                    COMET Score
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trainingResults.map((result) => (
                  <TableRow 
                    key={result.result_id}
                    sx={{ 
                      '&:hover': { backgroundColor: '#f8f9fa' },
                      '&:last-child td': { border: 0 }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, backgroundColor: 'primary.main' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {getTestsetName(result.testset_id).charAt(0).toUpperCase()}
                          </Typography>
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {getTestsetName(result.testset_id)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {renderScoreCell(result.base_model_bleu, result.finetuned_model_bleu, 2)}
                    </TableCell>
                    <TableCell>
                      {renderScoreCell(result.base_model_comet, result.finetuned_model_comet, 4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Card>
  );
};

export default TrainingResults; 