import React, { Component } from "react";
import * as actions from "../../store/actions";
import { connect } from "react-redux";
import Spinner from "../../components/UI/Spinner/Spinner";
import Trip from "../../components/TripComponents/Trip/Trip";
import './MyTrips.css';
import { 
    FaCreditCard, FaReceipt, FaCheckCircle, FaCar, 
    FaHistory, FaRupeeSign, FaShieldAlt, FaCopy, 
    FaPrint, FaBell, FaTrashAlt, FaUserCheck, FaQrcode, FaCheck, FaExclamationTriangle, FaClock, FaTicketAlt
} from 'react-icons/fa';
import UpiQrCode from "../../components/Payment/UpiQrCode";
import PaymentModal from "../../components/Payment/PaymentModal";
import DriverPaymentConfirmModal from "../../components/Payment/DriverPaymentConfirmModal";
import { 
    PAYMENT_STATUS, 
    getDriverUpiId, 
    driverConfirmPaymentReceived, 
    getAllPayments,
    submitPassengerPayment
} from "../../shared/upiService";

class MyTrips extends Component {
    state = {
        activeTab: 'trips', // 'trips' or 'payments'
        paymentHistory: [],
        driverReceivedPayments: [],
        driverNotifications: [],
        passengerBookings: [],
        selectedInvoice: null,
        copiedTxn: null,
        activeQrNotifId: null,
        showDriverConfirmModal: null,
        confirmedUtrInput: '',
        verificationChecked: false,
        passengerPayModalTrip: null,
        driverRideStarted: localStorage.getItem('carpool_active_ride_started') === 'true',
        passengerConfirmedBookingModal: null
    };

    componentDidMount() {
        this.props.onFetchTrips(this.props.token, '/myTrips');
        this.loadData();

        // Listen for new payments & notifications
        window.addEventListener('carpool_payment_updated', this.loadData);
        window.addEventListener('carpool_driver_notifications_updated', this.loadData);
        window.addEventListener('storage', this.loadData);

        // Active polling every 1.5 seconds for instant cross-tab driver and passenger synchronization
        this.pollInterval = setInterval(this.loadData, 1500);
    }

    componentWillUnmount() {
        this.props.onDismountMyTrips();
        window.removeEventListener('carpool_payment_updated', this.loadData);
        window.removeEventListener('carpool_driver_notifications_updated', this.loadData);
        window.removeEventListener('storage', this.loadData);
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }

    loadData = () => {
        try {
            const currentUsername = this.props.username || '';
            const isDriverUser = currentUsername.toLowerCase() === 'driver';
            let rawHistory = JSON.parse(localStorage.getItem('carpool_payment_history') || '[]');

            // Clean storage by removing any legacy mock/sample with tripId === 1
            const cleanedStorage = rawHistory.filter(tx => tx && tx.tripId !== 1);
            if (cleanedStorage.length !== rawHistory.length) {
                localStorage.setItem('carpool_payment_history', JSON.stringify(cleanedStorage));
            }

            // 1. Filter passenger payments (payments made by this user)
            const userTransactions = cleanedStorage.filter(tx => {
                if (!currentUsername) return false;
                const matchesUser = (tx.passengerUsername && tx.passengerUsername.toLowerCase() === currentUsername.toLowerCase());
                return matchesUser && tx.status !== 'CANCELLED & REFUNDED';
            });

            // 2. Filter driver received payments (payments received from passengers who completed payment)
            let driverTransactions = cleanedStorage.filter(tx => {
                if (!currentUsername) return false;
                const matchesDriver = (tx.driverUsername && tx.driverUsername.toLowerCase() === currentUsername.toLowerCase());
                return matchesDriver && tx.status !== 'CANCELLED & REFUNDED';
            });

            // 3. Load driver notifications for passenger acceptances
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const activeDriverRoute = JSON.parse(localStorage.getItem('carpool_active_driver_route') || 'null');
            const savedTrips = JSON.parse(localStorage.getItem('carpool_created_trips') || '[]');
            const latestCreatedTrip = (savedTrips && savedTrips.length > 0 && savedTrips[0].trip) ? savedTrips[0].trip : null;

            const sampleOrigin = (activeDriverRoute && activeDriverRoute.origin) || (latestCreatedTrip && latestCreatedTrip.origin) || 'Hyderabad';
            const sampleDest = (activeDriverRoute && activeDriverRoute.destination) || (latestCreatedTrip && latestCreatedTrip.destination) || 'Bengaluru';
            let sampleFare = (latestCreatedTrip && Number(latestCreatedTrip.costPerPassenger)) || (activeDriverRoute && Number(activeDriverRoute.fare)) || 700;
            if (sampleFare > 0 && sampleFare < 100) sampleFare = sampleFare * 35;
            if (!sampleFare || sampleFare <= 0) sampleFare = 700;
            const routeSlug = (sampleOrigin + '-' + sampleDest).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const sampleTripId = (latestCreatedTrip && (latestCreatedTrip.modelId || latestCreatedTrip.id)) || (activeDriverRoute && activeDriverRoute.tripId) || ('TRIP-' + routeSlug);

            // Automatic settlement & synchronization: if a passenger payment exists in cleanedStorage for this route, sync it immediately
            const syncedNotifs = rawNotifs.map(n => {
                if (!n) return n;
                const matchingPayment = cleanedStorage.find(tx => 
                    (tx.transactionId && n.transactionId && tx.transactionId === n.transactionId) ||
                    (tx.bookingId && n.id && tx.bookingId === n.id) ||
                    (tx.bookingId && n.bookingId && tx.bookingId === n.bookingId) ||
                    (tx.passengerUsername && n.passengerUsername && tx.passengerUsername.toLowerCase() === n.passengerUsername.toLowerCase() &&
                     tx.driverUsername && n.driverUsername && tx.driverUsername.toLowerCase() === n.driverUsername.toLowerCase() &&
                     tx.origin && n.origin && tx.origin.toLowerCase() === n.origin.toLowerCase() &&
                     tx.destination && n.destination && tx.destination.toLowerCase() === n.destination.toLowerCase() &&
                     (tx.status === 'PAID_VERIFIED' || tx.status === 'PAID'))
                );
                if (matchingPayment && (matchingPayment.status === 'PAID_VERIFIED' || matchingPayment.status === 'PAID')) {
                    return {
                        ...n,
                        status: 'PAYMENT_RECEIVED',
                        hasPaid: true,
                        transactionId: matchingPayment.transactionId || n.transactionId,
                        message: `💰 Payment Successful! Passenger ${n.passengerName || n.passengerUsername} has paid ₹${matchingPayment.amount || n.fare}. Credited to Driver Account.`
                    };
                }
                return n;
            });

            let userNotifs = [];

            // Ensure exactly 4 passenger requests are available for driver confirmation and payment settlement
            if (isDriverUser) {
                const defaultMembers = [
                    { name: 'Rahul Sharma', username: 'passenger', phone: '+91 98765 43210' },
                    { name: 'Priya Sharma', username: 'priya_s', phone: '+91 98112 33445' },
                    { name: 'Karthik Reddy', username: 'karthik_r', phone: '+91 98223 44556' },
                    { name: 'Neha Gupta', username: 'neha_g', phone: '+91 98334 55667' }
                ];

                // 1. Get notifications strictly matching the driver's active route
                const currentRouteNotifs = syncedNotifs.filter(n => {
                    if (!n) return false;
                    const isDriverRole = (n.driverUsername && n.driverUsername.toLowerCase() === currentUsername.toLowerCase()) || (n.forRole === 'DRIVER');
                    if (!isDriverRole || n.forRole === 'PASSENGER' || n.type === 'MATCHING_RIDE_ALERT') return false;
                    return n.origin && n.destination &&
                           n.origin.toLowerCase() === sampleOrigin.toLowerCase() &&
                           n.destination.toLowerCase() === sampleDest.toLowerCase();
                });

                // 2. Deduplicate by passenger username to eliminate duplicate requests (e.g. Rahul Sharma)
                const deduplicated = [];
                const seenUsers = new Set();
                currentRouteNotifs.forEach(n => {
                    const u = (n.passengerUsername || '').toLowerCase();
                    if (u && !seenUsers.has(u)) {
                        seenUsers.add(u);
                        deduplicated.push({
                            ...n,
                            origin: sampleOrigin,
                            destination: sampleDest,
                            route: `${sampleOrigin} ➔ ${sampleDest}`,
                            fare: n.fare || sampleFare,
                            tripId: n.tripId || sampleTripId
                        });
                    }
                });

                // 3. Ensure all 4 passenger slots are populated
                defaultMembers.forEach((mem, index) => {
                    const u = mem.username.toLowerCase();
                    if (!seenUsers.has(u)) {
                        seenUsers.add(u);
                        const bookingId = `BKG-${routeSlug}-${mem.username}`;
                        const notifId = `NOTIF-${routeSlug}-${mem.username}`;
                        deduplicated.push({
                            id: notifId,
                            bookingId: bookingId,
                            tripId: sampleTripId,
                            forRole: 'DRIVER',
                            driverUsername: currentUsername,
                            passengerUsername: mem.username,
                            passengerName: mem.name,
                            passengerPhone: mem.phone,
                            origin: sampleOrigin,
                            destination: sampleDest,
                            route: `${sampleOrigin} ➔ ${sampleDest}`,
                            fare: sampleFare,
                            timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                            status: 'PENDING_DRIVER_CONFIRMATION',
                            type: 'PASSENGER_REQUEST',
                            message: `Passenger @${mem.username} (${mem.name}) requested to join your ride from ${sampleOrigin} to ${sampleDest}.`,
                            hasPaid: false
                        });
                    }
                });

                // Exactly 4 passengers for the current ride
                userNotifs = deduplicated.slice(0, 4);

                // Preserve other notifications (passengers, other roles, archived rides) while updating active route items
                const otherStoredNotifs = syncedNotifs.filter(n => {
                    if (!n) return false;
                    const isThisRouteDriver = ((n.driverUsername && n.driverUsername.toLowerCase() === currentUsername.toLowerCase()) || n.forRole === 'DRIVER') &&
                        n.forRole !== 'PASSENGER' && n.type !== 'MATCHING_RIDE_ALERT' &&
                        n.origin && n.origin.toLowerCase() === sampleOrigin.toLowerCase() &&
                        n.destination && n.destination.toLowerCase() === sampleDest.toLowerCase();
                    return !isThisRouteDriver;
                });

                localStorage.setItem('carpool_driver_notifications', JSON.stringify([...userNotifs, ...otherStoredNotifs]));
            }

            // 4. Passenger confirmed bookings & rides awaiting payment (strictly for this passenger)
            const passengerBookings = syncedNotifs.filter(n => {
                if (!n || !currentUsername) return false;
                const matchesUser = (n.passengerUsername && n.passengerUsername.toLowerCase() === currentUsername.toLowerCase());
                return matchesUser && n.status !== 'CANCELLED' && n.status !== 'CANCELLED BY DRIVER' && n.forRole !== 'DRIVER' && n.type !== 'MATCHING_RIDE_ALERT';
            });

            const rideStarted = localStorage.getItem('carpool_active_ride_started') === 'true';

            this.setState({
                paymentHistory: userTransactions,
                driverReceivedPayments: driverTransactions,
                driverNotifications: userNotifs,
                passengerBookings: passengerBookings,
                driverRideStarted: rideStarted
            });
        } catch (e) {
            console.error("Error loading data in MyTrips:", e);
        }
    };

    clearDriverNotifications = () => {
        try {
            localStorage.setItem('carpool_driver_notifications', JSON.stringify([]));
            this.setState({ driverNotifications: [] });
        } catch(e) {}
    };

    dismissSingleNotification = (notifId) => {
        try {
            const updated = this.state.driverNotifications.filter(n => n.id !== notifId);
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            this.setState({ driverNotifications: updated });
        } catch(e) {}
    };

    openDriverVerificationDialog = (notif) => {
        this.setState({
            showDriverConfirmModal: notif,
            confirmedUtrInput: notif.utrNumber || '',
            verificationChecked: false
        });
    };

    handleExecuteDriverConfirm = () => {
        const notif = this.state.showDriverConfirmModal;
        if (!notif) return;

        const currentUsername = this.props.username || localStorage.getItem('userId') || 'driver';
        try {
            driverConfirmPaymentReceived({
                transactionId: notif.transactionId,
                bookingId: notif.id,
                driverUsername: notif.driverUsername || currentUsername,
                verificationNote: 'Payment confirmed & verified in driver UPI/bank statement'
            });

            this.setState({
                showDriverConfirmModal: null,
                activeQrNotifId: null
            });
            this.loadData();
        } catch (err) {
            alert(err.message || 'Error confirming payment');
        }
    };

    handleConfirmRide = (notifId) => {
        try {
            const currentDriver = this.props.username || localStorage.getItem('userId') || 'driver';
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const notif = (this.state.driverNotifications && this.state.driverNotifications.find(n => n.id === notifId)) || rawNotifs.find(n => n.id === notifId);

            let txnId = 'TXN-UPI-' + Date.now().toString().slice(-8);
            if (notif) {
                try {
                    const res = submitPassengerPayment({
                        tripId: notif.tripId || 801,
                        bookingId: notif.bookingId || notif.id,
                        origin: notif.origin,
                        destination: notif.destination,
                        amount: notif.fare,
                        passengerName: notif.passengerName || notif.passengerUsername || 'Passenger',
                        passengerUsername: notif.passengerUsername || 'passenger',
                        driverName: 'Alex Driver',
                        driverUsername: currentDriver,
                        paymentMethod: 'UPI Direct Payment'
                    });
                    if (res && res.transactionId) txnId = res.transactionId;
                } catch (pe) {
                    console.error("Payment registration on confirm:", pe);
                }
            }

            const updated = rawNotifs.map(n => {
                if (n.id === notifId || (notif && n.bookingId && n.bookingId === notif.bookingId)) {
                    return {
                        ...n,
                        status: 'PAYMENT_RECEIVED',
                        hasPaid: true,
                        transactionId: txnId,
                        message: `🎉 Ride Confirmed! Seat locked and ₹${n.fare || (notif ? notif.fare : 700)} payment received from @${n.passengerUsername || 'passenger'}. Credited to Driver Account.`
                    };
                }
                return n;
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('carpool_payment_updated'));
            window.dispatchEvent(new Event('storage'));
            this.setState({ activeQrNotifId: notifId });
            this.loadData();
        } catch (e) {
            console.error("Error confirming ride in MyTrips:", e);
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
            this.loadData();
        } catch (e) {
            console.error("Error cancelling ride in MyTrips:", e);
        }
    };

    handleConfirmAllRides = () => {
        try {
            const currentDriver = this.props.username || localStorage.getItem('userId') || 'driver';
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const activeNotifs = this.state.driverNotifications || [];

            activeNotifs.forEach(n => {
                if ((n.status === 'PENDING_DRIVER_CONFIRMATION' || n.status === 'CONFIRMED & ACCEPTED') && !n.hasPaid) {
                    try {
                        submitPassengerPayment({
                            tripId: n.tripId || 801,
                            bookingId: n.bookingId || n.id,
                            origin: n.origin,
                            destination: n.destination,
                            amount: n.fare,
                            passengerName: n.passengerName || n.passengerUsername,
                            passengerUsername: n.passengerUsername || 'passenger',
                            driverName: 'Alex Driver',
                            driverUsername: currentDriver,
                            paymentMethod: 'UPI Direct Payment'
                        });
                    } catch(pe) {
                        console.error('Error submitting payment in confirm all:', pe);
                    }
                }
            });

            const activeIds = new Set(activeNotifs.map(n => n.id));
            const updated = rawNotifs.map(n => {
                if (activeIds.has(n.id) && (n.status === 'PENDING_DRIVER_CONFIRMATION' || n.status === 'CONFIRMED & ACCEPTED')) {
                    return {
                        ...n,
                        status: 'PAYMENT_RECEIVED',
                        hasPaid: true,
                        transactionId: n.transactionId || ('TXN-UPI-' + Date.now().toString().slice(-8)),
                        message: `🎉 Ride Confirmed! Seat locked and ₹${n.fare || 700} payment received from @${n.passengerUsername || 'passenger'}. Credited to Driver Account.`
                    };
                }
                return n;
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('carpool_payment_updated'));
            window.dispatchEvent(new Event('storage'));
            this.loadData();
        } catch (e) {
            console.error("Error confirming all rides:", e);
        }
    };

    handleAddDemoPassenger = () => {
        const pool = [
            { name: 'Priya Sharma', username: 'priya_s', phone: '+91 98112 33445', fare: 700 },
            { name: 'Karthik Reddy', username: 'karthik_r', phone: '+91 98223 44556', fare: 700 },
            { name: 'Neha Gupta', username: 'neha_g', phone: '+91 98334 55667', fare: 700 },
            { name: 'Arjun Verma', username: 'arjun_v', phone: '+91 98445 66778', fare: 700 },
            { name: 'Ananya Rao', username: 'ananya_r', phone: '+91 98556 77889', fare: 700 }
        ];
        const existingNotifs = this.state.driverNotifications;
        const nextPassenger = pool.find(p => !existingNotifs.some(n => n.passengerUsername === p.username)) || pool[existingNotifs.length % pool.length];
        const notifId = 'NOTIF-DEMO-' + Date.now();
        const activeDriverRoute = JSON.parse(localStorage.getItem('carpool_active_driver_route') || 'null');
        const origin = (activeDriverRoute && activeDriverRoute.origin) || (existingNotifs[0] && existingNotifs[0].origin) || 'Hyderabad';
        const destination = (activeDriverRoute && activeDriverRoute.destination) || (existingNotifs[0] && existingNotifs[0].destination) || 'Bengaluru';
        const fare = (existingNotifs[0] && existingNotifs[0].fare) || 700;

        const newNotif = {
            id: notifId,
            bookingId: 'BKG-' + Date.now().toString().slice(-6),
            forRole: 'DRIVER',
            driverUsername: this.props.username || 'driver',
            passengerUsername: nextPassenger.username,
            passengerName: nextPassenger.name,
            passengerPhone: nextPassenger.phone,
            origin: origin,
            destination: destination,
            route: `${origin} ➔ ${destination}`,
            fare: fare,
            timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            status: 'PENDING_DRIVER_CONFIRMATION',
            type: 'PASSENGER_REQUEST',
            message: `Passenger @${nextPassenger.username} (${nextPassenger.name}) requested to join your ride.`,
            hasPaid: false
        };

        const allNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
        allNotifs.unshift(newNotif);
        localStorage.setItem('carpool_driver_notifications', JSON.stringify(allNotifs));
        window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
        this.loadData();
    };

    handleResetFourPassengers = () => {
        const activeDriverRoute = JSON.parse(localStorage.getItem('carpool_active_driver_route') || 'null');
        const savedTrips = JSON.parse(localStorage.getItem('carpool_created_trips') || '[]');
        const latestTrip = (savedTrips && savedTrips.length > 0 && savedTrips[0].trip) ? savedTrips[0].trip : null;

        const sampleOrigin = (activeDriverRoute && activeDriverRoute.origin) || (latestTrip && latestTrip.origin) || 'Hyderabad';
        const sampleDest = (activeDriverRoute && activeDriverRoute.destination) || (latestTrip && latestTrip.destination) || 'Bengaluru';
        let sampleFare = (latestTrip && Number(latestTrip.costPerPassenger)) || (activeDriverRoute && Number(activeDriverRoute.fare)) || 700;
        if (sampleFare > 0 && sampleFare < 100) sampleFare = sampleFare * 35;
        if (!sampleFare || sampleFare <= 0) sampleFare = 700;
        const routeSlug = (sampleOrigin + '-' + sampleDest).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const sampleTripId = (latestTrip && (latestTrip.modelId || latestTrip.id)) || (activeDriverRoute && activeDriverRoute.tripId) || ('TRIP-' + routeSlug);

        const defaultMembers = [
            { name: 'Rahul Sharma', username: 'passenger', phone: '+91 98765 43210' },
            { name: 'Priya Sharma', username: 'priya_s', phone: '+91 98112 33445' },
            { name: 'Karthik Reddy', username: 'karthik_r', phone: '+91 98223 44556' },
            { name: 'Neha Gupta', username: 'neha_g', phone: '+91 98334 55667' }
        ];

        const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
        // Keep notifications not matching this driver's route
        const filtered = rawNotifs.filter(n => !(n.forRole === 'DRIVER' && n.origin && n.origin.toLowerCase() === sampleOrigin.toLowerCase() && n.destination && n.destination.toLowerCase() === sampleDest.toLowerCase()));

        const newFour = defaultMembers.map(mem => ({
            id: `NOTIF-${routeSlug}-${mem.username}`,
            bookingId: `BKG-${routeSlug}-${mem.username}`,
            tripId: sampleTripId,
            forRole: 'DRIVER',
            driverUsername: this.props.username || 'driver',
            passengerUsername: mem.username,
            passengerName: mem.name,
            passengerPhone: mem.phone,
            origin: sampleOrigin,
            destination: sampleDest,
            route: `${sampleOrigin} ➔ ${sampleDest}`,
            fare: sampleFare,
            timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            status: 'PENDING_DRIVER_CONFIRMATION',
            type: 'PASSENGER_REQUEST',
            message: `Passenger @${mem.username} (${mem.name}) requested to join your ride from ${sampleOrigin} to ${sampleDest}.`,
            hasPaid: false
        }));

        localStorage.setItem('carpool_driver_notifications', JSON.stringify([...newFour, ...filtered]));
        localStorage.removeItem('carpool_active_ride_started');

        // Clean out payments for this specific route so driver can test confirming and receiving payment
        let allPayments = JSON.parse(localStorage.getItem('carpool_payment_history') || '[]');
        const filteredPayments = allPayments.filter(tx => 
            !(tx.origin && tx.origin.toLowerCase() === sampleOrigin.toLowerCase() && 
              tx.destination && tx.destination.toLowerCase() === sampleDest.toLowerCase())
        );
        localStorage.setItem('carpool_payment_history', JSON.stringify(filteredPayments));

        window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
        window.dispatchEvent(new Event('carpool_payment_updated'));
        window.dispatchEvent(new Event('storage'));
        this.loadData();
    };

    handleSimulatePassengerPayment = (notif) => {
        try {
            const currentDriver = this.props.username || localStorage.getItem('userId') || 'driver';
            submitPassengerPayment({
                tripId: notif.tripId || 801,
                bookingId: notif.bookingId || notif.id,
                origin: notif.origin,
                destination: notif.destination,
                amount: notif.fare,
                passengerName: notif.passengerName || notif.passengerUsername || 'Passenger',
                passengerUsername: notif.passengerUsername || 'passenger',
                driverName: 'Alex Driver',
                driverUsername: currentDriver,
                paymentMethod: 'UPI Direct Payment'
            });

            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const updated = rawNotifs.map(n => {
                if (n.id === notif.id || (n.passengerUsername && n.passengerUsername.toLowerCase() === (notif.passengerUsername || '').toLowerCase() && n.origin === notif.origin && n.destination === notif.destination)) {
                    return {
                        ...n,
                        status: 'PAYMENT_RECEIVED',
                        hasPaid: true,
                        message: `💰 Payment Successful! Passenger ${n.passengerName || n.passengerUsername} has paid ₹${n.fare || 700}. Credited to Driver Account.`
                    };
                }
                return n;
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('carpool_payment_updated'));
            window.dispatchEvent(new Event('storage'));
            this.loadData();
        } catch (e) {
            console.error('Payment updated error:', e);
            this.loadData();
        }
    };

    handleSettleAllPayments = () => {
        try {
            const currentDriver = this.props.username || localStorage.getItem('userId') || 'driver';
            const activeNotifs = this.state.driverNotifications || [];
            let totalSettled = 0;

            activeNotifs.forEach(n => {
                if (!n.hasPaid) {
                    try {
                        submitPassengerPayment({
                            tripId: n.tripId || 801,
                            bookingId: n.bookingId || n.id,
                            origin: n.origin,
                            destination: n.destination,
                            amount: n.fare,
                            passengerName: n.passengerName || n.passengerUsername,
                            passengerUsername: n.passengerUsername || 'passenger',
                            driverName: 'Alex Driver',
                            driverUsername: currentDriver,
                            paymentMethod: 'UPI Direct Payment'
                        });
                        totalSettled += Number(n.fare) || 700;
                    } catch(err) {
                        console.error('Error settling payment for', n.passengerUsername, err);
                    }
                }
            });

            const activeIds = new Set(activeNotifs.map(n => n.id));
            const freshNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const updated = freshNotifs.map(n => {
                if (activeIds.has(n.id)) {
                    return {
                        ...n,
                        status: 'PAYMENT_RECEIVED',
                        hasPaid: true,
                        message: `💰 Payment Successful! Passenger ${n.passengerName || n.passengerUsername} has paid ₹${n.fare || 700}. Credited to Driver Account.`
                    };
                }
                return n;
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('carpool_payment_updated'));
            window.dispatchEvent(new Event('storage'));
            this.loadData();
            alert(`💰 All 4 passenger payments settled! ₹${totalSettled.toLocaleString('en-IN')} received and credited to your driver account via UPI.`);
        } catch(e) {
            console.error('Error settling all payments:', e);
        }
    };

    handleStartRide = () => {
        localStorage.setItem('carpool_active_ride_started', 'true');
        this.setState({ driverRideStarted: true });
        try {
            const notifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            notifs.unshift({
                id: 'NOTIF-START-' + Date.now(),
                forRole: 'PASSENGER',
                passengerUsername: 'passenger',
                driverUsername: this.props.username || 'driver',
                timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                type: 'RIDE_STARTED',
                status: 'RIDE_IN_PROGRESS',
                message: '🚗 Driver Alex has started the highway ride! Have a safe and pleasant journey.'
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(notifs));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('storage'));
        } catch(e) {}
    };

    handleCompleteRide = () => {
        localStorage.removeItem('carpool_active_ride_started');
        this.setState({ driverRideStarted: false });
        try {
            // Clean up accepted trip flags so any other places or future rides start fresh
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('carpool_confirmed_trip_')) {
                    localStorage.removeItem(k);
                }
            });
            const currentDriver = this.props.username || localStorage.getItem('userId') || 'driver';
            const notifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            
            // Automatically settle payments for any confirmed passengers who haven't paid yet
            notifs.forEach(n => {
                if (!n.hasPaid && (n.status === 'CONFIRMED & ACCEPTED' || n.status === 'ACCEPTED & SEAT CONFIRMED' || n.status === 'PENDING_DRIVER_CONFIRMATION' || n.forRole === 'DRIVER')) {
                    try {
                        submitPassengerPayment({
                            tripId: n.tripId || 801,
                            bookingId: n.bookingId || n.id,
                            origin: n.origin || 'Hyderabad',
                            destination: n.destination || 'Bengaluru',
                            amount: n.fare || 700,
                            passengerName: n.passengerName || n.passengerUsername,
                            passengerUsername: n.passengerUsername || 'passenger',
                            driverName: 'Alex Driver',
                            driverUsername: currentDriver,
                            paymentMethod: 'UPI Direct Payment'
                        });
                    } catch(err) {
                        console.error('Error settling payment for', n.passengerUsername, err);
                    }
                }
            });

            // Mark all driver notifications as completed with payment received
            const latestNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const updated = latestNotifs.map(n => {
                if (n.forRole === 'DRIVER' || n.status === 'CONFIRMED & ACCEPTED' || n.status === 'PAYMENT_RECEIVED') {
                    return { 
                        ...n, 
                        status: 'PAYMENT_RECEIVED',
                        hasPaid: true,
                        tripStatus: 'DONE',
                        message: `🎉 Ride Completed! Payment of ₹${n.fare || 700} received and settled for @${n.passengerUsername}.`
                    };
                }
                return n;
            });
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('carpool_payment_updated'));
            window.dispatchEvent(new Event('storage'));
            this.loadData();
            alert('🎉 Highway Ride Completed! All 4 passenger journeys settled & ₹2,800 total earnings credited to driver account.');
        } catch(e) {
            console.error('Error completing ride:', e);
        }
    };

    copyTxnId = (txnId) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(txnId);
        }
        this.setState({ copiedTxn: txnId });
        setTimeout(() => this.setState({ copiedTxn: null }), 2000);
    };

    showFullTrip = (trip) => {
        this.props.onShowFullTrip(trip);
        this.props.history.push('/fullTrip');
    };

    openInvoice = (tx) => {
        this.setState({ selectedInvoice: tx });
    };

    closeInvoice = () => {
        this.setState({ selectedInvoice: null });
    };

    render() {
        const { 
            activeTab, paymentHistory, driverReceivedPayments, 
            driverNotifications, passengerBookings, selectedInvoice, 
            copiedTxn, showDriverConfirmModal, passengerPayModalTrip,
            passengerConfirmedBookingModal, driverRideStarted
        } = this.state;
        const currentUsername = this.props.username || 'passenger';

        const savedRole = (currentUsername && localStorage.getItem('user_role_' + currentUsername.toLowerCase())) || this.props.userRole;
        const isDriver = (currentUsername && currentUsername.toLowerCase() === 'driver') ||
                        savedRole === 'DRIVER' ||
                        (this.props.trips && this.props.trips.some(t => t.user && t.user.username && t.user.username.toLowerCase() === currentUsername.toLowerCase()));

        // Totals:
        const totalPaidAmount = paymentHistory.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        const totalReceivedAmount = driverReceivedPayments.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

        const rawTrips = (this.props.trips || []).filter(t => {
            if (!t) return false;
            const tripUser = (t.user && t.user.username) || (t.driver && t.driver.username);
            if (isDriver) {
                return tripUser && tripUser.toLowerCase() === currentUsername.toLowerCase();
            }
            return true;
        });
        const upcomingTrips = isDriver ? rawTrips.filter(t => !t.trip || t.trip.tripStatus !== 'DONE') : passengerBookings;
        const backendCompleted = rawTrips.filter(t => t.trip && t.trip.tripStatus === 'DONE');
        const completedRidesList = isDriver
            ? backendCompleted
            : paymentHistory.map((p, idx) => ({
                isPaymentRecord: true,
                id: p.transactionId || idx,
                route: p.route || `${p.origin} ➔ ${p.destination}`,
                origin: p.origin || '',
                destination: p.destination || '',
                driverName: p.driver || 'Alex Driver',
                driverUsername: p.driverUsername || 'driver',
                fare: p.amount || 0,
                date: p.timestamp || '',
                status: 'DONE',
                rating: 5.0
            }));

        const localCreatedTrips = JSON.parse(localStorage.getItem('carpool_created_trips') || '[]')
            .filter(lt => lt && lt.user && lt.user.username && lt.user.username.toLowerCase() === currentUsername.toLowerCase());
        const activeDriverRoute = JSON.parse(localStorage.getItem('carpool_active_driver_route') || 'null');

        let mergedDriverTrips = [...localCreatedTrips];
        rawTrips.forEach(rt => {
            const exists = mergedDriverTrips.some(lt => 
                (lt.trip && rt.trip && lt.trip.id === rt.trip.id) ||
                (lt.trip && rt.trip && lt.trip.origin === rt.trip.origin && lt.trip.destination === rt.trip.destination)
            );
            if (!exists) mergedDriverTrips.push(rt);
        });

        // If driver created a specific route (e.g. Delhi to Jaipur), display only those trips
        if (isDriver && activeDriverRoute && activeDriverRoute.origin && activeDriverRoute.destination) {
            const routeFiltered = mergedDriverTrips.filter(t => 
                t.trip && 
                t.trip.origin && t.trip.origin.toLowerCase() === activeDriverRoute.origin.toLowerCase() &&
                t.trip.destination && t.trip.destination.toLowerCase() === activeDriverRoute.destination.toLowerCase()
            );
            if (routeFiltered.length > 0) {
                mergedDriverTrips = routeFiltered;
            }
        }

        const displayTrips = isDriver ? mergedDriverTrips : upcomingTrips;

        let tripsContent = <Spinner />;
        if (!this.props.loading) {
            if (isDriver) {
                if (mergedDriverTrips && mergedDriverTrips.length > 0) {
                    tripsContent = (
                        <div>
                            {mergedDriverTrips.map((trip, idx) => {
                                const tripData = (trip && trip.trip) ? trip.trip : (trip || {});
                                const driverUser = (trip && (trip.user || trip.driver)) || tripData.driver || tripData.user || { username: currentUsername };
                                return (
                                    <Trip
                                        key={tripData.id || tripData.modelId || trip.id || idx}
                                        data={trip}
                                        trip={tripData}
                                        driver={driverUser}
                                        userRole="driver"
                                        showFullTrip={this.showFullTrip}
                                    />
                                );
                            })}
                        </div>
                    );
                } else {
                    tripsContent = (
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '16px',
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#94a3b8'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🚗</div>
                            <h3 style={{ color: '#ffffff', margin: '0 0 8px 0' }}>No Created Trips Yet</h3>
                            <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem' }}>
                                Create your first highway carpool ride to publish seats and accept passengers.
                            </p>
                            <button
                                type="button"
                                onClick={() => this.props.history.push('/createTrip')}
                                style={{
                                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '10px 22px',
                                    borderRadius: '25px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🚗 Create a New Trip
                            </button>
                        </div>
                    );
                }
            } else {
                // PASSENGER ACCOUNT: If no passenger bookings, show empty state; if bookings exist, the quick cards section renders them
                if (!passengerBookings || passengerBookings.length === 0) {
                    tripsContent = (
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '16px',
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#94a3b8'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎫</div>
                            <h3 style={{ color: '#ffffff', margin: '0 0 8px 0' }}>No Confirmed Bookings Yet</h3>
                            <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem' }}>
                                You have not booked any intercity rides yet. Search available routes and book instantly.
                            </p>
                            <button
                                type="button"
                                onClick={() => this.props.history.push('/searchTrips')}
                                style={{
                                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '10px 22px',
                                    borderRadius: '25px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                🔍 Search Available Intercity Rides
                            </button>
                        </div>
                    );
                } else {
                    tripsContent = null;
                }
            }
        }

        return (
            <div className="MyTrips-wrapper">
                {/* All-India Branding Header */}
                <div className="MyTrips-banner">
                    <div className="MyTrips-flag-badge">
                        <span>🇮🇳</span> ALL INDIA INTERCITY CARPOOLING NETWORK
                    </div>
                    <h1 className="MyTrips-title">
                        {isDriver ? 'Driver Dashboard & Passenger Settlements' : 'My Intercity Trips & Rides'}
                    </h1>
                    <p className="MyTrips-subtitle">
                        {isDriver 
                            ? 'Manage your published highway routes, inspect passenger seat acceptances, and view incoming cashless payments received from passengers.'
                            : 'Manage your confirmed highway bookings, inspect scheduled departure times, verified driver details, and completed intercity journeys.'}
                    </p>
                </div>

                {/* DRIVER NOTIFICATIONS PANEL: Passenger Acceptances */}
                {isDriver && (
                    <div className="MyTrips-driver-notifications-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                                <FaBell style={{ color: '#fbbf24' }} /> Passenger Acceptance Notifications ({driverNotifications.length})
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {driverNotifications.some(n => n.status === 'PENDING_DRIVER_CONFIRMATION' && !n.hasPaid) && (
                                    <button
                                        type="button"
                                        onClick={this.handleConfirmAllRides}
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            border: 'none',
                                            color: '#ffffff',
                                            borderRadius: '16px',
                                            padding: '6px 14px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        ✅ Confirm All ({driverNotifications.filter(n => n.status === 'PENDING_DRIVER_CONFIRMATION' && !n.hasPaid).length})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={this.handleResetFourPassengers}
                                    style={{
                                        background: 'rgba(56, 189, 248, 0.2)',
                                        border: '1px solid #38bdf8',
                                        color: '#38bdf8',
                                        borderRadius: '16px',
                                        padding: '6px 12px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    🔄 Load 4 Passengers (Seats 1-4)
                                </button>
                                {driverNotifications.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={this.clearDriverNotifications}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            color: '#cbd5e1',
                                            borderRadius: '16px',
                                            padding: '5px 12px',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <FaTrashAlt /> Clear All
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* DRIVER RIDE MISSION CONTROL: START RIDE & STATUS */}
                        {(() => {
                            const confirmedCount = Math.min(4, driverNotifications.filter(n => n.status === 'CONFIRMED & ACCEPTED' || n.status === 'ACCEPTED & SEAT CONFIRMED' || n.status === 'PAYMENT_RECEIVED' || n.hasPaid).length);
                            const paidCount = Math.min(4, driverNotifications.filter(n => n.status === 'PAYMENT_RECEIVED' || n.hasPaid).length);
                            const totalPotential = driverNotifications.slice(0, 4).reduce((sum, n) => sum + (Number(n.fare) || 700), 0);
                            const totalCollected = driverNotifications.slice(0, 4).filter(n => n.status === 'PAYMENT_RECEIVED' || n.hasPaid).reduce((sum, n) => sum + (Number(n.fare) || 700), 0);
                            const allPaid = driverNotifications.length === 4 && paidCount === 4;

                            return (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
                                    border: allPaid ? '2px solid #10b981' : (this.state.driverRideStarted ? '2px solid #38bdf8' : '1.5px solid rgba(56, 189, 248, 0.4)'),
                                    borderRadius: '14px',
                                    padding: '16px 20px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '14px',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                                }}>
                                    <div>
                                        <div style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            🚗 HIGHWAY JOURNEY DISPATCH CONTROL & FARE SETTLEMENTS
                                        </div>
                                        <div style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '900', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            👥 {confirmedCount} / 4 Passengers Confirmed & Locked
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                background: allPaid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(234, 179, 8, 0.2)',
                                                border: allPaid ? '1px solid #10b981' : '1px solid #eab308',
                                                color: allPaid ? '#10b981' : '#fef08a',
                                                borderRadius: '20px',
                                                padding: '4px 12px',
                                                fontSize: '0.84rem',
                                                fontWeight: '800',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                💰 Settled Earnings: ₹{totalCollected} / ₹{totalPotential} ({paidCount}/4 Paid)
                                            </span>
                                            {driverNotifications.length === 0 ? (
                                                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                                                    Fresh driver ledger: ₹0 earnings. Publish a trip or click "Load 4 Passengers" to test.
                                                </span>
                                            ) : allPaid ? (
                                                <span style={{ color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold' }}>
                                                    ✓ All 4 passenger fares settled in driver account!
                                                </span>
                                            ) : (
                                                <span style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>
                                                    {this.state.driverRideStarted ? '🟢 Ride in progress. Passengers can pay or driver can settle all fares.' : 'Confirm passengers to start ride.'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {driverNotifications.length > 0 && !allPaid && (
                                            <button
                                                type="button"
                                                onClick={this.handleSettleAllPayments}
                                                style={{
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    padding: '11px 18px',
                                                    fontWeight: '900',
                                                    fontSize: '0.88rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                                                }}
                                            >
                                                💰 Settle All {Math.min(4, driverNotifications.length)} Payments
                                            </button>
                                        )}

                                        {!this.state.driverRideStarted ? (
                                            <button
                                                type="button"
                                                onClick={this.handleStartRide}
                                                disabled={confirmedCount === 0}
                                                style={{
                                                    background: confirmedCount > 0 ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : '#475569',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    padding: '11px 20px',
                                                    fontWeight: '900',
                                                    fontSize: '0.9rem',
                                                    cursor: confirmedCount > 0 ? 'pointer' : 'not-allowed',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    boxShadow: confirmedCount > 0 ? '0 6px 20px rgba(56, 189, 248, 0.45)' : 'none'
                                                }}
                                            >
                                                <FaCar /> 🚗 START RIDE ({confirmedCount} / 4 Confirmed)
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                    border: '1.5px solid #10b981',
                                                    color: '#10b981',
                                                    padding: '8px 14px',
                                                    borderRadius: '20px',
                                                    fontWeight: '800',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                                                    🟢 RIDE IN PROGRESS
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={this.handleCompleteRide}
                                                    style={{
                                                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        padding: '10px 18px',
                                                        fontWeight: '800',
                                                        fontSize: '0.88rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                                                    }}
                                                >
                                                    🏁 Complete Ride & Settle All
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {driverNotifications.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '36px 20px',
                                background: 'rgba(15, 23, 42, 0.45)',
                                border: '1px dashed rgba(255, 255, 255, 0.15)',
                                borderRadius: '14px',
                                color: '#94a3b8',
                                marginTop: '4px'
                            }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📭</div>
                                <h4 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: '800' }}>No Passenger Requests Yet (0 Pending)</h4>
                                <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                                    Your driver dashboard is completely fresh with 0 balance and 0 rides. When passengers book seats, requests will appear here.
                                </p>
                                <button
                                    type="button"
                                    onClick={this.handleResetFourPassengers}
                                    style={{
                                        background: 'rgba(56, 189, 248, 0.2)',
                                        border: '1px solid #38bdf8',
                                        color: '#38bdf8',
                                        borderRadius: '20px',
                                        padding: '7px 16px',
                                        fontSize: '0.82rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔄 Load 4 Demo Passengers to Test Ride & Payments
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {driverNotifications.map(notif => {
                                    const isPaymentReceived = notif.status === 'PAYMENT_RECEIVED' || notif.hasPaid === true;
                                const isPending = notif.status === 'PENDING_DRIVER_CONFIRMATION' && !isPaymentReceived;
                                const isConfirmed = (notif.status === 'CONFIRMED & ACCEPTED' || notif.status === 'ACCEPTED & SEAT CONFIRMED') && !isPaymentReceived;
                                const isCancelled = notif.status === 'CANCELLED BY DRIVER' || notif.status === 'REJECTED';

                                return (
                                    <div key={notif.id} className="MyTrips-notif-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                            <div>
                                                <div style={{ fontWeight: '800', color: '#10b981', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FaUserCheck /> Passenger Request: {notif.passengerName || notif.passengerUsername} (@{notif.passengerUsername})
                                                </div>
                                                <div style={{ color: '#e2e8f0', fontSize: '0.9rem', marginTop: '4px' }}>
                                                    Route: <strong>{notif.route || `${notif.origin} ➔ ${notif.destination}`}</strong> • Fare per seat: <strong style={{ color: '#fef08a' }}>₹{notif.fare || 700}</strong>
                                                </div>
                                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '4px' }}>
                                                    🕒 {notif.timestamp}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {isPending && (
                                                    <span style={{
                                                        background: 'rgba(245, 158, 11, 0.2)',
                                                        border: '1px solid #f59e0b',
                                                        color: '#fbbf24',
                                                        padding: '4px 10px',
                                                        borderRadius: '16px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: '800'
                                                    }}>
                                                        ⏳ AWAITING YOUR CONFIRMATION
                                                    </span>
                                                )}
                                                {isConfirmed && (
                                                    <span style={{
                                                        background: 'rgba(16, 185, 129, 0.2)',
                                                        border: '1px solid #10b981',
                                                        color: '#10b981',
                                                        padding: '4px 10px',
                                                        borderRadius: '16px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: '800'
                                                    }}>
                                                        ✅ RIDE CONFIRMED
                                                    </span>
                                                )}
                                                {isPaymentReceived && (
                                                    <span style={{
                                                        background: 'rgba(16, 185, 129, 0.25)',
                                                        border: '1.5px solid #10b981',
                                                        color: '#10b981',
                                                        padding: '4px 10px',
                                                        borderRadius: '16px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: '900'
                                                    }}>
                                                        ✅ RIDE CONFIRMED & PAID
                                                    </span>
                                                )}
                                                {isCancelled && (
                                                    <span style={{
                                                        background: 'rgba(239, 68, 68, 0.2)',
                                                        border: '1px solid #ef4444',
                                                        color: '#f87171',
                                                        padding: '4px 10px',
                                                        borderRadius: '16px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: '800'
                                                    }}>
                                                        ❌ RIDE CANCELLED
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => this.dismissSingleNotification(notif.id)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#64748b',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem'
                                                    }}
                                                    title="Dismiss notification"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>

                                        {/* Decision Actions for Driver */}
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                                            {isPending && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => this.handleConfirmRide(notif.id)}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                            border: 'none',
                                                            color: '#ffffff',
                                                            fontWeight: '800',
                                                            fontSize: '0.85rem',
                                                            padding: '8px 16px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ✅ Confirm Ride
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => this.handleCancelRide(notif.id)}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                            border: 'none',
                                                            color: '#ffffff',
                                                            fontWeight: '800',
                                                            fontSize: '0.85rem',
                                                            padding: '8px 16px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ❌ Cancel / Decline Ride
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
                                                                + ₹{notif.fare || 700} RECEIVED
                                                            </span>
                                                        </div>

                                                        <div style={{ fontSize: '0.86rem', color: '#f8fafc', marginBottom: '10px', lineHeight: 1.4 }}>
                                                            Passenger <strong>{notif.passengerName || 'Rahul Sharma'}</strong> has completed cashless payment of <strong>₹{notif.fare || 700}</strong> via UPI.
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
                                                                onClick={() => this.setState({ activeTab: 'payments' })}
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
                                                                View in Earnings Tab ➔
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
                                                            <div>💰 <strong>Agreed Fare:</strong> ₹{notif.fare || 700}</div>
                                                            <div style={{ gridColumn: '1 / -1' }}>📍 <strong>Route:</strong> {notif.route || `${notif.origin} ➔ ${notif.destination}`}</div>
                                                        </div>
                                                    </div>

                                                    {/* Driver Account: Awaiting Passenger Payment Status & One-click Collect Option */}
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                                        <span style={{ color: '#38bdf8', fontSize: '0.82rem', fontWeight: 'bold' }}>
                                                            ⏳ Fare awaiting collection (₹{notif.fare || 700}) via UPI. Click to receive & settle:
                                                        </span>

                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => this.handleSimulatePassengerPayment(notif)}
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                    border: 'none',
                                                                    color: '#ffffff',
                                                                    borderRadius: '8px',
                                                                    padding: '7px 14px',
                                                                    fontSize: '0.8rem',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 'bold',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px',
                                                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                                                                }}
                                                            >
                                                                💰 Receive ₹{notif.fare || 700} (UPI Settle)
                                                            </button>
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
                                                            padding: '4px 10px',
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
                            })}
                        </div>
                    )}
                    </div>
                )}

                {/* Top Metrics Grid */}
                <div className="MyTrips-metrics-grid">
                    <div className="MyTrips-metric-card">
                        <div className="MyTrips-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            <FaCar />
                        </div>
                        <div>
                            <div className="MyTrips-metric-label">{isDriver ? 'Created Driver Trips' : 'Booked Rides'}</div>
                            <div className="MyTrips-metric-val">
                                {isDriver ? (displayTrips ? displayTrips.length : 0) : (passengerBookings ? passengerBookings.length : 0)} Rides
                            </div>
                        </div>
                    </div>

                    <div className="MyTrips-metric-card">
                        <div className="MyTrips-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            <FaRupeeSign />
                        </div>
                        <div>
                            <div className="MyTrips-metric-label">
                                {isDriver ? 'Total Payments Received (Earnings)' : 'Total Ride Spend'}
                            </div>
                            <div className="MyTrips-metric-val" style={{ color: '#10b981' }}>
                                {isDriver ? `+ ₹${totalReceivedAmount.toLocaleString('en-IN')}` : `₹${totalPaidAmount.toLocaleString('en-IN')}`}
                            </div>
                        </div>
                    </div>

                    <div className="MyTrips-metric-card">
                        <div className="MyTrips-metric-icon" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
                            <FaHistory />
                        </div>
                        <div>
                            <div className="MyTrips-metric-label">
                                {isDriver ? 'Paid Passengers' : 'Completed Rides'}
                            </div>
                            <div className="MyTrips-metric-val">
                                {isDriver ? `${driverReceivedPayments.length} Settled` : `${completedRidesList.length} Finished`}
                            </div>
                        </div>
                    </div>

                    <div className="MyTrips-metric-card">
                        <div className="MyTrips-metric-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                            <FaShieldAlt />
                        </div>
                        <div>
                            <div className="MyTrips-metric-label">
                                {isDriver ? 'Payout Destination' : 'Highway Corridor'}
                            </div>
                            <div className="MyTrips-metric-val" style={{ fontSize: '1.05rem', color: '#c084fc' }}>
                                {isDriver ? 'Direct UPI / Bank' : 'All India (NH 44/48)'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Switcher */}
                {!isDriver ? (
                    <div className="MyTrips-tabs">
                        <button
                            type="button"
                            className={`MyTrips-tab-btn ${activeTab === 'upcoming' || activeTab === 'trips' ? 'active' : ''}`}
                            onClick={() => this.setState({ activeTab: 'upcoming' })}
                        >
                            <FaCar /> 📅 Scheduled & Upcoming Rides <span className="MyTrips-count-badge">{upcomingTrips.length}</span>
                        </button>
                        <button
                            type="button"
                            className={`MyTrips-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                            onClick={() => this.setState({ activeTab: 'completed' })}
                        >
                            <FaCheckCircle /> ✅ Completed Rides <span className="MyTrips-count-badge">{completedRidesList.length}</span>
                        </button>
                        <button
                            type="button"
                            className="MyTrips-tab-btn"
                            onClick={() => this.props.history.push('/transactions')}
                            style={{ marginLeft: 'auto', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8' }}
                        >
                            <FaReceipt /> Open Transactions Ledger ➔
                        </button>
                    </div>
                ) : (
                    <div className="MyTrips-tabs">
                        <button
                            type="button"
                            className={`MyTrips-tab-btn ${activeTab === 'trips' || activeTab === 'upcoming' ? 'active' : ''}`}
                            onClick={() => this.setState({ activeTab: 'trips' })}
                        >
                            <FaCar /> My Published Trips <span className="MyTrips-count-badge">{this.props.trips ? this.props.trips.length : 0}</span>
                        </button>
                        <button
                            type="button"
                            className={`MyTrips-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
                            onClick={() => this.setState({ activeTab: 'payments' })}
                        >
                            <FaCreditCard /> Passenger Payments Received <span className="MyTrips-count-badge">{driverReceivedPayments.length}</span>
                        </button>
                        <button
                            type="button"
                            className="MyTrips-tab-btn"
                            onClick={() => this.props.history.push('/transactions')}
                            style={{ marginLeft: 'auto', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8' }}
                        >
                            <FaReceipt /> Open Transactions Ledger ➔
                        </button>
                    </div>
                )}

                {/* Tab 1: Scheduled / Upcoming Trips */}
                {(activeTab === 'trips' || activeTab === 'upcoming') && (
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', color: '#38bdf8', margin: 0 }}>
                                    🚗 {isDriver ? 'Published Highway Routes' : '📅 Confirmed & Scheduled Trips'}
                                </h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0' }}>
                                    {isDriver 
                                        ? 'Routes published by you for highway carpooling.' 
                                        : 'Scheduled = upcoming booked travel date & time • Confirmed = seat locked and reserved by driver.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => this.props.history.push(isDriver ? '/createTrip' : '/searchTrips')}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                {isDriver ? '+ Publish Another Route' : '+ Book Another Ride'}
                            </button>
                        </div>

                        {/* PASSENGER CONFIRMED BOOKINGS — SCAN & PAY QUICK CARDS */}
                        {!isDriver && passengerBookings && passengerBookings.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ color: '#f59e0b', fontSize: '1.1rem', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaTicketAlt /> Confirmed Bookings — Ready for UPI Payment ({passengerBookings.length})
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                                    {passengerBookings.map(bkg => {
                                        const isPaidVerified = bkg.hasPaid || bkg.status === 'PAYMENT_RECEIVED';
                                        const fareAmount = bkg.fare || 700;
                                        return (
                                            <div key={bkg.id} style={{
                                                background: 'rgba(15, 23, 42, 0.85)',
                                                border: isPaidVerified ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                                                borderRadius: '14px',
                                                padding: '16px',
                                                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{
                                                        background: isPaidVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                        border: isPaidVerified ? '1px solid #10b981' : '1px solid #f59e0b',
                                                        color: isPaidVerified ? '#10b981' : '#f59e0b',
                                                        borderRadius: '12px',
                                                        padding: '3px 10px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '800'
                                                    }}>
                                                        {isPaidVerified ? '✓ PAYMENT SUCCESSFUL' : '⏳ PAYMENT PENDING'}
                                                    </span>
                                                    <span style={{ color: '#10b981', fontWeight: '900', fontSize: '1.1rem' }}>
                                                        ₹{fareAmount}
                                                    </span>
                                                </div>
                                                <h4 style={{ margin: '0 0 6px', color: '#ffffff', fontSize: '1.05rem' }}>
                                                    📍 {bkg.route || `${bkg.origin} ➔ ${bkg.destination}`}
                                                </h4>
                                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '12px' }}>
                                                    <div>Driver: <strong style={{ color: '#38bdf8' }}>{bkg.driverName || 'Alex Driver'}</strong> (@{bkg.driverUsername || 'driver'})</div>
                                                    <div>Booking ID: <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{bkg.id}</span></div>
                                                    <div>Agreed Fare: <strong style={{ color: '#fef08a' }}>₹{fareAmount} (Locked)</strong></div>
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {!isPaidVerified ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => this.setState({
                                                                    passengerPayModalTrip: {
                                                                        id: bkg.id,
                                                                        fare: fareAmount,
                                                                        driver: {
                                                                            username: bkg.driverUsername || 'driver',
                                                                            firstName: (bkg.driverName || 'Alex').split(' ')[0],
                                                                            lastName: (bkg.driverName || 'Driver').split(' ')[1] || 'Driver'
                                                                        },
                                                                        trip: {
                                                                            origin: bkg.origin || 'Hyderabad',
                                                                            destination: bkg.destination || 'Bengaluru',
                                                                            modelId: bkg.id
                                                                        }
                                                                    }
                                                                })}
                                                                style={{
                                                                    width: '100%',
                                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                    color: '#ffffff',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    padding: '10px 14px',
                                                                    fontWeight: '900',
                                                                    fontSize: '0.9rem',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px',
                                                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                                                                }}
                                                            >
                                                                <FaCreditCard /> 💳 Payment Method (₹{fareAmount})
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => this.setState({ activeTab: 'payments' })}
                                                                style={{
                                                                    width: '100%',
                                                                    background: 'rgba(16, 185, 129, 0.15)',
                                                                    border: '1px solid #10b981',
                                                                    color: '#10b981',
                                                                    borderRadius: '8px',
                                                                    padding: '9px 14px',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.85rem',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '6px'
                                                                }}
                                                            >
                                                                <FaReceipt /> ✓ Fare Paid (View Receipt)
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => this.setState({ passengerConfirmedBookingModal: bkg })}
                                                            style={{
                                                                width: '100%',
                                                                background: 'rgba(56, 189, 248, 0.15)',
                                                                border: '1px solid #38bdf8',
                                                                color: '#38bdf8',
                                                                borderRadius: '8px',
                                                                padding: '8px 12px',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.82rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            🎫 View Booking Confirmed Pass
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {tripsContent}
                    </div>
                )}

                {/* Passenger Tab 2: Completed Rides */}
                {!isDriver && activeTab === 'completed' && (
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', color: '#10b981', margin: 0 }}>
                                    ✅ Completed Highway Rides
                                </h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0' }}>
                                    Rides completed by you. Inspect verified driver ratings, travel route, and digital invoices.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => this.props.history.push('/transactions')}
                                style={{
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid #38bdf8',
                                    color: '#38bdf8',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                💳 View Invoices in Transactions
                            </button>
                        </div>

                        {completedRidesList.length === 0 ? (
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px dashed rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: '#94a3b8'
                            }}>
                                <FaCheckCircle style={{ fontSize: '3rem', color: '#10b981', marginBottom: '10px' }} />
                                <h3 style={{ color: '#ffffff', margin: '0 0 8px 0' }}>No Completed Rides Yet</h3>
                                <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem' }}>
                                    Once your highway trip concludes, it will be automatically archived here with driver ratings.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                {completedRidesList.map((cr, idx) => (
                                    <div key={idx} style={{
                                        background: 'rgba(15, 23, 42, 0.85)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{
                                                background: 'rgba(16, 185, 129, 0.2)',
                                                border: '1px solid #10b981',
                                                color: '#10b981',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.78rem',
                                                fontWeight: 'bold'
                                            }}>
                                                ✓ TRIP COMPLETED
                                            </span>
                                            <span style={{ color: '#fef08a', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                ₹{cr.fare || cr.amount || 700}
                                            </span>
                                        </div>

                                        <h3 style={{ margin: '0 0 8px', color: '#ffffff', fontSize: '1.2rem' }}>
                                            📍 {cr.route || `${cr.origin} ➔ ${cr.destination}`}
                                        </h3>

                                        <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.8' }}>
                                            <div>Driver: <strong style={{ color: '#38bdf8' }}>{cr.driverName || cr.driver || 'Alex Driver'}</strong></div>
                                            <div>Completed: <strong style={{ color: '#94a3b8' }}>{cr.date || cr.timestamp || 'Today'}</strong></div>
                                            <div>Rating Given: <span style={{ color: '#fbbf24' }}>★★★★★ 5.0 / 5.0</span></div>
                                        </div>

                                        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={() => this.props.history.push('/transactions')}
                                                style={{
                                                    flex: 1,
                                                    background: 'rgba(56, 189, 248, 0.15)',
                                                    border: '1px solid #38bdf8',
                                                    color: '#38bdf8',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.82rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                📄 View Tax Invoice & GST Receipt
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Payment & Transaction History */}
                {activeTab === 'payments' && (
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', color: '#10b981', margin: 0 }}>
                                    {isDriver 
                                        ? '💰 Passenger Payments Received (Driver Account)' 
                                        : '💳 Ride Payment & Transaction History (All India)'}
                                </h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0' }}>
                                    {isDriver 
                                        ? 'Verified cashless payments received from passengers for your trips. Drivers receive fares — only passengers who have completed payment appear in this ledger.'
                                        : 'Official tax receipts and digital transaction records for all your carpooling payments.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => this.setState({ activeTab: 'trips' })}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ⬅ Back to Trips
                            </button>
                        </div>

                        {/* DRIVER VIEW OF RECEIVED PAYMENTS */}
                        {isDriver ? (
                            driverReceivedPayments.length === 0 ? (
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                                    borderRadius: '16px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    color: '#94a3b8'
                                }}>
                                    <FaReceipt style={{ fontSize: '3rem', color: '#64748b', marginBottom: '12px' }} />
                                    <h3 style={{ color: '#ffffff', margin: '0 0 8px 0' }}>No Passenger Payments Received Yet</h3>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                        Total Received: <strong style={{ color: '#10b981' }}>₹0</strong>. Once passengers complete UPI or card payments for your trips, their payment receipts and credited earnings will be logged here.
                                    </p>
                                </div>
                            ) : (
                                <div className="MyTrips-tx-grid">
                                    {driverReceivedPayments.map((tx, idx) => (
                                        <div key={tx.transactionId || idx} className="MyTrips-tx-card">
                                            <div>
                                                <div className="MyTrips-tx-route">
                                                    <span>📍 {tx.origin} ➔ {tx.destination}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                                        RECEIVED FROM PASSENGER
                                                    </span>
                                                </div>

                                                <div className="MyTrips-tx-meta">
                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Txn ID: </span>
                                                        <span className="MyTrips-tx-id">{tx.transactionId}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => this.copyTxnId(tx.transactionId)}
                                                            title="Copy Transaction ID"
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: copiedTxn === tx.transactionId ? '#10b981' : '#94a3b8',
                                                                cursor: 'pointer',
                                                                marginLeft: '6px'
                                                            }}
                                                        >
                                                            <FaCopy /> {copiedTxn === tx.transactionId && 'Copied!'}
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Date & Time: </span>
                                                        <strong style={{ color: '#cbd5e1' }}>{tx.timestamp}</strong>
                                                    </div>

                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Paid By Passenger: </span>
                                                        <strong style={{ color: '#38bdf8' }}>{tx.passengerName || 'Passenger'} (@{tx.passengerUsername || 'passenger'})</strong>
                                                    </div>

                                                    <div>
                                                        <span style={{ color: '#64748b' }}>HSRP Vehicle Plate: </span>
                                                        <strong style={{ color: '#fef08a' }}>{tx.vehicleNumber || 'TS 09 AB 4921'}</strong>
                                                    </div>

                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Payment Mode: </span>
                                                        <span style={{ color: '#fef08a', fontWeight: 'bold' }}>{tx.paymentMethod}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="MyTrips-tx-amount-col">
                                                <div className="MyTrips-tx-amount" style={{ color: '#10b981' }}>
                                                    + ₹{tx.amount}
                                                </div>
                                                <div className="MyTrips-tx-status" style={{ color: '#10b981' }}>
                                                    RECEIVED & CREDITED ✅
                                                </div>
                                                <button
                                                    type="button"
                                                    className="MyTrips-receipt-btn"
                                                    onClick={() => this.openInvoice(tx)}
                                                >
                                                    <FaReceipt /> View Passenger Bill
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            /* PASSENGER VIEW OF PAYMENTS */
                            paymentHistory.length === 0 ? (
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                                    borderRadius: '16px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    color: '#94a3b8'
                                }}>
                                    <FaReceipt style={{ fontSize: '3rem', color: '#64748b', marginBottom: '12px' }} />
                                    <h3 style={{ color: '#ffffff', margin: '0 0 8px 0' }}>No Payments Recorded Yet</h3>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                        Total Paid: <strong style={{ color: '#10b981' }}>₹0</strong>. Once you complete a ride payment via UPI, Card, or Wallet, the tax receipt will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="MyTrips-tx-grid">
                                    {paymentHistory.map((tx, idx) => (
                                        <div key={tx.transactionId || idx} className="MyTrips-tx-card">
                                            <div>
                                                <div className="MyTrips-tx-route">
                                                    <span>📍 {tx.origin} ➔ {tx.destination}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                                                        NH Expressway
                                                    </span>
                                                </div>

                                                <div className="MyTrips-tx-meta">
                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Txn ID: </span>
                                                        <span className="MyTrips-tx-id">{tx.transactionId}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => this.copyTxnId(tx.transactionId)}
                                                            title="Copy Transaction ID"
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: copiedTxn === tx.transactionId ? '#10b981' : '#94a3b8',
                                                                cursor: 'pointer',
                                                                marginLeft: '6px'
                                                            }}
                                                        >
                                                            <FaCopy /> {copiedTxn === tx.transactionId && 'Copied!'}
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Date & Time: </span>
                                                        <strong style={{ color: '#cbd5e1' }}>{tx.timestamp}</strong>
                                                    </div>

                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Driver: </span>
                                                        <strong style={{ color: '#cbd5e1' }}>{tx.driverName || 'Alex Driver'}</strong>
                                                    </div>

                                                    <div>
                                                        <span style={{ color: '#64748b' }}>HSRP Plate: </span>
                                                        <strong style={{ color: '#fef08a' }}>{tx.vehicleNumber || 'TS 09 AB 4921'}</strong>
                                                    </div>

                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Method: </span>
                                                        <span style={{ color: '#fef08a', fontWeight: 'bold' }}>{tx.paymentMethod}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="MyTrips-tx-amount-col">
                                                <div className="MyTrips-tx-amount">
                                                    ₹{tx.amount}
                                                </div>
                                                <div className="MyTrips-tx-status">
                                                    PAID & VERIFIED ✅
                                                </div>
                                                <button
                                                    type="button"
                                                    className="MyTrips-receipt-btn"
                                                    onClick={() => this.openInvoice(tx)}
                                                >
                                                    <FaReceipt /> View Tax Invoice
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Tax Invoice Modal for Print & View */}
                {selectedInvoice && (
                    <div className="MyTrips-modal-backdrop" onClick={this.closeInvoice}>
                        <div className="MyTrips-invoice-paper" onClick={(e) => e.stopPropagation()}>
                            {/* Invoice Header */}
                            <div className="MyTrips-invoice-header">
                                <div>
                                    <h2 className="MyTrips-invoice-title">
                                        {isDriver ? 'PASSENGER PAYMENT RECEIPT & DRIVER VOUCHER' : 'INTERCITY CARPOOL TAX INVOICE & RIDE RECEIPT'}
                                    </h2>
                                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                        National Highway Intercity Ridesharing Network • GST Compliant
                                    </div>
                                    <div style={{ color: '#0f172a', fontSize: '0.8rem', marginTop: '4px' }}>
                                        GSTIN: <strong>{selectedInvoice.gstin || '36AABCC1234D1Z5'}</strong> • HSN/SAC Code: <strong>9964</strong>
                                    </div>
                                </div>
                                <button className="MyTrips-close-x MyTrips-no-print" onClick={this.closeInvoice} type="button">
                                    ✕
                                </button>
                            </div>

                            {/* Two-Column Invoice Meta */}
                            <div className="MyTrips-invoice-grid">
                                <div>
                                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>INVOICE / TRANSACTION ID</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#0284c7' }}>
                                        {selectedInvoice.transactionId}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '10px' }}>DATE & TIME</div>
                                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedInvoice.timestamp}</div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>ROUTE & EXPRESSWAY</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0f172a' }}>
                                        {selectedInvoice.origin} ➔ {selectedInvoice.destination}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '10px' }}>HSRP VEHICLE REGISTRATION</div>
                                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                                        {selectedInvoice.vehicleNumber || 'TS 09 AB 4921'}
                                    </div>
                                </div>
                            </div>

                            {/* Driver and Passenger Details */}
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '14px',
                                marginBottom: '20px',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px'
                            }}>
                                <div>
                                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>VERIFIED DRIVER</div>
                                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                                        {selectedInvoice.driverName || 'Alex Driver'}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                                        Phone: {selectedInvoice.driverPhone || '+91 98765 43210'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>PASSENGER</div>
                                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                                        {selectedInvoice.passengerName || 'Passenger'}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                                        Username: @{selectedInvoice.passengerUsername || 'passenger'}
                                    </div>
                                </div>
                            </div>

                            {/* Itemized Fare Table */}
                            <table className="MyTrips-invoice-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>SAC</th>
                                        <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <strong>Intercity Highway Ride Share Fare (1 Passenger Seat)</strong>
                                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                                                Safe travel from {selectedInvoice.origin} to {selectedInvoice.destination}
                                            </div>
                                        </td>
                                        <td>9964</td>
                                        <td style={{ textAlign: 'right' }}>₹{Math.max(1, selectedInvoice.amount - 50)}</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <strong>Platform Safety & Insurance Surcharge</strong>
                                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                                                24/7 Highway SOS & Live Telemetry
                                            </div>
                                        </td>
                                        <td>9964</td>
                                        <td style={{ textAlign: 'right' }}>₹50</td>
                                    </tr>
                                    <tr className="MyTrips-invoice-total-row">
                                        <td><strong>TOTAL {isDriver ? 'FARE RECEIVED' : 'AMOUNT PAID'} (INR)</strong></td>
                                        <td></td>
                                        <td style={{ textAlign: 'right', color: '#10b981' }}>
                                            ₹{selectedInvoice.amount}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Payment Method Notice */}
                            <div style={{
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#065f46',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px'
                            }}>
                                <div>
                                    Payment Method: <strong>{selectedInvoice.paymentMethod}</strong>
                                </div>
                                <div>
                                    Status: <strong>{isDriver ? 'CREDITED TO DRIVER ACCOUNT ✓' : 'AUTHORIZED & CLEARED ✓'}</strong>
                                </div>
                            </div>

                            {/* Footer & Buttons */}
                            <div className="MyTrips-invoice-footer">
                                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                    Computer generated official tax invoice. No physical signature required.
                                </div>
                                <div className="MyTrips-no-print" style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        style={{
                                            background: '#0284c7',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <FaPrint /> Print / Save PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={this.closeInvoice}
                                        style={{
                                            background: '#e2e8f0',
                                            color: '#0f172a',
                                            border: 'none',
                                            padding: '8px 14px',
                                            borderRadius: '6px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Driver Manual Verification & Confirmation Modal */}
                <DriverPaymentConfirmModal
                    show={Boolean(showDriverConfirmModal)}
                    notification={showDriverConfirmModal}
                    driverUsername={currentUsername}
                    onClose={() => this.setState({ showDriverConfirmModal: null })}
                    onSuccess={() => {
                        this.setState({
                            showDriverConfirmModal: null,
                            activeQrNotifId: null
                        });
                        this.loadData();
                    }}
                />

                {/* Passenger Scan & Pay Modal */}
                {passengerPayModalTrip && (
                    <PaymentModal
                        show={Boolean(passengerPayModalTrip)}
                        trip={passengerPayModalTrip.trip || passengerPayModalTrip}
                        driver={passengerPayModalTrip.driver || { username: 'driver', firstName: 'Alex', lastName: 'Driver' }}
                        passengerName={currentUsername}
                        passengerUsername={currentUsername}
                        fare={passengerPayModalTrip.fare || 700}
                        bookingId={passengerPayModalTrip.id}
                        isPaid={passengerPayModalTrip.hasPaid || passengerPayModalTrip.isPaid}
                        existingTxnId={passengerPayModalTrip.transactionId}
                        onClose={() => this.setState({ passengerPayModalTrip: null })}
                        onPaymentComplete={() => {
                            this.setState({ passengerPayModalTrip: null });
                            this.loadData();
                        }}
                    />
                )}

                {/* PASSENGER RIDE BOOKING CONFIRMED MODAL (MATCHING IMAGE 1) */}
                {passengerConfirmedBookingModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.82)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}>
                        <div style={{
                            background: '#0f172a',
                            border: '2px solid #10b981',
                            borderRadius: '24px',
                            maxWidth: '520px',
                            width: '100%',
                            boxShadow: '0 25px 60px rgba(16, 185, 129, 0.4)',
                            overflow: 'hidden',
                            color: '#ffffff'
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                padding: '24px 20px',
                                textAlign: 'center',
                                position: 'relative'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => this.setState({ passengerConfirmedBookingModal: null })}
                                    style={{
                                        position: 'absolute',
                                        top: '15px',
                                        right: '15px',
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        border: 'none',
                                        color: '#ffffff',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '1rem'
                                    }}
                                >
                                    ✕
                                </button>
                                <div style={{ fontSize: '3rem', marginBottom: '6px' }}>🎉</div>
                                <h2 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '0.5px' }}>
                                    RIDE BOOKING CONFIRMED!
                                </h2>
                                <div style={{ fontSize: '0.92rem', color: '#ecfdf5' }}>
                                    Driver {passengerConfirmedBookingModal.driverName || 'Alex Driver'} has accepted your ride request!
                                </div>
                            </div>

                            {/* Ticket Details Box */}
                            <div style={{ padding: '24px' }}>
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '18px',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Route</span>
                                        <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>
                                            {passengerConfirmedBookingModal.route || `${passengerConfirmedBookingModal.origin} ➔ ${passengerConfirmedBookingModal.destination}`}
                                        </strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Departure Time</span>
                                        <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>
                                            {passengerConfirmedBookingModal.departureTime || passengerConfirmedBookingModal.timestamp || '2026-10-17 • 04:00 PM'}
                                        </strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Seat Status</span>
                                        <span style={{
                                            background: '#10b981',
                                            color: '#ffffff',
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.78rem',
                                            fontWeight: 'bold'
                                        }}>
                                            CONFIRMED & RESERVED ✅
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Driver Contact</span>
                                        <strong style={{ color: '#fef08a', fontSize: '0.92rem' }}>
                                            {passengerConfirmedBookingModal.driverName || 'Alex Driver'} ({passengerConfirmedBookingModal.driverPhone || '+91 98765 43210'})
                                        </strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px', marginBottom: '10px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Vehicle</span>
                                        <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>
                                            Volkswagen Golf 7 (TS 09 AB 4921)
                                        </strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Total Fare</span>
                                        <strong style={{ color: '#10b981', fontSize: '1.25rem', fontWeight: '900' }}>
                                            ₹{passengerConfirmedBookingModal.fare || 700}
                                        </strong>
                                    </div>

                                    {(passengerConfirmedBookingModal.hasPaid || passengerConfirmedBookingModal.status === 'PAYMENT_RECEIVED') && (
                                        <div style={{
                                            background: 'rgba(16, 185, 129, 0.15)',
                                            border: '1px solid #10b981',
                                            borderRadius: '10px',
                                            padding: '10px 14px',
                                            marginTop: '12px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                    ✓ PAYMENT VERIFIED & CONFIRMED
                                                </div>
                                                <div style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>
                                                    Txn ID: {passengerConfirmedBookingModal.transactionId || 'T20261017...'} • UPI
                                                </div>
                                            </div>
                                            <span style={{ background: '#10b981', color: '#0f172a', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                                                PAID ₹{passengerConfirmedBookingModal.fare || 700}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {!(passengerConfirmedBookingModal.hasPaid || passengerConfirmedBookingModal.status === 'PAYMENT_RECEIVED') ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const b = passengerConfirmedBookingModal;
                                                this.setState({
                                                    passengerConfirmedBookingModal: null,
                                                    passengerPayModalTrip: {
                                                        id: b.id,
                                                        fare: b.fare || 700,
                                                        driver: {
                                                            username: b.driverUsername || 'driver',
                                                            firstName: (b.driverName || 'Alex').split(' ')[0],
                                                            lastName: (b.driverName || 'Driver').split(' ')[1] || 'Driver'
                                                        },
                                                        trip: {
                                                            origin: b.origin || 'Hyderabad',
                                                            destination: b.destination || 'Bengaluru',
                                                            modelId: b.id
                                                        }
                                                    }
                                                });
                                            }}
                                            style={{
                                                flex: 1.5,
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: '#ffffff',
                                                border: 'none',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                fontWeight: '900',
                                                cursor: 'pointer',
                                                fontSize: '0.95rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.45)'
                                            }}
                                        >
                                            <FaCreditCard /> 💳 Payment Method (₹{passengerConfirmedBookingModal.fare || 700})
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => this.setState({ activeTab: 'payments', passengerConfirmedBookingModal: null })}
                                            style={{
                                                flex: 1.5,
                                                background: 'rgba(16, 185, 129, 0.2)',
                                                border: '1px solid #10b981',
                                                color: '#10b981',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                fontSize: '0.92rem'
                                            }}
                                        >
                                            ✓ Fare Paid (View Receipt)
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => this.setState({ passengerConfirmedBookingModal: null })}
                                        style={{
                                            background: '#334155',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '12px 18px',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
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
        trips: state.trip.trips,
        loading: state.trip.loading,
        token: state.auth.token,
        username: state.auth.userId,
    };
};

const mapDispatchToProps = dispatch => {
    return {
        onFetchTrips: (token, formData) => dispatch(actions.fetchTrips(token, formData)),
        onShowFullTrip: (trip) => dispatch(actions.showFullTrip(trip)),
        onDismountMyTrips: () => dispatch(actions.dismountSearch()),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(MyTrips);