using System.Net;
using System.Net.Http.Json;
using System.Text;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.TestData;

namespace SchoolAdmission.Tests;

public class ValidationTests : IClassFixture<AdmissionFactory>
{
    private readonly AdmissionFactory _factory;

    public ValidationTests(AdmissionFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("{\"name\":\"\",\"totalSeats\":10}")]
    [InlineData("{\"name\":\"   \",\"totalSeats\":10}")]
    [InlineData("{\"name\":\"Class\",\"totalSeats\":0}")]
    [InlineData("{\"name\":\"Class\",\"totalSeats\":-3}")]
    [InlineData("{\"name\":\"Class\",\"totalSeats\":\"many\"}")]
    [InlineData("{\"name\":\"Class\"}")]
    [InlineData("{}")]
    [InlineData("")]
    [InlineData("not json")]
    public async Task Bad_class_payloads_are_rejected_without_a_server_error(string payload)
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsync(
            "/classes",
            new StringContent(payload, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("INVALID_INPUT", await response.ErrorCodeAsync());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("201526912345678901")]
    [InlineData("abcdefghijklmnopq")]
    public async Task Applications_without_a_valid_student_id_are_rejected(string? studentId)
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Header"), 5);

        var request = new HttpRequestMessage(HttpMethod.Post, $"/classes/{created.Id}/holds");
        if (studentId is not null)
        {
            request.Headers.Add("X-Student-Id", studentId);
        }

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("INVALID_STUDENT_ID", await response.ErrorCodeAsync());
    }

    [Fact]
    public async Task Unknown_identifiers_are_not_found()
    {
        using var client = _factory.CreateClient();
        var studentId = NewStudentId();

        var classResponse = await client.GetAsync("/classes/c_unknown");
        var holdResponse = await client.GetAsync("/holds/h_unknown");

        var confirmRequest = new HttpRequestMessage(HttpMethod.Post, "/holds/h_unknown/confirm");
        confirmRequest.Headers.Add("X-Student-Id", studentId);
        var confirmResponse = await client.SendAsync(confirmRequest);

        Assert.Equal(HttpStatusCode.NotFound, classResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, holdResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, confirmResponse.StatusCode);
    }

    [Fact]
    public async Task Classes_can_share_a_name()
    {
        using var client = _factory.CreateClient();
        var name = NewClassName("Class 6 - Morning Shift");

        var first = await client.CreateClassAsync(name, 10);
        var second = await client.CreateClassAsync(name, 10);

        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal(name, second.Name);
    }

    [Fact]
    public async Task Student_hold_list_only_contains_their_own_applications()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Mine"), 5);
        var studentId = NewStudentId();

        await client.CreateHoldAsync(created.Id, studentId);

        var request = new HttpRequestMessage(HttpMethod.Get, "/me/holds");
        request.Headers.Add("X-Student-Id", studentId);

        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var holds = await response.Content.ReadFromJsonAsync<List<HoldSummary>>();

        var only = Assert.Single(holds!);
        Assert.Equal(created.Id, only.ClassId);
        Assert.Equal(created.Name, only.ClassName);
        Assert.Equal("HELD", only.Status);
    }
}

public record HoldSummary(string HoldId, string ClassId, string ClassName, string Status, DateTimeOffset ExpiresAt);
