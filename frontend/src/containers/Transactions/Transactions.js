import React, { Component } from 'react';
import { connect } from 'react-redux';
import { 
    FaReceipt, FaRupeeSign, FaCheckCircle, FaFileInvoiceDollar, 
    FaArrowDown, FaCar, FaClock, FaCalendarAlt, FaDownload, FaPrint,
    FaQrcode, FaCheck, FaExclamationTriangle
} from 'react-icons/fa';
import './Transactions.css';
import { 
    PAYMENT_STATUS, 
    getAllPayments, 
    getDriverUpiId, 
    setDriverUpiId 
} from '../../shared/upiService';

class Transactions extends Component {
    state = {
        transactions: [],
        selectedReceipt: null,
        filter: 'ALL',
        showUpiModal: false,
        driverUpiInput: '',
        driverUpi: 'driver@ybl',
        successNotice: null
    };

    componentDidMount() {
        this.loadTransactions();
        const username = this.props.username || localStorage.getItem('userId') || 'driver';
        this.setState({ driverUpi: getDriverUpiId(username) });
        window.addEventListener('carpool_payment_updated', this.loadTransactions);
        window.addEventListener('carpool_driver_upi_updated', this.loadUpiId);
    }

    componentWillUnmount() {
        window.removeEventListener('carpool_payment_updated', this.loadTransactions);
        window.removeEventListener('carpool_driver_upi_updated', this.loadUpiId);
    }

    loadUpiId = () => {
        const username = this.props.username || localStorage.getItem('userId') || 'driver';
        this.setState({ driverUpi: getDriverUpiId(username) });
    };

    loadTransactions = () => {
        try {
            const list = getAllPayments();
            this.setState({ transactions: list });
        } catch (e) {
            this.setState({ transactions: [] });
        }
    };

    handleSaveUpi = (e) => {
        if (e) e.preventDefault();
        const username = this.props.username || localStorage.getItem('userId') || 'driver';
        try {
            const saved = setDriverUpiId(username, this.state.driverUpiInput);
            this.setState({
                driverUpi: saved,
                showUpiModal: false,
                successNotice: `✅ Driver receiving UPI ID updated to ${saved}`
            });
            setTimeout(() => this.setState({ successNotice: null }), 3500);
        } catch (err) {
            alert(err.message || 'Invalid UPI ID format');
        }
    };

    openReceiptModal = (tx) => {
        this.setState({ selectedReceipt: tx });
    };

    closeReceiptModal = () => {
        this.setState({ selectedReceipt: null });
    };

    printReceipt = () => {
        window.print();
    };

    render() {
        const { transactions, selectedReceipt, filter, showUpiModal, driverUpiInput, driverUpi, successNotice } = this.state;
        const username = this.props.username || localStorage.getItem('userId') || '';
        const userRole = this.props.userRole || localStorage.getItem('userRole') || '';
        const isAdmin = (userRole === 'ADMIN') || (username && username.toLowerCase() === 'admin');
        const isDriver = (userRole === 'DRIVER') || (username && username.toLowerCase() === 'driver');

        // Filter transactions strictly for the current user (Admins see all transactions)
        const userTransactions = transactions.filter(t => {
            if (!t) return false;
            if (isAdmin) return true;
            if (!username) return false;
            if (isDriver) {
                return (t.driverUsername && t.driverUsername.toLowerCase() === username.toLowerCase());
            } else {
                return (t.passengerUsername && t.passengerUsername.toLowerCase() === username.toLowerCase());
            }
        });

        const filteredList = userTransactions.filter(t => {
            if (filter === 'ALL') return true;
            return t.status === filter;
        });

        const totalAmount = filteredList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const verifiedCount = filteredList.filter(t => t.status === PAYMENT_STATUS.PAID_VERIFIED || (t.status && t.status.includes('PAID'))).length;
        const pendingCount = filteredList.filter(t => t.status === PAYMENT_STATUS.PENDING || t.status === PAYMENT_STATUS.DRIVER_REPORTED_RECEIVED).length;

        return (
            <div className="Transactions-container">
                {/* Header */}
                <div className="Transactions-header">
                    <div>
                        <h1 className="Transactions-title">
                            <FaFileInvoiceDollar style={{ color: '#38bdf8' }} /> Payment & Transaction Ledger
                        </h1>
                        <div className="Transactions-subtitle">
                            Official GST receipts, Driver UPI payment verification, and audit tracking
                        </div>
                    </div>
                </div>

                {successNotice && (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid #10b981',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        color: '#10b981',
                        fontWeight: 'bold',
                        marginBottom: '16px'
                    }}>
                        {successNotice}
                    </div>
                )}

                {/* Driver UPI Configuration Card */}
                {isDriver && (
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1.5px solid #38bdf8',
                        borderRadius: '14px',
                        padding: '16px 20px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)'
                    }}>
                        <div>
                            <div style={{ color: '#38bdf8', fontWeight: '800', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaQrcode /> Driver Direct UPI Receiving Account
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: '4px' }}>
                                Payments from passenger QR scans are credited to: <strong style={{ color: '#fef08a' }}>{driverUpi}</strong>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => this.setState({ showUpiModal: true, driverUpiInput: driverUpi })}
                            style={{
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                border: '1px solid #38bdf8',
                                color: '#ffffff',
                                padding: '9px 16px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Configure UPI ID
                        </button>
                    </div>
                )}

                {/* Metric Summary Cards */}
                <div className="Transactions-metrics-grid">
                    <div className="Transactions-metric-card">
                        <div className="Transactions-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            <FaRupeeSign />
                        </div>
                        <div className="Transactions-metric-info">
                            <h4>{isDriver ? 'Total Recorded Volume' : 'Total Ride Spend'}</h4>
                            <p style={{ color: '#10b981' }}>₹{totalAmount.toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    <div className="Transactions-metric-card">
                        <div className="Transactions-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            <FaCheckCircle />
                        </div>
                        <div className="Transactions-metric-info">
                            <h4>Verified & Confirmed</h4>
                            <p style={{ color: '#38bdf8' }}>{verifiedCount} Rides</p>
                        </div>
                    </div>

                    <div className="Transactions-metric-card">
                        <div className="Transactions-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                            <FaClock />
                        </div>
                        <div className="Transactions-metric-info">
                            <h4>Pending Verification</h4>
                            <p style={{ color: '#fbbf24' }}>{pendingCount} Rides</p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {['ALL', PAYMENT_STATUS.PAID_VERIFIED, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.DRIVER_REPORTED_RECEIVED, PAYMENT_STATUS.FAILED_OR_DISPUTED].map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => this.setState({ filter: s })}
                            style={{
                                background: filter === s ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)',
                                color: filter === s ? '#0f172a' : '#cbd5e1',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {s === 'ALL' ? 'All Transactions' : (s === PAYMENT_STATUS.PAID_VERIFIED ? 'Verified' : (s === PAYMENT_STATUS.PENDING ? 'Pending' : (s === PAYMENT_STATUS.DRIVER_REPORTED_RECEIVED ? 'Driver Reported' : 'Disputed')))}
                        </button>
                    ))}
                </div>

                {/* Transaction Ledger Card */}
                <div className="Transactions-card">
                    <div className="Transactions-card-header">
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💳 Payment History & Invoices ({filteredList.length})
                        </h3>
                    </div>

                    {filteredList.length === 0 ? (
                        <div className="Transactions-empty">
                            <FaReceipt style={{ fontSize: '3rem', color: '#475569', marginBottom: '12px' }} />
                            <h3>No transactions found</h3>
                            <p>Complete a ride booking or payment to view your invoice history.</p>
                        </div>
                    ) : (
                        <div className="Transactions-list">
                            {filteredList.map((tx, idx) => {
                                const isTxVerified = tx.status === PAYMENT_STATUS.PAID_VERIFIED || (tx.status && tx.status.includes('PAID') && !tx.status.includes('PENDING'));
                                const isTxPending = tx.status === PAYMENT_STATUS.PENDING;
                                const isTxReported = tx.status === PAYMENT_STATUS.DRIVER_REPORTED_RECEIVED;
                                const isTxDisputed = tx.status === PAYMENT_STATUS.FAILED_OR_DISPUTED;

                                return (
                                    <div key={idx} className="Transactions-item">
                                        <div className="Transactions-item-left">
                                            <div className="Transactions-item-icon" style={{
                                                background: isTxVerified ? 'rgba(16, 185, 129, 0.15)' : (isTxPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                                color: isTxVerified ? '#10b981' : (isTxPending ? '#fbbf24' : '#f87171')
                                            }}>
                                                <FaArrowDown />
                                            </div>
                                            <div className="Transactions-item-details">
                                                <strong>{tx.route || `${tx.origin} ➔ ${tx.destination}`}</strong>
                                                <span>
                                                    <FaCar style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                                    Driver: {tx.driver || 'Alex Driver'} • Passenger: {tx.passengerName || tx.passenger || 'Passenger'}
                                                </span>
                                                <span style={{ marginTop: '2px' }}>
                                                    <FaCalendarAlt style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                                    {tx.timestamp || 'Today'} • Ref: {tx.transactionId || tx.id}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="Transactions-item-right">
                                            <div className="Transactions-item-amount">
                                                ₹{tx.amount}
                                                <div style={{
                                                    fontSize: '0.74rem',
                                                    fontWeight: 'bold',
                                                    color: isTxVerified ? '#10b981' : (isTxReported ? '#38bdf8' : (isTxPending ? '#fbbf24' : '#f87171'))
                                                }}>
                                                    {isTxVerified ? '● PAID & VERIFIED' : (isTxReported ? '● REPORTED RECEIVED' : (isTxPending ? '● PENDING VERIFICATION' : '● DISPUTED'))}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="Transactions-receipt-btn"
                                                onClick={() => this.openReceiptModal(tx)}
                                            >
                                                <FaReceipt /> View Slip
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Edit Driver UPI Modal */}
                {showUpiModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 99999, padding: '20px'
                    }}>
                        <div style={{
                            background: '#0f172a',
                            border: '1.5px solid #38bdf8',
                            borderRadius: '14px',
                            maxWidth: '440px',
                            width: '100%',
                            padding: '24px',
                            color: '#ffffff'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaQrcode /> Configure Receiving UPI ID
                            </h3>
                            <p style={{ fontSize: '0.84rem', color: '#cbd5e1', marginBottom: '14px', lineHeight: '1.4' }}>
                                Enter the UPI ID (VPA) linked to your bank account. Passenger payments made via QR scan will be directed here.
                            </p>
                            <form onSubmit={this.handleSaveUpi}>
                                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                                    UPI ID (e.g. alex.driver@oksbi, driver@ybl, 9876543210@paytm):
                                </label>
                                <input
                                    type="text"
                                    value={driverUpiInput}
                                    onChange={(e) => this.setState({ driverUpiInput: e.target.value })}
                                    placeholder="yourname@bank"
                                    required
                                    style={{
                                        width: '100%',
                                        background: '#1e293b',
                                        border: '1px solid rgba(56, 189, 248, 0.4)',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        color: '#ffffff',
                                        fontSize: '0.9rem',
                                        marginBottom: '16px'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => this.setState({ showUpiModal: false })}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid #64748b',
                                            color: '#cbd5e1',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            border: 'none',
                                            color: '#ffffff',
                                            padding: '8px 18px',
                                            borderRadius: '6px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Save UPI ID
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Receipt Modal */}
                {selectedReceipt && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 99999, padding: '20px'
                    }}>
                        <div style={{
                            background: '#0f172a',
                            border: '1px solid #38bdf8',
                            borderRadius: '20px',
                            width: '100%',
                            maxWidth: '520px',
                            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
                            overflow: 'hidden',
                            color: '#f8fafc'
                        }}>
                            {/* Receipt Header */}
                            <div style={{
                                background: selectedReceipt.status === PAYMENT_STATUS.PAID_VERIFIED ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
                                padding: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                                    {selectedReceipt.status === PAYMENT_STATUS.PAID_VERIFIED ? '✅ Official Ride Tax Invoice' : '⏳ Payment Verification Slip'}
                                </div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px' }}>
                                    GSTIN: 36AABCC1234D1Z5 • Intercity Carpool Network
                                </div>
                            </div>

                            {/* Prominent Verification Alert if not verified */}
                            {selectedReceipt.status !== PAYMENT_STATUS.PAID_VERIFIED && (
                                <div style={{
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    borderBottom: '1px solid #f59e0b',
                                    padding: '10px 16px',
                                    color: '#fef08a',
                                    fontSize: '0.8rem',
                                    textAlign: 'center',
                                    fontWeight: 'bold'
                                }}>
                                    ⚠️ PENDING VERIFICATION: This slip is NOT proof of successful payment until verified by the driver or bank.
                                </div>
                            )}

                            {/* Receipt Body */}
                            <div style={{ padding: '20px 24px', fontSize: '0.88rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px 0' }}>
                                    <span style={{ color: '#94a3b8' }}>Transaction Ref:</span>
                                    <span style={{ fontWeight: 'bold' }}>{selectedReceipt.transactionId || selectedReceipt.id}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px 0' }}>
                                    <span style={{ color: '#94a3b8' }}>Passenger:</span>
                                    <span>{selectedReceipt.passengerName || selectedReceipt.passenger || 'Passenger'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px 0' }}>
                                    <span style={{ color: '#94a3b8' }}>Driver:</span>
                                    <span>{selectedReceipt.driver || 'Alex Driver'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px 0' }}>
                                    <span style={{ color: '#94a3b8' }}>Route Corridor:</span>
                                    <span style={{ color: '#38bdf8' }}>{selectedReceipt.route || `${selectedReceipt.origin} ➔ ${selectedReceipt.destination}`}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px 0' }}>
                                    <span style={{ color: '#94a3b8' }}>Base Fare:</span>
                                    <span>₹{Math.round(selectedReceipt.amount / 1.05)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px 0' }}>
                                    <span style={{ color: '#94a3b8' }}>GST (5% Ride Share Tax):</span>
                                    <span>₹{selectedReceipt.amount - Math.round(selectedReceipt.amount / 1.05)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', fontSize: '1.05rem', fontWeight: '800' }}>
                                    <span style={{ color: '#ffffff' }}>Agreed Amount:</span>
                                    <span style={{ color: '#10b981' }}>₹{selectedReceipt.amount}</span>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div style={{
                                padding: '16px 24px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                            }}>
                                {selectedReceipt.status === PAYMENT_STATUS.PAID_VERIFIED && (
                                    <button
                                        type="button"
                                        onClick={this.printReceipt}
                                        style={{
                                            background: 'rgba(56, 189, 248, 0.15)',
                                            border: '1px solid #38bdf8',
                                            color: '#38bdf8',
                                            padding: '10px 18px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <FaPrint /> Print / Save
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={this.closeReceiptModal}
                                    style={{
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                        border: 'none',
                                        color: '#ffffff',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        username: state.auth.userId || state.auth.username,
        userRole: state.auth.userRole,
        token: state.auth.token
    };
};

export default connect(mapStateToProps)(Transactions);
