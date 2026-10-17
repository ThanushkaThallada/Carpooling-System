import React, { useState } from 'react';
import './UpiQrCode.css';
import { FaQrcode, FaCopy, FaCheck, FaExternalLinkAlt, FaMobileAlt } from 'react-icons/fa';
import { generateUpiIntentUrl } from '../../shared/upiService';

const UpiQrCode = ({
    vpa = 'driver@ybl',
    payeeName = 'Alex Driver',
    amount = 700,
    route = 'Highway Route',
    passengerName = 'Passenger',
    bookingId = '',
    title = 'DRIVER UPI PAYMENT QR CODE',
    subtitle = '',
    showControls = true
}) => {
    const [copied, setCopied] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const safeAmount = Number(amount || 0);
    const upiNote = `Carpooling Fare ${route}`.substring(0, 40);
    const upiUri = generateUpiIntentUrl({
        vpa,
        payeeName,
        amount: safeAmount,
        transactionNote: upiNote,
        transactionRef: bookingId || ('BKG' + Date.now())
    });

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}&ecc=M&margin=1`;

    const handleCopy = () => {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(vpa);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="UpiQrCode-card">
            <div className="UpiQrCode-header">
                <FaQrcode /> {title}
            </div>

            <div className="UpiQrCode-route">
                {subtitle || (
                    <>
                        Payee: <strong>{payeeName}</strong> | Route: <strong>{route}</strong>
                    </>
                )}
            </div>

            {/* Live Scannable QR Code Image */}
            <div className="UpiQrCode-image-wrapper">
                <img
                    src={qrImageUrl}
                    alt={`UPI QR Code for ${vpa}`}
                    className="UpiQrCode-img"
                    onLoad={() => setImgLoaded(true)}
                />
            </div>

            {/* Fare Breakdown Row */}
            <div className="UpiQrCode-fare-row">
                <span style={{ color: '#94a3b8' }}>Agreed Fare:</span>
                <span style={{ color: '#10b981', fontWeight: '900', fontSize: '1.15rem' }}>
                    ₹{safeAmount}
                </span>
            </div>

            {/* Driver UPI Pill */}
            <div className="UpiQrCode-vpa-pill">
                <span>
                    UPI: <strong>{vpa}</strong>
                </span>
                <button
                    type="button"
                    className="UpiQrCode-copy-btn"
                    onClick={handleCopy}
                    title="Copy UPI ID"
                >
                    {copied ? <><FaCheck /> Copied</> : <><FaCopy /> Copy</>}
                </button>
            </div>

            {showControls && (
                <div>
                    <a
                        href={upiUri}
                        className="UpiQrCode-intent-btn"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <FaMobileAlt style={{ marginRight: '6px' }} /> Open in UPI App (GPay / PhonePe / Paytm) <FaExternalLinkAlt style={{ fontSize: '0.72rem', marginLeft: '4px' }} />
                    </a>

                    <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#64748b', lineHeight: '1.4' }}>
                        Scan using any UPI camera or tap the button above on mobile. Amount & Payee are auto-locked.
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpiQrCode;
