import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings,
  X,
  Stethoscope
} from 'lucide-react';
import { ROUTES } from '../utils/constants';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: ROUTES.DASHBOARD,
      description: 'Overview & quick actions'
    },
    { 
      icon: Calendar, 
      label: 'Schedule', 
      path: ROUTES.SCHEDULE,
      description: 'Appointments & slots'
    },
    { 
      icon: Users, 
      label: 'Patients', 
      path: '/patients',
      description: 'Patient records'
    },
    { 
      icon: BarChart3, 
      label: 'Analytics', 
      path: ROUTES.ANALYTICS,
      description: 'Reports & insights'
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      path: ROUTES.SETTINGS,
      description: 'Preferences & profile'
    },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HealBridge</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg
                    transition-all duration-200 group
                    ${active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon
                    className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'}`}
                  />
                  <div className="flex-1">
                    <div className={`font-medium ${active ? 'text-blue-700' : 'text-gray-900'}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  {active && (
                    <div className="w-1 h-8 bg-blue-600 rounded-full absolute right-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs text-gray-500 text-center">
            Version 1.0.0
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

