import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface ErrorDisplayProps {
  message: any; // Allow any type to handle different error formats
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  // Format message to ensure it's a string
  const formatMessage = (msg: any): string => {
    if (typeof msg === 'string') {
      return msg;
    } else if (msg === null || msg === undefined) {
      return 'An unknown error occurred';
    } else if (typeof msg === 'object') {
      try {
        // Special handling for known error object types
        if (msg.type && msg.loc && msg.msg) {
          return `Validation error: ${msg.msg}`;
        }
        
        // Check for error with detail
        if (msg.detail) {
          return typeof msg.detail === 'string' 
            ? msg.detail 
            : formatMessage(msg.detail); // Handle nested objects
        }
        
        // Check for error with message
        if (msg.message) {
          return typeof msg.message === 'string' 
            ? msg.message 
            : formatMessage(msg.message);
        }
        
        // Last resort - stringify
        return JSON.stringify(msg);
      } catch (e) {
        return 'An error object occurred';
      }
    } else {
      return String(msg);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        my: 2,
      }}
    >
      <ErrorIcon color="error" sx={{ fontSize: 48 }} />
      <Typography variant="h6" color="error" sx={{ mt: 2, textAlign: 'center' }}>
        Error
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, textAlign: 'center' }}>
        {formatMessage(message)}
      </Typography>
      {onRetry && (
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" onClick={onRetry}>
            Try Again
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default ErrorDisplay; 