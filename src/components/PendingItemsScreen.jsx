import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { Filter, Package, User, CheckCircle, Clock } from 'lucide-react';

const PendingItemsScreen = ({ userName, userRole }) => {
    const [statusFilter, setStatusFilter] = useState('all');
    const [salesmanFilter, setSalesmanFilter] = useState('');
    const [allItems, setAllItems] = useState([]);
    const [salesmen, setSalesmen] = useState([]);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        if (userRole !== 'admin') return;

        const ordersRef = db.ref('orders');
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val() || {};
            const orders = Object.entries(data).map(([id, order]) => ({ id, ...order }));

            const aggregatedItemsBySalesman = new Map();
            const allSalesmenSet = new Set();

            orders.forEach(order => {
                // Month Filter Logic (Local Time)
                const orderDate = new Date(order.timestamp);
                const year = orderDate.getFullYear();
                const month = String(orderDate.getMonth() + 1).padStart(2, '0');
                const orderMonth = `${year}-${month}`;

                if (orderMonth !== monthFilter) return;

                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const salesman = order.salesman;
                        const status = order.status || 'pending';
                        const itemName = item.itemName || item.name || 'Unknown Item';
                        const itemQty = parseFloat(item.quantity) || parseFloat(item.qty) || 0;
                        const itemRate = parseFloat(item.price) || parseFloat(item.rate) || 0;

                        if (itemQty <= 0) return;

                        const itemPrice = itemQty * itemRate;
                        allSalesmenSet.add(salesman);

                        if (!aggregatedItemsBySalesman.has(salesman)) {
                            aggregatedItemsBySalesman.set(salesman, new Map());
                        }
                        if (!aggregatedItemsBySalesman.get(salesman).has(itemName)) {
                            aggregatedItemsBySalesman.get(salesman).set(itemName, new Map());
                        }
                        if (!aggregatedItemsBySalesman.get(salesman).get(itemName).has(status)) {
                            aggregatedItemsBySalesman.get(salesman).get(itemName).set(status, { totalQty: 0, totalPrice: 0 });
                        }

                        const itemStatusData = aggregatedItemsBySalesman.get(salesman).get(itemName).get(status);
                        itemStatusData.totalQty += itemQty;
                        itemStatusData.totalPrice += itemPrice;
                    });
                } else {
                    allSalesmenSet.add(order.salesman);
                }
            });

            const finalAggregatedItems = [];
            aggregatedItemsBySalesman.forEach((itemsMap, salesman) => {
                itemsMap.forEach((statusesMap, itemName) => {
                    statusesMap.forEach((data, status) => {
                        finalAggregatedItems.push({
                            salesman,
                            name: itemName,
                            status,
                            totalQty: data.totalQty,
                            totalPrice: data.totalPrice
                        });
                    });
                });
            });

            setAllItems(finalAggregatedItems);
            setSalesmen(Array.from(allSalesmenSet));
        });

        return () => ordersRef.off('value', listener);
    }, [userRole, monthFilter]);

    const { filteredItemsBySalesman, overallSummary } = useMemo(() => {
        const overallSummaryMap = new Map();
        allItems.forEach(item => {
            if (statusFilter === 'all' || item.status === statusFilter) {
                const key = `${item.name}_${item.status}`;
                if (!overallSummaryMap.has(key)) {
                    overallSummaryMap.set(key, {
                        name: item.name,
                        status: item.status,
                        totalQty: 0,
                        totalPrice: 0
                    });
                }
                const summaryItem = overallSummaryMap.get(key);
                summaryItem.totalQty += item.totalQty;
                summaryItem.totalPrice += item.totalPrice;
            }
        });

        const itemsBySalesmanMap = new Map();
        allItems.forEach(item => {
            if (statusFilter === 'all' || item.status === statusFilter) {
                if (!salesmanFilter || item.salesman === salesmanFilter) {
                    if (!itemsBySalesmanMap.has(item.salesman)) {
                        itemsBySalesmanMap.set(item.salesman, []);
                    }
                    itemsBySalesmanMap.get(item.salesman).push(item);
                }
            }
        });

        return {
            filteredItemsBySalesman: itemsBySalesmanMap,
            overallSummary: Array.from(overallSummaryMap.values())
        };
    }, [allItems, statusFilter, salesmanFilter]);

    const totalSalesmanBreakdownPrice = useMemo(() => {
        let total = 0;
        filteredItemsBySalesman.forEach(itemsList => {
            itemsList.forEach(item => {
                total += item.totalPrice || 0;
            });
        });
        return total;
    }, [filteredItemsBySalesman]);

    const totalOverallSummaryPrice = useMemo(() => {
        return overallSummary.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }, [overallSummary]);

    if (userRole !== 'admin') {
        return <div className="p-8 text-center text-gray-500">Access Denied</div>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex items-center gap-2 mb-6">
                    <Filter className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-800">Filters</h2>
                    <div className="ml-auto">
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setStatusFilter('pending')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => setStatusFilter('delivered')}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'delivered' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                Delivered
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Salesman</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <select
                                value={salesmanFilter}
                                onChange={e => setSalesmanFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-gray-50 focus:bg-white"
                            >
                                <option value="">All Salesmen</option>
                                {salesmen.map(salesman => <option key={salesman} value={salesman}>{salesman}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Salesman Breakdown</h2>
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold">
                                Total: ₹{totalSalesmanBreakdownPrice.toFixed(2)}
                            </span>
                        </div>

                        {Array.from(filteredItemsBySalesman.entries()).map(([salesman, items]) => {
                            if (items.length === 0) return null;
                            return (
                                <div key={salesman} className="mb-8 last:mb-0">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        {salesman}
                                    </h3>
                                    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-100 text-left">
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Item</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Qty</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Price</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {items.map((item, index) => (
                                                    <tr key={index} className="bg-white">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.totalQty}</td>
                                                        <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">₹{item.totalPrice.toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${item.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Overall Summary</h2>
                        </div>

                        <div className="bg-blue-600 text-white p-4 rounded-2xl mb-6 shadow-lg shadow-blue-200">
                            <p className="text-blue-100 text-sm font-medium mb-1">Total Value</p>
                            <p className="text-3xl font-bold">₹{totalOverallSummaryPrice.toFixed(2)}</p>
                        </div>

                        <div className="space-y-4">
                            {overallSummary.map((summary, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${summary.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{summary.name}</p>
                                            <p className="text-xs text-gray-500">{summary.totalQty} units • {summary.status}</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-sm text-gray-900">₹{summary.totalPrice.toFixed(0)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PendingItemsScreen;
