import CarDarkSUV from '../assets/images/car_suv_dark.jpg';
import CarBlueSedan from '../assets/images/car_sedan_blue.jpg';
import CarRedCrossover from '../assets/images/car_red_crossover.jpg';
import CarWhiteSedan from '../assets/images/carpool_vehicle_sedan.jpg';

export const VEHICLE_CATALOG = [
    {
        image: CarDarkSUV,
        brand: 'Tata',
        model: 'Harrier Dark Edition',
        color: 'Dark Metallic Grey',
        year: '2023',
        plate: 'TS 09 EU 8421',
        type: '5-Seater Premium SUV'
    },
    {
        image: CarBlueSedan,
        brand: 'Honda',
        model: 'City ZX i-VTEC',
        color: 'Royal Blue Metallic',
        year: '2022',
        plate: 'KA 01 MJ 3390',
        type: 'Executive Sedan'
    },
    {
        image: CarRedCrossover,
        brand: 'Hyundai',
        model: 'Creta SX (O) Turbo',
        color: 'Crimson Red',
        year: '2023',
        plate: 'MH 12 QK 7814',
        type: 'Compact SUV'
    },
    {
        image: CarWhiteSedan,
        brand: 'Tesla',
        model: 'Model 3 Long Range',
        color: 'Pearl White Multi-Coat',
        year: '2024',
        plate: 'DL 03 CY 9052',
        type: 'Electric EV Sedan'
    }
];

export const DIVERSE_DRIVERS = [
    {
        firstName: 'Alex',
        lastName: 'Driver',
        username: 'alex_driver',
        phone: '+91 98765 43210',
        email: 'alex.driver@carpool.com',
        rating: 4.9,
        note: 'Expressway direct highway drive. Punctual departure.',
        departureTime: '08:00 AM',
        initials: 'AD',
        avatarGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        availablePlaces: 3
    },
    {
        firstName: 'Vikram',
        lastName: 'Sharma',
        username: 'vikram_rides',
        phone: '+91 98112 23344',
        email: 'vikram.s@carpool.com',
        rating: 4.8,
        note: 'Dadar via Chembur pickup, dropping at Shivaji Nagar. Clean AC car.',
        departureTime: '11:30 AM',
        initials: 'VS',
        avatarGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        availablePlaces: 2
    },
    {
        firstName: 'Priya',
        lastName: 'Patel',
        username: 'priya_carpool',
        phone: '+91 98220 56789',
        email: 'priya.p@carpool.com',
        rating: 5.0,
        note: 'Comfortable highway commute, music friendly, punctual driver.',
        departureTime: '03:15 PM',
        initials: 'PP',
        avatarGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        availablePlaces: 4
    },
    {
        firstName: 'Rohan',
        lastName: 'Verma',
        username: 'rohan_travels',
        phone: '+91 98334 11223',
        email: 'rohan.v@carpool.com',
        rating: 4.7,
        note: 'Regular express commuter, 2 bags per passenger, smooth driving.',
        departureTime: '06:45 PM',
        initials: 'RV',
        avatarGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        availablePlaces: 3
    }
];

export const getVehicleForTrip = (indexOrId, customCar) => {
    if (customCar && customCar.brand && customCar.model && customCar.brand !== 'Tesla') {
        return {
            image: CarBlueSedan,
            brand: customCar.brand,
            model: customCar.model,
            color: customCar.color || 'Silver',
            year: customCar.firstRegistration || '2023',
            plate: customCar.registrationPlate || 'MH 02 BG 4455',
            type: 'Verified Passenger Vehicle'
        };
    }

    let index = 0;
    if (typeof indexOrId === 'number') {
        index = Math.abs(indexOrId) % VEHICLE_CATALOG.length;
    } else if (indexOrId) {
        const str = String(indexOrId);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        index = Math.abs(hash) % VEHICLE_CATALOG.length;
    }
    return VEHICLE_CATALOG[index];
};

export const getDriverForTrip = (indexOrId, originalDriver) => {
    let index = 0;
    if (typeof indexOrId === 'number') {
        index = Math.abs(indexOrId) % DIVERSE_DRIVERS.length;
    } else if (indexOrId) {
        const str = String(indexOrId);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        index = Math.abs(hash) % DIVERSE_DRIVERS.length;
    }
    const preset = DIVERSE_DRIVERS[index];
    if (originalDriver && originalDriver.username && originalDriver.username !== 'driver' && originalDriver.username !== 'alex_driver') {
        return {
            ...preset,
            ...originalDriver
        };
    }
    return preset;
};
