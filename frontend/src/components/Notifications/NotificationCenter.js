import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import './NotificationCenter.css';
import { 
    FaBell, FaCheck, FaTimes, FaUser, FaRoute, 
    FaCalendarAlt, FaRupeeSign, FaTrashAlt, FaCheckCircle, 
    FaTimesCircle, FaHourglassHalf, FaCar, FaQrcode 
} from 'react-icons/fa';
import UpiQrCode from '../Payment/UpiQrCode';
import DriverPaymentConfirmModal from '../Payment/DriverPaymentConfirmModal';
import { getDriverUpiId } from '../../shared/upiService';

class NotificationCenter extends Component {
    state = {
        activeQrNotifId: null,
        showDriverConfirmModal: null
    };

    handleJoinRide = (notif) => {
        try {
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const updated = rawNotifs.map(n => {
                if (n.id === notif.id) {
                    return {
                        ...n,
                        forRole: 'PASSENGER',
                        type: 'RIDE_CONFIRMED',
                        status: 'CONFIRMED & ACCEPTED',
                        message: `🎉 Ride Confirmed! Driver ${n.driverName || 'Alex'} confirmed your seat for ${n.origin} ➔ ${n.destination}. Please scan the QR code to complete payment.`
                    };
                }
                return n;
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            if (notif.tripId) {
                localStorage.setItem('carpool_confirmed_trip_' + notif.tripId, 'ACCEPTED');
            }
            if (notif.origin && notif.destination) {
                localStorage.setItem('carpool_confirmed_trip_' + notif.origin + '_' + notif.destination, 'ACCEPTED');
            }
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('storage'));
        } catch (e) {
            console.error("Error joining ride:", e);
        }
        this.props.closed();
        if (this.props.history) {
            this.props.history.push('/myTrips');
        } else {
            window.location.href = '/myTrips';
        }
    };

    handleChooseOtherRides = (notif) => {
        this.props.closed();
        if (this.props.history) {
            this.props.history.push('/searchTrips');
        } else {
            window.location.href = '/searchTrips';
        }
    };

    handleDriverConfirmPayment = (notif) => {
        try {
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const txnId = 'TXN' + Date.now();
            const utrNo = '4829' + Math.floor(10000000 + Math.random() * 90000000);
            const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            const fareAmount = notif.fare || 525;

            // 1. Update this notification in driver notifications
            const updated = rawNotifs.map(n => {
                if (n.id === notif.id) {
                    return {
                        ...n,
                        status: 'PAYMENT_RECEIVED',
                        hasPaid: true,
                        transactionId: txnId,
                        utrNumber: utrNo,
                        fare: fareAmount,
                        message: `💰 Payment Received! Passenger ${notif.passengerName || 'Rahul Sharma'} has successfully completed payment of ₹${fareAmount} via UPI QR Code. Money credited to your account.`
                    };
                }
                return n;
            });

            // 2. Add an explicit high-priority payment notification to driver
            const paymentNotif = {
                id: 'NOTIF-PAY-' + Date.now(),
                forRole: 'DRIVER',
                driverUsername: notif.driverUsername || 'driver',
                passengerUsername: notif.passengerUsername || 'passenger',
                passengerName: notif.passengerName || 'Rahul Sharma',
                passengerPhone: notif.passengerPhone || '+91 98765 43210',
                origin: notif.origin,
                destination: notif.destination,
                route: notif.route || `${notif.origin} ➔ ${notif.destination}`,
                timestamp: timestamp,
                type: 'PASSENGER_REQUEST',
                status: 'PAYMENT_RECEIVED',
                message: `💰 Payment Successfully Completed! Passenger ${notif.passengerName || 'Rahul Sharma'} paid ₹${fareAmount}. Credited to Driver Account.`,
                fare: fareAmount,
                hasPaid: true,
                transactionId: txnId,
                utrNumber: utrNo
            };
            updated.unshift(paymentNotif);

            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));

            // 3. Record in payment history for Driver Settlements & Earnings
            const payments = JSON.parse(localStorage.getItem('carpool_payment_history') || '[]');
            payments.unshift({
                transactionId: txnId,
                utrNumber: utrNo,
                amount: fareAmount,
                route: notif.route || `${notif.origin} ➔ ${notif.destination}`,
                origin: notif.origin,
                destination: notif.destination,
                passengerName: notif.passengerName || 'Rahul Sharma',
                passengerUsername: notif.passengerUsername || 'passenger',
                driver: notif.driverName || 'Alex Driver',
                driverUsername: notif.driverUsername || 'driver',
                paymentMethod: 'UPI QR Scan',
                status: 'PAID & CONFIRMED',
                settlementStatus: 'SETTLED TO DRIVER ACCOUNT',
                timestamp: timestamp
            });
            localStorage.setItem('carpool_payment_history', JSON.stringify(payments));

            // 4. Dispatch events so all tabs & components update live
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('carpool_payment_updated'));
            window.dispatchEvent(new Event('storage'));

            this.setState({ activeQrNotifId: null });
        } catch (e) {
            console.error("Error confirming payment by driver:", e);
        }
    };

    handleConfirmRide = (notifId) => {
        try {
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const updated = rawNotifs.map(n => {
                if (n.id === notifId) {
                    return {
                        ...n,
                        status: 'CONFIRMED & ACCEPTED',
                        message: `🎉 Ride Confirmed! Seat locked for @${n.passengerUsername || 'passenger'}. Passenger can now proceed to payment.`
                    };
                }
                return n;
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            this.setState({ activeQrNotifId: notifId });
        } catch (e) {
            console.error("Error confirming ride:", e);
        }
    };

    handleCancelRide = (notifId) => {
        try {
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const updated = rawNotifs.map(n => {
                if (n.id === notifId) {
                    return {
                        ...n,
                        status: 'CANCELLED BY DRIVER',
                        message: `❌ Ride Cancelled! You have declined/cancelled this passenger request.`
                    };
                }
                return n;
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
        } catch (e) {
            console.error("Error cancelling ride:", e);
        }
    };

    handleDelete = (notifId) => {
        try {
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const updated = rawNotifs.filter(n => n.id !== notifId);
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
        } catch (e) {
            console.error("Error deleting notification:", e);
        }
    };

    handleClearAll = () => {
        try {
            localStorage.setItem('carpool_driver_notifications', JSON.stringify([]));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
        } catch (e) {
            console.error("Error clearing notifications:", e);
        }
    };

    render() {
        if (!this.props.show) return null;

        const notifications = this.props.notifications || [];
        const pendingCount = notifications.filter(n => n.status === 'PENDING_DRIVER_CONFIRMATION').length;

        return (
            <div className="NotificationCenter-overlay" onClick={this.props.closed}>
                <div className="NotificationCenter-card" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="NotificationCenter-header">
                        <h2 className="NotificationCenter-title">
                            <FaBell style={{ color: '#fef08a' }} /> {this.props.isDriver ? 'Driver Ride Confirmations & Notifications' : 'Passenger Ride Alerts & Matching Rides'}
                        </h2>
                        <button 
                            type="button" 
                            className="NotificationCenter-close-btn"
                            onClick={this.props.closed}
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Notification Items */}
                    <div className="NotificationCenter-body">
                        {notifications.length === 0 ? (
                            <div className="NotificationCenter-empty">
                                <div className="NotificationCenter-empty-icon">📭</div>
                                <h3 style={{ color: '#ffffff', margin: '0 0 6px 0' }}>No Notifications Right Now</h3>
                                <p style={{ margin: 0, fontSize: '0.88rem' }}>
                                    {this.props.isDriver
                                        ? 'When passengers request to join your published trips, notifications will appear here for your confirmation or cancellation.'
                                        : 'When drivers offer rides with the same starting point and destination, alerts will appear here so you can join or choose other rides.'}
                                </p>
                            </div>
                        ) : (
                            notifications
                                .filter(notif => {
                                    if (this.props.isDriver) {
                                        return notif.type === 'PASSENGER_REQUEST' || notif.forRole === 'DRIVER' || notif.status === 'PAYMENT_RECEIVED';
                                    }
                                    return true;
                                })
                                .map(notif => {
                                    const isPassengerPaymentSuccess = !this.props.isDriver && (notif.type === 'PAYMENT_SUCCESS' || notif.status === 'PAYMENT_SUCCESSFUL' || (notif.forRole === 'PASSENGER' && notif.hasPaid));
                                    const isMatchingAlert = !this.props.isDriver && !isPassengerPaymentSuccess && (notif.type === 'MATCHING_RIDE_ALERT' || notif.status === 'MATCHING_AVAILABLE' || notif.forRole === 'PASSENGER');
                                    const isPaymentReceived = notif.status === 'PAYMENT_RECEIVED' || notif.hasPaid === true;
                                    const isPending = notif.status === 'PENDING_DRIVER_CONFIRMATION' && !isPaymentReceived;
                                    const isConfirmed = (notif.status === 'CONFIRMED & ACCEPTED' || notif.status === 'ACCEPTED & SEAT CONFIRMED') && !isPaymentReceived;
                                    const isCancelled = notif.status === 'CANCELLED BY DRIVER' || notif.status === 'REJECTED';

                                if (isPassengerPaymentSuccess) {
                                    return (
                                        <div key={notif.id} className="NotificationCenter-item" style={{
                                            background: 'rgba(16, 185, 129, 0.14)',
                                            border: '1.5px solid #10b981',
                                            borderRadius: '12px',
                                            padding: '14px 16px',
                                            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)'
                                        }}>
                                            <div className="NotificationCenter-item-top">
                                                <div className="NotificationCenter-passenger-name" style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                    <FaCheckCircle style={{ color: '#10b981' }} /> PAYMENT SUCCESSFUL
                                                </div>
                                                <span className="NotificationCenter-route-badge" style={{ background: '#10b981', color: '#0f172a', fontWeight: '800' }}>
                                                    ₹{notif.fare || 700} PAID
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '0.92rem', color: '#f8fafc', lineHeight: 1.4, margin: '6px 0' }}>
                                                {notif.message || `Payment of ₹${notif.fare || 700} to Driver ${notif.driverName || 'driver'} completed successfully! Seat & ride confirmed.`}
                                            </div>

                                            <div className="NotificationCenter-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                <span>📍 <strong>Route:</strong> {notif.route || `${notif.origin} ➔ ${notif.destination}`}</span>
                                                <span>🔢 <strong>Txn Ref:</strong> {notif.transactionId}</span>
                                                <span>🕒 {notif.timestamp}</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => this.handleDelete(notif.id)}
                                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                    title="Dismiss notification"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                if (isMatchingAlert) {
                                    return (
                                        <div key={notif.id} className="NotificationCenter-item">
                                            <div className="NotificationCenter-item-top">
                                                <div className="NotificationCenter-passenger-name">
                                                    <FaCar style={{ color: '#38bdf8' }} /> 
                                                    Driver: {notif.driverName || 'Alex Driver'}
                                                </div>
                                                <span className="NotificationCenter-route-badge" style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8' }}>
                                                    🎯 Same Starting Point & Destination
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.4, margin: '6px 0' }}>
                                                {notif.message || `Driver is offering a verified ride from ${notif.origin} to ${notif.destination} matching your route!`}
                                            </div>

                                            <div className="NotificationCenter-meta">
                                                <span>
                                                    <FaRupeeSign style={{ color: '#10b981' }} /> Fare: <strong>₹{notif.fare || 750}</strong>
                                                </span>
                                                {notif.availableSeats && (
                                                    <span>
                                                        🪑 <strong>{notif.availableSeats} Seats Available</strong>
                                                    </span>
                                                )}
                                                <span>
                                                    🕒 {notif.timestamp}
                                                </span>
                                            </div>

                                            {/* Decision Actions for Passenger: Join This Ride or Choose Other Rides */}
                                            <div className="NotificationCenter-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                                                {notif.status === 'JOINED & SEAT CONFIRMED' ? (
                                                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                        ✅ You have joined this ride! Checked in to My Trips.
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="NotificationCenter-btn-confirm"
                                                            onClick={() => this.handleJoinRide(notif)}
                                                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', flex: '1', minWidth: '150px' }}
                                                        >
                                                            <FaCheck /> Join This Ride
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="NotificationCenter-btn-cancel"
                                                            onClick={() => this.handleChooseOtherRides(notif)}
                                                            style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', flex: '1', minWidth: '170px' }}
                                                        >
                                                            <FaRoute /> Choose Other Rides
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => this.handleDelete(notif.id)}
                                                            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}
                                                            title="Dismiss notification"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={notif.id} className="NotificationCenter-item">
                                        <div className="NotificationCenter-item-top">
                                            <div className="NotificationCenter-passenger-name">
                                                <FaUser style={{ color: '#38bdf8' }} /> 
                                                {notif.passengerName || notif.passengerUsername} 
                                                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 'normal' }}>
                                                    (@{notif.passengerUsername || 'passenger'})
                                                </span>
                                            </div>
                                            <span className="NotificationCenter-route-badge">
                                                📍 {notif.route || `${notif.origin} ➔ ${notif.destination}`}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                                            {notif.message || `Passenger requested 1 seat from ${notif.origin} to ${notif.destination}.`}
                                        </div>

                                        <div className="NotificationCenter-meta">
                                            <span>
                                                <FaRupeeSign style={{ color: '#10b981' }} /> Fare: <strong>₹{notif.fare || 700}</strong>
                                            </span>
                                            <span>
                                                🕒 {notif.timestamp}
                                            </span>
                                            <span>
                                                {isPending && (
                                                    <span className="NotificationCenter-status-badge NotificationCenter-status-pending">
                                                        <FaHourglassHalf /> AWAITING DRIVER DECISION
                                                    </span>
                                                )}
                                                {isConfirmed && (
                                                    <span className="NotificationCenter-status-badge NotificationCenter-status-confirmed">
                                                        <FaCheckCircle /> CONFIRMED BY DRIVER
                                                    </span>
                                                )}
                                                {isCancelled && (
                                                    <span className="NotificationCenter-status-badge NotificationCenter-status-cancelled">
                                                        <FaTimesCircle /> CANCELLED BY DRIVER
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Decision Actions for Driver (Confirm or Cancel) */}
                                        <div className="NotificationCenter-actions">
                                            {isPending && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="NotificationCenter-btn-confirm"
                                                        onClick={() => this.handleConfirmRide(notif.id)}
                                                    >
                                                        <FaCheck /> Confirm Ride
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="NotificationCenter-btn-cancel"
                                                        onClick={() => this.handleCancelRide(notif.id)}
                                                    >
                                                        <FaTimes /> Cancel / Decline Ride
                                                    </button>
                                                </>
                                            )}

                                            {/* PAYMENT RECEIVED NOTIFICATION CARD FOR DRIVER */}
                                            {isPaymentReceived && (
                                                <div style={{ width: '100%', marginTop: '6px' }}>
                                                    <div style={{
                                                        background: 'rgba(16, 185, 129, 0.15)',
                                                        border: '1.5px solid #10b981',
                                                        borderRadius: '12px',
                                                        padding: '14px 16px',
                                                        boxShadow: '0 4px 18px rgba(16, 185, 129, 0.2)'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                                            <span style={{ color: '#10b981', fontWeight: '900', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <FaCheckCircle style={{ color: '#10b981', fontSize: '1.1rem' }} /> 💰 PAYMENT SUCCESSFUL & RECEIVED
                                                            </span>
                                                            <span style={{ background: '#10b981', color: '#0f172a', borderRadius: '14px', padding: '3px 10px', fontSize: '0.82rem', fontWeight: '900' }}>
                                                                + ₹{notif.fare || 525} RECEIVED
                                                            </span>
                                                        </div>

                                                        <div style={{ fontSize: '0.86rem', color: '#f8fafc', marginBottom: '10px', lineHeight: 1.4 }}>
                                                            Passenger <strong>{notif.passengerName || 'Rahul Sharma'}</strong> has completed cashless payment of <strong>₹{notif.fare || 525}</strong> via UPI.
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(0, 0, 0, 0.3)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                                                            <div>👤 <strong>Paid By:</strong> {notif.passengerName || 'Rahul Sharma'} (@{notif.passengerUsername || 'passenger'})</div>
                                                            <div>🔢 <strong>Txn ID:</strong> <span style={{ color: '#fef08a' }}>{notif.transactionId || 'T20261017...'}</span></div>
                                                            <div>📍 <strong>Route:</strong> {notif.route || `${notif.origin} ➔ ${notif.destination}`}</div>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                                            <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: 'bold' }}>
                                                                ⚡ Directly credited to your bank account via UPI
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    this.props.closed();
                                                                    if (this.props.history) this.props.history.push('/myTrips');
                                                                    else window.location.href = '/myTrips';
                                                                }}
                                                                style={{
                                                                    background: 'rgba(56, 189, 248, 0.2)',
                                                                    border: '1px solid #38bdf8',
                                                                    color: '#38bdf8',
                                                                    padding: '5px 12px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                View in Earnings ➔
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {isConfirmed && (
                                                <div style={{ width: '100%', marginTop: '6px' }}>
                                                    {/* Passenger Details Card */}
                                                    <div style={{
                                                        background: 'rgba(15, 23, 42, 0.75)',
                                                        border: '1px solid rgba(56, 189, 248, 0.35)',
                                                        borderRadius: '10px',
                                                        padding: '12px 14px',
                                                        marginBottom: '10px'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.86rem' }}>
                                                                ✅ PASSENGER DETAILS & SEAT LOCKED
                                                            </span>
                                                            <span style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', borderRadius: '12px', padding: '2px 8px', fontSize: '0.74rem', fontWeight: 'bold' }}>
                                                                1 Seat Reserved
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', fontSize: '0.82rem', color: '#e2e8f0' }}>
                                                            <div>👤 <strong>Passenger:</strong> {notif.passengerName || 'Rahul Sharma'}</div>
                                                            <div>🏷️ <strong>Username:</strong> @{notif.passengerUsername || 'passenger'}</div>
                                                            <div>📞 <strong>Phone:</strong> {notif.passengerPhone || '+91 98765 43210'}</div>
                                                            <div>💰 <strong>Agreed Fare:</strong> ₹{notif.fare || 525}</div>
                                                            <div style={{ gridColumn: '1 / -1' }}>📍 <strong>Route:</strong> {notif.route || `${notif.origin} ➔ ${notif.destination}`}</div>
                                                        </div>
                                                    </div>

                                                    {/* Driver Account: Awaiting Passenger Payment & Cancel Option */}
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                                        <span style={{ color: '#38bdf8', fontSize: '0.82rem', fontWeight: 'bold' }}>
                                                            ⏳ Awaiting passenger cashless payment via Payment Method. Payment will be credited automatically.
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() => this.handleCancelRide(notif.id)}
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.15)',
                                                                border: '1px solid #ef4444',
                                                                color: '#f87171',
                                                                borderRadius: '8px',
                                                                padding: '7px 14px',
                                                                fontSize: '0.78rem',
                                                                cursor: 'pointer',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            Cancel Ride
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {isCancelled && (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                    <span style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 'bold' }}>
                                                        ✕ Ride has been cancelled.
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => this.handleConfirmRide(notif.id)}
                                                        style={{
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            border: '1px solid #10b981',
                                                            color: '#10b981',
                                                            borderRadius: '6px',
                                                            padding: '5px 10px',
                                                            fontSize: '0.78rem',
                                                            cursor: 'pointer',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        Re-Confirm Ride
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="NotificationCenter-footer">
                        {notifications.length > 0 ? (
                            <button
                                type="button"
                                className="NotificationCenter-clear-all"
                                onClick={this.handleClearAll}
                            >
                                <FaTrashAlt /> Clear All Notifications
                            </button>
                        ) : <div />}

                        <button
                            type="button"
                            onClick={this.props.closed}
                            style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                color: '#ffffff',
                                padding: '7px 18px',
                                borderRadius: '20px',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Driver Manual Verification & Confirmation Modal */}
                <DriverPaymentConfirmModal
                    show={Boolean(this.state.showDriverConfirmModal)}
                    notification={this.state.showDriverConfirmModal}
                    driverUsername={this.state.showDriverConfirmModal && this.state.showDriverConfirmModal.driverUsername}
                    onClose={() => this.setState({ showDriverConfirmModal: null })}
                    onSuccess={() => {
                        this.setState({
                            showDriverConfirmModal: null,
                            activeQrNotifId: null
                        });
                        window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
                        window.dispatchEvent(new Event('carpool_payment_updated'));
                    }}
                />
            </div>
        );
    }
}

export default withRouter(NotificationCenter);
