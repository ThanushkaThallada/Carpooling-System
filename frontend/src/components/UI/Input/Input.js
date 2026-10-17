import React from 'react';

import './Input.css';
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

const friendlyLabels = {
    origin: '📍 Departure City (From)',
    destination: '🏁 Destination City (To)',
    departureTime: '📅 Departure Date & Time',
    availablePlaces: '👥 Available Seats',
    costPerPassenger: '₹ Fare per Seat (INR)',
    message: '💬 Ride Message / Driver Note',
    smokingAllowed: '🚬 Smoking Preference',
    petsAllowed: '🐾 Pets Allowed?',
    luggageAllowed: '🧳 Luggage Space',
    airConditioned: '❄️ Air Conditioned (AC)?',
    username: '👤 Username',
    firstName: '👤 First Name',
    lastName: '👤 Last Name',
    email: '✉️ Email Address',
    phone: '📞 Phone Number',
    password: '🔒 Password',
    oldPassword: '🔑 Current Password',
    newPassword: '🔑 New Password',
    brand: '🚗 Vehicle Brand / Make',
    model: '🚘 Vehicle Model',
    color: '🎨 Vehicle Color',
    firstRegistration: '📅 Registration Year'
};

const formatLabel = (name, customLabel) => {
    if (customLabel) return customLabel;
    if (friendlyLabels[name]) return friendlyLabels[name];
    if (!name) return '';
    // Format camelCase to Title Case
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const input = ( props ) => {

    let inputElement = null;
    const inputClasses = ['InputElement'];

    if (props.invalid && props.shouldValidate && props.touched) {
        inputClasses.push('Invalid');
    }

    switch ( props.elementType ) {
        case ( 'input' ):
            inputElement = <input
                className={inputClasses.join(' ')}
                {...props.elementConfig}
                value={props.value}
                onChange={props.changed} />;
            break;
        case ( 'textarea' ):
            inputElement = <textarea
                className={inputClasses.join(' ')}
                {...props.elementConfig}
                value={props.value}
                onChange={props.changed} />;
            break;
        case ( 'date' ):
            const dateValue = (props.value instanceof Date)
                ? props.value
                : (props.value ? new Date(props.value) : (props.startDate instanceof Date ? props.startDate : null));
            inputElement = (
                <DatePicker 
                    className={inputClasses.join(' ')}
                    placeholderText={props.elementConfig && props.elementConfig.placeholder ? props.elementConfig.placeholder : "Select travel date & time"}
                    selected={dateValue}
                    onChange={props.dateChange}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="dd-MM-yyyy HH:mm"
                    timeCaption="time"
                    isClearable
                />
            );
            break;
        case ( 'select' ):
            inputElement = (
                <div style={{ position: 'relative', width: '100%' }}>
                    <select
                        className={inputClasses.join(' ')}
                        value={props.value}
                        onChange={props.changed}
                        style={{
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            paddingRight: '36px',
                            cursor: 'pointer'
                        }}>
                        {props.elementConfig.options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.displayValue}
                            </option>
                        ))}
                    </select>
                    <span style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#38bdf8',
                        fontSize: '0.85rem'
                    }}>
                        ▼
                    </span>
                </div>
            );
            break;
        default:
            inputElement = <input
                className={inputClasses.join(' ')}
                {...props.elementConfig}
                value={props.value}
                onChange={props.changed} />;
    }

    const displayLabel = formatLabel(props.name, props.label);

    return (
        <div className="Input">
            {displayLabel && (
                <label className="Label">{displayLabel}</label>
            )}
            <div style={{ textAlign: 'left', width: '100%' }}>
                {inputElement}
            </div>
        </div>
    );

};

export default input;