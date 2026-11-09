using System.Text.Encodings.Web;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Background;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Endpoints;
using SchoolAdmission.Api.Errors;
using SchoolAdmission.Api.Json;
using SchoolAdmission.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(ConnectionStringOptions.WithPoolSizeLimit(connectionString)));
builder.Services.AddSingleton(HoldSettings.FromConfiguration(builder.Configuration));
builder.Services.AddScoped<AdmissionService>();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddHostedService<HoldExpirySweeper>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
    options.SerializerOptions.Converters.Add(new UtcDateTimeOffsetConverter());
});

var app = builder.Build();

await DatabaseMigrator.MigrateAsync(app.Services);

app.UseExceptionHandler();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseApiStatusCodePages();
app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapClassEndpoints();
app.MapHoldEndpoints();

await app.RunAsync();

public partial class Program
{
}
