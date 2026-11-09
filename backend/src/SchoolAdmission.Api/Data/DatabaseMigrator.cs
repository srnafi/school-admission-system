using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api.Data;

public static class DatabaseMigrator
{
    private const long MigrationLockKey = 52_300_711;

    public static async Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

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
}
