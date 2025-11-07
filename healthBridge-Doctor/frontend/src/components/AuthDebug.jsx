import { useAuth } from '../context/AuthContext';

const AuthDebug = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="p-4 bg-gray-100 rounded">Loading auth state...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div className="space-y-1 text-sm">
        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>User ID: {user?.uid || 'None'}</div>
        <div>Phone: {user?.phoneNumber || 'None'}</div>
        <div>Doctor ID: {user?.doctorId || 'None'}</div>
      </div>
    </div>
  );
};

export default AuthDebug;