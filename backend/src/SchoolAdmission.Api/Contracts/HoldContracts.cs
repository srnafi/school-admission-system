namespace SchoolAdmission.Api.Contracts;

public record HoldResponse(
    string HoldId,
    string ClassId,
    string StudentId,
    string Status,
    DateTimeOffset ExpiresAt);

public record HoldSummaryResponse(
    string HoldId,
    string ClassId,
    string ClassName,
    string Status,
    DateTimeOffset ExpiresAt);

public record ConfirmHoldResponse(string HoldId, string Status);

public record SeatUsageRow(int ConfirmedSeats, int HeldSeats);
