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
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tabs,
  Tab,
  Typography,
  Badge,
  Avatar,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { getUsers, getPendingUsers, updateUser, deleteUser, approveUser } from '../services/api';
import { User } from '../types';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorDisplay from '../components/common/ErrorDisplay';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 0 }}>{children}</Box>}
    </div>
  );
};

const Users: React.FC = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingLoading, setIsPendingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Edit user role dialog
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Delete user dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Approve/reject dialog
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [userToApprove, setUserToApprove] = useState<User | null>(null);
  const [approveAction, setApproveAction] = useState<boolean>(true);
  const [isApproving, setIsApproving] = useState(false);

  // Fetch active users
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data.filter(user => user.status === 'active'));
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch pending users
  const fetchPendingUsers = async () => {
    try {
      setIsPendingLoading(true);
      setError(null);
      const data = await getPendingUsers();
      setPendingUsers(data);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setError('Failed to load pending users. Please try again.');
    } finally {
      setIsPendingLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchPendingUsers();
    }
  }, [isAdmin]);

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Open edit dialog
  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setOpenEditDialog(true);
  };

  // Close edit dialog
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedUser(null);
    setSelectedRole('');
  };

  // Handle role change
  const handleRoleChange = (event: SelectChangeEvent<string>) => {
    setSelectedRole(event.target.value);
  };

  // Update user role
  const handleUpdateRole = async () => {
    if (!selectedUser || selectedRole === selectedUser.role) {
      handleCloseEditDialog();
      return;
    }

    try {
      setIsUpdating(true);
      await updateUser(selectedUser.user_id, { role: selectedRole });
      await fetchUsers();
      handleCloseEditDialog();
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Open delete dialog
  const handleOpenDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setOpenDeleteDialog(true);
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await deleteUser(userToDelete.user_id);
      await fetchUsers();
      setOpenDeleteDialog(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open approve dialog
  const handleOpenApproveDialog = (user: User, approve: boolean) => {
    setUserToApprove(user);
    setApproveAction(approve);
    setOpenApproveDialog(true);
  };

  // Approve/reject user
  const handleApproveUser = async () => {
    if (!userToApprove) return;

    try {
      setIsApproving(true);
      await approveUser(userToApprove.user_id, approveAction);
      await fetchPendingUsers();
      if (approveAction) {
        await fetchUsers();
      }
      setOpenApproveDialog(false);
      setUserToApprove(null);
    } catch (err) {
      console.error('Error approving user:', err);
      setError('Failed to approve user. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'release_manager':
        return 'Release Manager';
      case 'member':
        return 'Member';
      default:
        return role;
    }
  };

  // Get role chip color and icon
  const getRoleColor = (role: string): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'release_manager':
        return 'primary';
      case 'member':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminIcon sx={{ fontSize: 16 }} />;
      case 'release_manager':
        return <PersonAddIcon sx={{ fontSize: 16 }} />;
      case 'member':
        return <PersonIcon sx={{ fontSize: 16 }} />;
      default:
        return <PersonIcon sx={{ fontSize: 16 }} />;
    }
  };

  if (isLoading && isPendingLoading) {
    return <LoadingIndicator message="Loading users..." />;
  }

  return (
    <Box sx={{ p: 0 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#344767',
                fontWeight: 600,
                mb: 0.5
              }}
            >
              User Management
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#67748e',
                fontSize: '0.875rem'
              }}
            >
              Manage user accounts and permissions across the system
            </Typography>
          </Box>
        </Stack>
        
        {error && (
          <ErrorDisplay 
            message={error} 
            onRetry={() => {
              fetchUsers();
              fetchPendingUsers();
            }} 
          />
        )}
      </Box>

      {/* Main Content Card */}
      <Card
        sx={{
          borderRadius: '1rem',
          boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
          border: '0px',
          background: '#fff',
          mb: 3,
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              px: 3,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                color: '#67748e',
                '&.Mui-selected': {
                  color: '#667eea',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#667eea',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab 
              icon={<PeopleIcon />}
              label="Active Users" 
              iconPosition="start"
              sx={{ mr: 2 }}
            />
            <Tab 
              icon={<PersonAddIcon />}
              label={
                <Badge badgeContent={pendingUsers.length} color="error" sx={{ paddingRight: 1 }}>
                  Pending Approvals
                </Badge>
              } 
              iconPosition="start"
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mr: 2,
                width: 32,
                height: 32
              }}>
                <PeopleIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                Active Users ({users.length})
              </Typography>
            </Box>

            {isLoading ? (
              <LoadingIndicator message="Loading active users..." />
            ) : (
              <TableContainer 
                sx={{
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        ID
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        Username
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        Email
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        Role
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        Created At
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                        textAlign: 'center'
                      }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell 
                          colSpan={6} 
                          align="center"
                          sx={{
                            py: 4,
                            color: '#67748e',
                            fontSize: '0.875rem'
                          }}
                        >
                          No active users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow 
                          key={user.user_id}
                          sx={{ '&:hover': { backgroundColor: 'rgba(94,114,228,0.04)' } }}
                        >
                          <TableCell sx={{ 
                            color: '#67748e',
                            fontSize: '0.875rem',
                            py: 2,
                          }}>
                            #{user.user_id}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#344767',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            py: 2,
                          }}>
                            {user.username}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#67748e',
                            fontSize: '0.875rem',
                            py: 2,
                          }}>
                            {user.email}
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Chip 
                              icon={getRoleIcon(user.role)}
                              label={getRoleDisplayName(user.role)} 
                              color={getRoleColor(user.role)}
                              size="small"
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.75rem'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#67748e',
                            fontSize: '0.875rem',
                            py: 2,
                          }}>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell sx={{ py: 2, textAlign: 'center' }}>
                            <Tooltip title="Edit Role">
                              <IconButton
                                onClick={() => handleOpenEditDialog(user)}
                                disabled={user.user_id === currentUser?.user_id}
                                sx={{
                                  color: '#667eea',
                                  '&:hover': {
                                    backgroundColor: 'rgba(94,114,228,0.08)',
                                  },
                                  '&:disabled': {
                                    color: 'rgba(0,0,0,0.26)',
                                  }
                                }}
                              >
                                <EditIcon sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete User">
                              <IconButton
                                onClick={() => handleOpenDeleteDialog(user)}
                                disabled={user.user_id === currentUser?.user_id}
                                sx={{
                                  color: '#dc3545',
                                  ml: 1,
                                  '&:hover': {
                                    backgroundColor: 'rgba(220,53,69,0.08)',
                                  },
                                  '&:disabled': {
                                    color: 'rgba(0,0,0,0.26)',
                                  }
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ 
                background: 'linear-gradient(135deg, #ffc107 0%, #ff8a00 100%)',
                mr: 2,
                width: 32,
                height: 32
              }}>
                <PersonAddIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#344767' }}>
                Pending Approvals ({pendingUsers.length})
              </Typography>
            </Box>

            {isPendingLoading ? (
              <LoadingIndicator message="Loading pending approvals..." />
            ) : (
              <TableContainer 
                sx={{
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        ID
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        Username
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        Email
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        Requested Role
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                      }}>
                        Registered At
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#344767',
                        fontSize: '0.875rem',
                        py: 2,
                        textAlign: 'center'
                      }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingUsers.length === 0 ? (
                      <TableRow>
                        <TableCell 
                          colSpan={6} 
                          align="center"
                          sx={{
                            py: 4,
                            color: '#67748e',
                            fontSize: '0.875rem'
                          }}
                        >
                          No pending approvals
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingUsers.map((user) => (
                        <TableRow 
                          key={user.user_id}
                          sx={{ '&:hover': { backgroundColor: 'rgba(255,193,7,0.04)' } }}
                        >
                          <TableCell sx={{ 
                            color: '#67748e',
                            fontSize: '0.875rem',
                            py: 2,
                          }}>
                            #{user.user_id}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#344767',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            py: 2,
                          }}>
                            {user.username}
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#67748e',
                            fontSize: '0.875rem',
                            py: 2,
                          }}>
                            {user.email}
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Chip 
                              icon={getRoleIcon(user.role)}
                              label={getRoleDisplayName(user.role)} 
                              color={getRoleColor(user.role)}
                              size="small"
                              sx={{
                                fontWeight: 500,
                                fontSize: '0.75rem'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#67748e',
                            fontSize: '0.875rem',
                            py: 2,
                          }}>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell sx={{ py: 2, textAlign: 'center' }}>
                            <Tooltip title="Approve User">
                              <IconButton
                                onClick={() => handleOpenApproveDialog(user, true)}
                                sx={{
                                  color: '#28a745',
                                  '&:hover': {
                                    backgroundColor: 'rgba(40,167,69,0.08)',
                                  }
                                }}
                              >
                                <CheckCircleIcon sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject User">
                              <IconButton
                                onClick={() => handleOpenApproveDialog(user, false)}
                                sx={{
                                  color: '#dc3545',
                                  ml: 1,
                                  '&:hover': {
                                    backgroundColor: 'rgba(220,53,69,0.08)',
                                  }
                                }}
                              >
                                <CancelIcon sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </TabPanel>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={handleCloseEditDialog}
        PaperProps={{
          sx: {
            borderRadius: '1rem',
            boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600, 
          color: '#344767',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          pb: 2
        }}>
          Change User Role
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <FormControl 
            fullWidth 
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '0.5rem',
                backgroundColor: '#fff',
                '& fieldset': {
                  borderColor: 'rgba(0,0,0,0.1)',
                  borderWidth: '1px',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(94,114,228,0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(94,114,228,0.8)',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#8392ab',
                fontSize: '0.875rem',
                '&.Mui-focused': {
                  color: 'rgba(94,114,228,0.8)',
                },
              },
              '& .MuiSelect-select': {
                color: '#344767',
                fontSize: '0.875rem',
                fontWeight: 500,
              },
            }}
          >
            <InputLabel id="edit-role-label">Role</InputLabel>
            <Select
              labelId="edit-role-label"
              value={selectedRole}
              label="Role"
              onChange={handleRoleChange}
              MenuProps={{
                PaperProps: {
                  sx: {
                    borderRadius: '0.5rem',
                    boxShadow: '0 20px 27px 0 rgb(0 0 0 / 5%)',
                    '& .MuiMenuItem-root': {
                      fontSize: '0.875rem',
                      color: '#344767',
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: 'rgba(94,114,228,0.08)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(94,114,228,0.12)',
                        '&:hover': {
                          backgroundColor: 'rgba(94,114,228,0.16)',
                        },
                      },
                    },
                  },
                },
              }}
            >
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="release_manager">Release Manager</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          borderTop: '1px solid rgba(0,0,0,0.05)',
          gap: 1
        }}>
          <Button 
            onClick={handleCloseEditDialog}
            sx={{
              borderColor: '#67748e',
              color: '#67748e',
              borderRadius: '0.5rem',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              fontSize: '0.875rem',
              '&:hover': {
                borderColor: '#5a6479',
                backgroundColor: 'rgba(103,116,142,0.08)',
              }
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRole}
            disabled={isUpdating}
            sx={{
              background: 'linear-gradient(90deg, rgba(94,114,228,1) 0%, rgba(130,94,228,1) 100%)',
              boxShadow: '0 3px 5px -1px rgba(94,114,228,.2), 0 6px 10px 0 rgba(94,114,228,.14), 0 1px 18px 0 rgba(94,114,228,.12)',
              borderRadius: '0.5rem',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              fontSize: '0.875rem',
              '&:hover': {
                background: 'linear-gradient(90deg, rgba(84,104,218,1) 0%, rgba(120,84,218,1) 100%)',
              },
              '&:disabled': {
                background: 'rgba(0,0,0,0.12)',
                color: 'rgba(0,0,0,0.26)',
              }
            }}
            variant="contained"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={openDeleteDialog}
        title="Delete User"
        message={`Are you sure you want to delete the user "${userToDelete?.username}"? This action cannot be undone.`}
        onConfirm={handleDeleteUser}
        onCancel={() => {
          setOpenDeleteDialog(false);
          setUserToDelete(null);
        }}
        isLoading={isDeleting}
        confirmText="Delete"
        confirmColor="error"
      />
      
      {/* Confirm Approve/Reject Dialog */}
      <ConfirmDialog
        open={openApproveDialog}
        title={approveAction ? "Approve User" : "Reject User"}
        message={`Are you sure you want to ${approveAction ? 'approve' : 'reject'} the user "${userToApprove?.username}"?${
          approveAction ? '' : ' The user will not be able to log in if rejected.'
        }`}
        onConfirm={handleApproveUser}
        onCancel={() => {
          setOpenApproveDialog(false);
          setUserToApprove(null);
        }}
        isLoading={isApproving}
        confirmText={approveAction ? "Approve" : "Reject"}
        confirmColor={approveAction ? "success" : "error"}
      />
    </Box>
  );
};

export default Users; 