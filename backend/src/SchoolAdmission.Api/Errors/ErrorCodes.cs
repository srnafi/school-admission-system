namespace SchoolAdmission.Api.Errors;

public static class ErrorCodes
{
    public const string InvalidInput = "INVALID_INPUT";
    public const string InvalidStudentId = "INVALID_STUDENT_ID";
    public const string ClassNotFound = "CLASS_NOT_FOUND";
    public const string HoldNotFound = "HOLD_NOT_FOUND";
    public const string NoSeats = "NO_SEATS";
    public const string SeatsInUse = "SEATS_IN_USE";
    public const string AlreadyApplied = "ALREADY_APPLIED";
    public const string HoldExpired = "HOLD_EXPIRED";
    public const string HoldNotActive = "HOLD_NOT_ACTIVE";
    public const string Forbidden = "FORBIDDEN";
    public const string InternalError = "INTERNAL_ERROR";
}
