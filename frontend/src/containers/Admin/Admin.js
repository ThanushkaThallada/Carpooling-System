import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import './Admin.css';
import {
    FaChartLine, FaUsers, FaUserTie, FaCar, FaIdCard,
    FaMoneyBillWave, FaShieldAlt, FaBullhorn, FaFileDownload,
    FaSearch, FaFilter, FaCheckCircle, FaTimesCircle,
    FaExclamationTriangle, FaBan, FaCheck, FaTimes,
    FaEye, FaSyncAlt, FaRupeeSign, FaBell, FaPhoneAlt,
    FaEnvelope, FaCalendarAlt, FaQrcode, FaTrashAlt, FaHistory
} from 'react-icons/fa';
import {
    getAllPayments,
    adminVerifyPayment,
    disputePayment,
    refundPayment,
    getAuditLogs,
    PAYMENT_STATUS
} from '../../shared/upiService';

class Admin extends Component {
    state = {
        activeTab: 'overview', // 'overview', 'users', 'verification', 'rides', 'transactions', 'complaints', 'reports'
        searchQuery: '',
        roleFilter: 'ALL',
        statusFilter: 'ALL',
        rideStatusFilter: 'ALL',
        txnStatusFilter: 'ALL',
        complaintStatusFilter: 'ALL',
        auditLogs: [],

        // Selected items for Modals
        selectedUser: null,
        selectedVerification: null,
        selectedRide: null,
        selectedComplaint: null,

        // Broadcast form
        broadcastTitle: '',
        broadcastMessage: '',
        broadcastAudience: 'ALL',
        broadcastPriority: 'IMPORTANT',

        // Report config
        reportPeriod: 'MONTHLY',
        reportType: 'OPERATIONS',

        // Toast feedback
        toastMessage: null,

        // Data collections
        users: [],
        verifications: [],
        rides: [],
        transactions: [],
        complaints: [],
        sosIncidents: [],
        stats: {
            totalUsers: 1428,
            totalDrivers: 412,
            totalPassengers: 1016,
            totalRides: 2890,
            completedRides: 2415,
            activeBookings: 142,
            cancelledRides: 58,
            totalTransactionVolume: 1845250,
            platformRevenue: 92260
        }
    };

    componentDidMount() {
        this.syncTabFromUrl();
        this.loadAdminData();
        window.addEventListener('storage', this.loadAdminData);
        window.addEventListener('carpool_payment_updated', this.loadAdminData);
        window.addEventListener('carpool_driver_notifications_updated', this.loadAdminData);
    }

    componentDidUpdate(prevProps) {
        if (this.props.location && prevProps.location && this.props.location.search !== prevProps.location.search) {
            this.syncTabFromUrl();
        }
    }

    syncTabFromUrl = () => {
        try {
            if (this.props.location && this.props.location.search) {
                const params = new URLSearchParams(this.props.location.search);
                const tab = params.get('tab');
                if (tab && ['overview', 'users', 'verification', 'rides', 'transactions', 'complaints', 'reports'].includes(tab)) {
                    if (this.state.activeTab !== tab) {
                        this.setState({ activeTab: tab });
                    }
                }
            }
        } catch (e) {}
    };

    handleTabClick = (tabKey) => {
        this.setState({ activeTab: tabKey });
        if (this.props.history) {
            this.props.history.push(`/admin?tab=${tabKey}`);
        }
    };

    componentWillUnmount() {
        window.removeEventListener('storage', this.loadAdminData);
        window.removeEventListener('carpool_payment_updated', this.loadAdminData);
        window.removeEventListener('carpool_driver_notifications_updated', this.loadAdminData);
    }

    showToast = (msg) => {
        this.setState({ toastMessage: msg });
        setTimeout(() => {
            this.setState({ toastMessage: null });
        }, 3500);
    };

    loadAdminData = () => {
        try {
            // 1. Users & Drivers
            let savedUsers = JSON.parse(localStorage.getItem('carpool_admin_users') || 'null');
            if (!savedUsers) {
                savedUsers = [
                    { id: 'USR-101', username: 'driver', name: 'Alex Driver', email: 'alex.driver@smartcarpool.in', phone: '+91 98765 43210', role: 'DRIVER', status: 'ACTIVE', totalRides: 148, rating: 4.9, registeredDate: '12 Jan 2026', vehicle: 'Honda City (DL-01-AB-1234)', kycStatus: 'VERIFIED' },
                    { id: 'USR-102', username: 'passenger', name: 'Rahul Sharma', email: 'rahul.s@outlook.com', phone: '+91 98112 34567', role: 'PASSENGER', status: 'ACTIVE', totalRides: 42, rating: 4.8, registeredDate: '18 Feb 2026', vehicle: 'N/A', kycStatus: 'VERIFIED' },
                    { id: 'USR-103', username: 'priya_m', name: 'Priya Mehra', email: 'priya.mehra@gmail.com', phone: '+91 98223 99887', role: 'DRIVER', status: 'ACTIVE', totalRides: 86, rating: 4.95, registeredDate: '05 Mar 2026', vehicle: 'Hyundai Creta (KA-05-MJ-9921)', kycStatus: 'VERIFIED' },
                    { id: 'USR-104', username: 'vikram99', name: 'Vikram Singh', email: 'vikram.singh@yahoo.com', phone: '+91 97110 54321', role: 'DRIVER', status: 'ACTIVE', totalRides: 64, rating: 4.7, registeredDate: '22 Apr 2026', vehicle: 'Tata Nexon (MH-12-PQ-7744)', kycStatus: 'VERIFIED' },
                    { id: 'USR-105', username: 'ananya_k', name: 'Ananya Kapoor', email: 'ananya.k@icloud.com', phone: '+91 98991 12233', role: 'PASSENGER', status: 'ACTIVE', totalRides: 19, rating: 4.85, registeredDate: '11 May 2026', vehicle: 'N/A', kycStatus: 'VERIFIED' },
                    { id: 'USR-106', username: 'rohit_t', name: 'Rohit Tripathi', email: 'rohit.t@rediffmail.com', phone: '+91 99887 65432', role: 'DRIVER', status: 'SUSPENDED', totalRides: 28, rating: 3.8, registeredDate: '01 Jun 2026', vehicle: 'Maruti Dzire (UP-16-AX-4433)', kycStatus: 'UNDER_REVIEW' },
                    { id: 'USR-107', username: 'kavita_r', name: 'Kavita Rao', email: 'kavita.rao@techcorp.com', phone: '+91 97441 22334', role: 'PASSENGER', status: 'BLOCKED', totalRides: 5, rating: 2.9, registeredDate: '14 Jul 2026', vehicle: 'N/A', kycStatus: 'FLAGGED' },
                    { id: 'USR-108', username: 'suresh_v', name: 'Suresh Verma', email: 'suresh.verma@gmail.com', phone: '+91 99112 88776', role: 'DRIVER', status: 'ACTIVE', totalRides: 110, rating: 4.92, registeredDate: '08 Aug 2026', vehicle: 'Maruti Ertiga (HR-26-CK-8910)', kycStatus: 'VERIFIED' }
                ];
                localStorage.setItem('carpool_admin_users', JSON.stringify(savedUsers));
            }

            // 2. Driver & Vehicle Verifications
            let savedVerifications = JSON.parse(localStorage.getItem('carpool_admin_verifications') || 'null');
            if (!savedVerifications) {
                savedVerifications = [
                    {
                        id: 'VERIF-201',
                        driverName: 'Suresh Verma',
                        driverUsername: 'suresh_v',
                        phone: '+91 99112 88776',
                        dlNumber: 'DL-042019008891',
                        dlExpiry: '15-08-2035',
                        vehicleModel: 'Maruti Suzuki Ertiga VXi (2023)',
                        registrationNo: 'HR-26-CK-8910',
                        hsrpLaserCode: 'IN-8891048291',
                        insuranceValidTill: '20-11-2027',
                        pucValidTill: '14-03-2027',
                        status: 'PENDING_REVIEW',
                        submittedDate: '15 Oct 2026',
                        documents: { dl: 'Verified (DigiLocker)', rc: 'Active (Vahan API)', hsrp: 'Compliant', insurance: 'Valid' }
                    },
                    {
                        id: 'VERIF-202',
                        driverName: 'Amit Saxena',
                        driverUsername: 'amit_saxena',
                        phone: '+91 98110 33445',
                        dlNumber: 'RJ-142018004561',
                        dlExpiry: '10-04-2034',
                        vehicleModel: 'Hyundai Verna SX (2022)',
                        registrationNo: 'RJ-14-CZ-7119',
                        hsrpLaserCode: 'IN-7119204855',
                        insuranceValidTill: '05-09-2027',
                        pucValidTill: '12-01-2027',
                        status: 'PENDING_REVIEW',
                        submittedDate: '16 Oct 2026',
                        documents: { dl: 'Verified (DigiLocker)', rc: 'Active (Vahan API)', hsrp: 'Compliant', insurance: 'Valid' }
                    },
                    {
                        id: 'VERIF-203',
                        driverName: 'Alex Driver',
                        driverUsername: 'driver',
                        phone: '+91 98765 43210',
                        dlNumber: 'DL-012015009941',
                        dlExpiry: '22-09-2032',
                        vehicleModel: 'Honda City ZX (2022)',
                        registrationNo: 'DL-01-AB-1234',
                        hsrpLaserCode: 'IN-1234567890',
                        insuranceValidTill: '18-05-2028',
                        pucValidTill: '09-12-2026',
                        status: 'APPROVED',
                        submittedDate: '01 Oct 2026',
                        documents: { dl: 'Verified (DigiLocker)', rc: 'Active (Vahan API)', hsrp: 'Compliant', insurance: 'Valid' }
                    },
                    {
                        id: 'VERIF-204',
                        driverName: 'Priya Mehra',
                        driverUsername: 'priya_m',
                        phone: '+91 98223 99887',
                        dlNumber: 'KA-052020003312',
                        dlExpiry: '30-01-2036',
                        vehicleModel: 'Hyundai Creta SX (2023)',
                        registrationNo: 'KA-05-MJ-9921',
                        hsrpLaserCode: 'IN-9921847102',
                        insuranceValidTill: '14-10-2028',
                        pucValidTill: '22-07-2027',
                        status: 'APPROVED',
                        submittedDate: '28 Sep 2026',
                        documents: { dl: 'Verified (DigiLocker)', rc: 'Active (Vahan API)', hsrp: 'Compliant', insurance: 'Valid' }
                    },
                    {
                        id: 'VERIF-205',
                        driverName: 'Manish Rawat',
                        driverUsername: 'manish_r',
                        phone: '+91 98711 00223',
                        dlNumber: 'UP-322012001199',
                        dlExpiry: '12-02-2025',
                        vehicleModel: 'Maruti Swift (2018)',
                        registrationNo: 'UP-32-BN-5511',
                        hsrpLaserCode: 'NOT_FOUND',
                        insuranceValidTill: 'Expired',
                        pucValidTill: 'Expired',
                        status: 'REJECTED',
                        submittedDate: '10 Oct 2026',
                        rejectionReason: 'Expired Driving Licence & Non-HSRP standard plate.',
                        documents: { dl: 'Expired', rc: 'Pending', hsrp: 'Non-Compliant', insurance: 'Expired' }
                    }
                ];
                localStorage.setItem('carpool_admin_verifications', JSON.stringify(savedVerifications));
            }

            // 3. Rides
            let savedRides = JSON.parse(localStorage.getItem('carpool_admin_rides') || 'null');
            if (!savedRides) {
                savedRides = [
                    { id: 'RIDE-881', driverName: 'Alex Driver', driverUsername: 'driver', origin: 'Delhi', destination: 'Jaipur', highway: 'NH-48', departure: 'Tomorrow at 06:30 AM', fare: 525, bookedSeats: 2, totalSeats: 3, status: 'AVAILABLE', vehicle: 'Honda City (DL-01-AB-1234)', flagged: false },
                    { id: 'RIDE-882', driverName: 'Priya Mehra', driverUsername: 'priya_m', origin: 'Bengaluru', destination: 'Hyderabad', highway: 'NH-44', departure: '18 Oct at 07:00 AM', fare: 750, bookedSeats: 3, totalSeats: 3, status: 'FULL', vehicle: 'Hyundai Creta (KA-05-MJ-9921)', flagged: false },
                    { id: 'RIDE-883', driverName: 'Vikram Singh', driverUsername: 'vikram99', origin: 'Mumbai', destination: 'Pune', highway: 'Mumbai-Pune Expressway', departure: '17 Oct at 04:00 PM', fare: 350, bookedSeats: 1, totalSeats: 4, status: 'IN_PROGRESS', vehicle: 'Tata Nexon (MH-12-PQ-7744)', flagged: false },
                    { id: 'RIDE-884', driverName: 'Suresh Verma', driverUsername: 'suresh_v', origin: 'Gurugram', destination: 'Chandigarh', highway: 'NH-44', departure: '19 Oct at 05:30 AM', fare: 450, bookedSeats: 0, totalSeats: 5, status: 'AVAILABLE', vehicle: 'Maruti Ertiga (HR-26-CK-8910)', flagged: false },
                    { id: 'RIDE-885', driverName: 'Rohit Tripathi', driverUsername: 'rohit_t', origin: 'Noida', destination: 'Agra', highway: 'Yamuna Expressway', departure: '14 Oct at 09:00 AM', fare: 9999, bookedSeats: 0, totalSeats: 3, status: 'CANCELLED', vehicle: 'Maruti Dzire (UP-16-AX-4433)', flagged: true, flagReason: 'Exorbitant pricing & suspicious profile' }
                ];
                localStorage.setItem('carpool_admin_rides', JSON.stringify(savedRides));
            }

            // 4. Transactions (merged with live upiService)
            const livePayments = getAllPayments();
            const auditLogs = getAuditLogs();

            const baseTransactions = [
                { id: 'TXN-9011', bookingId: 'BKG-771', utr: '482910482910', passengerName: 'Rahul Sharma', passengerUsername: 'passenger', driverName: 'Alex Driver', driverUsername: 'driver', route: 'Delhi ➔ Jaipur', amount: 525, fee: 26.25, timestamp: '17 Oct 2026, 09:15 AM', mode: 'UPI QR Scan', status: 'PAID & VERIFIED' },
                { id: 'TXN-9010', bookingId: 'BKG-772', utr: '482910482909', passengerName: 'Ananya Kapoor', passengerUsername: 'ananya_k', driverName: 'Priya Mehra', driverUsername: 'priya_m', route: 'Bengaluru ➔ Hyderabad', amount: 750, fee: 37.50, timestamp: '16 Oct 2026, 06:40 PM', mode: 'GPay UPI', status: 'PAID & VERIFIED' },
                { id: 'TXN-9009', bookingId: 'BKG-773', utr: '482910482908', passengerName: 'Rohit Verma', passengerUsername: 'rohit_v', driverName: 'Vikram Singh', driverUsername: 'vikram99', route: 'Mumbai ➔ Pune', amount: 350, fee: 17.50, timestamp: '16 Oct 2026, 01:20 PM', mode: 'PhonePe UPI', status: 'PAID & VERIFIED' },
                { id: 'TXN-9008', bookingId: 'BKG-774', utr: '482910482907', passengerName: 'Kavita Rao', passengerUsername: 'kavita_r', driverName: 'Rohit Tripathi', driverUsername: 'rohit_t', route: 'Noida ➔ Agra', amount: 500, fee: 25.00, timestamp: '15 Oct 2026, 11:10 AM', mode: 'Paytm UPI', status: 'REFUNDED', refundReason: 'Ride cancelled by driver without prior notice' },
                { id: 'TXN-9007', bookingId: 'BKG-775', utr: '482910482906', passengerName: 'Sameer Sen', passengerUsername: 'sameer_s', driverName: 'Alex Driver', driverUsername: 'driver', route: 'Jaipur ➔ Delhi', amount: 525, fee: 26.25, timestamp: '14 Oct 2026, 08:30 PM', mode: 'BHIM UPI', status: 'DISPUTED', disputeReason: 'Double payment deduction reported by bank' }
            ];

            // Normalize live payments into admin transactions preserving authentic status
            const normalizedLive = livePayments.map(lp => {
                let displayStatus = 'PAID & VERIFIED';
                if (lp.status === PAYMENT_STATUS.PENDING) displayStatus = 'PENDING VERIFICATION';
                else if (lp.status === PAYMENT_STATUS.DRIVER_REPORTED_RECEIVED) displayStatus = 'REPORTED RECEIVED';
                else if (lp.status === PAYMENT_STATUS.PAID_VERIFIED || lp.status === 'PAID & CONFIRMED') displayStatus = 'PAID & VERIFIED';
                else if (lp.status === PAYMENT_STATUS.FAILED_OR_DISPUTED || lp.status === 'DISPUTED') displayStatus = 'DISPUTED';
                else if (lp.status === PAYMENT_STATUS.REFUNDED || lp.status === 'REFUNDED') displayStatus = 'REFUNDED';
                else displayStatus = lp.status || 'PAID & VERIFIED';

                return {
                    id: lp.transactionId || ('TXN-' + Date.now()),
                    bookingId: lp.bookingId || lp.tripId || 'BKG-LIVE',
                    utr: lp.utrNumber || '4829' + Math.floor(10000000 + Math.random() * 90000000),
                    passengerName: lp.passengerName || 'Passenger',
                    passengerUsername: lp.passengerUsername || 'passenger',
                    driverName: lp.driver || lp.driverName || 'Alex Driver',
                    driverUsername: lp.driverUsername || 'driver',
                    route: lp.route || (lp.origin ? `${lp.origin} ➔ ${lp.destination}` : 'Highway Route'),
                    amount: Number(lp.amount) || 525,
                    fee: (Number(lp.amount) || 525) * 0.05,
                    timestamp: lp.timestamp || 'Today',
                    mode: lp.paymentMethod || 'UPI QR Scan',
                    status: displayStatus,
                    rawStatus: lp.status,
                    verificationNote: lp.verificationNote || ''
                };
            });

            const allTransactions = [...normalizedLive, ...baseTransactions.filter(bt => !normalizedLive.some(nl => nl.id === bt.id))];

            // 5. Complaints & Safety Management
            let savedComplaints = JSON.parse(localStorage.getItem('carpool_admin_complaints') || 'null');
            if (!savedComplaints) {
                savedComplaints = [
                    { id: 'CMP-501', category: 'Rash Driving & Speeding', complainant: 'Ananya Kapoor (Passenger)', reportedUser: 'Rohit Tripathi (Driver)', route: 'Noida ➔ Agra (Yamuna Expressway)', date: '15 Oct 2026', description: 'Driver was overspeeding past 120 km/h and looking at mobile while driving on the highway.', status: 'UNDER_INVESTIGATION', severity: 'HIGH' },
                    { id: 'CMP-502', category: 'AC Malfunction & Cleanliness', complainant: 'Rahul Sharma (Passenger)', reportedUser: 'Manish Rawat (Driver)', route: 'Delhi ➔ Jaipur', date: '14 Oct 2026', description: 'AC was not turned on despite listing specifying air-conditioned vehicle during hot afternoon trip.', status: 'RESOLVED', resolutionNote: 'Driver issued advisory and refunded 15% comfort compensation.', severity: 'MEDIUM' },
                    { id: 'CMP-503', category: 'Unprompted Route Deviation', complainant: 'Vikram Singh (Driver)', reportedUser: 'Kavita Rao (Passenger)', route: 'Mumbai ➔ Pune', date: '12 Oct 2026', description: 'Passenger demanded unauthorized stop 25km off highway and became disruptive when refused.', status: 'DISMISSED', resolutionNote: 'Investigated GPS logs; driver followed scheduled highway corridor.', severity: 'LOW' }
                ];
                localStorage.setItem('carpool_admin_complaints', JSON.stringify(savedComplaints));
            }

            // 6. SOS Incidents
            let savedSos = JSON.parse(localStorage.getItem('carpool_admin_sos') || 'null');
            if (!savedSos) {
                savedSos = [
                    { id: 'SOS-991', reporter: 'Pooja Nair (Passenger)', driverName: 'Alex Driver', route: 'Delhi ➔ Jaipur (NH-48 near Neemrana)', timestamp: '14 Oct 2026, 11:22 PM', location: '27.9880° N, 76.3888° E', emergencyContactsAlerted: 2, status: 'RESOLVED', resolutionNote: 'False alarm triggered accidentally in purse. Verified passenger safety via call center.' }
                ];
                localStorage.setItem('carpool_admin_sos', JSON.stringify(savedSos));
            }

            this.setState({
                users: savedUsers,
                verifications: savedVerifications,
                rides: savedRides,
                transactions: allTransactions,
                complaints: savedComplaints,
                sosIncidents: savedSos,
                auditLogs: auditLogs
            });
        } catch (err) {
            console.error("Error loading admin data:", err);
        }
    };

    // User Management Actions
    handleUpdateUserStatus = (userId, newStatus) => {
        try {
            const updated = this.state.users.map(u => {
                if (u.id === userId) {
                    return { ...u, status: newStatus };
                }
                return u;
            });
            this.setState({ users: updated });
            localStorage.setItem('carpool_admin_users', JSON.stringify(updated));
            this.showToast(`User account status updated to ${newStatus}!`);
        } catch (e) {
            console.error("Error updating user status:", e);
        }
    };

    // Verification Actions
    handleApproveVerification = (verifId) => {
        try {
            const verif = this.state.verifications.find(v => v.id === verifId);
            const updatedVerifs = this.state.verifications.map(v => {
                if (v.id === verifId) {
                    return { ...v, status: 'APPROVED' };
                }
                return v;
            });
            this.setState({ verifications: updatedVerifs, selectedVerification: null });
            localStorage.setItem('carpool_admin_verifications', JSON.stringify(updatedVerifs));

            // Also send notification to driver
            if (verif) {
                const notifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
                notifs.unshift({
                    id: 'NOTIF-VERIF-' + Date.now(),
                    forRole: 'DRIVER',
                    driverUsername: verif.driverUsername,
                    type: 'VERIFICATION_NOTICE',
                    status: 'VERIFIED',
                    message: `🛡️ Congratulations! Your Driving Licence (${verif.dlNumber}) and Vehicle (${verif.registrationNo} • HSRP Compliant) have been approved by Admin. You are now a Verified Driver!`,
                    timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                });
                localStorage.setItem('carpool_driver_notifications', JSON.stringify(notifs));
                window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            }

            this.showToast(`Driver ${verif ? verif.driverName : ''} approved & verified successfully!`);
        } catch (e) {
            console.error("Error approving verification:", e);
        }
    };

    handleRejectVerification = (verifId, reason) => {
        try {
            const verif = this.state.verifications.find(v => v.id === verifId);
            const promptReason = reason || window.prompt("Enter rejection reason for driver:", "Document image illegible or expired.");
            if (!promptReason) return;

            const updatedVerifs = this.state.verifications.map(v => {
                if (v.id === verifId) {
                    return { ...v, status: 'REJECTED', rejectionReason: promptReason };
                }
                return v;
            });
            this.setState({ verifications: updatedVerifs, selectedVerification: null });
            localStorage.setItem('carpool_admin_verifications', JSON.stringify(updatedVerifs));

            if (verif) {
                const notifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
                notifs.unshift({
                    id: 'NOTIF-VERIF-' + Date.now(),
                    forRole: 'DRIVER',
                    driverUsername: verif.driverUsername,
                    type: 'VERIFICATION_NOTICE',
                    status: 'REJECTED',
                    message: `⚠️ Verification Notice: Your vehicle/license verification requires update. Reason: ${promptReason}. Please re-upload valid documents.`,
                    timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                });
                localStorage.setItem('carpool_driver_notifications', JSON.stringify(notifs));
                window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
            }

            this.showToast(`Driver verification marked as Rejected.`);
        } catch (e) {
            console.error("Error rejecting verification:", e);
        }
    };

    // Ride Moderation
    handleRemoveRide = (rideId) => {
        const reason = window.prompt("Reason for removing this ride listing:", "Violates safety policy or suspicious pricing");
        if (!reason) return;

        const updatedRides = this.state.rides.map(r => {
            if (r.id === rideId) {
                return { ...r, status: 'CANCELLED_BY_ADMIN', flagged: true, flagReason: reason };
            }
            return r;
        });
        this.setState({ rides: updatedRides });
        localStorage.setItem('carpool_admin_rides', JSON.stringify(updatedRides));
        this.showToast(`Ride listing removed by Admin. Notice dispatched to driver.`);
    };

    // Transaction, Verification & Refund Actions
    handleAdminVerifyPayment = (txnId) => {
        const currentRole = this.props.userRole || localStorage.getItem('userRole') || '';
        const currentUsername = this.props.username || localStorage.getItem('userId') || '';
        if (currentRole.toLowerCase() !== 'admin' && currentUsername.toLowerCase() !== 'admin') {
            this.showToast('Security Alert: Action rejected. Administrator permissions required.');
            return;
        }

        const confirmVerify = window.confirm(`Verify and confirm clearance for transaction ${txnId}?`);
        if (!confirmVerify) return;

        try {
            adminVerifyPayment({
                transactionId: txnId,
                adminUsername: currentUsername || 'admin',
                verificationNote: 'Admin manually verified bank credit & cleared settlement'
            });
            this.showToast(`Transaction ${txnId} verified & cleared successfully.`);
            this.loadAllData();
        } catch (err) {
            this.showToast(`Error: ${err.message}`);
        }
    };

    handleProcessRefund = (txnId) => {
        const currentRole = this.props.userRole || localStorage.getItem('userRole') || '';
        const currentUsername = this.props.username || localStorage.getItem('userId') || '';
        if (currentRole.toLowerCase() !== 'admin' && currentUsername.toLowerCase() !== 'admin') {
            this.showToast('Security Alert: Action rejected. Administrator permissions required.');
            return;
        }

        const confirmRefund = window.confirm(`Are you sure you want to approve & process 100% refund for transaction ${txnId}?`);
        if (!confirmRefund) return;

        try {
            refundPayment({
                transactionId: txnId,
                adminUsername: currentUsername || 'admin',
                reason: 'Official refund approved and settled by central admin'
            });
            this.showToast(`Refund processed for ${txnId} successfully.`);
            this.loadAllData();
        } catch (err) {
            this.showToast(`Error: ${err.message}`);
        }
    };

    handleFlagDispute = (txnId) => {
        const currentRole = this.props.userRole || localStorage.getItem('userRole') || '';
        const currentUsername = this.props.username || localStorage.getItem('userId') || '';
        if (currentRole.toLowerCase() !== 'admin' && currentUsername.toLowerCase() !== 'admin') {
            this.showToast('Security Alert: Action rejected. Administrator permissions required.');
            return;
        }

        const reason = window.prompt("Enter dispute reason for investigation:", "Payment under investigation by banking compliance");
        if (!reason) return;

        try {
            disputePayment({
                transactionId: txnId,
                disputeReason: reason,
                reportedBy: currentUsername || 'admin'
            });
            this.showToast(`Transaction ${txnId} flagged as DISPUTED.`);
            this.loadAllData();
        } catch (err) {
            this.showToast(`Error: ${err.message}`);
        }
    };

    handleResolveDispute = (txnId) => {
        const currentRole = this.props.userRole || localStorage.getItem('userRole') || '';
        const currentUsername = this.props.username || localStorage.getItem('userId') || '';
        if (currentRole.toLowerCase() !== 'admin' && currentUsername.toLowerCase() !== 'admin') {
            this.showToast('Security Alert: Action rejected. Administrator permissions required.');
            return;
        }

        const resolution = window.prompt("Enter dispute investigation resolution note:", "Bank statement cross-verified; charge is valid and cleared.");
        if (!resolution) return;

        try {
            adminVerifyPayment({
                transactionId: txnId,
                adminUsername: currentUsername || 'admin',
                verificationNote: `Dispute resolved: ${resolution}`
            });
            this.showToast(`Dispute resolved and transaction ${txnId} cleared.`);
            this.loadAllData();
        } catch (err) {
            this.showToast(`Error: ${err.message}`);
        }
    };

    // Complaints Actions
    handleUpdateComplaintStatus = (cmpId, newStatus) => {
        const resolutionNote = newStatus === 'RESOLVED' ? window.prompt("Enter resolution summary:", "Both parties contacted and matter settled.") : null;

        const updatedComplaints = this.state.complaints.map(c => {
            if (c.id === cmpId) {
                return { ...c, status: newStatus, resolutionNote: resolutionNote || c.resolutionNote };
            }
            return c;
        });
        this.setState({ complaints: updatedComplaints, selectedComplaint: null });
        localStorage.setItem('carpool_admin_complaints', JSON.stringify(updatedComplaints));
        this.showToast(`Complaint ${cmpId} updated to ${newStatus}.`);
    };

    // Broadcast Announcement
    handleSendBroadcast = (e) => {
        e.preventDefault();
        const { broadcastTitle, broadcastMessage, broadcastAudience, broadcastPriority } = this.state;
        if (!broadcastTitle || !broadcastMessage) {
            alert("Please fill in both title and message for the announcement.");
            return;
        }

        const announcement = {
            id: 'NOTIF-ANNOUNCE-' + Date.now(),
            forRole: broadcastAudience === 'DRIVERS_ONLY' ? 'DRIVER' : (broadcastAudience === 'PASSENGERS_ONLY' ? 'PASSENGER' : 'ALL'),
            type: 'ADMIN_ANNOUNCEMENT',
            status: 'ANNOUNCEMENT',
            priority: broadcastPriority,
            message: `📢 [ADMIN ANNOUNCEMENT: ${broadcastTitle.toUpperCase()}] - ${broadcastMessage}`,
            timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        };

        const existing = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
        existing.unshift(announcement);
        localStorage.setItem('carpool_driver_notifications', JSON.stringify(existing));
        window.dispatchEvent(new Event('carpool_driver_notifications_updated'));

        this.setState({
            broadcastTitle: '',
            broadcastMessage: ''
        });
        this.showToast(`Announcement broadcast successfully sent to ${broadcastAudience}!`);
    };

    // Generate & Download Real CSV Report
    handleDownloadReport = () => {
        const { reportType, reportPeriod, users, rides, transactions, complaints } = this.state;
        let csvContent = "data:text/csv;charset=utf-8,";
        let fileName = `carpooling_${reportType.toLowerCase()}_${reportPeriod.toLowerCase()}_${Date.now()}.csv`;

        if (reportType === 'OPERATIONS') {
            csvContent += "Ride ID,Driver Name,Driver Username,Origin,Destination,Highway,Departure,Fare,Booked Seats,Total Seats,Status\r\n";
            rides.forEach(r => {
                csvContent += `"${r.id}","${r.driverName}","${r.driverUsername}","${r.origin}","${r.destination}","${r.highway}","${r.departure}",${r.fare},${r.bookedSeats},${r.totalSeats},"${r.status}"\r\n`;
            });
        } else if (reportType === 'FINANCIAL') {
            csvContent += "Transaction ID,UTR Number,Passenger Name,Driver Name,Route,Amount (INR),Platform Fee 5% (INR),Timestamp,Mode,Status\r\n";
            transactions.forEach(t => {
                csvContent += `"${t.id}","${t.utr}","${t.passengerName}","${t.driverName}","${t.route}",${t.amount},${t.fee},"${t.timestamp}","${t.mode}","${t.status}"\r\n`;
            });
        } else if (reportType === 'COMPLIANCE') {
            csvContent += "Complaint ID,Category,Complainant,Reported User,Route,Date,Severity,Status,Resolution\r\n";
            complaints.forEach(c => {
                csvContent += `"${c.id}","${c.category}","${c.complainant}","${c.reportedUser}","${c.route}","${c.date}","${c.severity}","${c.status}","${c.resolutionNote || 'Pending'}"\r\n`;
            });
        } else {
            csvContent += "User ID,Name,Username,Email,Phone,Role,Status,Total Rides,Rating,KYC Status\r\n";
            users.forEach(u => {
                csvContent += `"${u.id}","${u.name}","${u.username}","${u.email}","${u.phone}","${u.role}","${u.status}",${u.totalRides},${u.rating},"${u.kycStatus}"\r\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast(`Report downloaded: ${fileName}`);
    };

    render() {
        const {
            activeTab, searchQuery, roleFilter, statusFilter,
            rideStatusFilter, txnStatusFilter, complaintStatusFilter,
            selectedUser, selectedVerification, selectedComplaint,
            users, verifications, rides, transactions, complaints, sosIncidents, auditLogs,
            broadcastTitle, broadcastMessage, broadcastAudience, broadcastPriority,
            reportPeriod, reportType, toastMessage
        } = this.state;

        // Filtered Users
        const filteredUsers = users.filter(u => {
            const matchesSearch = !searchQuery ||
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
            const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });

        // Filtered Rides
        const filteredRides = rides.filter(r => {
            const matchesSearch = !searchQuery ||
                r.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = rideStatusFilter === 'ALL' || r.status === rideStatusFilter;
            return matchesSearch && matchesStatus;
        });

        // Filtered Transactions
        const filteredTransactions = transactions.filter(t => {
            const matchesSearch = !searchQuery ||
                t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.utr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.driverName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = txnStatusFilter === 'ALL' || 
                t.status === txnStatusFilter || 
                (txnStatusFilter === 'PAID_VERIFIED' && (t.status === 'PAID & VERIFIED' || t.status === 'SUCCESS')) ||
                (txnStatusFilter === 'PENDING' && t.status === 'PENDING VERIFICATION') ||
                (txnStatusFilter === 'REPORTED_RECEIVED' && t.status === 'REPORTED RECEIVED') ||
                (txnStatusFilter === 'REFUNDED' && (t.status === 'REFUNDED' || t.status === 'REFUND_REQUESTED')) ||
                (txnStatusFilter === 'DISPUTED' && t.status === 'DISPUTED');
            return matchesSearch && matchesStatus;
        });

        // Filtered Complaints
        const filteredComplaints = complaints.filter(c => {
            const matchesSearch = !searchQuery ||
                c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.complainant.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.reportedUser.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = complaintStatusFilter === 'ALL' || c.status === complaintStatusFilter;
            return matchesSearch && matchesStatus;
        });

        const pendingVerifCount = verifications.filter(v => v.status === 'PENDING_REVIEW').length;
        const activeSosCount = sosIncidents.filter(s => s.status !== 'RESOLVED').length;
        const openComplaintsCount = complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'DISMISSED').length;

        return (
            <div className="AdminDashboard-wrapper">
                <div className="AdminDashboard-container">

                    {/* Top Platform Banner */}
                    <div className="AdminDashboard-banner">
                        <div className="AdminDashboard-title-area">
                            <div className="AdminDashboard-flag-badge">
                                <span>🇮🇳</span> CENTRAL REGULATORY & OPERATIONS CONSOLE
                            </div>
                            <h1>
                                <FaShieldAlt style={{ color: '#38bdf8' }} /> Intercity Carpooling Admin Dashboard
                            </h1>
                            <p className="AdminDashboard-subtitle">
                                Nationwide ride operations management, automated vehicle & DL verification, payment settlement audits, complaint investigation, and platform security.
                            </p>
                        </div>

                        <div className="AdminDashboard-system-health">
                            <div className="AdminDashboard-health-pill">
                                <div className="AdminDashboard-health-dot"></div>
                                <span>Spring API (8080): <strong>Online</strong></span>
                            </div>
                            <div className="AdminDashboard-health-pill">
                                <div className="AdminDashboard-health-dot"></div>
                                <span>UPI Gateway: <strong>Active</strong></span>
                            </div>
                            <div className="AdminDashboard-health-pill">
                                <div className="AdminDashboard-health-dot"></div>
                                <span>SOS Dispatcher: <strong>Active 24/7</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* SOS Active Alert Banner if any */}
                    {activeSosCount > 0 && (
                        <div className="AdminDashboard-sos-banner">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '1.6rem' }} />
                                <div>
                                    <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '1.05rem' }}>
                                        🚨 CRITICAL: {activeSosCount} ACTIVE SOS EMERGENCY INCIDENT(S) REPORTED
                                    </div>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                                        Immediate passenger safety protocol active. Emergency contacts notified with live highway GPS coordinates.
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="AdminDashboard-btn danger"
                                onClick={() => this.handleTabClick('complaints')}
                            >
                                Inspect SOS Console ➔
                            </button>
                        </div>
                    )}


                    {/* ========================================================================= */}
                    {/* TAB 1: ADMIN OVERVIEW DASHBOARD                                           */}
                    {/* ========================================================================= */}
                    {activeTab === 'overview' && (
                        <div>
                            {/* KPI Metrics Grid */}
                            <div className="AdminDashboard-kpi-grid">
                                {/* Total Users & Drivers */}
                                <div className="AdminDashboard-kpi-card">
                                    <div className="AdminDashboard-kpi-top">
                                        <span className="AdminDashboard-kpi-title">Total Users & Drivers</span>
                                        <div className="AdminDashboard-kpi-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                                            <FaUsers />
                                        </div>
                                    </div>
                                    <div className="AdminDashboard-kpi-value">1,428</div>
                                    <div className="AdminDashboard-kpi-sub">
                                        <span className="AdminDashboard-kpi-trend positive">↑ 14.2%</span>
                                        <span>412 Drivers • 1,016 Passengers</span>
                                    </div>
                                </div>

                                {/* Total Rides & Completed */}
                                <div className="AdminDashboard-kpi-card">
                                    <div className="AdminDashboard-kpi-top">
                                        <span className="AdminDashboard-kpi-title">Rides & Completed Trips</span>
                                        <div className="AdminDashboard-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                                            <FaCar />
                                        </div>
                                    </div>
                                    <div className="AdminDashboard-kpi-value">2,890</div>
                                    <div className="AdminDashboard-kpi-sub">
                                        <span className="AdminDashboard-kpi-trend positive">94.2% Success</span>
                                        <span>2,415 Completed Journeys</span>
                                    </div>
                                </div>

                                {/* Active Bookings & Cancelled */}
                                <div className="AdminDashboard-kpi-card">
                                    <div className="AdminDashboard-kpi-top">
                                        <span className="AdminDashboard-kpi-title">Active Bookings & Cancelled</span>
                                        <div className="AdminDashboard-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                                            <FaHistory />
                                        </div>
                                    </div>
                                    <div className="AdminDashboard-kpi-value">142</div>
                                    <div className="AdminDashboard-kpi-sub">
                                        <span className="AdminDashboard-kpi-trend neutral">Active Now</span>
                                        <span>58 Cancelled (2.0% rate)</span>
                                    </div>
                                </div>

                                {/* Total Transactions & Platform Revenue */}
                                <div className="AdminDashboard-kpi-card">
                                    <div className="AdminDashboard-kpi-top">
                                        <span className="AdminDashboard-kpi-title">Platform Revenue (5%)</span>
                                        <div className="AdminDashboard-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                                            <FaMoneyBillWave />
                                        </div>
                                    </div>
                                    <div className="AdminDashboard-kpi-value">₹92,260</div>
                                    <div className="AdminDashboard-kpi-sub">
                                        <span className="AdminDashboard-kpi-trend positive">₹18,45,250 Total GMV</span>
                                        <span>100% UPI Settlement</span>
                                    </div>
                                </div>
                            </div>

                            {/* Operational Visualizations */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                                {/* Weekly Ride Volume Chart */}
                                <div className="AdminDashboard-card">
                                    <div className="AdminDashboard-card-header">
                                        <h3 className="AdminDashboard-card-title">
                                            <FaChartLine style={{ color: '#38bdf8' }} /> Weekly Ride Volume (Intercity Highways)
                                        </h3>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Last 7 Days</span>
                                    </div>

                                    <div className="AdminDashboard-chart-bar-container">
                                        {[
                                            { day: 'Mon', count: 320, pct: '55%' },
                                            { day: 'Tue', count: 290, pct: '48%' },
                                            { day: 'Wed', count: 340, pct: '60%' },
                                            { day: 'Thu', count: 410, pct: '72%' },
                                            { day: 'Fri', count: 580, pct: '98%' },
                                            { day: 'Sat', count: 520, pct: '90%' },
                                            { day: 'Sun', count: 430, pct: '75%' }
                                        ].map(item => (
                                            <div key={item.day} className="AdminDashboard-chart-col">
                                                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '4px' }}>{item.count}</div>
                                                <div className="AdminDashboard-chart-bar" style={{ height: item.pct }}></div>
                                                <div className="AdminDashboard-chart-label">{item.day}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', paddingTop: '4px' }}>
                                        <span>Peak Days: Friday & Saturday (Weekend Intercity Rush)</span>
                                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>Avg 412 rides/day</span>
                                    </div>
                                </div>

                                {/* Top Highway Corridors */}
                                <div className="AdminDashboard-card">
                                    <div className="AdminDashboard-card-header">
                                        <h3 className="AdminDashboard-card-title">
                                            <FaCar style={{ color: '#10b981' }} /> Top Active Highway Corridors
                                        </h3>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Live Occupancy</span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {[
                                            { route: 'Delhi ➔ Jaipur (NH-48)', trips: 780, share: '85%', avgFare: '₹525' },
                                            { route: 'Bengaluru ➔ Hyderabad (NH-44)', trips: 640, share: '70%', avgFare: '₹750' },
                                            { route: 'Mumbai ➔ Pune (Expressway)', trips: 590, share: '65%', avgFare: '₹350' },
                                            { route: 'Chennai ➔ Bengaluru (NH-48)', trips: 410, share: '45%', avgFare: '₹550' },
                                            { route: 'Delhi ➔ Chandigarh (NH-44)', trips: 360, share: '40%', avgFare: '₹450' }
                                        ].map(item => (
                                            <div key={item.route} style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                                                    <strong>{item.route}</strong>
                                                    <span style={{ color: '#fef08a' }}>{item.trips} rides • Avg {item.avgFare}</span>
                                                </div>
                                                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: item.share, height: '100%', background: 'linear-gradient(90deg, #10b981, #38bdf8)', borderRadius: '3px' }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: USER & DRIVER MANAGEMENT                                           */}
                    {/* ========================================================================= */}
                    {activeTab === 'users' && (
                        <div className="AdminDashboard-card">
                            <div className="AdminDashboard-card-header">
                                <h3 className="AdminDashboard-card-title">
                                    <FaUsers style={{ color: '#38bdf8' }} /> User & Driver Account Management
                                </h3>
                                <div className="AdminDashboard-controls">
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, username, or ID..."
                                        className="AdminDashboard-search-input"
                                        value={searchQuery}
                                        onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                    />
                                    <select
                                        className="AdminDashboard-select"
                                        value={roleFilter}
                                        onChange={(e) => this.setState({ roleFilter: e.target.value })}
                                    >
                                        <option value="ALL">All Roles</option>
                                        <option value="DRIVER">Drivers Only</option>
                                        <option value="PASSENGER">Passengers Only</option>
                                    </select>
                                    <select
                                        className="AdminDashboard-select"
                                        value={statusFilter}
                                        onChange={(e) => this.setState({ statusFilter: e.target.value })}
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="SUSPENDED">Suspended</option>
                                        <option value="BLOCKED">Blocked</option>
                                    </select>
                                </div>
                            </div>

                            <div className="AdminDashboard-table-wrapper">
                                <table className="AdminDashboard-table">
                                    <thead>
                                        <tr>
                                            <th>User ID</th>
                                            <th>Account Name</th>
                                            <th>Role</th>
                                            <th>Contact Details</th>
                                            <th>Rides & Rating</th>
                                            <th>Account Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                                    No users match the search filter criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map(u => (
                                                <tr key={u.id}>
                                                    <td>
                                                        <strong style={{ color: '#38bdf8' }}>{u.id}</strong>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold', color: '#ffffff' }}>{u.name}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>@{u.username}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`AdminDashboard-badge ${u.role.toLowerCase()}`}>
                                                            {u.role === 'DRIVER' ? <FaCar /> : <FaUsers />} {u.role}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontSize: '0.82rem' }}>{u.email}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{u.phone}</div>
                                                    </td>
                                                    <td>
                                                        <div>{u.totalRides} Rides</div>
                                                        <div style={{ color: '#fef08a', fontSize: '0.8rem' }}>⭐ {u.rating} / 5.0</div>
                                                    </td>
                                                    <td>
                                                        <span className={`AdminDashboard-badge ${u.status.toLowerCase()}`}>
                                                            {u.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <button
                                                                type="button"
                                                                className="AdminDashboard-btn secondary"
                                                                onClick={() => this.setState({ selectedUser: u })}
                                                                title="View full profile"
                                                            >
                                                                <FaEye /> Profile
                                                            </button>
                                                            {u.status === 'ACTIVE' ? (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn warning"
                                                                    onClick={() => this.handleUpdateUserStatus(u.id, 'SUSPENDED')}
                                                                >
                                                                    Suspend
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn success"
                                                                    onClick={() => this.handleUpdateUserStatus(u.id, 'ACTIVE')}
                                                                >
                                                                    Activate
                                                                </button>
                                                            )}
                                                            {u.status !== 'BLOCKED' && (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn danger"
                                                                    onClick={() => this.handleUpdateUserStatus(u.id, 'BLOCKED')}
                                                                    title="Permanently block account"
                                                                >
                                                                    <FaBan /> Block
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 3: DRIVER & VEHICLE VERIFICATION                                      */}
                    {/* ========================================================================= */}
                    {activeTab === 'verification' && (
                        <div className="AdminDashboard-card">
                            <div className="AdminDashboard-card-header">
                                <div>
                                    <h3 className="AdminDashboard-card-title">
                                        <FaIdCard style={{ color: '#10b981' }} /> Driver License, Vehicle & HSRP Verification Queue
                                    </h3>
                                    <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '4px' }}>
                                        Review Driving Licences (DL), RC Certificate, HSRP laser security codes, and commercial/carpool insurance.
                                    </div>
                                </div>
                                <span className="AdminDashboard-badge pending" style={{ fontSize: '0.85rem' }}>
                                    {pendingVerifCount} Application(s) Awaiting Decision
                                </span>
                            </div>

                            <div className="AdminDashboard-table-wrapper">
                                <table className="AdminDashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Driver Details</th>
                                            <th>Driving Licence (DL)</th>
                                            <th>Vehicle & Model</th>
                                            <th>Registration & HSRP</th>
                                            <th>Compliance Check</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {verifications.map(v => (
                                            <tr key={v.id}>
                                                <td>
                                                    <div style={{ fontWeight: 'bold', color: '#ffffff' }}>{v.driverName}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>@{v.driverUsername}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{v.phone}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{v.dlNumber}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Valid till: {v.dlExpiry}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 'bold' }}>{v.vehicleModel}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Insured till: {v.insuranceValidTill}</div>
                                                </td>
                                                <td>
                                                    <div style={{ background: '#0b1329', border: '1px solid #e2e8f0', color: '#000000', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', display: 'inline-block', backgroundColor: '#ffffff', letterSpacing: '1px' }}>
                                                        IND {v.registrationNo}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '4px' }}>
                                                        Laser HSRP: {v.hsrpLaserCode}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.74rem' }}>
                                                        <span style={{ color: v.documents.dl.includes('Verified') ? '#10b981' : '#f87171' }}>
                                                            ✓ DL: {v.documents.dl}
                                                        </span>
                                                        <span style={{ color: v.documents.rc.includes('Active') ? '#10b981' : '#f87171' }}>
                                                            ✓ RC: {v.documents.rc}
                                                        </span>
                                                        <span style={{ color: v.documents.hsrp === 'Compliant' ? '#10b981' : '#f87171' }}>
                                                            ✓ HSRP: {v.documents.hsrp}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`AdminDashboard-badge ${v.status === 'APPROVED' ? 'verified' : (v.status === 'PENDING_REVIEW' ? 'pending' : 'rejected')}`}>
                                                        {v.status === 'APPROVED' ? 'VERIFIED & APPROVED' : (v.status === 'PENDING_REVIEW' ? 'PENDING REVIEW' : 'REJECTED')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        <button
                                                            type="button"
                                                            className="AdminDashboard-btn secondary"
                                                            onClick={() => this.setState({ selectedVerification: v })}
                                                        >
                                                            <FaEye /> Inspect
                                                        </button>
                                                        {v.status === 'PENDING_REVIEW' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn success"
                                                                    onClick={() => this.handleApproveVerification(v.id)}
                                                                >
                                                                    <FaCheck /> Approve
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn danger"
                                                                    onClick={() => this.handleRejectVerification(v.id)}
                                                                >
                                                                    <FaTimes /> Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 4: RIDE MANAGEMENT                                                    */}
                    {/* ========================================================================= */}
                    {activeTab === 'rides' && (
                        <div className="AdminDashboard-card">
                            <div className="AdminDashboard-card-header">
                                <h3 className="AdminDashboard-card-title">
                                    <FaCar style={{ color: '#38bdf8' }} /> Ride Listings & Moderator Console
                                </h3>
                                <div className="AdminDashboard-controls">
                                    <input
                                        type="text"
                                        placeholder="Search by city, driver, or Ride ID..."
                                        className="AdminDashboard-search-input"
                                        value={searchQuery}
                                        onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                    />
                                    <select
                                        className="AdminDashboard-select"
                                        value={rideStatusFilter}
                                        onChange={(e) => this.setState({ rideStatusFilter: e.target.value })}
                                    >
                                        <option value="ALL">All Ride Statuses</option>
                                        <option value="AVAILABLE">Available</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="FULL">Fully Booked</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            <div className="AdminDashboard-table-wrapper">
                                <table className="AdminDashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Ride ID</th>
                                            <th>Route & Highway</th>
                                            <th>Driver Details</th>
                                            <th>Departure Time</th>
                                            <th>Seats & Fare</th>
                                            <th>Listing Status</th>
                                            <th>Moderation Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRides.map(r => (
                                            <tr key={r.id}>
                                                <td>
                                                    <strong style={{ color: '#38bdf8' }}>{r.id}</strong>
                                                    {r.flagged && (
                                                        <div style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 'bold' }}>
                                                            ⚠️ FLAGGED
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.92rem' }}>
                                                        {r.origin} ➔ {r.destination}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Corridor: {r.highway}</div>
                                                </td>
                                                <td>
                                                    <div>{r.driverName}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{r.vehicle}</div>
                                                </td>
                                                <td style={{ fontSize: '0.84rem' }}>{r.departure}</td>
                                                <td>
                                                    <div style={{ fontWeight: 'bold', color: '#10b981' }}>₹{r.fare} / seat</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{r.bookedSeats}/{r.totalSeats} Booked</div>
                                                </td>
                                                <td>
                                                    <span className={`AdminDashboard-badge ${r.status === 'AVAILABLE' ? 'active' : (r.status === 'IN_PROGRESS' ? 'warning' : (r.status === 'FULL' ? 'success' : 'failed'))}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {r.status !== 'CANCELLED_BY_ADMIN' && r.status !== 'CANCELLED' ? (
                                                        <button
                                                            type="button"
                                                            className="AdminDashboard-btn danger"
                                                            onClick={() => this.handleRemoveRide(r.id)}
                                                            title="Remove fraudulent or inappropriate listing"
                                                        >
                                                            <FaTrashAlt /> Remove Listing
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Removed / Cancelled</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 5: TRANSACTION MANAGEMENT                                             */}
                    {/* ========================================================================= */}
                    {activeTab === 'transactions' && (
                        <div className="AdminDashboard-card">
                            <div className="AdminDashboard-card-header">
                                <div>
                                    <h3 className="AdminDashboard-card-title">
                                        <FaMoneyBillWave style={{ color: '#10b981' }} /> UPI Transactions & Financial Settlement Audit
                                    </h3>
                                    <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '4px' }}>
                                        Complete ledger of cashless payments, UTR tracking, refund processing, and dispute management.
                                    </div>
                                </div>
                                <div className="AdminDashboard-controls">
                                    <input
                                        type="text"
                                        placeholder="Search by Txn ID, UTR, or User..."
                                        className="AdminDashboard-search-input"
                                        value={searchQuery}
                                        onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                    />
                                    <select
                                        className="AdminDashboard-select"
                                        value={txnStatusFilter}
                                        onChange={(e) => this.setState({ txnStatusFilter: e.target.value })}
                                    >
                                        <option value="ALL">All Transactions</option>
                                        <option value="PAID_VERIFIED">Paid & Verified</option>
                                        <option value="REPORTED_RECEIVED">Reported Received</option>
                                        <option value="PENDING">Pending Verification</option>
                                        <option value="DISPUTED">Disputed</option>
                                        <option value="REFUNDED">Refunded</option>
                                    </select>
                                </div>
                            </div>

                            <div className="AdminDashboard-table-wrapper">
                                <table className="AdminDashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Transaction & UTR</th>
                                            <th>Passenger (Payer)</th>
                                            <th>Driver (Recipient)</th>
                                            <th>Route & Booking</th>
                                            <th>Amount & Fee</th>
                                            <th>Payment Mode</th>
                                            <th>Status</th>
                                            <th>Moderation Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.map(t => {
                                            const isPending = t.status === 'PENDING VERIFICATION' || t.status === 'PENDING';
                                            const isReported = t.status === 'REPORTED RECEIVED';
                                            const isPaidVerified = t.status === 'PAID & VERIFIED' || t.status === 'SUCCESS';
                                            const isDisputed = t.status === 'DISPUTED';
                                            const isRefunded = t.status === 'REFUNDED' || t.status === 'REFUND_REQUESTED';

                                            let badgeClass = 'active';
                                            let badgeStyle = { color: '#10b981', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.15)' };
                                            if (isPending) {
                                                badgeClass = 'warning';
                                                badgeStyle = { color: '#fbbf24', border: '1px solid #fbbf24', background: 'rgba(251, 191, 36, 0.15)' };
                                            } else if (isReported) {
                                                badgeClass = 'active';
                                                badgeStyle = { color: '#38bdf8', border: '1px solid #38bdf8', background: 'rgba(56, 189, 248, 0.15)' };
                                            } else if (isDisputed) {
                                                badgeClass = 'suspended';
                                                badgeStyle = { color: '#ef4444', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.15)' };
                                            } else if (isRefunded) {
                                                badgeClass = 'warning';
                                                badgeStyle = { color: '#c084fc', border: '1px solid #c084fc', background: 'rgba(192, 132, 252, 0.15)' };
                                            }

                                            return (
                                                <tr key={t.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold', color: '#fef08a' }}>{t.id}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>UTR: {t.utr}</div>
                                                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{t.timestamp}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>{t.passengerName}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>@{t.passengerUsername}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>{t.driverName}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>@{t.driverUsername}</div>
                                                    </td>
                                                    <td style={{ fontSize: '0.84rem' }}>
                                                        <div style={{ fontWeight: '600' }}>{t.route}</div>
                                                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                            Bkg: {t.bookingId || 'BKG-LIVE'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.94rem' }}>₹{t.amount}</div>
                                                        <div style={{ fontSize: '0.74rem', color: '#38bdf8' }}>Fee (5%): ₹{Number(t.fee).toFixed(2)}</div>
                                                    </td>
                                                    <td>
                                                        <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>
                                                            {t.mode}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="AdminDashboard-badge" style={badgeStyle}>
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {(isPending || isReported) && (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn success"
                                                                    onClick={() => this.handleAdminVerifyPayment(t.id)}
                                                                    title="Admin manual clearance after verifying bank settlement"
                                                                >
                                                                    ✓ Verify & Clear
                                                                </button>
                                                            )}
                                                            {isDisputed ? (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn primary"
                                                                    onClick={() => this.handleResolveDispute(t.id)}
                                                                >
                                                                    Resolve Dispute
                                                                </button>
                                                            ) : !isRefunded && (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn warning"
                                                                    onClick={() => this.handleFlagDispute(t.id)}
                                                                    title="Flag transaction for compliance investigation"
                                                                >
                                                                    Flag Dispute
                                                                </button>
                                                            )}
                                                            {!isRefunded && (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn danger"
                                                                    onClick={() => this.handleProcessRefund(t.id)}
                                                                    title="Issue 100% refund to passenger"
                                                                >
                                                                    Refund
                                                                </button>
                                                            )}
                                                            {isPaidVerified && (
                                                                <span style={{ color: '#10b981', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    <FaCheck /> Settled
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAYMENT AUDIT TRAIL TABLE */}
                            <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <h4 style={{ margin: 0, color: '#38bdf8', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                                            <FaHistory /> Payment Audit Trail & Action Log ({auditLogs.length})
                                        </h4>
                                        <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
                                            Tamper-evident audit log of all payment verifications, disputes, driver confirmations, and administrative overrides.
                                        </div>
                                    </div>
                                    <span className="AdminDashboard-badge active" style={{ fontSize: '0.78rem' }}>
                                        Immutable Ledger ✓
                                    </span>
                                </div>

                                <div className="AdminDashboard-table-wrapper">
                                    <table className="AdminDashboard-table">
                                        <thead>
                                            <tr>
                                                <th>Timestamp</th>
                                                <th>Action</th>
                                                <th>Actor (Role)</th>
                                                <th>Txn & Booking ID</th>
                                                <th>Reference (UTR)</th>
                                                <th>Audit Details & Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                                                        No payment audit events recorded yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                auditLogs.map(log => {
                                                    let badgeColor = '#38bdf8';
                                                    if (log.action.includes('VERIF') || log.action.includes('CONFIRM')) badgeColor = '#10b981';
                                                    else if (log.action.includes('DISPUTE')) badgeColor = '#ef4444';
                                                    else if (log.action.includes('REFUND')) badgeColor = '#a855f7';
                                                    else if (log.action.includes('INITIATED')) badgeColor = '#fbbf24';

                                                    return (
                                                        <tr key={log.id}>
                                                            <td style={{ fontSize: '0.8rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                                                                {log.timestamp}
                                                            </td>
                                                            <td>
                                                                <span style={{
                                                                    background: `${badgeColor}22`,
                                                                    border: `1px solid ${badgeColor}`,
                                                                    color: badgeColor,
                                                                    padding: '2px 8px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.74rem',
                                                                    fontWeight: '800'
                                                                }}>
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <strong style={{ color: '#ffffff' }}>@{log.actor}</strong>
                                                                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Role: {log.role}</div>
                                                            </td>
                                                            <td>
                                                                <div style={{ color: '#fef08a', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                                                    {log.transactionId || '—'}
                                                                </div>
                                                                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                                                    Bkg: {log.bookingId || '—'}
                                                                </div>
                                                            </td>
                                                            <td style={{ fontSize: '0.82rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                                                                {log.utr || '—'}
                                                            </td>
                                                            <td style={{ fontSize: '0.82rem', color: '#e2e8f0', maxWidth: '300px' }}>
                                                                {log.details}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 6: COMPLAINTS & SAFETY MANAGEMENT                                     */}
                    {/* ========================================================================= */}
                    {activeTab === 'complaints' && (
                        <div>
                            {/* SOS Emergency Console Card */}
                            <div className="AdminDashboard-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                                <div className="AdminDashboard-card-header">
                                    <h3 className="AdminDashboard-card-title" style={{ color: '#ef4444' }}>
                                        <FaShieldAlt /> SOS Emergency & Incident Control Center
                                    </h3>
                                    <span className="AdminDashboard-badge suspended">24x7 Safety Response</span>
                                </div>

                                <div className="AdminDashboard-table-wrapper">
                                    <table className="AdminDashboard-table">
                                        <thead>
                                            <tr>
                                                <th>SOS ID</th>
                                                <th>Complainant / Reporter</th>
                                                <th>Assigned Driver</th>
                                                <th>GPS Coordinates & Location</th>
                                                <th>Time Triggered</th>
                                                <th>Status</th>
                                                <th>Resolution Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sosIncidents.map(s => (
                                                <tr key={s.id}>
                                                    <td>
                                                        <strong style={{ color: '#ef4444' }}>{s.id}</strong>
                                                    </td>
                                                    <td><strong>{s.reporter}</strong></td>
                                                    <td>{s.driverName}</td>
                                                    <td style={{ fontSize: '0.82rem', color: '#fef08a' }}>
                                                        📍 {s.location} ({s.route})
                                                    </td>
                                                    <td style={{ fontSize: '0.82rem' }}>{s.timestamp}</td>
                                                    <td>
                                                        <span className={`AdminDashboard-badge ${s.status === 'RESOLVED' ? 'success' : 'failed'}`}>
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {s.status === 'RESOLVED' ? (
                                                            <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ Closed</span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="AdminDashboard-btn success"
                                                                onClick={() => {
                                                                    const updated = this.state.sosIncidents.map(x => x.id === s.id ? { ...x, status: 'RESOLVED' } : x);
                                                                    this.setState({ sosIncidents: updated });
                                                                    localStorage.setItem('carpool_admin_sos', JSON.stringify(updated));
                                                                    this.showToast("SOS Alert marked as Resolved.");
                                                                }}
                                                            >
                                                                Mark Resolved
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Passenger & Driver Complaints */}
                            <div className="AdminDashboard-card">
                                <div className="AdminDashboard-card-header">
                                    <h3 className="AdminDashboard-card-title">
                                        <FaExclamationTriangle style={{ color: '#f59e0b' }} /> Passenger & Driver Complaints
                                    </h3>
                                    <div className="AdminDashboard-controls">
                                        <select
                                            className="AdminDashboard-select"
                                            value={complaintStatusFilter}
                                            onChange={(e) => this.setState({ complaintStatusFilter: e.target.value })}
                                        >
                                            <option value="ALL">All Complaints</option>
                                            <option value="UNDER_INVESTIGATION">Under Investigation</option>
                                            <option value="OPEN">Open</option>
                                            <option value="RESOLVED">Resolved</option>
                                            <option value="DISMISSED">Dismissed</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="AdminDashboard-table-wrapper">
                                    <table className="AdminDashboard-table">
                                        <thead>
                                            <tr>
                                                <th>Complaint ID</th>
                                                <th>Category</th>
                                                <th>Complainant</th>
                                                <th>Reported User</th>
                                                <th>Route & Date</th>
                                                <th>Severity</th>
                                                <th>Status</th>
                                                <th>Resolution Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredComplaints.map(c => (
                                                <tr key={c.id}>
                                                    <td><strong style={{ color: '#38bdf8' }}>{c.id}</strong></td>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold' }}>{c.category}</div>
                                                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', maxWidth: '280px' }}>{c.description}</div>
                                                    </td>
                                                    <td>{c.complainant}</td>
                                                    <td><strong style={{ color: '#f87171' }}>{c.reportedUser}</strong></td>
                                                    <td>
                                                        <div style={{ fontSize: '0.82rem' }}>{c.route}</div>
                                                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{c.date}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`AdminDashboard-badge ${c.severity === 'HIGH' ? 'failed' : (c.severity === 'MEDIUM' ? 'warning' : 'active')}`}>
                                                            {c.severity}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`AdminDashboard-badge ${c.status === 'RESOLVED' ? 'success' : (c.status === 'UNDER_INVESTIGATION' ? 'pending' : 'suspended')}`}>
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {c.status !== 'RESOLVED' && (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn success"
                                                                    onClick={() => this.handleUpdateComplaintStatus(c.id, 'RESOLVED')}
                                                                >
                                                                    Resolve
                                                                </button>
                                                            )}
                                                            {c.status !== 'DISMISSED' && (
                                                                <button
                                                                    type="button"
                                                                    className="AdminDashboard-btn secondary"
                                                                    onClick={() => this.handleUpdateComplaintStatus(c.id, 'DISMISSED')}
                                                                >
                                                                    Dismiss
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 7: NOTIFICATIONS & REPORTS                                            */}
                    {/* ========================================================================= */}
                    {activeTab === 'reports' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
                            {/* Broadcast Announcements Form */}
                            <div className="AdminDashboard-card">
                                <div className="AdminDashboard-card-header">
                                    <h3 className="AdminDashboard-card-title">
                                        <FaBullhorn style={{ color: '#38bdf8' }} /> Broadcast Nationwide Announcement
                                    </h3>
                                </div>

                                <form onSubmit={this.handleSendBroadcast}>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                                            Target Audience
                                        </label>
                                        <select
                                            className="AdminDashboard-select"
                                            style={{ width: '100%' }}
                                            value={broadcastAudience}
                                            onChange={(e) => this.setState({ broadcastAudience: e.target.value })}
                                        >
                                            <option value="ALL">All Registered Users (Drivers & Passengers)</option>
                                            <option value="DRIVERS_ONLY">Verified Drivers Only</option>
                                            <option value="PASSENGERS_ONLY">Passengers Only</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                                            Priority Level
                                        </label>
                                        <select
                                            className="AdminDashboard-select"
                                            style={{ width: '100%' }}
                                            value={broadcastPriority}
                                            onChange={(e) => this.setState({ broadcastPriority: e.target.value })}
                                        >
                                            <option value="NORMAL">Normal Advisory</option>
                                            <option value="IMPORTANT">Important Operations Update</option>
                                            <option value="URGENT">Urgent Weather / Highway Advisory</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                                            Announcement Title
                                        </label>
                                        <input
                                            type="text"
                                            className="AdminDashboard-search-input"
                                            style={{ width: '100%', boxSizing: 'border-box' }}
                                            placeholder="e.g., NH-48 Highway Fog Advisory & Toll Clearance Notice"
                                            value={broadcastTitle}
                                            onChange={(e) => this.setState({ broadcastTitle: e.target.value })}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                                            Announcement Content / Message
                                        </label>
                                        <textarea
                                            rows="4"
                                            className="AdminDashboard-search-input"
                                            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                                            placeholder="Enter detailed message to appear in notification centers of drivers and passengers..."
                                            value={broadcastMessage}
                                            onChange={(e) => this.setState({ broadcastMessage: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <button type="submit" className="AdminDashboard-btn primary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
                                        <FaBullhorn /> Dispatch Live Announcement
                                    </button>
                                </form>
                            </div>

                            {/* Export Reports & Statistical Audit */}
                            <div className="AdminDashboard-card">
                                <div className="AdminDashboard-card-header">
                                    <h3 className="AdminDashboard-card-title">
                                        <FaFileDownload style={{ color: '#10b981' }} /> Operational & Financial Reports Generator
                                    </h3>
                                </div>

                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                                        Select Report Type
                                    </label>
                                    <select
                                        className="AdminDashboard-select"
                                        style={{ width: '100%' }}
                                        value={reportType}
                                        onChange={(e) => this.setState({ reportType: e.target.value })}
                                    >
                                        <option value="OPERATIONS">🚗 Ride Operations & Highway Corridor Report</option>
                                        <option value="FINANCIAL">💰 Financial Turnover & UPI Commission Audit</option>
                                        <option value="COMPLIANCE">🛡️ Safety Incidents & Complaints Summary</option>
                                        <option value="USERS">👥 User Demographics & Driver KYC Registry</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                                        Reporting Time Period
                                    </label>
                                    <select
                                        className="AdminDashboard-select"
                                        style={{ width: '100%' }}
                                        value={reportPeriod}
                                        onChange={(e) => this.setState({ reportPeriod: e.target.value })}
                                    >
                                        <option value="DAILY">Today (Last 24 Hours)</option>
                                        <option value="WEEKLY">Current Week (Last 7 Days)</option>
                                        <option value="MONTHLY">Current Month (October 2026)</option>
                                        <option value="ALL_TIME">All-Time Cumulative Audit</option>
                                    </select>
                                </div>

                                <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                                    <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '6px' }}>
                                        📊 Report Preview Metrics:
                                    </div>
                                    <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                                        • Total Records to Export: <strong>{reportType === 'OPERATIONS' ? rides.length : (reportType === 'FINANCIAL' ? transactions.length : (reportType === 'COMPLIANCE' ? complaints.length : users.length))}</strong> entries<br />
                                        • File Format: <strong>CSV (Comma-Separated Values) compatible with Excel & PowerBI</strong><br />
                                        • Encrypted Audit Timestamp: <strong>{new Date().toISOString()}</strong>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="AdminDashboard-btn success"
                                    style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                                    onClick={this.handleDownloadReport}
                                >
                                    <FaFileDownload /> Download CSV Report Now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* MODAL: USER PROFILE DETAIL                                                */}
                    {/* ========================================================================= */}
                    {selectedUser && (
                        <div className="AdminDashboard-modal-overlay" onClick={() => this.setState({ selectedUser: null })}>
                            <div className="AdminDashboard-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="AdminDashboard-modal-header">
                                    <h3 className="AdminDashboard-modal-title">
                                        <FaUsers /> User Account Profile: {selectedUser.name}
                                    </h3>
                                    <button type="button" className="AdminDashboard-modal-close" onClick={() => this.setState({ selectedUser: null })}>✕</button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.88rem', marginBottom: '16px' }}>
                                    <div><strong>User ID:</strong> {selectedUser.id}</div>
                                    <div><strong>Username:</strong> @{selectedUser.username}</div>
                                    <div><strong>Role:</strong> {selectedUser.role}</div>
                                    <div><strong>Status:</strong> <span className={`AdminDashboard-badge ${selectedUser.status.toLowerCase()}`}>{selectedUser.status}</span></div>
                                    <div><strong>Email:</strong> {selectedUser.email}</div>
                                    <div><strong>Phone:</strong> {selectedUser.phone}</div>
                                    <div><strong>Registered Date:</strong> {selectedUser.registeredDate}</div>
                                    <div><strong>Total Rides:</strong> {selectedUser.totalRides}</div>
                                    <div><strong>Average Rating:</strong> ⭐ {selectedUser.rating} / 5.0</div>
                                    <div><strong>KYC Status:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{selectedUser.kycStatus}</span></div>
                                    <div style={{ gridColumn: '1 / -1' }}><strong>Registered Vehicle:</strong> {selectedUser.vehicle}</div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" className="AdminDashboard-btn secondary" onClick={() => this.setState({ selectedUser: null })}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* MODAL: VERIFICATION DOCUMENT INSPECTION                                   */}
                    {/* ========================================================================= */}
                    {selectedVerification && (
                        <div className="AdminDashboard-modal-overlay" onClick={() => this.setState({ selectedVerification: null })}>
                            <div className="AdminDashboard-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="AdminDashboard-modal-header">
                                    <h3 className="AdminDashboard-modal-title">
                                        <FaIdCard /> Driver Document & HSRP Inspection
                                    </h3>
                                    <button type="button" className="AdminDashboard-modal-close" onClick={() => this.setState({ selectedVerification: null })}>✕</button>
                                </div>

                                <div style={{ background: '#0b1329', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong style={{ color: '#38bdf8' }}>Driver: {selectedVerification.driverName} (@{selectedVerification.driverUsername})</strong>
                                        <span className={`AdminDashboard-badge ${selectedVerification.status === 'APPROVED' ? 'verified' : (selectedVerification.status === 'PENDING_REVIEW' ? 'pending' : 'rejected')}`}>
                                            {selectedVerification.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                                        • <strong>Driving Licence:</strong> {selectedVerification.dlNumber} (Expiry: {selectedVerification.dlExpiry})<br />
                                        • <strong>Vehicle:</strong> {selectedVerification.vehicleModel}<br />
                                        • <strong>Registration No:</strong> <span style={{ background: '#ffffff', color: '#000000', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{selectedVerification.registrationNo}</span><br />
                                        • <strong>HSRP Laser Barcode:</strong> {selectedVerification.hsrpLaserCode}<br />
                                        • <strong>Insurance Validity:</strong> {selectedVerification.insuranceValidTill}<br />
                                        • <strong>PUC Validity:</strong> {selectedVerification.pucValidTill}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" className="AdminDashboard-btn secondary" onClick={() => this.setState({ selectedVerification: null })}>
                                        Close
                                    </button>
                                    {selectedVerification.status === 'PENDING_REVIEW' && (
                                        <>
                                            <button
                                                type="button"
                                                className="AdminDashboard-btn danger"
                                                onClick={() => this.handleRejectVerification(selectedVerification.id)}
                                            >
                                                <FaTimes /> Reject
                                            </button>
                                            <button
                                                type="button"
                                                className="AdminDashboard-btn success"
                                                onClick={() => this.handleApproveVerification(selectedVerification.id)}
                                            >
                                                <FaCheck /> Approve Driver
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Toast Notification */}
                    {toastMessage && (
                        <div className="AdminDashboard-toast">
                            <FaCheckCircle style={{ color: '#10b981', fontSize: '1.2rem' }} />
                            <span>{toastMessage}</span>
                        </div>
                    )}

                </div>
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        token: state.auth.token,
        userId: state.auth.userId,
        isAdmin: state.auth.userRole === 'ADMIN'
    };
};

export default withRouter(connect(mapStateToProps)(Admin));