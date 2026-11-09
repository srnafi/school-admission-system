using System.Net;
using System.Net.Http.Json;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.TestData;

namespace SchoolAdmission.Tests;

public class ExpiryTests : IClassFixture<ShortHoldAdmissionFactory>
{
    private readonly ShortHoldAdmissionFactory _factory;

    public ExpiryTests(ShortHoldAdmissionFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task An_expired_hold_returns_the_seat_without_any_other_call()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Expiry"), 1);
        var studentId = NewStudentId();

        var hold = await (await client.CreateHoldAsync(created.Id, studentId))
            .Content.ReadFromJsonAsync<HoldDto>();

        Assert.Equal("HELD", hold!.Status);
        Assert.Equal(0, (await client.GetClassAsync(created.Id)).AvailableSeats);

        await Task.Delay(TimeSpan.FromSeconds(3));

        var expired = await client.GetHoldAsync(hold.HoldId);
        Assert.Equal("EXPIRED", expired.Status);

        var after = await client.GetClassAsync(created.Id);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(1, after.AvailableSeats);

        var confirm = await client.ConfirmAsync(hold.HoldId, studentId);
        Assert.Equal(HttpStatusCode.Conflict, confirm.StatusCode);
        Assert.Equal("HOLD_EXPIRED", await confirm.ErrorCodeAsync());

        var retry = await client.CreateHoldAsync(created.Id, studentId);
        Assert.Equal(HttpStatusCode.Created, retry.StatusCode);
    }
}
