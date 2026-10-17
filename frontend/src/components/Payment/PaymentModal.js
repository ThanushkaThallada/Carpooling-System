import React, { Component } from 'react';
import './PaymentModal.css';
import { FaCheck, FaShieldAlt, FaPrint, FaQrcode, FaClock, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import UpiQrCode from './UpiQrCode';
import { 
    PAYMENT_STATUS, 
    getDriverUpiId, 
    getAllPayments, 
    submitPassengerPayment, 
    disputePayment 
} from '../../shared/upiService';

class PaymentModal extends Component {
    state = {
        isProcessing: false,
        submittedPayment: null,
        disputeModalOpen: false,
        disputeReason: '',
        errorMessage: null
    };

    componentDidMount() {
        this.checkExistingPayment();
    }

    componentDidUpdate(prevProps) {
        if (this.props.show && !prevProps.show) {
            this.setState({ justPaid: false });
            this.checkExistingPayment();
        }
    }

    checkExistingPayment = () => {
        const { trip, existingTxnId, bookingId } = this.props;
        const tripId = trip ? (trip.id || trip.tripId || trip.modelId) : null;
        try {
            const history = getAllPayments();
            let found = null;
            if (existingTxnId) {
                found = history.find(p => p.transactionId === existingTxnId);
            }
            if (!found && bookingId) {
                found = history.find(p => p.bookingId === bookingId);
            }
            if (!found && tripId) {
                found = history.find(p => p.tripId && String(p.tripId) === String(tripId));
            }
            if (found) {
                this.setState({
                    submittedPayment: found
                });
            } else {
                this.setState({
                    submittedPayment: null,
                    errorMessage: null
                });
            }
        } catch (e) {
            this.setState({ submittedPayment: null });
        }
    };

    handleSubmitPayment = (e) => {
        if (e) e.preventDefault();
        const { trip, driver, passengerName, passengerUsername, fare, bookingId } = this.props;
        const rawFare = fare || (trip && trip.costPerPassenger) || 20;
        const totalFare = (rawFare >= 100) ? rawFare : (rawFare * 35);

        const driverObj = driver || (trip && (trip.user || trip.driver)) || {};
        const driverName = (driverObj.firstName || driverObj.lastName)
            ? `${driverObj.firstName || ''} ${driverObj.lastName || ''}`.trim()
            : (driverObj.username || 'Alex Driver');
        const driverUsername = driverObj.username || 'driver';
        const driverUpi = getDriverUpiId(driverUsername);

        const tripId = trip ? (trip.id || trip.tripId || trip.modelId) : null;
        const origin = (trip && trip.origin) ? trip.origin : 'Origin';
        const destination = (trip && trip.destination) ? trip.destination : 'Destination';

        this.setState({ isProcessing: true, errorMessage: null });

        try {
            const paymentRecord = submitPassengerPayment({
                tripId,
                bookingId: bookingId || ('BKG-' + (tripId || 'TRIP') + '-' + Date.now().toString().slice(-4)),
                origin,
                destination,
                amount: totalFare,
                passengerName: passengerName || 'Rahul Sharma',
                passengerUsername: passengerUsername || 'passenger',
                driverName,
                driverUsername,
                driverPhone: driverObj.phone || '+91 98765 43210',
                driverUpiId: driverUpi,
                paymentMethod: 'UPI Direct Payment'
            });

            this.setState({
                isProcessing: false,
                submittedPayment: paymentRecord,
                justPaid: true
            });

            if (this.props.onPaymentComplete) {
                this.props.onPaymentComplete(paymentRecord.transactionId, paymentRecord);
            }
        } catch (err) {
            this.setState({
                isProcessing: false,
                errorMessage: err.message || 'Error recording payment submission.'
            });
        }
    };

    handleRaiseDispute = () => {
        const { submittedPayment, disputeReason } = this.state;
        if (!submittedPayment || !disputeReason.trim()) return;

        try {
            const updated = disputePayment({
                transactionId: submittedPayment.transactionId,
                reason: disputeReason,
                disputedBy: this.props.passengerUsername || 'passenger',
                role: 'PASSENGER'
            });
            this.setState({
                submittedPayment: updated,
                disputeModalOpen: false,
                disputeReason: ''
            });
        } catch (e) {
            alert(e.message);
        }
    };

    handlePrintReceipt = () => {
        window.print();
    };

    render() {
        if (!this.props.show) return null;

        const { trip, driver, passengerName, fare, onClose, viewReceipt } = this.props;
        const rawFare = fare || (trip && trip.costPerPassenger) || 20;
        const totalFare = (rawFare >= 100) ? rawFare : (rawFare * 35);

        const { isProcessing, submittedPayment, disputeModalOpen, disputeReason, errorMessage, justPaid } = this.state;

        const driverObj = driver || (trip && (trip.user || trip.driver)) || {};
        const driverName = (driverObj.firstName || driverObj.lastName)
            ? `${driverObj.firstName || ''} ${driverObj.lastName || ''}`.trim()
            : (driverObj.username || 'Alex Driver');
        const driverUsername = driverObj.username || 'driver';
        const driverVpa = getDriverUpiId(driverUsername);

        const routeDisplay = (trip && trip.origin && trip.destination) 
            ? `${trip.origin} ➔ ${trip.destination}` 
            : 'Highway Corridor';

        const isVerified = submittedPayment && submittedPayment.status === PAYMENT_STATUS.PAID_VERIFIED;
        const isPending = submittedPayment && submittedPayment.status === PAYMENT_STATUS.PENDING;
        const isDriverReported = submittedPayment && submittedPayment.status === PAYMENT_STATUS.DRIVER_REPORTED_RECEIVED;
        const isDisputed = submittedPayment && submittedPayment.status === PAYMENT_STATUS.FAILED_OR_DISPUTED;

        // Show receipt view ONLY if explicitly requested via viewReceipt prop or immediately after completing payment
        const showReceiptView = Boolean(viewReceipt) || (Boolean(justPaid) && (isVerified || isPending || isDriverReported || isDisputed));

        return (
            <div className="PaymentModal-overlay" onClick={onClose}>
                <div className="PaymentModal-card" onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div className="QR-header">
                        <div className="QR-header-left">
                            <FaShieldAlt style={{ fontSize: '1.4rem', color: '#10b981' }} />
                            <div>
                                <div className="QR-header-title">
                                    {showReceiptView ? 'Payment Receipt & Confirmation' : 'Payment Method — UPI Direct Payment'}
                                </div>
                                <div className="QR-header-sub">
                                    {showReceiptView ? 'Official transaction ledger & confirmation status' : 'Scan driver UPI QR code or pay directly with your UPI app'}
                                </div>
                            </div>
                        </div>
                        <button type="button" className="PaymentModal-close-btn" onClick={onClose}>✕</button>
                    </div>

                    {!showReceiptView ? (
                        /* STEP 1: DIRECT PASSENGER PAYMENT WITH DRIVER UPI QR CODE SCANNER */
                        <div className="QR-body" style={{ padding: '24px 20px', textAlign: 'center' }}>
                            {errorMessage && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    color: '#f87171',
                                    fontSize: '0.85rem',
                                    marginBottom: '16px'
                                }}>
                                    ⚠️ {errorMessage}
                                </div>
                            )}

                            {/* Scannable Driver UPI QR Code */}
                            <UpiQrCode
                                vpa={driverVpa}
                                payeeName={driverName}
                                amount={totalFare}
                                route={routeDisplay}
                                passengerName={passengerName || 'Passenger'}
                                bookingId={this.props.bookingId}
                                title="SCAN DRIVER UPI QR CODE TO PAY"
                                subtitle={<>Scan with GPay, PhonePe, Paytm, BHIM, or any UPI app to pay ₹{totalFare}</>}
                            />

                            {/* Direct Pay Action Button */}
                            <button
                                type="button"
                                className="QR-confirm-btn"
                                onClick={this.handleSubmitPayment}
                                disabled={isProcessing}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45)',
                                    fontSize: '1.05rem',
                                    fontWeight: '900',
                                    padding: '14px 24px',
                                    borderRadius: '10px',
                                    width: '100%',
                                    maxWidth: '380px',
                                    margin: '18px auto 0',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                {isProcessing ? '⏳ Verifying & Processing...' : `✓ Complete Payment (₹${totalFare})`}
                            </button>

                            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.82rem', color: '#94a3b8' }}>
                                <FaShieldAlt style={{ color: '#10b981' }} />
                                <span>Direct cashless payment. Both you and driver receive instant confirmation.</span>
                            </div>
                        </div>
                    ) : (
                        /* STEP 2: STATUS & RECEIPT VIEW (WITHOUT UTR) */
                        <div className="PhonePe-success-screen" style={{ padding: '20px' }}>
                            {/* Prominent Verification State Banner */}
                            {isVerified ? (
                                <div style={{
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid #10b981',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    marginBottom: '16px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: '#10b981', fontWeight: '900', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <FaCheck /> PAYMENT SUCCESSFUL
                                    </div>
                                    <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginTop: '4px' }}>
                                        Paid to Driver {submittedPayment ? submittedPayment.driver : driverName} on {submittedPayment ? submittedPayment.timestamp : 'Today'}. Seat is confirmed.
                                    </div>
                                </div>
                            ) : isPending || isDriverReported ? (
                                <div style={{
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    border: '1.5px dashed #f59e0b',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    marginBottom: '16px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: '#fbbf24', fontWeight: '900', fontSize: '1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <FaClock /> PAYMENT IN PROGRESS
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '6px' }}>
                                        {isDriverReported 
                                            ? 'Driver has reported payment received. Seat is locked.' 
                                            : 'Processing payment confirmation with driver.'}
                                    </div>
                                </div>
                            ) : isDisputed ? (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid #ef4444',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    marginBottom: '16px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: '#f87171', fontWeight: '900', fontSize: '1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <FaExclamationTriangle /> TRANSACTION DISPUTED
                                    </div>
                                    <div style={{ fontSize: '0.84rem', color: '#cbd5e1', marginTop: '4px' }}>
                                        Reason: {submittedPayment.disputeReason || 'Disputed by passenger'}. Admin investigation underway.
                                    </div>
                                </div>
                            ) : null}

                            {/* Transaction Details Ledger (UTR REMOVED) */}
                            <div className="PhonePe-txn-card">
                                <div className="PhonePe-txn-row">
                                    <span className="PhonePe-label">Transaction ID</span>
                                    <span className="PhonePe-value">{submittedPayment ? submittedPayment.transactionId : 'N/A'}</span>
                                </div>
                                <div className="PhonePe-txn-row">
                                    <span className="PhonePe-label">Booking Reference</span>
                                    <span className="PhonePe-value">{submittedPayment && submittedPayment.bookingId ? submittedPayment.bookingId : (this.props.bookingId || 'BKG-7712')}</span>
                                </div>
                                <div className="PhonePe-txn-row">
                                    <span className="PhonePe-label">Payee (Driver)</span>
                                    <span className="PhonePe-value">{submittedPayment ? submittedPayment.driver : driverName} ({submittedPayment ? submittedPayment.driverUpiId : driverVpa})</span>
                                </div>
                                <div className="PhonePe-txn-row">
                                    <span className="PhonePe-label">Passenger</span>
                                    <span className="PhonePe-value">{submittedPayment ? submittedPayment.passengerName : (passengerName || 'Passenger')}</span>
                                </div>
                                <div className="PhonePe-txn-row">
                                    <span className="PhonePe-label">Ride Route</span>
                                    <span className="PhonePe-value" style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                                        {submittedPayment ? submittedPayment.route : routeDisplay}
                                    </span>
                                </div>
                                <div className="PhonePe-txn-row">
                                    <span className="PhonePe-label">Agreed Amount</span>
                                    <span className="PhonePe-value" style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        ₹{submittedPayment ? submittedPayment.amount : totalFare}
                                    </span>
                                </div>
                                <div className="PhonePe-txn-row">
                                    <span className="PhonePe-label">Date & Time</span>
                                    <span className="PhonePe-value">{submittedPayment ? submittedPayment.timestamp : 'Today'}</span>
                                </div>
                                <div className="PhonePe-txn-row" style={{ borderBottom: 'none' }}>
                                    <span className="PhonePe-label">Payment Status</span>
                                    <span style={{
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        color: isVerified ? '#10b981' : (isPending || isDriverReported ? '#fbbf24' : '#f87171')
                                    }}>
                                        {isVerified ? 'PAYMENT SUCCESSFUL ✅' : (isDriverReported ? 'PAYMENT RECEIVED' : (isPending ? 'PROCESSING' : 'DISPUTED ⚠️'))}
                                    </span>
                                </div>
                            </div>

                            {/* Dispute Modal dialog */}
                            {disputeModalOpen && (
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid #ef4444',
                                    borderRadius: '10px',
                                    padding: '14px',
                                    marginTop: '12px',
                                    textAlign: 'left'
                                }}>
                                    <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '6px' }}>
                                        Report Payment Dispute:
                                    </div>
                                    <textarea
                                        value={disputeReason}
                                        onChange={(e) => this.setState({ disputeReason: e.target.value })}
                                        placeholder="Explain the issue (e.g., money debited from bank but driver denied, duplicate deduction, ride cancelled)..."
                                        rows="3"
                                        style={{
                                            width: '100%',
                                            background: '#0f172a',
                                            border: '1px solid #64748b',
                                            borderRadius: '6px',
                                            color: '#ffffff',
                                            padding: '8px',
                                            fontSize: '0.84rem'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={this.handleRaiseDispute}
                                            style={{
                                                background: '#ef4444',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            Submit Dispute
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => this.setState({ disputeModalOpen: false })}
                                            style={{
                                                background: 'transparent',
                                                color: '#94a3b8',
                                                border: '1px solid #64748b',
                                                borderRadius: '6px',
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="PhonePe-actions" style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {isVerified ? (
                                    <button
                                        type="button"
                                        className="PhonePe-receipt-btn"
                                        onClick={this.handlePrintReceipt}
                                    >
                                        <FaPrint style={{ marginRight: '6px' }} /> Print Official Invoice
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid #ef4444',
                                            color: '#f87171',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            fontSize: '0.82rem',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={() => this.setState({ disputeModalOpen: true })}
                                    >
                                        ⚠️ Report Payment Dispute
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="PhonePe-done-btn"
                                    onClick={onClose}
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

export default PaymentModal;
