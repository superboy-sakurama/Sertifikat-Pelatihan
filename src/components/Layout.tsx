import { Link, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  // Simple mock auth state - typically this would be a React Context
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                CertManager
              </Link>
              <nav className="ml-10 flex gap-4">
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium text-sm">Dashboard</Link>
                {user.Role === 'Admin' && (
                  <Link to="/admin" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium text-sm">Admin Panel</Link>
                )}
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User size={16} />
                <span>{user.Nama}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
