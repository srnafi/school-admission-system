using System.Net;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.TestData;

namespace SchoolAdmission.Tests;

public class ConcurrencyTests : IClassFixture<AdmissionFactory>
{
    private readonly AdmissionFactory _factory;

    public ConcurrencyTests(AdmissionFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Parallel_applications_never_exceed_the_seat_count()
    {
        using var client = _factory.CreateClient();
        const int totalSeats = 10;
        const int applicants = 200;

        var created = await client.CreateClassAsync(NewClassName("Concurrency"), totalSeats);

        var responses = await Task.WhenAll(
            Enumerable.Range(0, applicants)
                .Select(_ => client.CreateHoldAsync(created.Id, NewStudentId())));

        var statuses = responses.Select(response => response.StatusCode).ToList();

        Assert.Equal(totalSeats, ApiClientExtensions.CountStatus(statuses, HttpStatusCode.Created));
        Assert.Equal(applicants - totalSeats, ApiClientExtensions.CountStatus(statuses, HttpStatusCode.Conflict));

        var after = await client.GetClassAsync(created.Id);

        Assert.Equal(totalSeats, after.HeldSeats);
        Assert.Equal(0, after.ConfirmedSeats);
        Assert.Equal(0, after.AvailableSeats);
    }

    [Fact]
    public async Task One_student_cannot_take_two_seats_in_the_same_class()
    {
        using var client = _factory.CreateClient();
        var created = await client.CreateClassAsync(NewClassName("Same student"), 20);
        var studentId = NewStudentId();

        var responses = await Task.WhenAll(
            Enumerable.Range(0, 20).Select(_ => client.CreateHoldAsync(created.Id, studentId)));

        var statuses = responses.Select(response => response.StatusCode).ToList();
        Assert.Equal(1, ApiClientExtensions.CountStatus(statuses, HttpStatusCode.Created));

        foreach (var response in responses.Where(response => response.StatusCode == HttpStatusCode.Conflict))
        {
            Assert.Equal("ALREADY_APPLIED", await response.ErrorCodeAsync());
        }

        var after = await client.GetClassAsync(created.Id);
        Assert.Equal(1, after.HeldSeats);
        Assert.Equal(19, after.AvailableSeats);
    }
}
