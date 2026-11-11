namespace SchoolAdmission.Api.Errors;

public class ApiException : Exception
{
    public ApiException(int statusCode, string code, string message) : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public int StatusCode { get; }

    public string Code { get; }

    public static ApiException InvalidInput(string message) =>
        new(StatusCodes.Status400BadRequest, ErrorCodes.InvalidInput, message);

    public static ApiException InvalidStudentId(string message) =>
        new(StatusCodes.Status400BadRequest, ErrorCodes.InvalidStudentId, message);

    public static ApiException ClassNotFound(string classId) =>
        new(StatusCodes.Status404NotFound, ErrorCodes.ClassNotFound, $"No class found with id {classId}.");

    public static ApiException HoldNotFound(string holdId) =>
        new(StatusCodes.Status404NotFound, ErrorCodes.HoldNotFound, $"No application found with id {holdId}.");

    public static ApiException NoSeats() =>
        new(StatusCodes.Status409Conflict, ErrorCodes.NoSeats, "No seat is available in this class.");

    public static ApiException SeatsInUse(int taken) =>
        new(StatusCodes.Status409Conflict, ErrorCodes.SeatsInUse,
            $"Seats cannot go below the {taken} already held or confirmed.");

    public static ApiException AlreadyApplied() =>
        new(StatusCodes.Status409Conflict, ErrorCodes.AlreadyApplied,
            "You already have an application in this class.");

    public static ApiException HoldExpired() =>
        new(StatusCodes.Status409Conflict, ErrorCodes.HoldExpired, "This application has expired.");

    public static ApiException HoldNotActive() =>
        new(StatusCodes.Status409Conflict, ErrorCodes.HoldNotActive,
            "This application can no longer be changed.");

    public static ApiException Forbidden() =>
        new(StatusCodes.Status403Forbidden, ErrorCodes.Forbidden, "This application belongs to another student.");
}
