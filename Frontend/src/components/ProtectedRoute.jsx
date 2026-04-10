import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Spinner from './Spinner';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-text2">
          <Spinner size={7} />
          <span className="text-sm">Refreshing session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;

