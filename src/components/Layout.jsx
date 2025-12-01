import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ShoppingCart, ClipboardList, Wallet, Gauge, BarChart3, List } from 'lucide-react';

const Layout = ({ children, userName, onLogout, userRole }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: BarChart3, show: userRole === 'admin' },
        { path: '/sales', label: 'New Order', icon: ShoppingCart, show: userRole !== 'admin' },
        { path: '/orders', label: 'Orders', icon: ClipboardList, show: true },
        { path: '/collections', label: 'Collections', icon: Wallet, show: true },
        { path: '/meter', label: 'Meter', icon: Gauge, show: true },
        { path: '/summary', label: 'Summary', icon: List, show: userRole === 'admin' },
        { path: '/pending-items', label: 'Item Details', icon: List, show: userRole === 'admin' },
    ];

    const visibleNavItems = navItems.filter(item => item.show);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 md:py-4 shadow-lg sticky top-0 z-20">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
                                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="font-bold text-base md:text-lg leading-tight truncate">Sales Portal</h1>
                                <p className="text-xs text-blue-100 opacity-90 truncate">Welcome, {userName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 md:px-4 py-2 rounded-lg transition-colors text-sm font-medium backdrop-blur-sm flex-shrink-0 ml-2"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-1 mt-4 flex-wrap gap-y-2">
                        {visibleNavItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${isActive(item.path)
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-3 md:p-4">
                {children}
            </main>

            {/* Mobile Bottom Navigation - Scrollable */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex px-2 py-2 min-w-max">
                        {visibleNavItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-[70px] ${isActive(item.path)
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <item.icon className={`w-6 h-6 ${isActive(item.path) ? 'fill-current' : ''}`} />
                                <span className="text-[10px] font-medium mt-1 text-center leading-tight">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;