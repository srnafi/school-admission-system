namespace SchoolAdmission.Api.Domain;

public static class Ids
{
    public static string NewClassId() => "c_" + Guid.NewGuid().ToString("N")[..12];

    public static string NewHoldId() => "h_" + Guid.NewGuid().ToString("N")[..12];
}
