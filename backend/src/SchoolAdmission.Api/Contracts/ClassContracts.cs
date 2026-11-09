namespace SchoolAdmission.Api.Contracts;

public record CreateClassRequest(string? Name, int? TotalSeats);

public record ClassResponse(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats);

public record ClassSeatsRow(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats);
