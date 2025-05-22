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
  Paper,
  Button
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Training Results</Typography>
        {onAddClick && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={onAddClick}
          >
            Add Training Result
          </Button>
        )}
      </Box>
      
      {trainingResults.length === 0 ? (
        <Typography color="text.secondary">No training results available for this model version.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Testset</TableCell>
                <TableCell>Base BLEU</TableCell>
                <TableCell>Base COMET</TableCell>
                <TableCell>Finetuned BLEU</TableCell>
                <TableCell>Finetuned COMET</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trainingResults.map((result) => (
                <TableRow key={result.result_id}>
                  <TableCell>{getTestsetName(result.testset_id)}</TableCell>
                  <TableCell>{result.base_model_bleu !== null ? result.base_model_bleu.toFixed(2) : '-'}</TableCell>
                  <TableCell>{result.base_model_comet !== null ? result.base_model_comet.toFixed(4) : '-'}</TableCell>
                  <TableCell>{result.finetuned_model_bleu !== null ? result.finetuned_model_bleu.toFixed(2) : '-'}</TableCell>
                  <TableCell>{result.finetuned_model_comet !== null ? result.finetuned_model_comet.toFixed(4) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default TrainingResults; 