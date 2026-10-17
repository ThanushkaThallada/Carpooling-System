package com.telerik.carpooling.config;

import com.telerik.carpooling.enums.TripStatus;
import com.telerik.carpooling.enums.UserRole;
import com.telerik.carpooling.enums.UserStatus;
import com.telerik.carpooling.model.Car;
import com.telerik.carpooling.model.Trip;
import com.telerik.carpooling.model.TripUserStatus;
import com.telerik.carpooling.model.User;
import com.telerik.carpooling.repository.CarRepository;
import com.telerik.carpooling.repository.TripRepository;
import com.telerik.carpooling.repository.TripUserStatusRepository;
import com.telerik.carpooling.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CarRepository carRepository;
    private final TripRepository tripRepository;
    private final TripUserStatusRepository tripUserStatusRepository;

    @Override
    public void run(String... args) throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // 1. Admin Account
        if (!userRepository.findByUsernameAndIsDeletedFalse("admin").isPresent()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(encoder.encode("admin123"));
            admin.setFirstName("System");
            admin.setLastName("Admin");
            admin.setEmail("admin@carpool.com");
            admin.setPhone("12345678");
            admin.setRole(UserRole.ADMIN);
            admin.setRatingAsDriver(5.0);
            admin.setRatingAsPassenger(5.0);
            userRepository.save(admin);
        }

        // 2. Driver Account
        User driver = userRepository.findByUsernameAndIsDeletedFalse("driver").orElse(null);
        if (driver == null) {
            driver = new User();
            driver.setUsername("driver");
            driver.setPassword(encoder.encode("driver123"));
            driver.setFirstName("Alex");
            driver.setLastName("Driver");
            driver.setEmail("driver@carpool.com");
            driver.setPhone("88888888");
            driver.setRole(UserRole.USER);
            driver.setRatingAsDriver(4.9);
            driver.setRatingAsPassenger(5.0);
            driver = userRepository.save(driver);
        }

        // 3. Passenger Account
        if (!userRepository.findByUsernameAndIsDeletedFalse("passenger").isPresent()) {
            User passenger = new User();
            passenger.setUsername("passenger");
            passenger.setPassword(encoder.encode("passenger123"));
            passenger.setFirstName("Sarah");
            passenger.setLastName("Passenger");
            passenger.setEmail("passenger@carpool.com");
            passenger.setPhone("99999999");
            passenger.setRole(UserRole.USER);
            passenger.setRatingAsDriver(5.0);
            passenger.setRatingAsPassenger(4.8);
            userRepository.save(passenger);
        }

        // 4. Car for Driver
        if (driver != null && !carRepository.findByOwnerAndIsDeletedFalse("driver").isPresent()) {
            Car car = new Car();
            car.setOwner(driver);
            car.setBrand("Volkswagen");
            car.setModel("Golf 7");
            car.setColor("Silver Metallic");
            car.setFirstRegistration(2021);
            car.setAirConditioned(true);
            carRepository.save(car);
        }

        // 5. Initial Indian Trips for Driver
        if (driver != null && tripRepository.count() == 0) {
            createInitialTrip(driver, "Hyderabad", "Bengaluru", 3, 20, 540,
                    "Daily morning highway carpool from Hyderabad to Bengaluru. Clean vehicle with AC & luggage space.",
                    LocalDateTime.now().plusDays(1).withHour(8).withMinute(30));

            createInitialTrip(driver, "Bengaluru", "Hyderabad", 4, 20, 540,
                    "Return afternoon carpool from Bengaluru to Hyderabad. Smooth ride.",
                    LocalDateTime.now().plusDays(2).withHour(15).withMinute(0));

            createInitialTrip(driver, "Mumbai", "Pune", 3, 15, 180,
                    "Expressway commute Mumbai to Pune. Punctual & comfortable.",
                    LocalDateTime.now().plusDays(1).withHour(9).withMinute(0));

            createInitialTrip(driver, "Delhi", "Jaipur", 3, 18, 270,
                    "Morning trip Delhi to Jaipur via NH48.",
                    LocalDateTime.now().plusDays(1).withHour(7).withMinute(30));

            createInitialTrip(driver, "Hyderabad", "Vijayawada", 3, 12, 330,
                    "Expressway ride Hyderabad to Vijayawada.",
                    LocalDateTime.now().plusDays(1).withHour(10).withMinute(0));
        }
    }

    private void createInitialTrip(User driver, String origin, String destination, int seats, int cost, int duration, String message, LocalDateTime departure) {
        Trip trip = new Trip();
        trip.setOrigin(origin);
        trip.setDestination(destination);
        trip.setAvailablePlaces(seats);
        trip.setCostPerPassenger(cost);
        trip.setTripDuration(duration);
        trip.setMessage(message);
        trip.setDepartureTime(departure);
        trip.setSmokingAllowed(false);
        trip.setLuggageAllowed(true);
        trip.setPetsAllowed(true);
        trip.setAirConditioned(true);
        trip.setTripStatus(TripStatus.AVAILABLE);
        trip = tripRepository.save(trip);

        TripUserStatus tripUserStatus = new TripUserStatus(driver, trip, UserStatus.DRIVER);
        tripUserStatusRepository.save(tripUserStatus);
    }
}
