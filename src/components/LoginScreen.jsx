import React, { useState } from 'react';
import { User, Lock, Briefcase, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LoginScreen = ({ onLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('sales');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        if (selectedRole === 'admin') {
            if (password !== 'admin8610') {
                alert('Invalid admin password');
                return;
            }
            onLogin('admin@system.com', selectedRole);
        } else {
            if (!name || !email) {
                alert('Please enter name and email');
                return;
            }
            onLogin(email, selectedRole);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-200 transform rotate-3">
                            <Briefcase className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Portal</h1>
                        <p className="text-gray-500">Welcome back! Please login to continue.</p>
                    </div>

                    <div className="mb-8">
                        <p className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Select Role</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setSelectedRole('sales')}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${selectedRole === 'sales'
                                    ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md'
                                    : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <User className="w-8 h-8" />
                                <span className="font-semibold">Sales Team</span>
                            </button>
                            <button
                                onClick={() => setSelectedRole('admin')}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 ${selectedRole === 'admin'
                                    ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md'
                                    : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <Crown className="w-8 h-8" />
                                <span className="font-semibold">Admin</span>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {selectedRole === 'sales' ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold">@</div>
                                        <input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-gray-50 focus:bg-white"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Admin Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="password"
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-gray-50 focus:bg-white"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:shadow-blue-300 transform transition-all active:scale-[0.98] mt-4"
                        >
                            Start Working
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/purchase-login')}
                            className="text-sm text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                            For Purchase only
                        </button>
                    </div>
                </div>
            </div>
            <p className="mt-8 text-sm text-gray-400">© 2025 Sales Management System</p>
        </div>
    );
};

export default LoginScreen;
