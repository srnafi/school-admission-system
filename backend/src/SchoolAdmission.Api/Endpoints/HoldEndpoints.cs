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

        return app;
    }
}
