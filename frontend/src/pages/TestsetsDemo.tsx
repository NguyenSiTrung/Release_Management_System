import React from 'react';
import { Container, Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { TestsetsTab } from '../components/Testsets';

const TestsetsDemoPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Link color="inherit" href="/">
          Dashboard
        </Link>
        <Typography color="text.primary">Testsets Demo</Typography>
      </Breadcrumbs>

      {/* Page Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Testsets Management Demo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Demonstrating the new TestsetsTab component with modern Material-UI design
        </Typography>
      </Box>

      {/* TestsetsTab Component */}
      <TestsetsTab />
    </Container>
  );
};

export default TestsetsDemoPage; 