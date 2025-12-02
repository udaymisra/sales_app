import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { getDateString, formatTime } from '../utils';
import { Gauge, Play, Square, MapPin, Calendar, Clock, Trash2 } from 'lucide-react';
import firebase from '../firebase';

const MeterReadingScreen = ({ userName, userRole }) => {
    const today = getDateString();
    const [todayRecord, setTodayRecord] = useState(null);
    const [allRecords, setAllRecords] = useState([]);
    const [monthFilter, setMonthFilter] = useState('all');
    const [startReading, setStartReading] = useState('');
    const [endReading, setEndReading] = useState('');

    useEffect(() => {
        const ref = db.ref('meterReadings');
        const listener = ref.on('value', (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
            const myRecords = userRole === 'admin' ? list : list.filter(r => r.salesman === userName);
            const sorted = myRecords.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
            setAllRecords(sorted);
            setTodayRecord(sorted.find(r => r.date === today && r.salesman === userName) || null);
        });
        return () => ref.off('value', listener);
    }, [userName, today, userRole]);

    const captureGPS = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject('GPS not supported');
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => reject(err.message),
            { timeout: 10000, enableHighAccuracy: true }
        );
    });

    const startJourney = async () => {
        const reading = parseFloat(startReading);
        if (!reading || reading <= 0) return alert('Enter valid start meter reading');
        if (todayRecord?.startReading) return alert('Journey already started today');
        try {
            const gps = await captureGPS();
            const now = new Date().toISOString();
            await db.ref('meterReadings').push({
                salesman: userName,
                date: today,
                startReading: reading,
                startLocation: gps,
                startTime: now,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            alert('Journey Started Successfully!');
            setStartReading('');
        } catch (err) {
            alert('GPS Error: ' + err);
        }
    };

    const endJourney = async () => {
        const reading = parseFloat(endReading);
        if (!reading || reading <= 0) return alert('Enter valid end meter reading');
        if (!todayRecord?.startReading) return alert('Start journey first');
        if (todayRecord?.endReading) return alert('Journey already ended today');
        if (reading <= todayRecord.startReading) return alert('End reading must be greater');
        try {
            const gps = await captureGPS();
            const now = new Date().toISOString();
            await db.ref('meterReadings/' + todayRecord.id).update({
                endReading: reading,
                endLocation: gps,
                endTime: now
            });
            alert('Journey Ended Successfully!');
            setEndReading('');
        } catch (err) {
            alert('GPS Error: ' + err);
        }
    };

    const deleteJourney = async (id) => {
        if (!confirm('Delete this journey record?')) return;
        try {
            await db.ref('meterReadings/' + id).remove();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete record');
        }
    };

    const filteredRecords = monthFilter === 'all' ? allRecords : allRecords.filter(r => {
        const d = new Date(r.startTime || r.timestamp);
        const mkey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return mkey === monthFilter;
    });

    const currentMonthKey = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Today's Journey</h2>
                    <p className="text-gray-500 flex items-center justify-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {today}
                    </p>
                </div>

                {!todayRecord?.startReading ? (
                    <div className="max-w-sm mx-auto">
                        <div className="relative mb-4">
                            <Gauge className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="number"
                                placeholder="Start Meter Reading"
                                value={startReading}
                                onChange={e => setStartReading(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-lg"
                            />
                        </div>
                        <button
                            onClick={startJourney}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            START JOURNEY
                        </button>
                    </div>
                ) : !todayRecord?.endReading ? (
                    <div className="max-w-sm mx-auto">
                        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                            <p className="text-sm text-blue-800 font-medium flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4" />
                                Started at {formatTime(todayRecord.startTime)}
                            </p>
                            <p className="text-2xl font-bold text-blue-900 text-center mt-1">{todayRecord.startReading} km</p>
                        </div>
                        <div className="relative mb-4">
                            <Gauge className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="number"
                                placeholder="End Meter Reading"
                                value={endReading}
                                onChange={e => setEndReading(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all text-lg"
                            />
                        </div>
                        <button
                            onClick={endJourney}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Square className="w-5 h-5 fill-current" />
                            END JOURNEY
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-green-50 rounded-2xl border border-green-100">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Journey Completed!</h3>
                        <div className="flex justify-center gap-8 mt-4">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Distance</p>
                                <p className="text-2xl font-bold text-blue-600">{todayRecord.endReading - todayRecord.startReading} km</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Allowance</p>
                                <p className="text-2xl font-bold text-green-600">₹{((todayRecord.endReading - todayRecord.startReading) * 2).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-gray-800">History</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMonthFilter('all')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${monthFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            All Time
                        </button>
                        <input
                            type="month"
                            value={monthFilter === 'all' ? '' : monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-gray-100">
                                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
                                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Start</th>
                                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">End</th>
                                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Total</th>
                                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                                {userRole === 'admin' && <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRecords.map(rec => {
                                const km = rec.endReading ? rec.endReading - rec.startReading : 0;
                                const amt = km * 2;
                                return (
                                    <tr key={rec.id} className="group hover:bg-gray-50 transition-colors">
                                        <td className="py-4 text-sm font-medium text-gray-900">{rec.date}</td>
                                        <td className="py-4 text-sm text-gray-500">
                                            <div>{formatTime(rec.startTime)}</div>
                                            <div className="text-xs text-gray-400">{rec.startReading}</div>
                                        </td>
                                        <td className="py-4 text-sm text-gray-500">
                                            <div>{formatTime(rec.endTime)}</div>
                                            <div className="text-xs text-gray-400">{rec.endReading || '-'}</div>
                                        </td>
                                        <td className="py-4 text-sm font-bold text-blue-600">{km || '-'}</td>
                                        <td className="py-4 text-sm font-bold text-green-600">{rec.endReading ? `₹${amt}` : '-'}</td>
                                        {userRole === 'admin' && (
                                            <td className="py-4">
                                                <button
                                                    onClick={() => deleteJourney(rec.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredRecords.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">No journey records found</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for check circle icon
function CheckCircle({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

export default MeterReadingScreen;
