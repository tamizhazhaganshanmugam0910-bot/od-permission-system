@REM ----------------------------------------------------------------------------
@REM Maven Wrapper Script for OD System Backend
@REM ----------------------------------------------------------------------------
@echo off
set "WRAPPER_MVN=C:\Users\tamiz\.m2\wrapper\dists\apache-maven-3.6.3-bin\1iopthnavndlasol9gbrbg6bf2\apache-maven-3.6.3\bin\mvn.cmd"
if exist "%WRAPPER_MVN%" (
    call "%WRAPPER_MVN%" %*
) else (
    call mvn %*
)
