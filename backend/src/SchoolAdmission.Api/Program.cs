using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is not configured.");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

var app = builder.Build();

await DatabaseMigrator.MigrateAsync(app.Services);

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

await app.RunAsync();

public partial class Program
{
}
