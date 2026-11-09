using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;

namespace SchoolAdmission.Api.Errors;

public record ApiError(string Code, string Message);

public record ErrorEnvelope(ApiError Error);

public class ApiExceptionHandler : IExceptionHandler
{
    private readonly ILogger<ApiExceptionHandler> _logger;

    public ApiExceptionHandler(ILogger<ApiExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, code, message) = exception switch
        {
            ApiException api => (api.StatusCode, api.Code, api.Message),
            BadHttpRequestException => (
                StatusCodes.Status400BadRequest,
                ErrorCodes.InvalidInput,
                "The request could not be read. Check the body and try again."),
            JsonException => (
                StatusCodes.Status400BadRequest,
                ErrorCodes.InvalidInput,
                "The request body is not valid JSON."),
            _ => (
                StatusCodes.Status500InternalServerError,
                ErrorCodes.InternalError,
                "Something went wrong on our side. Try again.")
        };

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled error for {Method} {Path}", context.Request.Method, context.Request.Path);
        }

        await ErrorWriter.WriteAsync(context, statusCode, code, message, cancellationToken);

        return true;
    }
}
