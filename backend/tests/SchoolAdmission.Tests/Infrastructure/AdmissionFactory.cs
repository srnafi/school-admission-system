using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using static SchoolAdmission.Tests.TestData;

namespace SchoolAdmission.Tests.Infrastructure;

public class AdmissionFactory : WebApplicationFactory<Program>
{
    private readonly int _holdDurationSeconds;

    public AdmissionFactory() : this(600)
    {
    }

    protected AdmissionFactory(int holdDurationSeconds)
    {
        _holdDurationSeconds = holdDurationSeconds;
    }

    public static string ConnectionString =>
        Environment.GetEnvironmentVariable("TEST_CONNECTION")
        ?? "Host=127.0.0.1;Port=5433;Database=admission_test;Username=app;Password=app";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", ConnectionString);
        builder.UseSetting("HOLD_DURATION_SECONDS", _holdDurationSeconds.ToString());
    }
}

public class ShortHoldAdmissionFactory : AdmissionFactory
{
    public ShortHoldAdmissionFactory() : base(2)
    {
    }
}

public static class ApiClientExtensions
{
    public static async Task<ClassDto> CreateClassAsync(this HttpClient client, string name, int totalSeats)
    {
        var response = await client.PostAsJsonAsync("/classes", new { name, totalSeats });
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<ClassDto>())!;
    }

    public static Task<HttpResponseMessage> CreateHoldAsync(this HttpClient client, string classId, string studentId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{classId}/holds");
        request.Headers.Add("X-Student-Id", studentId);

        return client.SendAsync(request);
    }

    public static Task<HttpResponseMessage> ConfirmAsync(this HttpClient client, string holdId, string studentId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/holds/{holdId}/confirm");
        request.Headers.Add("X-Student-Id", studentId);

        return client.SendAsync(request);
    }

    public static Task<HttpResponseMessage> CancelAsync(this HttpClient client, string holdId, string studentId)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, $"/holds/{holdId}");
        request.Headers.Add("X-Student-Id", studentId);

        return client.SendAsync(request);
    }

    public static async Task<ClassDto> GetClassAsync(this HttpClient client, string classId) =>
        (await client.GetFromJsonAsync<ClassDto>($"/classes/{classId}"))!;

    public static async Task<HoldDto> GetHoldAsync(this HttpClient client, string holdId) =>
        (await client.GetFromJsonAsync<HoldDto>($"/holds/{holdId}"))!;

    public static async Task<string?> ErrorCodeAsync(this HttpResponseMessage response)
    {
        if (response.Content.Headers.ContentLength is null or 0)
        {
            return null;
        }

        var payload = await response.Content.ReadFromJsonAsync<ErrorDto>();
        return payload?.Error?.Code;
    }

    public static int CountStatus(IEnumerable<HttpStatusCode> statuses, HttpStatusCode expected) =>
        statuses.Count(status => status == expected);
}

public record ClassDto(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);

public record HoldDto(string HoldId, string ClassId, string Status, DateTimeOffset ExpiresAt);

public record ErrorDto(ErrorBody? Error);

public record ErrorBody(string Code, string Message);
