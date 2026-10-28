package com.college.odsystem.model.enums;

public enum Role {
    STUDENT,
    COUNSELLOR,
    CLASS_COORDINATOR,
    HOD,
    ADMIN,
    MANAGER;

    public boolean isAuthorizedForStage(Stage stage) {
        if (this == ADMIN) return true;
        return switch (stage) {
            case COUNSELLOR -> this == COUNSELLOR;
            case CLASS_COORDINATOR -> this == CLASS_COORDINATOR;
            case HOD -> this == HOD;
            case DONE -> false;
        };
    }
}
