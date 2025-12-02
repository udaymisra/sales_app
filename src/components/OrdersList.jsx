import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { getDateString } from '../utils';
import { MapPin, Edit2, Trash2, CheckCircle, Clock, Calendar, Filter, Wallet, AlertCircle } from 'lucide-react';
import DeliveryModal from './DeliveryModal';

const OrdersList = ({ userName, userRole, setEditingOrder, onNavigate }) => {
    const [orders, setOrders] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [collections, setCollections] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [salesmanFilter, setSalesmanFilter] = useState('all');
    const [availableSalesmen, setAvailableSalesmen] = useState([]);

    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);

    useEffect(() => {
        const ordersRef = db.ref('orders');
        const collectionsRef = db.ref('collections');

        const handleOrders = (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const rawOrdersList = Object.entries(data).map(([id, order]) => ({ id, ...order }));
                setAllOrders(rawOrdersList);

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
                } else if (dateFilter === 'specificMonth') {
                    ordersList = ordersList.filter(order => {
                        const orderDate = new Date(order.timestamp);
                        const year = orderDate.getFullYear();
                        const month = String(orderDate.getMonth() + 1).padStart(2, '0');
                        const orderMonth = `${year}-${month}`;
                        return orderMonth === filterMonth;
                    });
                }

                ordersList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                const salesmen = [...new Set(rawOrdersList.map(o => o.salesman).filter(Boolean))];
                setAvailableSalesmen(salesmen);

                if (userRole === 'admin' && salesmanFilter !== 'all') {
                    ordersList = ordersList.filter(order => order.salesman === salesmanFilter);
                }

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
    }, [filterDate, userRole, userName, dateFilter, salesmanFilter, filterMonth]);

    const getCustomerStats = (customerName) => {
        if (!customerName) return { collected: 0, balance: 0 };

        const customerCollections = collections.filter(c => c.customerName === customerName);
        const totalCollected = customerCollections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

        const customerOrders = allOrders.filter(o => o.customerName === customerName && o.status !== 'cancelled');
        const totalOrdered = customerOrders.reduce((sum, o) => sum + (o.finalTotal || o.total || 0), 0);

        const balance = totalOrdered - totalCollected;

        return {
            collected: totalCollected,
            balance: balance,
            totalOrdered: totalOrdered
        };
    };

    const deleteOrder = async (e, orderId) => {
        e.stopPropagation();
        if (!window.confirm('Delete this order?')) return;
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
            const deliveredItems = updatedItems.filter(item => item.quantity > 0);
            const remainingItems = updatedItems.map(item => ({
                ...item,
                quantity: (item.originalQty || 0) - (item.quantity || 0)
            })).filter(item => item.quantity > 0);

            const deliveredTotal = deliveredItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || item.rate || 0)), 0);
            const remainingTotal = remainingItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || item.rate || 0)), 0);

            const isFullDelivery = remainingItems.length === 0;

            if (isFullDelivery) {
                await db.ref('orders/' + selectedOrderForDelivery.id).update({
                    status: 'delivered',
                    items: deliveredItems,
                    finalTotal: deliveredTotal,
                    deliveredAt: new Date().toISOString()
                });
            } else {
                await db.ref('orders').push({
                    ...selectedOrderForDelivery,
                    status: 'delivered',
                    items: deliveredItems,
                    finalTotal: deliveredTotal,
                    deliveredAt: new Date().toISOString(),
                    originalOrderId: selectedOrderForDelivery.id,
                    isPartialDelivery: true
                });

                await db.ref('orders/' + selectedOrderForDelivery.id).update({
                    status: 'pending',
                    items: remainingItems,
                    finalTotal: remainingTotal,
                    lastPartialDeliveryAt: new Date().toISOString()
                });
            }

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

    const totalPendingValue = orders.filter(o => (o.status || 'pending') === 'pending').reduce((sum, o) => sum + (o.finalTotal || o.total || 0), 0);
    const totalDeliveredValue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.finalTotal || o.total || 0), 0);
    const totalCollections = collections.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    return (
        <div className="max-w-4xl mx-auto pb-4">
            <DeliveryModal
                isOpen={isDeliveryModalOpen}
                onClose={() => setIsDeliveryModalOpen(false)}
                order={selectedOrderForDelivery}
                onConfirm={handleDeliveryConfirm}
            />

            {userRole === 'admin' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <p className="text-orange-600 font-bold text-xs md:text-sm uppercase">Pending Orders</p>
                        <p className="text-xl md:text-2xl font-bold text-orange-800">₹{totalPendingValue.toFixed(0)}</p>
                        <p className="text-xs text-orange-500">{pendingCount} orders</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                        <p className="text-green-600 font-bold text-xs md:text-sm uppercase">Delivered Orders</p>
                        <p className="text-xl md:text-2xl font-bold text-green-800">₹{totalDeliveredValue.toFixed(0)}</p>
                        <p className="text-xs text-green-500">{deliveredCount} orders</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <p className="text-blue-600 font-bold text-xs md:text-sm uppercase">Total Collections</p>
                        <p className="text-xl md:text-2xl font-bold text-blue-800">₹{totalCollections.toFixed(0)}</p>
                        <p className="text-xs text-blue-500">All time</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4 md:mb-6">
                <div className="flex flex-col gap-4 mb-4 md:mb-6">
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-blue-600" />
                        Filters
                    </h2>

                    {/* Date Filter Buttons */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        <button
                            onClick={() => setDateFilter('all')}
                            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${dateFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            All Time
                        </button>
                        <button
                            onClick={() => setDateFilter('asOnDate')}
                            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${dateFilter === 'asOnDate' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Specific Date
                        </button>
                        <button
                            onClick={() => setDateFilter('monthly')}
                            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${dateFilter === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Last 30 Days
                        </button>
                        <button
                            onClick={() => setDateFilter('specificMonth')}
                            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${dateFilter === 'specificMonth' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Specific Month
                        </button>
                    </div>
                </div>

                {userRole === 'admin' && (
                    <div className="mb-4">
                        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Filter by Salesman</label>
                        <select
                            value={salesmanFilter}
                            onChange={(e) => setSalesmanFilter(e.target.value)}
                            className="w-full px-3 md:px-4 py-2 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white text-sm md:text-base"
                        >
                            <option value="all">All Salesmen</option>
                            {availableSalesmen.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    {dateFilter === 'specificMonth' ? (
                        <input
                            type="month"
                            value={filterMonth}
                            onChange={e => setFilterMonth(e.target.value)}
                            className="flex-1 px-3 md:px-4 py-2 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm md:text-base"
                        />
                    ) : (
                        <input
                            type="date"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            disabled={dateFilter !== 'asOnDate' && dateFilter !== 'weekly' && dateFilter !== 'monthly'}
                            className={`flex-1 px-3 md:px-4 py-2 md:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm md:text-base ${dateFilter === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                    )}

                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`flex-1 px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            All ({allCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`flex-1 px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${statusFilter === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            Pending ({pendingCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('delivered')}
                            className={`flex-1 px-2 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${statusFilter === 'delivered' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            Delivered ({deliveredCount})
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3 md:space-y-4">
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
                        <div key={order.id} className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex flex-col gap-3 md:gap-4">
                                {/* Header Section */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="font-bold text-base md:text-lg text-gray-900 truncate">{order.customerName}</h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex-shrink-0 ${orderStatus === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {orderStatus}
                                            </span>
                                        </div>
                                        <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2 mb-1">
                                            <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                                            <span className="truncate">
                                                {orderStatus === 'delivered' && order.deliveredAt
                                                    ? `Delivered: ${getDateString(order.deliveredAt)}`
                                                    : `Ordered: ${getDateString(order.timestamp)}`} • By {order.salesman}
                                            </span>
                                        </p>
                                        <p className="text-xs md:text-sm text-gray-500">Mobile: {order.mobile}</p>
                                        {order.location && (
                                            <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{order.location}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Stats Section - Better mobile grid */}
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 md:gap-4">
                                    <div>
                                        <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">Order Value</p>
                                        <p className="text-lg md:text-xl font-bold text-blue-600">₹{finalTotal.toFixed(2)}</p>
                                    </div>

                                    {userRole === 'admin' && (
                                        <>
                                            <div>
                                                <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">Collected</p>
                                                <p className="text-lg md:text-xl font-bold text-green-600 flex items-center gap-1">
                                                    <Wallet className="w-3 h-3 md:w-4 md:h-4" />
                                                    ₹{collected.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">Status</p>
                                                {isFullyPaid ? (
                                                    <p className="text-lg md:text-xl font-bold text-green-600 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> Paid
                                                    </p>
                                                ) : (
                                                    <p className="text-lg md:text-xl font-bold text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
                                                        <span className="truncate">₹{balance.toFixed(2)}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Action Buttons - Better mobile layout */}
                                <div className="flex flex-wrap gap-2">
                                    {(hasValidGps || hasLocation) && (
                                        <button
                                            onClick={() => openMap(order.gps, order.location)}
                                            className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs md:text-sm font-medium hover:bg-blue-100 transition-colors flex-1 sm:flex-initial min-w-[80px]"
                                        >
                                            <MapPin className="w-4 h-4" /> Map
                                        </button>
                                    )}

                                    {isSalesmanView && (
                                        <>
                                            <button
                                                onClick={() => editOrder(order)}
                                                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors flex-1 sm:flex-initial min-w-[80px]"
                                            >
                                                <Edit2 className="w-4 h-4" /> Edit
                                            </button>

                                            {orderStatus === 'pending' ? (
                                                <button
                                                    onClick={() => initiateDelivery(order)}
                                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-xs md:text-sm font-medium hover:bg-green-100 transition-colors flex-1 sm:flex-initial"
                                                >
                                                    <CheckCircle className="w-4 h-4" /> <span className="hidden sm:inline">Mark </span>Delivered
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => markPending(order.id)}
                                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs md:text-sm font-medium hover:bg-orange-100 transition-colors flex-1 sm:flex-initial"
                                                >
                                                    <Clock className="w-4 h-4" /> <span className="hidden sm:inline">Mark </span>Pending
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {userRole === 'admin' && (
                                        <button
                                            onClick={(e) => deleteOrder(e, order.id)}
                                            className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs md:text-sm font-medium hover:bg-red-100 transition-colors flex-1 sm:flex-initial min-w-[80px]"
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
                    <div className="text-center py-12 bg-white rounded-2xl md:rounded-3xl border border-dashed border-gray-200">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Filter className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-sm md:text-base">No orders found for the selected criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersList;