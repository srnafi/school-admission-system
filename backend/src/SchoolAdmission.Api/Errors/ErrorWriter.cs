namespace SchoolAdmission.Api.Errors;

public static class ErrorWriter
{
    public static Task WriteAsync(
        HttpContext context,
        int statusCode,
        string code,
        string message,
        CancellationToken cancellationToken = default)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        return context.Response.WriteAsJsonAsync(
            new ErrorEnvelope(new ApiError(code, message)), cancellationToken);
    }
}
