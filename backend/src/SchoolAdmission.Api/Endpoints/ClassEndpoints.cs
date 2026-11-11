using SchoolAdmission.Api.Contracts;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Endpoints;

public static class ClassEndpoints
{
    public static IEndpointRouteBuilder MapClassEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/classes");

        group.MapPost("", async (
            CreateClassRequest? request,
            AdmissionService service,
            CancellationToken cancellationToken) =>
        {
            var created = await service.CreateClassAsync(request, cancellationToken);
            return Results.Created($"/classes/{created.Id}", created);
        });

        group.MapGet("", async (AdmissionService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.ListClassesAsync(cancellationToken)));

        group.MapGet("/{classId}", async (
            string classId,
            AdmissionService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetClassAsync(classId, cancellationToken)));

        group.MapPut("/{classId}", async (
            string classId,
            CreateClassRequest? request,
            AdmissionService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.UpdateClassAsync(classId, request, cancellationToken)));

        return app;
    }
}
