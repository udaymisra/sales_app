import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { getDateString } from '../utils';
import { MapPin, Edit2, Trash2, CheckCircle, Clock, Calendar, Filter, Wallet, AlertCircle } from 'lucide-react';
import DeliveryModal from './DeliveryModal';

const OrdersList = ({ userName, userRole, setEditingOrder, onNavigate }) => {
    const [orders, setOrders] = useState([]);
    const [allOrders, setAllOrders] = useState([]); // Store all orders for balance calc
    const [collections, setCollections] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    // Delivery Modal State
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);

    useEffect(() => {
        const ordersRef = db.ref('orders');
        const collectionsRef = db.ref('collections');

        const handleOrders = (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const rawOrdersList = Object.entries(data).map(([id, order]) => ({ id, ...order }));
                setAllOrders(rawOrdersList); // Keep raw list for stats

                let ordersList = [...rawOrdersList];

                const filterDateObj = new Date(filterDate);
                filterDateObj.setHours(23, 59, 59, 999);

                if (dateFilter === 'asOnDate') {
                    ordersList = ordersList.filter(order => getDateString(order.timestamp) === filterDate);
                } else if (dateFilter === 'weekly') {
                    const weekAgo = new Date(filterDateObj);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    weekAgo.setHours(0, 0, 0, 0);
                    ordersList = ordersList.filter(order => {
                        const orderDate = new Date(order.timestamp);
                        return orderDate >= weekAgo && orderDate <= filterDateObj;
                    });
                } else if (dateFilter === 'monthly') {
                    const monthAgo = new Date(filterDateObj);
                    monthAgo.setDate(monthAgo.getDate() - 30);
                    monthAgo.setHours(0, 0, 0, 0);
                    ordersList = ordersList.filter(order => {
                        const orderDate = new Date(order.timestamp);
                        return orderDate >= monthAgo && orderDate <= filterDateObj;
                    });
                }

                if (userRole !== 'admin') {
                    ordersList = ordersList.filter(order => order.salesman === userName);
                }

                // Sort by date descending
                ordersList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                setOrders(ordersList);
            } else {
                setOrders([]);
                setAllOrders([]);
            }
        };

        const handleCollections = (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCollections(Object.values(data));
            } else {
                setCollections([]);
            }
        };

        ordersRef.on('value', handleOrders);
        collectionsRef.on('value', handleCollections);

        return () => {
            ordersRef.off('value', handleOrders);
            collectionsRef.off('value', handleCollections);
        };
    }, [filterDate, userRole, userName, dateFilter]);

    // Helper to calculate customer stats
    const getCustomerStats = (customerName) => {
        if (!customerName) return { collected: 0, balance: 0 };

        const customerCollections = collections.filter(c => c.customerName === customerName);
        const totalCollected = customerCollections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

        // Use allOrders to ensure we calculate balance based on complete history, not just visible orders
        const customerOrders = allOrders.filter(o => o.customerName === customerName && o.status !== 'cancelled');
        const totalOrdered = customerOrders.reduce((sum, o) => sum + (o.finalTotal || o.total || 0), 0);

        const balance = totalOrdered - totalCollected;

        return {
            collected: totalCollected,
            balance: balance,
            totalOrdered: totalOrdered
        };
    };

    const deleteOrder = async (orderId) => {
        if (!confirm('Delete this order?')) return;
        try {
            await db.ref('orders/' + orderId).remove();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete order');
        }
    };

    const initiateDelivery = (order) => {
        setSelectedOrderForDelivery(order);
        setIsDeliveryModalOpen(true);
    };

    const handleDeliveryConfirm = async (updatedItems) => {
        if (!selectedOrderForDelivery) return;

        try {
            const newTotal = updatedItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || item.rate || 0)), 0);

            await db.ref('orders/' + selectedOrderForDelivery.id).update({
                status: 'delivered',
                items: updatedItems,
                finalTotal: newTotal,
                deliveredAt: new Date().toISOString()
            });

            setIsDeliveryModalOpen(false);
            setSelectedOrderForDelivery(null);
        } catch (error) {
            console.error('Delivery update error:', error);
            alert('Failed to update order');
        }
    };

    const markPending = async (orderId) => {
        try {
            await db.ref('orders/' + orderId).update({ status: 'pending' });
        } catch (error) {
            console.error('Status update error:', error);
            alert('Failed to update status');
        }
    };

    const editOrder = (order) => {
        setEditingOrder(order);
        onNavigate('/sales');
    };

    const openMap = (gps, location) => {
        if (gps && gps.lat && gps.lng) {
            window.open(`https://maps.google.com/?q=${gps.lat},${gps.lng}`, '_blank');
        } else if (location && location !== 'Manual') {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
        } else {
            alert('No location data available');
        }
    };

    const pendingCount = useMemo(() => orders.filter(o => (o.status || 'pending') === 'pending').length, [orders]);
    const deliveredCount = useMemo(() => orders.filter(o => o.status === 'delivered').length, [orders]);
    const allCount = useMemo(() => orders.length, [orders]);

    let filteredOrders = orders;
    if (statusFilter === 'pending') {
        filteredOrders = orders.filter(o => (o.status || 'pending') === 'pending');
    } else if (statusFilter === 'delivered') {
        filteredOrders = orders.filter(o => o.status === 'delivered');
    }

    return (
        <div className="max-w-4xl mx-auto">
            <DeliveryModal
                isOpen={isDeliveryModalOpen}
                onClose={() => setIsDeliveryModalOpen(false)}
                order={selectedOrderForDelivery}
                onConfirm={handleDeliveryConfirm}
            />

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-blue-600" />
                        Filters
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setDateFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            All Time
                        </button>
                        <button
                            onClick={() => setDateFilter('asOnDate')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'asOnDate' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Specific Date
                        </button>
                        <button
                            onClick={() => setDateFilter('weekly')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'weekly' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Last 7 Days
                        </button>
                        <button
                            onClick={() => setDateFilter('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateFilter === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Last 30 Days
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            All ({allCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            Pending ({pendingCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('delivered')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'delivered' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            Delivered ({deliveredCount})
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {filteredOrders.map(order => {
                    const finalTotal = order.finalTotal || order.total || 0;
                    const hasValidGps = order.gps && order.gps.lat && order.gps.lng;
                    const hasLocation = order.location && order.location !== 'Manual';
                    const orderStatus = order.status || 'pending';
                    const isSalesmanView = userRole !== 'admin';
                    const orderDate = getDateString(order.timestamp);

                    const { collected, balance } = getCustomerStats(order.customerName);
                    const isFullyPaid = balance <= 0;

                    return (
                        <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-gray-900">{order.customerName}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${orderStatus === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {orderStatus}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                                        <Calendar className="w-4 h-4" />
                                        {orderDate} • By {order.salesman}
                                    </p>
                                    <p className="text-sm text-gray-500 mb-2">Mobile: {order.mobile}</p>
                                    {order.location && (
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {order.location}
                                        </p>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Order Value</p>
                                            <p className="text-xl font-bold text-blue-600">₹{finalTotal.toFixed(2)}</p>
                                        </div>

                                        {userRole === 'admin' && (
                                            <>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold">Collected</p>
                                                    <p className="text-xl font-bold text-green-600 flex items-center gap-1">
                                                        <Wallet className="w-4 h-4" />
                                                        ₹{collected.toFixed(2)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                                                    {isFullyPaid ? (
                                                        <p className="text-xl font-bold text-green-600 flex items-center gap-1">
                                                            <CheckCircle className="w-4 h-4" /> Paid
                                                        </p>
                                                    ) : (
                                                        <p className="text-xl font-bold text-red-500 flex items-center gap-1">
                                                            <AlertCircle className="w-4 h-4" /> Unpaid: ₹{balance.toFixed(2)}
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                    {(hasValidGps || hasLocation) && (
                                        <button
                                            onClick={() => openMap(order.gps, order.location)}
                                            className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                        >
                                            <MapPin className="w-4 h-4" /> Map
                                        </button>
                                    )}

                                    {isSalesmanView && (
                                        <>
                                            <button
                                                onClick={() => editOrder(order)}
                                                className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" /> Edit
                                            </button>

                                            {orderStatus === 'pending' ? (
                                                <button
                                                    onClick={() => initiateDelivery(order)}
                                                    className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> Mark Delivered
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => markPending(order.id)}
                                                    className="flex items-center gap-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                                                >
                                                    <Clock className="w-4 h-4" /> Mark Pending
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {userRole === 'admin' && (
                                        <button
                                            onClick={() => deleteOrder(order.id)}
                                            className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredOrders.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Filter className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No orders found for the selected criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersList;
