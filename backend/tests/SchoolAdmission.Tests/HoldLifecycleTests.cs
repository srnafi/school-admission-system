using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.TestData;

namespace SchoolAdmission.Tests;

public class HoldLifecycleTests : IClassFixture<AdmissionFactory>
{
    private readonly AdmissionFactory _factory;

    public HoldLifecycleTests(AdmissionFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Confirming_the_same_hold_many_times_counts_once()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Confirm"), 5);
        var studentId = NewStudentId();

        var hold = await (await client.CreateHoldAsync(created.Id, studentId))
            .Content.ReadFromJsonAsync<HoldDto>();

        var responses = await Task.WhenAll(
            Enumerable.Range(0, 10).Select(_ => client.ConfirmAsync(hold!.HoldId, studentId)));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));

        var after = await client.GetClassAsync(created.Id);
        Assert.Equal(1, after.ConfirmedSeats);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(4, after.AvailableSeats);

        var state = await client.GetHoldAsync(hold!.HoldId);
        Assert.Equal("CONFIRMED", state.Status);
    }

    [Fact]
    public async Task Cancelling_frees_the_seat_and_can_be_repeated()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Cancel"), 1);
        var studentId = NewStudentId();

        var hold = await (await client.CreateHoldAsync(created.Id, studentId))
            .Content.ReadFromJsonAsync<HoldDto>();

        var first = await client.CancelAsync(hold!.HoldId, studentId);
        var second = await client.CancelAsync(hold.HoldId, studentId);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);

        var after = await client.GetClassAsync(created.Id);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(1, after.AvailableSeats);

        var cancelled = await client.ConfirmAsync(hold.HoldId, studentId);
        Assert.Equal(HttpStatusCode.Conflict, cancelled.StatusCode);

        var next = await client.CreateHoldAsync(created.Id, NewStudentId());
        Assert.Equal(HttpStatusCode.Created, next.StatusCode);
    }

    [Fact]
    public async Task Another_student_cannot_touch_a_hold()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Owner"), 3);
        var owner = NewStudentId();
        var intruder = NewStudentId();

        var hold = await (await client.CreateHoldAsync(created.Id, owner))
            .Content.ReadFromJsonAsync<HoldDto>();

        var confirm = await client.ConfirmAsync(hold!.HoldId, intruder);
        var cancel = await client.CancelAsync(hold.HoldId, intruder);

        Assert.Equal(HttpStatusCode.Forbidden, confirm.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, cancel.StatusCode);

        var after = await client.GetClassAsync(created.Id);
        Assert.Equal(1, after.HeldSeats);
        Assert.Equal(0, after.ConfirmedSeats);
    }

    [Fact]
    public async Task A_confirmed_admission_cannot_be_cancelled()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Confirmed"), 2);
        var studentId = NewStudentId();

        var hold = await (await client.CreateHoldAsync(created.Id, studentId))
            .Content.ReadFromJsonAsync<HoldDto>();

        await client.ConfirmAsync(hold!.HoldId, studentId);
        var cancel = await client.CancelAsync(hold.HoldId, studentId);

        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Equal("HOLD_NOT_ACTIVE", await cancel.ErrorCodeAsync());
    }

    [Fact]
    public async Task A_full_class_rejects_new_applications()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Full"), 1);

        var accepted = await client.CreateHoldAsync(created.Id, NewStudentId());
        var rejected = await client.CreateHoldAsync(created.Id, NewStudentId());

        Assert.Equal(HttpStatusCode.Created, accepted.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, rejected.StatusCode);
        Assert.Equal("NO_SEATS", await rejected.ErrorCodeAsync());
    }
}
