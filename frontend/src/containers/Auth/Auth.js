import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';

import Input from '../../components/UI/Input/Input';
import Button from '../../components/UI/Button/Button';
import Spinner from '../../components/UI/Spinner/Spinner';
import './Auth.css';
import * as actions from '../../store/actions';
import { updateObject, checkValidity } from '../../shared/utility';
import { FaUser, FaCar, FaUserShield, FaKey } from 'react-icons/fa';

class Auth extends Component {
    state = {
        controlsLogin: {
            username: {
                elementType: 'input',
                elementConfig: {
                    type: 'username',
                    placeholder: 'Username'
                },
                value: '',
                validation: {
                    required: true,
                },
                valid: false,
                touched: false
            },
            password: {
                elementType: 'input',
                elementConfig: {
                    type: 'password',
                    placeholder: 'Password'
                },
                value: '',
                validation: {
                    required: true,
                    minLength: 6
                },
                valid: false,
                touched: false
            }
        },
        controlsSignUp: {
            username: {
                elementType: 'input',
                elementConfig: {
                    type: 'username',
                    placeholder: 'Username'
                },
                value: '',
                validation: {
                    required: true,
                },
                valid: false,
                touched: false
            },
            password: {
                elementType: 'input',
                elementConfig: {
                    type: 'password',
                    placeholder: 'Password'
                },
                value: '',
                validation: {
                    required: true,
                    minLength: 6
                },
                valid: false,
                touched: false
            },
            firstName: {
                elementType: 'input',
                elementConfig: {
                    type: 'firstName',
                    placeholder: 'First name'
                },
                value: '',
                validation: {
                    required: true,
                },
                valid: false,
                touched: false
            },
            lastName: {
                elementType: 'input',
                elementConfig: {
                    type: 'lastName',
                    placeholder: 'Last name'
                },
                value: '',
                validation: {
                    required: true,
                },
                valid: false,
                touched: false
            },
            email: {
                elementType: 'input',
                elementConfig: {
                    type: 'email',
                    placeholder: 'Email'
                },
                value: '',
                validation: {
                    required: true,
                    isEmail: true
                },
                valid: false,
                touched: false
            },
            phone: {
                elementType: 'input',
                elementConfig: {
                    type: 'phone',
                    placeholder: 'Phone'
                },
                value: '',
                validation: {
                    required: true,
                    isNumeric: true,
                },
                valid: false,
                touched: false
            },
            role: {
                elementType: 'select',
                elementConfig: {
                    options: [
                        { value: 'driver', displayValue: "I'm a Driver" },
                        { value: 'passenger', displayValue: "I'm a Passenger" }
                    ]
                },
                value: 'driver',
                validation: {},
                valid: true,
                touched: false
            }
        },
        isSignup: false
    };

    componentDidMount () {
        if (this.props.authRedirectPath !== '/' ) {
            this.props.onSetAuthRedirectPath();
        }
    }

    fillDemoCredentials = (username, password) => {
        const updatedControls = updateObject(this.state.controlsLogin, {
            username: updateObject(this.state.controlsLogin.username, {
                value: username,
                valid: true,
                touched: true
            }),
            password: updateObject(this.state.controlsLogin.password, {
                value: password,
                valid: true,
                touched: true
            })
        });
        this.setState({ controlsLogin: updatedControls, isSignup: false });
    };

    inputChangedHandlerLogin = ( event, controlName ) => {
        const updatedControls = updateObject( this.state.controlsLogin, {
            [controlName]: updateObject( this.state.controlsLogin[controlName], {
                value: event.target.value,
                valid: checkValidity( event.target.value, this.state.controlsLogin[controlName].validation ),
                touched: true
            } )
        } );
        this.setState( { controlsLogin: updatedControls } );
    };

    inputChangedHandlerSignUp = ( event, controlName ) => {
        const updatedControls = updateObject( this.state.controlsSignUp, {
            [controlName]: updateObject( this.state.controlsSignUp[controlName], {
                value: event.target.value,
                valid: checkValidity( event.target.value, this.state.controlsSignUp[controlName].validation ),
                touched: true
            } )
        } );
        this.setState( { controlsSignUp: updatedControls } );
    };

    submitHandler = ( event ) => {
        event.preventDefault();
        if(this.state.isSignup) {
            const role = (this.state.controlsSignUp.role && this.state.controlsSignUp.role.value) || 'driver';
            const username = this.state.controlsSignUp.username.value;
            if (username) {
                localStorage.setItem('user_role_' + username.toLowerCase(), role.toUpperCase());
                localStorage.setItem('userRole', role.toUpperCase());
            }
            this.props.onAuth(this.state.controlsSignUp.username.value,
                this.state.controlsSignUp.password.value,
                this.state.isSignup,
                this.state.controlsSignUp.firstName.value,
                this.state.controlsSignUp.lastName.value,
                this.state.controlsSignUp.email.value,
                this.state.controlsSignUp.phone.value);
        }else {
            this.props.onAuth(this.state.controlsLogin.username.value, this.state.controlsLogin.password.value, this.state.isSignup);
        }
    };

    switchAuthModeHandler = () => {
        this.setState( prevState => {
            return { isSignup: !prevState.isSignup };
        } );
    };

    render () {
        const formElementsArrayLogin = [];
        for ( let key in this.state.controlsLogin ) {
            formElementsArrayLogin.push( {
                id: key,
                config: this.state.controlsLogin[key]
            } );
        }

        const formElementsArraySignUp = [];
        for ( let key in this.state.controlsSignUp ) {
            formElementsArraySignUp.push( {
                id: key,
                config: this.state.controlsSignUp[key]
            } );
        }

        let formLogin = formElementsArrayLogin.map( formElement => (
            <Input
                key={formElement.id}
                elementType={formElement.config.elementType}
                elementConfig={formElement.config.elementConfig}
                value={formElement.config.value}
                invalid={!formElement.config.valid}
                shouldValidate={formElement.config.validation}
                touched={formElement.config.touched}
                changed={( event ) => this.inputChangedHandlerLogin( event, formElement.id )} />
        ) );

        let formSignUp = formElementsArraySignUp.map( formElement => (
            <Input
                key={formElement.id}
                elementType={formElement.config.elementType}
                elementConfig={formElement.config.elementConfig}
                value={formElement.config.value}
                invalid={!formElement.config.valid}
                shouldValidate={formElement.config.validation}
                touched={formElement.config.touched}
                changed={( event ) => this.inputChangedHandlerSignUp( event, formElement.id )} />
        ) );

        if ( this.props.loading ) {
            formLogin = <Spinner />;
            formSignUp = <Spinner />;
        }

        let errorMessage = null;

        if ( this.props.error ) {
            errorMessage = (
                <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 6, marginBottom: 15, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    {this.props.error.message || 'Login failed. Please check credentials.'}
                </div>
            );
        }

        let authRedirect = null;
        if ( this.props.isAuthenticated ) {
            authRedirect = <Redirect to={this.props.authRedirectPath} />
        }
        let form = formLogin;
        if(this.state.isSignup){
            form = formSignUp;
        }

        return (
            <div className="AuthPage-container">
                <div className="Auth">
                    {authRedirect}

                    <h2 className="Auth-header-title">
                        {this.state.isSignup ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
                    </h2>
                    <p className="Auth-sub-title">
                        {this.state.isSignup ? 'Register to start carpooling as Driver or Passenger' : 'Sign in to access rides, maps & safety features'}
                    </p>

                    {!this.state.isSignup && (
                        <div className="Auth-demo-box">
                            <div className="Auth-demo-title"><FaKey /> Quick One-Click Demo Logins:</div>
                            <div className="Auth-demo-buttons">
                                <button
                                    type="button"
                                    className="Auth-demo-btn"
                                    onClick={() => this.fillDemoCredentials('passenger', 'passenger123')}
                                >
                                    <FaUser /> Passenger
                                </button>
                                <button
                                    type="button"
                                    className="Auth-demo-btn"
                                    onClick={() => this.fillDemoCredentials('driver', 'driver123')}
                                >
                                    <FaCar /> Driver
                                </button>
                                <button
                                    type="button"
                                    className="Auth-demo-btn"
                                    onClick={() => this.fillDemoCredentials('admin', 'admin123')}
                                >
                                    <FaUserShield /> Admin
                                </button>
                            </div>
                        </div>
                    )}

                    {errorMessage}

                    <form onSubmit={this.submitHandler}>
                        {form}
                        <Button btnType="Success">SUBMIT</Button>
                    </form>
                    <Button
                        clicked={this.switchAuthModeHandler}
                        btnType="Danger">
                        SWITCH TO {this.state.isSignup ? 'SIGNIN' : 'SIGNUP'}
                    </Button>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        loading: state.auth.loading,
        error: state.auth.error,
        isAuthenticated: state.auth.token !== null,
        authRedirectPath: state.auth.authRedirectPath,
        userRole: state.auth.userRole
    };
};

const mapDispatchToProps = dispatch => {
    return {
        onAuth: ( username, password, isSignup, firstName, lastName, email, phone ) => dispatch( actions.auth( username, password, isSignup, firstName, lastName, email, phone ) ),
        onSetAuthRedirectPath: () => dispatch( actions.setAuthRedirectPath( '/' ) )
    };
};

export default connect( mapStateToProps, mapDispatchToProps )( Auth );