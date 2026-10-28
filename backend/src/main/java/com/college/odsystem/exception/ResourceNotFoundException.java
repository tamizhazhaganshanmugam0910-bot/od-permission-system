package com.college.odsystem.exception;

/**
 * Thrown when a requested resource (OD request, user, etc.) does not exist.
 * Mapped to HTTP 404 by GlobalExceptionHandler.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceName, String id) {
        super(resourceName + " not found with ID: " + id);
    }
}
