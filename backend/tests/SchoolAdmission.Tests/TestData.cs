namespace SchoolAdmission.Tests;

public static class TestData
{
    private static long _nextStudentNumber = Random.Shared.NextInt64(1_000_000_000_000, 10_000_000_000_000);

    public static string NewStudentId()
    {
        var number = Interlocked.Increment(ref _nextStudentNumber);
        return $"2015{number:D13}";
    }

    public static string NewClassName(string label) => $"{label} {Guid.NewGuid().ToString("N")[..8]}";
}
