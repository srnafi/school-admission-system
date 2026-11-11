using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.TestData;

namespace SchoolAdmission.Tests;

public class ClassAdminTests : IClassFixture<AdmissionFactory>
{
    private readonly AdmissionFactory _factory;

    public ClassAdminTests(AdmissionFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Updating_seats_keeps_taken_seats_and_raises_capacity()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Grow"), 5);

        var confirmedStudent = NewStudentId();
        var heldStudent = NewStudentId();

        var hold = await (await client.CreateHoldAsync(created.Id, confirmedStudent))
            .Content.ReadFromJsonAsync<HoldDto>();
        await client.ConfirmAsync(hold!.HoldId, confirmedStudent);
        await client.CreateHoldAsync(created.Id, heldStudent);

        var updated = await client.UpdateClassAsync(created.Id, created.Name, 10);

        Assert.Equal(10, updated.TotalSeats);
        Assert.Equal(1, updated.ConfirmedSeats);
        Assert.Equal(1, updated.HeldSeats);
        Assert.Equal(8, updated.AvailableSeats);
    }

    [Fact]
    public async Task Seats_cannot_drop_below_taken()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Shrink"), 5);

        await client.CreateHoldAsync(created.Id, NewStudentId());
        await client.CreateHoldAsync(created.Id, NewStudentId());

        var response = await client.PutAsJsonAsync(
            $"/classes/{created.Id}",
            new { name = created.Name, totalSeats = 1 });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("SEATS_IN_USE", await response.ErrorCodeAsync());

        var unchanged = await client.GetClassAsync(created.Id);
        Assert.Equal(5, unchanged.TotalSeats);
    }

    [Fact]
    public async Task Updating_a_missing_class_returns_not_found()
    {
        using var client = _factory.CreateClient();

        var response = await client.PutAsJsonAsync(
            "/classes/c_missing",
            new { name = "Class 6 - Morning Shift", totalSeats = 10 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("CLASS_NOT_FOUND", await response.ErrorCodeAsync());
    }
}
