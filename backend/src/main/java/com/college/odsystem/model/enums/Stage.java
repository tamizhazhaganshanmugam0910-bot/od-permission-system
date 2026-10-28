package com.college.odsystem.model.enums;

public enum Stage {
    COUNSELLOR,
    CLASS_COORDINATOR,
    HOD,
    DONE;

    public Stage getNextStage() {
        return switch (this) {
            case COUNSELLOR -> CLASS_COORDINATOR;
            case CLASS_COORDINATOR -> HOD;
            case HOD, DONE -> DONE;
        };
    }

    public Stage getPreviousStage() {
        return switch (this) {
            case HOD -> CLASS_COORDINATOR;
            case CLASS_COORDINATOR -> COUNSELLOR;
            case COUNSELLOR, DONE -> null;
        };
    }
}
