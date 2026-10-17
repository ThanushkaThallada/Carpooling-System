import React, {Component} from 'react';
import {connect} from 'react-redux';
import './Profile.css';
import withErrorHandler from "../../hoc/withErrorHandler/withErrorHandler";
import axios from '../../axios-baseUrl';
import Car from "./Car";
import Button from "@material-ui/core/Button";
import Modal from "../../components/UI/Modal/Modal";
import Avatar from '../../assets/images/image-default.png';
import {TiUser, TiGroup} from "react-icons/ti";
import {FaEnvelopeOpen, FaPhone, FaMedal, FaUserEdit, FaQrcode} from "react-icons/fa";
import StarRatings from 'react-star-ratings';
import * as actions from "../../store/actions";
import NewCar from "./NewCar";
import { getDriverUpiId, setDriverUpiId } from "../../shared/upiService";


class Profile extends Component {
    state = {
        user: {},
        car: null,
        isToggleOn: false,
        edit: false,
        editPass: false,
        newEmail: '',
        newPassword: '',
        newPhone: '',
        src: Avatar,
        file: '',
        message: null,
        showModal: false,
        showUpiModal: false,
        driverUpi: getDriverUpiId(this.props.username),
        newUpi: ''
    };


    async componentDidMount() {

        const getAvatarResponse = await
            fetch('http://localhost:8080/images/'+this.props.username,
                {headers: {"Authorization": this.props.token}})
                .then(response => response.blob());
        if (getAvatarResponse.size > 500) {
            this.setState({
                src: URL.createObjectURL(getAvatarResponse)
            })
        }

        const getMeResponse = await
            axios.get('/users/'+this.props.username, {
                headers:
                    {"Authorization": this.props.token}
            });

        if (getMeResponse) {
            this.setState({
                user: getMeResponse.data,
                newEmail: getMeResponse.data.email,
                newPhone:getMeResponse.data.phone

            })
        }
        this.getCar()


    };

    async componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.carCreated === 'yes') {
            this.setState({message: 'Car successfully created'});
            this.getCar();
            this.props.onCarFinishCreate();
            this.toggleModal();
        }
        if (this.props.carCreated === 'error') {
            this.props.onCarFinishCreate();
            this.toggleModal();
        }
    }

    async getCar() {
        const username = this.props.username || localStorage.getItem('userId') || '';
        const userRole = this.props.userRole || localStorage.getItem('userRole') || '';
        const isDriver = (userRole === 'DRIVER') || (username && username.toLowerCase() === 'driver');

        if (!isDriver) {
            return;
        }

        try {
            const getCarResponse = await axios.get('/car/'+this.props.username, {
                headers:
                    {"Authorization": this.props.token}
            });

            if (getCarResponse) {
                this.setState({
                    car: getCarResponse.data
                })
            }
        } catch (e) {
            // Driver may not have created a car yet
        }
    }


    editHandler() {
        this.setState({
            edit: !this.state.edit
        });

    }

    editCloseHandler() {
        this.setState({
            edit: !this.state.edit
        });
    }

    editPassHandler() {
        this.setState({
            editPass: !this.state.editPass
        });

    }

    editPassCloseHandler() {
        this.setState({
            editPass: !this.state.editPass
        });
    }

    async editParamsHandler() {
        if (this.state.newEmail !== '') {
            await
                axios.patch('/users/me/email?email=' + this.state.newEmail, null, {
                    headers: {"Authorization": this.props.token}
                }).then(res => {
                    if (!res.response)
                        this.setState({message: 'Data successfully changed'});
                }).catch(err => {
                    this.setState({message: 'Request was not completed'});
                });
        }
        if (this.state.newPhone !== '') {
            await
                axios.patch('/users/me/phone?phone=' + this.state.newPhone, null, {
                    headers: {"Authorization": this.props.token}
                }).then(res => {
                    if (!res.response)
                        this.setState({message: 'Data successfully changed'});
                }).catch(err => {
                    this.setState({message: 'Request was not completed'});
                });
        }

        this.setState({
            edit: !this.state.edit,
            newEmail: '',
            newPhone: ''
        });
        await this.componentDidMount();

    }

    async editPassParamsHandler() {

        await
            axios.patch('/users/me/password?password=' + this.state.newPassword, null, {
                headers: {"Authorization": this.props.token}
            }).then(res => {
                if (!res.response)
                    this.setState({message: 'Password successfully changed'});
            }).catch(err => {
                this.setState({message: 'Request was not completed'});
            });

        this.setState({
            editPass: !this.state.editPass
        });
        await this.componentDidMount();

    }


    onFileChange = (event) => {
        this.setState({
            file: event.target.files[0]
        });
    };

    uploadFile = (event) => {
        event.preventDefault();

        if (!this.state.file) {
            this.setState({message: 'Please upload a file.'})
            return;
        }

        if (this.state.file.size >= 1000000) {
            this.setState({message: 'File size exceeds limit of 1MB.'})
            return;
        }

        let data = new FormData();
        data.append('upFile', this.state.file);

        fetch('http://localhost:8080/images', {
            method: 'POST',
            headers: {"Authorization": this.props.token},
            body: data
        }).then(response => {
            if (!response.response)
                this.setState({message: 'Successfully uploaded file'});
            this.componentDidMount();
        }).catch(err => {
            this.setState({message: 'Request was not completed'});
        });
    };


    changedEmail = (event) => {

        this.setState({newEmail: event.target.value});
    };

    changedPhone = (event) => {

        this.setState({newPhone: event.target.value});
    };

    changedPassword = (event) => {
        this.setState({newPassword: event.target.value});

    };

    saveUpiHandler = () => {
        try {
            const saved = setDriverUpiId(this.props.username, this.state.newUpi);
            this.setState({
                driverUpi: saved,
                showUpiModal: false,
                message: `✅ Driver UPI ID successfully updated to ${saved}`
            });
        } catch (e) {
            this.setState({ message: e.message || 'Please enter a valid UPI ID (e.g., driver@oksbi)' });
        }
    };

    errorConfirmedHandler = () => {
        this.setState({
            message: null
        });
    };

    toggleModal() {
        this.setState({
            showModal: !this.state.showModal
        })
    }

    showMessage = (message) => {
        this.setState({
            message: message
        });
    };

    render() {

        let responseMessage = (
            <Modal
                show={this.state.message}
                modalClosed={this.errorConfirmedHandler}>
                {this.state.message ? this.state.message : null}
            </Modal>
        );
        const username = this.props.username || localStorage.getItem('userId') || '';
        const userRole = this.props.userRole || localStorage.getItem('userRole') || '';
        const isDriver = (userRole === 'DRIVER') || (username && username.toLowerCase() === 'driver');

        let buttonCreateCar = null;
        let car = null;
        if (isDriver) {
            if (!this.state.car) {
                buttonCreateCar = (
                    <div className="Car">
                        <Button onClick={() => this.toggleModal()}><h1>+CREATE CAR</h1></Button>
                    </div>
                );
            } else {
                car = (
                    <div>
                        <Car
                            car={this.state.car}
                            showMessage={this.showMessage}
                        />
                    </div>
                );
            }
        }


        const user = this.state.user || {};
        const driverRatingVal = (user && typeof user.ratingAsDriver === 'number')
            ? user.ratingAsDriver
            : (parseFloat(user.ratingAsDriver) || 0.0);

        const passengerRatingVal = (user && typeof user.ratingAsPassenger === 'number')
            ? user.ratingAsPassenger
            : (parseFloat(user.ratingAsPassenger) || 0.0);

        return (
            <div>
                <h1 className="head">
                    USER INFORMATION
                </h1>
                <Modal show={this.state.edit} modalClosed={() => this.editCloseHandler()}>
                    <div className="cont">
                        <label>Email</label>
                        <input className="input" type="text" onChange={event => this.changedEmail(event)}
                               value={this.state.newEmail}/>
                        <label>Phone</label>
                        <input className="input" type="text" onChange={event => this.changedPhone(event)}
                               value={this.state.newPhone}/>
                        <Button className="input save" onClick={() => this.editParamsHandler()}><h2>SAVE</h2></Button>
                    </div>
                </Modal>


                <Modal show={this.state.editPass} modalClosed={() => this.editPassCloseHandler()}>
                    <label>Password</label>
                    <input className="input" type="text" onChange={event => this.changedPassword(event)}
                           value={this.state.newPassword}/>
                    <Button className="input save" onClick={() => this.editPassParamsHandler()}><h2>SAVE</h2></Button>
                </Modal>

                {isDriver && (
                    <Modal show={this.state.showModal} modalClosed={() => this.toggleModal()}>
                        <NewCar
                            showModal={this.state.showModal}
                        />
                    </Modal>
                )}

                {isDriver && (
                    <Modal show={this.state.showUpiModal} modalClosed={() => this.setState({ showUpiModal: false })}>
                        <div className="cont">
                            <h2 style={{ color: '#38bdf8', marginBottom: '14px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaQrcode /> Configure Receiving UPI ID
                            </h2>
                            <p style={{ fontSize: '0.84rem', color: '#cbd5e1', marginBottom: '10px' }}>
                                Enter your official UPI ID (VPA) where passenger payments will be received when they scan your QR code.
                            </p>
                            <label>UPI ID (e.g. driver@oksbi, alex@ybl, 9876543210@paytm):</label>
                            <input
                                className="input"
                                type="text"
                                onChange={event => this.setState({ newUpi: event.target.value })}
                                value={this.state.newUpi}
                                placeholder="username@bank"
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                <Button className="input save" onClick={this.saveUpiHandler} style={{ flex: 1 }}>
                                    <h2>SAVE UPI ID</h2>
                                </Button>
                                <Button className="input" onClick={() => this.setState({ showUpiModal: false })} style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>
                                    <h2>CANCEL</h2>
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}

                <div>
                    <div className="Profile">
                        {/* Avatar Column */}
                        <div className="Profile-avatar-col">
                            <img src={this.state.src} alt="User Avatar" />
                            <div style={{ marginTop: '4px', marginBottom: '8px', fontSize: '0.75rem', width: '100%' }}>
                                <input 
                                    onChange={this.onFileChange} 
                                    type="file" 
                                    style={{ fontSize: '0.72rem', maxWidth: '160px', color: '#94a3b8' }} 
                                />
                                <button 
                                    onClick={this.uploadFile}
                                    style={{
                                        background: '#38bdf8',
                                        color: '#0f172a',
                                        border: 'none',
                                        padding: '4px 12px',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        marginTop: '6px'
                                    }}
                                >
                                    Upload
                                </button>
                            </div>
                            <button className="edit-btn" onClick={() => this.editPassHandler()}>
                                <FaUserEdit /> Change Password
                            </button>
                        </div>

                        {/* User Details Column */}
                        <div className="Profile-info-col">
                            <div>
                                <div className="Profile-info-row">
                                    <TiUser style={{ color: '#38bdf8', fontSize: '1.2rem' }} />
                                    <strong>Name:</strong>
                                    <span className="header">{user.firstName || ''} {user.lastName || ''}</span>
                                </div>
                                <div className="Profile-info-row">
                                    <TiGroup style={{ color: '#38bdf8', fontSize: '1.2rem' }} />
                                    <strong>Username:</strong>
                                    <span className="header">@{user.username || this.props.username}</span>
                                </div>
                                <div className="Profile-info-row">
                                    <FaEnvelopeOpen style={{ color: '#38bdf8', fontSize: '1.1rem' }} />
                                    <strong>Email:</strong>
                                    <span className="header" style={{ wordBreak: 'break-all' }}>{user.email || 'Not provided'}</span>
                                </div>
                                <div className="Profile-info-row">
                                    <FaPhone style={{ color: '#38bdf8', fontSize: '1.1rem' }} />
                                    <strong>Phone:</strong>
                                    <span className="header">{user.phone || 'Not provided'}</span>
                                </div>
                                {isDriver && (
                                    <div className="Profile-info-row" style={{ alignItems: 'center' }}>
                                        <FaQrcode style={{ color: '#10b981', fontSize: '1.1rem' }} />
                                        <strong>Receiving UPI:</strong>
                                        <span className="header" style={{ color: '#fef08a' }}>{this.state.driverUpi || 'driver@ybl'}</span>
                                        <button
                                            type="button"
                                            onClick={() => this.setState({ showUpiModal: true, newUpi: this.state.driverUpi || 'driver@ybl' })}
                                            style={{
                                                marginLeft: '8px',
                                                background: 'rgba(56, 189, 248, 0.2)',
                                                border: '1px solid #38bdf8',
                                                color: '#38bdf8',
                                                borderRadius: '6px',
                                                padding: '3px 8px',
                                                fontSize: '0.74rem',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Configure UPI
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button className="edit-btn" onClick={() => this.editHandler()}>
                                <FaUserEdit /> Edit Profile
                            </button>
                        </div>

                        {/* Ratings Column */}
                        <div className="Profile-ratings-col">
                            <div className="rating-box">
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                                    <FaMedal style={{ color: '#fbbf24', marginRight: '6px' }} /> Rating as Driver
                                </div>
                                <StarRatings
                                    rating={driverRatingVal}
                                    starRatedColor="#fbbf24"
                                    changeRating={this.changeRating}
                                    numberOfStars={5}
                                    name='rating'
                                    starDimension="20px"
                                    starSpacing="3px"
                                />
                                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fbbf24', marginTop: '4px' }}>
                                    {driverRatingVal.toFixed(1)} / 5.0
                                </div>
                            </div>

                            <div className="rating-box">
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                                    <FaMedal style={{ color: '#fbbf24', marginRight: '6px' }} /> Rating as Passenger
                                </div>
                                <StarRatings
                                    rating={passengerRatingVal}
                                    starRatedColor="#fbbf24"
                                    changeRating={this.changeRating}
                                    numberOfStars={5}
                                    name='rating'
                                    starDimension="20px"
                                    starSpacing="3px"
                                />
                                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fbbf24', marginTop: '4px' }}>
                                    {passengerRatingVal.toFixed(1)} / 5.0
                                </div>
                            </div>
                        </div>
                    </div>
                    {car}
                    {buttonCreateCar}
                    {responseMessage}
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        loading: state.trip.loading,
        token: state.auth.token,
        carCreated: state.car.carCreated,
        username: state.auth.userId,
        userRole: state.auth.userRole
    }
};

const mapDispatchToProps = dispatch => {
    return {
        onCreateCar: (create, token) => dispatch(actions.createCar(create, token)),
        onCarFinishCreate: () => dispatch(actions.carFinishCreate())
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(withErrorHandler(Profile, axios));