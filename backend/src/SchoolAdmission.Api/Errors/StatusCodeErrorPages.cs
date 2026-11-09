namespace SchoolAdmission.Api.Errors;

public static class StatusCodeErrorPages
{
    public static IApplicationBuilder UseApiStatusCodePages(this IApplicationBuilder app) =>
        app.UseStatusCodePages(async context =>
        {
            var response = context.HttpContext.Response;

            if (response.HasStarted || response.ContentLength > 0)
            {
                return;
            }

            var (code, message) = response.StatusCode switch
            {
                StatusCodes.Status400BadRequest => (ErrorCodes.InvalidInput, "The request could not be read."),
                StatusCodes.Status404NotFound => ("NOT_FOUND", "No such endpoint."),
                StatusCodes.Status405MethodNotAllowed => ("METHOD_NOT_ALLOWED", "That method is not allowed here."),
                StatusCodes.Status409Conflict => ("CONFLICT", "The request conflicts with the current state."),
                StatusCodes.Status415UnsupportedMediaType => (ErrorCodes.InvalidInput, "Send a JSON body."),
                _ => (ErrorCodes.InternalError, "Something went wrong on our side. Try again.")
            };

            await ErrorWriter.WriteAsync(context.HttpContext, response.StatusCode, code, message);
        });
}
