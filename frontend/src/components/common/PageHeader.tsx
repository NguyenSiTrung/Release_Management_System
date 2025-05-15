import React, { ReactNode } from 'react';
import { Box, Typography, Button, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface ActionButton {
  text: string;
  onClick: () => void;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ActionButton | ReactNode;
  children?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs, action, children }) => {
  // Log outside the JSX
  console.log('PageHeader component received action:', action);
  
  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast ? (
              <Typography color="text.primary" key={item.label}>
                {item.label}
              </Typography>
            ) : (
              <MuiLink
                component={RouterLink}
                to={item.path || '#'}
                underline="hover"
                color="inherit"
                key={item.label}
              >
                {item.label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {action && (
          <>
            {/* Check if action is an ActionButton object */}
            {typeof action === 'object' && 'text' in action ? (
              <Button 
                variant="contained" 
                onClick={(action as ActionButton).onClick}
                disabled={(action as ActionButton).disabled}
              >
                {(action as ActionButton).text}
              </Button>
            ) : (
              /* Render custom ReactNode */
              action
            )}
          </>
        )}
      </Box>
      
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Box>
  );
};

export default PageHeader; 