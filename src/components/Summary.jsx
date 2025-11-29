import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { BarChart3, TrendingUp, Wallet, Users } from 'lucide-react';

const Summary = ({ userName, userRole }) => {
    const [salesmen, setSalesmen] = useState([]);
    const [selectedSalesman, setSelectedSalesman] = useState('');
    const [summaryData, setSummaryData] = useState([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [totalCollections, setTotalCollections] = useState(0);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const ordersSnapshot = await db.ref('orders').once('value');
                const collectionsSnapshot = await db.ref('collections').once('value');
                const ordersData = ordersSnapshot.val() || {};
                const collectionsData = collectionsSnapshot.val() || {};

                const salesmanSet = new Set();
                Object.values(ordersData).forEach(order => order.salesman && salesmanSet.add(order.salesman));
                Object.values(collectionsData).forEach(collection => collection.salesman && salesmanSet.add(collection.salesman));

                if (isMounted) {
                    setSalesmen(Array.from(salesmanSet));
                }

                let filteredOrders = Object.entries(ordersData).map(([id, order]) => ({ id, ...order }));
                let filteredCollections = Object.entries(collectionsData).map(([id, collection]) => ({ id, ...collection }));

                if (selectedSalesman) {
                    filteredOrders = filteredOrders.filter(order => order.salesman === selectedSalesman);
                    filteredCollections = filteredCollections.filter(collection => collection.salesman === selectedSalesman);
                }

                const summary = {};
                filteredOrders.forEach(order => {
                    if (!summary[order.salesman]) {
                        summary[order.salesman] = { orders: 0, collections: 0 };
                    }
                    summary[order.salesman].orders += (order.finalTotal || order.total || 0);
                });

                filteredCollections.forEach(collection => {
                    if (!summary[collection.salesman]) {
                        summary[collection.salesman] = { orders: 0, collections: 0 };
                    }
                    summary[collection.salesman].collections += (collection.amount || 0);
                });

                const summaryArray = Object.entries(summary).map(([name, data]) => ({
                    salesman: name,
                    ...data
                }));

                if (isMounted) {
                    setSummaryData(summaryArray);
                    setTotalOrders(summaryArray.reduce((sum, s) => sum + (s.orders || 0), 0));
                    setTotalCollections(summaryArray.reduce((sum, s) => sum + (s.collections || 0), 0));
                }
            } catch (error) {
                console.error('Fetch error:', error);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [selectedSalesman]);

    if (userRole !== 'admin') {
        return <div className="p-8 text-center text-gray-500">Access Denied</div>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    Performance Summary
                </h2>
                <div className="w-64">
                    <select
                        value={selectedSalesman}
                        onChange={e => setSelectedSalesman(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                    >
                        <option value="">All Salesmen</option>
                        {salesmen.map(salesman => <option key={salesman} value={salesman}>{salesman}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-blue-100 font-medium">Total Order Value</p>
                            <h3 className="text-3xl font-bold">₹{totalOrders.toFixed(2)}</h3>
                        </div>
                    </div>
                    <div className="h-1 bg-white/20 rounded-full w-full overflow-hidden">
                        <div className="h-full bg-white/40 w-3/4 rounded-full"></div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 text-white shadow-lg shadow-green-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Wallet className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-green-100 font-medium">Total Collections</p>
                            <h3 className="text-3xl font-bold">₹{totalCollections.toFixed(2)}</h3>
                        </div>
                    </div>
                    <div className="h-1 bg-white/20 rounded-full w-full overflow-hidden">
                        <div className="h-full bg-white/40 w-3/4 rounded-full"></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-500" />
                    Salesman Breakdown
                </h3>

                <div className="overflow-hidden rounded-2xl border border-gray-100">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 text-left">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Orders Value</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Collections</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {summaryData.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs">
                                                {item.salesman.charAt(0)}
                                            </div>
                                            <span className="font-medium text-gray-900">{item.salesman}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-blue-600">₹{item.orders.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-green-600">₹{item.collections.toFixed(2)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Summary;
