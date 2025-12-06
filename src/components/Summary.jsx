import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { BarChart3, TrendingUp, Wallet, Users, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { getDateString, formatDateTime } from '../utils';

const Summary = ({ userName, userRole }) => {
    const [salesmen, setSalesmen] = useState([]);
    const [selectedSalesman, setSelectedSalesman] = useState('');
    const [summaryData, setSummaryData] = useState([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [totalCollections, setTotalCollections] = useState(0);

    // New States for Month Filter and Detail View
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'details'
    const [detailSalesman, setDetailSalesman] = useState(null);
    const [detailData, setDetailData] = useState([]);

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

                // Filter by Month (Local Time Logic)
                const filterByMonth = (timestampOrDate) => {
                    if (!timestampOrDate) return false;
                    const d = new Date(timestampOrDate);
                    if (isNaN(d.getTime())) return false;
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    return `${year}-${month}` === monthFilter;
                };

                let filteredOrders = Object.entries(ordersData)
                    .map(([id, order]) => ({ id, ...order }))
                    .filter(order => filterByMonth(order.timestamp));

                let filteredCollections = Object.entries(collectionsData)
                    .map(([id, collection]) => ({ id, ...collection }))
                    .filter(collection => filterByMonth(collection.date));

                // Prepare Summary Data
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

                // Prepare Detail Data if in Detail View
                if (viewMode === 'details' && detailSalesman) {
                    const salesmanOrders = Object.values(ordersData)
                        .filter(o => o.salesman === detailSalesman && filterByMonth(o.timestamp))
                        .map(o => ({
                            type: 'order',
                            date: o.timestamp,
                            customer: o.customerName,
                            orderAmount: o.finalTotal || o.total || 0,
                            deliveredAmount: o.status === 'delivered' ? (o.finalTotal || o.total || 0) : 0,
                            collectionAmount: 0,
                            ref: o
                        }));

                    const salesmanCollections = Object.values(collectionsData)
                        .filter(c => c.salesman === detailSalesman && filterByMonth(c.date))
                        .map(c => ({
                            type: 'collection',
                            date: c.date, // Collections usually have YYYY-MM-DD
                            customer: c.customerName,
                            orderAmount: 0,
                            deliveredAmount: 0,
                            collectionAmount: parseFloat(c.amount) || 0,
                            ref: c
                        }));

                    const combined = [...salesmanOrders, ...salesmanCollections].sort((a, b) => new Date(a.date) - new Date(b.date));
                    if (isMounted) {
                        setDetailData(combined);
                    }
                }

            } catch (error) {
                console.error('Fetch error:', error);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [selectedSalesman, monthFilter, viewMode, detailSalesman]);

    const handleSalesmanClick = (salesmanName) => {
        setDetailSalesman(salesmanName);
        setViewMode('details');
    };

    const handleBackToSummary = () => {
        setViewMode('summary');
        setDetailSalesman(null);
    };

    if (userRole !== 'admin') {
        return <div className="p-8 text-center text-gray-500">Access Denied</div>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    {viewMode === 'details' && (
                        <button
                            onClick={handleBackToSummary}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {viewMode === 'summary' ? (
                            <>
                                <BarChart3 className="w-8 h-8 text-blue-600" />
                                Performance Summary
                            </>
                        ) : (
                            <>
                                <FileText className="w-8 h-8 text-blue-600" />
                                {detailSalesman}'s Ledger
                            </>
                        )}
                    </h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                        />
                    </div>

                    {viewMode === 'summary' && (
                        <div className="w-full md:w-64">
                            <select
                                value={selectedSalesman}
                                onChange={e => setSelectedSalesman(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                            >
                                <option value="">All Salesmen</option>
                                {salesmen.map(salesman => <option key={salesman} value={salesman}>{salesman}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {viewMode === 'summary' ? (
                <>
                    {/* Summary Cards */}
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

                    {/* Salesman List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-gray-500" />
                            Salesman Breakdown
                        </h3>

                        <div className="overflow-x-auto">
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
                                        <tr
                                            key={index}
                                            onClick={() => handleSalesmanClick(item.salesman)}
                                            className="hover:bg-blue-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center text-gray-600 group-hover:text-blue-700 font-bold text-xs transition-colors">
                                                        {item.salesman.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{item.salesman}</span>
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
                        {summaryData.length === 0 && (
                            <div className="text-center py-8 text-gray-400">No data found for this month</div>
                        )}
                    </div>
                </>
            ) : (
                /* Detail View (Ledger) */
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 text-left border-b border-gray-100">
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Order Value</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Delivered Value</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Collection</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {detailData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                            {formatDateTime(row.date)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {row.customer}
                                            <span className="block text-xs text-gray-400 font-normal">{row.type}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                                            {row.orderAmount > 0 ? `₹${row.orderAmount.toFixed(0)}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">
                                            {row.deliveredAmount > 0 ? `₹${row.deliveredAmount.toFixed(0)}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600 font-bold">
                                            {row.collectionAmount > 0 ? `₹${row.collectionAmount.toFixed(0)}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {/* Totals Row */}
                                <tr className="bg-gray-50 font-bold">
                                    <td className="px-4 py-3 text-sm text-gray-900" colSpan="2">Total</td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                                        ₹{detailData.reduce((sum, r) => sum + r.orderAmount, 0).toFixed(0)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-blue-700">
                                        ₹{detailData.reduce((sum, r) => sum + r.deliveredAmount, 0).toFixed(0)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-green-700">
                                        ₹{detailData.reduce((sum, r) => sum + r.collectionAmount, 0).toFixed(0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {detailData.length === 0 && (
                        <div className="text-center py-12 text-gray-400">No records found for this salesman in {monthFilter}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Summary;
