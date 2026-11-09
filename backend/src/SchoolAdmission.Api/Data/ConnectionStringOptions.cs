using Npgsql;

namespace SchoolAdmission.Api.Data;

public static class ConnectionStringOptions
{
    private const int DefaultMaximumPoolSize = 20;

    public static string WithPoolSizeLimit(string connectionString, int maximumPoolSize = DefaultMaximumPoolSize)
    {
        if (connectionString.Contains("Maximum Pool Size", StringComparison.OrdinalIgnoreCase))
        {
            return connectionString;
        }

        var builder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            MaxPoolSize = maximumPoolSize
        };

        return builder.ConnectionString;
    }
}
