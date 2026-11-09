namespace SchoolAdmission.Api.Services;

public class HoldSettings
{
    public const int DefaultDurationSeconds = 600;

    public HoldSettings(int durationSeconds)
    {
        DurationSeconds = durationSeconds;
    }

    public int DurationSeconds { get; }

    public static HoldSettings FromConfiguration(IConfiguration configuration)
    {
        var raw = configuration["HOLD_DURATION_SECONDS"];

        return int.TryParse(raw, out var seconds) && seconds > 0
            ? new HoldSettings(seconds)
            : new HoldSettings(DefaultDurationSeconds);
    }
}
