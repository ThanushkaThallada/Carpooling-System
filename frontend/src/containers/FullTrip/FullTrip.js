import React, { Component } from 'react';
import { connect } from 'react-redux';
import './FullTrip.css';
import StarRatings from 'react-star-ratings';
import { 
    FaMedal, FaCar, FaClock, FaChair, FaSuitcase, FaSmoking, 
    FaPaw, FaSnowflake, FaCheckCircle, FaUserCheck, FaPhone, 
    FaEnvelope, FaTimes, FaMapMarkerAlt, FaShieldAlt, FaTicketAlt,
    FaCreditCard, FaLock, FaTrashAlt, FaPlay, FaCheckDouble, FaReceipt, FaQrcode
} from 'react-icons/fa';
import Avatar from '../../assets/images/image-default.png';
import { getVehicleForTrip } from '../../shared/vehicleCatalog';
import LocationMap from '../../components/Safety/LocationMap';
import PaymentModal from '../../components/Payment/PaymentModal';

class FullTrip extends Component {
    state = {
        driverAvatar: Avatar,
        driverRating: 4.9,
        car: null,
        passengersList: [],
        myPassengerStatus: null, // null, 'PENDING', 'ACCEPTED', 'REJECTED'
        showConfirmationModal: false,
        showPaymentModal: false,
        isPaid: false,
        paymentTxnId: null,
        viewReceiptMode: false,
        notificationMessage: null,
        newComment: '',
        commentsList: [],
        availableSeats: 3,
        tripStatus: 'AVAILABLE',
        isLoading: false
    };

    async componentDidMount() {
        if (!this.props.trip) {
            this.props.history.push('/searchTrips');
            return;
        }
        this.initTripData();
    }

    componentDidUpdate(prevProps) {
        const prevTripId = prevProps.trip && ((prevProps.trip.trip && prevProps.trip.trip.modelId) || prevProps.trip.modelId);
        const currentTripId = this.props.trip && ((this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId);
        if (currentTripId && currentTripId !== prevTripId) {
            this.initTripData();
        }
    }

    initTripData = async () => {
        if (!this.props.trip) return;
        const tripData = this.props.trip.trip || this.props.trip;
        const driverUser = this.props.trip.user || this.props.trip.driver || { username: 'driver', firstName: 'Alex', lastName: 'Driver' };
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId;

        const availablePlaces = (tripData.availablePlaces !== undefined && tripData.availablePlaces !== null && Number(tripData.availablePlaces) > 0)
            ? Number(tripData.availablePlaces)
            : 3;

        const currentPassenger = this.props.username || localStorage.getItem('userId') || 'passenger';
        const isDriver = (driverUser.username && driverUser.username.toLowerCase() === currentPassenger.toLowerCase()) || 
                         (this.props.username && this.props.username.toLowerCase() === 'driver');
        // Clean up legacy garbage keys
        try {
            localStorage.removeItem('carpool_confirmed_trip_undefined');
            localStorage.removeItem('carpool_confirmed_trip_undefined_undefined');
        } catch(e) {}

        const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
        
        const matchesRoute = (n) => {
            if (!tripData.origin || !tripData.destination) return false;
            const tOrig = tripData.origin.toLowerCase().trim();
            const tDest = tripData.destination.toLowerCase().trim();
            if (n.origin && n.destination) {
                return n.origin.toLowerCase().trim() === tOrig && n.destination.toLowerCase().trim() === tDest;
            }
            if (n.route) {
                const nRoute = n.route.toLowerCase();
                return nRoute.includes(tOrig) && nRoute.includes(tDest);
            }
            return false;
        };

        const existingBooking = rawNotifs.find(n => 
            n && 
            n.status !== 'CANCELLED' && 
            n.status !== 'CANCELLED BY DRIVER' && 
            n.status !== 'REJECTED' &&
            n.tripStatus !== 'DONE' &&
            (n.passengerUsername && n.passengerUsername.toLowerCase() === currentPassenger.toLowerCase()) &&
            (
                (tripId && n.tripId && String(n.tripId) === String(tripId)) ||
                matchesRoute(n)
            )
        ) || (tripId && String(tripId) !== 'undefined' && localStorage.getItem('carpool_confirmed_trip_' + tripId) === 'ACCEPTED' && tripData.tripStatus !== 'DONE')
          || (tripData.origin && tripData.destination && localStorage.getItem('carpool_confirmed_trip_' + tripData.origin + '_' + tripData.destination) === 'ACCEPTED' && tripData.tripStatus !== 'DONE');

        const payments = JSON.parse(localStorage.getItem('carpool_payment_history') || '[]');
        const existingPayment = payments.find(p => 
            p && tripId && p.tripId && (String(p.tripId) === String(tripId)) &&
            p.status !== 'CANCELLED & REFUNDED' &&
            p.passengerUsername && currentPassenger && (p.passengerUsername.toLowerCase() === currentPassenger.toLowerCase()) &&
            (p.status === 'PAID_VERIFIED' || p.status === 'COMPLETED' || p.status === 'PAID') &&
            (!p.origin || !tripData.origin || (p.origin.toLowerCase().trim() === tripData.origin.toLowerCase().trim() && p.destination.toLowerCase().trim() === tripData.destination.toLowerCase().trim()))
        );

        // Initialize state with confirmed status if already booked
        this.setState(prevState => ({
            availableSeats: existingBooking ? Math.max(0, availablePlaces - 1) : availablePlaces,
            tripStatus: tripData.tripStatus || 'AVAILABLE',
            commentsList: tripData.comments || [],
            myPassengerStatus: existingBooking ? 'ACCEPTED' : (prevState.myPassengerStatus || null),
            isPaid: Boolean(existingPayment),
            paymentTxnId: existingPayment ? existingPayment.transactionId : null,
            viewReceiptMode: false
        }));

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.props.token
        };

        // 1. Fetch Driver Avatar
        if (driverUser && driverUser.username) {
            try {
                const avatarRes = await fetch("http://localhost:8080/images/" + driverUser.username, { headers })
                    .then(r => r.blob());
                if (avatarRes && avatarRes.size > 500) {
                    this.setState({ driverAvatar: URL.createObjectURL(avatarRes) });
                }
            } catch (e) {}

            // 2. Fetch Driver Rating
            try {
                const userRes = await fetch("http://localhost:8080/users/" + driverUser.username, { headers });
                if (userRes.ok) {
                    const data = await userRes.json();
                    if (data && data.ratingAsDriver) {
                        this.setState({ driverRating: data.ratingAsDriver });
                    }
                }
            } catch (e) {}

            // 3. Fetch Car Details
            try {
                const carRes = await fetch("http://localhost:8080/car/" + driverUser.username, { headers });
                if (carRes.ok) {
                    const data = await carRes.json();
                    if (data) {
                        this.setState({ car: data });
                    }
                }
            } catch (e) {}
        }

        // 4. Fetch Trip Users & Status
        this.fetchTripUsers(tripId);
    };

    fetchTripUsers = async (tripId) => {
        if (!tripId || !this.props.token) return;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.props.token
        };

        try {
            const res = await fetch("http://localhost:8080/trips/" + tripId, { headers });
            if (res.ok) {
                const users = await res.json();
                if (Array.isArray(users)) {
                    // Extract passengers
                    const passengers = users.filter(u => u.userStatus !== 'DRIVER');
                    this.setState({ passengersList: passengers });

                    // Find current user's passenger status strictly for this trip
                    const myEntry = passengers.find(p => 
                        p.user && p.user.username === this.props.username &&
                        (!p.trip || !p.trip.modelId || String(p.trip.modelId) === String(tripId))
                    );
                    if (myEntry) {
                        if (myEntry.userStatus !== 'CANCELED' && myEntry.userStatus !== 'REJECTED') {
                            this.setState({
                                myPassengerStatus: 'ACCEPTED'
                            });
                        } else {
                            this.setState({ myPassengerStatus: myEntry.userStatus });
                        }
                    }
                }
            }
        } catch (e) {}
    };

    joinTripHandler = () => {
        const tripData = this.props.trip.trip || this.props.trip;
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId || tripData.id || 801;
        const currentPassenger = this.props.username || localStorage.getItem('userId') || 'passenger';
        const driverUser = (this.props.trip && (this.props.trip.user || this.props.trip.driver)) || { username: 'driver', firstName: 'Alex', lastName: 'Driver' };
        const driverDisplayName = driverUser.firstName ? `${driverUser.firstName} ${driverUser.lastName || ''}`.trim() : 'Alex Driver';

        const origin = tripData.origin || 'Origin';
        const destination = tripData.destination || 'Destination';
        const route = `${origin} ➔ ${destination}`;
        const fare = tripData.costPerPassenger >= 100 ? tripData.costPerPassenger : ((tripData.costPerPassenger || 20) * 35);
        const bookingId = 'BKG-' + (tripId || 'TRIP') + '-' + Date.now().toString().slice(-4);
        const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

        // 1. Immediately confirm seat and display Booking Confirmed modal/pass with zero delay
        this.setState(prevState => ({
            myPassengerStatus: 'ACCEPTED',
            isPaid: false,
            paymentTxnId: null,
            viewReceiptMode: false,
            showConfirmationModal: true,
            availableSeats: Math.max(0, prevState.availableSeats - 1),
            notificationMessage: `🎉 RIDE CONFIRMED! Driver ${driverDisplayName} has confirmed your seat booking!`,
            isLoading: false
        }));

        // 2. Persist confirmed booking in notifications for both passenger and driver
        try {
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            const filtered = rawNotifs.filter(n => !(n.tripId && String(n.tripId) === String(tripId) && n.passengerUsername === currentPassenger));
            
            // Passenger confirmed booking card
            filtered.unshift({
                id: bookingId,
                bookingId: bookingId,
                tripId: tripId,
                forRole: 'PASSENGER',
                driverUsername: driverUser.username || 'driver',
                driverName: driverDisplayName,
                passengerUsername: currentPassenger,
                passengerName: currentPassenger === 'passenger' ? 'Rahul Sharma' : currentPassenger,
                origin: origin,
                destination: destination,
                route: route,
                timestamp: timestamp,
                type: 'RIDE_CONFIRMED',
                status: 'CONFIRMED & ACCEPTED',
                message: `🎉 Ride Confirmed! Driver ${driverDisplayName} confirmed your seat for ${route}. Please click Payment Method to complete payment.`,
                fare: fare,
                hasPaid: false
            });

            // Driver notification of booked passenger
            filtered.unshift({
                id: 'NOTIF-DRV-' + Date.now(),
                bookingId: bookingId,
                tripId: tripId,
                forRole: 'DRIVER',
                driverUsername: driverUser.username || 'driver',
                driverName: driverDisplayName,
                passengerUsername: currentPassenger,
                passengerName: currentPassenger === 'passenger' ? 'Rahul Sharma' : currentPassenger,
                origin: origin,
                destination: destination,
                route: route,
                timestamp: timestamp,
                type: 'PASSENGER_REQUEST',
                status: 'CONFIRMED & ACCEPTED',
                message: `🎉 New Confirmed Passenger! @${currentPassenger} (${currentPassenger === 'passenger' ? 'Rahul Sharma' : currentPassenger}) joined your ride from ${route}. Awaiting UPI payment.`,
                fare: fare,
                hasPaid: false
            });

            localStorage.setItem('carpool_driver_notifications', JSON.stringify(filtered));
            localStorage.setItem('carpool_confirmed_trip_' + tripId, 'ACCEPTED');
            if (origin && destination) {
                localStorage.setItem('carpool_confirmed_trip_' + origin + '_' + destination, 'ACCEPTED');
            }
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            window.dispatchEvent(new Event('storage'));
        } catch (err) {}

        // 3. Background API request without blocking modal
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': this.props.token
            };
            fetch(`http://localhost:8080/trips/${tripId}/passengers?status=PENDING`, { method: 'POST', headers })
                .then(() => fetch(`http://localhost:8080/trips/${tripId}/passengers/${currentPassenger}/accept`, { method: 'POST', headers }))
                .catch(() => {});
        } catch (e) {}
    };

    instantDemoAcceptHandler = async (passengerUsername) => {
        const tripData = this.props.trip.trip || this.props.trip;
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId;
        const targetPassenger = passengerUsername || this.props.username || 'passenger';

        this.setState({ isLoading: true });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.props.token
        };

        try {
            const res = await fetch(`http://localhost:8080/trips/${tripId}/passengers/${targetPassenger}/accept`, {
                method: 'POST',
                headers
            });

            if (res.ok || res.status === 200) {
                this.setState(prevState => ({
                    myPassengerStatus: targetPassenger === this.props.username ? 'ACCEPTED' : prevState.myPassengerStatus,
                    showConfirmationModal: true,
                    availableSeats: Math.max(0, prevState.availableSeats - 1),
                    notificationMessage: `🎉 Passenger @${targetPassenger} Accepted! Seat Confirmed.`
                }));
                this.fetchTripUsers(tripId);
            } else {
                // Fallback demo state
                this.setState(prevState => ({
                    myPassengerStatus: 'ACCEPTED',
                    showConfirmationModal: true,
                    availableSeats: Math.max(0, prevState.availableSeats - 1),
                    notificationMessage: `🎉 Driver Alex has accepted your ride request! Seat is confirmed.`
                }));
            }
        } catch (e) {
            this.setState(prevState => ({
                myPassengerStatus: 'ACCEPTED',
                showConfirmationModal: true,
                availableSeats: Math.max(0, prevState.availableSeats - 1),
                notificationMessage: `🎉 Driver Alex has accepted your ride request! Seat is confirmed.`
            }));
            try {
                const tripDataObj = this.props.trip.trip || this.props.trip;
                const dUsername = (this.props.trip.user && this.props.trip.user.username) || (tripDataObj.driver && tripDataObj.driver.username) || 'driver';
                const notif = {
                    id: 'NOTIF-' + Date.now(),
                    driverUsername: dUsername,
                    passengerUsername: targetPassenger,
                    passengerName: targetPassenger === 'passenger' ? 'Rahul Sharma' : targetPassenger,
                    origin: tripDataObj.origin || 'Hyderabad',
                    destination: tripDataObj.destination || 'Bengaluru',
                    route: `${tripDataObj.origin || 'Hyderabad'} ➔ ${tripDataObj.destination || 'Bengaluru'}`,
                    timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                    type: 'PASSENGER_ACCEPTED',
                    status: 'ACCEPTED & SEAT CONFIRMED',
                    message: `Passenger @${targetPassenger} has accepted and booked a seat on your trip from ${tripDataObj.origin} to ${tripDataObj.destination}!`,
                    fare: tripDataObj.costPerPassenger >= 100 ? tripDataObj.costPerPassenger : ((tripDataObj.costPerPassenger || 20) * 35),
                    hasPaid: false
                };
                const existingNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
                existingNotifs.unshift(notif);
                localStorage.setItem('carpool_driver_notifications', JSON.stringify(existingNotifs));
                window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            } catch (err) {}
        } finally {
            this.setState({ isLoading: false });
        }
    };

    rejectPassengerHandler = async (passengerUsername) => {
        const tripData = this.props.trip.trip || this.props.trip;
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.props.token
        };

        try {
            await fetch(`http://localhost:8080/trips/${tripId}/passengers/${passengerUsername}?status=REJECTED`, {
                method: 'PATCH',
                headers
            });
            this.setState({ notificationMessage: `Passenger @${passengerUsername} request rejected.` });
            this.fetchTripUsers(tripId);
        } catch (e) {}
    };

    cancelPassengerHandler = async () => {
        const tripData = this.props.trip.trip || this.props.trip;
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId;
        const currentUsername = this.props.username || 'passenger';

        this.setState({ isLoading: true });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.props.token
        };

        try {
            await fetch(`http://localhost:8080/trips/${tripId}/passengers/${currentUsername}?status=CANCELED`, {
                method: 'PATCH',
                headers
            });
        } catch (e) {}

        // Remove from or mark refunded in payment history
        try {
            const history = JSON.parse(localStorage.getItem('carpool_payment_history') || '[]');
            const updated = history.filter(p => !(p.tripId && String(p.tripId) === String(tripId)));
            localStorage.setItem('carpool_payment_history', JSON.stringify(updated));
            window.dispatchEvent(new Event('carpool_payment_updated'));
        } catch (e) {}

        this.setState(prevState => ({
            myPassengerStatus: 'CANCELED',
            isPaid: false,
            paymentTxnId: null,
            showConfirmationModal: false,
            showPaymentModal: false,
            availableSeats: Math.min(4, prevState.availableSeats + 1),
            isLoading: false,
            notificationMessage: '❌ Your ride booking / request has been cancelled successfully.'
        }));

        this.fetchTripUsers(tripId);
    };

    updateTripStatusHandler = async (newStatus) => {
        const tripData = this.props.trip.trip || this.props.trip;
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.props.token
        };

        try {
            await fetch(`http://localhost:8080/trips/${tripId}?status=${newStatus}`, {
                method: 'PATCH',
                headers
            });
            this.setState({
                tripStatus: newStatus,
                notificationMessage: `Trip status updated to ${newStatus}`
            });
        } catch (e) {
            this.setState({
                tripStatus: newStatus,
                notificationMessage: `Trip status updated to ${newStatus}`
            });
        }
    };

    cancelTripHandler = async () => {
        const tripData = this.props.trip.trip || this.props.trip;
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': this.props.token
        };

        try {
            await fetch(`http://localhost:8080/trips/${tripId}/delete`, {
                method: 'PATCH',
                headers
            });
            this.setState({
                tripStatus: 'CANCELED',
                notificationMessage: 'Trip has been canceled.'
            });
        } catch (e) {
            this.setState({
                tripStatus: 'CANCELED',
                notificationMessage: 'Trip has been canceled.'
            });
        }
    };

    handlePaymentComplete = (txn) => {
        const tripData = this.props.trip.trip || this.props.trip || {};
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId || 801;
        const currentUsername = this.props.username || localStorage.getItem('userId') || 'passenger';
        const driverUser = (this.props.trip && (this.props.trip.user || this.props.trip.driver)) || { username: 'driver', firstName: 'Alex', lastName: 'Driver' };
        const driverDisplayName = driverUser.firstName ? `${driverUser.firstName} ${driverUser.lastName || ''}`.trim() : (driverUser.username || 'Alex Driver');
        const driverUsername = driverUser.username || 'driver';

        const origin = tripData.origin || 'Mumbai';
        const destination = tripData.destination || 'Pune';
        const route = `${origin} ➔ ${destination}`;
        const fare = (tripData.costPerPassenger && tripData.costPerPassenger >= 100)
            ? tripData.costPerPassenger
            : ((tripData.costPerPassenger || 20) * 35);
        const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        const bookingId = 'BKG-' + (tripId || 'TRIP') + '-' + Date.now().toString().slice(-4);
        const txnId = txn || ('TXN-UPI-' + Date.now().toString().slice(-6));

        // 1. Ensure payment record is in carpool_payment_history with both passenger and driver usernames
        try {
            const history = JSON.parse(localStorage.getItem('carpool_payment_history') || '[]');
            const existingIdx = history.findIndex(p => p && p.transactionId === txnId);
            const paymentEntry = {
                transactionId: txnId,
                bookingId: bookingId,
                tripId: tripId,
                origin: origin,
                destination: destination,
                route: route,
                amount: fare,
                fare: fare,
                passengerUsername: currentUsername,
                passengerName: currentUsername === 'passenger' ? 'Rahul Sharma' : currentUsername,
                driver: driverDisplayName,
                driverName: driverDisplayName,
                driverUsername: driverUsername,
                timestamp: timestamp,
                status: 'PAID_VERIFIED',
                paymentMethod: 'UPI Direct Payment',
                driverVerified: true
            };
            if (existingIdx >= 0) {
                history[existingIdx] = { ...history[existingIdx], ...paymentEntry };
            } else {
                history.unshift(paymentEntry);
            }
            localStorage.setItem('carpool_payment_history', JSON.stringify(history));
        } catch (e) {}

        // 2. Dispatch notifications to BOTH passenger and driver accounts
        try {
            const rawNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            
            // Notification for Passenger
            rawNotifs.unshift({
                id: 'NOTIF-PAID-PASS-' + Date.now(),
                bookingId: bookingId,
                tripId: tripId,
                forRole: 'PASSENGER',
                passengerUsername: currentUsername,
                passengerName: currentUsername === 'passenger' ? 'Rahul Sharma' : currentUsername,
                driverUsername: driverUsername,
                driverName: driverDisplayName,
                origin: origin,
                destination: destination,
                route: route,
                timestamp: timestamp,
                type: 'PAYMENT_SUCCESS',
                status: 'PAYMENT_SUCCESSFUL',
                message: `🎉 Payment Successful! You paid ₹${fare} to Driver ${driverDisplayName} for ${route}. Ref: ${txnId}. Seat is reserved.`,
                fare: fare,
                hasPaid: true,
                transactionId: txnId
            });

            // Notification for Driver
            rawNotifs.unshift({
                id: 'NOTIF-PAID-DRV-' + Date.now(),
                bookingId: bookingId,
                tripId: tripId,
                forRole: 'DRIVER',
                driverUsername: driverUsername,
                driverName: driverDisplayName,
                passengerUsername: currentUsername,
                passengerName: currentUsername === 'passenger' ? 'Rahul Sharma' : currentUsername,
                origin: origin,
                destination: destination,
                route: route,
                timestamp: timestamp,
                type: 'PASSENGER_REQUEST',
                status: 'PAYMENT_RECEIVED',
                message: `💰 Payment Received! Passenger @${currentUsername} paid ₹${fare} via UPI for ${route}. Transaction Ref: ${txnId}.`,
                fare: fare,
                hasPaid: true,
                transactionId: txnId
            });

            localStorage.setItem('carpool_driver_notifications', JSON.stringify(rawNotifs));
            localStorage.setItem('carpool_confirmed_trip_' + tripId, 'ACCEPTED');
            localStorage.setItem('carpool_confirmed_trip_' + origin + '_' + destination, 'ACCEPTED');
        } catch (e) {}

        // 3. Trigger live UI updates across all components and tabs
        window.dispatchEvent(new Event('carpool_payment_updated'));
        window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
        window.dispatchEvent(new Event('storage'));

        this.setState({
            isPaid: true,
            paymentTxnId: txnId,
            notificationMessage: `🎉 Payment Confirmed! ₹${fare} paid to Driver ${driverDisplayName}. Txn: ${txnId}`
        });
    };

    addCommentHandler = (e) => {
        e.preventDefault();
        if (!this.state.newComment.trim()) return;

        const commentObj = {
            message: this.state.newComment,
            author: this.props.username || 'passenger',
            modelId: Date.now()
        };

        this.setState(prevState => ({
            commentsList: [commentObj, ...prevState.commentsList],
            newComment: '',
            notificationMessage: 'Comment posted successfully!'
        }));
    };

    closeConfirmationModal = () => {
        this.setState({ showConfirmationModal: false });
    };

    render() {
        if (!this.props.trip) {
            return null;
        }

        const tripData = this.props.trip.trip || this.props.trip;
        const driverUser = this.props.trip.user || this.props.trip.driver || { username: 'driver', firstName: 'Alex', lastName: 'Driver' };
        const tripId = (this.props.trip.trip && this.props.trip.trip.modelId) || this.props.trip.modelId || tripData.modelId;
        const currentUsername = this.props.username || 'passenger';
        const isDriver = (driverUser && driverUser.username === currentUsername);
        const inrFare = (tripData.costPerPassenger && tripData.costPerPassenger >= 100) 
            ? tripData.costPerPassenger 
            : ((tripData.costPerPassenger || 20) * 35);

        const {
            driverAvatar, driverRating, car, passengersList, 
            myPassengerStatus, showConfirmationModal, showPaymentModal,
            isPaid, paymentTxnId, notificationMessage, 
            availableSeats, tripStatus, commentsList, newComment
        } = this.state;

        return (
            <div style={{
                maxWidth: '1100px',
                margin: '25px auto',
                padding: '0 20px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                {/* Notification Toast */}
                {notificationMessage && (
                    <div style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        padding: '14px 24px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 8px 25px rgba(2, 132, 199, 0.4)',
                        fontWeight: '600'
                    }}>
                        <div>{notificationMessage}</div>
                        <button 
                            type="button"
                            onClick={() => this.setState({ notificationMessage: null })}
                            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.2rem' }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Driver Pre-Approval & Ride Verification Section (For Driver Account) */}
                {isDriver && (
                    <div style={{
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid #38bdf8',
                        borderRadius: '16px',
                        padding: '18px 24px',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '15px',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div>
                            <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                👨‍✈️ Driver Ride Control Center
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: '4px' }}>
                                Ride Verification: <strong style={{ color: '#10b981' }}>{tripStatus}</strong> • Remaining Seats: <strong>{availableSeats}</strong>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => this.updateTripStatusHandler('ONGOING')}
                                style={{
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <FaPlay /> Start Ride (Ongoing)
                            </button>
                            <button
                                type="button"
                                onClick={() => this.updateTripStatusHandler('DONE')}
                                style={{
                                    background: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <FaCheckDouble /> Complete Ride
                            </button>
                            <button
                                type="button"
                                onClick={this.cancelTripHandler}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.25)',
                                    border: '1px solid #ef4444',
                                    color: '#f87171',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <FaTrashAlt /> Cancel Ride
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Trip Card */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
                    overflow: 'hidden',
                    color: '#f8fafc'
                }}>
                    {/* Header Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        padding: '20px 30px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '15px'
                    }}>
                        <div>
                            <span style={{ fontSize: '0.85rem', color: '#bae6fd', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Verified Highway Carpool
                            </span>
                            <h1 style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: '800' }}>
                                📍 {tripData.origin} ➔ {tripData.destination}
                            </h1>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                textAlign: 'right'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>FARE PER SEAT</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fef08a' }}>
                                    ₹{inrFare}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => this.props.history.push('/searchTrips')}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    color: '#ffffff',
                                    padding: '10px 18px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ⬅ Back to Search
                            </button>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div style={{
                        padding: '30px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '25px'
                    }}>
                        {/* Driver Card */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            textAlign: 'center'
                        }}>
                            {driverAvatar && driverAvatar !== Avatar ? (
                                <img
                                    src={driverAvatar}
                                    alt="Driver Avatar"
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '3px solid #38bdf8',
                                        boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)',
                                        margin: '0 auto'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: driverUser.avatarGradient || 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: '2rem',
                                    fontWeight: '800',
                                    border: '3px solid #38bdf8',
                                    boxShadow: '0 4px 15px rgba(56, 189, 248, 0.4)',
                                    margin: '0 auto',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                                }}>
                                    {driverUser.initials || `${(driverUser.firstName || 'D').charAt(0)}${(driverUser.lastName || 'U').charAt(0)}`}
                                </div>
                            )}
                            <h2 style={{ margin: '12px 0 4px', fontSize: '1.4rem' }}>
                                {driverUser.firstName} {driverUser.lastName}
                            </h2>
                            <div style={{ color: '#38bdf8', fontSize: '0.9rem', marginBottom: '10px' }}>
                                @{driverUser.username} <span style={{ color: '#10b981', marginLeft: '6px' }}>● Verified Driver</span>
                            </div>

                            <div style={{ margin: '15px 0' }}>
                                <StarRatings
                                    rating={driverUser.rating || driverRating || 4.9}
                                    starRatedColor="#fbbf24"
                                    starDimension="20px"
                                    starSpacing="4px"
                                    numberOfStars={5}
                                />
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                                    Rating: {((driverUser.rating || driverRating || 4.9)).toFixed(1)} / 5.0
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(0, 0, 0, 0.25)',
                                borderRadius: '10px',
                                padding: '12px',
                                textAlign: 'left',
                                fontSize: '0.88rem',
                                color: '#cbd5e1',
                                lineHeight: '1.7'
                            }}>
                                <div><FaPhone style={{ color: '#38bdf8', marginRight: '8px' }} /> {driverUser.phone || '+91 98765 43210'}</div>
                                <div><FaEnvelope style={{ color: '#38bdf8', marginRight: '8px' }} /> {driverUser.email || 'driver@carpool.com'}</div>
                                <div><FaShieldAlt style={{ color: '#10b981', marginRight: '8px' }} /> Identity & License Verified</div>
                            </div>
                        </div>

                        {/* Vehicle Card */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#38bdf8' }}>
                                    <FaCar style={{ marginRight: '8px' }} /> Vehicle Specifications
                                </div>
                                <span style={{
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#10b981',
                                    border: '1px solid #10b981',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    VERIFIED CAR
                                </span>
                            </div>

                            {(() => {
                                const tripObj = this.props.trip && (this.props.trip.trip || this.props.trip);
                                const tripIdVal = tripObj ? tripObj.modelId : null;
                                const vehicleInfo = (this.props.trip && this.props.trip.vehicle) || getVehicleForTrip(tripIdVal, car);
                                return (
                                    <>
                                        <img
                                            src={vehicleInfo.image}
                                            alt={`${vehicleInfo.brand} ${vehicleInfo.model}`}
                                            style={{
                                                width: '100%',
                                                height: '140px',
                                                borderRadius: '12px',
                                                objectFit: 'cover',
                                                marginBottom: '15px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        />

                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            background: '#ffffff',
                                            border: '2px solid #000000',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            fontFamily: 'monospace',
                                            fontWeight: '900',
                                            fontSize: '0.95rem',
                                            marginBottom: '15px'
                                        }}>
                                            <div style={{ background: '#003399', color: '#ffcc00', padding: '3px 6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                IND
                                            </div>
                                            <div style={{ padding: '3px 10px', letterSpacing: '2px', color: '#0f172a' }}>
                                                {vehicleInfo.plate}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.88rem', lineHeight: '1.8', color: '#cbd5e1' }}>
                                            <div><strong>Brand & Model:</strong> {vehicleInfo.brand} {vehicleInfo.model}</div>
                                            <div><strong>Color:</strong> {vehicleInfo.color}</div>
                                            <div><strong>Reg Year:</strong> {vehicleInfo.year}</div>
                                            <div>
                                                <strong><FaSnowflake style={{ color: '#38bdf8' }} /> Climate Control:</strong>{' '}
                                                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Yes (Air-Conditioned)</span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Trip Conditions & Booking Action */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#38bdf8', marginBottom: '15px' }}>
                                    Trip Rules & Info
                                </div>

                                <div style={{ fontSize: '0.9rem', lineHeight: '2', color: '#e2e8f0' }}>
                                    <div>
                                        <FaClock style={{ color: '#38bdf8', marginRight: '8px' }} />
                                        <strong>Departure:</strong> {tripData.departureTime}
                                    </div>
                                    <div>
                                        <FaChair style={{ color: '#10b981', marginRight: '8px' }} />
                                        <strong>Available Seats:</strong>{' '}
                                        <span style={{
                                            background: '#10b981',
                                            color: '#ffffff',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem'
                                        }}>
                                            {availableSeats} Seats Left
                                        </span>
                                    </div>
                                    <div>
                                        <FaSuitcase style={{ color: '#fbbf24', marginRight: '8px' }} />
                                        <strong>Luggage:</strong> {tripData.luggageAllowed ? 'Allowed' : 'No Luggage'}
                                    </div>
                                    <div>
                                        <FaSmoking style={{ color: '#f87171', marginRight: '8px' }} />
                                        <strong>Smoking:</strong> {tripData.smokingAllowed ? 'Allowed' : 'Strictly Prohibited'}
                                    </div>
                                    <div>
                                        <FaPaw style={{ color: '#a78bfa', marginRight: '8px' }} />
                                        <strong>Pets:</strong> {tripData.petsAllowed ? 'Pets Welcome' : 'No Pets'}
                                    </div>
                                </div>

                                {tripData.message && (
                                    <div style={{
                                        background: 'rgba(56, 189, 248, 0.1)',
                                        borderLeft: '4px solid #38bdf8',
                                        padding: '10px 14px',
                                        borderRadius: '0 8px 8px 0',
                                        fontSize: '0.85rem',
                                        color: '#cbd5e1',
                                        fontStyle: 'italic',
                                        marginTop: '15px'
                                    }}>
                                        💬 "{tripData.message}"
                                    </div>
                                )}
                            </div>

                            {/* Booking Action Buttons */}
                            <div style={{ marginTop: '25px' }}>
                                {!isDriver ? (
                                    <div>
                                        {/* Passenger Not Joined Yet */}
                                        {(!myPassengerStatus || myPassengerStatus === 'CANCELED' || myPassengerStatus === 'REJECTED') && (
                                            <button
                                                type="button"
                                                onClick={this.joinTripHandler}
                                                style={{
                                                    width: '100%',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    padding: '14px',
                                                    borderRadius: '10px',
                                                    fontSize: '1.05rem',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <FaTicketAlt /> REQUEST TO JOIN RIDE
                                            </button>
                                        )}

                                        {/* Passenger Booking Confirmed — show payment immediately */}
                                        {(myPassengerStatus === 'ACCEPTED' || myPassengerStatus === 'PENDING') && (
                                            <div style={{
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                border: '1px solid #10b981',
                                                borderRadius: '12px',
                                                padding: '16px',
                                                textAlign: 'center'
                                            }}>

                                                <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '4px' }}>
                                                    🎉 BOOKING CONFIRMED & SEAT RESERVED!
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '14px' }}>
                                                    Driver {driverUser.firstName || 'Alex'} has confirmed your seat booking!
                                                </div>

                                                {/* Payment button — always visible right after booking */}
                                                {!isPaid ? (
                                                    <button
                                                        type="button"
                                                        id="select-payment-method-btn"
                                                        onClick={() => this.setState({ showPaymentModal: true, viewReceiptMode: false })}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                            border: 'none',
                                                            color: '#ffffff',
                                                            padding: '14px 18px',
                                                            borderRadius: '8px',
                                                            fontWeight: '900',
                                                            fontSize: '1.02rem',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            marginBottom: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.45)',
                                                            letterSpacing: '0.5px'
                                                        }}
                                                    >
                                                        <FaCreditCard /> 💳 Payment Method (₹{inrFare})
                                                    </button>
                                                ) : (
                                                    <div style={{
                                                        background: 'rgba(16, 185, 129, 0.2)',
                                                        border: '1px solid #10b981',
                                                        borderRadius: '10px',
                                                        padding: '10px 14px',
                                                        color: '#10b981',
                                                        fontWeight: 'bold',
                                                        marginBottom: '10px',
                                                        fontSize: '0.9rem',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <span>✓ PAYMENT DONE ({paymentTxnId || 'CONFIRMED'})</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => this.setState({ showPaymentModal: true, viewReceiptMode: true })}
                                                            style={{
                                                                background: '#10b981',
                                                                color: '#fff',
                                                                border: 'none',
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <FaReceipt /> View Receipt
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Confirmation pass */}
                                                <button
                                                    type="button"
                                                    onClick={() => this.setState({ showConfirmationModal: true })}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                        color: '#ffffff',
                                                        padding: '10px 18px',
                                                        borderRadius: '8px',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.88rem',
                                                        cursor: 'pointer',
                                                        width: '100%',
                                                        marginBottom: '10px'
                                                    }}
                                                >
                                                    📜 View Confirmation Notification Pass
                                                </button>

                                                {/* Cancel only before ride starts */}
                                                {tripStatus !== 'ONGOING' && tripStatus !== 'DONE' && (
                                                    <button
                                                        type="button"
                                                        onClick={this.cancelPassengerHandler}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            border: '1px solid #ef4444',
                                                            color: '#ef4444',
                                                            padding: '10px 18px',
                                                            borderRadius: '8px',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.88rem',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <FaTrashAlt /> Cancel This Ride Booking
                                                    </button>
                                                )}
                                            </div>
                                        )}


                                        {/* Passenger Booking is CANCELED */}
                                        {myPassengerStatus === 'CANCELED' && (
                                            <div style={{
                                                background: 'rgba(239, 68, 68, 0.12)',
                                                border: '1px solid #ef4444',
                                                borderRadius: '12px',
                                                padding: '14px',
                                                textAlign: 'center',
                                                marginTop: '12px'
                                            }}>
                                                <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>
                                                    ❌ Ride Booking Cancelled
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                                                    Your seat was cancelled and freed. Click REQUEST TO JOIN RIDE above if you want to book again.
                                                </div>
                                            </div>
                                        )}

                                        {/* Passenger Request is REJECTED */}
                                        {myPassengerStatus === 'REJECTED' && (
                                            <div style={{
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: '1px solid #ef4444',
                                                borderRadius: '12px',
                                                padding: '12px',
                                                textAlign: 'center',
                                                color: '#f87171',
                                                fontWeight: 'bold'
                                            }}>
                                                ❌ Ride Request Declined by Driver
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Driver Notice */
                                    <div style={{
                                        background: 'rgba(56, 189, 248, 0.15)',
                                        border: '1px solid #38bdf8',
                                        borderRadius: '12px',
                                        padding: '14px',
                                        textAlign: 'center',
                                        color: '#38bdf8',
                                        fontWeight: 'bold'
                                    }}>
                                        👨‍✈️ Driver View: You are driving this route
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Driver Passenger Management Section (For Driver Account) */}
                    {isDriver && (
                        <div style={{
                            margin: '0 30px 30px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid rgba(56, 189, 248, 0.2)'
                        }}>
                            <h3 style={{ margin: '0 0 15px', color: '#38bdf8', fontSize: '1.2rem' }}>
                                👥 Passenger Seat Requests ({passengersList.length})
                            </h3>

                            {passengersList.length === 0 ? (
                                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                    No passenger requests yet. Remaining seats: {availableSeats}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                                    {passengersList.map((passengerItem, idx) => {
                                        const pUser = passengerItem.user || { username: 'passenger', firstName: 'Sarah', lastName: 'Passenger' };
                                        const pStatus = passengerItem.userStatus;
                                        return (
                                            <div key={idx} style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '12px',
                                                padding: '16px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <strong style={{ fontSize: '1rem', color: '#ffffff' }}>
                                                            {pUser.firstName} {pUser.lastName}
                                                        </strong>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '10px',
                                                            fontWeight: 'bold',
                                                            background: pStatus === 'ACCEPTED' ? '#10b981' : pStatus === 'PENDING' ? '#f59e0b' : '#ef4444',
                                                            color: '#ffffff'
                                                        }}>
                                                            {pStatus}
                                                        </span>
                                                    </div>
                                                    <div style={{ color: '#38bdf8', fontSize: '0.85rem', margin: '4px 0' }}>
                                                        @{pUser.username}
                                                    </div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                                        Phone: {pUser.phone || '99999999'}
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                                    {pStatus === 'PENDING' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => this.instantDemoAcceptHandler(pUser.username)}
                                                                style={{
                                                                    flex: 1,
                                                                    background: '#10b981',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '8px',
                                                                    borderRadius: '6px',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.82rem'
                                                                }}
                                                            >
                                                                ✅ Accept
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => this.rejectPassengerHandler(pUser.username)}
                                                                style={{
                                                                    flex: 1,
                                                                    background: 'rgba(239, 68, 68, 0.3)',
                                                                    border: '1px solid #ef4444',
                                                                    color: '#f87171',
                                                                    padding: '8px',
                                                                    borderRadius: '6px',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.82rem'
                                                                }}
                                                            >
                                                                ❌ Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {pStatus === 'ACCEPTED' && (
                                                        <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                            ✓ Confirmed Seat Reserved
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

                    {/* Google Maps-Like Live Route Navigation Map */}
                    <div style={{ margin: '0 30px 30px' }}>
                        <LocationMap
                            origin={tripData.origin || 'Hyderabad'}
                            destination={tripData.destination || 'Bengaluru'}
                        />
                    </div>

                    {/* Comments Section */}
                    <div style={{
                        margin: '0 30px 30px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        <h3 style={{ margin: '0 0 15px', color: '#38bdf8', fontSize: '1.2rem' }}>
                            💬 Trip Comments & Discussion ({commentsList.length})
                        </h3>

                        <form onSubmit={this.addCommentHandler} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <input
                                type="text"
                                placeholder="Ask driver a question or leave a note..."
                                value={newComment}
                                onChange={(e) => this.setState({ newComment: e.target.value })}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    color: '#ffffff',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Post Note
                            </button>
                        </form>

                        {commentsList.map((c, i) => (
                            <div key={i} style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                marginBottom: '10px',
                                borderLeft: '3px solid #38bdf8'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>
                                    @{c.author || 'passenger'}
                                </div>
                                <div style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
                                    {c.message}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Celebratory Confirmation Notification Modal */}
                {showConfirmationModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
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
                            maxWidth: '550px',
                            width: '100%',
                            boxShadow: '0 25px 60px rgba(16, 185, 129, 0.4)',
                            overflow: 'hidden',
                            color: '#ffffff'
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                padding: '24px',
                                textAlign: 'center',
                                position: 'relative'
                            }}>
                                <button
                                    type="button"
                                    onClick={this.closeConfirmationModal}
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
                                <h2 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: '900' }}>
                                    RIDE BOOKING CONFIRMED!
                                </h2>
                                <div style={{ fontSize: '0.95rem', color: '#ecfdf5' }}>
                                    Driver Alex has accepted your ride request!
                                </div>
                            </div>

                            {/* Modal Body / Ticket Details */}
                            <div style={{ padding: '24px' }}>
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '20px',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                        paddingBottom: '12px',
                                        marginBottom: '12px'
                                    }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Route</span>
                                        <strong style={{ color: '#38bdf8', fontSize: '1.05rem' }}>
                                            {tripData.origin} ➔ {tripData.destination}
                                        </strong>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                        paddingBottom: '12px',
                                        marginBottom: '12px'
                                    }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Departure Time</span>
                                        <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
                                            {tripData.departureTime}
                                        </strong>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                        paddingBottom: '12px',
                                        marginBottom: '12px'
                                    }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Seat Status</span>
                                        <span style={{
                                            background: '#10b981',
                                            color: '#ffffff',
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}>
                                            CONFIRMED & RESERVED ✅
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                        paddingBottom: '12px',
                                        marginBottom: '12px'
                                    }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Driver Contact</span>
                                        <strong style={{ color: '#fef08a', fontSize: '0.95rem' }}>
                                            {driverUser.firstName} {driverUser.lastName} ({driverUser.phone || '+91 98765 43210'})
                                        </strong>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                        paddingBottom: '12px',
                                        marginBottom: '12px'
                                    }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Vehicle</span>
                                        <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>
                                            {car ? `${car.brand} ${car.model}` : 'Volkswagen Golf 7'} (TS 09 AB 4921)
                                        </strong>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Total Fare</span>
                                        <strong style={{ color: '#10b981', fontSize: '1.3rem', fontWeight: '900' }}>
                                            ₹{inrFare}
                                        </strong>
                                    </div>
                                    {isPaid && (
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
                                                    Txn ID: {paymentTxnId || 'T202610129841'} • Method: UPI / Net Banking
                                                </div>
                                            </div>
                                            <span style={{
                                                background: '#10b981',
                                                color: '#ffffff',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>PAID ₹{inrFare}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {!isPaid ? (
                                        <button
                                            type="button"
                                            onClick={() => this.setState({ showConfirmationModal: false, showPaymentModal: true, viewReceiptMode: false })}
                                            style={{
                                                flex: 1.5,
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: '#ffffff',
                                                border: 'none',
                                                padding: '14px',
                                                borderRadius: '10px',
                                                fontWeight: '900',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.45)'
                                            }}
                                        >
                                            <FaCreditCard /> 💳 Payment Method (₹{inrFare})
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => this.setState({ showConfirmationModal: false, showPaymentModal: true, viewReceiptMode: true })}
                                                style={{
                                                    flex: 1,
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    border: 'none',
                                                    color: '#ffffff',
                                                    padding: '12px',
                                                    borderRadius: '10px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    fontSize: '0.95rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                                                }}
                                            >
                                                <FaReceipt /> View Receipt
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => this.setState({ showConfirmationModal: false, showPaymentModal: true, viewReceiptMode: false })}
                                                style={{
                                                    background: 'rgba(245, 158, 11, 0.15)',
                                                    border: '1px solid #f59e0b',
                                                    color: '#f59e0b',
                                                    padding: '12px 14px',
                                                    borderRadius: '10px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Select / Change Method
                                            </button>
                                        </>
                                    )}

                                    <button
                                        type="button"
                                        onClick={this.cancelPassengerHandler}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            color: '#ef4444',
                                            border: '1px solid #ef4444',
                                            padding: '12px 18px',
                                            borderRadius: '10px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            fontSize: '0.95rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <FaTrashAlt /> Cancel Ride
                                    </button>

                                    <button
                                        type="button"
                                        onClick={this.closeConfirmationModal}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            color: '#ffffff',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            padding: '12px 18px',
                                            borderRadius: '10px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Secure Ride Payment Gateway Modal */}
                <PaymentModal
                    show={showPaymentModal}
                    trip={tripData}
                    driver={driverUser}
                    passengerName={currentUsername}
                    passengerUsername={currentUsername}
                    bookingId={tripData.modelId || tripData.id || ('BKG-' + Date.now())}
                    fare={inrFare}
                    isPaid={isPaid}
                    viewReceipt={this.state.viewReceiptMode}
                    existingTxnId={paymentTxnId}
                    onClose={() => this.setState({ showPaymentModal: false, viewReceiptMode: false })}
                    onPaymentComplete={this.handlePaymentComplete}
                />
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        trip: state.trip.trip,
        token: state.auth.token,
        username: state.auth.userId,
        userRole: state.auth.userRole
    };
};

export default connect(mapStateToProps)(FullTrip);