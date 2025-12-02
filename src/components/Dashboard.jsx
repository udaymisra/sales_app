import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { BarChart, PieChart, Activity, TrendingUp, Users, Package } from 'lucide-react';

const Dashboard = ({ userName, userRole }) => {
    const [orders, setOrders] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        const ordersRef = db.ref('orders');
        const collectionsRef = db.ref('collections');

        const fetchData = async () => {
            try {
                const ordersSnapshot = await ordersRef.once('value');
                const collectionsSnapshot = await collectionsRef.once('value');

                const ordersData = ordersSnapshot.val() ? Object.values(ordersSnapshot.val()) : [];
                const collectionsData = collectionsSnapshot.val() ? Object.values(collectionsSnapshot.val()) : [];

                setOrders(ordersData);
                setCollections(collectionsData);
            } catch (error) {
                console.error("Error fetching dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    // --- Calculations ---

    const filteredOrders = orders.filter(o => {
        if (monthFilter === 'all') return true;
        if (!o.timestamp) return false;
        const d = new Date(o.timestamp);
        if (isNaN(d.getTime())) return false;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}` === monthFilter;
    });

    const filteredCollections = collections.filter(c => {
        if (monthFilter === 'all') return true;
        if (!c.date) return false;
        const d = new Date(c.date);
        if (isNaN(d.getTime())) return false;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}` === monthFilter;
    });

    // 1. Total Sales & Collections
    const totalSales = filteredOrders.reduce((sum, o) => sum + (o.finalTotal || o.total || 0), 0);
    const totalCollected = filteredCollections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const totalPending = totalSales - totalCollected; // Rough estimate, better to sum unpaid orders

    // 2. Sales by Salesman
    const salesBySalesman = filteredOrders.reduce((acc, order) => {
        const salesman = order.salesman || 'Unknown';
        acc[salesman] = (acc[salesman] || 0) + (order.finalTotal || order.total || 0);
        return acc;
    }, {});

    const sortedSalesmen = Object.entries(salesBySalesman).sort((a, b) => b[1] - a[1]);
    const maxSales = Math.max(...Object.values(salesBySalesman), 1); // Avoid div by zero

    // 3. Order Status Distribution
    const statusCounts = filteredOrders.reduce((acc, order) => {
        const status = order.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    const totalOrders = filteredOrders.length;

    // 4. Recent Activity (Last 5 orders)
    // Filter out duplicates (same customer, same amount, same timestamp)
    const uniqueOrders = filteredOrders.filter((order, index, self) =>
        index === self.findIndex((t) => (
            t.customerName === order.customerName &&
            (t.finalTotal || t.total) === (order.finalTotal || order.total) &&
            Math.abs(new Date(t.timestamp) - new Date(order.timestamp)) < 1000 // Within 1 second
        ))
    );

    const recentOrders = [...uniqueOrders].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-blue-600" />
                    Dashboard
                </h2>
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setMonthFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${monthFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        All Time
                    </button>
                    <input
                        type="month"
                        value={monthFilter === 'all' ? '' : monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border-l border-gray-200 outline-none text-sm bg-transparent"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-blue-100 font-medium mb-1">Total Sales</p>
                            <h3 className="text-3xl font-bold">₹{totalSales.toLocaleString()}</h3>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="text-sm text-blue-100">Across {totalOrders} orders</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-green-100 font-medium mb-1">Total Collected</p>
                            <h3 className="text-3xl font-bold">₹{totalCollected.toLocaleString()}</h3>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="text-sm text-green-100">{(totalCollected / totalSales * 100).toFixed(1)}% recovery rate</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-orange-100 font-medium mb-1">Pending Value</p>
                            <h3 className="text-3xl font-bold">₹{totalPending.toLocaleString()}</h3>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="text-sm text-orange-100">Outstanding amount</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales by Salesman Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-gray-500" />
                        Top Performers
                    </h3>
                    <div className="space-y-4">
                        {sortedSalesmen.map(([name, amount]) => (
                            <div key={name}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">{name}</span>
                                    <span className="font-bold text-gray-900">₹{amount.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${(amount / maxSales) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Status & Recent Activity */}
                <div className="space-y-8">
                    {/* Status Distribution */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-gray-500" />
                            Order Status
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {Object.entries(statusCounts).map(([status, count]) => (
                                <div key={status} className="flex-1 text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className={`text-2xl font-bold mb-1 ${status === 'delivered' ? 'text-green-600' : 'text-orange-600'}`}>
                                        {count}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">{status}</div>
                                    <div className="text-xs text-gray-400 mt-1">{((count / totalOrders) * 100).toFixed(0)}%</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Recent Orders</h3>
                        <div className="space-y-3">
                            {recentOrders.map(order => (
                                <div key={order.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${order.status === 'delivered' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800">{order.customerName}</p>
                                            <p className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-blue-600">₹{(order.finalTotal || order.total || 0).toFixed(0)}</p>
                                        <p className="text-xs text-gray-400">{order.salesman}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
