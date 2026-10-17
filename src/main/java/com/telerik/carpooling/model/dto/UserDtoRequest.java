package com.telerik.carpooling.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class UserDtoRequest {

    @NotNull(message = "User should have username")
    @Size(min = 2, max = 20, message = "Please enter username between 2 and 20 symbols")
    private String username;

    @NotNull(message = "User should have first name")
    @Pattern(regexp = "^([A-Za-z]*).{1,20}$", message = "First name should contain only letters," +
            " and should be between 1 and 20 characters")
    private String firstName;

    @NotNull(message = "User should have last name")
    @Pattern(regexp = "^([A-Za-z]*).{1,20}$", message = "Last name should contain only letters," +
            " and should be between 1 and 20 characters")
    private String lastName;

    @NotNull(message = "User should have email")
    @Email(message = "Email should follow the pattern xxxx@yyyy.zzzz")
    private String email;

    @Pattern(regexp = "^.{4,128}$",
            message = "Password should be at least 4 characters long")
    private String password;

    @NotNull(message = "User should have phone")
    @Pattern(regexp="^.{5,20}$", message = "Phone should be at least 5 digits long")
    private String phone;

}
