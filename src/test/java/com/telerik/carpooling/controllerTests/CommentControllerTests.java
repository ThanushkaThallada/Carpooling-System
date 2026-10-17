package com.telerik.carpooling.controllerTests;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.telerik.carpooling.controller.CommentController;
import com.telerik.carpooling.enums.UserRole;
import com.telerik.carpooling.model.dto.CommentDtoEdit;
import com.telerik.carpooling.model.dto.CommentDtoResponse;
import com.telerik.carpooling.model.dto.UserDtoResponse;
import com.telerik.carpooling.service.service.contract.CommentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.json.JacksonTester;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@ExtendWith(MockitoExtension.class)
public class CommentControllerTests {

    private MockMvc mockMvc;

    @Mock
    CommentService commentService;


    @InjectMocks
    CommentController commentController;

    private JacksonTester<CommentDtoResponse> jsonCommentDtoResponse;
    private JacksonTester<CommentDtoEdit> jsonCommentDtoEdit;
    private JacksonTester<Set<CommentDtoResponse>> jsonCommentDtoResponseSet;
    private CommentDtoResponse commentDtoResponse;
    private CommentDtoEdit commentDtoEdit;
    private Set<CommentDtoResponse> commentDtoResponseSet;
    private Authentication authentication;

    @BeforeEach
    public void setup()  {

        mockMvc = MockMvcBuilders.standaloneSetup(commentController)
                .build();
        authentication = mock(Authentication.class);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        ObjectMapper objectMapper = new ObjectMapper();
        JacksonTester.initFields(this, objectMapper);
        UserDtoResponse userDtoResponse = new UserDtoResponse(1L, "username1", "lastName",
                "username1", "email@gmail.com", UserRole.USER, "0889111777", 3.5,
                4.0);
        commentDtoEdit = new CommentDtoEdit(1L,"message");
        commentDtoResponse = new CommentDtoResponse(1L, userDtoResponse,"message");
        commentDtoResponseSet = new HashSet<>();
        commentDtoResponseSet.add(commentDtoResponse);
    }

    @Test
    public void get_Comments_Should_ReturnSetWithComments() throws Exception {
        // given
        given(commentService.getComments(1L))
                .willReturn(commentDtoResponseSet);

        // when
        MockHttpServletResponse response = mockMvc.perform(
                get("/comments/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andReturn().getResponse();

        // then
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
        assertThat(response.getContentAsString()).isEqualTo(
                jsonCommentDtoResponseSet.write(commentDtoResponseSet).getJson()
        );
    }

    @Test
    public void update_Comments_Should_UpdateComment() throws Exception {
        // given
        given(commentService.updateComment(commentDtoEdit,"username1"))
                .willReturn(commentDtoResponse);

        // when
        when(authentication.getName()).thenReturn("username1");
        MockHttpServletResponse response = mockMvc.perform(
                put("/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonCommentDtoEdit.write(commentDtoEdit).getJson())
                        .accept(MediaType.APPLICATION_JSON))
                .andReturn().getResponse();

        // then
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
        assertThat(response.getContentAsString()).isEqualTo(
                jsonCommentDtoResponse.write(commentDtoResponse).getJson()
        );
    }

    @Test
    public void delete_Comments_Should_DeleteComment() throws Exception {

        // when
        when(authentication.getName()).thenReturn("username1");
        MockHttpServletResponse response = mockMvc.perform(
                delete("/comments/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andReturn().getResponse();

        // then
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
    }

    @Test
    public void create_Comments_Should_CreateComment() throws Exception {
        // given
        given(commentService.createComment(1L,"username1","message"))
                .willReturn(commentDtoResponse);

        // when
        when(authentication.getName()).thenReturn("username1");
        MockHttpServletResponse response = mockMvc.perform(
                post("/comments/1?comment=message")
                        .accept(MediaType.APPLICATION_JSON))
                .andReturn().getResponse();

        // then
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
        assertThat(response.getContentAsString()).isEqualTo(
                jsonCommentDtoResponse.write(commentDtoResponse).getJson()
        );
    }
}
