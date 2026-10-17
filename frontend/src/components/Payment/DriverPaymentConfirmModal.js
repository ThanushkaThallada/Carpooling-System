import React, { Component } from 'react';
import './DriverPaymentConfirmModal.css';
import { FaShieldAlt, FaCheckCircle, FaLock, FaRupeeSign, FaTimes, FaMobileAlt, FaExclamationTriangle } from 'react-icons/fa';
import { driverConfirmPaymentReceived, PAYMENT_STATUS } from '../../shared/upiService';

class DriverPaymentConfirmModal extends Component {
    state = {
        isVerifiedCheckbox: false,
        isSubmitting: false,
        errorMessage: ''
    };

    componentDidUpdate(prevProps) {
        if (!prevProps.show && this.props.show) {
            this.setState({
                isVerifiedCheckbox: false,
                isSubmitting: false,
                errorMessage: ''
            });
        }
    }

    handleConfirm = () => {
        const notif = this.props.notification;
        if (!notif) return;

        if (!this.state.isVerifiedCheckbox) {
            this.setState({ errorMessage: 'You must confirm that you have checked your bank or UPI app.' });
            return;
        }

        const currentDriver = this.props.driverUsername || localStorage.getItem('userId') || 'driver';
        this.setState({ isSubmitting: true, errorMessage: '' });

        try {
            const result = driverConfirmPaymentReceived({
                transactionId: notif.transactionId,
                bookingId: notif.id || notif.bookingId,
                driverUsername: notif.driverUsername || currentDriver,
                verificationNote: `Driver @${currentDriver} verified funds in UPI application / bank statement`
            });

            this.setState({ isSubmitting: false });
            if (this.props.onSuccess) {
                this.props.onSuccess(result);
            }
        } catch (err) {
            this.setState({
                isSubmitting: false,
                errorMessage: err.message || 'Verification failed. Please try again.'
            });
        }
    };

    render() {
        const { show, notification, onClose } = this.props;
        if (!show || !notification) return null;

        const fare = notification.fare || notification.amount || 700;
        const passengerName = notification.passengerName || 'Passenger';
        const passengerUsername = notification.passengerUsername || 'passenger';
        const route = notification.route || (notification.origin ? `${notification.origin} ➔ ${notification.destination}` : 'Highway Route');
        const bookingId = notification.id || notification.bookingId || 'BKG-' + Date.now();

        return (
            <div className="DriverConfirmModal-overlay" onClick={onClose}>
                <div className="DriverConfirmModal-card" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="DriverConfirmModal-header">
                        <div className="DriverConfirmModal-header-badge">
                            <FaShieldAlt /> SECURE DRIVER VERIFICATION
                        </div>
                        <button type="button" className="DriverConfirmModal-close-btn" onClick={onClose}>
                            <FaTimes />
                        </button>
                        <h2 className="DriverConfirmModal-title">
                            Verify & Confirm Payment Received
                        </h2>
                        <p className="DriverConfirmModal-subtitle">
                            Please verify that funds were credited to your bank account or UPI app before confirming.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="DriverConfirmModal-body">
                        {/* Booking & Fare Summary Box */}
                        <div className="DriverConfirmModal-summary-box">
                            <div className="DriverConfirmModal-row">
                                <span className="DriverConfirmModal-label">Passenger</span>
                                <span className="DriverConfirmModal-val">
                                    <strong>{passengerName}</strong> (@{passengerUsername})
                                </span>
                            </div>
                            <div className="DriverConfirmModal-row">
                                <span className="DriverConfirmModal-label">Route</span>
                                <span className="DriverConfirmModal-val">📍 {route}</span>
                            </div>
                            <div className="DriverConfirmModal-row">
                                <span className="DriverConfirmModal-label">Booking ID</span>
                                <span className="DriverConfirmModal-val" style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                                    {bookingId}
                                </span>
                            </div>
                            <div className="DriverConfirmModal-row DriverConfirmModal-fare-row">
                                <span className="DriverConfirmModal-label">
                                    Agreed Fare <FaLock title="Fare is locked and cannot be changed" style={{ color: '#fbbf24', marginLeft: '4px' }} />
                                </span>
                                <span className="DriverConfirmModal-fare-amount">
                                    ₹{fare}
                                </span>
                            </div>
                        </div>

                        {/* Verification Notice */}
                        <div className="DriverConfirmModal-warning-box">
                            <FaMobileAlt style={{ fontSize: '1.4rem', color: '#38bdf8', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: 'bold', color: '#ffffff', marginBottom: '2px' }}>
                                    Check your UPI App or Bank SMS
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                                    Open your Google Pay, PhonePe, Paytm, or mobile banking application to confirm that <strong>₹{fare}</strong> has been credited to your account.
                                </div>
                            </div>
                        </div>


                        {/* Mandatory Verification Checkbox */}
                        <div className="DriverConfirmModal-checkbox-container">
                            <label className="DriverConfirmModal-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={this.state.isVerifiedCheckbox}
                                    onChange={e => this.setState({ isVerifiedCheckbox: e.target.checked, errorMessage: '' })}
                                />
                                <span>
                                    I confirm that I have checked my bank statement or UPI app and personally verified that <strong>₹{fare}</strong> has been received from passenger <strong>{passengerName}</strong>.
                                </span>
                            </label>
                        </div>

                        {this.state.errorMessage && (
                            <div className="DriverConfirmModal-error-box">
                                <FaExclamationTriangle /> {this.state.errorMessage}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="DriverConfirmModal-footer">
                        <button
                            type="button"
                            className="DriverConfirmModal-btn cancel"
                            onClick={onClose}
                            disabled={this.state.isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="DriverConfirmModal-btn confirm"
                            onClick={this.handleConfirm}
                            disabled={!this.state.isVerifiedCheckbox || this.state.isSubmitting}
                        >
                            <FaCheckCircle /> {this.state.isSubmitting ? 'Verifying...' : `Confirm Payment Received (₹${fare})`}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default DriverPaymentConfirmModal;
