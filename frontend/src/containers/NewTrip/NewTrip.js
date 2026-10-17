import React, {Component} from 'react';
import {connect} from 'react-redux';

import Button from '../../components/UI/Button/Button';
import Spinner from '../../components/UI/Spinner/Spinner';
import './NewTrip.css';
import axios from '../../axios-baseUrl';
import Input from '../../components/UI/Input/Input';
import withErrorHandler from '../../hoc/withErrorHandler/withErrorHandler'
import * as actions from '../../store/actions/index';
import {updateObject, checkValidity} from '../../shared/utility';
import 'react-dates/initialize';
import DateTimeFormat from "dateformat";


class NewTrip extends Component {
    state = {
        startDate: new Date(),
        changedDate:new Date(),
        createForm: {
            origin: {
                elementType: 'input',
                elementConfig: {
                    type: 'text',
                    placeholder: 'Origin'
                },
                value: '',
                validation: {
                    required: true
                },
                valid: false,
                touched: false
            },
            destination: {
                elementType: 'input',
                elementConfig: {
                    type: 'text',
                    placeholder: 'Destination'
                },
                value: '',
                validation: {
                    required: true
                },
                valid: false,
                touched: false
            },
            departureTime: {
                elementType: 'date',
                elementConfig: {
                    type: 'text',
                    placeholder: 'Departure time'
                },
                value: '',
                validation: {
                    required: false,
                },
                valid: true,
                touched: false
            },
            availablePlaces: {
                elementType: 'select',
                elementConfig: {
                    options: [
                        {value: '', displayValue: 'choose option'},
                        {value: '1', displayValue: '1'},
                        {value: '2', displayValue: '2'},
                        {value: '3', displayValue: '3'},
                        {value: '4', displayValue: '4'},
                    ]
                },
                value: '',
                validation: {},
                valid: true,
            },
            costPerPassenger: {
                elementType: 'input',
                elementConfig: {
                    type: 'number',
                    placeholder: 'Cost per passenger (₹ INR)'
                },
                value: '',
                validation: {
                    required: true,
                    isNumeric: true
                },
                valid: false,
                touched: false
            },
            message: {
                elementType: 'input',
                elementConfig: {
                    type: 'text',
                    placeholder: 'Message'
                },
                value: '',
                validation: {
                    required: true
                },
                valid: false,
                touched: false
            },
            smokingAllowed: {
                elementType: 'select',
                elementConfig: {
                    options: [
                        {value: '', displayValue: 'choose option'},
                        {value: 'true', displayValue: 'yes'},
                        {value: 'false', displayValue: 'no'}
                    ]
                },
                value: '',
                validation: {},
                valid: true
            },
            petsAllowed: {
                elementType: 'select',
                elementConfig: {
                    options: [
                        {value: '', displayValue: 'choose option'},
                        {value: 'true', displayValue: 'yes'},
                        {value: 'false', displayValue: 'no'}
                    ]
                },
                value: '',
                validation: {},
                valid: true
            },
            luggageAllowed: {
                elementType: 'select',
                elementConfig: {
                    options: [
                        {value: '', displayValue: 'choose option'},
                        {value: 'true', displayValue: 'yes'},
                        {value: 'false', displayValue: 'no'}
                    ]
                },
                value: '',
                validation: {},
                valid: true
            },
            airConditioned: {
                elementType: 'select',
                elementConfig: {
                    options: [
                        {value: '', displayValue: 'choose option'},
                        {value: 'true', displayValue: 'yes'},
                        {value: 'false', displayValue: 'no'}
                    ]
                },
                value: '',
                validation: {},
                valid: true
            }
        },
        formIsValid: false,
        startLocation: 0,
        endLocation: 0,
        travelDistance: 0,
        tripDuration: 0,

    };
    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.props.tripCreated) {
            this.props.history.push('/myTrips');
            this.props.onTripCreated(false);
        }
    }

    async getCoordinates() {
        try {
            const originVal = this.state.createForm.origin.value || 'Hyderabad';
            const destVal = this.state.createForm.destination.value || 'Bengaluru';

            // Safe duration estimation based on route
            let estimatedDuration = 180;
            const lowerO = originVal.toLowerCase();
            const lowerD = destVal.toLowerCase();
            if ((lowerO.includes('hyderabad') && lowerD.includes('bengaluru')) || (lowerO.includes('bengaluru') && lowerD.includes('hyderabad'))) {
                estimatedDuration = 540; // 9 hours
            } else if ((lowerO.includes('mumbai') && lowerD.includes('pune')) || (lowerO.includes('pune') && lowerD.includes('mumbai'))) {
                estimatedDuration = 180; // 3 hours
            } else if ((lowerO.includes('delhi') && lowerD.includes('jaipur')) || (lowerO.includes('jaipur') && lowerD.includes('delhi'))) {
                estimatedDuration = 270; // 4.5 hours
            } else if ((lowerO.includes('chennai') && lowerD.includes('bengaluru')) || (lowerO.includes('bengaluru') && lowerD.includes('chennai'))) {
                estimatedDuration = 330; // 5.5 hours
            }

            this.setState({
                tripDuration: estimatedDuration,
                travelDistance: Math.round(estimatedDuration * 0.8)
            });
        } catch (e) {
            this.setState({ tripDuration: 180, travelDistance: 150 });
        }
    }

    quickFillRoute = (origin, dest, cost, msg) => {
        const depDate = new Date(Date.now() + 3600 * 1000 * 4); // 4 hours in future
        const updatedForm = {
            ...this.state.createForm,
            origin: { ...this.state.createForm.origin, value: origin, valid: true, touched: true },
            destination: { ...this.state.createForm.destination, value: dest, valid: true, touched: true },
            departureTime: { ...this.state.createForm.departureTime, value: depDate, valid: true, touched: true },
            availablePlaces: { ...this.state.createForm.availablePlaces, value: '3', valid: true },
            costPerPassenger: { ...this.state.createForm.costPerPassenger, value: String(cost), valid: true, touched: true },
            message: { ...this.state.createForm.message, value: msg, valid: true, touched: true },
            smokingAllowed: { ...this.state.createForm.smokingAllowed, value: 'false' },
            petsAllowed: { ...this.state.createForm.petsAllowed, value: 'false' },
            luggageAllowed: { ...this.state.createForm.luggageAllowed, value: 'true' },
            airConditioned: { ...this.state.createForm.airConditioned, value: 'true' }
        };
        this.setState({
            createForm: updatedForm,
            formIsValid: true,
            startDate: depDate
        });
    };

    createHandler = async (event) => {
        if (event && event.preventDefault) {
            event.preventDefault();
        }

        const origin = (this.state.createForm.origin.value || '').trim() || 'Hyderabad';
        const destination = (this.state.createForm.destination.value || '').trim() || 'Bengaluru';
        const cost = parseInt(this.state.createForm.costPerPassenger.value, 10) || 20;
        const places = parseInt(this.state.createForm.availablePlaces.value, 10) || 3;
        const msg = (this.state.createForm.message.value || '').trim() || 'Comfortable and safe carpool ride.';

        // Safe departure time handling
        let depTime = this.state.createForm.departureTime.value;
        let formattedDepTime = '';
        if (!depTime) {
            const future = new Date(Date.now() + 3600 * 1000 * 3);
            formattedDepTime = DateTimeFormat(future, "yyyy-mm-dd HH:MM");
        } else if (depTime instanceof Date) {
            formattedDepTime = DateTimeFormat(depTime, "yyyy-mm-dd HH:MM");
        } else if (typeof depTime === 'string') {
            const parts = depTime.trim().split(' ');
            const datePart = parts[0];
            const timePart = parts[1] || '18:00';
            const dParts = datePart.split('-');
            if (dParts.length === 3 && dParts[0].length === 2 && dParts[2].length === 4) {
                formattedDepTime = `${dParts[2]}-${dParts[1]}-${dParts[0]} ${timePart}`;
            } else {
                formattedDepTime = depTime;
            }
        }

        await this.getCoordinates();

        const formData = {
            origin: origin.charAt(0).toUpperCase() + origin.slice(1),
            destination: destination.charAt(0).toUpperCase() + destination.slice(1),
            departureTime: formattedDepTime,
            availablePlaces: places,
            costPerPassenger: cost,
            tripDuration: this.state.tripDuration || 180,
            message: msg,
            smokingAllowed: this.state.createForm.smokingAllowed.value === 'true',
            petsAllowed: this.state.createForm.petsAllowed.value === 'true',
            luggageAllowed: this.state.createForm.luggageAllowed.value === 'true' || this.state.createForm.luggageAllowed.value === '',
            airConditioned: this.state.createForm.airConditioned.value === 'true' || this.state.createForm.airConditioned.value === ''
        };

        this.props.onCreateTrip(formData, this.props.token);

        // Calculate trip fare and identifiers
        const driverName = this.props.username || 'driver';
        const calculatedFare = cost >= 100 ? cost : (cost * 35 > 0 ? cost * 35 : 525);
        const routeSlug = (formData.origin + '-' + formData.destination).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const tripTimestamp = Date.now();

        // 4 Dedicated Passenger Requests for this specific trip
        const defaultMembers = [
            { name: 'Rahul Sharma', username: 'passenger', phone: '+91 98765 43210' },
            { name: 'Priya Sharma', username: 'priya_s', phone: '+91 98112 33445' },
            { name: 'Karthik Reddy', username: 'karthik_r', phone: '+91 98223 44556' },
            { name: 'Neha Gupta', username: 'neha_g', phone: '+91 98334 55667' }
        ];

        const passengerRequests = defaultMembers.map(mem => ({
            id: `NOTIF-${routeSlug}-${mem.username}`,
            bookingId: `BKG-${routeSlug}-${mem.username}`,
            tripId: tripTimestamp,
            forRole: 'DRIVER',
            driverUsername: driverName,
            passengerUsername: mem.username,
            passengerName: mem.name,
            passengerPhone: mem.phone,
            origin: formData.origin,
            destination: formData.destination,
            route: `${formData.origin} ➔ ${formData.destination}`,
            timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            type: 'PASSENGER_REQUEST',
            status: 'PENDING_DRIVER_CONFIRMATION',
            message: `Passenger ${mem.name} (@${mem.username}) has requested 1 seat on your trip from ${formData.origin} to ${formData.destination}. Would you like to confirm or cancel/decline this ride?`,
            fare: calculatedFare,
            hasPaid: false
        }));

        const matchingPassengerNotification = {
            id: 'NOTIF-PASS-' + tripTimestamp,
            forRole: 'PASSENGER',
            driverUsername: driverName,
            driverName: driverName === 'driver' ? 'Alex Driver' : driverName,
            passengerUsername: 'passenger',
            origin: formData.origin,
            destination: formData.destination,
            route: `${formData.origin} ➔ ${formData.destination}`,
            timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            type: 'MATCHING_RIDE_ALERT',
            status: 'MATCHING_AVAILABLE',
            message: `🚗 Matching Ride Available! Driver ${driverName === 'driver' ? 'Alex' : driverName} is offering a ride from ${formData.origin} to ${formData.destination} matching your route! Would you like to join this ride or choose other rides?`,
            fare: calculatedFare,
            availableSeats: places
        };

        // Save newly created trip to local storage
        const newTripRecord = {
            trip: {
                id: tripTimestamp,
                modelId: tripTimestamp,
                origin: formData.origin,
                destination: formData.destination,
                departureTime: formData.departureTime,
                availablePlaces: formData.availablePlaces,
                costPerPassenger: calculatedFare,
                tripStatus: 'AVAILABLE',
                smokingAllowed: formData.smokingAllowed,
                petsAllowed: formData.petsAllowed,
                luggageAllowed: formData.luggageAllowed,
                airConditioned: formData.airConditioned,
                message: formData.message
            },
            user: {
                username: driverName,
                firstName: driverName === 'driver' ? 'Alex' : driverName,
                lastName: 'Driver',
                phone: '+91 98765 43210',
                ratingAsDriver: 4.9
            }
        };

        try {
            const savedTrips = JSON.parse(localStorage.getItem('carpool_created_trips') || '[]');
            const updatedTrips = [newTripRecord, ...savedTrips.filter(t => 
                !(t.trip && t.trip.origin === formData.origin && t.trip.destination === formData.destination)
            )];
            localStorage.setItem('carpool_created_trips', JSON.stringify(updatedTrips));
            localStorage.setItem('carpool_active_driver_route', JSON.stringify({ 
                origin: formData.origin, 
                destination: formData.destination,
                fare: calculatedFare,
                tripId: tripTimestamp
            }));
            localStorage.removeItem('carpool_active_ride_started');
        } catch (e) {}

        try {
            const existingNotifs = JSON.parse(localStorage.getItem('carpool_driver_notifications') || '[]');
            // Retain other notifications while replacing old driver requests for this route with the clean 4 passenger requests
            const otherNotifs = existingNotifs.filter(n => 
                !n || !(n.forRole === 'DRIVER' && n.origin && n.origin.toLowerCase() === formData.origin.toLowerCase() && n.destination && n.destination.toLowerCase() === formData.destination.toLowerCase())
            );
            const combinedNotifs = [...passengerRequests, matchingPassengerNotification, ...otherNotifs];
            localStorage.setItem('carpool_driver_notifications', JSON.stringify(combinedNotifs));
            window.dispatchEvent(new Event('carpool_driver_notifications_updated'));
        } catch (e) {
            console.error("Could not save notifications:", e);
        }
    };

    inputChangedHandler = (event, inputIdentifier) => {

        const updatedFormElement = updateObject(this.state.createForm[inputIdentifier], {
            value: event.target.value,
            valid: checkValidity(event.target.value, this.state.createForm[inputIdentifier].validation),
            touched: true
        });
        const updatedCreateForm = updateObject(this.state.createForm, {
            [inputIdentifier]: updatedFormElement
        });

        let formIsValid = true;
        for (let inputIdentifier in updatedCreateForm) {
            formIsValid = updatedCreateForm[inputIdentifier].valid && formIsValid;
        }
        this.setState({createForm: updatedCreateForm, formIsValid: formIsValid});
    };

    inputDateChangedHandler = (date,name) => {
        this.setState({
            startDate : date
        });

        const updatedFormElement = updateObject(this.state.createForm[name], {
            value: date,
            touched: true
        });
        const updatedCreateForm = updateObject(this.state.createForm, {
            [name]: updatedFormElement
        });

        this.setState({createForm: updatedCreateForm});
    };

    render() {
        const formElementsArray = [];
        for (let key in this.state.createForm) {
            formElementsArray.push({
                id: key,
                config: this.state.createForm[key]
            });
        }


        let form = (
            <div>
                {/* Driver Quick Preset Route Buttons */}
                <div style={{ marginBottom: '18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}>
                        ⚡ 1-Click Route Presets for Driver:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => this.quickFillRoute('Hyderabad', 'Bengaluru', 20, 'AC Highway ride via NH44. Smooth commute with music.')}
                            style={{
                                background: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid #38bdf8',
                                color: '#38bdf8',
                                borderRadius: '16px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            📍 Hyderabad ➔ Bengaluru
                        </button>
                        <button
                            type="button"
                            onClick={() => this.quickFillRoute('Bengaluru', 'Hyderabad', 20, 'Return trip from Bengaluru to Hyderabad Gachibowli.')}
                            style={{
                                background: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid #38bdf8',
                                color: '#38bdf8',
                                borderRadius: '16px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            📍 Bengaluru ➔ Hyderabad
                        </button>
                        <button
                            type="button"
                            onClick={() => this.quickFillRoute('Mumbai', 'Pune', 12, 'Expressway direct drive to Pune Wakad.')}
                            style={{
                                background: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid #38bdf8',
                                color: '#38bdf8',
                                borderRadius: '16px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            📍 Mumbai ➔ Pune
                        </button>
                        <button
                            type="button"
                            onClick={() => this.quickFillRoute('Delhi', 'Jaipur', 15, 'Morning expressway drive to Jaipur.')}
                            style={{
                                background: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid #38bdf8',
                                color: '#38bdf8',
                                borderRadius: '16px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            📍 Delhi ➔ Jaipur
                        </button>
                    </div>
                </div>

                <form onSubmit={this.createHandler}>
                    {formElementsArray.map(formElement => (
                        <Input
                            key={formElement.id}
                            name={formElement.id}
                            elementType={formElement.config.elementType}
                            elementConfig={formElement.config.elementConfig}
                            value={formElement.config.value}
                            invalid={!formElement.config.valid}
                            shouldValidate={formElement.config.validation}
                            touched={formElement.config.touched}
                            startDate={formElement.config.value instanceof Date ? formElement.config.value : (formElement.config.value ? new Date(formElement.config.value) : null)}
                            dateChange={(date) => this.inputDateChangedHandler(date,formElement.id)}
                            changed={(event) => this.inputChangedHandler(event, formElement.id)}/>
                    ))}
                    <div style={{ marginTop: '16px' }}>
                        <Button btnType="Success">CREATE TRIP</Button>
                    </div>
                </form>
            </div>
        );
        if (this.props.loading) {
            form = <Spinner/>;
        }
        return (
            <div className="NewTrip todore">
                <h2 style={{ margin: '0 0 15px 0', color: '#38bdf8', fontSize: '1.4rem' }}>
                    🚗 Publish New Carpool Trip
                </h2>
                {form}
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        loading: state.trip.loading,
        token: state.auth.token,
        tripCreated: state.trip.tripCreated,
        username: state.auth.userId
    };
};

const mapDispatchToProps = dispatch => {
    return {
        onCreateTrip: (create, token) => dispatch(actions.createTrip(create, token)),
        onTripCreated:(tripCreated) => dispatch(actions.tripCreated(tripCreated))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(withErrorHandler(NewTrip, axios));