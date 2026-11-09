namespace SchoolAdmission.Api.Errors;

public class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ApiExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ApiException exception) when (!context.Response.HasStarted)
        {
            await ErrorWriter.WriteAsync(
                context, exception.StatusCode, exception.Code, exception.Message, context.RequestAborted);
        }
    }
}
