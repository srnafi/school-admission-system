using SchoolAdmission.Api.Http;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Endpoints;

public static class HoldEndpoints
{
    public static IEndpointRouteBuilder MapHoldEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes/{classId}/holds", async (
            string classId,
            HttpRequest request,
            AdmissionService service,
            CancellationToken cancellationToken) =>
        {
            var studentId = StudentIdHeader.Require(request);
            var hold = await service.CreateHoldAsync(classId, studentId, cancellationToken);

            return Results.Created($"/holds/{hold.HoldId}", hold);
        });

        app.MapGet("/holds/{holdId}", async (
            string holdId,
            AdmissionService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetHoldAsync(holdId, cancellationToken)));

        app.MapPost("/holds/{holdId}/confirm", async (
            string holdId,
            HttpRequest request,
            AdmissionService service,
            CancellationToken cancellationToken) =>
        {
            var studentId = StudentIdHeader.Require(request);

            return Results.Ok(await service.ConfirmHoldAsync(holdId, studentId, cancellationToken));
        });

        app.MapDelete("/holds/{holdId}", async (
            string holdId,
            HttpRequest request,
            AdmissionService service,
            CancellationToken cancellationToken) =>
        {
            var studentId = StudentIdHeader.Require(request);
            await service.CancelHoldAsync(holdId, studentId, cancellationToken);

            return Results.NoContent();
        });

        app.MapGet("/me/holds", async (
            HttpRequest request,
            AdmissionService service,
            CancellationToken cancellationToken) =>
        {
            var studentId = StudentIdHeader.Require(request);

            return Results.Ok(await service.ListStudentHoldsAsync(studentId, cancellationToken));
        });

        return app;
    }
}
