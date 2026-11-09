using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace SchoolAdmission.Api.Data;

public static class DatabaseMigrator
{
    private const long MigrationLockKey = 52_300_711;

    public static async Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await EnsureDatabaseExistsAsync(db, cancellationToken);

        await db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            // two processes starting together must not apply the same migration
            await db.Database.ExecuteSqlRawAsync(
                $"select pg_advisory_lock({MigrationLockKey})", cancellationToken);
            try
            {
                await db.Database.MigrateAsync(cancellationToken);
            }
            finally
            {
                await db.Database.ExecuteSqlRawAsync(
                    $"select pg_advisory_unlock({MigrationLockKey})", cancellationToken);
            }
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    private static async Task EnsureDatabaseExistsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        if (await db.Database.CanConnectAsync(cancellationToken))
        {
            return;
        }

        var builder = new NpgsqlConnectionStringBuilder(db.Database.GetConnectionString());
        var databaseName = builder.Database;

        if (string.IsNullOrWhiteSpace(databaseName))
        {
            return;
        }

        builder.Database = "postgres";

        await using var connection = new NpgsqlConnection(builder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = $"create database \"{databaseName.Replace("\"", "\"\"")}\"";

        try
        {
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (PostgresException exception) when (
            exception.SqlState == PostgresErrorCodes.DuplicateDatabase ||
            exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            // concurrent start ups race here; whichever loses this branch finds the database in place
        }
    }
}
