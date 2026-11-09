using System.Text.Encodings.Web;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Endpoints;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddScoped<AdmissionService>();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
});

var app = builder.Build();

await DatabaseMigrator.MigrateAsync(app.Services);

app.UseExceptionHandler();
app.UseApiStatusCodePages();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapClassEndpoints();

await app.RunAsync();

public partial class Program
{
}
