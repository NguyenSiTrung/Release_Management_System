import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
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
  Badge
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { getUsers, getPendingUsers, updateUser, deleteUser, approveUser } from '../services/api';
import { User } from '../types';
import PageHeader from '../components/common/PageHeader';
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
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
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
  
  // Approve or reject user
  const handleApproveUser = async () => {
    if (!userToApprove) return;
    
    try {
      setIsApproving(true);
      await approveUser(userToApprove.user_id, approveAction);
      
      // Refresh both user lists
      await fetchPendingUsers();
      await fetchUsers();
      
      setOpenApproveDialog(false);
      setUserToApprove(null);
    } catch (err) {
      console.error('Error approving/rejecting user:', err);
      setError(`Failed to ${approveAction ? 'approve' : 'reject'} user. Please try again.`);
    } finally {
      setIsApproving(false);
    }
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'release_manager':
        return 'Release Manager';
      case 'member':
        return 'Member';
      default:
        return role;
    }
  };

  // Get role color
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

  if (isLoading && isPendingLoading) {
    return <LoadingIndicator message="Loading users..." />;
  }

  return (
    <Box>
      <PageHeader title="User Management" />

      {error && (
        <ErrorDisplay 
          message={error} 
          onRetry={() => {
            fetchUsers();
            fetchPendingUsers();
          }} 
        />
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="user management tabs">
            <Tab label="Active Users" id="user-tab-0" aria-controls="user-tabpanel-0" />
            <Tab 
              label={
                <Badge badgeContent={pendingUsers.length} color="error" sx={{ paddingRight: 1 }}>
                  Pending Approvals
                </Badge>
              } 
              id="user-tab-1" 
              aria-controls="user-tabpanel-1" 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {isLoading ? (
            <LoadingIndicator message="Loading active users..." />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No active users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>{user.user_id}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={getRoleDisplayName(user.role)} 
                            color={getRoleColor(user.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEditDialog(user)}
                            disabled={user.user_id === currentUser?.user_id}
                            title="Edit Role"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDeleteDialog(user)}
                            disabled={user.user_id === currentUser?.user_id}
                            title="Delete User"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {isPendingLoading ? (
            <LoadingIndicator message="Loading pending approvals..." />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Requested Role</TableCell>
                    <TableCell>Registered At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No pending approvals
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>{user.user_id}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={getRoleDisplayName(user.role)} 
                            color={getRoleColor(user.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="success"
                            onClick={() => handleOpenApproveDialog(user, true)}
                            title="Approve User"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleOpenApproveDialog(user, false)}
                            title="Reject User"
                          >
                            <CancelIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      {/* Edit Role Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog}>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="edit-role-label">Role</InputLabel>
            <Select
              labelId="edit-role-label"
              value={selectedRole}
              label="Role"
              onChange={handleRoleChange}
            >
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="release_manager">Release Manager</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            color="primary"
            disabled={isUpdating}
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